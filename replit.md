# ROBINS-I V2 Risk-of-Bias Assessment Tool

## Project Overview

An interactive web application for conducting structured risk-of-bias assessments using the
**ROBINS-I V2** (Risk of Bias in Non-randomised Studies – of Interventions, Version 2)
framework. Currently in the **mockup phase**: all 7 domain algorithms are implemented as
interactive React Flow decision-tree graphs for user verification before the main app is built.

**Source of truth:** PDF algorithm images in `attached_assets/` — these override any prior
notes or inferences if there is a conflict.

---

## Current Phase: Interactive Algorithm Mockups (Canvas)

All 7 ROBINS-I domains are implemented as standalone React Flow components in the mockup
sandbox. Each component lets you click through the algorithm step by step, lighting up the
active path as you answer questions.

### Domains Implemented

| Domain | Name | File | Accent |
|--------|------|------|--------|
| 1A | Confounding — Intention-to-treat | `Domain1AGraph.tsx` | Blue |
| 1B | Confounding — Per-protocol | `Domain1BGraph.tsx` | Purple |
| 2 | Classification of interventions | `Domain2Graph.tsx` | Teal |
| 3 | Deviations from intended interventions | `Domain3Graph.tsx` | Orange |
| 4 | Missing data | `Domain4Graph.tsx` | Amber |
| 5 | Measurement of outcomes | `Domain5Graph.tsx` | Indigo |
| 6 | Selection of the reported result | `Domain6Graph.tsx` | Rose |

### Canvas Mockup Preview URLs

Base domain: `https://5f82d8a1-1045-4a1e-a1e9-ed71adbb780e-00-3n3mzqx7qdcgg.picard.replit.dev`

| Component | Preview Path |
|-----------|-------------|
| Domain1AGraph | `/__mockup/preview/domain-trees/Domain1AGraph` |
| Domain1BGraph | `/__mockup/preview/domain-trees/Domain1BGraph` |
| Domain2Graph  | `/__mockup/preview/domain-trees/Domain2Graph`  |
| Domain3Graph  | `/__mockup/preview/domain-trees/Domain3Graph`  |
| Domain4Graph  | `/__mockup/preview/domain-trees/Domain4Graph`  |
| Domain5Graph  | `/__mockup/preview/domain-trees/Domain5Graph`  |
| Domain6Graph  | `/__mockup/preview/domain-trees/Domain6Graph`  |

---

## Key Algorithm Notes (traced from PDF images)

### Domain 1A (Variant A — Intention-to-treat)
- **Used when** C4 = No (no deviation from intended intervention analysed)
- **Outcomes**: LOW* (yellow), MODERATE, SERIOUS, CRITICAL
- No pure "LOW" in 1A — best possible is LOW* (except for uncontrolled confounding)
- **Critical fix**: From `n12_top`, `SN/NI` goes DIRECTLY to SERIOUS without asking Q1.4
  (confounders not validly measured → bias is already serious, no need to check neg controls)
- `1.1=SN/NI` path: Q1.4 is asked BEFORE Q1.2 (reversed from question numbering)
- Q1.4=Y/PY on the SN/NI path → CRITICAL

### Domain 1B (Variant B — Per-protocol)
- **Used when** C4 = Yes (effects of assignment to intervention analysed)
- **Outcomes**: LOW (pure green), LOW* (yellow), MODERATE, SERIOUS, CRITICAL
- Domain 1B has FIVE distinct outcomes; 1A has only four (no pure LOW)
- **CRITICAL IS reachable from 1.1=Y/PY path** via SN/NI shortcuts to the shared bottom Q1.5
  - `1.2=SN/NI` → Q1.5 bot → Y/PY: CRITICAL
  - `1.3_top=SN/NI` → Q1.5 bot → Y/PY: CRITICAL
  - `1.3_mid=SN/NI` → Q1.5 bot → Y/PY: CRITICAL
- Three Q1.5 instances (top/mid/bot), each feeding different outcomes:
  - Top (from 1.3_top=Y/PY): LOW (N/PN) | SERIOUS (Y/PY)
  - Mid (from 1.3_mid=Y/PY/WN): LOW* (N/PN) | MODERATE (Y/PY)
  - Bot (shared bad path): SERIOUS (N/PN) | CRITICAL (Y/PY)

### Domain 2 (Classification of interventions)
- Three tiers of Q2.4 and Q2.5 (top/mid/bot) reflecting progressively worse paths
- `2.1=Y/PY` and `2.2=Y/PY` both converge on Q2.4 TOP (shared node)
- `SY` from any Q2.4 tier → CRITICAL direct (no Q2.5 needed)
- Q2.5 top → LOW/MODERATE; mid → MODERATE/SERIOUS; bot → SERIOUS/CRITICAL

### Domain 3 (Deviations from intended interventions)
- **Two independent sub-graphs**: A (follow-up timing) and B (selection characteristics)
- Sub-graphs are assessed in parallel; combined as "worst of A and B"
- If both LOW → FINAL: LOW; if worst MODERATE → FINAL: MODERATE
- If at least one SERIOUS → ask Q3.6, Q3.7, Q3.8 (sensitivity/correction chain)
- Q3.6=Y/PY or Q3.7=Y/PY can downgrade to MODERATE even when sub-graphs showed SERIOUS
- Q3.8=Y/PY → CRITICAL; Q3.8=N/PN/NI → SERIOUS

### Domain 4 (Missing data) — Most Complex Domain
- Entry: Q4.1–4.3 grouped ("all Y/PY" → LOW direct)
- **Q4.4 splits** into Complete Case (Y/PY/NI) vs Non-Complete Case (N/PN) paths
- **Complete Case path**: Q4.5 → Q4.6 → Q4.11 (a, b, or c)
  - `4.6=SN` → CRITICAL direct
  - Q4.11a (from 4.5=N/PN): Y/PY: MODERATE | N/PN: SERIOUS
  - Q4.11b (from 4.6=Y/PY): Y/PY: MODERATE | N/PN: SERIOUS
  - Q4.11c (from 4.6=WN/NI): SERIOUS either way
- **Imputation path**: Q4.7 → Q4.8 → Q4.9 → Q4.11 (d or e)
  - `4.9=SN` or `4.10=SN` → CRITICAL direct
  - Q4.11d (good imputation): Y/PY: LOW | N/PN: SERIOUS
  - Q4.11e (bad imputation/MAR): Y/PY: SERIOUS | N/PN: CRITICAL
- **Alternative method path**: Q4.10 → Q4.11f (or LOW/CRITICAL direct)
  - Q4.10=Y/PY → LOW; Q4.10=SN → CRITICAL

### Domain 5 (Measurement of outcomes)
- Three paths from Q5.1: N/PN (LOW possible), NI (MODERATE possible), Y/PY (SERIOUS direct)
- **Important**: On the TOP path (5.1=N/PN), Q5.3=SY still gives MODERATE (not SERIOUS)
  Both WY/NI and SY go to MODERATE on the top path (confirmed from PDF image)
- SY from Q5.3 only gives SERIOUS on the MID path (5.1=NI)
- Q5.1=Y/PY → SERIOUS immediately (no further questions)

### Domain 6 (Selection of the reported result)
- Q6.1=Y/PY → LOW immediately
- Q6.1=N/PN/NI → ask Q6.2, Q6.3, Q6.4 (assessed as a group, not sequentially)
- Outcome is computed by counting Y/PY and NI across Q6.2–6.4:
  - All N/PN → MODERATE
  - ≥1 NI, 0 Y/PY → SERIOUS
  - 1 Y/PY → SERIOUS
  - ≥2 Y/PY → CRITICAL

---

## Code Architecture

### Mockup Sandbox (`artifacts/mockup-sandbox/`)

```
src/components/mockups/domain-trees/
├── shared.tsx              ← Shared utilities (QuestionNode, OutcomeNode, mkEdge, OUTCOME_C)
├── Domain1AGraph.tsx       ← Domain 1A (blue)
├── Domain1BGraph.tsx       ← Domain 1B (purple)
├── Domain2Graph.tsx        ← Domain 2 (teal)
├── Domain3Graph.tsx        ← Domain 3 (orange)
├── Domain4Graph.tsx        ← Domain 4 (amber)
├── Domain5Graph.tsx        ← Domain 5 (indigo)
└── Domain6Graph.tsx        ← Domain 6 (rose)
```

**Pattern used in every domain graph:**

1. `BASE_NODES` — static array of all React Flow nodes (question boxes + outcome boxes)
2. `BASE_EDGES` — static array of all React Flow edges (inactive/grey by default)
3. `getActivePath(answers)` — pure function that traverses the algorithm and returns the
   set of active node/edge IDs + the current outcome level
4. `getNextStep(answers)` — returns the next question to ask in the interactive panel
5. Component uses `useMemo` to merge `active` flags into nodes/edges on each render

**shared.tsx exports:**
- `QuestionNode` — rounded box with numbered badge; fades when inactive
- `OutcomeNode` — coloured outcome box; glows when active; has both target AND source
  handles (source handle is invisible, needed for Domain 3 intermediate results)
- `OUTCOME_C` — colour palette for all 5 risk levels
- `mkEdge` — creates a React Flow edge with consistent styling
- `ARROW`, `STYLE_GOOD`, `STYLE_BAD`, `STYLE_INACTIVE` — reusable style constants
- `RiskLevel` type: `'low' | 'low-except' | 'moderate' | 'serious' | 'critical'`

### API Server (`artifacts/api-server/`)

Currently provides health endpoint only. The main ROBINS-I app will be built here after
the mockup phase is complete and the user has verified all algorithm graphs are correct.

---

## ROBINS-I V2 Outcome Levels

| Level | CSS | Meaning |
|-------|-----|---------|
| `low` | Green (#dcfce7) | LOW RISK OF BIAS |
| `low-except` | Yellow (#fef9c3) | LOW except for concerns about uncontrolled confounding |
| `moderate` | Orange (#fed7aa) | MODERATE RISK OF BIAS |
| `serious` | Red (#fecaca) | SERIOUS RISK OF BIAS |
| `critical` | Black (#1c1917) | CRITICAL RISK OF BIAS |

---

## Key Technical Decisions

- **React Flow (@xyflow/react)**: Used for the interactive decision tree graphs
- **pnpm monorepo**: All packages under `@workspace/` prefix
- **Mockup sandbox**: Separate Vite dev server for isolated component previews
- **No database yet**: Mockup phase only, no persistence needed
- **SESSION_SECRET**: Configured in environment for future auth use

## Development Notes

- Never call `pnpm dev` at workspace root — use `restart_workflow` instead
- Mockup sandbox auto-generates `src/.generated/mockup-components.ts` on file changes
- All domain graph imports are from `./shared` (not self-contained)
- `shared.tsx` is listed in the registry but not a React component; it's a utility module

## Next Phase: Main App

After user approves the algorithm mockups:
1. Build main ROBINS-I app with study/outcome tracking
2. Implement the 7-domain assessment workflow
3. Add database persistence (PostgreSQL via Drizzle)
4. Add user authentication (Replit Auth or Clerk)
5. Add reporting/export functionality
