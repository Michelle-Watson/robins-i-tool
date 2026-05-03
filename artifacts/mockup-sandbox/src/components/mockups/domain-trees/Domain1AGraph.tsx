import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'low-except' | 'moderate' | 'serious' | 'critical';
interface QData extends Record<string, unknown> { qid: string; shortLabel: string; active: boolean }
interface OData extends Record<string, unknown> { level: RiskLevel; label: string; active: boolean }
type Answers = { q11: string | null; q13: string | null; q12: string | null; q14: string | null };

// ─── Node Renderers ───────────────────────────────────────────────────────────
function QNode({ data }: NodeProps<Node<QData>>) {
  const { qid, shortLabel, active } = data;
  return (
    <div style={{ opacity: active ? 1 : 0.25, transition: 'opacity .25s' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      <div style={{
        width: 192, padding: '8px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.45,
        border: `2px solid ${active ? '#2563eb' : '#94a3b8'}`,
        background: active ? '#eff6ff' : '#f8fafc',
        boxShadow: active ? '0 2px 8px #2563eb33' : 'none',
      }}>
        <span style={{
          background: '#1d4ed8', color: '#fff', borderRadius: 999,
          padding: '1px 8px', fontSize: 10, fontWeight: 700, display: 'inline-block', marginBottom: 5,
        }}>{qid}</span>
        <div style={{ color: '#1e293b' }}>{shortLabel}</div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#475569', width: 8, height: 8 }} />
    </div>
  );
}

const OUTCOME_C: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  'low-except': { bg: '#fef9c3', border: '#ca8a04', text: '#78350f' },
  moderate: { bg: '#fed7aa', border: '#ea580c', text: '#7c2d12' },
  serious: { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' },
  critical: { bg: '#1c1917', border: '#57534e', text: '#fafaf9' },
};

function ONode({ data }: NodeProps<Node<OData>>) {
  const { level, label, active } = data;
  const c = OUTCOME_C[level];
  return (
    <div style={{ opacity: active ? 1 : 0.15, transition: 'opacity .25s' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      <div style={{
        width: 130, padding: '10px 14px', borderRadius: 10, textAlign: 'center',
        border: `3px solid ${active ? c.border : '#cbd5e1'}`,
        background: active ? c.bg : '#f1f5f9',
        color: active ? c.text : '#94a3b8',
        fontSize: 13, fontWeight: 800,
        boxShadow: active ? `0 0 16px ${c.border}55` : 'none',
      }}>
        {label}
        {active && level === 'low-except' && (
          <div style={{ fontSize: 9, fontWeight: 400, marginTop: 3, color: c.text, opacity: 0.75 }}>
            except uncontrolled confounding
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { q: QNode, o: ONode };

// ─── Base Nodes ───────────────────────────────────────────────────────────────
// Layout mirrors the PDF algorithm image (left → right, top = best path, bottom = worst)
const BASE_NODES: Node[] = [
  // 1.1 anchor
  { id: 'n11', type: 'q', position: { x: 0, y: 310 },
    data: { qid: '1.1', shortLabel: 'Controlled for all important confounding factors?', active: false } },

  // 1.3 nodes (same question, two path instances)
  { id: 'n13_ypy', type: 'q', position: { x: 260, y: 120 },
    data: { qid: '1.3', shortLabel: 'Controlled for any post-intervention variables?', active: false } },
  { id: 'n13_wn', type: 'q', position: { x: 260, y: 400 },
    data: { qid: '1.3', shortLabel: 'Controlled for any post-intervention variables?', active: false } },

  // 1.4 (SN/NI path — asked before 1.2 on this path)
  { id: 'n14_sni', type: 'q', position: { x: 260, y: 570 },
    data: { qid: '1.4', shortLabel: 'Negative controls / QBA suggest serious uncontrolled confounding?', active: false } },

  // 1.2 nodes (three path instances)
  { id: 'n12_top', type: 'q', position: { x: 520, y: 180 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } },
  { id: 'n12_wn', type: 'q', position: { x: 520, y: 400 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } },
  { id: 'n12_bot', type: 'q', position: { x: 520, y: 580 },
    data: { qid: '1.2', shortLabel: 'Confounders measured validly and reliably?', active: false } },

  // 1.4 nodes (upper paths)
  { id: 'n14_a', type: 'q', position: { x: 780, y: 40 },
    data: { qid: '1.4', shortLabel: 'Negative controls / QBA suggest serious uncontrolled confounding?', active: false } },
  { id: 'n14_b', type: 'q', position: { x: 780, y: 210 },
    data: { qid: '1.4', shortLabel: 'Negative controls / QBA suggest serious uncontrolled confounding?', active: false } },
  { id: 'n14_wn', type: 'q', position: { x: 780, y: 380 },
    data: { qid: '1.4', shortLabel: 'Negative controls / QBA suggest serious uncontrolled confounding?', active: false } },

  // Outcomes
  { id: 'o_low',  type: 'o', position: { x: 1050, y: 40  }, data: { level: 'low-except', label: 'LOW*',     active: false } },
  { id: 'o_ser',  type: 'o', position: { x: 1050, y: 230 }, data: { level: 'serious',    label: 'SERIOUS',  active: false } },
  { id: 'o_mod',  type: 'o', position: { x: 1050, y: 390 }, data: { level: 'moderate',   label: 'MODERATE', active: false } },
  { id: 'o_crit', type: 'o', position: { x: 1050, y: 550 }, data: { level: 'critical',   label: 'CRITICAL', active: false } },
];

// ─── Base Edges ───────────────────────────────────────────────────────────────
const ARROW = { type: MarkerType.ArrowClosed, width: 14, height: 14 } as const;
const STYLE_DEF = { stroke: '#94a3b8', strokeWidth: 1.5 };
const STYLE_ACT = { stroke: '#2563eb', strokeWidth: 2.5 };
const STYLE_GOOD = { stroke: '#16a34a', strokeWidth: 2.5 };
const STYLE_BAD  = { stroke: '#dc2626', strokeWidth: 2.5 };

function mkEdge(id: string, source: string, target: string, label: string, style = STYLE_DEF): Edge {
  return {
    id, source, target, label,
    type: 'smoothstep',
    markerEnd: { ...ARROW, color: style.stroke },
    style,
    labelStyle: { fontSize: 10, fontWeight: 600, fill: '#475569' },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    animated: false,
  };
}

const BASE_EDGES: Edge[] = [
  // From 1.1
  mkEdge('e11_13ypy', 'n11', 'n13_ypy', 'Y/PY'),
  mkEdge('e11_13wn',  'n11', 'n13_wn',  'WN'),
  mkEdge('e11_14sni', 'n11', 'n14_sni', 'SN/NI'),

  // From 1.3 (Y/PY path)
  mkEdge('e13ypy_14a',  'n13_ypy', 'n14_a',   'Y/PY'),
  mkEdge('e13ypy_12top','n13_ypy', 'n12_top',  'N/PN/NI'),

  // From 1.3 (WN path) — any answer → 1.2
  mkEdge('e13wn_12wn', 'n13_wn', 'n12_wn', 'any'),

  // From 1.2 (top path) — any → 1.4
  mkEdge('e12top_14b', 'n12_top', 'n14_b', 'any'),

  // From 1.2 (WN path)
  mkEdge('e12wn_ser',  'n12_wn', 'o_ser',  'SN/NI'),
  mkEdge('e12wn_14wn', 'n12_wn', 'n14_wn', 'Y/PY/WN'),

  // From 1.4 (a — top)
  mkEdge('e14a_low', 'n14_a', 'o_low', 'N/PN'),
  mkEdge('e14a_ser', 'n14_a', 'o_ser', 'Y/PY'),

  // From 1.4 (b — mid-top)
  mkEdge('e14b_low', 'n14_b', 'o_low', 'N/PN'),
  mkEdge('e14b_ser', 'n14_b', 'o_ser', 'Y/PY'),

  // From 1.4 (wn — mid-bot)
  mkEdge('e14wn_mod', 'n14_wn', 'o_mod', 'N/PN'),
  mkEdge('e14wn_ser', 'n14_wn', 'o_ser', 'Y/PY'),

  // From 1.4 (sni path — bottom)
  mkEdge('e14sni_crit',  'n14_sni', 'o_crit',  'Y/PY'),
  mkEdge('e14sni_12bot', 'n14_sni', 'n12_bot', 'N/PN'),

  // From 1.2 (bot path)
  mkEdge('e12bot_ser',  'n12_bot', 'o_ser',  'Y/PY'),
  mkEdge('e12bot_crit', 'n12_bot', 'o_crit', 'SN/WN/NI'),
];

// ─── Algorithm ────────────────────────────────────────────────────────────────
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n11']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q11) return { nodes, edges, outcome };

  if (a.q11 === 'Y/PY') {
    nodes.add('n13_ypy'); edges.add('e11_13ypy');
    if (!a.q13) return { nodes, edges, outcome };
    if (a.q13 === 'Y/PY') {
      nodes.add('n14_a'); edges.add('e13ypy_14a');
      if (!a.q14) return { nodes, edges, outcome };
      if (a.q14 === 'N/PN') { nodes.add('o_low'); edges.add('e14a_low'); outcome = 'low-except'; }
      else                  { nodes.add('o_ser'); edges.add('e14a_ser'); outcome = 'serious'; }
    } else {
      nodes.add('n12_top'); edges.add('e13ypy_12top');
      if (!a.q12) return { nodes, edges, outcome };
      nodes.add('n14_b'); edges.add('e12top_14b');
      if (!a.q14) return { nodes, edges, outcome };
      if (a.q14 === 'N/PN') { nodes.add('o_low'); edges.add('e14b_low'); outcome = 'low-except'; }
      else                  { nodes.add('o_ser'); edges.add('e14b_ser'); outcome = 'serious'; }
    }
  } else if (a.q11 === 'WN') {
    nodes.add('n13_wn'); edges.add('e11_13wn');
    if (!a.q13) return { nodes, edges, outcome };
    nodes.add('n12_wn'); edges.add('e13wn_12wn');
    if (!a.q12) return { nodes, edges, outcome };
    if (a.q12 === 'SN/NI') {
      nodes.add('o_ser'); edges.add('e12wn_ser'); outcome = 'serious';
    } else {
      nodes.add('n14_wn'); edges.add('e12wn_14wn');
      if (!a.q14) return { nodes, edges, outcome };
      if (a.q14 === 'N/PN') { nodes.add('o_mod'); edges.add('e14wn_mod'); outcome = 'moderate'; }
      else                  { nodes.add('o_ser'); edges.add('e14wn_ser'); outcome = 'serious'; }
    }
  } else {
    nodes.add('n14_sni'); edges.add('e11_14sni');
    if (!a.q14) return { nodes, edges, outcome };
    if (a.q14 === 'Y/PY') {
      nodes.add('o_crit'); edges.add('e14sni_crit'); outcome = 'critical';
    } else {
      nodes.add('n12_bot'); edges.add('e14sni_12bot');
      if (!a.q12) return { nodes, edges, outcome };
      if (a.q12 === 'Y/PY') { nodes.add('o_ser');  edges.add('e12bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e12bot_crit'); outcome = 'critical'; }
    }
  }

  return { nodes, edges, outcome };
}

// ─── Next Question ────────────────────────────────────────────────────────────
type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  const Q = {
    q11:  { key: 'q11' as const, label: '1.1 — Did the authors control for all the important confounding factors for which this was necessary?', options: ['Y/PY', 'WN', 'SN/NI'] },
    q13:  { key: 'q13' as const, label: '1.3 — Did the authors control for any post-intervention variables that could have been affected by the intervention?', options: ['Y/PY', 'N/PN/NI'] },
    q12a: { key: 'q12' as const, label: '1.2 — Were confounding factors that were controlled for measured validly and reliably by the variables available in this study?', options: ['Y/PY/WN', 'SN/NI'] },
    q12b: { key: 'q12' as const, label: '1.2 — Were confounding factors measured validly and reliably?', options: ['Y/PY', 'SN/WN/NI'] },
    q14:  { key: 'q14' as const, label: '1.4 — Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?', options: ['N/PN', 'Y/PY'] },
  };
  if (!a.q11) return Q.q11;
  if (a.q11 === 'Y/PY') {
    if (!a.q13) return Q.q13;
    if (a.q13 === 'Y/PY') { if (!a.q14) return Q.q14; }
    else { if (!a.q12) return Q.q12a; if (!a.q14) return Q.q14; }
  } else if (a.q11 === 'WN') {
    if (!a.q13) return Q.q13;
    if (!a.q12) return Q.q12a;
    if (a.q12 !== 'SN/NI' && !a.q14) return Q.q14;
  } else {
    if (!a.q14) return Q.q14;
    if (a.q14 !== 'Y/PY' && !a.q12) return Q.q12b;
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Domain1AGraph() {
  const [answers, setAnswers] = useState<Answers>({ q11: null, q13: null, q12: null, q14: null });

  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  const nodes = useMemo(() =>
    BASE_NODES.map(n => ({ ...n, data: { ...n.data, active: aN.has(n.id) } })),
    [aN]);

  const edges = useMemo(() =>
    BASE_EDGES.map(e => {
      const active = aE.has(e.id);
      const toOutcome = e.target.startsWith('o_');
      const style = active
        ? (toOutcome
            ? (e.target === 'o_low' || e.target === 'o_mod' ? STYLE_GOOD : STYLE_BAD)
            : STYLE_ACT)
        : STYLE_DEF;
      return {
        ...e,
        style,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 600, fill: active ? style.stroke : '#94a3b8' },
        animated: active,
      };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);

  const answer = (key: keyof Answers, val: string) =>
    setAnswers(prev => ({ ...prev, [key]: val }));

  const reset = () => setAnswers({ q11: null, q13: null, q12: null, q14: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '12px 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.6, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant A — Intention-to-treat</div>
        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 1 }}>Used when C4 = No (no deviation from intended intervention analysed)</div>
      </div>

      {/* Graph */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
        >
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Answer Panel */}
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', maxHeight: 200, overflowY: 'auto' }}>
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ ...OUTCOME_C[outcome], border: `2px solid`, borderColor: OUTCOME_C[outcome].border, borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 1A Judgement: {outcome === 'low-except' ? 'LOW*' : outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12, background: '#f8fafc' }}>
              ↺ Reset
            </button>
          </div>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              <strong style={{ color: '#0f172a' }}>Next question:</strong> {nextStep.label}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {nextStep.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => answer(nextStep.key, opt)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    border: '2px solid #2563eb', background: '#eff6ff', color: '#1d4ed8',
                    transition: 'all .15s',
                  }}
                >
                  {opt}
                </button>
              ))}
              {(answers.q11 || answers.q13 || answers.q12 || answers.q14) && (
                <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 12, background: '#f8fafc', color: '#64748b' }}>
                  ↺ Reset
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer above to trace the decision path through the graph.</div>
        )}
      </div>
    </div>
  );
}
