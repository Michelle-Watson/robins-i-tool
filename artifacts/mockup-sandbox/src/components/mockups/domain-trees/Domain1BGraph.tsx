/**
 * Domain1BGraph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ROBINS-I V2  Domain 1 – Bias due to confounding
 * Variant B: Per-protocol (used when C4 = Yes)
 *
 * SOURCE IMAGE: attached_assets/image_1777800260802.png  ← SOURCE OF TRUTH
 *
 * ALGORITHM (traced directly from PDF image):
 *
 *  1.1 = Y/PY  →  Q1.2
 *    1.2 = Y/PY   →  Q1.3 (top)
 *      1.3 = Y/PY   → Q1.5 TOP   → N/PN: LOW (pure)  |  Y/PY: SERIOUS
 *      1.3 = SN/NI  → Q1.5 BOT   → N/PN: SERIOUS     |  Y/PY: CRITICAL ★
 *    1.2 = WN     →  Q1.3 (mid)
 *      1.3 = Y/PY/WN → Q1.5 MID  → N/PN: LOW*        |  Y/PY: MODERATE
 *      1.3 = SN/NI   → Q1.5 BOT  → N/PN: SERIOUS     |  Y/PY: CRITICAL ★
 *    1.2 = SN/NI  →  Q1.5 BOT (skip 1.3)
 *                    N/PN: SERIOUS  |  Y/PY: CRITICAL ★
 *
 *  1.1 = N/PN/NI  →  Q1.4
 *    1.4 = Y/PY        →  CRITICAL  (direct, no 1.5 needed)
 *    1.4 = N/PN/NI     →  Q1.5 BOT  → N/PN: SERIOUS  |  Y/PY: CRITICAL
 *
 * ★ IMPORTANT – CRITICAL IS reachable from the 1.1=Y/PY path.
 *   All SN/NI arrows (from 1.2 or from either 1.3) converge on the shared
 *   bottom Q1.5 box. That box's Y/PY branch connects to CRITICAL.
 *   (Confirmed by reading the PDF algorithm image as source of truth.)
 *
 * THREE distinct outcomes for "low-ish":
 *   LOW (pure green)  — 1.2=Y/PY → 1.3=Y/PY → 1.5 top = N/PN
 *   LOW* (yellow)     — 1.2=WN → 1.3=Y/PY/WN → 1.5 mid = N/PN
 *   MODERATE          — 1.2=WN → 1.3=Y/PY/WN → 1.5 mid = Y/PY
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  type QData, type OData, type RiskLevel, type Edge,
} from './shared';

// ─── Domain accent ────────────────────────────────────────────────────────────
// Purple distinguishes Domain 1B from Domain 1A (blue).
const ACCENT = '#7c3aed';

// Register custom node types for React Flow
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

// ─── Answer state ─────────────────────────────────────────────────────────────
// One slot per question. Note that q13 serves both the top and mid 1.3 boxes —
// the context (top vs mid) is inferred from q12 when reading.
type Answers = {
  q11: string | null; // Q1.1 — appropriate analysis method?
  q12: string | null; // Q1.2 — controlled for all confounders? (if 1.1=Y/PY)
  q13: string | null; // Q1.3 — confounders measured validly? (top or mid, per q12)
  q14: string | null; // Q1.4 — controlled for post-int variables? (if 1.1=N/PN/NI)
  q15: string | null; // Q1.5 — negative controls suggest serious confounding?
};

// ─── Node positions ───────────────────────────────────────────────────────────
// Five columns matching the PDF left-to-right structure.
// The three Q1.5 instances (top / mid / bot) sit at different vertical heights.
const BASE_NODES: Node[] = [
  // ── Q1.1: Entry point – always shown ─────────────────────────────────────
  { id: 'n11', type: 'q', position: { x: 0, y: 340 },
    data: { qid: '1.1', shortLabel: 'Appropriate analysis method (e.g. G-estimation)?', active: false } as QData },

  // ── Q1.2: reached when 1.1=Y/PY ──────────────────────────────────────────
  { id: 'n12', type: 'q', position: { x: 240, y: 190 },
    data: { qid: '1.2', shortLabel: 'Controlled for all important confounding factors?', active: false } as QData },

  // ── Q1.3 top: reached when 1.2=Y/PY ──────────────────────────────────────
  { id: 'n13_top', type: 'q', position: { x: 490, y: 40 },
    data: { qid: '1.3', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },

  // ── Q1.3 mid: reached when 1.2=WN ────────────────────────────────────────
  { id: 'n13_mid', type: 'q', position: { x: 490, y: 260 },
    data: { qid: '1.3', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },

  // ── Q1.4: reached when 1.1=N/PN/NI ──────────────────────────────────────
  { id: 'n14', type: 'q', position: { x: 240, y: 520 },
    data: { qid: '1.4', shortLabel: 'Controlled for post-intervention variables?', active: false } as QData },

  // ── Q1.5 top: from 1.3 top=Y/PY — outcomes LOW or SERIOUS ────────────────
  { id: 'n15_top', type: 'q', position: { x: 760, y: 0 },
    data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },

  // ── Q1.5 mid: from 1.3 mid=Y/PY/WN — outcomes LOW* or MODERATE ──────────
  { id: 'n15_mid', type: 'q', position: { x: 760, y: 215 },
    data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },

  // ── Q1.5 bot: SHARED "bad path" node ─────────────────────────────────────
  // Reached from: 1.2=SN/NI  OR  1.3=SN/NI (either branch)  OR  1.4=N/PN/NI
  // Outcomes: SERIOUS (N/PN) or CRITICAL (Y/PY) — CRITICAL IS reachable here
  // from the Y/PY path of 1.1 (via any SN/NI shortcut).
  { id: 'n15_bot', type: 'q', position: { x: 760, y: 430 },
    data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },

  // ── Outcome nodes ─────────────────────────────────────────────────────────
  { id: 'o_low',     type: 'o', position: { x: 1060, y: 0   },
    data: { level: 'low',        label: 'LOW RISK OF BIAS',   active: false } as OData },
  { id: 'o_low_exc', type: 'o', position: { x: 1060, y: 120 },
    data: { level: 'low-except', label: 'LOW*\n(uncontrolled confounding concern)', active: false } as OData },
  { id: 'o_mod',     type: 'o', position: { x: 1060, y: 260 },
    data: { level: 'moderate',   label: 'MODERATE',           active: false } as OData },
  { id: 'o_ser',     type: 'o', position: { x: 1060, y: 400 },
    data: { level: 'serious',    label: 'SERIOUS',            active: false } as OData },
  { id: 'o_crit',    type: 'o', position: { x: 1060, y: 540 },
    data: { level: 'critical',   label: 'CRITICAL',           active: false } as OData },
];

// ─── Base edges ───────────────────────────────────────────────────────────────
const BASE_EDGES: Edge[] = [
  // ── From Q1.1 ────────────────────────────────────────────────────────────
  mkEdge('e11_12',  'n11', 'n12',  'Y/PY'),    // good analysis → check confounders (Q1.2)
  mkEdge('e11_14',  'n11', 'n14',  'N/PN/NI'), // bad analysis  → check post-int vars (Q1.4)

  // ── From Q1.2 ────────────────────────────────────────────────────────────
  mkEdge('e12_13top', 'n12', 'n13_top', 'Y/PY'),  // all controlled → Q1.3 top
  mkEdge('e12_13mid', 'n12', 'n13_mid', 'WN'),    // weakly controlled → Q1.3 mid
  // SN/NI: confounders not controlled validly → skip Q1.3, go to bad Q1.5
  mkEdge('e12_15bot', 'n12', 'n15_bot', 'SN/NI'),

  // ── From Q1.3 top ────────────────────────────────────────────────────────
  mkEdge('e13top_15top', 'n13_top', 'n15_top', 'Y/PY'),  // measured well → Q1.5 top (LOW/SERIOUS)
  mkEdge('e13top_15bot', 'n13_top', 'n15_bot', 'SN/NI'), // not measured  → bad Q1.5 (SERIOUS/CRITICAL)

  // ── From Q1.3 mid ────────────────────────────────────────────────────────
  mkEdge('e13mid_15mid', 'n13_mid', 'n15_mid', 'Y/PY/WN'), // measured ok  → Q1.5 mid (LOW*/MODERATE)
  mkEdge('e13mid_15bot', 'n13_mid', 'n15_bot', 'SN/NI'),   // not measured → bad Q1.5 (SERIOUS/CRITICAL)

  // ── From Q1.4 ────────────────────────────────────────────────────────────
  mkEdge('e14_crit',  'n14', 'o_crit',  'Y/PY'),    // post-int vars uncontrolled → CRITICAL direct
  mkEdge('e14_15bot', 'n14', 'n15_bot', 'N/PN/NI'), // not clear → ask neg controls (Q1.5 bot)

  // ── From Q1.5 top (LOW or SERIOUS) ───────────────────────────────────────
  mkEdge('e15top_low', 'n15_top', 'o_low', 'N/PN'), // neg controls OK → pure LOW
  mkEdge('e15top_ser', 'n15_top', 'o_ser', 'Y/PY'), // neg controls flag → SERIOUS

  // ── From Q1.5 mid (LOW* or MODERATE) ─────────────────────────────────────
  mkEdge('e15mid_lowexc', 'n15_mid', 'o_low_exc', 'N/PN'), // neg controls OK → LOW*
  mkEdge('e15mid_mod',    'n15_mid', 'o_mod',     'Y/PY'), // neg controls flag → MODERATE

  // ── From Q1.5 bot (SERIOUS or CRITICAL) ──────────────────────────────────
  // This node is shared by all SN/NI shortcuts and by the N/PN/NI path.
  // CRITICAL is reachable here even when 1.1=Y/PY (via SN/NI shortcuts).
  mkEdge('e15bot_ser',  'n15_bot', 'o_ser',  'N/PN'), // neg controls uncertain → SERIOUS
  mkEdge('e15bot_crit', 'n15_bot', 'o_crit', 'Y/PY'), // neg controls confirm   → CRITICAL
];

// ─── Active path algorithm ────────────────────────────────────────────────────
// Traverses the algorithm tree based on current answers.
// Returns the set of node/edge IDs that should be highlighted.
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n11']); // Q1.1 always visible
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q11) return { nodes, edges, outcome };

  if (a.q11 === 'Y/PY') {
    // ── Y/PY path: go to Q1.2 ────────────────────────────────────────────
    nodes.add('n12'); edges.add('e11_12');
    if (!a.q12) return { nodes, edges, outcome };

    if (a.q12 === 'Y/PY') {
      // ── 1.2=Y/PY: Q1.3 top ─────────────────────────────────────────────
      nodes.add('n13_top'); edges.add('e12_13top');
      if (!a.q13) return { nodes, edges, outcome };

      if (a.q13 === 'Y/PY') {
        // 1.3=Y/PY: Q1.5 top → LOW or SERIOUS
        nodes.add('n15_top'); edges.add('e13top_15top');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_low'); edges.add('e15top_low'); outcome = 'low'; }
        else                  { nodes.add('o_ser'); edges.add('e15top_ser'); outcome = 'serious'; }

      } else {
        // 1.3=SN/NI: skip to Q1.5 bot → SERIOUS or CRITICAL ★
        nodes.add('n15_bot'); edges.add('e13top_15bot');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
        else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
      }

    } else if (a.q12 === 'WN') {
      // ── 1.2=WN: Q1.3 mid ────────────────────────────────────────────────
      nodes.add('n13_mid'); edges.add('e12_13mid');
      if (!a.q13) return { nodes, edges, outcome };

      if (a.q13 !== 'SN/NI') {
        // 1.3=Y/PY or WN: Q1.5 mid → LOW* or MODERATE
        nodes.add('n15_mid'); edges.add('e13mid_15mid');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_low_exc'); edges.add('e15mid_lowexc'); outcome = 'low-except'; }
        else                  { nodes.add('o_mod');     edges.add('e15mid_mod');    outcome = 'moderate'; }

      } else {
        // 1.3=SN/NI: Q1.5 bot → SERIOUS or CRITICAL ★
        nodes.add('n15_bot'); edges.add('e13mid_15bot');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
        else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
      }

    } else {
      // ── 1.2=SN/NI: skip Q1.3, go directly to Q1.5 bot ──────────────────
      nodes.add('n15_bot'); edges.add('e12_15bot');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
    }

  } else {
    // ── N/PN/NI path: go to Q1.4 ─────────────────────────────────────────
    nodes.add('n14'); edges.add('e11_14');
    if (!a.q14) return { nodes, edges, outcome };

    if (a.q14 === 'Y/PY') {
      // Post-intervention variables not controlled → CRITICAL (no Q1.5 needed)
      nodes.add('o_crit'); edges.add('e14_crit'); outcome = 'critical';
    } else {
      // N/PN/NI: still uncertain → ask Q1.5 bot (neg controls)
      nodes.add('n15_bot'); edges.add('e14_15bot');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
    }
  }

  return { nodes, edges, outcome };
}

// ─── Next step ────────────────────────────────────────────────────────────────
// Determines the next question to ask in the interactive panel, based on current answers.
type Step = { key: keyof Answers; label: string; options: string[] } | null;

// Full question text (verbatim from ROBINS-I V2 cribsheet, shortened for UI)
const QLabels = {
  q11: '1.1  Was the intervention status of participants the same at the start of follow-up as at the start of the period of recruitment?',
  q12: '1.2  Did the authors control for all the important baseline and time-varying confounding factors for which this was necessary?',
  q13top: '1.3  (from 1.2=Y/PY) Were confounding factors measured validly and reliably by variables in this study?',
  q13mid: '1.3  (from 1.2=WN) Were confounding factors measured validly and reliably by variables in this study?',
  q14: '1.4  Did the authors control for time-varying factors or variables measured after the start of intervention?',
  q15top: '1.5  (top path) Do negative controls or other considerations suggest serious uncontrolled confounding?',
  q15mid: '1.5  (mid path) Do negative controls or other considerations suggest serious uncontrolled confounding?',
  q15bot: '1.5  (bottom path) Do negative controls or other considerations suggest serious uncontrolled confounding?',
};

function getNextStep(a: Answers): Step {
  // Q1.1 is always first
  if (!a.q11) return { key: 'q11', label: QLabels.q11, options: ['Y/PY', 'N/PN/NI'] };

  if (a.q11 === 'Y/PY') {
    if (!a.q12) return { key: 'q12', label: QLabels.q12, options: ['Y/PY', 'WN', 'SN/NI'] };

    if (a.q12 === 'Y/PY') {
      // Top path
      if (!a.q13) return { key: 'q13', label: QLabels.q13top, options: ['Y/PY', 'SN/NI'] };
      if (!a.q15) return { key: 'q15', label: a.q13 === 'Y/PY' ? QLabels.q15top : QLabels.q15bot, options: ['N/PN', 'Y/PY'] };

    } else if (a.q12 === 'WN') {
      // Mid path
      if (!a.q13) return { key: 'q13', label: QLabels.q13mid, options: ['Y/PY/WN', 'SN/NI'] };
      if (!a.q15) return { key: 'q15', label: a.q13 !== 'SN/NI' ? QLabels.q15mid : QLabels.q15bot, options: ['N/PN', 'Y/PY'] };

    } else {
      // SN/NI from 1.2: skip to Q1.5 bot
      if (!a.q15) return { key: 'q15', label: QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
    }

  } else {
    // N/PN/NI path
    if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['Y/PY', 'N/PN/NI'] };
    if (a.q14 !== 'Y/PY' && !a.q15) return { key: 'q15', label: QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
  }

  return null; // outcome reached
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Domain1BGraph() {
  // All user answers in one state object
  const [answers, setAnswers] = useState<Answers>({ q11: null, q12: null, q13: null, q14: null, q15: null });

  // Re-compute active path every time answers change
  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  // Inject `active` flag into every node's data
  const nodes = useMemo(() =>
    BASE_NODES.map(n => ({ ...n, data: { ...n.data, active: aN.has(n.id), style: { color: ACCENT } } })),
    [aN]);

  // Recolour active edges; keep inactive edges grey
  const edges = useMemo(() =>
    BASE_EDGES.map(e => {
      if (!aE.has(e.id)) return e;
      const toOutcome = e.target.startsWith('o_');
      const style = toOutcome
        ? (['o_low', 'o_low_exc', 'o_mod'].includes(e.target) ? STYLE_GOOD : STYLE_BAD)
        : { stroke: ACCENT, strokeWidth: 2.5 };
      return { ...e, style, animated: true,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: style.stroke } };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);

  // Record one answer and let the algorithm advance
  const answer = (k: keyof Answers, v: string) => setAnswers(p => ({ ...p, [k]: v }));
  const reset  = () => setAnswers({ q11: null, q12: null, q13: null, q14: null, q15: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#faf5ff' }}>

      {/* Header */}
      <div style={{ background: '#1e1b4b', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant B — Per-protocol</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>Use when C4 = Yes (effects of assignment to intervention analysed)</div>
      </div>

      {/* React Flow graph canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#ede9fe" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Interactive answer panel */}
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 1B: {outcome === 'low-except' ? 'LOW*' : outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#1e1b4b' }}>Next: </strong>{nextStep.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {nextStep.options.map(opt => (
                <button key={opt} onClick={() => answer(nextStep.key, opt)} style={{
                  padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `2px solid ${ACCENT}`, background: `${ACCENT}14`, color: ACCENT,
                }}>{opt}</button>
              ))}
              {Object.values(answers).some(Boolean) && (
                <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: '#64748b' }}>↺ Reset</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to begin tracing the decision path.</div>
        )}
      </div>
    </div>
  );
}
