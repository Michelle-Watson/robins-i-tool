import { ReactFlow, Background, Controls, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState, useMemo, useEffect } from 'react';
import {
  QuestionNode, OutcomeNode, mkEdge,
  OUTCOME_C, ARROW, STYLE_GOOD, STYLE_BAD,
  type QData, type OData, type RiskLevel, type Edge, DomainGraphProps
} from './shared';

const ACCENT = '#ea580c';
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

type IntermLevel = 'low' | 'moderate' | 'serious';
const SEVERITY: Record<IntermLevel, number> = { low: 0, moderate: 1, serious: 2 };

type Answers = {
  q31: string | null; q32: string | null; q33: string | null; q34: string | null; q35: string | null;
  q36: string | null; q37: string | null; q38: string | null;
};

const BASE_NODES: Node[] = [
  { id: 'n31', type: 'q', position: { x: 0, y: 70 }, data: { qid: '3.1', shortLabel: 'Participants followed from start of intervention?', active: false } as QData },
  { id: 'n32', type: 'q', position: { x: 250, y: 10 }, data: { qid: '3.2', shortLabel: 'Early outcome events excluded?', active: false } as QData },
  { id: 'a_low',  type: 'o', position: { x: 530, y: 0  }, data: { level: 'low',      label: 'A: LOW',      active: false } as OData },
  { id: 'a_mod',  type: 'o', position: { x: 530, y: 100 }, data: { level: 'moderate', label: 'A: MOD',      active: false } as OData },
  { id: 'a_ser',  type: 'o', position: { x: 530, y: 200 }, data: { level: 'serious',  label: 'A: SERIOUS',  active: false } as OData },
  { id: 'n33', type: 'q', position: { x: 0, y: 430 }, data: { qid: '3.3', shortLabel: 'Selection based on characteristics after start of intervention?', active: false } as QData },
  { id: 'n34', type: 'q', position: { x: 250, y: 500 }, data: { qid: '3.4', shortLabel: 'Selection variables associated with intervention?', active: false } as QData },
  { id: 'n35', type: 'q', position: { x: 500, y: 500 }, data: { qid: '3.5', shortLabel: 'Selection variables influenced by outcome?', active: false } as QData },
  { id: 'b_low',  type: 'o', position: { x: 530, y: 380 }, data: { level: 'low',      label: 'B: LOW',     active: false } as OData },
  { id: 'b_mod',  type: 'o', position: { x: 530, y: 480 }, data: { level: 'moderate', label: 'B: MOD',     active: false } as OData },
  { id: 'b_ser',  type: 'o', position: { x: 530, y: 580 }, data: { level: 'serious',  label: 'B: SERIOUS', active: false } as OData },
  { id: 'n36', type: 'q', position: { x: 780, y: 290 }, data: { qid: '3.6', shortLabel: 'Analysis corrected for selection biases?', active: false } as QData },
  { id: 'n37', type: 'q', position: { x: 980, y: 290 }, data: { qid: '3.7', shortLabel: 'Sensitivity analyses demonstrate minimal impact?', active: false } as QData },
  { id: 'n38', type: 'q', position: { x: 1180, y: 290 }, data: { qid: '3.8', shortLabel: 'Selection biases severe?', active: false } as QData },
  { id: 'o_low',  type: 'o', position: { x: 1420, y: 0   }, data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1420, y: 150 }, data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1420, y: 330 }, data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1420, y: 480 }, data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

const BASE_EDGES: Edge[] = [
  mkEdge('e31_32',    'n31', 'n32',  'Y/PY'),
  mkEdge('e31_amod',  'n31', 'a_mod','WN/NI'),
  mkEdge('e31_aser',  'n31', 'a_ser','SY'),
  mkEdge('e32_alow',  'n32', 'a_low', 'N/PN/NI'),
  mkEdge('e32_amod',  'n32', 'a_mod', 'Y/PY'),
  mkEdge('e33_blow',  'n33', 'b_low', 'N/PN'),
  mkEdge('e33_bmod',  'n33', 'b_mod', 'NI'),
  mkEdge('e33_34',    'n33', 'n34',   'Y/PY'),
  mkEdge('e34_blow',  'n34', 'b_low', 'N/PN'),
  mkEdge('e34_bmod',  'n34', 'b_mod', 'NI'),
  mkEdge('e34_35',    'n34', 'n35',   'Y/PY'),
  mkEdge('e35_bmod',  'n35', 'b_mod', 'N/PN'),
  mkEdge('e35_bmod2', 'n35', 'b_mod', 'NI'),
  mkEdge('e35_bser',  'n35', 'b_ser', 'Y/PY'),
  mkEdge('easer_36', 'a_ser', 'n36', '→ combine'),
  mkEdge('ebser_36', 'b_ser', 'n36', '→ combine'),
  mkEdge('ecomb_low',  'a_low', 'o_low', 'both LOW'),
  mkEdge('ecomb_mod',  'a_mod', 'o_mod', 'worst MOD'),
  mkEdge('e36_mod',  'n36', 'o_mod', 'Y/PY'),
  mkEdge('e36_37',   'n36', 'n37',   'N/PN/NI'),
  mkEdge('e37_mod',  'n37', 'o_mod', 'Y/PY'),
  mkEdge('e37_38',   'n37', 'n38',   'N/PN/NI'),
  mkEdge('e38_crit', 'n38', 'o_crit', 'Y/PY'),
  mkEdge('e38_ser',  'n38', 'o_ser',  'N/PN/NI'),
];

function getSubA(a: Answers): IntermLevel | null {
  if (!a.q31) return null;
  if (a.q31 === 'SY') return 'serious';
  if (a.q31 === 'WN/NI') return 'moderate';
  if (a.q31 === 'Y/PY') {
    if (!a.q32) return null;
    if (a.q32 === 'N/PN/NI') return 'low';
    return 'moderate';
  }
  return null;
}

function getSubB(a: Answers): IntermLevel | null {
  if (!a.q33) return null;
  if (a.q33 === 'N/PN') return 'low';
  if (a.q33 === 'NI') return 'moderate';
  if (a.q33 === 'Y/PY') {
    if (!a.q34) return null;
    if (a.q34 === 'N/PN') return 'low';
    if (a.q34 === 'NI') return 'moderate';
    if (a.q34 === 'Y/PY') {
      if (!a.q35) return null;
      if (a.q35 === 'Y/PY') return 'serious';
      return 'moderate';
    }
  }
  return null;
}

function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n31', 'n33']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  const subA = getSubA(a);
  if (a.q31) {
    if (a.q31 === 'SY')    { nodes.add('a_ser'); edges.add('e31_aser'); }
    else if (a.q31 === 'WN/NI') { nodes.add('a_mod'); edges.add('e31_amod'); }
    else if (a.q31 === 'Y/PY') {
      nodes.add('n32'); edges.add('e31_32');
      if (a.q32) {
        if (a.q32 === 'N/PN/NI') { nodes.add('a_low'); edges.add('e32_alow'); }
        else                     { nodes.add('a_mod'); edges.add('e32_amod'); }
      }
    }
  }

  const subB = getSubB(a);
  if (a.q33) {
    if (a.q33 === 'N/PN') { nodes.add('b_low'); edges.add('e33_blow'); }
    else if (a.q33 === 'NI') { nodes.add('b_mod'); edges.add('e33_bmod'); }
    else if (a.q33 === 'Y/PY') {
      nodes.add('n34'); edges.add('e33_34');
      if (a.q34) {
        if (a.q34 === 'N/PN') { nodes.add('b_low'); edges.add('e34_blow'); }
        else if (a.q34 === 'NI') { nodes.add('b_mod'); edges.add('e34_bmod'); }
        else {
          nodes.add('n35'); edges.add('e34_35');
          if (a.q35) {
            if (a.q35 === 'Y/PY') { nodes.add('b_ser'); edges.add('e35_bser'); }
            else                  { nodes.add('b_mod'); edges.add('e35_bmod'); }
          }
        }
      }
    }
  }

  if (subA === null || subB === null) return { nodes, edges, outcome };

  const worst = SEVERITY[subA] >= SEVERITY[subB] ? subA : subB;

  if (worst === 'low') {
    nodes.add('o_low'); edges.add('ecomb_low'); outcome = 'low';
  } else if (worst === 'moderate') {
    nodes.add('o_mod'); edges.add('ecomb_mod'); outcome = 'moderate';
  } else {
    if (subA === 'serious') edges.add('easer_36');
    if (subB === 'serious') edges.add('ebser_36');
    nodes.add('n36');

    if (!a.q36) return { nodes, edges, outcome };

    if (a.q36 === 'Y/PY') {
      nodes.add('o_mod'); edges.add('e36_mod'); outcome = 'moderate';
    } else {
      nodes.add('n37'); edges.add('e36_37');
      if (!a.q37) return { nodes, edges, outcome };

      if (a.q37 === 'Y/PY') {
        nodes.add('o_mod'); edges.add('e37_mod'); outcome = 'moderate';
      } else {
        nodes.add('n38'); edges.add('e37_38');
        if (!a.q38) return { nodes, edges, outcome };

        if (a.q38 === 'Y/PY') {
          nodes.add('o_crit'); edges.add('e38_crit'); outcome = 'critical';
        } else {
          nodes.add('o_ser');  edges.add('e38_ser');  outcome = 'serious';
        }
      }
    }
  }

  return { nodes, edges, outcome };
}

type Step = { key: keyof Answers; label: string; options: string[]; section: string } | null;

function getNextStep(a: Answers): Step {
  if (!a.q31) return { key: 'q31', section: 'Sub-graph A', label: '3.1  Were all participants in the study followed from the start of the intervention?', options: ['Y/PY', 'WN/NI', 'SY'] };
  if (a.q31 === 'Y/PY' && !a.q32) return { key: 'q32', section: 'Sub-graph A', label: '3.2  Were early outcome events excluded from the analysis?', options: ['N/PN/NI', 'Y/PY'] };

  if (!a.q33) return { key: 'q33', section: 'Sub-graph B', label: '3.3  Was selection of participants into the study (or into the analysis) based on characteristics of participants observed after the start of the intervention?', options: ['N/PN', 'NI', 'Y/PY'] };
  if (a.q33 === 'Y/PY' && !a.q34) return { key: 'q34', section: 'Sub-graph B', label: '3.4  Were the variables used to select participants associated with intervention?', options: ['N/PN', 'NI', 'Y/PY'] };
  if (a.q33 === 'Y/PY' && a.q34 === 'Y/PY' && !a.q35) return { key: 'q35', section: 'Sub-graph B', label: '3.5  Were the variables used to select participants associated with outcome or risk of outcome?', options: ['N/PN', 'NI', 'Y/PY'] };

  const subA = getSubA(a);
  const subB = getSubB(a);
  if (subA === null || subB === null) return null;

  const worst = SEVERITY[subA] >= SEVERITY[subB] ? subA : subB;
  if (worst !== 'serious') return null;

  if (!a.q36) return { key: 'q36', section: 'Combined', label: '3.6  Was the analysis corrected for selection bias?', options: ['Y/PY', 'N/PN/NI'] };
  if (a.q36 !== 'Y/PY' && !a.q37) return { key: 'q37', section: 'Combined', label: '3.7  Did sensitivity analyses demonstrate that the results were not sensitive to any plausible selection bias?', options: ['Y/PY', 'N/PN/NI'] };
  if (a.q37 !== 'Y/PY' && !a.q38) return { key: 'q38', section: 'Combined', label: '3.8  Were selection biases likely to be severe?', options: ['Y/PY', 'N/PN/NI'] };

  return null;
}

export default function Domain3Graph({ onOutcome, onAnswersChange, initialAnswers }: DomainGraphProps = {}) {
  const [answers, setAnswers] = useState<Answers>({
    q31: initialAnswers?.q31 || null, q32: initialAnswers?.q32 || null, q33: initialAnswers?.q33 || null, q34: initialAnswers?.q34 || null, q35: initialAnswers?.q35 || null,
    q36: initialAnswers?.q36 || null, q37: initialAnswers?.q37 || null, q38: initialAnswers?.q38 || null,
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
      const toOutcome = e.target.startsWith('o_') || ['a_low','a_mod','a_ser','b_low','b_mod','b_ser'].includes(e.target);
      const style = toOutcome
        ? (['o_low','o_mod','a_low','a_mod','b_low','b_mod'].includes(e.target) ? STYLE_GOOD : STYLE_BAD)
        : { stroke: ACCENT, strokeWidth: 2.5 };
      return { ...e, style, animated: true,
        markerEnd: { ...ARROW, color: style.stroke },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: style.stroke } };
    }),
    [aE]);

  const nextStep = useMemo(() => getNextStep(answers), [answers]);
  const answer = (k: keyof Answers, v: string) => setAnswers(p => ({ ...p, [k]: v }));
  const reset  = () => setAnswers({ q31: null, q32: null, q33: null, q34: null, q35: null, q36: null, q37: null, q38: null });

  const subA = useMemo(() => getSubA(answers), [answers]);
  const subB = useMemo(() => getSubB(answers), [answers]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#fff7ed' }}>
      <div style={{ background: '#7c2d12', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 3</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias due to deviations from intended interventions</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#fed7aa" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {(subA || subB) && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11 }}>
            {subA && <span style={{ background: OUTCOME_C[subA].bg, color: OUTCOME_C[subA].text, border: `1px solid ${OUTCOME_C[subA].border}`, borderRadius: 6, padding: '2px 10px', fontWeight: 700 }}>A: {subA.toUpperCase()}</span>}
            {subB && <span style={{ background: OUTCOME_C[subB].bg, color: OUTCOME_C[subB].text, border: `1px solid ${OUTCOME_C[subB].border}`, borderRadius: 6, padding: '2px 10px', fontWeight: 700 }}>B: {subB.toUpperCase()}</span>}
          </div>
        )}
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 3: {outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
        ) : nextStep ? (
          <div>
            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>[ {nextStep.section} ]</div>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
              <strong style={{ color: '#7c2d12' }}>Next: </strong>{nextStep.label}
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
