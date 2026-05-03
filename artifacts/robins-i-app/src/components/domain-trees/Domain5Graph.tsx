import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  type QData, type OData, type RiskLevel, type Edge, DomainGraphProps
} from './shared';

const ACCENT = '#4f46e5';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

type Answers = {
  q51: string | null; q52: string | null; q53: string | null;
};

const BASE_NODES: Node[] = [
  { id: 'n51', type: 'q', position: { x: 0, y: 280 }, data: { qid: '5.1', shortLabel: 'Measurement of outcome differs by intervention received?', active: false } as QData },
  { id: 'n52_top', type: 'q', position: { x: 250, y: 80 }, data: { qid: '5.2', shortLabel: 'Outcome assessors aware of intervention received?', active: false } as QData },
  { id: 'n53_top', type: 'q', position: { x: 500, y: 80 }, data: { qid: '5.3', shortLabel: 'Assessment could be influenced by knowledge of intervention?', active: false } as QData },
  { id: 'n52_mid', type: 'q', position: { x: 250, y: 280 }, data: { qid: '5.2', shortLabel: 'Outcome assessors aware of intervention received?', active: false } as QData },
  { id: 'n53_mid', type: 'q', position: { x: 500, y: 280 }, data: { qid: '5.3', shortLabel: 'Assessment could be influenced by knowledge of intervention?', active: false } as QData },
  { id: 'o_low',  type: 'o', position: { x: 800, y: 0   }, data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 800, y: 130 }, data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 800, y: 310 }, data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e51_52top', 'n51', 'n52_top', 'N/PN'),
  mkEdge('e51_52mid', 'n51', 'n52_mid', 'NI'),
  mkEdge('e51_ser',   'n51', 'o_ser',   'Y/PY'),
  mkEdge('e52top_low', 'n52_top', 'o_low',  'N/PN'),
  mkEdge('e52top_53',  'n52_top', 'n53_top','Y/PY/NI'),
  mkEdge('e53top_low', 'n53_top', 'o_low',  'N/PN'),
  mkEdge('e53top_mod', 'n53_top', 'o_mod',  'WY/NI'),
  mkEdge('e53top_mod2','n53_top', 'o_mod',  'SY'),
  mkEdge('e52mid_mod', 'n52_mid', 'o_mod',  'N/PN'),
  mkEdge('e52mid_53',  'n52_mid', 'n53_mid','Y/PY/NI'),
  mkEdge('e53mid_mod', 'n53_mid', 'o_mod',  'WY/N/PN/NI'),
  mkEdge('e53mid_ser', 'n53_mid', 'o_ser',  'SY'),
];

function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n51']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q51) return { nodes, edges, outcome };

  if (a.q51 === 'Y/PY') {
    nodes.add('o_ser'); edges.add('e51_ser'); outcome = 'serious';
    return { nodes, edges, outcome };
  }

  if (a.q51 === 'N/PN') {
    nodes.add('n52_top'); edges.add('e51_52top');
    if (!a.q52) return { nodes, edges, outcome };

    if (a.q52 === 'N/PN') {
      nodes.add('o_low'); edges.add('e52top_low'); outcome = 'low';
    } else {
      nodes.add('n53_top'); edges.add('e52top_53');
      if (!a.q53) return { nodes, edges, outcome };

      if (a.q53 === 'N/PN') {
        nodes.add('o_low'); edges.add('e53top_low'); outcome = 'low';
      } else if (a.q53 === 'WY/NI') {
        nodes.add('o_mod'); edges.add('e53top_mod'); outcome = 'moderate';
      } else {
        nodes.add('o_mod'); edges.add('e53top_mod2'); outcome = 'moderate';
      }
    }
  } else {
    nodes.add('n52_mid'); edges.add('e51_52mid');
    if (!a.q52) return { nodes, edges, outcome };

    if (a.q52 === 'N/PN') {
      nodes.add('o_mod'); edges.add('e52mid_mod'); outcome = 'moderate';
    } else {
      nodes.add('n53_mid'); edges.add('e52mid_53');
      if (!a.q53) return { nodes, edges, outcome };

      if (a.q53 === 'SY') {
        nodes.add('o_ser'); edges.add('e53mid_ser'); outcome = 'serious';
      } else {
        nodes.add('o_mod'); edges.add('e53mid_mod'); outcome = 'moderate';
      }
    }
  }

  return { nodes, edges, outcome };
}

type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  if (!a.q51) return { key: 'q51', label: '5.1  Was the method of outcome assessment different across intervention groups, or not?', options: ['N/PN', 'NI', 'Y/PY'] };
  if (a.q51 === 'Y/PY') return null;
  if (!a.q52) return { key: 'q52', label: '5.2  Were outcome assessors aware of the intervention received by study participants?', options: ['N/PN', 'Y/PY/NI'] };
  if (a.q51 === 'N/PN' && a.q52 === 'N/PN') return null;
  if (a.q51 === 'NI'   && a.q52 === 'N/PN') return null;
  if (!a.q53) return { key: 'q53', label: '5.3  Could the assessment of the outcome have been influenced by knowledge of the intervention received?', options: a.q51 === 'N/PN' ? ['N/PN', 'WY/NI', 'SY'] : ['WY/N/PN/NI', 'SY'] };
  return null;
}

export default function Domain5Graph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q51: initialAnswers?.q51 || null, q52: initialAnswers?.q52 || null, q53: initialAnswers?.q53 || null
  });

  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  useEffect(() => {
    onOutcome?.(outcome);
    onAnswersChange?.(answers);
  }, [outcome, answers, onOutcome, onAnswersChange]);

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
  const reset  = () => setAnswers({ q51: null, q52: null, q53: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#eef2ff' }}>
      <div style={{ background: '#1e1b4b', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 5</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias in measurement of outcomes</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#c7d2fe" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 5: {outcome.toUpperCase()}
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
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to start.</div>
        )}
      </div>
    </div>
  );
}
