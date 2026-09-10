'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  type CustomSchema, type SchemaNode, type Rotation, type Pt,
  type PipeColor, type PipeStyle, type Pipe, type Probe, type ProbeKind,
  PIPE_COLORS, VBUS_FIELDS, VBUS_LABELS, bindingLabel, snap, emptySchema,
} from '@/lib/schema-custom';
import {
  COMPONENT_MAP, CATEGORIES, searchComponents, type ComponentDef,
} from '@/lib/schema-components';

// ─────────────────────────────────────────────────────────────────────────────
// Éditeur de schéma (phases 2-4) : boutique + pose de composants + grille
// aimantée + déplacement/rotation/suppression + tracé des tuyaux (couleur/style,
// routage orthogonal) + pose et liaison des sondes/débitmètres + undo/redo +
// sauvegarde.
// ─────────────────────────────────────────────────────────────────────────────

type State = { past: CustomSchema[]; present: CustomSchema; future: CustomSchema[]; selected: string | null };
type Action =
  | { type: 'load'; schema: CustomSchema }
  | { type: 'commit'; schema: CustomSchema; selected?: string | null }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'load':
      return { past: [], present: a.schema, future: [], selected: null };
    case 'commit':
      return {
        past: [...s.past, s.present], present: a.schema, future: [],
        selected: a.selected !== undefined ? a.selected : s.selected,
      };
    case 'select':
      return { ...s, selected: a.id };
    case 'undo': {
      if (s.past.length === 0) return s;
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], selected: null };
    }
    case 'redo': {
      if (s.future.length === 0) return s;
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), selected: null };
    }
  }
}

type Mode = 'select' | 'pipe' | 'probe';
const uid = (p = 'n') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ANCHOR_HIT = 14;

function clientToSvg(svg: SVGSVGElement, cx: number, cy: number) {
  const m = svg.getScreenCTM();
  if (!m) return { x: cx, y: cy };
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

function localToAbs(n: SchemaNode, def: ComponentDef, lx: number, ly: number): Pt {
  const w = n.w ?? def.w, h = n.h ?? def.h;
  const x = n.flip ? w - lx : lx;
  const y = ly;
  const rad = ((n.rot ?? 0) * Math.PI) / 180;
  const dx = x - w / 2, dy = y - h / 2;
  const rx = w / 2 + dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = h / 2 + dx * Math.sin(rad) + dy * Math.cos(rad);
  return { x: Math.round(n.x + rx), y: Math.round(n.y + ry) };
}

type AbsAnchor = { node: string; anchor: string; x: number; y: number };

function orthoAppend(points: Pt[], p: Pt): Pt[] {
  const L = points[points.length - 1];
  if (!L || L.x === p.x || L.y === p.y) return [...points, p];
  return [...points, { x: p.x, y: L.y }, p];
}
function pipePath(points: Pt[]): string {
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
}

function NodeSymbol({ n }: { n: SchemaNode }) {
  const def = COMPONENT_MAP[n.type];
  if (!def) return null;
  const w = n.w ?? def.w, h = n.h ?? def.h;
  const sx = n.flip ? -1 : 1;
  return (
    <g transform={`rotate(${n.rot ?? 0} ${w / 2} ${h / 2}) scale(${sx} 1) ${n.flip ? `translate(${-w} 0)` : ''}`}>
      {def.render()}
    </g>
  );
}

export default function SchemaEditor({ deviceId, initial, deviceName, sensorRoles = [] }: {
  deviceId: string; initial: CustomSchema | null; deviceName: string; sensorRoles?: string[];
}) {
  const [state, dispatch] = useReducer(reducer, {
    past: [], present: initial ?? emptySchema(), future: [], selected: null,
  });
  const schema = state.present;

  const [q, setQ] = useState('');
  const [mode, setMode] = useState<Mode>('select');
  const [pending, setPending] = useState<string | null>(null);
  const [probeKind, setProbeKind] = useState<ProbeKind>('sonde');
  const [selPipe, setSelPipe] = useState<string | null>(null);
  const [selProbe, setSelProbe] = useState<string | null>(null);
  const [pipeColor, setPipeColor] = useState<PipeColor>('red');
  const [pipeStyle, setPipeStyle] = useState<PipeStyle>('solid');
  const [draft, setDraft] = useState<{ from?: { node: string; anchor: string }; points: Pt[] } | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ kind: 'node' | 'probe'; id: string; offX: number; offY: number } | null>(null);
  const [dragPos, setDragPos] = useState<{ kind: 'node' | 'probe'; id: string; x: number; y: number } | null>(null);

  const results = searchComponents(q);
  const byCat = CATEGORIES
    .map((cat) => ({ cat, items: results.filter((c) => c.category === cat) }))
    .filter((g) => g.items.length > 0);

  const selectedNode = schema.nodes.find((n) => n.id === state.selected) ?? null;
  const selectedPipe = schema.pipes.find((p) => p.id === selPipe) ?? null;
  const selectedProbe = schema.probes.find((p) => p.id === selProbe) ?? null;

  const anchors: AbsAnchor[] = [];
  for (const n of schema.nodes) {
    const def = COMPONENT_MAP[n.type];
    if (!def) continue;
    for (const a of def.anchors) {
      const p = localToAbs(n, def, a.x, a.y);
      anchors.push({ node: n.id, anchor: a.id, x: p.x, y: p.y });
    }
  }
  function nearestAnchor(p: Pt): AbsAnchor | null {
    let best: AbsAnchor | null = null, bd = ANCHOR_HIT * ANCHOR_HIT;
    for (const a of anchors) {
      const d = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
      if (d <= bd) { bd = d; best = a; }
    }
    return best;
  }

  function clearSel() { dispatch({ type: 'select', id: null }); setSelPipe(null); setSelProbe(null); }

  // ── Mutations ────────────────────────────────────────────────────────────
  const patchNode = useCallback((id: string, patch: Partial<SchemaNode>) => {
    dispatch({ type: 'commit', schema: { ...schema, nodes: schema.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) } });
  }, [schema]);
  const patchProbe = useCallback((id: string, patch: Partial<Probe>) => {
    dispatch({ type: 'commit', schema: { ...schema, probes: schema.probes.map((p) => (p.id === id ? { ...p, ...patch } : p)) } });
  }, [schema]);
  const updatePipe = useCallback((id: string, patch: Partial<Pipe>) => {
    dispatch({ type: 'commit', schema: { ...schema, pipes: schema.pipes.map((p) => (p.id === id ? { ...p, ...patch } : p)) } });
  }, [schema]);

  const addNode = useCallback((type: string, x: number, y: number) => {
    const def = COMPONENT_MAP[type];
    if (!def) return;
    const node: SchemaNode = { id: uid(), type, x: snap(x - def.w / 2), y: snap(y - def.h / 2), rot: 0, label: def.name };
    dispatch({ type: 'commit', schema: { ...schema, nodes: [...schema.nodes, node] }, selected: node.id });
    setSelPipe(null); setSelProbe(null);
  }, [schema]);

  const addProbe = useCallback((kind: ProbeKind, x: number, y: number) => {
    const probe: Probe = {
      id: uid('s'), kind, x: snap(x), y: snap(y), binding: null,
      label: kind === 'sonde' ? 'Sonde' : 'Débitmètre',
    };
    dispatch({ type: 'commit', schema: { ...schema, probes: [...schema.probes, probe] }, selected: null });
    setSelPipe(null); setSelProbe(probe.id);
  }, [schema]);

  const deleteSelected = useCallback(() => {
    if (state.selected) {
      dispatch({ type: 'commit', schema: { ...schema, nodes: schema.nodes.filter((n) => n.id !== state.selected) }, selected: null });
    } else if (selPipe) {
      dispatch({ type: 'commit', schema: { ...schema, pipes: schema.pipes.filter((p) => p.id !== selPipe) } });
      setSelPipe(null);
    } else if (selProbe) {
      dispatch({ type: 'commit', schema: { ...schema, probes: schema.probes.filter((p) => p.id !== selProbe) } });
      setSelProbe(null);
    }
  }, [schema, state.selected, selPipe, selProbe]);

  // ── Tracé de tuyau ─────────────────────────────────────────────────────────
  function commitPipe(points: Pt[], from?: { node: string; anchor: string }, to?: { node: string; anchor: string }) {
    if (points.length < 2) return;
    const pipe: Pipe = { id: uid('p'), color: pipeColor, style: pipeStyle, points, from, to };
    dispatch({ type: 'commit', schema: { ...schema, pipes: [...schema.pipes, pipe] } });
  }
  function pipeClick(raw: Pt) {
    const a = nearestAnchor(raw);
    const pt = a ? { x: a.x, y: a.y } : { x: snap(raw.x), y: snap(raw.y) };
    if (!draft) { setDraft({ from: a ? { node: a.node, anchor: a.anchor } : undefined, points: [pt] }); return; }
    const pts = orthoAppend(draft.points, pt);
    if (a && draft.points.length >= 1) { commitPipe(pts, draft.from, { node: a.node, anchor: a.anchor }); setDraft(null); }
    else setDraft({ ...draft, points: pts });
  }
  const finishOpenPipe = useCallback(() => {
    if (draft && draft.points.length >= 2) commitPipe(draft.points, draft.from);
    setDraft(null);
  }, [draft, pipeColor, pipeStyle, schema]);

  // ── Clavier ──────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.key === 'Escape') { setDraft(null); setPending(null); }
      else if (e.key === 'Enter' && draft) { e.preventDefault(); finishOpenPipe(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && (state.selected || selPipe || selProbe)) { e.preventDefault(); deleteSelected(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'undo' }); }
      else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); dispatch({ type: 'redo' }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.selected, selPipe, selProbe, draft, deleteSelected, finishOpenPipe]);

  // ── Souris ─────────────────────────────────────────────────────────────────
  function startDrag(e: React.PointerEvent, kind: 'node' | 'probe', id: string, x: number, y: number) {
    if (mode !== 'select') return;
    e.stopPropagation();
    clearSel();
    if (kind === 'node') dispatch({ type: 'select', id }); else setSelProbe(id);
    if (!svgRef.current) return;
    const p = clientToSvg(svgRef.current, e.clientX, e.clientY);
    drag.current = { kind, id, offX: p.x - x, offY: p.y - y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onSvgPointerMove(e: React.PointerEvent) {
    if (!svgRef.current) return;
    const p = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (drag.current) {
      setDragPos({ kind: drag.current.kind, id: drag.current.id, x: snap(p.x - drag.current.offX), y: snap(p.y - drag.current.offY) });
    } else if (mode === 'pipe' && draft) {
      const a = nearestAnchor(p);
      setHover(a ? { x: a.x, y: a.y } : { x: snap(p.x), y: snap(p.y) });
    }
  }
  function onSvgPointerUp() {
    if (drag.current && dragPos) {
      if (drag.current.kind === 'node') patchNode(drag.current.id, { x: dragPos.x, y: dragPos.y });
      else patchProbe(drag.current.id, { x: dragPos.x, y: dragPos.y });
    }
    drag.current = null;
    setDragPos(null);
  }
  function onSvgPointerDown(e: React.PointerEvent) {
    if (!svgRef.current) return;
    const p = clientToSvg(svgRef.current, e.clientX, e.clientY);
    if (mode === 'pipe') { pipeClick(p); return; }
    if (mode === 'probe') { addProbe(probeKind, p.x, p.y); return; }
    if (pending) { addNode(pending, p.x, p.y); setPending(null); return; }
    clearSel();
  }

  async function save() {
    setSaving(true); setSaved(false);
    const { error } = await supabase.from('device_schemas').upsert(
      { device_id: deviceId, config: schema, updated_at: new Date().toISOString() }, { onConflict: 'device_id' });
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert(`Erreur de sauvegarde : ${error.message}`);
  }

  function switchMode(m: Mode) {
    setMode(m); setDraft(null); setPending(null); clearSel();
  }

  const { w, h, grid } = schema.canvas;
  const dots: Pt[] = [];
  for (let x = grid; x < w; x += grid) for (let y = grid; y < h; y += grid) dots.push({ x, y });
  const draftPreview = draft ? (hover ? orthoAppend(draft.points, hover) : draft.points) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_240px] gap-4">
      {/* ── Boutique ─────────────────────────────────────────────────────── */}
      <div className="app-card p-3 h-fit order-2 lg:order-1">
        <h2 className="text-[14px] font-semibold text-[#1d1d1f] mb-2">Boutique</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="app-input w-full mb-3 text-[13px]" />
        <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
          {byCat.length === 0 && <p className="text-[13px] text-[#8e8e93]">Aucun résultat.</p>}
          {byCat.map(({ cat, items }) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8e8e93] mb-1.5">{cat}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {items.map((def) => (
                  <PaletteCard key={def.type} def={def} active={pending === def.type}
                    onPick={() => { switchMode('select'); setPending((p) => (p === def.type ? null : def.type)); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan ─────────────────────────────────────────────────────────── */}
      <div className="app-card p-3 order-1 lg:order-2">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="inline-flex rounded-full bg-[#f2f2f7] p-0.5">
            {(['select', 'pipe', 'probe'] as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={`px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${mode === m ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                {m === 'select' ? 'Sélection' : m === 'pipe' ? 'Tuyau' : 'Sonde'}
              </button>
            ))}
          </div>

          {mode === 'pipe' && (
            <div className="flex items-center gap-2">
              {(['red', 'blue', 'green'] as PipeColor[]).map((c) => (
                <button key={c} onClick={() => setPipeColor(c)} title={c} className="w-6 h-6 rounded-full border-2 transition-transform"
                  style={{ background: PIPE_COLORS[c], borderColor: pipeColor === c ? '#1d1d1f' : 'transparent', transform: pipeColor === c ? 'scale(1.1)' : 'scale(1)' }} />
              ))}
              <button onClick={() => setPipeStyle((s) => (s === 'solid' ? 'dashed' : 'solid'))} className="btn btn-secondary text-[12px]">
                {pipeStyle === 'solid' ? '— continu' : '┄ pointillé'}
              </button>
            </div>
          )}
          {mode === 'probe' && (
            <div className="inline-flex rounded-full bg-[#f2f2f7] p-0.5">
              {(['sonde', 'debitmetre'] as ProbeKind[]).map((k) => (
                <button key={k} onClick={() => setProbeKind(k)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${probeKind === k ? 'bg-white shadow-sm text-[#1d1d1f]' : 'text-[#6e6e73]'}`}>
                  {k === 'sonde' ? '🌡 Sonde' : '💧 Débitmètre'}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1" />
          <button className="btn btn-ghost text-[13px]" disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>↶</button>
          <button className="btn btn-ghost text-[13px]" disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>↷</button>
          <button className="btn btn-primary text-[13px]" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const type = e.dataTransfer.getData('component'); if (type && svgRef.current) { const p = clientToSvg(svgRef.current, e.clientX, e.clientY); addNode(type, p.x, p.y); } }}
          className="rounded-2xl bg-white border border-[#e5e5ea] overflow-hidden" style={{ touchAction: 'none' }}>
          <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`}
            style={{ width: '100%', height: 'auto', display: 'block', cursor: pending || mode !== 'select' ? 'crosshair' : 'default' }}
            onPointerMove={onSvgPointerMove} onPointerUp={onSvgPointerUp} onPointerLeave={onSvgPointerUp}
            onPointerDown={onSvgPointerDown} xmlns="http://www.w3.org/2000/svg">
            {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={0.8} fill="#d1d1d6" />)}

            {/* tuyaux */}
            {schema.pipes.map((p) => p.points.length >= 2 && (
              <g key={p.id}>
                {selPipe === p.id && <path d={pipePath(p.points)} fill="none" stroke="#0071e3" strokeWidth={11} opacity={0.3} strokeLinecap="round" strokeLinejoin="round" />}
                <path d={pipePath(p.points)} fill="none" stroke={PIPE_COLORS[p.color]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={p.style === 'dashed' ? '2 9' : undefined} />
                <path d={pipePath(p.points)} fill="none" stroke="transparent" strokeWidth={16}
                  style={{ pointerEvents: mode === 'select' ? 'stroke' : 'none', cursor: 'pointer' }}
                  onPointerDown={(e) => { e.stopPropagation(); clearSel(); setSelPipe(p.id); }} />
                {selPipe === p.id && p.points.map((pt, i) => <rect key={i} x={pt.x - 4} y={pt.y - 4} width={8} height={8} rx={2} fill="#fff" stroke="#0071e3" strokeWidth={2} />)}
              </g>
            ))}

            {/* aperçu du tracé en cours */}
            {draftPreview && draftPreview.length >= 1 && (
              <>
                <path d={pipePath(draftPreview)} fill="none" stroke={PIPE_COLORS[pipeColor]} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} strokeDasharray={pipeStyle === 'dashed' ? '2 9' : undefined} />
                {draft!.points.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={PIPE_COLORS[pipeColor]} />)}
              </>
            )}

            {/* nodes */}
            {schema.nodes.map((n) => {
              const def = COMPONENT_MAP[n.type];
              if (!def) return null;
              const isDragged = dragPos?.kind === 'node' && dragPos.id === n.id;
              const nx = isDragged ? dragPos!.x : n.x;
              const ny = isDragged ? dragPos!.y : n.y;
              const nw = n.w ?? def.w, nh = n.h ?? def.h;
              const sel = state.selected === n.id && mode === 'select';
              return (
                <g key={n.id} transform={`translate(${nx},${ny})`} style={{ cursor: mode === 'select' ? 'grab' : 'inherit' }}
                  onPointerDown={(e) => startDrag(e, 'node', n.id, nx, ny)}>
                  {sel && <rect x={-6} y={-6} width={nw + 12} height={nh + 12} rx={8} fill="#0071e3" fillOpacity={0.06} stroke="#0071e3" strokeWidth={1.5} strokeDasharray="4 3" />}
                  <NodeSymbol n={{ ...n, x: 0, y: 0 }} />
                  <text x={nw / 2} y={nh + 14} textAnchor="middle" fontSize={11} fontWeight={500} fill="#3a3a3c">{n.label ?? def.name}</text>
                </g>
              );
            })}

            {/* sondes & débitmètres */}
            {schema.probes.map((pr) => {
              const isDragged = dragPos?.kind === 'probe' && dragPos.id === pr.id;
              const px = isDragged ? dragPos!.x : pr.x;
              const py = isDragged ? dragPos!.y : pr.y;
              const sel = selProbe === pr.id && mode === 'select';
              const bound = !!pr.binding;
              const c = pr.kind === 'debitmetre' ? '#0071e3' : bound ? '#34C759' : '#8e8e93';
              return (
                <g key={pr.id} transform={`translate(${px},${py})`} style={{ cursor: mode === 'select' ? 'grab' : 'inherit' }}
                  onPointerDown={(e) => startDrag(e, 'probe', pr.id, px, py)}>
                  <circle r={15} fill="transparent" />{/* zone de capture élargie */}
                  {sel && <circle r={16} fill="#0071e3" fillOpacity={0.08} stroke="#0071e3" strokeWidth={1.5} strokeDasharray="4 3" />}
                  {pr.kind === 'debitmetre'
                    ? <><circle r={11} fill="#fff" stroke={c} strokeWidth={2} /><path d="M0,-5 C3,-1 4,1 0,5 C-4,1 -3,-1 0,-5 Z" fill={c} /></>
                    : <circle r={6} fill={c} stroke="#fff" strokeWidth={1.5} />}
                  <text x={0} y={-12} textAnchor="middle" fontSize={9} fill="#6e6e73">{pr.label}</text>
                  <text x={0} y={24} textAnchor="middle" fontSize={9} fontWeight={600} fill={bound ? '#3a3a3c' : '#FF9500'}>
                    {bound ? bindingLabel(pr.binding) : 'à relier'}
                  </text>
                </g>
              );
            })}

            {/* ancrages (mode tuyau) */}
            {mode === 'pipe' && anchors.map((a, i) => (
              <circle key={i} cx={a.x} cy={a.y} r={4} fill="#fff" stroke="#0071e3" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
            ))}
          </svg>
        </div>

        <p className="text-[12px] text-[#8e8e93] mt-2">
          {mode === 'pipe'
            ? (draft ? <span className="text-[#0071e3] font-medium">Cliquez les points ; terminez sur un ancrage (<kbd>Entrée</kbd>, <kbd>Échap</kbd> annule).</span>
              : <>Cliquez un <span className="text-[#0071e3]">ancrage</span> pour démarrer un tuyau.</>)
            : mode === 'probe'
              ? <span className="text-[#0071e3] font-medium">Cliquez sur le plan pour poser {probeKind === 'sonde' ? 'une sonde' : 'un débitmètre'}, puis reliez-la dans le panneau de droite.</span>
              : pending ? <span className="text-[#0071e3] font-medium">Cliquez sur le plan pour poser le composant.</span>
                : <>Posez, glissez pour déplacer, <kbd>Suppr</kbd> pour retirer l'élément sélectionné.</>}
        </p>
      </div>

      {/* ── Propriétés ───────────────────────────────────────────────────── */}
      <div className="app-card p-3 h-fit order-3">
        <h2 className="text-[14px] font-semibold text-[#1d1d1f] mb-3">Propriétés</h2>

        {selectedProbe ? (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-[#1d1d1f]">{selectedProbe.kind === 'sonde' ? 'Sonde' : 'Débitmètre'}</p>
            <div>
              <label className="text-[11px] text-[#6e6e73] font-medium">Nom affiché</label>
              <input className="app-input w-full text-[13px] mt-1" value={selectedProbe.label}
                onChange={(e) => patchProbe(selectedProbe.id, { label: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] text-[#6e6e73] font-medium">Reliée à</label>
              <select className="app-input w-full text-[13px] mt-1" value={selectedProbe.binding ?? ''}
                onChange={(e) => patchProbe(selectedProbe.id, { binding: e.target.value || null })}>
                <option value="">— Non relié —</option>
                {selectedProbe.kind === 'debitmetre' ? (
                  <>
                    <option value="debit1">Débitmètre 1</option>
                    <option value="debit2">Débitmètre 2</option>
                  </>
                ) : (
                  <>
                    <optgroup label="Régulateur (VBus)">
                      {VBUS_FIELDS.map((f) => <option key={f} value={`vbus:${f}`}>{VBUS_LABELS[f]}</option>)}
                    </optgroup>
                    <optgroup label="Sonde DS18B20">
                      {/* Le libellé de la sonde devient un nouvel emplacement affectable */}
                      {selectedProbe.label.trim() && !sensorRoles.includes(selectedProbe.label.trim()) && (
                        <option value={`sonde:${selectedProbe.label.trim()}`}>
                          {selectedProbe.label.trim()} (nouvel emplacement)
                        </option>
                      )}
                      {sensorRoles.map((r) => <option key={r} value={`sonde:${r}`}>{r}</option>)}
                    </optgroup>
                  </>
                )}
              </select>
            </div>
            <button className="btn btn-ghost text-[13px] w-full text-[#FF3B30]" onClick={deleteSelected}>Supprimer</button>
          </div>
        ) : selectedPipe ? (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-[#1d1d1f]">Tuyau</p>
            <div>
              <label className="text-[11px] text-[#6e6e73] font-medium">Couleur</label>
              <div className="flex gap-2 mt-1">
                {(['red', 'blue', 'green'] as PipeColor[]).map((c) => (
                  <button key={c} onClick={() => updatePipe(selectedPipe.id, { color: c })} className="w-7 h-7 rounded-full border-2"
                    style={{ background: PIPE_COLORS[c], borderColor: selectedPipe.color === c ? '#1d1d1f' : 'transparent' }} />
                ))}
              </div>
            </div>
            <button className="btn btn-secondary text-[13px] w-full" onClick={() => updatePipe(selectedPipe.id, { style: selectedPipe.style === 'solid' ? 'dashed' : 'solid' })}>
              {selectedPipe.style === 'solid' ? 'Passer en pointillé' : 'Passer en continu'}
            </button>
            <button className="btn btn-ghost text-[13px] w-full text-[#FF3B30]" onClick={deleteSelected}>Supprimer le tuyau</button>
          </div>
        ) : selectedNode ? (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-[#6e6e73] font-medium">Nom affiché</label>
              <input className="app-input w-full text-[13px] mt-1" value={selectedNode.label ?? ''} onChange={(e) => patchNode(selectedNode.id, { label: e.target.value })} />
            </div>
            <p className="text-[11px] text-[#8e8e93]">{COMPONENT_MAP[selectedNode.type]?.name}</p>
            <div className="flex gap-2">
              <button className="btn btn-secondary text-[13px] flex-1" onClick={() => patchNode(selectedNode.id, { rot: (((selectedNode.rot ?? 0) + 90) % 360) as Rotation })}>⟳ Pivoter</button>
              <button className="btn btn-secondary text-[13px] flex-1" onClick={() => patchNode(selectedNode.id, { flip: !selectedNode.flip })}>⇄ Retourner</button>
            </div>
            <button className="btn btn-ghost text-[13px] w-full text-[#FF3B30]" onClick={deleteSelected}>Supprimer</button>
          </div>
        ) : (
          <p className="text-[13px] text-[#8e8e93]">
            {mode === 'pipe' ? 'Tracez un tuyau entre deux ancrages.' : mode === 'probe' ? 'Posez une sonde ou un débitmètre.' : 'Sélectionnez un élément, un tuyau ou une sonde.'}
          </p>
        )}

        <div className="border-t border-[var(--separator)] mt-4 pt-3">
          <label className="text-[11px] text-[#6e6e73] font-medium">Nom de l'installation</label>
          <input className="app-input w-full text-[13px] mt-1" value={schema.installation_name} placeholder={deviceName}
            onChange={(e) => dispatch({ type: 'commit', schema: { ...schema, installation_name: e.target.value } })} />
          <p className="text-[11px] text-[#8e8e93] mt-3">
            {schema.nodes.length} élément{schema.nodes.length > 1 ? 's' : ''} · {schema.pipes.length} tuyau{schema.pipes.length > 1 ? 'x' : ''} · {schema.probes.length} sonde{schema.probes.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

function PaletteCard({ def, active, onPick }: { def: ComponentDef; active: boolean; onPick: () => void }) {
  const pad = 6;
  return (
    <div draggable onDragStart={(e) => e.dataTransfer.setData('component', def.type)} onClick={onPick}
      className={`rounded-lg border bg-white p-1.5 transition-colors cursor-pointer ${active ? 'border-[#0071e3] ring-2 ring-[#0071e3]/30' : 'border-[#e5e5ea] hover:border-[#0071e3]'}`}
      title={`${def.name} — cliquer puis cliquer sur le plan, ou glisser`}>
      <svg viewBox={`${-pad} ${-pad} ${def.w + pad * 2} ${def.h + pad * 2}`} style={{ width: '100%', height: 46 }} preserveAspectRatio="xMidYMid meet">
        {def.render()}
      </svg>
      <p className="text-[10px] text-center text-[#3a3a3c] mt-0.5 leading-tight">{def.name}</p>
    </div>
  );
}
