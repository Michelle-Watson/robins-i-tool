import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  PreviousAnswersPanel,
  type QData, type OData, type RiskLevel, type Edge, type AnsweredItem, DomainGraphProps
} from './shared';

const ACCENT = '#b45309';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

type Answers = {
  q413:  string | null; q44: string | null; q45: string | null; q46: string | null; q47: string | null;
  q48: string | null; q49: string | null; q410: string | null; q411: string | null;
};

const BASE_NODES: Node[] = [
  /* 4.1–4.3 combined gate node – source: domain-4.json */
  { id: 'n413', type: 'q', position: { x: 0, y: 300 }, data: { qid: '4.1–4.3', shortLabel: 'Were complete data on intervention status, outcome, and confounding variables available for all, or nearly all, participants?', active: false } as QData },
  /* 4.4 – source: domain-4.json */
  { id: 'n44', type: 'q', position: { x: 250, y: 300 }, data: { qid: '4.4', shortLabel: 'Is the result based on a complete case analysis?', active: false } as QData },
  /* 4.5 – source: domain-4.json */
  { id: 'n45', type: 'q', position: { x: 500, y: 160 }, data: { qid: '4.5', shortLabel: 'Was exclusion from the analysis because of missing data likely to be related to the true value of the outcome?', active: false } as QData },
  /* 4.6 – source: domain-4.json */
  { id: 'n46', type: 'q', position: { x: 750, y: 100 }, data: { qid: '4.6', shortLabel: 'Is the relationship between the outcome and missingness likely to be explained by the variables in the analysis model?', active: false } as QData },
  /* 4.7 – source: domain-4.json */
  { id: 'n47', type: 'q', position: { x: 500, y: 440 }, data: { qid: '4.7', shortLabel: 'Was the analysis based on imputing missing values?', active: false } as QData },
  /* 4.8 – source: domain-4.json */
  { id: 'n48', type: 'q', position: { x: 750, y: 380 }, data: { qid: '4.8', shortLabel: 'Is it reasonable to assume that data were missing at random (MAR) or missing completely at random (MCAR)?', active: false } as QData },
  /* 4.9 – source: domain-4.json */
  { id: 'n49', type: 'q', position: { x: 1000, y: 320 }, data: { qid: '4.9', shortLabel: 'Was imputation performed appropriately?', active: false } as QData },
  /* 4.10 – source: domain-4.json */
  { id: 'n410', type: 'q', position: { x: 500, y: 590 }, data: { qid: '4.10', shortLabel: 'Was an appropriate alternative method used to correct for bias due to missing data?', active: false } as QData },
  /* 4.11 – source: domain-4.json (repeated at multiple positions in the tree) */
  { id: 'n411a', type: 'q', position: { x: 1000, y: 0 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'n411b', type: 'q', position: { x: 1000, y: 130 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'n411c', type: 'q', position: { x: 1000, y: 230 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'n411d', type: 'q', position: { x: 1250, y: 260 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'n411e', type: 'q', position: { x: 1250, y: 410 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'n411f', type: 'q', position: { x: 1000, y: 540 }, data: { qid: '4.11', shortLabel: 'Is there evidence that the result was not biased by missing data?', active: false } as QData },
  { id: 'o_low',  type: 'o', position: { x: 1520, y: 0   }, data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1520, y: 130 }, data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1520, y: 290 }, data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1520, y: 460 }, data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e413_low',  'n413', 'o_low', 'All Y/PY'),
  mkEdge('e413_44',   'n413', 'n44',   'Any N/PN/NI'),
  mkEdge('e44_45',   'n44', 'n45', 'Y/PY/NI'),
  mkEdge('e44_47',   'n44', 'n47', 'N/PN'),
  mkEdge('e45_411a', 'n45', 'n411a', 'N/PN'),
  mkEdge('e45_46',   'n45', 'n46',   'Y/PY/NI'),
  mkEdge('e46_411b', 'n46', 'n411b', 'Y/PY'),
  mkEdge('e46_411c', 'n46', 'n411c', 'WN/NI'),
  mkEdge('e46_crit', 'n46', 'o_crit', 'SN'),
  mkEdge('e47_48',   'n47', 'n48',   'Y/PY'),
  mkEdge('e47_410',  'n47', 'n410',  'N/PN/NI'),
  mkEdge('e48_49',   'n48', 'n49',   'Y/PY'),
  mkEdge('e48_411e', 'n48', 'n411e', 'N/PN/NI'),
  mkEdge('e49_411d',  'n49', 'n411d', 'Y/PY'),
  mkEdge('e49_411e',  'n49', 'n411e', 'WN/NI'),
  mkEdge('e49_crit',  'n49', 'o_crit', 'SN'),
  mkEdge('e410_low',  'n410', 'o_low',  'Y/PY'),
  mkEdge('e410_411f', 'n410', 'n411f',  'WN/NI'),
  mkEdge('e410_crit', 'n410', 'o_crit', 'SN'),
  mkEdge('e411a_mod', 'n411a', 'o_mod', 'Y/PY'),
  mkEdge('e411a_ser', 'n411a', 'o_ser', 'N/PN'),
  mkEdge('e411b_mod', 'n411b', 'o_mod', 'Y/PY'),
  mkEdge('e411b_ser', 'n411b', 'o_ser', 'N/PN'),
  mkEdge('e411c_ser',  'n411c', 'o_ser', 'Y/PY'),
  mkEdge('e411c_ser2', 'n411c', 'o_ser', 'N/PN'),
  mkEdge('e411d_low', 'n411d', 'o_low', 'Y/PY'),
  mkEdge('e411d_ser', 'n411d', 'o_ser', 'N/PN'),
  mkEdge('e411e_ser',  'n411e', 'o_ser',  'Y/PY'),
  mkEdge('e411e_crit', 'n411e', 'o_crit', 'N/PN'),
  mkEdge('e411f_ser',  'n411f', 'o_ser',  'Y/PY'),
  mkEdge('e411f_crit', 'n411f', 'o_crit', 'N/PN'),
];

function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n413']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q413) return { nodes, edges, outcome };

  if (a.q413 === 'All Y/PY') {
    nodes.add('o_low'); edges.add('e413_low'); outcome = 'low';
    return { nodes, edges, outcome };
  }

  nodes.add('n44'); edges.add('e413_44');
  if (!a.q44) return { nodes, edges, outcome };

  if (a.q44 === 'N/PN') {
    nodes.add('n47'); edges.add('e44_47');
    if (!a.q47) return { nodes, edges, outcome };

    if (a.q47 === 'Y/PY') {
      nodes.add('n48'); edges.add('e47_48');
      if (!a.q48) return { nodes, edges, outcome };

      if (a.q48 === 'Y/PY') {
        nodes.add('n49'); edges.add('e48_49');
        if (!a.q49) return { nodes, edges, outcome };

        if (a.q49 === 'SN') {
          nodes.add('o_crit'); edges.add('e49_crit'); outcome = 'critical';
        } else if (a.q49 === 'Y/PY') {
          nodes.add('n411d'); edges.add('e49_411d');
          if (!a.q411) return { nodes, edges, outcome };
          if (a.q411 === 'Y/PY') { nodes.add('o_low'); edges.add('e411d_low'); outcome = 'low'; }
          else                   { nodes.add('o_ser'); edges.add('e411d_ser'); outcome = 'serious'; }
        } else {
          nodes.add('n411e'); edges.add('e49_411e');
          if (!a.q411) return { nodes, edges, outcome };
          if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411e_ser');  outcome = 'serious'; }
          else                   { nodes.add('o_crit'); edges.add('e411e_crit'); outcome = 'critical'; }
        }
      } else {
        nodes.add('n411e'); edges.add('e48_411e');
        if (!a.q411) return { nodes, edges, outcome };
        if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411e_ser');  outcome = 'serious'; }
        else                   { nodes.add('o_crit'); edges.add('e411e_crit'); outcome = 'critical'; }
      }
    } else {
      nodes.add('n410'); edges.add('e47_410');
      if (!a.q410) return { nodes, edges, outcome };

      if (a.q410 === 'Y/PY')   { nodes.add('o_low');  edges.add('e410_low');  outcome = 'low'; }
      else if (a.q410 === 'SN') { nodes.add('o_crit'); edges.add('e410_crit'); outcome = 'critical'; }
      else {
        nodes.add('n411f'); edges.add('e410_411f');
        if (!a.q411) return { nodes, edges, outcome };
        if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411f_ser');  outcome = 'serious'; }
        else                   { nodes.add('o_crit'); edges.add('e411f_crit'); outcome = 'critical'; }
      }
    }

  } else {
    nodes.add('n45'); edges.add('e44_45');
    if (!a.q45) return { nodes, edges, outcome };

    if (a.q45 === 'N/PN') {
      nodes.add('n411a'); edges.add('e45_411a');
      if (!a.q411) return { nodes, edges, outcome };
      if (a.q411 === 'Y/PY') { nodes.add('o_mod'); edges.add('e411a_mod'); outcome = 'moderate'; }
      else                   { nodes.add('o_ser'); edges.add('e411a_ser'); outcome = 'serious'; }

    } else {
      nodes.add('n46'); edges.add('e45_46');
      if (!a.q46) return { nodes, edges, outcome };

      if (a.q46 === 'SN') {
        nodes.add('o_crit'); edges.add('e46_crit'); outcome = 'critical';
      } else if (a.q46 === 'Y/PY') {
        nodes.add('n411b'); edges.add('e46_411b');
        if (!a.q411) return { nodes, edges, outcome };
        if (a.q411 === 'Y/PY') { nodes.add('o_mod'); edges.add('e411b_mod'); outcome = 'moderate'; }
        else                   { nodes.add('o_ser'); edges.add('e411b_ser'); outcome = 'serious'; }
      } else {
        nodes.add('n411c'); edges.add('e46_411c');
        if (!a.q411) return { nodes, edges, outcome };
        nodes.add('o_ser');
        edges.add(a.q411 === 'Y/PY' ? 'e411c_ser' : 'e411c_ser2');
        outcome = 'serious';
      }
    }
  }

  return { nodes, edges, outcome };
}

type Step = { key: keyof Answers; label: string; options: string[] } | null;
const Q411_LABEL = '4.11  Is there evidence that the result was not biased by missing data?';

function getNextStep(a: Answers): Step {
  /* 4.1–4.3 label — source: domain-4.json (combined gate for 3 data-completeness questions) */
  if (!a.q413) return { key: 'q413', label: '4.1–4.3  Were complete data on intervention status, outcome, and confounding variables available for all, or nearly all, participants?', options: ['All Y/PY', 'Any N/PN/NI'] };
  if (a.q413 === 'All Y/PY') return null;

  /* 4.4 label — source: domain-4.json */
  if (!a.q44) return { key: 'q44', label: '4.4  Is the result based on a complete case analysis?', options: ['Y/PY/NI', 'N/PN'] };

  if (a.q44 === 'N/PN') {
    /* 4.7 label — source: domain-4.json */
    if (!a.q47) return { key: 'q47', label: '4.7  Was the analysis based on imputing missing values?', options: ['Y/PY', 'N/PN/NI'] };
    if (a.q47 === 'Y/PY') {
      /* 4.8 label — source: domain-4.json */
      if (!a.q48) return { key: 'q48', label: '4.8  Is it reasonable to assume that data were missing at random (MAR) or missing completely at random (MCAR)?', options: ['Y/PY', 'N/PN/NI'] };
      if (a.q48 === 'Y/PY') {
        /* 4.9 label — source: domain-4.json */
        if (!a.q49) return { key: 'q49', label: '4.9  Was imputation performed appropriately?', options: ['Y/PY', 'WN/NI', 'SN'] };
        if (a.q49 === 'SN') return null;
        if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
      } else {
        if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
      }
    } else {
      /* 4.10 label — source: domain-4.json */
      if (!a.q410) return { key: 'q410', label: '4.10  Was an appropriate alternative method used to correct for bias due to missing data?', options: ['Y/PY', 'WN/NI', 'SN'] };
      if (a.q410 === 'Y/PY' || a.q410 === 'SN') return null;
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    }
  } else {
    /* 4.5 label — source: domain-4.json */
    if (!a.q45) return { key: 'q45', label: '4.5  Was exclusion from the analysis because of missing data likely to be related to the true value of the outcome?', options: ['N/PN', 'Y/PY/NI'] };
    if (a.q45 === 'N/PN') {
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    } else {
      /* 4.6 label — source: domain-4.json */
      if (!a.q46) return { key: 'q46', label: '4.6  Is the relationship between the outcome and missingness likely to be explained by the variables in the analysis model?', options: ['Y/PY', 'WN/NI', 'SN'] };
      if (a.q46 === 'SN') return null;
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    }
  }
  return null;
}

export default function Domain4Graph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q413: initialAnswers?.q413 || null, q44: initialAnswers?.q44 || null, q45: initialAnswers?.q45 || null, q46: initialAnswers?.q46 || null, q47: initialAnswers?.q47 || null,
    q48: initialAnswers?.q48 || null, q49: initialAnswers?.q49 || null, q410: initialAnswers?.q410 || null, q411: initialAnswers?.q411 || null,
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
  const reset  = () => setAnswers({ q413: null, q44: null, q45: null, q46: null, q47: null, q48: null, q49: null, q410: null, q411: null });

  /* Cascade order: changing an earlier question clears all that follow. */
  const CASCADE: (keyof Answers)[] = ['q413', 'q44', 'q45', 'q46', 'q47', 'q48', 'q49', 'q410', 'q411'];
  const QLABELS: Record<keyof Answers, string> = { q413: '4.1–3', q44: '4.4', q45: '4.5', q46: '4.6', q47: '4.7', q48: '4.8', q49: '4.9', q410: '4.10', q411: '4.11' };
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#fefce8', overflow: 'hidden' }}>
      <div style={{ background: '#713f12', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 4</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias due to missing data</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#fef08a" gap={20} />
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
                Domain 4: {outcome.toUpperCase()}
              </div>
              <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
            </div>
            <PreviousAnswersPanel items={answeredItems} onChangeKey={handleChange} accent={ACCENT} />
          </>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#713f12' }}>Next: </strong>{nextStep.label}
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
