/**
 * Domain2Graph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ROBINS-I V2  Domain 2 – Bias in classification of interventions
 *
 * SOURCE IMAGE: attached_assets/image_1777800329530.png  ← SOURCE OF TRUTH
 *
 * ALGORITHM (traced from PDF image):
 *
 *  2.1 = Y/PY  →  Q2.4 (TOP — interventions distinguishable at follow-up)
 *
 *  2.1 = N/PN/NI  →  Q2.2 (almost all events distinguishable?)
 *    2.2 = Y/PY    →  Q2.4 TOP  (same node — converges)
 *    2.2 = N/PN/NI →  Q2.3 (appropriate analysis?)
 *      2.3 = WY/NI  →  Q2.4 MID
 *      2.3 = N/PN   →  Q2.4 BOT
 *
 *  Q2.4 TOP  (N/PN → Q2.5 TOP;  WY/NI → Q2.5 MID;  SY → CRITICAL direct)
 *  Q2.4 MID  (N/PN → Q2.5 MID;  WY/NI → Q2.5 BOT;  SY → CRITICAL direct)
 *  Q2.4 BOT  (N/PN → Q2.5 BOT;  SY/WY/NI → CRITICAL direct)
 *
 *  Q2.5 TOP  (N/PN → LOW;  Y/PY/NI → MODERATE)
 *  Q2.5 MID  (N/PN → MODERATE;  Y/PY/NI → SERIOUS)
 *  Q2.5 BOT  (N/PN → SERIOUS;   SY/WY/NI → CRITICAL)
 *
 * KEY:  SY = Strongly Yes (classification definitely influenced by outcome)
 *       WY = Weakly Yes
 *       NI = No Information
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

// Domain 2 accent colour: teal/cyan
const ACCENT = '#0d9488';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

// ─── Answer state ─────────────────────────────────────────────────────────────
type Answers = {
  q21: string | null; // Q2.1 — intervention distinguishable at follow-up start?
  q22: string | null; // Q2.2 — almost all events distinguishable? (if 2.1=N/PN/NI)
  q23: string | null; // Q2.3 — appropriate analysis? (if 2.2=N/PN/NI)
  q24: string | null; // Q2.4 — classification influenced by outcome? (shared across paths)
  q25: string | null; // Q2.5 — further classification errors likely? (outcome gating)
};

// ─── Nodes ────────────────────────────────────────────────────────────────────
// Three "layers" of Q2.4 and Q2.5 (top/mid/bot) reflect the three paths
// that converge on progressively worse outcomes.
const BASE_NODES: Node[] = [
  // ── Entry ────────────────────────────────────────────────────────────────
  { id: 'n21', type: 'q', position: { x: 0, y: 200 },
    data: { qid: '2.1', shortLabel: 'Intervention distinguishable at start of follow-up?', active: false } as QData },

  // ── Q2.2 (if 2.1=N/PN/NI) ────────────────────────────────────────────────
  { id: 'n22', type: 'q', position: { x: 240, y: 320 },
    data: { qid: '2.2', shortLabel: 'Almost all outcome events after strategies distinguishable?', active: false } as QData },

  // ── Q2.3 (if 2.2=N/PN/NI) ────────────────────────────────────────────────
  { id: 'n23', type: 'q', position: { x: 480, y: 400 },
    data: { qid: '2.3', shortLabel: 'Appropriate analysis?', active: false } as QData },

  // ── Q2.4 instances (three separate positions in image) ────────────────────
  // TOP: reached from 2.1=Y/PY or 2.2=Y/PY
  { id: 'n24_top', type: 'q', position: { x: 480, y: 80 },
    data: { qid: '2.4', shortLabel: 'Classification of intervention influenced by outcome?', active: false } as QData },
  // MID: reached from 2.3=WY/NI
  { id: 'n24_mid', type: 'q', position: { x: 730, y: 310 },
    data: { qid: '2.4', shortLabel: 'Classification of intervention influenced by outcome?', active: false } as QData },
  // BOT: reached from 2.3=N/PN
  { id: 'n24_bot', type: 'q', position: { x: 730, y: 450 },
    data: { qid: '2.4', shortLabel: 'Classification of intervention influenced by outcome?', active: false } as QData },

  // ── Q2.5 instances ────────────────────────────────────────────────────────
  // TOP: from 2.4 top=N/PN → LOW / MODERATE
  { id: 'n25_top', type: 'q', position: { x: 980, y: 0 },
    data: { qid: '2.5', shortLabel: 'Further classification errors likely?', active: false } as QData },
  // MID: from 2.4 top=WY/NI or 2.4 mid=N/PN → MODERATE / SERIOUS
  { id: 'n25_mid', type: 'q', position: { x: 980, y: 180 },
    data: { qid: '2.5', shortLabel: 'Further classification errors likely?', active: false } as QData },
  // BOT: from 2.4 mid=WY/NI or 2.4 bot=N/PN → SERIOUS / CRITICAL
  { id: 'n25_bot', type: 'q', position: { x: 980, y: 380 },
    data: { qid: '2.5', shortLabel: 'Further classification errors likely?', active: false } as QData },

  // ── Outcomes ──────────────────────────────────────────────────────────────
  { id: 'o_low',  type: 'o', position: { x: 1260, y: 0   },
    data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1260, y: 120 },
    data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1260, y: 280 },
    data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1260, y: 440 },
    data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

// ─── Edges ────────────────────────────────────────────────────────────────────
const BASE_EDGES: Edge[] = [
  // From Q2.1 ──────────────────────────────────────────────────────────────
  mkEdge('e21_24top', 'n21', 'n24_top', 'Y/PY'),    // distinguishable → check classification
  mkEdge('e21_22',    'n21', 'n22',     'N/PN/NI'), // not distinguishable → check events

  // From Q2.2 ──────────────────────────────────────────────────────────────
  mkEdge('e22_24top', 'n22', 'n24_top', 'Y/PY'),    // most events OK → same as Y/PY path
  mkEdge('e22_23',    'n22', 'n23',     'N/PN/NI'), // many events uncertain → check analysis

  // From Q2.3 ──────────────────────────────────────────────────────────────
  mkEdge('e23_24mid', 'n23', 'n24_mid', 'WY/NI'), // weak/uncertain analysis
  mkEdge('e23_24bot', 'n23', 'n24_bot', 'N/PN'),  // no appropriate analysis

  // From Q2.4 TOP ──────────────────────────────────────────────────────────
  mkEdge('e24top_25top',  'n24_top', 'n25_top', 'N/PN'),  // no influence → fewer errors
  mkEdge('e24top_25mid',  'n24_top', 'n25_mid', 'WY/NI'), // weak/uncertain influence
  mkEdge('e24top_crit',   'n24_top', 'o_crit',  'SY'),    // strong influence → CRITICAL

  // From Q2.4 MID ──────────────────────────────────────────────────────────
  mkEdge('e24mid_25mid', 'n24_mid', 'n25_mid', 'N/PN'),  // no further influence
  mkEdge('e24mid_25bot', 'n24_mid', 'n25_bot', 'WY/NI'), // weak/uncertain
  mkEdge('e24mid_crit',  'n24_mid', 'o_crit',  'SY'),    // strong → CRITICAL

  // From Q2.4 BOT ──────────────────────────────────────────────────────────
  mkEdge('e24bot_25bot', 'n24_bot', 'n25_bot', 'N/PN'),     // some hope
  mkEdge('e24bot_crit',  'n24_bot', 'o_crit',  'SY/WY/NI'), // any influence → CRITICAL

  // From Q2.5 TOP → LOW or MODERATE ────────────────────────────────────────
  mkEdge('e25top_low', 'n25_top', 'o_low', 'N/PN'),    // no further errors → LOW
  mkEdge('e25top_mod', 'n25_top', 'o_mod', 'Y/PY/NI'), // some errors → MODERATE

  // From Q2.5 MID → MODERATE or SERIOUS ────────────────────────────────────
  mkEdge('e25mid_mod', 'n25_mid', 'o_mod', 'N/PN'),    // limited errors → MODERATE
  mkEdge('e25mid_ser', 'n25_mid', 'o_ser', 'Y/PY/NI'), // further errors → SERIOUS

  // From Q2.5 BOT → SERIOUS or CRITICAL ────────────────────────────────────
  mkEdge('e25bot_ser',  'n25_bot', 'o_ser',  'N/PN'),     // limited errors → SERIOUS
  mkEdge('e25bot_crit', 'n25_bot', 'o_crit', 'SY/WY/NI'), // further errors → CRITICAL
];

// ─── Path algorithm ───────────────────────────────────────────────────────────
// Determines which tier of Q2.4/Q2.5 is active based on the answers so far.
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n21']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q21) return { nodes, edges, outcome };

  // Determine which Q2.4 tier we're in
  let tier: 'top' | 'mid' | 'bot' = 'top';

  if (a.q21 === 'Y/PY') {
    // 2.1=Y/PY → Q2.4 top
    nodes.add('n24_top'); edges.add('e21_24top');
    tier = 'top';
  } else {
    // 2.1=N/PN/NI → Q2.2
    nodes.add('n22'); edges.add('e21_22');
    if (!a.q22) return { nodes, edges, outcome };

    if (a.q22 === 'Y/PY') {
      // 2.2=Y/PY → Q2.4 top (converges with 2.1=Y/PY path)
      nodes.add('n24_top'); edges.add('e22_24top');
      tier = 'top';
    } else {
      // 2.2=N/PN/NI → Q2.3
      nodes.add('n23'); edges.add('e22_23');
      if (!a.q23) return { nodes, edges, outcome };

      if (a.q23 === 'WY/NI') {
        nodes.add('n24_mid'); edges.add('e23_24mid');
        tier = 'mid';
      } else {
        // N/PN → Q2.4 bot (worst path)
        nodes.add('n24_bot'); edges.add('e23_24bot');
        tier = 'bot';
      }
    }
  }

  // Now process Q2.4 tier answer
  if (!a.q24) return { nodes, edges, outcome };

  const n24id = `n24_${tier}`;

  if (a.q24 === 'SY') {
    // Any tier: SY from Q2.4 → CRITICAL direct
    const eid = `e24${tier}_crit`;
    nodes.add('o_crit'); edges.add(eid); outcome = 'critical';
    return { nodes, edges, outcome };
  }

  if (tier === 'bot' && a.q24 !== 'N/PN') {
    // Bot tier: WY/NI also → CRITICAL
    nodes.add('o_crit'); edges.add('e24bot_crit'); outcome = 'critical';
    return { nodes, edges, outcome };
  }

  // Determine Q2.5 tier
  let q25tier: 'top' | 'mid' | 'bot';
  if (tier === 'top') {
    q25tier = a.q24 === 'N/PN' ? 'top' : 'mid'; // WY/NI → mid
  } else if (tier === 'mid') {
    q25tier = a.q24 === 'N/PN' ? 'mid' : 'bot'; // WY/NI → bot
  } else {
    q25tier = 'bot'; // bot always goes to Q2.5 bot
  }

  const n25id = `n25_${q25tier}`;
  const eid25 = `e24${tier === n24id.slice(-3) ? tier : tier}_25${q25tier}`;
  nodes.add(n25id);
  // Add correct edge from Q2.4 to Q2.5
  if (tier === 'top') edges.add(a.q24 === 'N/PN' ? 'e24top_25top' : 'e24top_25mid');
  else if (tier === 'mid') edges.add(a.q24 === 'N/PN' ? 'e24mid_25mid' : 'e24mid_25bot');
  else edges.add('e24bot_25bot');

  if (!a.q25) return { nodes, edges, outcome };

  // Resolve outcome from Q2.5
  if (q25tier === 'top') {
    if (a.q25 === 'N/PN') { nodes.add('o_low'); edges.add('e25top_low'); outcome = 'low'; }
    else                  { nodes.add('o_mod'); edges.add('e25top_mod'); outcome = 'moderate'; }
  } else if (q25tier === 'mid') {
    if (a.q25 === 'N/PN') { nodes.add('o_mod'); edges.add('e25mid_mod'); outcome = 'moderate'; }
    else                  { nodes.add('o_ser'); edges.add('e25mid_ser'); outcome = 'serious'; }
  } else {
    if (a.q25 === 'N/PN') { nodes.add('o_ser');  edges.add('e25bot_ser');  outcome = 'serious'; }
    else                  { nodes.add('o_crit'); edges.add('e25bot_crit'); outcome = 'critical'; }
  }

  return { nodes, edges, outcome };
}

// ─── Next step ────────────────────────────────────────────────────────────────
type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  if (!a.q21) return { key: 'q21', label: '2.1  Was the intervention status of participants clear at the start of follow-up?', options: ['Y/PY', 'N/PN/NI'] };

  if (a.q21 !== 'Y/PY') {
    if (!a.q22) return { key: 'q22', label: '2.2  Were almost all outcome events assigned to strategies that were distinguishable at the time of the outcome?', options: ['Y/PY', 'N/PN/NI'] };
    if (a.q22 !== 'Y/PY') {
      if (!a.q23) return { key: 'q23', label: '2.3  Did the authors use an appropriate analysis that accounted for the non-distinguishability of strategies?', options: ['WY/NI', 'N/PN'] };
    }
  }

  if (!a.q24) return { key: 'q24', label: '2.4  Was the classification of intervention status influenced by knowledge of the outcome or risk of the outcome?', options: ['N/PN', 'WY/NI', 'SY'] };
  if (a.q24 === 'SY') return null; // CRITICAL resolved
  if (a.q23 === 'N/PN' && a.q24 !== 'N/PN') return null; // bot CRITICAL

  if (!a.q25) return { key: 'q25', label: '2.5  Were further classification errors in the outcome or its timing likely?', options: ['N/PN', 'Y/PY/NI'] };
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Domain2Graph() {
  const [answers, setAnswers] = useState<Answers>({ q21: null, q22: null, q23: null, q24: null, q25: null });
  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

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
  const reset  = () => setAnswers({ q21: null, q22: null, q23: null, q24: null, q25: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#f0fdfa' }}>
      <div style={{ background: '#134e4a', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 2</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias in classification of interventions</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#ccfbf1" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 2: {outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#134e4a' }}>Next: </strong>{nextStep.label}
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
