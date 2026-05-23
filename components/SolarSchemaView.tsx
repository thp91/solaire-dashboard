'use client';

import { SchemaConfig } from '@/lib/schema-types';

export type SchemaLiveData = {
  capteur_solaire?: number | null;
  ballon_haut?: number | null;
  ballon_bas?: number | null;
  retour_solaire?: number | null;
  ambiance?: number | null;
  lph?: number | null;
  pompe_solaire?: boolean | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tempColor(t?: number | null): string {
  if (t == null) return '#94a3b8';
  if (t < 25)   return '#3b82f6';
  if (t < 40)   return '#8b5cf6';
  if (t < 55)   return '#f97316';
  return '#ef4444';
}

function fmt(v?: number | null, unit = '°C'): string {
  return v != null ? `${Number(v).toFixed(1)} ${unit}` : '—';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TempBadge({ x, y, value, label }: { x: number; y: number; value?: number | null; label: string }) {
  const c = tempColor(value);
  return (
    <g>
      <rect x={x - 32} y={y - 12} width={64} height={22} rx={11}
        fill={c} fillOpacity={0.12} stroke={c} strokeWidth={1.5} />
      <text x={x} y={y + 3} textAnchor="middle" fontSize={11} fontWeight="600"
        fill={c} fontFamily="system-ui, sans-serif">
        {fmt(value)}
      </text>
      <text x={x} y={y - 18} textAnchor="middle" fontSize={9} fill="#94a3b8"
        fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

function Pump({ x, y, active }: { x: number; y: number; active?: boolean | null }) {
  const c = active ? '#3b82f6' : '#94a3b8';
  const bg = active ? '#dbeafe' : '#f8fafc';
  return (
    <g>
      <circle cx={x} cy={y} r={20} fill="white" stroke="#cbd5e1" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={15} fill={bg} stroke={c} strokeWidth={2} />
      <path d={`M${x - 7},${y + 5} L${x + 9},${y} L${x - 7},${y - 5} Z`} fill={c} />
      <text x={x} y={y + 34} textAnchor="middle" fontSize={9} fill="#64748b"
        fontFamily="system-ui, sans-serif">
        Pompe
      </text>
    </g>
  );
}

function Exchanger({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i}
          d={`M${x + 8},${y + 10 + i * 13} Q${x + w / 2},${y + 4 + i * 13} ${x + w - 8},${y + 10 + i * 13}`}
          fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.7}
        />
      ))}
      <text x={x + w / 2} y={y + h + 14} textAnchor="middle" fontSize={9} fill="#64748b"
        fontFamily="system-ui, sans-serif">
        Échangeur
      </text>
    </g>
  );
}

function Tank({ x, y, w, h, tHaut, tBas, label, uid }: {
  x: number; y: number; w: number; h: number;
  tHaut?: number | null; tBas?: number | null; label: string; uid: string;
}) {
  const cTop = tempColor(tHaut);
  const cBot = tempColor(tBas ?? (tHaut != null ? tHaut - 10 : null));
  return (
    <g>
      <defs>
        <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={cTop} stopOpacity={0.75} />
          <stop offset="100%" stopColor={cBot} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {/* Body */}
      <rect x={x} y={y + 10} width={w} height={h - 20} fill={`url(#g-${uid})`}
        stroke="#94a3b8" strokeWidth={2} />
      {/* Top cap */}
      <ellipse cx={x + w / 2} cy={y + 10} rx={w / 2} ry={9}
        fill="#e2e8f0" stroke="#94a3b8" strokeWidth={2} />
      {/* Bottom cap */}
      <ellipse cx={x + w / 2} cy={y + h - 10} rx={w / 2} ry={9}
        fill="#cbd5e1" stroke="#94a3b8" strokeWidth={2} />
      {/* Label */}
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize={12}
        fontWeight="700" fill="white" fontFamily="system-ui, sans-serif"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
        {label}
      </text>
    </g>
  );
}

function EcsBox({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#fdf2f8" stroke="#ec4899" strokeWidth={2} />
      <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize={10}
        fontWeight="600" fill="#db2777" fontFamily="system-ui, sans-serif">
        Appoint
      </text>
      <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={10}
        fontWeight="600" fill="#db2777" fontFamily="system-ui, sans-serif">
        ECS
      </text>
    </g>
  );
}

function SolarPanels({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <text x={x + w / 2} y={y - 8} textAnchor="middle" fontSize={11}
        fontWeight="600" fill="#3b82f6" fontFamily="system-ui, sans-serif">
        ☀ Capteurs solaires
      </text>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="#eff6ff" stroke="#3b82f6" strokeWidth={2} />
      {/* Panel grid lines */}
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <rect key={`${col}-${row}`}
            x={x + 8 + col * (w / 3 - 2)} y={y + 8 + row * (h / 2 - 2)}
            width={w / 3 - 12} height={h / 2 - 10}
            rx={3} fill="#bfdbfe" stroke="#93c5fd" strokeWidth={1}
          />
        ))
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SolarSchemaView({
  config,
  live,
}: { config: SchemaConfig; live: SchemaLiveData }) {
  const is2     = config.template === '2_ballons';
  const showEcs = config.show_ecs;

  // Resolve a slot's live value
  function val(key: string): number | null | undefined {
    const s = config.slots[key];
    if (!s?.enabled || !s.field) return undefined;
    return live[s.field as keyof SchemaLiveData] as number | null | undefined;
  }
  function lbl(key: string, fallback: string): string {
    return config.slots[key]?.label || fallback;
  }
  function slotOn(key: string): boolean {
    return !!config.slots[key]?.enabled;
  }

  // ── Layout constants ──────────────────────────────────────────────────────
  const VW = 820, VH = 460;

  const panelX = 20, panelY = 32, panelW = 160, panelH = 82;
  const primX  = panelX + panelW / 2;        // primary circuit x ≈ 100
  const pumpY  = 210;
  const exX    = primX - 38, exY = 310, exW = 76, exH = 68;

  // Tanks
  const tankW  = 105;
  const tankH  = 270;
  const tankY  = 55;
  const t1X    = is2 ? 295 : 340;
  const t2X    = t1X + tankW + 50;           // only for 2_ballons

  // ECS
  const ecsW   = 115;
  const ecsH   = 100;
  const lastTankRightX = (is2 ? t2X : t1X) + tankW;
  const ecsX   = showEcs ? lastTankRightX + 60 : VW;
  const ecsY   = tankY + 30;

  // ── Circuit colors ─────────────────────────────────────────────────────────
  const RED    = '#ef4444';
  const ORANGE = '#f97316';
  const PINK   = '#ec4899';
  const BLUE   = '#3b82f6';
  const SW     = 3;       // stroke width

  return (
    <div className="bg-slate-50 rounded-2xl p-4 overflow-x-auto">
      {config.installation_name && (
        <p className="text-sm font-semibold text-gray-600 mb-3">
          {config.installation_name}
        </p>
      )}

      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ minWidth: 520, maxWidth: 820 }}>

        {/* ── CIRCUIT PRIMAIRE (rouge) ─────────────────────────────── */}
        {/* Down: panel → pump */}
        <line x1={primX} y1={panelY + panelH} x2={primX} y2={pumpY - 20}
          stroke={RED} strokeWidth={SW} />
        {/* Down: pump → exchanger */}
        <line x1={primX} y1={pumpY + 20} x2={primX} y2={exY}
          stroke={RED} strokeWidth={SW} />
        {/* Return: exchanger left → left wall → back to panel */}
        <polyline points={`${exX},${exY + exH} ${panelX - 8},${exY + exH} ${panelX - 8},${panelY + panelH}`}
          fill="none" stroke={RED} strokeWidth={SW} strokeLinejoin="round" />

        {/* ── CIRCUIT SECONDAIRE (orange) ──────────────────────────── */}
        {/* Exchanger right → tank 1 bottom */}
        <polyline
          points={`${exX + exW},${exY + exH / 2} ${t1X - 20},${exY + exH / 2} ${t1X - 20},${tankY + tankH - 10} ${t1X},${tankY + tankH - 10}`}
          fill="none" stroke={ORANGE} strokeWidth={SW} strokeLinejoin="round"
        />
        {/* Tank 1 top → back to exchanger */}
        <polyline
          points={`${t1X},${tankY + 20} ${t1X - 35},${tankY + 20} ${t1X - 35},${exY + 15} ${exX + exW},${exY + 15}`}
          fill="none" stroke={ORANGE} strokeWidth={SW} strokeLinejoin="round" strokeDasharray="6 3"
        />

        {/* ── CONNEXION 2 BALLONS ──────────────────────────────────── */}
        {is2 && (
          <>
            <line x1={t1X + tankW} y1={tankY + tankH - 30} x2={t2X} y2={tankY + tankH - 30}
              stroke={ORANGE} strokeWidth={SW} />
            <line x1={t1X + tankW} y1={tankY + 30} x2={t2X} y2={tankY + 30}
              stroke={ORANGE} strokeWidth={SW} strokeDasharray="6 3" />
          </>
        )}

        {/* ── CIRCUIT ECS (rose) ───────────────────────────────────── */}
        {showEcs && (
          <>
            <line x1={lastTankRightX} y1={tankY + 40} x2={ecsX} y2={tankY + 40}
              stroke={PINK} strokeWidth={SW} />
            <line x1={ecsX + ecsW} y1={ecsY + ecsH / 2} x2={VW - 12} y2={ecsY + ecsH / 2}
              stroke={PINK} strokeWidth={SW} />
            <text x={VW - 10} y={ecsY + ecsH / 2 - 6} textAnchor="end" fontSize={9}
              fill={PINK} fontFamily="system-ui, sans-serif">Départ ECS →</text>
          </>
        )}

        {/* ── EAU FROIDE (bleu) ────────────────────────────────────── */}
        <line
          x1={(is2 ? t2X : t1X) + tankW / 2} y1={tankY + tankH + 10}
          x2={(is2 ? t2X : t1X) + tankW / 2} y2={VH - 24}
          stroke={BLUE} strokeWidth={SW}
        />
        <text x={(is2 ? t2X : t1X) + tankW / 2} y={VH - 8}
          textAnchor="middle" fontSize={9} fill={BLUE} fontFamily="system-ui, sans-serif">
          Arrivée eau froide
        </text>

        {/* ── COMPOSANTS ──────────────────────────────────────────── */}
        <SolarPanels x={panelX} y={panelY} w={panelW} h={panelH} />
        <Pump x={primX} y={pumpY} active={live.pompe_solaire} />
        <Exchanger x={exX} y={exY} w={exW} h={exH} />

        <Tank x={t1X} y={tankY} w={tankW} h={tankH}
          tHaut={val(is2 ? 'ballon1_haut' : 'ballon_haut')}
          tBas={val(is2 ? 'ballon1_bas'  : 'ballon_bas')}
          label={is2 ? 'Ballon 1' : 'Ballon'}
          uid="t1"
        />
        {is2 && (
          <Tank x={t2X} y={tankY} w={tankW} h={tankH}
            tHaut={val('ballon2_haut')}
            tBas={val('ballon2_bas')}
            label="Ballon 2"
            uid="t2"
          />
        )}
        {showEcs && <EcsBox x={ecsX} y={ecsY} w={ecsW} h={ecsH} />}

        {/* ── BADGES SONDES ────────────────────────────────────────── */}
        {slotOn('capteur') && (
          <TempBadge x={primX + 55} y={155}
            value={val('capteur')} label={lbl('capteur', 'T capteur')} />
        )}
        {slotOn('retour') && (
          <TempBadge x={primX + 55} y={280}
            value={val('retour')} label={lbl('retour', 'T retour')} />
        )}

        {/* 1 ballon */}
        {!is2 && slotOn('ballon_haut') && (
          <TempBadge x={t1X + tankW / 2} y={tankY + 44}
            value={val('ballon_haut')} label={lbl('ballon_haut', 'T haut')} />
        )}
        {!is2 && slotOn('ballon_bas') && (
          <TempBadge x={t1X + tankW / 2} y={tankY + tankH - 38}
            value={val('ballon_bas')} label={lbl('ballon_bas', 'T bas')} />
        )}

        {/* 2 ballons */}
        {is2 && slotOn('ballon1_haut') && (
          <TempBadge x={t1X + tankW / 2} y={tankY + 44}
            value={val('ballon1_haut')} label={lbl('ballon1_haut', 'T haut')} />
        )}
        {is2 && slotOn('ballon1_bas') && (
          <TempBadge x={t1X + tankW / 2} y={tankY + tankH - 38}
            value={val('ballon1_bas')} label={lbl('ballon1_bas', 'T bas')} />
        )}
        {is2 && slotOn('ballon2_haut') && (
          <TempBadge x={t2X + tankW / 2} y={tankY + 44}
            value={val('ballon2_haut')} label={lbl('ballon2_haut', 'T haut')} />
        )}
        {is2 && slotOn('ballon2_bas') && (
          <TempBadge x={t2X + tankW / 2} y={tankY + tankH - 38}
            value={val('ballon2_bas')} label={lbl('ballon2_bas', 'T bas')} />
        )}

        {showEcs && slotOn('depart_ecs') && (
          <TempBadge x={ecsX + ecsW / 2} y={ecsY + ecsH + 28}
            value={val('depart_ecs')} label={lbl('depart_ecs', 'Départ ECS')} />
        )}

        {/* ── DÉBITMÈTRE ───────────────────────────────────────────── */}
        {config.show_debit && (
          <g>
            <rect x={t1X + 10} y={VH - 52} width={110} height={38} rx={10}
              fill="#f0fdf4" stroke="#22c55e" strokeWidth={1.5} />
            <text x={t1X + 65} y={VH - 38} textAnchor="middle" fontSize={9}
              fill="#15803d" fontFamily="system-ui, sans-serif">Débit</text>
            <text x={t1X + 65} y={VH - 22} textAnchor="middle" fontSize={13}
              fontWeight="700" fill="#15803d" fontFamily="system-ui, sans-serif">
              {live.lph != null ? `${Number(live.lph).toFixed(0)} L/h` : '— L/h'}
            </text>
          </g>
        )}

        {/* ── AMBIANCE ─────────────────────────────────────────────── */}
        {slotOn('ambiance') && (
          <g>
            <rect x={VW - 130} y={VH - 52} width={110} height={38} rx={10}
              fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} />
            <text x={VW - 75} y={VH - 38} textAnchor="middle" fontSize={9}
              fill="#64748b" fontFamily="system-ui, sans-serif">
              {lbl('ambiance', 'Ambiance')}
            </text>
            <text x={VW - 75} y={VH - 22} textAnchor="middle" fontSize={13}
              fontWeight="700" fill={tempColor(val('ambiance'))}
              fontFamily="system-ui, sans-serif">
              {fmt(val('ambiance'))}
            </text>
          </g>
        )}

      </svg>
    </div>
  );
}
