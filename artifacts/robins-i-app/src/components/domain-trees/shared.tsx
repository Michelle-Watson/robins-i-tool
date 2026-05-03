/**
 * shared.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared building blocks reused across all 7 ROBINS-I domain decision trees.
 */

import { Handle, Position, MarkerType, type NodeProps, type Node, type Edge } from '@xyflow/react';

// ─── Risk level type ──────────────────────────────────────────────────────────
export type RiskLevel = 'low' | 'low-except' | 'moderate' | 'serious' | 'critical';

export interface DomainGraphProps {
  onOutcome?: (outcome: RiskLevel | null) => void;
  onAnswersChange?: (answers: Record<string, any>) => void;
  initialAnswers?: Record<string, any>;
}

// ─── Outcome colour palette ───────────────────────────────────────────────────
export const OUTCOME_C: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  'low':        { bg: '#dcfce7', border: '#16a34a', text: '#14532d' }, // green
  'low-except': { bg: '#fef9c3', border: '#ca8a04', text: '#78350f' }, // yellow
  'moderate':   { bg: '#fed7aa', border: '#ea580c', text: '#7c2d12' }, // orange
  'serious':    { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' }, // red
  'critical':   { bg: '#1c1917', border: '#57534e', text: '#fafaf9' }, // black
};

// ─── Custom node: Question box ────────────────────────────────────────────────
export interface QData extends Record<string, unknown> {
  qid: string;
  shortLabel: string;
  active: boolean;
}

export function QuestionNode({ data, style: accentStyle }: NodeProps<Node<QData>> & { style?: React.CSSProperties }) {
  const { qid, shortLabel, active } = data;
  const accent = (accentStyle as { color?: string })?.color ?? '#2563eb';
  return (
    <div style={{ opacity: active ? 1 : 0.22, transition: 'opacity .3s' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      <div style={{
        width: 188, padding: '8px 10px', borderRadius: 10, fontSize: 11, lineHeight: 1.45,
        border: `2px solid ${active ? accent : '#94a3b8'}`,
        background: active ? `${accent}18` : '#f8fafc',
        boxShadow: active ? `0 2px 8px ${accent}33` : 'none',
      }}>
        <span style={{
          background: accent, color: '#fff', borderRadius: 999,
          padding: '1px 8px', fontSize: 10, fontWeight: 700,
          display: 'inline-block', marginBottom: 5,
        }}>
          {qid}
        </span>
        <div style={{ color: '#1e293b' }}>{shortLabel}</div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#475569', width: 8, height: 8 }} />
    </div>
  );
}

// ─── Custom node: Outcome box ─────────────────────────────────────────────────
export interface OData extends Record<string, unknown> {
  level: RiskLevel;
  label: string;
  active: boolean;
}

export function OutcomeNode({ data }: NodeProps<Node<OData>>) {
  const { level, label, active } = data;
  const c = OUTCOME_C[level];
  return (
    <div style={{ opacity: active ? 1 : 0.14, transition: 'opacity .3s' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#475569', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: 'transparent', width: 0, height: 0, border: 'none' }} />
      <div style={{
        width: 138, padding: '10px 14px', borderRadius: 10, textAlign: 'center',
        border: `3px solid ${active ? c.border : '#cbd5e1'}`,
        background: active ? c.bg : '#f1f5f9',
        color: active ? c.text : '#94a3b8',
        fontSize: 12, fontWeight: 800, lineHeight: 1.3,
        boxShadow: active ? `0 0 18px ${c.border}66` : 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Edge factory ─────────────────────────────────────────────────────────────
export const ARROW = { type: MarkerType.ArrowClosed, width: 14, height: 14 } as const;

export const STYLE_INACTIVE = { stroke: '#cbd5e1', strokeWidth: 1.5 };
export const STYLE_ACTIVE   = { stroke: '#2563eb', strokeWidth: 2.5 };
export const STYLE_GOOD     = { stroke: '#16a34a', strokeWidth: 2.5 };
export const STYLE_BAD      = { stroke: '#dc2626', strokeWidth: 2.5 };

export function mkEdge(id: string, source: string, target: string, label: string, style = STYLE_INACTIVE): Edge {
  return {
    id, source, target, label,
    type: 'smoothstep',
    markerEnd: { ...ARROW, color: style.stroke },
    style,
    labelStyle: { fontSize: 10, fontWeight: 600, fill: '#475569' },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.92 },
    labelBgPadding: [4, 2] as [number, number],
    animated: false,
  };
}

// ─── Answered Questions Panel ─────────────────────────────────────────────────

/** One answered signalling question shown as a pill with a Change button. */
export interface AnsweredItem {
  key: string;    // answer state key, e.g. 'q11'
  label: string;  // short display label, e.g. '1.1'
  value: string;  // the chosen answer, e.g. 'Y/PY'
}

/**
 * Renders a row of answered-question pills beneath the current-step area.
 * Each pill shows "Q label + chosen value + pencil icon"; clicking it calls
 * onChangeKey so the host component can clear that answer and all downstream
 * answers, then re-enter the decision-tree from that point.
 */
export function PreviousAnswersPanel({
  items, onChangeKey, accent,
}: {
  items: AnsweredItem[];
  onChangeKey: (key: string) => void;
  accent: string;
}) {
  if (!items.length) return null;
  return (
    <div style={{
      borderTop: '1px solid #f1f5f9', marginTop: 8, paddingTop: 8,
      display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
    }}>
      {/* Label */}
      <span style={{
        fontSize: 10, color: '#94a3b8', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 1, marginRight: 4, flexShrink: 0,
      }}>
        Answered:
      </span>
      {/* One pill per answered question */}
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChangeKey(item.key)}
          title={`Re-answer question ${item.label} (clears this and all downstream answers)`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px 3px 10px', borderRadius: 20, cursor: 'pointer',
            fontSize: 11, border: `1.5px solid ${accent}55`,
            background: `${accent}0d`, color: '#334155', lineHeight: 1.2,
          }}
        >
          {/* Question number */}
          <span style={{ opacity: 0.55, fontWeight: 600 }}>{item.label}</span>
          {/* Chosen value badge */}
          <span style={{
            background: accent, color: '#fff', borderRadius: 999,
            padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 2,
          }}>{item.value}</span>
          {/* Edit icon hint */}
          <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 1 }}>✎</span>
        </button>
      ))}
    </div>
  );
}

export type { Node, Edge };
