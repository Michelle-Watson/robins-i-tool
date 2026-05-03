/**
 * domain_assessments.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Drizzle schema for the `domain_assessments` table.
 *
 * Each row stores the complete risk-of-bias assessment for one ROBINS-I
 * domain within one study.  There is at most one row per (study_id, domain_id)
 * pair — the unique constraint enforces this.
 *
 * ROBINS-I V2 has 7 domains, but Domain 1 has two mutually-exclusive variants:
 *   1a  — Confounding (intention-to-treat / ITT analysis)
 *   1b  — Confounding (per-protocol analysis)
 *   2   — Selection of participants
 *   3   — Classification of interventions
 *   4   — Deviations from intended interventions
 *   5   — Missing outcome data
 *   6   — Measurement of outcomes
 *
 * The application guarantees that only the correct Domain-1 variant is stored
 * for each study (ITT studies → 1a only; per-protocol studies → 1b only).
 *
 * answers (JSONB):
 *   A free-form key-value map of question IDs → selected answer strings.
 *   The shape varies per domain.  Examples:
 *     Domain 1A: { q11: "Y/PY", q12: "WN", q13: "N/PN", q14: "Y/PY", q15: "Y/PY" }
 *     Domain 6:  { q61: "Y/PY", q62: "N/PN/NI", q63: "Y/PY", q64: "N/PN/NI" }
 *   Storing as JSONB lets the wizard evolve independently of the DB schema.
 * ──────────────────────────────────────────────────────────────────────────
 */

import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studiesTable } from "./studies";

// ─── Enum: Domain identifier ─────────────────────────────────────────────────
export const domainIdEnum = pgEnum("domain_id", [
  "1a",  // Confounding — ITT / intention-to-treat variant
  "1b",  // Confounding — per-protocol variant
  "2",   // Selection of participants
  "3",   // Classification of interventions
  "4",   // Deviations from intended interventions
  "5",   // Missing outcome data
  "6",   // Measurement of outcomes
]);

// ─── Enum: Risk level outcome ─────────────────────────────────────────────────
export const riskLevelEnum = pgEnum("risk_level", [
  "low",         // Low risk of bias
  "low-except",  // Low risk except for uncontrolled confounding (Domain 1B only)
  "moderate",    // Moderate risk of bias
  "serious",     // Serious risk of bias
  "critical",    // Critical risk of bias
]);

// ─── Table definition ────────────────────────────────────────────────────────
export const domainAssessmentsTable = pgTable(
  "domain_assessments",
  {
    /** Auto-incremented surrogate key. */
    id: serial("id").primaryKey(),

    /**
     * Foreign key back to the parent study.
     * Cascade delete: removing a study removes all its assessments.
     */
    studyId: integer("study_id")
      .notNull()
      .references(() => studiesTable.id, { onDelete: "cascade" }),

    /**
     * Which ROBINS-I domain this row covers.
     * The app enforces the ITT/per-protocol variant rule at the API layer.
     */
    domainId: domainIdEnum("domain_id").notNull(),

    /**
     * Question-answer state captured from the interactive wizard.
     * Keyed by question ID strings (e.g. "q11", "q42").
     * Values are answer strings (e.g. "Y/PY", "N/PN/NI", "WN").
     * Stored as JSONB for schema flexibility as the tool evolves.
     */
    answers: jsonb("answers").notNull().$type<Record<string, string>>(),

    /**
     * The final computed risk-of-bias outcome for this domain.
     * Determined by the wizard decision tree; stored here for fast queries.
     */
    outcome: riskLevelEnum("outcome").notNull(),

    /**
     * Optional free-text notes or justification from the assessor.
     * Useful for audit trails and review discussions.
     */
    notes: text("notes"),

    /** Timestamp set automatically on first INSERT. */
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    /**
     * Timestamp updated on every PUT (upsert).
     * Route handlers must set this explicitly on update.
     */
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Enforce one assessment per domain per study — upsert replaces the row.
    unique("uq_study_domain").on(table.studyId, table.domainId),
  ],
);

// ─── Zod schemas ─────────────────────────────────────────────────────────────

/** Schema for INSERT — omits auto-generated fields. */
export const insertDomainAssessmentSchema = createInsertSchema(
  domainAssessmentsTable,
  {
    answers: z.record(z.string(), z.string()),
    notes: z.string().nullable().optional(),
  },
).omit({ id: true, createdAt: true, updatedAt: true });

/** Schema for SELECT — full row shape. */
export const selectDomainAssessmentSchema = createSelectSchema(
  domainAssessmentsTable,
);

/** TypeScript type for inserting a domain assessment. */
export type InsertDomainAssessment = z.infer<
  typeof insertDomainAssessmentSchema
>;

/** TypeScript type for a fully-selected domain assessment row. */
export type DomainAssessment = typeof domainAssessmentsTable.$inferSelect;
