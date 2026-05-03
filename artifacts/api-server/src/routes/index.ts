/**
 * routes/index.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Central router that mounts all sub-routers under /api.
 *
 * Mount order matters for Express route matching — more specific paths
 * should be mounted before more general ones, but since each sub-router
 * uses unique path prefixes there is no conflict here.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studiesRouter from "./studies";
import assessmentsRouter from "./assessments";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

// ─── Health ───────────────────────────────────────────────────────────────────
// GET /api/healthz
router.use(healthRouter);

// ─── Dashboard ────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
router.use(dashboardRouter);

// ─── Studies ──────────────────────────────────────────────────────────────────
// GET    /api/studies
// POST   /api/studies
// GET    /api/studies/:studyId
// PATCH  /api/studies/:studyId
// DELETE /api/studies/:studyId
router.use(studiesRouter);

// ─── Assessments (nested under studies) ──────────────────────────────────────
// GET    /api/studies/:studyId/assessments
// PUT    /api/studies/:studyId/assessments/:domainId
// DELETE /api/studies/:studyId/assessments/:domainId
router.use(assessmentsRouter);

export default router;
