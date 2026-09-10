'use client';

import type { CustomSchema, SchemaLive, SchemaNode, Pipe, Probe } from '@/lib/schema-custom';
import { PIPE_COLORS, tempColor } from '@/lib/schema-custom';
import { COMPONENT_MAP } from '@/lib/schema-components';

// ─────────────────────────────────────────────────────────────────────────────
// Rendu d'un schéma personnalisé. Lecture seule : sert le dashboard client et la
// page technicien publique. L'éditeur (phase 2) réutilisera ce même rendu.
// ─────────────────────────────────────────────────────────────────────────────

function fmtTemp(v?: number | null): string {
  return v != null ? `${Number(v).toFixed(1)}°` : '—';
}

function NodeView({ n }: { n: SchemaNode }) {
  const def = COMPONENT_MAP[n.type];
  if (!def) return null;
  const w = n.w ?? def.w;
  const h = n.h ?? def.h;
  const cx = n.x + w / 2;
  const cy = n.y + h / 2;
  const rot = n.rot ?? 0;
  const sx = n.flip ? -1 : 1;

  return (
    <g transform={`translate(${n.x},${n.y})`}>
      <g transform={`rotate(${rot} ${w / 2} ${h / 2}) scale(${sx} 1) ${n.flip ? `translate(${-w} 0)` : ''}`}>
        {def.render()}
      </g>
      <text x={w / 2} y={h + 14} textAnchor="middle" fontSize={11} fontWeight={500}
        fill="#3a3a3c" fontFamily="system-ui, sans-serif">
        {n.label ?? def.name}
      </text>
      {/* garde cx/cy « utilisés » pour de futurs badges centrés */}
      <metadata>{`${cx},${cy}`}</metadata>
    </g>
  );
}

function PipeView({ p }: { p: Pipe }) {
  if (p.points.length < 2) return null;
  const d = p.points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
  const color = PIPE_COLORS[p.color];
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={4}
      strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={p.style === 'dashed' ? '2 9' : undefined}
      opacity={0.9} />
  );
}

function ProbeView({ pr, live }: { pr: Probe; live?: SchemaLive }) {
  if (pr.kind === 'debitmetre') {
    const key = pr.binding as 'debit1' | 'debit2' | null;
    const lph = key ? live?.debits?.[key] : null;
    const active = lph != null && lph > 0;
    const c = active ? '#0071e3' : '#8e8e93';
    return (
      <g transform={`translate(${pr.x},${pr.y})`}>
        <circle r={13} fill="#fff" stroke={c} strokeWidth={2} />
        <path d="M0,-6 C4,-1 5,2 0,6 C-5,2 -4,-1 0,-6 Z" fill={c} />
        <rect x={-30} y={16} width={60} height={18} rx={9} fill="#fff" stroke={c} strokeWidth={1.2} />
        <text x={0} y={29} textAnchor="middle" fontSize={10} fontWeight={600} fill={c}
          fontFamily="system-ui, sans-serif">
          {lph != null ? `${Math.round(lph)} L/h` : '—'}
        </text>
      </g>
    );
  }
  // sonde
  const t = pr.binding ? live?.temps?.[pr.binding] : null;
  const c = tempColor(t);
  return (
    <g transform={`translate(${pr.x},${pr.y})`}>
      <circle r={5} fill={c} stroke="#fff" strokeWidth={1.5} />
      <rect x={-33} y={10} width={66} height={22} rx={11} fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.4} />
      <text x={0} y={25} textAnchor="middle" fontSize={11} fontWeight={600} fill={c}
        fontFamily="system-ui, sans-serif">
        {fmtTemp(t)}
      </text>
      <text x={0} y={-10} textAnchor="middle" fontSize={9} fill="#8e8e93" fontFamily="system-ui, sans-serif">
        {pr.label}
      </text>
    </g>
  );
}

export default function SchemaCanvas({
  schema, live, className,
}: { schema: CustomSchema; live?: SchemaLive; className?: string }) {
  const { w, h, grid } = schema.canvas;
  const dots: { x: number; y: number }[] = [];
  for (let x = grid; x < w; x += grid) for (let y = grid; y < h; y += grid) dots.push({ x, y });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg">
      {/* grille de points aimantés */}
      {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={0.8} fill="#d1d1d6" />)}
      {/* tuyaux (sous les composants) */}
      {schema.pipes.map((p) => <PipeView key={p.id} p={p} />)}
      {/* composants */}
      {schema.nodes.map((n) => <NodeView key={n.id} n={n} />)}
      {/* sondes & débitmètres (au-dessus) */}
      {schema.probes.map((pr) => <ProbeView key={pr.id} pr={pr} live={live} />)}
    </svg>
  );
}
