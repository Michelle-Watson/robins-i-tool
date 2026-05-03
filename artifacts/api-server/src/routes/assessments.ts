/**
 * routes/assessments.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Express router for domain assessments nested under a study.
 *
 * Endpoints:
 *   GET    /studies/:studyId/assessments                     — list assessments
 *   PUT    /studies/:studyId/assessments/:domainId           — upsert one domain
 *   DELETE /studies/:studyId/assessments/:domainId           — clear one domain
 *
 * ROBINS-I V2 variant enforcement:
 *   A study with domain1Variant='itt' may only have domain '1a' saved.
 *   A study with domain1Variant='per-protocol' may only have domain '1b' saved.
 *   Attempts to save the wrong Domain-1 variant return HTTP 400.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, studiesTable, domainAssessmentsTable } from "@workspace/db";
import {
  ListAssessmentsParams,
  UpsertAssessmentParams,
  UpsertAssessmentBody,
  DeleteAssessmentParams,
} from "@workspace/api-zod";

const router: IRouter = Router({ mergeParams: true });

// ─── Variant enforcement helper ───────────────────────────────────────────────
// Returns an error string if the domainId conflicts with the study's variant,
// or null if the combination is valid.
function checkVariantCompatibility(
  domain1Variant: string,
  domainId: string,
): string | null {
  if (domainId === "1a" && domain1Variant !== "itt") {
    return "Domain 1A (ITT) cannot be assessed for a per-protocol study. Use Domain 1B instead.";
  }
  if (domainId === "1b" && domain1Variant !== "per-protocol") {
    return "Domain 1B (per-protocol) cannot be assessed for an ITT study. Use Domain 1A instead.";
  }
  return null; // compatible
}

// ─── GET /studies/:studyId/assessments ───────────────────────────────────────
// Returns all saved domain assessments for the given study.
router.get("/studies/:studyId/assessments", async (req, res) => {
  const params = ListAssessmentsParams.safeParse({
    studyId: Number(req.params.studyId),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid studyId" });
    return;
  }

  const { studyId } = params.data;

  try {
    // Verify the study exists before querying assessments
    const [study] = await db
      .select({ id: studiesTable.id })
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

    res.json(assessments);
  } catch (err) {
    req.log.error({ err }, "Failed to list assessments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /studies/:studyId/assessments/:domainId ─────────────────────────────
// Creates or replaces the assessment for a single domain.
// Implements an upsert via INSERT ... ON CONFLICT DO UPDATE.
router.put(
  "/studies/:studyId/assessments/:domainId",
  async (req, res) => {
    // Validate path params
    const params = UpsertAssessmentParams.safeParse({
      studyId: Number(req.params.studyId),
      domainId: req.params.domainId,
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    // Validate request body
    const body = UpsertAssessmentBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const { studyId, domainId } = params.data;
    const { answers, outcome, notes } = body.data;

    try {
      // Fetch the parent study to check variant compatibility
      const [study] = await db
        .select({ id: studiesTable.id, domain1Variant: studiesTable.domain1Variant })
        .from(studiesTable)
        .where(eq(studiesTable.id, studyId))
        .limit(1);

      if (!study) {
        res.status(404).json({ error: "Study not found" });
        return;
      }

      // Enforce ITT ↔ per-protocol domain variant rule
      const variantError = checkVariantCompatibility(
        study.domain1Variant,
        domainId,
      );
      if (variantError) {
        res.status(400).json({ error: variantError });
        return;
      }

      // Upsert the assessment — insert if not exists, update if it does.
      // The unique constraint on (study_id, domain_id) drives conflict detection.
      const [saved] = await db
        .insert(domainAssessmentsTable)
        .values({
          studyId,
          domainId: domainId as
            | "1a"
            | "1b"
            | "2"
            | "3"
            | "4"
            | "5"
            | "6",
          answers,
          outcome: outcome as
            | "low"
            | "low-except"
            | "moderate"
            | "serious"
            | "critical",
          notes: notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            domainAssessmentsTable.studyId,
            domainAssessmentsTable.domainId,
          ],
          set: {
            answers,
            outcome: outcome as
              | "low"
              | "low-except"
              | "moderate"
              | "serious"
              | "critical",
            notes: notes ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Also update the parent study's updatedAt so list queries reflect activity
      await db
        .update(studiesTable)
        .set({ updatedAt: new Date() })
        .where(eq(studiesTable.id, studyId));

      res.json(saved);
    } catch (err) {
      req.log.error({ err }, "Failed to upsert assessment");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ─── DELETE /studies/:studyId/assessments/:domainId ──────────────────────────
// Removes a saved domain assessment so it can be re-assessed from scratch.
router.delete(
  "/studies/:studyId/assessments/:domainId",
  async (req, res) => {
    const params = DeleteAssessmentParams.safeParse({
      studyId: Number(req.params.studyId),
      domainId: req.params.domainId,
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const { studyId, domainId } = params.data;

    try {
      const [deleted] = await db
        .delete(domainAssessmentsTable)
        .where(
          and(
            eq(domainAssessmentsTable.studyId, studyId),
            eq(domainAssessmentsTable.domainId, domainId as "1a" | "1b" | "2" | "3" | "4" | "5" | "6"),
          ),
        )
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Assessment not found" });
        return;
      }

      res.status(204).send();
    } catch (err) {
      req.log.error({ err }, "Failed to delete assessment");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
