/**
 * shared.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared building blocks reused across all 7 ROBINS-I domain decision trees.
 *
 * WHY A SHARED FILE?
 * Each domain graph needs the same custom node shapes (question box, outcome
 * box) and the same edge-creation helper. Putting them here avoids copy-paste
 * and keeps every domain file focused on its own algorithm.
 *
 * SOURCE: ROBINS-I V2 cribsheet (November 2025 edition). All question text,
 * response options, and algorithm paths are derived from the PDF algorithm
 * images supplied at project start.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Handle, Position, MarkerType, type NodeProps, type Node, type Edge } from '@xyflow/react';

// ─── Risk level type ──────────────────────────────────────────────────────────
// Covers all possible ROBINS-I domain judgement outcomes.
// 'low' is the pure green "LOW RISK OF BIAS" box.
// 'low-except' is the yellow "LOW except for uncontrolled confounding" box.
export type RiskLevel = 'low' | 'low-except' | 'moderate' | 'serious' | 'critical';

// ─── Outcome colour palette ───────────────────────────────────────────────────
// Colours match the original ROBINS-I PDF algorithm image palette.
export const OUTCOME_C: Record<RiskLevel, { bg: string; border: string; text: string }> = {
  'low':        { bg: '#dcfce7', border: '#16a34a', text: '#14532d' }, // green
  'low-except': { bg: '#fef9c3', border: '#ca8a04', text: '#78350f' }, // yellow
  'moderate':   { bg: '#fed7aa', border: '#ea580c', text: '#7c2d12' }, // orange
  'serious':    { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' }, // red
  'critical':   { bg: '#1c1917', border: '#57534e', text: '#fafaf9' }, // black
};

// ─── Custom node: Question box ────────────────────────────────────────────────
// Renders a rounded rectangle with a numbered badge (e.g. "2.4") and short
// question text.  The `active` flag fades or highlights the box to reflect
// whether this node lies on the currently-selected answer path.
export interface QData extends Record<string, unknown> {
  qid: string;        // question number shown in the badge, e.g. "1.1"
  shortLabel: string; // abbreviated question text shown inside the box
  active: boolean;    // true when this node is on the selected answer path
}

export function QuestionNode({ data, style: accentStyle }: NodeProps<Node<QData>> & { style?: React.CSSProperties }) {
  const { qid, shortLabel, active } = data;
  // Use the accent colour passed by the domain (blue for 1A, purple for 1B, etc.)
  // or fall back to a neutral blue.
  const accent = (accentStyle as { color?: string })?.color ?? '#2563eb';
  return (
    <div style={{ opacity: active ? 1 : 0.22, transition: 'opacity .3s' }}>
      {/* Left connection handle – incoming edges attach here */}
      <Handle type="target" position={Position.Left}
        style={{ background: '#475569', width: 8, height: 8 }} />

      <div style={{
        width: 188,
        padding: '8px 10px',
        borderRadius: 10,
        fontSize: 11,
        lineHeight: 1.45,
        border: `2px solid ${active ? accent : '#94a3b8'}`,
        background: active ? `${accent}18` : '#f8fafc',
        boxShadow: active ? `0 2px 8px ${accent}33` : 'none',
      }}>
        {/* Badge showing question number */}
        <span style={{
          background: accent, color: '#fff', borderRadius: 999,
          padding: '1px 8px', fontSize: 10, fontWeight: 700,
          display: 'inline-block', marginBottom: 5,
        }}>
          {qid}
        </span>
        {/* Short question label */}
        <div style={{ color: '#1e293b' }}>{shortLabel}</div>
      </div>

      {/* Right connection handle – outgoing edges leave from here */}
      <Handle type="source" position={Position.Right}
        style={{ background: '#475569', width: 8, height: 8 }} />
    </div>
  );
}

// ─── Custom node: Outcome box ─────────────────────────────────────────────────
// Renders a coloured box showing the final risk-of-bias judgement.
// Glows when active (i.e. this is the current path's outcome).
export interface OData extends Record<string, unknown> {
  level: RiskLevel;   // determines colour scheme
  label: string;      // text shown inside the box
  active: boolean;    // true when this is the resolved outcome
}

export function OutcomeNode({ data }: NodeProps<Node<OData>>) {
  const { level, label, active } = data;
  const c = OUTCOME_C[level];
  return (
    <div style={{ opacity: active ? 1 : 0.14, transition: 'opacity .3s' }}>
      {/* Incoming handle from predecessor edges */}
      <Handle type="target" position={Position.Left}
        style={{ background: '#475569', width: 8, height: 8 }} />
      {/* Source handle needed for intermediate outcomes (e.g. Domain 3 sub-graph
          results feeding into the combined section). Invisible on final outcomes. */}
      <Handle type="source" position={Position.Right}
        style={{ background: 'transparent', width: 0, height: 0, border: 'none' }} />

      <div style={{
        width: 138,
        padding: '10px 14px',
        borderRadius: 10,
        textAlign: 'center',
        border: `3px solid ${active ? c.border : '#cbd5e1'}`,
        background: active ? c.bg : '#f1f5f9',
        color: active ? c.text : '#94a3b8',
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.3,
        boxShadow: active ? `0 0 18px ${c.border}66` : 'none',
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Edge factory ─────────────────────────────────────────────────────────────
// Creates a React Flow edge object with consistent styling.
// Each edge represents one answer option on a path between two graph nodes.
export const ARROW = { type: MarkerType.ArrowClosed, width: 14, height: 14 } as const;

export const STYLE_INACTIVE = { stroke: '#cbd5e1', strokeWidth: 1.5 };
export const STYLE_ACTIVE   = { stroke: '#2563eb', strokeWidth: 2.5 };
export const STYLE_GOOD     = { stroke: '#16a34a', strokeWidth: 2.5 }; // → LOW / MODERATE
export const STYLE_BAD      = { stroke: '#dc2626', strokeWidth: 2.5 }; // → SERIOUS / CRITICAL

/**
 * mkEdge – creates a React Flow Edge definition.
 * @param id     Unique edge identifier
 * @param source Node id that the edge starts from
 * @param target Node id that the edge points to
 * @param label  Answer option shown on the edge (e.g. "Y/PY", "N/PN/NI")
 * @param style  Stroke colour/width – defaults to STYLE_INACTIVE
 */
export function mkEdge(
  id: string,
  source: string,
  target: string,
  label: string,
  style = STYLE_INACTIVE,
): Edge {
  return {
    id, source, target, label,
    type: 'smoothstep',                              // curved routing avoids straight-line overlaps
    markerEnd: { ...ARROW, color: style.stroke },   // arrowhead colour matches stroke
    style,
    labelStyle: { fontSize: 10, fontWeight: 600, fill: '#475569' },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.92 },
    labelBgPadding: [4, 2] as [number, number],
    animated: false,
  };
}

// ─── Re-export xyflow deps used by every domain file ─────────────────────────
// Domain files import everything they need from this one place.
export type { Node, Edge };
