import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  PreviousAnswersPanel,
  type QData, type OData, type RiskLevel, type Edge, type AnsweredItem, DomainGraphProps
} from './shared';

const ACCENT = '#7c3aed';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

type Answers = {
  q11: string | null; q12: string | null; q13: string | null; q14: string | null; q15: string | null;
};

const BASE_NODES: Node[] = [
  { id: 'n11', type: 'q', position: { x: 0, y: 340 }, data: { qid: '1.1', shortLabel: 'Appropriate analysis method (e.g. G-estimation)?', active: false } as QData },
  { id: 'n12', type: 'q', position: { x: 240, y: 190 }, data: { qid: '1.2', shortLabel: 'Controlled for all important confounding factors?', active: false } as QData },
  { id: 'n13_top', type: 'q', position: { x: 490, y: 40 }, data: { qid: '1.3', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },
  { id: 'n13_mid', type: 'q', position: { x: 490, y: 260 }, data: { qid: '1.3', shortLabel: 'Confounders measured validly and reliably?', active: false } as QData },
  { id: 'n14', type: 'q', position: { x: 240, y: 520 }, data: { qid: '1.4', shortLabel: 'Controlled for post-intervention variables?', active: false } as QData },
  { id: 'n15_top', type: 'q', position: { x: 760, y: 0 }, data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'n15_mid', type: 'q', position: { x: 760, y: 215 }, data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'n15_bot', type: 'q', position: { x: 760, y: 430 }, data: { qid: '1.5', shortLabel: 'Neg controls suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'o_low',     type: 'o', position: { x: 1060, y: 0   }, data: { level: 'low',        label: 'LOW RISK OF BIAS',   active: false } as OData },
  { id: 'o_low_exc', type: 'o', position: { x: 1060, y: 120 }, data: { level: 'low-except', label: 'LOW*\n(uncontrolled confounding concern)', active: false } as OData },
  { id: 'o_mod',     type: 'o', position: { x: 1060, y: 260 }, data: { level: 'moderate',   label: 'MODERATE',           active: false } as OData },
  { id: 'o_ser',     type: 'o', position: { x: 1060, y: 400 }, data: { level: 'serious',    label: 'SERIOUS',            active: false } as OData },
  { id: 'o_crit',    type: 'o', position: { x: 1060, y: 540 }, data: { level: 'critical',   label: 'CRITICAL',           active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e11_12',  'n11', 'n12',  'Y/PY'),
  mkEdge('e11_14',  'n11', 'n14',  'N/PN/NI'),
  mkEdge('e12_13top', 'n12', 'n13_top', 'Y/PY'),
  mkEdge('e12_13mid', 'n12', 'n13_mid', 'WN'),
  mkEdge('e12_15bot', 'n12', 'n15_bot', 'SN/NI'),
  mkEdge('e13top_15top', 'n13_top', 'n15_top', 'Y/PY'),
  mkEdge('e13top_15bot', 'n13_top', 'n15_bot', 'SN/NI'),
  mkEdge('e13mid_15mid', 'n13_mid', 'n15_mid', 'Y/PY/WN'),
  mkEdge('e13mid_15bot', 'n13_mid', 'n15_bot', 'SN/NI'),
  mkEdge('e14_crit',  'n14', 'o_crit',  'Y/PY'),
  mkEdge('e14_15bot', 'n14', 'n15_bot', 'N/PN/NI'),
  mkEdge('e15top_low', 'n15_top', 'o_low', 'N/PN'),
  mkEdge('e15top_ser', 'n15_top', 'o_ser', 'Y/PY'),
  mkEdge('e15mid_lowexc', 'n15_mid', 'o_low_exc', 'N/PN'),
  mkEdge('e15mid_mod',    'n15_mid', 'o_mod',     'Y/PY'),
  mkEdge('e15bot_ser',  'n15_bot', 'o_ser',  'N/PN'),
  mkEdge('e15bot_crit', 'n15_bot', 'o_crit', 'Y/PY'),
];

function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n11']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;
  if (!a.q11) return { nodes, edges, outcome };

  if (a.q11 === 'Y/PY') {
    nodes.add('n12'); edges.add('e11_12');
    if (!a.q12) return { nodes, edges, outcome };

    if (a.q12 === 'Y/PY') {
      nodes.add('n13_top'); edges.add('e12_13top');
      if (!a.q13) return { nodes, edges, outcome };

      if (a.q13 === 'Y/PY') {
        nodes.add('n15_top'); edges.add('e13top_15top');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_low'); edges.add('e15top_low'); outcome = 'low'; }
        else                  { nodes.add('o_ser'); edges.add('e15top_ser'); outcome = 'serious'; }
      } else {
        nodes.add('n15_bot'); edges.add('e13top_15bot');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
        else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
      }
    } else if (a.q12 === 'WN') {
      nodes.add('n13_mid'); edges.add('e12_13mid');
      if (!a.q13) return { nodes, edges, outcome };

      if (a.q13 !== 'SN/NI') {
        nodes.add('n15_mid'); edges.add('e13mid_15mid');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_low_exc'); edges.add('e15mid_lowexc'); outcome = 'low-except'; }
        else                  { nodes.add('o_mod');     edges.add('e15mid_mod');    outcome = 'moderate'; }
      } else {
        nodes.add('n15_bot'); edges.add('e13mid_15bot');
        if (!a.q15) return { nodes, edges, outcome };
        if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
        else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
      }
    } else {
      nodes.add('n15_bot'); edges.add('e12_15bot');
      if (!a.q15) return { nodes, edges, outcome };
      if (a.q15 === 'N/PN') { nodes.add('o_ser');  edges.add('e15bot_ser');  outcome = 'serious'; }
      else                  { nodes.add('o_crit'); edges.add('e15bot_crit'); outcome = 'critical'; }
    }
  } else {
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

type Step = { key: keyof Answers; label: string; options: string[] } | null;
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
  if (!a.q11) return { key: 'q11', label: QLabels.q11, options: ['Y/PY', 'N/PN/NI'] };
  if (a.q11 === 'Y/PY') {
    if (!a.q12) return { key: 'q12', label: QLabels.q12, options: ['Y/PY', 'WN', 'SN/NI'] };
    if (a.q12 === 'Y/PY') {
      if (!a.q13) return { key: 'q13', label: QLabels.q13top, options: ['Y/PY', 'SN/NI'] };
      if (!a.q15) return { key: 'q15', label: a.q13 === 'Y/PY' ? QLabels.q15top : QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
    } else if (a.q12 === 'WN') {
      if (!a.q13) return { key: 'q13', label: QLabels.q13mid, options: ['Y/PY/WN', 'SN/NI'] };
      if (!a.q15) return { key: 'q15', label: a.q13 !== 'SN/NI' ? QLabels.q15mid : QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
    } else {
      if (!a.q15) return { key: 'q15', label: QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
    }
  } else {
    if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['Y/PY', 'N/PN/NI'] };
    if (a.q14 !== 'Y/PY' && !a.q15) return { key: 'q15', label: QLabels.q15bot, options: ['N/PN', 'Y/PY'] };
  }
  return null;
}

export default function Domain1BGraph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q11: initialAnswers?.q11 || null, q12: initialAnswers?.q12 || null, q13: initialAnswers?.q13 || null, q14: initialAnswers?.q14 || null, q15: initialAnswers?.q15 || null
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
        ? (['o_low', 'o_low_exc', 'o_mod'].includes(e.target) ? STYLE_GOOD : STYLE_BAD)
        : { stroke: ACCENT, strokeWidth: 2.5 };
      return { ...e, style, animated: true,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: style.stroke } };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);
  const answer = (k: keyof Answers, v: string) => setAnswers(p => ({ ...p, [k]: v }));
  const reset  = () => setAnswers({ q11: null, q12: null, q13: null, q14: null, q15: null });

  /* Cascade order: changing an earlier question clears all that follow. */
  const CASCADE: (keyof Answers)[] = ['q11', 'q12', 'q13', 'q14', 'q15'];
  const QLABELS: Record<keyof Answers, string> = { q11: '1.1', q12: '1.2', q13: '1.3', q14: '1.4', q15: '1.5' };
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#faf5ff', overflow: 'hidden' }}>
      <div style={{ background: '#1e1b4b', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant B — Per-protocol</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#ede9fe" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, overflowY: 'auto', maxHeight: '40%' }}>
        {outcome ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
                border: `2px solid ${OUTCOME_C[outcome].border}`,
                borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
                Domain 1B: {outcome === 'low-except' ? 'LOW*' : outcome.toUpperCase()}
              </div>
              <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
            </div>
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </>
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
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to begin tracing the decision path.</div>
        )}
      </div>
    </div>
  );
}
