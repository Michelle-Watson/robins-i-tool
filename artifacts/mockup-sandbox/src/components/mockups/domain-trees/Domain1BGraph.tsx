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
type Answers = { q11: string | null; q12: string | null; q13: string | null; q14: string | null; q15: string | null };

// ─── Node Renderers ───────────────────────────────────────────────────────────
function QNode({ data }: NodeProps<Node<QData>>) {
  const { qid, shortLabel, active } = data;
  return (
    <div style={{ opacity: active ? 1 : 0.25, transition: 'opacity .25s' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      <div style={{
        width: 192, padding: '8px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.45,
        border: `2px solid ${active ? '#7c3aed' : '#94a3b8'}`,
        background: active ? '#f5f3ff' : '#f8fafc',
        boxShadow: active ? '0 2px 8px #7c3aed33' : 'none',
      }}>
        <span style={{
          background: '#7c3aed', color: '#fff', borderRadius: 999,
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
          <div style={{ fontSize: 9, fontWeight: 400, marginTop: 3, opacity: 0.75 }}>
            except uncontrolled confounding
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { q: QNode, o: ONode };

// ─── Base Nodes ───────────────────────────────────────────────────────────────
// Domain 1B layout:
// Top half  → 1.1=Y/PY path (max SERIOUS, NEVER Critical)
// Bot half  → 1.1=N/PN/NI path (can reach CRITICAL)
const BASE_NODES: Node[] = [
  // 1.1
  { id: 'n11', type: 'q', position: { x: 0, y: 270 },
    data: { qid: '1.1', shortLabel: 'Used appropriate analysis method to control for time-varying & baseline confounding?', active: false } },

  // Y/PY path ────────────────────────────────────────────────
  { id: 'n12', type: 'q', position: { x: 260, y: 80 },
    data: { qid: '1.2', shortLabel: 'Controlled for all important baseline & time-varying confounding factors?', active: false } },

  { id: 'n13', type: 'q', position: { x: 520, y: 20 },
    data: { qid: '1.3', shortLabel: 'Confounding factors measured validly and reliably?', active: false } },

  // 1.5 instances
  { id: 'n15_top', type: 'q', position: { x: 780, y: 80 },
    data: { qid: '1.5', shortLabel: 'Negative controls or other considerations suggest serious uncontrolled confounding?', active: false } },

  // N/PN/NI path ─────────────────────────────────────────────
  { id: 'n14', type: 'q', position: { x: 260, y: 460 },
    data: { qid: '1.4', shortLabel: 'Controlled for time-varying factors or variables measured after start of intervention?', active: false } },

  { id: 'n15_bot', type: 'q', position: { x: 520, y: 500 },
    data: { qid: '1.5', shortLabel: 'Negative controls or other considerations suggest serious uncontrolled confounding?', active: false } },

  // Outcomes
  { id: 'o_low',  type: 'o', position: { x: 1060, y: 20  }, data: { level: 'low-except', label: 'LOW*',     active: false } },
  { id: 'o_ser',  type: 'o', position: { x: 1060, y: 200 }, data: { level: 'serious',    label: 'SERIOUS',  active: false } },
  { id: 'o_crit', type: 'o', position: { x: 1060, y: 460 }, data: { level: 'critical',   label: 'CRITICAL', active: false } },
];

// ─── Base Edges ───────────────────────────────────────────────────────────────
const ARROW = { type: MarkerType.ArrowClosed, width: 14, height: 14 } as const;
const STYLE_DEF  = { stroke: '#94a3b8', strokeWidth: 1.5 };
const STYLE_ACT  = { stroke: '#7c3aed', strokeWidth: 2.5 };
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
  mkEdge('e11_12',    'n11', 'n12',     'Y/PY'),
  mkEdge('e11_14',    'n11', 'n14',     'N/PN/NI'),

  // From 1.2 (Y/PY path)
  mkEdge('e12_13',    'n12', 'n13',     'Y/PY/WN'),
  mkEdge('e12_15top', 'n12', 'n15_top', 'SN/NI'),   // skip 1.3

  // From 1.3 → 1.5 (always, per algorithm)
  mkEdge('e13_15top', 'n13', 'n15_top', 'any'),

  // From 1.5 (top — Y/PY path; max = SERIOUS)
  mkEdge('e15top_low', 'n15_top', 'o_low', 'N/PN'),
  mkEdge('e15top_ser', 'n15_top', 'o_ser', 'Y/PY'),

  // From 1.4 (N/PN/NI path)
  mkEdge('e14_crit',   'n14',     'o_crit',  'Y/PY'),
  mkEdge('e14_15bot',  'n14',     'n15_bot', 'N/PN/NI'),

  // From 1.5 (bot — N/PN/NI path; can reach CRITICAL)
  mkEdge('e15bot_ser',  'n15_bot', 'o_ser',  'N/PN'),
  mkEdge('e15bot_crit', 'n15_bot', 'o_crit', 'Y/PY'),
];

// ─── Algorithm ────────────────────────────────────────────────────────────────
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n11']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q11) return { nodes, edges, outcome };

  if (a.q11 === 'Y/PY') {
    nodes.add('n12'); edges.add('e11_12');
    if (!a.q12) return { nodes, edges, outcome };

    if (a.q12 === 'SN/NI') {
      // Skip 1.3, go straight to 1.5
      nodes.add('n15_top'); edges.add('e12_15top');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_ser'); edges.add('e15top_ser'); outcome = 'serious'; }
      else                  { nodes.add('o_ser'); edges.add('e15top_ser'); outcome = 'serious'; } // max SERIOUS on this path
    } else {
      // Y/PY/WN → ask 1.3
      nodes.add('n13'); edges.add('e12_13');
      if (!a.q13) return { nodes, edges, outcome };
      nodes.add('n15_top'); edges.add('e13_15top');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_low'); edges.add('e15top_low'); outcome = 'low-except'; }
      else                  { nodes.add('o_ser'); edges.add('e15top_ser'); outcome = 'serious'; }
    }
  } else {
    // N/PN/NI
    nodes.add('n14'); edges.add('e11_14');
    if (!a.q14) return { nodes, edges, outcome };

    if (a.q14 === 'Y/PY') {
      nodes.add('o_crit'); edges.add('e14_crit'); outcome = 'critical';
    } else {
      nodes.add('n15_bot'); edges.add('e14_15bot');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
    }
  }

  return { nodes, edges, outcome };
}

// ─── Next Question ────────────────────────────────────────────────────────────
type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  const Q = {
    q11: { key: 'q11' as const,
      label: '1.1 — Did the authors use an analysis method that was appropriate to control for time-varying as well as baseline confounding?',
      options: ['Y/PY', 'N/PN/NI'] },
    q12: { key: 'q12' as const,
      label: '1.2 — Did the authors control for all the important baseline and time-varying confounding factors for which this was necessary?',
      options: ['Y/PY/WN', 'SN/NI'] },
    q13: { key: 'q13' as const,
      label: '1.3 — Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?',
      options: ['Y/PY/WN', 'SN/NI'] },
    q14: { key: 'q14' as const,
      label: '1.4 — Did the authors control for time-varying factors or other variables measured after the start of intervention?',
      options: ['Y/PY', 'N/PN/NI'] },
    q15: { key: 'q15' as const,
      label: '1.5 — Did the use of negative controls, or other considerations, suggest serious uncontrolled confounding?',
      options: ['N/PN', 'Y/PY'] },
  };

  if (!a.q11) return Q.q11;
  if (a.q11 === 'Y/PY') {
    if (!a.q12) return Q.q12;
    if (a.q12 === 'SN/NI') { if (!a.q15) return Q.q15; }
    else { if (!a.q13) return Q.q13; if (!a.q15) return Q.q15; }
  } else {
    if (!a.q14) return Q.q14;
    if (a.q14 !== 'Y/PY') { if (!a.q15) return Q.q15; }
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Domain1BGraph() {
  const [answers, setAnswers] = useState<Answers>({ q11: null, q12: null, q13: null, q14: null, q15: null });

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
            ? (e.target === 'o_low' ? STYLE_GOOD : STYLE_BAD)
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
  const reset = () => setAnswers({ q11: null, q12: null, q13: null, q14: null, q15: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#1e1b4b', color: '#fff', padding: '12px 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.6, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant B — Per-protocol</div>
        <div style={{ fontSize: 12, opacity: 0.55, marginTop: 1 }}>Used when C4 = Yes (effects of assignment to intervention analysed)</div>
        <div style={{ marginTop: 8, background: '#312e81', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#c7d2fe' }}>
          ⚠ CRITICAL is only reachable via 1.1 = N/PN/NI. The path 1.1=Y/PY can reach at most SERIOUS.
        </div>
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
              Domain 1B Judgement: {outcome === 'low-except' ? 'LOW*' : outcome.toUpperCase()}
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
                  onClick={() => setAnswers(prev => ({ ...prev, [nextStep.key]: opt }))}
                  style={{
                    padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    border: '2px solid #7c3aed', background: '#f5f3ff', color: '#6d28d9',
                    transition: 'all .15s',
                  }}
                >
                  {opt}
                </button>
              ))}
              {Object.values(answers).some(Boolean) && (
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
