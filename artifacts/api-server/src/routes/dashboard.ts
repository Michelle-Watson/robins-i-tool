/**
 * routes/dashboard.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Express router for dashboard aggregation endpoints.
 *
 * Endpoints:
 *   GET /dashboard/summary — overview stats for the dashboard landing page
 *
 * All endpoints in this router are read-only (no mutations).
 * ──────────────────────────────────────────────────────────────────────────
 */

import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, studiesTable, domainAssessmentsTable } from "@workspace/db";

const router: IRouter = Router();

// ─── GET /dashboard/summary ───────────────────────────────────────────────────
// Returns:
//   totalStudies    — total number of studies in the system
//   fullyAssessed   — studies where all 6 required domains are assessed
//   riskBreakdown   — count of studies at each worst-outcome risk level
//   recentStudies   — 5 most recently updated studies with progress metadata
router.get("/dashboard/summary", async (req, res) => {
  try {
    // ── 1. Fetch all studies (newest first) ──────────────────────────────────
    const allStudies = await db
      .select()
      .from(studiesTable)
      .orderBy(desc(studiesTable.updatedAt));

    const totalStudies = allStudies.length;

    // ── 2. Fetch all assessments across all studies in one query ─────────────
    let allAssessments: Array<{
      studyId: number;
      domainId: string;
      outcome: string;
    }> = [];

    if (totalStudies > 0) {
      const studyIds = allStudies.map((s) => s.id);
      allAssessments = await db
        .select({
          studyId: domainAssessmentsTable.studyId,
          domainId: domainAssessmentsTable.domainId,
          outcome: domainAssessmentsTable.outcome,
        })
        .from(domainAssessmentsTable)
        .where(
          sql`${domainAssessmentsTable.studyId} = ANY(ARRAY[${sql.join(
            studyIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::int[])`,
        );
    }

    // Group assessments by studyId for O(1) lookup
    const assessmentsByStudy = new Map<
      number,
      Array<{ domainId: string; outcome: string }>
    >();
    for (const a of allAssessments) {
      if (!assessmentsByStudy.has(a.studyId)) {
        assessmentsByStudy.set(a.studyId, []);
      }
      assessmentsByStudy.get(a.studyId)!.push(a);
    }

    // ── 3. Severity ordering for worst-outcome computation ───────────────────
    const SEVERITY: Record<string, number> = {
      low: 0,
      "low-except": 1,
      moderate: 2,
      serious: 3,
      critical: 4,
    };

    // ── 4. Build per-study summaries ─────────────────────────────────────────
    const riskBreakdown = { low: 0, lowExcept: 0, moderate: 0, serious: 0, critical: 0 };
    let fullyAssessed = 0;

    const studySummaries = allStudies.map((study) => {
      const studyAssessments = assessmentsByStudy.get(study.id) ?? [];

      // Compute worst outcome for this study
      let worstOutcome: string | null = null;
      for (const a of studyAssessments) {
        if (
          worstOutcome === null ||
          (SEVERITY[a.outcome] ?? 0) > (SEVERITY[worstOutcome] ?? 0)
        ) {
          worstOutcome = a.outcome;
        }
      }

      // Count fully assessed studies (all 6 domains complete)
      if (studyAssessments.length >= 6) {
        fullyAssessed++;

        // Contribute to the risk breakdown using worst outcome
        if (worstOutcome === "low") riskBreakdown.low++;
        else if (worstOutcome === "low-except") riskBreakdown.lowExcept++;
        else if (worstOutcome === "moderate") riskBreakdown.moderate++;
        else if (worstOutcome === "serious") riskBreakdown.serious++;
        else if (worstOutcome === "critical") riskBreakdown.critical++;
      }

      return {
        id: study.id,
        name: study.name,
        description: study.description ?? null,
        domain1Variant: study.domain1Variant,
        createdAt: study.createdAt,
        updatedAt: study.updatedAt,
        assessedDomains: studyAssessments.length,
        totalDomains: 6,
        worstOutcome,
      };
    });

    // ── 5. Take the 5 most recently updated studies for the dashboard list ───
    const recentStudies = studySummaries.slice(0, 5);

    res.json({
      totalStudies,
      fullyAssessed,
      riskBreakdown,
      recentStudies,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
