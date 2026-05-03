/**
 * studies.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Drizzle schema for the `studies` table.
 *
 * A "study" represents one research paper (or outcome within a paper) that is
 * being assessed for risk of bias using the ROBINS-I V2 instrument.
 *
 * KEY DESIGN DECISION — domain1Variant:
 *   Each study uses *either* Domain 1A (intention-to-treat / ITT analysis) or
 *   Domain 1B (per-protocol analysis), never both. This variant is set when
 *   the study is created and is immutable once domain assessments exist.
 *   The application enforces this: if variant is 'itt', only domain '1a' may
 *   be saved; if variant is 'per-protocol', only domain '1b' may be saved.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enum: Domain 1 variant ──────────────────────────────────────────────────
// Stored as a native Postgres enum for referential integrity.
export const domain1VariantEnum = pgEnum("domain1_variant", [
  "itt",           // Variant A – intention-to-treat analysis → uses Domain 1A
  "per-protocol",  // Variant B – per-protocol analysis      → uses Domain 1B
]);

// ─── Table definition ────────────────────────────────────────────────────────
export const studiesTable = pgTable("studies", {
  /** Auto-incremented surrogate key. */
  id: serial("id").primaryKey(),

  /**
   * Short reference name for the study, e.g. "Smith et al. 2022".
   * Must be non-empty; max 300 characters enforced in the insert schema.
   */
  name: text("name").notNull(),

  /**
   * Optional longer description, abstract summary, or assessor notes.
   * Stored as plain text; nullable.
   */
  description: text("description"),

  /**
   * Whether Domain 1A (ITT) or Domain 1B (per-protocol) applies.
   * Determines which domain assessment variant is valid for this study.
   */
  domain1Variant: domain1VariantEnum("domain1_variant").notNull(),

  /** Timestamp set automatically on INSERT. */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  /**
   * Timestamp updated on every PATCH. Drizzle does not auto-update this —
   * route handlers must explicitly set it with `new Date()` on updates.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Zod schemas derived from the Drizzle table ──────────────────────────────

/** Schema for INSERT — omits auto-generated fields (id, timestamps). */
export const insertStudySchema = createInsertSchema(studiesTable, {
  name: z.string().min(1, "Name is required").max(300, "Name too long"),
  description: z.string().nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

/** Schema for SELECT — full row shape. */
export const selectStudySchema = createSelectSchema(studiesTable);

/** TypeScript type inferred from the insert schema. */
export type InsertStudy = z.infer<typeof insertStudySchema>;

/** TypeScript type for a fully-selected study row. */
export type Study = typeof studiesTable.$inferSelect;
