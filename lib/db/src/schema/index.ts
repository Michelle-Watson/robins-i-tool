/**
 * schema/index.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Central barrel export for all Drizzle table definitions and Zod schemas.
 *
 * Import order matters: tables that are referenced by foreign keys must be
 * exported before the tables that reference them so that the `references()`
 * callback can resolve the table object at runtime.
 *
 * Current dependency order:
 *   studies  ──FK──►  domain_assessments
 * ──────────────────────────────────────────────────────────────────────────
 */

// ─── studies (no foreign key dependencies) ───────────────────────────────────
export * from "./studies";

// ─── domain_assessments (depends on studies via FK) ──────────────────────────
export * from "./domain_assessments";
