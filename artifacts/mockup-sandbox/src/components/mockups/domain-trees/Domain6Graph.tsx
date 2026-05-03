/**
 * Domain6Graph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ROBINS-I V2  Domain 6 – Bias in selection of the reported result
 *
 * SOURCE IMAGE: attached_assets/image_1777800364621.png  ← SOURCE OF TRUTH
 *
 * ALGORITHM (traced from PDF image):
 *
 *  Q6.1 = Y/PY   →  LOW RISK OF BIAS (result reported according to analysis plan)
 *
 *  Q6.1 = N/PN/NI →  Ask Q6.2, Q6.3, and Q6.4 simultaneously
 *    "Result was selected from…"
 *      6.2 = …multiple outcome measurements?
 *      6.3 = …multiple analyses of the data?
 *      6.4 = …multiple subgroups?
 *
 *  Combined result of 6.2 + 6.3 + 6.4:
 *    All N/PN                           →  MODERATE
 *    At least one NI, but none Y/PY     →  SERIOUS
 *    One Y/PY (or all NI)               →  SERIOUS
 *    Two or more Y/PY                   →  CRITICAL
 *
 * IMPLEMENTATION NOTE:
 *   Since Q6.2–6.4 are asked as a group with no sequential dependencies, the
 *   interactive panel asks them one at a time. The final outcome is computed
 *   by counting Y/PY and NI answers across all three.
 *
 *   Counting logic:
 *     ypy  = count of Y/PY answers across Q6.2–6.4
 *     ni   = count of NI  answers across Q6.2–6.4
 *     if ypy >= 2:             CRITICAL
 *     if ypy == 1:             SERIOUS
 *     if ni > 0 (ypy == 0):   SERIOUS
 *     else (all N/PN):         MODERATE
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

// Domain 6 accent: rose/pink
const ACCENT = '#be185d';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

// ─── Answer state ─────────────────────────────────────────────────────────────
type Answers = {
  q61: string | null; // Q6.1 — result reported according to pre-specified analysis plan?
  q62: string | null; // Q6.2 — result selected from multiple outcome measurements?
  q63: string | null; // Q6.3 — result selected from multiple analyses?
  q64: string | null; // Q6.4 — result selected from multiple subgroups?
};

// ─── Outcome calculator ───────────────────────────────────────────────────────
// Counts Y/PY and NI answers across Q6.2–6.4 to determine the combined outcome.
function computeCombinedOutcome(q62: string, q63: string, q64: string): RiskLevel {
  // Count how many of the three questions were answered Y/PY
  const ypy = [q62, q63, q64].filter(a => a === 'Y/PY').length;
  // Count how many were NI (no information = uncertain, not confirmed)
  const ni  = [q62, q63, q64].filter(a => a === 'NI').length;

  if (ypy >= 2) return 'critical'; // Two or more confirmed selections → CRITICAL
  if (ypy === 1) return 'serious'; // One confirmed selection → SERIOUS
  if (ni > 0)   return 'serious'; // Any uncertainty (but no confirmation) → SERIOUS
  return 'moderate';               // All clearly N/PN → MODERATE
}

// ─── Nodes ────────────────────────────────────────────────────────────────────
// Simple layout: Q6.1 on left, Q6.2/6.3/6.4 stacked in middle, outcomes on right.
const BASE_NODES: Node[] = [
  // ── Entry ────────────────────────────────────────────────────────────────
  { id: 'n61', type: 'q', position: { x: 0, y: 230 },
    data: { qid: '6.1', shortLabel: 'Result reported according to pre-specified analysis plan?', active: false } as QData },

  // ── Q6.2–6.4: asked together when 6.1=N/PN/NI ────────────────────────────
  // These three questions are shown stacked vertically; all three become active
  // simultaneously once 6.1=N/PN/NI is answered.
  { id: 'n62', type: 'q', position: { x: 320, y: 140 },
    data: { qid: '6.2', shortLabel: 'Result selected from multiple outcome measurements?', active: false } as QData },
  { id: 'n63', type: 'q', position: { x: 320, y: 280 },
    data: { qid: '6.3', shortLabel: 'Result selected from multiple analyses of the data?', active: false } as QData },
  { id: 'n64', type: 'q', position: { x: 320, y: 420 },
    data: { qid: '6.4', shortLabel: 'Result selected from multiple subgroups?', active: false } as QData },

  // ── Outcomes ──────────────────────────────────────────────────────────────
  { id: 'o_low',  type: 'o', position: { x: 650, y: 0   },
    data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 650, y: 130 },
    data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 650, y: 270 },
    data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 650, y: 420 },
    data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

// ─── Edges ────────────────────────────────────────────────────────────────────
const BASE_EDGES: Edge[] = [
  // From Q6.1 ──────────────────────────────────────────────────────────────
  mkEdge('e61_low',  'n61', 'o_low', 'Y/PY'),    // reported per plan → LOW
  mkEdge('e61_62',   'n61', 'n62',   'N/PN/NI'), // not per plan → ask 6.2–6.4
  mkEdge('e61_63',   'n61', 'n63',   'N/PN/NI'), // same edge fanned to all three questions
  mkEdge('e61_64',   'n61', 'n64',   'N/PN/NI'),

  // From Q6.2–6.4 to outcomes (conditional on combined count — activated by algorithm)
  // These are "virtual" edges that point from the last-answered Q6 node to the outcome.
  // In practice the algorithm highlights the appropriate outcome node directly.
  mkEdge('e6x_mod',  'n64', 'o_mod',  'all N/PN'),         // all confirmed no → MODERATE
  mkEdge('e6x_ser',  'n64', 'o_ser',  '≥1 NI or 1 Y/PY'), // some uncertainty → SERIOUS
  mkEdge('e6x_crit', 'n64', 'o_crit', '≥2 Y/PY'),         // two+ confirmed → CRITICAL
];

// ─── Path algorithm ───────────────────────────────────────────────────────────
// For Domain 6, outcome is computed from a combination of Q6.2–6.4 answers.
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n61']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q61) return { nodes, edges, outcome };

  if (a.q61 === 'Y/PY') {
    // Reported per plan → LOW immediately
    nodes.add('o_low'); edges.add('e61_low'); outcome = 'low';
    return { nodes, edges, outcome };
  }

  // N/PN/NI: show all three questions
  nodes.add('n62'); nodes.add('n63'); nodes.add('n64');
  edges.add('e61_62'); edges.add('e61_63'); edges.add('e61_64');

  // Only compute outcome when all three have been answered
  if (!a.q62 || !a.q63 || !a.q64) return { nodes, edges, outcome };

  // Compute combined outcome from the three answers
  const combined = computeCombinedOutcome(a.q62, a.q63, a.q64);
  outcome = combined;

  // Activate the appropriate outgoing edge and outcome node
  const outId  = `o_${combined}`;
  nodes.add(outId);

  // Select which summary edge to show (closest match)
  if (combined === 'critical') edges.add('e6x_crit');
  else if (combined === 'serious')  edges.add('e6x_ser');
  else                              edges.add('e6x_mod');

  return { nodes, edges, outcome };
}

// ─── Next step ────────────────────────────────────────────────────────────────
type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  if (!a.q61) return { key: 'q61',
    label: '6.1  Was the result reported according to a pre-specified analysis plan that was finalised before unblinded outcome data were available for analysis?',
    options: ['Y/PY', 'N/PN/NI'] };

  if (a.q61 === 'Y/PY') return null; // LOW resolved

  // Ask 6.2, 6.3, 6.4 in order (since they can't truly be asked simultaneously in UI)
  if (!a.q62) return { key: 'q62',
    label: '6.2  Were the outcome data analysed using more than one measure or method of aggregation, more than one statistical model, more than one method of handling data or more than one set of adjusted variables?',
    options: ['N/PN', 'NI', 'Y/PY'] };

  if (!a.q63) return { key: 'q63',
    label: '6.3  Were analyses carried out on more than one subset of study participants (e.g. different follow-up time periods, cut-points for continuous exposures, or subgroups defined by baseline characteristics)?',
    options: ['N/PN', 'NI', 'Y/PY'] };

  if (!a.q64) return { key: 'q64',
    label: '6.4  Was the result selected, on the basis of the results, from multiple eligible outcomes, analyses, or subgroups?',
    options: ['N/PN', 'NI', 'Y/PY'] };

  return null; // outcome computed
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Domain6Graph() {
  const [answers, setAnswers] = useState<Answers>({ q61: null, q62: null, q63: null, q64: null });
  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  // Show a live summary of 6.2–6.4 counts in the panel
  const counts = useMemo(() => {
    const arr = [answers.q62, answers.q63, answers.q64].filter(Boolean) as string[];
    return {
      ypy: arr.filter(a => a === 'Y/PY').length,
      ni:  arr.filter(a => a === 'NI').length,
      npn: arr.filter(a => a === 'N/PN').length,
      answered: arr.length,
    };
  }, [answers]);

  const nodes = useMemo(() =>
    BASE_NODES.map(n => ({ ...n, data: { ...n.data, active: aN.has(n.id), style: { color: ACCENT } } })),
    [aN]);

  const edges = useMemo(() =>
    BASE_EDGES.map(e => {
      if (!aE.has(e.id)) return e;
      const toOutcome = e.target.startsWith('o_');
      const style = toOutcome
        ? (['o_low','o_mod'].includes(e.target) ? STYLE_GOOD : STYLE_BAD)
        : { stroke: ACCENT, strokeWidth: 2.5 };
      return { ...e, style, animated: true,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: style.stroke } };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);
  const answer = (k: keyof Answers, v: string) => setAnswers(p => ({ ...p, [k]: v }));
  const reset  = () => setAnswers({ q61: null, q62: null, q63: null, q64: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#fff1f2' }}>
      <div style={{ background: '#881337', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 6</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias in selection of the reported result</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>Q6.1 gates the domain; Q6.2–6.4 are assessed together as a group</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#fecdd3" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {/* Show running tally of 6.2–6.4 when any have been answered */}
        {counts.answered > 0 && !outcome && (
          <div style={{ fontSize: 11, marginBottom: 10, display: 'flex', gap: 12 }}>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>N/PN: {counts.npn}</span>
            <span style={{ color: '#ca8a04', fontWeight: 600 }}>NI: {counts.ni}</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Y/PY: {counts.ypy}</span>
            <span style={{ color: '#94a3b8' }}>({counts.answered}/3 answered)</span>
          </div>
        )}
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 6: {outcome.toUpperCase()}
              {outcome !== 'low' && (
                <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                  ({counts.npn} N/PN · {counts.ni} NI · {counts.ypy} Y/PY)
                </span>
              )}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#881337' }}>Next: </strong>{nextStep.label}
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
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to start.</div>
        )}
      </div>
    </div>
  );
}
