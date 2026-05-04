# 🔬 ROBINS‑I Tool

**A full‑stack web application that implements the ROBINS‑I (Risk Of Bias In Non‑randomised Studies of Interventions) assessment methodology.** Designed for researchers, epidemiologists, and systematic reviewers, the tool enables structured bias assessment across seven domains using interactive decision trees, keeps a centralised study registry, and provides a real‑time dashboard to monitor risk levels.

---

**Live App**: [robins-i-tool-api-server.vercel.app](https://robins-i-tool-api-server.vercel.app)  
**API Endpoint**: `https://robins-i-tool.onrender.com/api`  
**Database**: Supabase PostgreSQL (pooled connection)  
**Public Repository**: [github.com/Michelle-Watson/robins-i-tool](https://github.com/Michelle-Watson/robins-i-tool)

---

## 🚀 Features (At‑a‑Glance)

- **[Study Manager](#-study-manager)** – Create, view, update, and delete observational studies tracked with ITT or per‑protocol protocol variants.
- **[Interactive Decision‑Tree Wizard](#-interactive-decision-tree-wizard)** – Step through the seven ROBINS‑I bias domains using visual, interactive decision trees built with React Flow.
- **[Real‑Time Dashboard](#-real-time-dashboard)** – At‑a‑glance progress overview showing risk breakdowns, completion percentages, and recent study activity.
- **[Data Integrity by Design](#-data-integrity-by-design)** – PostgreSQL `ENUM` types, a unique constraint per study‑domain pair, and foreign keys guarantee valid, deduplicated data.
- **[OpenAPI‑Driven Code Generation](#-openapi-driven-code-generation)** – A single OpenAPI spec is the source of truth. It auto‑generates Zod validation schemas, React Query hooks, and TypeScript types, eliminating manual duplication.
- **[Three‑Tier Deployment](#-three-tier-deployment)** – Vercel (frontend), Render (API), Supabase (database) — cleanly separated with environment variables wiring everything together.

---

## 🧠 Technical Deep‑Dives

### 📋 Study Manager

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | Stores information about non‑randomised studies (name, description, and protocol variant: ITT or per‑protocol). Users can create, list, edit, and delete studies. The variant choice determines whether Domain 1A (ITT) or Domain 1B (per‑protocol) is used for assessment.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Relevant files** | [`lib/db/src/schema/studies.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/lib/db/src/schema/studies.ts) (Drizzle schema) · [`artifacts/api-server/src/routes/studies.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/api-server/src/routes/studies.ts) (Express routes) · [`artifacts/robins-i-app/src/pages/studies/list.tsx`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/robins-i-app/src/pages/studies/list.tsx) (study list page) · [`artifacts/robins-i-app/src/pages/studies/detail.tsx`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/robins-i-app/src/pages/studies/detail.tsx) (study detail page) |
| **How it works**   | The `studies` table uses a PostgreSQL `ENUM` for `domain1_variant` (`itt` / `per-protocol`). The Express routes (`GET /api/studies`, `POST /api/studies`, `GET /api/studies/:studyId`, `PATCH /api/studies/:studyId`, `DELETE /api/studies/:studyId`) use Zod schemas generated from the OpenAPI spec to validate all inputs. The `GET /api/studies` endpoint fetches all studies and enriches each one with assessed‑domain counts, total domains (always 6), and the worst outcome across all domains by batch‑querying assessments and computing severity in memory.                                                                                                                                   |
| **Tech stack**     | Drizzle ORM, PostgreSQL, Express, Zod (generated from OpenAPI via [`lib/api-zod`](https://github.com/Michelle-Watson/robins-i-tool/tree/main/lib/api-zod))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 🌳 Interactive Decision‑Tree Wizard

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | Guides users through the seven ROBINS‑I bias domains (1. Confounding, 2. Selection, 3. Classification, 4. Deviations, 5. Missing Data, 6. Measurement). Each domain renders as an interactive decision tree where assessors answer signalling questions by clicking nodes. The tree dynamically highlights paths and culminates in a risk‑of‑bias outcome (`low`, `moderate`, `serious`, `critical`, or `low‑except` for Domain 1B).                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Relevant files** | [`artifacts/robins-i-app/src/pages/studies/wizard.tsx`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/robins-i-app/src/pages/studies/wizard.tsx) (wizard page) · [`artifacts/robins-i-app/src/components/domain-trees/shared.tsx`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/robins-i-app/src/components/domain-trees/shared.tsx) (shared building blocks) · `artifacts/robins-i-app/src/components/domain-trees/Domain1AGraph.tsx` through `Domain6Graph.tsx` (one graph component per domain) · [`artifacts/api-server/src/routes/assessments.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/api-server/src/routes/assessments.ts) (upsert endpoint)                                                                                                                                                          |
| **How it works**   | The wizard page detects which domain is requested from the URL (`/studies/:studyId/wizard/:domainId`) and dynamically renders the matching graph component (e.g., `Domain1AGraph` for domain `"1a"`). Each graph is a set of `QuestionNode` and `OutcomeNode` components rendered inside a `@xyflow/react` flow canvas. As the user clicks through questions, answers accumulate in a React state map. When a terminal outcome node is reached, the user can save. Saving calls `PUT /api/studies/:studyId/assessments/:domainId`, which performs an upsert via `INSERT ... ON CONFLICT DO UPDATE`. The API enforces that `itt` studies can only save domain `"1a"` and `per-protocol` studies can only save `"1b"`, returning HTTP 400 otherwise. Assessment answers are stored as `jsonb` in the database, allowing the question structure to evolve independently of the database schema. |
| **Tech stack**     | React, `@xyflow/react` (React Flow), TanStack Query (`useUpsertAssessment`), shadcn/ui, Drizzle ORM, PostgreSQL `jsonb`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### 📊 Real‑Time Dashboard

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | Shows total studies, fully‑assessed count, completion percentage, critical‑risk count, a bar‑chart risk breakdown, and a list of the five most recently updated studies with their assessment progress.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Relevant files** | [`artifacts/api-server/src/routes/dashboard.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/api-server/src/routes/dashboard.ts) (aggregation endpoint) · [`artifacts/robins-i-app/src/pages/dashboard.tsx`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/artifacts/robins-i-app/src/pages/dashboard.tsx) (dashboard page)                                                                                                                                                                                                                                                                                                                                               |
| **How it works**   | The frontend calls `GET /api/dashboard/summary` via `useGetDashboardSummary()` (generated by orval from the OpenAPI spec). The Express endpoint queries all studies and their assessments in two queries (no N+1 problem), computes worst‑outcome severity per study using an in‑memory severity map (`low=0` → `critical=4`), then returns a JSON payload: `totalStudies`, `fullyAssessed`, `riskBreakdown` (counts per risk level), and `recentStudies` (top 5 by `updatedAt`). The frontend renders the data with shadcn/ui `Card` components, colour‑coded `Badge` components (green→yellow→orange→red→black for increasing severity), and horizontal bar charts built with inline percentage calculations. |
| **Tech stack**     | React Query (generated hook), Express, Drizzle ORM, shadcn/ui components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 🔐 Data Integrity by Design

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | Built‑in database constraints prevent invalid data from ever being stored. No non‑existent study references. No duplicate assessments per domain. Only allowed enum values.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Relevant files** | [`lib/db/src/schema/studies.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/lib/db/src/schema/studies.ts) · [`lib/db/src/schema/domain_assessments.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/lib/db/src/schema/domain_assessments.ts)                                                                                                                                                                                                                                                                                                                       |
| **How it works**   | Three custom PostgreSQL `ENUM` types restrict column values: `domain1_variant` (`itt`, `per-protocol`), `domain_id` (`1a`, `1b`, `2`–`6`), and `risk_level` (`low`, `low-except`, `moderate`, `serious`, `critical`). The `domain_assessments` table has a composite `UNIQUE(study_id, domain_id)` constraint ensuring at most one assessment per domain per study. A `FOREIGN KEY` on `study_id` with `ON DELETE CASCADE` guarantees orphaned assessments are impossible. The `domain1_variant` cross‑validation with `domain_id` is enforced at the API layer in `checkVariantCompatibility()`. |
| **Tech stack**     | PostgreSQL native ENUMs, Drizzle ORM schema definitions, Zod validation in API routes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### 🔄 OpenAPI‑Driven Code Generation

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | A single OpenAPI 3.1.0 YAML spec describes every endpoint, request body, response schema, and parameter. The `orval` code generator consumes this spec and produces three packages that stay perfectly in sync: Zod validation schemas, React Query hooks, and TypeScript types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Relevant files** | [`lib/api-spec/openapi.yaml`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/lib/api-spec/openapi.yaml) (source of truth) · [`lib/api-zod/src/generated/types/`](https://github.com/Michelle-Watson/robins-i-tool/tree/main/lib/api-zod/src/generated/types) (Zod schemas) · [`lib/api-client-react/src/`](https://github.com/Michelle-Watson/robins-i-tool/tree/main/lib/api-client-react/src) (React Query hooks)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **How it works**   | The OpenAPI spec at `lib/api-spec/openapi.yaml` defines paths (`/studies`, `/studies/{studyId}`, `/studies/{studyId}/assessments`, `/dashboard/summary`, `/healthz`), request/response schemas, parameters, and tags. An orval configuration (invoked during build) generates: **(1)** `lib/api-zod` — Zod schemas for every request body, query param, path param, and response shape (used by the Express routes for validation). **(2)** `lib/api-client-react` — TanStack Query hooks like `useListStudies()`, `useGetStudy()`, `useCreateStudy()`, `useUpsertAssessment()`, `useGetDashboardSummary()` with proper query keys, mutation functions, and TypeScript generics. A `custom-fetch.ts` wrapper handles base URL prefixing, auth token injection, and JSON parsing. All generated code carries the warning `/* Generated by orval — Do not edit manually */` and is re‑generated whenever the OpenAPI spec changes. |
| **Tech stack**     | OpenAPI 3.1.0, orval, Zod, TanStack Query (React Query v5), TypeScript                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### 🏗 Three‑Tier Deployment

| Aspect             | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it does**   | Separates concerns across three independently scalable services. The frontend (Vercel) is a static SPA. The API (Render) is a long‑running Express server. The database (Supabase) is a managed PostgreSQL instance with a connection pooler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Relevant files** | [`render.yaml`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/render.yaml) (Render blueprint) · [`vercel.json`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/vercel.json) (Vercel config) · [`lib/db/src/schema/index.ts`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/lib/db/src/schema/index.ts) (schema barrel export)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **How it works**   | **Render:** The `render.yaml` blueprint defines a `web` service named `robins-i-tool-api`. It builds with `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`, starts with `node --enable-source-maps artifacts/api-server/dist/index.mjs`, and exposes a health check at `/api/healthz`. Required environment variables: `NODE_ENV`, `PORT` (10000), `DATABASE_URL` (Supabase pooled connection), and `SESSION_SECRET`. **Vercel:** The `vercel.json` config installs with pnpm, builds with `pnpm --filter @workspace/robins-i-app run build`, serves from `artifacts/robins-i-app/dist/public`, and rewrites all routes to `index.html` for client‑side routing. The frontend reads `VITE_API_BASE_URL` at runtime to configure the API client's base URL (set to `https://robins-i-tool.onrender.com` in production). **Supabase:** Uses a pooled connection via port 5432 on `aws-1-us-west-2.pooler.supabase.com` to ensure IPv4 connectivity from Render's network. Schema migrations are managed by Drizzle. |
| **Tech stack**     | Vercel, Render, Supabase, pnpm workspaces, Render blueprints                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## 🛠️ Tech Stack

| Layer          | Technology                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | React 18, Vite, TypeScript, wouter (routing), TanStack Query (React Query v5), shadcn/ui (Radix primitives + Tailwind), `@xyflow/react` (React Flow) |
| API            | Node.js, Express, TypeScript, Drizzle ORM, Pino (logging), Zod (validation)                                                                          |
| Database       | PostgreSQL (Supabase), connection pooler (PgBouncer)                                                                                                 |
| Code Gen       | OpenAPI 3.1.0, orval                                                                                                                                 |
| Infrastructure | Vercel (frontend), Render (API), Supabase (managed DB), pnpm workspaces                                                                              |

---

## 📁 Project Structure (Monorepo)

```text
robins-i-tool/
├── lib/
│ ├── api-spec/ # OpenAPI 3.1.0 spec — source of truth for all endpoints
│ │ └── openapi.yaml
│ ├── api-zod/ # Auto‑generated Zod schemas from OpenAPI (orval)
│ │ └── src/generated/types/
│ ├── api-client-react/ # Auto‑generated React Query hooks + fetch client (orval)
│ │ └── src/
│ │ ├── generated/ # Generated hooks (api.ts, api.schemas.ts)
│ │ └── custom-fetch.ts
│ └── db/ # Drizzle ORM schemas & migrations
│ └── src/schema/
│ ├── index.ts # Barrel export
│ ├── studies.ts # studies table + Zod insert/select schemas
│ └── domain_assessments.ts # domain_assessments table + enums
├── artifacts/
│ ├── api-server/ # Express API server (deployed to Render)
│ │ └── src/
│ │ ├── index.ts # Entry point — reads PORT, starts server
│ │ ├── app.ts # Express app setup (CORS, JSON, Pino, /api mount)
│ │ ├── lib/logger.ts
│ │ ├── middlewares/
│ │ └── routes/
│ │ ├── index.ts # Central router — mounts all sub‑routers
│ │ ├── health.ts
│ │ ├── studies.ts
│ │ ├── assessments.ts
│ │ └── dashboard.ts
│ ├── robins-i-app/ # Vite React frontend (deployed to Vercel)
│ │ └── src/
│ │ ├── main.tsx # Entry point — configures API base URL from env
│ │ ├── App.tsx # Router setup (wouter)
│ │ ├── pages/
│ │ │ ├── dashboard.tsx
│ │ │ ├── not-found.tsx
│ │ │ └── studies/
│ │ │ ├── list.tsx # Study list + create dialog
│ │ │ ├── detail.tsx # Study detail + domain grid
│ │ │ ├── wizard.tsx # Assessment wizard (decision tree)
│ │ │ └── results.tsx # Printable results summary
│ │ └── components/
│ │ ├── domain-trees/ # 7 decision‑tree graph components
│ │ │ ├── shared.tsx # QuestionNode, OutcomeNode, mkEdge, etc.
│ │ │ ├── Domain1AGraph.tsx
│ │ │ ├── Domain1BGraph.tsx
│ │ │ ├── Domain2Graph.tsx
│ │ │ ├── Domain3Graph.tsx
│ │ │ ├── Domain4Graph.tsx
│ │ │ ├── Domain5Graph.tsx
│ │ │ └── Domain6Graph.tsx
│ │ └── ui/ # shadcn/ui components
│ └── mockup-sandbox/ # Mockup/prototype sandbox
├── scripts/ # Utility scripts
├── render.yaml # Render blueprint
├── vercel.json # Vercel deployment config
├── package.json # Workspace root (pnpm)
└── pnpm-workspace.yaml
```

---

## 🧪 Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- pnpm (see [`package.json`](https://github.com/Michelle-Watson/robins-i-tool/blob/main/package.json) — the `preinstall` script enforces pnpm)
- A Supabase project (or local PostgreSQL 15+)
- Render and Vercel accounts (for deployment only)

### 1. Clone & Install

```bash
git clone https://github.com/Michelle-Watson/robins-i-tool.git
cd robins-i-tool
pnpm install
```

### 2. Set Up the Database

1. Create a Supabase project.
2. In the Supabase SQL Editor, run the schema migration (create the `ENUM` types, `studies` table, `domain_assessments` table, and constraints). The Drizzle schema in `lib/db/src/schema/` defines the exact structure.
3. In **Supabase → Database → Settings → Connection pooling**, copy the Session pooler connection string (the one with pooler.supabase.com).
   - This is because Render API tries to connect to Supabase using an IPv6 address. We used the connection pooling string. Supabase domains resolve to both IPv4 and IPv6, but Render can't reach the IPv6 addres. Supabase’s connection pooler is designed for external services like Render and already resolves to an IPv4 address.

### 4. Set Up Environment Variables

Create a `.env` file in the root of the `api-server` artifact (the Render blueprint uses environment variables, but local development needs a `.env`):

```javascript
DATABASE_URL=postgresql://postgres.zgxmbifyjdzhuksiyxqs:[YOUR-PASSWORD]@aws-1-us-west-2.pooler.supabase.com:5432/postgres
SESSION_SECRET=any-random-string-for-development
PORT=10000
NODE_ENV=development
```

The frontend doesn't need a `.env` for local development — when `VITE_API_BASE_URL` is absent, the API client defaults to relative `/api/*` URLs (suitable for the Replit reverse proxy). For Vercel production, set:

```javascript
VITE_API_BASE_URL=https://robins-i-tool.onrender.com
```

### 4. Start the Backend

```bash
cd artifacts/api-server
pnpm dev
```

The API will be available at `http://localhost:10000/api`.

### 5. Start the Frontend

```bash
cd artifacts/robins-i-app
pnpm dev
```

## 🔑 Environment Variables Reference

| Variable            | Where               | Purpose                                                                        |
| ------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`      | Render / local .env | Full Supabase pooled connection string (port 5432 on pooler.supabase.com)      |
| `SESSION_SECRET`    | Render / local .env | Secret for session management middleware                                       |
| `PORT`              | Render / local .env | Server port (Render auto‑assigns 10000)                                        |
| `NODE_ENV`          | Render / local .env | Set to "production" on Render                                                  |
| `VITE_API_BASE_URL` | Vercel              | Base URL of the deployed API server (e.g., https://robins-i-tool.onrender.com) |

## 🙏🏾 Acknowledgments

- Inspired by the [ROBINS‑I tool](https://www.riskofbias.info/welcome/home) developed by the Cochrane Bias Methods Group.
- The example studies in the database come from Hernán & Robins (2016), VanderWeele et al. (2020), and Dickerman et al. (2019).
- Code generation powered by orval.
- Decision‑tree visualisation built with React Flow.
- UI components from shadcn/ui.

---

### 📝 About the `artifacts/` folder

The `artifacts/` folder is where the **runnable application code lives**. This is where you edit files when writing code:

- **`artifacts/api-server/`** — The Express API server. This is deployed to Render.
- **`artifacts/robins-i-app/`** — The Vite React frontend. This is deployed to Vercel.
- **`artifacts/mockup-sandbox/`** — A separate mockup/sandbox tool (not part of the main app).

The shared packages in `lib/` (`api-spec`, `api-zod`, `api-client-react`, `db`) are consumed by both artifacts via the monorepo's workspace linking. You edit the artifact source files directly when working on the application.

### 📝 About the `.env.example` file

Your project doesn't have a `.env.example` yet. Based on the code, here's the one you should create at the root of your repository:

**`.env.example`** (for local development reference)

```python
# ── Database ─────────────────────────────────────────────────
# Supabase pooled connection string (Session pooler, port 5432)
# Copy from Supabase → Database → Settings → Connection pooling
DATABASE_URL=postgresql://postgres.zgxmbifyjdzhuksiyxqs:YOUR_PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres

# ── Session ─────────────────────────────────────────────────
# Any random string for session encryption (dev only)
SESSION_SECRET=your-secret-here

# ── Server ──────────────────────────────────────────────────
PORT=10000
NODE_ENV=development

# ── Frontend (Vercel production only) ────────────────────────
VITE_API_BASE_URL=https://robins-i-tool.onrender.com
```

The frontend doesn't require a `.env` for local development because `main.tsx` passes `null` to `setBaseUrl()` when `VITE_API_BASE_URL` is absent, which causes the API client to use relative `/api/*` URLs — this works through the Replit proxy or Vite's dev server proxy.
