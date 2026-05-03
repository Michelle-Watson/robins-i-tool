/**
 * Domain1AGraph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ROBINS-I V2 Domain 1 – Bias due to confounding
 * Variant A: Intention-to-treat (used when C4 = No)
 *
 * SOURCE IMAGE: attached_assets/image_1777792373674.png
 *   (Clearer version of the Domain 1A algorithm flowchart)
 *
 * ALGORITHM SUMMARY (traced from PDF image):
 *
 *  1.1=Y/PY → 1.3
 *    1.3=Y/PY     → 1.4_top → N/PN: LOW*    | Y/PY: SERIOUS
 *    1.3=N/PN/NI  → 1.2_top
 *      1.2=Y/PY/WN → 1.4_top → N/PN: LOW*  | Y/PY: SERIOUS
 *      1.2=SN/NI   → SERIOUS (direct — confounders not validly measured)
 *
 *  1.1=WN → 1.3_wn
 *    (any 1.3 answer) → 1.2_wn
 *      1.2=Y/PY/WN → 1.4_wn → N/PN: MODERATE | Y/PY: SERIOUS
 *      1.2=SN/NI   → SERIOUS (direct)
 *
 *  1.1=SN/NI → 1.4_sni
 *    1.4=Y/PY → CRITICAL
 *    1.4=N/PN → 1.2_bot
 *      1.2=Y/PY  → SERIOUS
 *      1.2=SN/WN/NI → CRITICAL
 *
 * NOTE: LOW* = "LOW RISK OF BIAS except for concerns about uncontrolled
 * confounding". There is no pure "LOW" in Domain 1A.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_INACTIVE, STYLE_GOOD, STYLE_BAD,
  type QData, type OData, type RiskLevel, type Edge,
} from './shared';

// ─── Node type registry ───────────────────────────────────────────────────────
// React Flow needs these registered so it knows which component to render.
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

// ─── Domain accent colour ─────────────────────────────────────────────────────
// Blue for Domain 1A question nodes.
const ACCENT = '#1d4ed8';

// ─── Answer state type ────────────────────────────────────────────────────────
// Tracks exactly one answer per question (questions can appear at multiple
// positions in the graph but always share the same answer slot).
type Answers = {
  q11: string | null; // Q1.1 — controlled for all important confounders?
  q13: string | null; // Q1.3 — controlled for post-intervention variables?
  q12: string | null; // Q1.2 — confounders measured validly?
  q14: string | null; // Q1.4 — negative controls suggest serious confounding?
};

// ─── Base nodes ───────────────────────────────────────────────────────────────
// Positions are laid out left-to-right to mirror the PDF image.
// Each question can appear multiple times at different positions (one per path
// branch) because the algorithm re-uses the same questions across branches.
const BASE_NODES: Node[] = [
  // ── Q1.1 (always shown, entry point) ────────────────────────────────────
  { id: 'n11', type: 'q', position: { x: 0, y: 310 },
    data: { qid: '1.1', shortLabel: 'Controlled for all important confounding factors?', active: false } as QData },

  // ── Q1.3 instances (one per path from 1.1) ──────────────────────────────
  // Top instance: reached when 1.1 = Y/PY
  { id: 'n13_ypy', type: 'q', position: { x: 260, y: 120 },
    data: { qid: '1.3', shortLabel: 'Controlled for any post-intervention variables?', active: false } as QData },
  // Bottom instance: reached when 1.1 = WN
  { id: 'n13_wn', type: 'q', position: { x: 260, y: 400 },
    data: { qid: '1.3', shortLabel: 'Controlled for any post-intervention variables?', active: false } as QData },

  // ── Q1.4 from 1.1=SN/NI (asked BEFORE 1.2 on this path) ────────────────
  { id: 'n14_sni', type: 'q', position: { x: 260, y: 580 },
    data: { qid: '1.4', shortLabel: 'Neg controls / QBA suggest serious uncontrolled confounding?', active: false } as QData },

  // ── Q1.2 instances ───────────────────────────────────────────────────────
  // Top: reached via 1.1=Y/PY → 1.3=N/PN/NI
  { id: 'n12_top', type: 'q', position: { x: 520, y: 185 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },
  // Middle: reached via 1.1=WN → 1.3 (any)
  { id: 'n12_wn', type: 'q', position: { x: 520, y: 405 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },
  // Bottom: reached via 1.1=SN/NI → 1.4=N/PN
  { id: 'n12_bot', type: 'q', position: { x: 520, y: 600 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },

  // ── Q1.4 instances for upper paths ──────────────────────────────────────
  // Top-A: reached via 1.1=Y/PY → 1.3=Y/PY (skips 1.2)
  { id: 'n14_a', type: 'q', position: { x: 780, y: 35 },
    data: { qid: '1.4', shortLabel: 'Neg controls / QBA suggest serious uncontrolled confounding?', active: false } as QData },
  // Top-B: reached via 1.1=Y/PY → 1.3=N/PN/NI → 1.2=Y/PY/WN
  { id: 'n14_b', type: 'q', position: { x: 780, y: 210 },
    data: { qid: '1.4', shortLabel: 'Neg controls / QBA suggest serious uncontrolled confounding?', active: false } as QData },
  // WN path: reached via 1.1=WN → 1.3 → 1.2=Y/PY/WN
  { id: 'n14_wn', type: 'q', position: { x: 780, y: 390 },
    data: { qid: '1.4', shortLabel: 'Neg controls / QBA suggest serious uncontrolled confounding?', active: false } as QData },

  // ── Outcome nodes ────────────────────────────────────────────────────────
  { id: 'o_low',  type: 'o', position: { x: 1060, y: 50  },
    data: { level: 'low-except', label: 'LOW*\n(except uncontrolled confounding)', active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1060, y: 255 },
    data: { level: 'moderate',   label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1060, y: 420 },
    data: { level: 'serious',    label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1060, y: 570 },
    data: { level: 'critical',   label: 'CRITICAL', active: false } as OData },
];

// ─── Base edges ───────────────────────────────────────────────────────────────
// All edges start as inactive (grey). The algorithm function below computes
// which edges are on the active path; those get recoloured via useMemo.
const BASE_EDGES: Edge[] = [
  // From Q1.1 ─────────────────────────────────────────────────────────────
  mkEdge('e11_13ypy', 'n11', 'n13_ypy', 'Y/PY'),   // good control → ask 1.3
  mkEdge('e11_13wn',  'n11', 'n13_wn',  'WN'),      // weak control → ask 1.3
  mkEdge('e11_14sni', 'n11', 'n14_sni', 'SN/NI'),   // no control → jump to 1.4

  // From Q1.3 (Y/PY path) ─────────────────────────────────────────────────
  mkEdge('e13ypy_14a',   'n13_ypy', 'n14_a',   'Y/PY'),   // did control post-int → ask 1.4
  mkEdge('e13ypy_12top', 'n13_ypy', 'n12_top', 'N/PN/NI'),// no post-int vars → ask 1.2

  // From Q1.3 (WN path) — any answer leads to Q1.2 ────────────────────────
  mkEdge('e13wn_12wn', 'n13_wn', 'n12_wn', 'any'),

  // From Q1.2 top ─────────────────────────────────────────────────────────
  // KEY FIX vs previous version: SN/NI bypasses Q1.4 → direct SERIOUS
  mkEdge('e12top_14b', 'n12_top', 'n14_b', 'Y/PY/WN'), // measured well/weakly → ask 1.4
  mkEdge('e12top_ser', 'n12_top', 'o_ser', 'SN/NI'),   // not measured validly → SERIOUS (direct)

  // From Q1.2 WN path ─────────────────────────────────────────────────────
  mkEdge('e12wn_14wn', 'n12_wn', 'n14_wn', 'Y/PY/WN'), // measured → ask 1.4
  mkEdge('e12wn_ser',  'n12_wn', 'o_ser',  'SN/NI'),   // not measured → SERIOUS direct

  // From Q1.4 top-A (reached via 1.3=Y/PY) ────────────────────────────────
  mkEdge('e14a_low', 'n14_a', 'o_low', 'N/PN'),  // no serious extra confounding → LOW*
  mkEdge('e14a_ser', 'n14_a', 'o_ser', 'Y/PY'),  // negative controls flag issue → SERIOUS

  // From Q1.4 top-B (reached via 1.2=Y/PY/WN) ─────────────────────────────
  mkEdge('e14b_low', 'n14_b', 'o_low', 'N/PN'),
  mkEdge('e14b_ser', 'n14_b', 'o_ser', 'Y/PY'),

  // From Q1.4 WN path ──────────────────────────────────────────────────────
  // N/PN gives MODERATE (not LOW*) because control was already only 'weak'
  mkEdge('e14wn_mod', 'n14_wn', 'o_mod', 'N/PN'),
  mkEdge('e14wn_ser', 'n14_wn', 'o_ser', 'Y/PY'),

  // From Q1.4 SN/NI path ───────────────────────────────────────────────────
  mkEdge('e14sni_crit',  'n14_sni', 'o_crit',  'Y/PY'),  // neg controls confirm → CRITICAL
  mkEdge('e14sni_12bot', 'n14_sni', 'n12_bot', 'N/PN'),  // no extra issue → check 1.2

  // From Q1.2 bottom (SN/NI path) ──────────────────────────────────────────
  mkEdge('e12bot_ser',  'n12_bot', 'o_ser',  'Y/PY'),     // some confounders measured → SERIOUS
  mkEdge('e12bot_crit', 'n12_bot', 'o_crit', 'SN/WN/NI'), // confounders not measured → CRITICAL
];

// ─── Active path algorithm ────────────────────────────────────────────────────
// Given the user's current answers, returns the set of node IDs and edge IDs
// that form the active path through the graph.
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n11']); // Q1.1 is always highlighted
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q11) return { nodes, edges, outcome }; // no answer yet

  // ── 1.1 = Y/PY path ───────────────────────────────────────────────────
  if (a.q11 === 'Y/PY') {
    nodes.add('n13_ypy'); edges.add('e11_13ypy');
    if (!a.q13) return { nodes, edges, outcome };

    if (a.q13 === 'Y/PY') {
      // 1.3=Y/PY → skip 1.2, go to Q1.4 top-A
      nodes.add('n14_a'); edges.add('e13ypy_14a');
      if (!a.q14) return { nodes, edges, outcome };
      if (a.q14 === 'N/PN') { nodes.add('o_low'); edges.add('e14a_low'); outcome = 'low-except'; }
      else                  { nodes.add('o_ser'); edges.add('e14a_ser'); outcome = 'serious'; }

    } else {
      // 1.3=N/PN/NI → go to Q1.2
      nodes.add('n12_top'); edges.add('e13ypy_12top');
      if (!a.q12) return { nodes, edges, outcome };

      if (a.q12 === 'SN/NI') {
        // KEY: confounders not validly measured → SERIOUS without asking Q1.4
        nodes.add('o_ser'); edges.add('e12top_ser'); outcome = 'serious';
      } else {
        // Y/PY or WN → still need Q1.4 (negative controls check)
        nodes.add('n14_b'); edges.add('e12top_14b');
        if (!a.q14) return { nodes, edges, outcome };
        if (a.q14 === 'N/PN') { nodes.add('o_low'); edges.add('e14b_low'); outcome = 'low-except'; }
        else                  { nodes.add('o_ser'); edges.add('e14b_ser'); outcome = 'serious'; }
      }
    }

  // ── 1.1 = WN path ─────────────────────────────────────────────────────
  } else if (a.q11 === 'WN') {
    nodes.add('n13_wn'); edges.add('e11_13wn');
    if (!a.q13) return { nodes, edges, outcome };
    // On WN path any 1.3 answer → always go to Q1.2
    nodes.add('n12_wn'); edges.add('e13wn_12wn');
    if (!a.q12) return { nodes, edges, outcome };

    if (a.q12 === 'SN/NI') {
      nodes.add('o_ser'); edges.add('e12wn_ser'); outcome = 'serious';
    } else {
      // Y/PY or WN → ask Q1.4; MODERATE (not LOW*) because 1.1 was already WN
      nodes.add('n14_wn'); edges.add('e12wn_14wn');
      if (!a.q14) return { nodes, edges, outcome };
      if (a.q14 === 'N/PN') { nodes.add('o_mod'); edges.add('e14wn_mod'); outcome = 'moderate'; }
      else                  { nodes.add('o_ser'); edges.add('e14wn_ser'); outcome = 'serious'; }
    }

  // ── 1.1 = SN/NI path ──────────────────────────────────────────────────
  } else {
    // Q1.4 is asked BEFORE Q1.2 on this path (reversed from the PDF Q-numbering)
    nodes.add('n14_sni'); edges.add('e11_14sni');
    if (!a.q14) return { nodes, edges, outcome };

    if (a.q14 === 'Y/PY') {
      // Negative controls confirm serious confounding → CRITICAL
      nodes.add('o_crit'); edges.add('e14sni_crit'); outcome = 'critical';
    } else {
      // N/PN → now check Q1.2 (measurement quality)
      nodes.add('n12_bot'); edges.add('e14sni_12bot');
      if (!a.q12) return { nodes, edges, outcome };
      if (a.q12 === 'Y/PY') { nodes.add('o_ser');  edges.add('e12bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e12bot_crit'); outcome = 'critical'; }
    }
  }

  return { nodes, edges, outcome };
}

// ─── Next step calculator ─────────────────────────────────────────────────────
// Returns the next unanswered question to present in the interactive panel,
// or null when the path is complete (outcome reached).
type Step = { key: keyof Answers; label: string; options: string[] } | null;

// Question text labels (verbatim from PDF, shortened for UI)
const QLabels = {
  q11: '1.1  Did the authors control for all the important confounding factors for which this was necessary?',
  q13: '1.3  Did the authors control for any post-intervention variables that could have been affected by the intervention?',
  q12_top: '1.2  Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?',
  q12_bot: '1.2  Were confounding factors measured validly and reliably?',
  q14: '1.4  Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?',
};

function getNextStep(a: Answers): Step {
  if (!a.q11)  return { key: 'q11', label: QLabels.q11,  options: ['Y/PY', 'WN', 'SN/NI'] };

  if (a.q11 === 'Y/PY') {
    if (!a.q13) return { key: 'q13', label: QLabels.q13, options: ['Y/PY', 'N/PN/NI'] };
    if (a.q13 === 'Y/PY') {
      if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
    } else {
      if (!a.q12) return { key: 'q12', label: QLabels.q12_top, options: ['Y/PY/WN', 'SN/NI'] };
      // SN/NI path resolves immediately (no Q1.4)
      if (a.q12 !== 'SN/NI' && !a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
    }
  } else if (a.q11 === 'WN') {
    if (!a.q13) return { key: 'q13', label: QLabels.q13, options: ['Y/PY', 'N/PN/NI'] };
    if (!a.q12) return { key: 'q12', label: QLabels.q12_top, options: ['Y/PY/WN', 'SN/NI'] };
    if (a.q12 !== 'SN/NI' && !a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
  } else {
    // SN/NI: Q1.4 first, then Q1.2 if needed
    if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['Y/PY', 'N/PN'] };
    if (a.q14 !== 'Y/PY' && !a.q12) return { key: 'q12', label: QLabels.q12_bot, options: ['Y/PY', 'SN/WN/NI'] };
  }
  return null; // path complete
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Domain1AGraph() {
  // Single source of truth for all user answers
  const [answers, setAnswers] = useState<Answers>({ q11: null, q13: null, q12: null, q14: null });

  // Compute active nodes/edges from current answers (re-runs whenever answers change)
  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  // Merge active-state flags into the node array
  const nodes = useMemo(() =>
    BASE_NODES.map(n => ({ ...n, data: { ...n.data, active: aN.has(n.id), style: { color: ACCENT } } })),
    [aN]);

  // Recolour edges: active path gets coloured, rest stay grey
  const edges = useMemo(() =>
    BASE_EDGES.map(e => {
      if (!aE.has(e.id)) return e; // inactive: keep grey
      const toOutcome = e.target.startsWith('o_');
      // Green for good outcomes, red for bad; blue for intermediate transitions
      const style = toOutcome
        ? (e.target === 'o_low' || e.target === 'o_mod' ? STYLE_GOOD : STYLE_BAD)
        : { stroke: ACCENT, strokeWidth: 2.5 };
      return {
        ...e, style, animated: true,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: style.stroke },
      };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);

  // Helper: record one answer, then let the algorithm decide the next step
  const answer = (key: keyof Answers, val: string) =>
    setAnswers(prev => ({ ...prev, [key]: val }));

  const reset = () => setAnswers({ q11: null, q13: null, q12: null, q14: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#f8fafc' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant A — Intention-to-treat</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>Use when C4 = No (no deviation from intended intervention analysed)</div>
      </div>

      {/* ── Graph canvas ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* ── Interactive answer panel ─────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {outcome ? (
          /* Show final outcome when path is complete */
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14,
            }}>
              Domain 1A: {outcome === 'low-except' ? 'LOW RISK OF BIAS*' : outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
        ) : nextStep ? (
          /* Show next question and answer buttons */
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#0f172a' }}>Next: </strong>{nextStep.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {nextStep.options.map(opt => (
                <button key={opt} onClick={() => answer(nextStep.key, opt)} style={{
                  padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  border: `2px solid ${ACCENT}`, background: `${ACCENT}14`, color: ACCENT,
                }}>
                  {opt}
                </button>
              ))}
              {/* Reset button appears once any answer has been given */}
              {Object.values(answers).some(Boolean) && (
                <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: '#64748b' }}>↺ Reset</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer option above to trace the path through the graph.</div>
        )}
      </div>
    </div>
  );
}
