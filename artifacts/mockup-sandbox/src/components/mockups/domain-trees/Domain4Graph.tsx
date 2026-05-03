/**
 * Domain4Graph.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ROBINS-I V2  Domain 4 – Bias due to missing data
 *
 * SOURCE IMAGE: attached_assets/image_1777800346990.png  ← SOURCE OF TRUTH
 *
 * ALGORITHM (traced from PDF image):
 *
 *  Q4.1–4.3 (grouped): Complete data for all participants?
 *    All Y/PY   →  LOW (direct)
 *    Any N/PN/NI →  Q4.4 (complete case analysis used?)
 *
 *  Q4.4 = Y/PY or NI  →  Q4.5 (exclusions related to true value of outcome?)
 *    4.5 = N/PN  →  Q4.11a  →  Y/PY: MODERATE  |  N/PN: SERIOUS
 *    4.5 = Y/PY/NI  →  Q4.6 (outcome-missingness relationship explained by model?)
 *      4.6 = Y/PY    →  Q4.11b  →  Y/PY: MODERATE  |  N/PN: SERIOUS
 *      4.6 = WN/NI   →  Q4.11c  →  Y/PY: SERIOUS   |  N/PN: SERIOUS
 *      4.6 = SN      →  CRITICAL (direct)
 *
 *  Q4.4 = N/PN  →  Q4.7 (imputation used?)
 *    4.7 = Y/PY  →  Q4.8 (MAR/MCAR reasonable?)
 *      4.8 = Y/PY    →  Q4.9 (appropriate imputation method?)
 *        4.9 = Y/PY   →  Q4.11d  →  Y/PY: LOW  |  N/PN: SERIOUS
 *        4.9 = WN/NI  →  Q4.11e  →  Y/PY: SERIOUS  |  N/PN: CRITICAL
 *        4.9 = SN     →  Q4.11f (or direct) — CRITICAL path
 *      4.8 = N/PN/NI  →  Q4.11e  →  Y/PY: SERIOUS  |  N/PN: CRITICAL
 *    4.7 = N/PN/NI  →  Q4.10 (alternative appropriate method?)
 *      4.10 = Y/PY   →  LOW (direct)
 *      4.10 = WN/NI  →  Q4.11f  →  Y/PY: SERIOUS  |  N/PN: CRITICAL
 *      4.10 = SN     →  CRITICAL (direct)
 *
 *  Q4.11 (Evidence that result is not biased?) — multiple instances at
 *  different positions, all with same outcomes except threshold varies.
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

const ACCENT = '#b45309'; // amber/brown for D4
const nodeTypes = { q: QuestionNode, o: OutcomeNode };

// ─── Answer state ─────────────────────────────────────────────────────────────
type Answers = {
  q413:  string | null; // Q4.1-4.3 grouped: All Y/PY or any N/PN/NI?
  q44:   string | null; // Q4.4  — complete case analysis?
  q45:   string | null; // Q4.5  — exclusions related to true value?
  q46:   string | null; // Q4.6  — missingness relationship explained by model?
  q47:   string | null; // Q4.7  — imputation used?
  q48:   string | null; // Q4.8  — MAR/MCAR reasonable?
  q49:   string | null; // Q4.9  — appropriate imputation method?
  q410:  string | null; // Q4.10 — alternative appropriate method?
  q411:  string | null; // Q4.11 — evidence result not biased?
};

// ─── Nodes ────────────────────────────────────────────────────────────────────
const BASE_NODES: Node[] = [
  // ── Entry: Q4.1–4.3 (shown as one combined node) ─────────────────────────
  { id: 'n413', type: 'q', position: { x: 0, y: 300 },
    data: { qid: '4.1–4.3', shortLabel: 'Complete data for all participants?', active: false } as QData },

  // ── Q4.4: complete case analysis ──────────────────────────────────────────
  { id: 'n44', type: 'q', position: { x: 250, y: 300 },
    data: { qid: '4.4', shortLabel: 'Complete case analysis used?', active: false } as QData },

  // ── Q4.5: exclusion-related bias ─────────────────────────────────────────
  { id: 'n45', type: 'q', position: { x: 500, y: 160 },
    data: { qid: '4.5', shortLabel: 'Exclusion from analysis related to true value of outcome?', active: false } as QData },

  // ── Q4.6: model explanation of missingness ────────────────────────────────
  { id: 'n46', type: 'q', position: { x: 750, y: 100 },
    data: { qid: '4.6', shortLabel: 'Outcome-missingness relationship explained by model?', active: false } as QData },

  // ── Q4.7: imputation ──────────────────────────────────────────────────────
  { id: 'n47', type: 'q', position: { x: 500, y: 440 },
    data: { qid: '4.7', shortLabel: 'Analysis based on imputing missing values?', active: false } as QData },

  // ── Q4.8: MAR/MCAR ────────────────────────────────────────────────────────
  { id: 'n48', type: 'q', position: { x: 750, y: 380 },
    data: { qid: '4.8', shortLabel: 'MAR or MCAR assumption reasonable?', active: false } as QData },

  // ── Q4.9: imputation quality ──────────────────────────────────────────────
  { id: 'n49', type: 'q', position: { x: 1000, y: 320 },
    data: { qid: '4.9', shortLabel: 'Appropriate imputation method used?', active: false } as QData },

  // ── Q4.10: alternative method ────────────────────────────────────────────
  { id: 'n410', type: 'q', position: { x: 500, y: 590 },
    data: { qid: '4.10', shortLabel: 'Alternative appropriate method used for missing data?', active: false } as QData },

  // ── Q4.11 instances ───────────────────────────────────────────────────────
  // a: from 4.5=N/PN → MODERATE or SERIOUS
  { id: 'n411a', type: 'q', position: { x: 1000, y: 0 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },
  // b: from 4.6=Y/PY → MODERATE or SERIOUS
  { id: 'n411b', type: 'q', position: { x: 1000, y: 130 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },
  // c: from 4.6=WN/NI → SERIOUS (either answer)
  { id: 'n411c', type: 'q', position: { x: 1000, y: 230 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },
  // d: from 4.9=Y/PY → LOW or SERIOUS
  { id: 'n411d', type: 'q', position: { x: 1250, y: 260 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },
  // e: from 4.9=WN/NI or 4.8=N/PN/NI → SERIOUS or CRITICAL
  { id: 'n411e', type: 'q', position: { x: 1250, y: 410 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },
  // f: from 4.10=WN/NI → SERIOUS or CRITICAL
  { id: 'n411f', type: 'q', position: { x: 1000, y: 540 },
    data: { qid: '4.11', shortLabel: 'Evidence that result is not biased by missing data?', active: false } as QData },

  // ── Outcomes ──────────────────────────────────────────────────────────────
  { id: 'o_low',  type: 'o', position: { x: 1520, y: 0   },
    data: { level: 'low',      label: 'LOW',      active: false } as OData },
  { id: 'o_mod',  type: 'o', position: { x: 1520, y: 130 },
    data: { level: 'moderate', label: 'MODERATE', active: false } as OData },
  { id: 'o_ser',  type: 'o', position: { x: 1520, y: 290 },
    data: { level: 'serious',  label: 'SERIOUS',  active: false } as OData },
  { id: 'o_crit', type: 'o', position: { x: 1520, y: 460 },
    data: { level: 'critical', label: 'CRITICAL', active: false } as OData },
];

// ─── Edges ────────────────────────────────────────────────────────────────────
const BASE_EDGES: Edge[] = [
  // Entry ──────────────────────────────────────────────────────────────────
  mkEdge('e413_low',  'n413', 'o_low', 'All Y/PY'), // no missing data → LOW direct
  mkEdge('e413_44',   'n413', 'n44',   'Any N/PN/NI'),

  // Q4.4 ───────────────────────────────────────────────────────────────────
  mkEdge('e44_45',   'n44', 'n45', 'Y/PY/NI'), // complete case used → check exclusions
  mkEdge('e44_47',   'n44', 'n47', 'N/PN'),    // not complete case → check imputation

  // Q4.5 ───────────────────────────────────────────────────────────────────
  mkEdge('e45_411a', 'n45', 'n411a', 'N/PN'),    // not related → check bias evidence
  mkEdge('e45_46',   'n45', 'n46',   'Y/PY/NI'), // related → check if model explains

  // Q4.6 ───────────────────────────────────────────────────────────────────
  mkEdge('e46_411b', 'n46', 'n411b', 'Y/PY'),   // model explains → check bias evidence
  mkEdge('e46_411c', 'n46', 'n411c', 'WN/NI'),  // model weak/uncertain
  mkEdge('e46_crit', 'n46', 'o_crit', 'SN'),    // model definitely doesn't → CRITICAL

  // Q4.7 ───────────────────────────────────────────────────────────────────
  mkEdge('e47_48',   'n47', 'n48',   'Y/PY'),    // imputation used → check MAR/MCAR
  mkEdge('e47_410',  'n47', 'n410',  'N/PN/NI'), // no imputation → check alternative

  // Q4.8 ───────────────────────────────────────────────────────────────────
  mkEdge('e48_49',   'n48', 'n49',   'Y/PY'),   // MAR/MCAR OK → check imputation quality
  mkEdge('e48_411e', 'n48', 'n411e', 'N/PN/NI'),// MAR/MCAR not OK → probably biased

  // Q4.9 ───────────────────────────────────────────────────────────────────
  mkEdge('e49_411d',  'n49', 'n411d', 'Y/PY'),   // good imputation → bias evidence
  mkEdge('e49_411e',  'n49', 'n411e', 'WN/NI'),  // weak imputation → probably biased
  mkEdge('e49_crit',  'n49', 'o_crit', 'SN'),    // bad imputation → CRITICAL

  // Q4.10 ──────────────────────────────────────────────────────────────────
  mkEdge('e410_low',  'n410', 'o_low',  'Y/PY'), // good alt method → LOW
  mkEdge('e410_411f', 'n410', 'n411f',  'WN/NI'),// weak alt method
  mkEdge('e410_crit', 'n410', 'o_crit', 'SN'),   // no valid method → CRITICAL

  // Q4.11 instances ────────────────────────────────────────────────────────
  // a: from 4.5=N/PN (moderate or serious)
  mkEdge('e411a_mod', 'n411a', 'o_mod', 'Y/PY'),  // evidence no bias → MODERATE
  mkEdge('e411a_ser', 'n411a', 'o_ser', 'N/PN'),  // no evidence → SERIOUS

  // b: from 4.6=Y/PY (moderate or serious)
  mkEdge('e411b_mod', 'n411b', 'o_mod', 'Y/PY'),
  mkEdge('e411b_ser', 'n411b', 'o_ser', 'N/PN'),

  // c: from 4.6=WN/NI (serious either way — evidence not enough)
  mkEdge('e411c_ser',  'n411c', 'o_ser', 'Y/PY'),  // even if evidence, still SERIOUS
  mkEdge('e411c_ser2', 'n411c', 'o_ser', 'N/PN'),

  // d: from 4.9=Y/PY (low or serious)
  mkEdge('e411d_low', 'n411d', 'o_low', 'Y/PY'),  // evidence no bias → LOW
  mkEdge('e411d_ser', 'n411d', 'o_ser', 'N/PN'),  // no evidence → SERIOUS

  // e: from 4.9=WN/NI or 4.8=N/PN/NI (serious or critical)
  mkEdge('e411e_ser',  'n411e', 'o_ser',  'Y/PY'), // some evidence → SERIOUS
  mkEdge('e411e_crit', 'n411e', 'o_crit', 'N/PN'), // no evidence → CRITICAL

  // f: from 4.10=WN/NI (serious or critical)
  mkEdge('e411f_ser',  'n411f', 'o_ser',  'Y/PY'),
  mkEdge('e411f_crit', 'n411f', 'o_crit', 'N/PN'),
];

// ─── Path algorithm ───────────────────────────────────────────────────────────
// Domain 4 has the most complex branching. This function explicitly traces each
// path and records which Q4.11 instance is active.
function getActivePath(a: Answers): { nodes: Set<string>; edges: Set<string>; outcome: RiskLevel | null } {
  const nodes = new Set<string>(['n413']);
  const edges = new Set<string>();
  let outcome: RiskLevel | null = null;

  if (!a.q413) return { nodes, edges, outcome };

  if (a.q413 === 'All Y/PY') {
    // All data complete → LOW direct
    nodes.add('o_low'); edges.add('e413_low'); outcome = 'low';
    return { nodes, edges, outcome };
  }

  // Any N/PN/NI → Q4.4
  nodes.add('n44'); edges.add('e413_44');
  if (!a.q44) return { nodes, edges, outcome };

  if (a.q44 === 'N/PN') {
    // ── Complete case NOT used → Q4.7 (imputation) ────────────────────────
    nodes.add('n47'); edges.add('e44_47');
    if (!a.q47) return { nodes, edges, outcome };

    if (a.q47 === 'Y/PY') {
      // Imputation used → Q4.8 (is MAR/MCAR reasonable?)
      nodes.add('n48'); edges.add('e47_48');
      if (!a.q48) return { nodes, edges, outcome };

      if (a.q48 === 'Y/PY') {
        // MAR/MCAR OK → Q4.9 (imputation quality)
        nodes.add('n49'); edges.add('e48_49');
        if (!a.q49) return { nodes, edges, outcome };

        if (a.q49 === 'SN') {
          nodes.add('o_crit'); edges.add('e49_crit'); outcome = 'critical';
        } else if (a.q49 === 'Y/PY') {
          // Good imputation → Q4.11d
          nodes.add('n411d'); edges.add('e49_411d');
          if (!a.q411) return { nodes, edges, outcome };
          if (a.q411 === 'Y/PY') { nodes.add('o_low'); edges.add('e411d_low'); outcome = 'low'; }
          else                   { nodes.add('o_ser'); edges.add('e411d_ser'); outcome = 'serious'; }
        } else {
          // WN/NI → Q4.11e
          nodes.add('n411e'); edges.add('e49_411e');
          if (!a.q411) return { nodes, edges, outcome };
          if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411e_ser');  outcome = 'serious'; }
          else                   { nodes.add('o_crit'); edges.add('e411e_crit'); outcome = 'critical'; }
        }
      } else {
        // MAR/MCAR not OK → Q4.11e
        nodes.add('n411e'); edges.add('e48_411e');
        if (!a.q411) return { nodes, edges, outcome };
        if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411e_ser');  outcome = 'serious'; }
        else                   { nodes.add('o_crit'); edges.add('e411e_crit'); outcome = 'critical'; }
      }
    } else {
      // No imputation → Q4.10 (alternative method?)
      nodes.add('n410'); edges.add('e47_410');
      if (!a.q410) return { nodes, edges, outcome };

      if (a.q410 === 'Y/PY')   { nodes.add('o_low');  edges.add('e410_low');  outcome = 'low'; }
      else if (a.q410 === 'SN') { nodes.add('o_crit'); edges.add('e410_crit'); outcome = 'critical'; }
      else {
        // WN/NI → Q4.11f
        nodes.add('n411f'); edges.add('e410_411f');
        if (!a.q411) return { nodes, edges, outcome };
        if (a.q411 === 'Y/PY') { nodes.add('o_ser');  edges.add('e411f_ser');  outcome = 'serious'; }
        else                   { nodes.add('o_crit'); edges.add('e411f_crit'); outcome = 'critical'; }
      }
    }

  } else {
    // ── Complete case USED (Y/PY or NI) → Q4.5 ────────────────────────────
    nodes.add('n45'); edges.add('e44_45');
    if (!a.q45) return { nodes, edges, outcome };

    if (a.q45 === 'N/PN') {
      // Exclusions not related to outcome → Q4.11a
      nodes.add('n411a'); edges.add('e45_411a');
      if (!a.q411) return { nodes, edges, outcome };
      if (a.q411 === 'Y/PY') { nodes.add('o_mod'); edges.add('e411a_mod'); outcome = 'moderate'; }
      else                   { nodes.add('o_ser'); edges.add('e411a_ser'); outcome = 'serious'; }

    } else {
      // Y/PY or NI → Q4.6 (does model explain missingness?)
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
        // WN/NI → Q4.11c (SERIOUS either way)
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

// ─── Next step ────────────────────────────────────────────────────────────────
// Track which Q4.11 instance we need to ask, based on the active path.
type Step = { key: keyof Answers; label: string; options: string[] } | null;

const Q411_LABEL = '4.11  Is there evidence that the result was not biased by missing data (e.g. based on available case analysis, analysis of baseline covariates, or other sensitivity analyses)?';

function getNextStep(a: Answers): Step {
  if (!a.q413) return { key: 'q413', label: '4.1–4.3  Are outcome data reasonably complete for all participants?', options: ['All Y/PY', 'Any N/PN/NI'] };
  if (a.q413 === 'All Y/PY') return null;

  if (!a.q44) return { key: 'q44', label: '4.4  Were outcomes only analysed for participants with complete data?', options: ['Y/PY/NI', 'N/PN'] };

  if (a.q44 === 'N/PN') {
    // Imputation / alternative path
    if (!a.q47) return { key: 'q47', label: '4.7  Was the analysis based on imputing the missing values?', options: ['Y/PY', 'N/PN/NI'] };
    if (a.q47 === 'Y/PY') {
      if (!a.q48) return { key: 'q48', label: '4.8  Is the missing at random (MAR) or missing completely at random (MCAR) assumption reasonable?', options: ['Y/PY', 'N/PN/NI'] };
      if (a.q48 === 'Y/PY') {
        if (!a.q49) return { key: 'q49', label: '4.9  Was an appropriate imputation method used?', options: ['Y/PY', 'WN/NI', 'SN'] };
        if (a.q49 === 'SN') return null;
        if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
      } else {
        if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
      }
    } else {
      if (!a.q410) return { key: 'q410', label: '4.10  Was an alternative appropriate method used to handle missing data?', options: ['Y/PY', 'WN/NI', 'SN'] };
      if (a.q410 === 'Y/PY' || a.q410 === 'SN') return null;
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    }
  } else {
    // Complete case path
    if (!a.q45) return { key: 'q45', label: '4.5  Were the exclusions from analysis related to the true value of the outcome?', options: ['N/PN', 'Y/PY/NI'] };
    if (a.q45 === 'N/PN') {
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    } else {
      if (!a.q46) return { key: 'q46', label: '4.6  Was the outcome-missingness relationship appropriately modelled?', options: ['Y/PY', 'WN/NI', 'SN'] };
      if (a.q46 === 'SN') return null;
      if (!a.q411) return { key: 'q411', label: Q411_LABEL, options: ['Y/PY', 'N/PN'] };
    }
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Domain4Graph() {
  const [answers, setAnswers] = useState<Answers>({
    q413: null, q44: null, q45: null, q46: null, q47: null,
    q48: null, q49: null, q410: null, q411: null,
  });
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
  const reset  = () => setAnswers({ q413: null, q44: null, q45: null, q46: null, q47: null, q48: null, q49: null, q410: null, q411: null });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif', background: '#fefce8' }}>
      <div style={{ background: '#713f12', color: '#fff', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>Domain 4</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Bias due to missing data</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 1 }}>Most complex domain — multiple paths for complete case vs imputation vs alternative method</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.1 }}
          nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
          <Background color="#fef08a" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '14px 20px', flexShrink: 0, minHeight: 80 }}>
        {outcome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: OUTCOME_C[outcome].bg, color: OUTCOME_C[outcome].text,
              border: `2px solid ${OUTCOME_C[outcome].border}`,
              borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 14 }}>
              Domain 4: {outcome.toUpperCase()}
            </div>
            <button onClick={reset} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>↺ Reset</button>
          </div>
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
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 12 }}>Click an answer to start.</div>
        )}
      </div>
    </div>
  );
}
