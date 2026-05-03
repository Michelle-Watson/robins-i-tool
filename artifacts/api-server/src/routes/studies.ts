/**
 * routes/studies.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Express router for the /studies resource.
 *
 * Endpoints:
 *   GET    /studies           — list all studies with progress summary
 *   POST   /studies           — create a new study
 *   GET    /studies/:studyId  — get one study with all its assessments
 *   PATCH  /studies/:studyId  — update study name / description
 *   DELETE /studies/:studyId  — delete study + cascade assessments
 *
 * Validation uses Zod schemas generated from the OpenAPI spec (api-zod).
 * DB queries use Drizzle ORM (lib/db).
 * ──────────────────────────────────────────────────────────────────────────
 */

import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, studiesTable, domainAssessmentsTable } from "@workspace/db";
import {
  CreateStudyBody,
  UpdateStudyBody,
  GetStudyParams,
  UpdateStudyParams,
  DeleteStudyParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── GET /studies ─────────────────────────────────────────────────────────────
// Returns all studies ordered newest-first, each enriched with:
//   - assessedDomains: count of completed domain assessments
//   - totalDomains:    always 6 (5 shared + 1 domain-1 variant)
//   - worstOutcome:    the most severe risk level found (or null)
router.get("/studies", async (req, res) => {
  try {
    // Fetch all studies, newest first
    const studies = await db
      .select()
      .from(studiesTable)
      .orderBy(desc(studiesTable.createdAt));

    // For each study, fetch its assessments to compute progress metadata.
    // We do this in a single additional query rather than N+1 per study.
    const studyIds = studies.map((s) => s.id);

    let assessmentsByStudy: Map<
      number,
      Array<{ domainId: string; outcome: string }>
    > = new Map();

    if (studyIds.length > 0) {
      // Fetch domain + outcome for all assessments across all studies
      const assessments = await db
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

      // Group by studyId for O(1) lookup
      for (const a of assessments) {
        if (!assessmentsByStudy.has(a.studyId)) {
          assessmentsByStudy.set(a.studyId, []);
        }
        assessmentsByStudy.get(a.studyId)!.push({
          domainId: a.domainId,
          outcome: a.outcome,
        });
      }
    }

    // Severity ordering for worstOutcome computation
    const SEVERITY: Record<string, number> = {
      low: 0,
      "low-except": 1,
      moderate: 2,
      serious: 3,
      critical: 4,
    };

    // Build the enriched study summary response
    const summaries = studies.map((study) => {
      const studyAssessments = assessmentsByStudy.get(study.id) ?? [];

      // Compute the worst (most severe) outcome across all assessed domains
      let worstOutcome: string | null = null;
      for (const a of studyAssessments) {
        if (
          worstOutcome === null ||
          (SEVERITY[a.outcome] ?? 0) > (SEVERITY[worstOutcome] ?? 0)
        ) {
          worstOutcome = a.outcome;
        }
      }

      return {
        id: study.id,
        name: study.name,
        description: study.description ?? null,
        domain1Variant: study.domain1Variant,
        createdAt: study.createdAt,
        updatedAt: study.updatedAt,
        assessedDomains: studyAssessments.length,
        totalDomains: 6, // always 6 required domains per ROBINS-I V2
        worstOutcome,
      };
    });

    res.json(summaries);
  } catch (err) {
    req.log.error({ err }, "Failed to list studies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /studies ────────────────────────────────────────────────────────────
// Creates a new study. The domain1Variant field is immutable once assessments exist.
router.post("/studies", async (req, res) => {
  // Validate request body against generated Zod schema
  const parsed = CreateStudyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, description, domain1Variant } = parsed.data;

  try {
    const [study] = await db
      .insert(studiesTable)
      .values({
        name,
        description: description ?? null,
        domain1Variant,
      })
      .returning();

    res.status(201).json(study);
  } catch (err) {
    req.log.error({ err }, "Failed to create study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /studies/:studyId ────────────────────────────────────────────────────
// Returns the full study record plus all its saved domain assessments.
router.get("/studies/:studyId", async (req, res) => {
  // Validate path param
  const params = GetStudyParams.safeParse({ studyId: Number(req.params.studyId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid studyId" });
    return;
  }

  const { studyId } = params.data;

  try {
    // Fetch the study
    const [study] = await db
      .select()
      .from(studiesTable)
      .where(eq(studiesTable.id, studyId))
      .limit(1);

    if (!study) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    // Fetch all assessments for this study
    const assessments = await db
      .select()
      .from(domainAssessmentsTable)
      .where(eq(domainAssessmentsTable.studyId, studyId));

    res.json({ ...study, assessments });
  } catch (err) {
    req.log.error({ err }, "Failed to get study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /studies/:studyId ──────────────────────────────────────────────────
// Updates study name and/or description. domain1Variant is not patchable here.
router.patch("/studies/:studyId", async (req, res) => {
  // Validate path param
  const params = UpdateStudyParams.safeParse({ studyId: Number(req.params.studyId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid studyId" });
    return;
  }

  // Validate body
  const body = UpdateStudyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { studyId } = params.data;
  const { name, description } = body.data;

  try {
    // Build the update object — only include provided fields
    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateValues.name = name;
    if (description !== undefined) updateValues.description = description;

    const [updated] = await db
      .update(studiesTable)
      .set(updateValues)
      .where(eq(studiesTable.id, studyId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update study");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /studies/:studyId ─────────────────────────────────────────────────
// Deletes the study. Domain assessments are removed via CASCADE on the FK.
router.delete("/studies/:studyId", async (req, res) => {
  const params = DeleteStudyParams.safeParse({ studyId: Number(req.params.studyId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid studyId" });
    return;
  }

  const { studyId } = params.data;

  try {
    const [deleted] = await db
      .delete(studiesTable)
      .where(eq(studiesTable.id, studyId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Study not found" });
      return;
    }

    // 204 No Content — successful delete with no body
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete study");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
