import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  PreviousAnswersPanel,
  type QData, type OData, type RiskLevel, type Edge, type AnsweredItem, DomainGraphProps
} from './shared';

const ACCENT = '#be185d';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

type Answers = {
  q61: string | null; q62: string | null; q63: string | null; q64: string | null;
};

function computeCombinedOutcome(q62: string, q63: string, q64: string): RiskLevel {
  const ypy = [q62, q63, q64].filter(a => a === 'Y/PY').length;
  const ni  = [q62, q63, q64].filter(a => a === 'NI').length;
  if (ypy >= 2) return 'critical';
  if (ypy === 1) return 'serious';
  if (ni > 0)   return 'serious';
  return 'moderate';
}

const BASE_NODES: Node[] = [
  { id: 'n61', type: 'q', position: { x: 0, y: 230 }, data: { qid: '6.1', shortLabel: 'Result reported according to pre-specified analysis plan?', active: false } as QData },
  { id: 'n62', type: 'q', position: { x: 320, y: 140 }, data: { qid: '6.2', shortLabel: 'Result selected from multiple outcome measurements?', active: false } as QData },
  { id: 'n63', type: 'q', position: { x: 320, y: 280 }, data: { qid: '6.3', shortLabel: 'Result selected from multiple analyses of the data?', active: false } as QData },
  { id: 'n64', type: 'q', position: { x: 320, y: 420 }, data: { qid: '6.4', shortLabel: 'Result selected from multiple subgroups?', active: false } as QData },
  { id: 'o_low',  type: 'o', position: { x: 650, y: 0   }, data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 650, y: 130 }, data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 650, y: 270 }, data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 650, y: 420 }, data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e61_low',  'n61', 'o_low', 'Y/PY'),
  mkEdge('e61_62',   'n61', 'n62',   'N/PN/NI'),
  mkEdge('e61_63',   'n61', 'n63',   'N/PN/NI'),
  mkEdge('e61_64',   'n61', 'n64',   'N/PN/NI'),
  mkEdge('e6x_mod',  'n64', 'o_mod',  'all N/PN'),
  mkEdge('e6x_ser',  'n64', 'o_ser',  '≥1 NI or 1 Y/PY'),
  mkEdge('e6x_crit', 'n64', 'o_crit', '≥2 Y/PY'),
];

function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n61']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q61) return { nodes, edges, outcome };

  if (a.q61 === 'Y/PY') {
    nodes.add('o_low'); edges.add('e61_low'); outcome = 'low';
    return { nodes, edges, outcome };
  }

  nodes.add('n62'); nodes.add('n63'); nodes.add('n64');
  edges.add('e61_62'); edges.add('e61_63'); edges.add('e61_64');

  if (!a.q62 || !a.q63 || !a.q64) return { nodes, edges, outcome };

  const combined = computeCombinedOutcome(a.q62, a.q63, a.q64);
  outcome = combined;

  const outId  = `o_${combined}`;
  nodes.add(outId);

  if (combined === 'critical') edges.add('e6x_crit');
  else if (combined === 'serious')  edges.add('e6x_ser');
  else                              edges.add('e6x_mod');

  return { nodes, edges, outcome };
}

type Step = { key: keyof Answers; label: string; options: string[] } | null;

function getNextStep(a: Answers): Step {
  if (!a.q61) return { key: 'q61', label: '6.1  Was the result reported according to a pre-specified analysis plan that was finalised before unblinded outcome data were available for analysis?', options: ['Y/PY', 'N/PN/NI'] };
  if (a.q61 === 'Y/PY') return null;

  if (!a.q62) return { key: 'q62', label: '6.2  Were the outcome data analysed using more than one measure or method of aggregation, more than one statistical model, more than one method of handling data or more than one set of adjusted variables?', options: ['N/PN', 'NI', 'Y/PY'] };
  if (!a.q63) return { key: 'q63', label: '6.3  Were analyses carried out on more than one subset of study participants?', options: ['N/PN', 'NI', 'Y/PY'] };
  if (!a.q64) return { key: 'q64', label: '6.4  Was the result selected, on the basis of the results, from multiple eligible outcomes, analyses, or subgroups?', options: ['N/PN', 'NI', 'Y/PY'] };

  return null;
}

export default function Domain6Graph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q61: initialAnswers?.q61 || null, q62: initialAnswers?.q62 || null, q63: initialAnswers?.q63 || null, q64: initialAnswers?.q64 || null
  });

  const { nodes: aN, edges: aE, outcome } = useMemo(() => getActivePath(answers), [answers]);

  const counts = useMemo(() => {
    const arr = [answers.q62, answers.q63, answers.q64].filter(Boolean) as string[];
    return {
      ypy: arr.filter(a => a === 'Y/PY').length,
      ni:  arr.filter(a => a === 'NI').length,
      npn: arr.filter(a => a === 'N/PN').length,
      answered: arr.length,
    };
  }, [answers]);

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
  const reset  = () => setAnswers({ q61: null, q62: null, q63: null, q64: null });

  /* Cascade order: changing an earlier question clears all that follow. */
  const CASCADE: (keyof Answers)[] = ['q61', 'q62', 'q63', 'q64'];
  const QLABELS: Record<keyof Answers, string> = { q61: '6.1', q62: '6.2', q63: '6.3', q64: '6.4' };
  const answeredItems: AnsweredItem[] = CASCADE
    .filter(k => answers[k] !== null)
    .map(k => ({ key: k, label: QLABELS[k], value: answers[k]! }));
  const handleChange = (key: string) => {
    setAnswers(prev => {
      const idx = CASCADE.indexOf(key as keyof Answers);
      if (idx === -1) return prev;
      const next = { ...prev };
      for (let i = idx; i < CASCADE.length; i++) next[CASCADE[i]] = null;
      return next;
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#fff1f2', overflow: 'hidden' }}>
      <div style={{ background: '#881337', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 6</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias in selection of the reported result</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#fecdd3" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, overflowY: 'auto', maxHeight: '40%' }}>
        {counts.answered > 0 && !outcome && (
          <div style={{ fontSize: 11, marginBottom: 10, display: 'flex', gap: 12 }}>
            <span style={{ color: '#16a34a', fontWeight: 600 }}>N/PN: {counts.npn}</span>
            <span style={{ color: '#ca8a04', fontWeight: 600 }}>NI: {counts.ni}</span>
            <span style={{ color: '#dc2626', fontWeight: 600 }}>Y/PY: {counts.ypy}</span>
            <span style={{ color: '#94a3b8' }}>({counts.answered}/3 answered)</span>
          </div>
        )}
        {outcome ? (
          <>
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
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </>
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
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to start.</div>
        )}
      </div>
    </div>
  );
}
