import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  PreviousAnswersPanel,
  type QData, type OData, type RiskLevel, type Edge, type AnsweredItem, DomainGraphProps
} from './shared';

const nodeTypes = { q: QuestionNode, o: OutcomeNode };
const ACCENT = '#1d4ed8';

type Answers = {
  q11: string | null; q13: string | null; q12: string | null; q14: string | null;
};

const BASE_NODES: Node[] = [
  /* 1.1 – source: domain-1a.json */
  { id: 'n11', type: 'q', position: { x: 0, y: 310 }, data: { qid: '1.1', shortLabel: 'Did the authors control for all the important confounding factors for which this was necessary?', active: false } as QData },
  /* 1.3 – source: domain-1a.json */
  { id: 'n13_ypy', type: 'q', position: { x: 260, y: 120 }, data: { qid: '1.3', shortLabel: 'Did the authors control for any post-intervention variables that could have been affected by the intervention?', active: false } as QData },
  { id: 'n13_wn', type: 'q', position: { x: 260, y: 400 }, data: { qid: '1.3', shortLabel: 'Did the authors control for any post-intervention variables that could have been affected by the intervention?', active: false } as QData },
  /* 1.4 – source: domain-1a.json */
  { id: 'n14_sni', type: 'q', position: { x: 260, y: 580 }, data: { qid: '1.4', shortLabel: 'Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?', active: false } as QData },
  /* 1.2 – source: domain-1a.json */
  { id: 'n12_top', type: 'q', position: { x: 520, y: 185 }, data: { qid: '1.2', shortLabel: 'Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?', active: false } as QData },
  { id: 'n12_wn', type: 'q', position: { x: 520, y: 405 }, data: { qid: '1.2', shortLabel: 'Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?', active: false } as QData },
  { id: 'n12_bot', type: 'q', position: { x: 520, y: 600 }, data: { qid: '1.2', shortLabel: 'Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?', active: false } as QData },
  /* 1.4 repeated positions – source: domain-1a.json */
  { id: 'n14_a', type: 'q', position: { x: 780, y: 35 }, data: { qid: '1.4', shortLabel: 'Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'n14_b', type: 'q', position: { x: 780, y: 210 }, data: { qid: '1.4', shortLabel: 'Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'n14_wn', type: 'q', position: { x: 780, y: 390 }, data: { qid: '1.4', shortLabel: 'Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?', active: false } as QData },
  { id: 'o_low',  type: 'o', position: { x: 1060, y: 50  }, data: { level: 'low-except', label: 'LOW*\n(except uncontrolled confounding)', active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1060, y: 255 }, data: { level: 'moderate',   label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1060, y: 420 }, data: { level: 'serious',    label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1060, y: 570 }, data: { level: 'critical',   label: 'CRITICAL', active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e11_13ypy', 'n11', 'n13_ypy', 'Y/PY'),
  mkEdge('e11_13wn',  'n11', 'n13_wn',  'WN'),
  mkEdge('e11_14sni', 'n11', 'n14_sni', 'SN/NI'),
  mkEdge('e13ypy_14a',   'n13_ypy', 'n14_a',   'Y/PY'),
  mkEdge('e13ypy_12top', 'n13_ypy', 'n12_top', 'N/PN/NI'),
  mkEdge('e13wn_12wn', 'n13_wn', 'n12_wn', 'any'),
  mkEdge('e12top_14b', 'n12_top', 'n14_b', 'Y/PY/WN'),
  mkEdge('e12top_ser', 'n12_top', 'o_ser', 'SN/NI'),
  mkEdge('e12wn_14wn', 'n12_wn', 'n14_wn', 'Y/PY/WN'),
  mkEdge('e12wn_ser',  'n12_wn', 'o_ser',  'SN/NI'),
  mkEdge('e14a_low', 'n14_a', 'o_low', 'N/PN'),
  mkEdge('e14a_ser', 'n14_a', 'o_ser', 'Y/PY'),
  mkEdge('e14b_low', 'n14_b', 'o_low', 'N/PN'),
  mkEdge('e14b_ser', 'n14_b', 'o_ser', 'Y/PY'),
  mkEdge('e14wn_mod', 'n14_wn', 'o_mod', 'N/PN'),
  mkEdge('e14wn_ser', 'n14_wn', 'o_ser', 'Y/PY'),
  mkEdge('e14sni_crit',  'n14_sni', 'o_crit',  'Y/PY'),
  mkEdge('e14sni_12bot', 'n14_sni', 'n12_bot', 'N/PN'),
  mkEdge('e12bot_ser',  'n12_bot', 'o_ser',  'Y/PY'),
  mkEdge('e12bot_crit', 'n12_bot', 'o_crit', 'SN/WN/NI'),
];

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
      if (a.q12 === 'SN/NI') {
        nodes.add('o_ser'); edges.add('e12top_ser'); outcome = 'serious';
      } else {
        nodes.add('n14_b'); edges.add('e12top_14b');
        if (!a.q14) return { nodes, edges, outcome };
        if (a.q14 === 'N/PN') { nodes.add('o_low'); edges.add('e14b_low'); outcome = 'low-except'; }
        else                  { nodes.add('o_ser'); edges.add('e14b_ser'); outcome = 'serious'; }
      }
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

type Step = { key: keyof Answers; label: string; options: string[] } | null;
/* QLabels — full question text from domain-1a.json, prefixed with question ID for the bottom panel */
const QLabels = {
  q11:     '1.1  Did the authors control for all the important confounding factors for which this was necessary?',
  q13:     '1.3  Did the authors control for any post-intervention variables that could have been affected by the intervention?',
  q12_top: '1.2  Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?',
  /* q12_bot uses the same full text as q12_top — no abbreviation */
  q12_bot: '1.2  Were confounding factors that were controlled for (and for which control was necessary) measured validly and reliably by the variables available in this study?',
  q14:     '1.4  Did the use of negative controls, quantitative bias analysis, or other considerations, suggest serious uncontrolled confounding?',
};

function getNextStep(a: Answers): Step {
  if (!a.q11)  return { key: 'q11', label: QLabels.q11,  options: ['Y/PY', 'WN', 'SN/NI'] };
  if (a.q11 === 'Y/PY') {
    if (!a.q13) return { key: 'q13', label: QLabels.q13, options: ['Y/PY', 'N/PN/NI'] };
    if (a.q13 === 'Y/PY') {
      if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
    } else {
      if (!a.q12) return { key: 'q12', label: QLabels.q12_top, options: ['Y/PY/WN', 'SN/NI'] };
      if (a.q12 !== 'SN/NI' && !a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
    }
  } else if (a.q11 === 'WN') {
    if (!a.q13) return { key: 'q13', label: QLabels.q13, options: ['Y/PY', 'N/PN/NI'] };
    if (!a.q12) return { key: 'q12', label: QLabels.q12_top, options: ['Y/PY/WN', 'SN/NI'] };
    if (a.q12 !== 'SN/NI' && !a.q14) return { key: 'q14', label: QLabels.q14, options: ['N/PN', 'Y/PY'] };
  } else {
    if (!a.q14) return { key: 'q14', label: QLabels.q14, options: ['Y/PY', 'N/PN'] };
    if (a.q14 !== 'Y/PY' && !a.q12) return { key: 'q12', label: QLabels.q12_bot, options: ['Y/PY', 'SN/WN/NI'] };
  }
  return null;
}

export default function Domain1AGraph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q11: initialAnswers?.q11 || null,
    q13: initialAnswers?.q13 || null,
    q12: initialAnswers?.q12 || null,
    q14: initialAnswers?.q14 || null,
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

  const answer = (key: keyof Answers, val: string) =>
    setAnswers(prev => ({ ...prev, [key]: val }));

  const reset = () => setAnswers({ q11: null, q13: null, q12: null, q14: null });

  /* Cascade order: changing an earlier question clears all that follow it. */
  const CASCADE: (keyof Answers)[] = ['q11', 'q13', 'q12', 'q14'];
  const QLABELS: Record<keyof Answers, string> = { q11: '1.1', q13: '1.3', q12: '1.2', q14: '1.4' };
  /* Build answered pills in cascade order */
  const answeredItems: AnsweredItem[] = CASCADE
    .filter(k => answers[k] !== null)
    .map(k => ({ key: k, label: QLABELS[k], value: answers[k]! }));
  /* Clear from key onwards so the user can re-answer from that point */
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#f8fafc', overflow: 'hidden' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 1 — Confounding</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Variant A — Intention-to-treat</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#e2e8f0" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, overflowY: 'auto', maxHeight: '40%' }}>
        {outcome ? (
          /* Fragment allows adding the answered-pills panel below the outcome badge */
          <>
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
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </>
        ) : nextStep ? (
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
              {Object.values(answers).some(Boolean) && (
                <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 20, cursor: 'pointer', fontSize: 12, color: '#64748b' }}>↺ Reset</button>
              )}
            </div>
            {/* Allow re-answering any previously answered question */}
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer option above to trace the path through the graph.</div>
        )}
      </div>
    </div>
  );
}
