import type { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// « Boutique » d'accessoires de chaufferie. Chaque composant = un symbole SVG
// dessiné dans sa boîte naturelle (0,0)→(w,h) + des ancrages où se branchent les
// tuyaux. Le registre est volontairement plat pour être étendu facilement.
// ─────────────────────────────────────────────────────────────────────────────

export type AnchorSide = 'top' | 'bottom' | 'left' | 'right';
export type Anchor = { id: string; x: number; y: number; side: AnchorSide };

export type ComponentDef = {
  type: string;
  name: string;
  category: string;
  keywords: string[];
  w: number;
  h: number;
  anchors: Anchor[];
  render: () => ReactNode;
};

const STROKE = '#1d1d1f';
const SUBTLE = '#f2f2f7';
const SW = 1.6;

// Réglages de dessin partagés
const line = { stroke: STROKE, strokeWidth: SW, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const solid = { stroke: STROKE, strokeWidth: SW, fill: '#ffffff', strokeLinejoin: 'round' as const };

// ─── Symboles ────────────────────────────────────────────────────────────────

function Ballon(coils = 1) {
  return (
    <>
      <rect x={12} y={2} width={96} height={216} rx={46} {...solid} />
      {/* serpentin(s) */}
      {Array.from({ length: coils }).map((_, k) => {
        const y0 = 60 + k * 90;
        return (
          <path key={k} {...line} stroke="#0071e3"
            d={`M40,${y0} q20,-14 40,0 q-20,14 0,28 q20,-14 40,0 q-20,14 0,28`} />
        );
      })}
    </>
  );
}

const COMPONENTS: ComponentDef[] = [
  // ── Stockage ────────────────────────────────────────────────────────────────
  {
    type: 'ballon_ecs', name: 'Ballon ECS', category: 'Stockage',
    keywords: ['ballon', 'ecs', 'eau chaude', 'sanitaire', 'cumulus', 'stockage'],
    w: 120, h: 220,
    anchors: [
      { id: 'top', x: 60, y: 2, side: 'top' },
      { id: 'bot', x: 60, y: 218, side: 'bottom' },
      { id: 'coil_in', x: 12, y: 70, side: 'left' },
      { id: 'coil_out', x: 12, y: 150, side: 'left' },
    ],
    render: () => Ballon(1),
  },
  {
    type: 'ballon_tampon', name: 'Ballon tampon', category: 'Stockage',
    keywords: ['ballon', 'tampon', 'buffer', 'stockage', 'hydraulique'],
    w: 120, h: 220,
    anchors: [
      { id: 'top', x: 60, y: 2, side: 'top' },
      { id: 'bot', x: 60, y: 218, side: 'bottom' },
      { id: 'mid_l', x: 12, y: 110, side: 'left' },
      { id: 'mid_r', x: 108, y: 110, side: 'right' },
    ],
    render: () => (
      <>
        <rect x={12} y={2} width={96} height={216} rx={46} {...solid} />
        <line {...line} stroke="#c7c7cc" x1={20} y1={110} x2={100} y2={110} />
      </>
    ),
  },
  {
    type: 'ballon_combine', name: 'Ballon combiné', category: 'Stockage',
    keywords: ['ballon', 'combine', 'tank in tank', 'double serpentin', 'stockage'],
    w: 120, h: 220,
    anchors: [
      { id: 'top', x: 60, y: 2, side: 'top' },
      { id: 'bot', x: 60, y: 218, side: 'bottom' },
      { id: 'coil1_in', x: 12, y: 60, side: 'left' },
      { id: 'coil1_out', x: 12, y: 100, side: 'left' },
      { id: 'coil2_in', x: 108, y: 150, side: 'right' },
      { id: 'coil2_out', x: 108, y: 190, side: 'right' },
    ],
    render: () => Ballon(2),
  },

  // ── Production ────────────────────────────────────────────────────────────────
  {
    type: 'chaudiere', name: 'Chaudière', category: 'Production',
    keywords: ['chaudiere', 'gaz', 'fioul', 'bois', 'production', 'chaleur'],
    w: 120, h: 110,
    anchors: [
      { id: 'depart', x: 40, y: 2, side: 'top' },
      { id: 'retour', x: 80, y: 2, side: 'top' },
    ],
    render: () => (
      <>
        <rect x={4} y={4} width={112} height={102} rx={14} {...solid} />
        <path {...line} stroke="#FF9500"
          d="M60,44 q-16,14 -8,30 q4,8 14,10 q-6,-8 0,-16 q4,10 14,10 q10,-4 6,-18 q-2,10 -10,8 q6,-16 -16,-24Z" />
      </>
    ),
  },
  {
    type: 'pac', name: 'Pompe à chaleur', category: 'Production',
    keywords: ['pac', 'pompe a chaleur', 'aerothermie', 'geothermie', 'production'],
    w: 130, h: 90,
    anchors: [
      { id: 'depart', x: 130, y: 34, side: 'right' },
      { id: 'retour', x: 130, y: 62, side: 'right' },
    ],
    render: () => (
      <>
        <rect x={4} y={4} width={122} height={82} rx={12} {...solid} />
        <circle cx={40} cy={45} r={24} {...line} />
        {[0, 72, 144, 216, 288].map((a) => {
          const r2 = (v: number) => Math.round(v * 100) / 100;   // évite un mismatch d'hydratation
          return (
            <line key={a} {...line} x1={40} y1={45}
              x2={r2(40 + 20 * Math.cos((a * Math.PI) / 180))}
              y2={r2(45 + 20 * Math.sin((a * Math.PI) / 180))} />
          );
        })}
      </>
    ),
  },
  {
    type: 'capteur_solaire', name: 'Capteur solaire', category: 'Production',
    keywords: ['capteur', 'solaire', 'thermique', 'panneau', 'collecteur'],
    w: 150, h: 90,
    anchors: [
      { id: 'out', x: 138, y: 90, side: 'bottom' },
      { id: 'in', x: 12, y: 90, side: 'bottom' },
    ],
    render: () => (
      <>
        <rect x={4} y={4} width={142} height={72} rx={6} {...solid} />
        {[30, 55, 80, 105].map((x) => (
          <line key={x} {...line} stroke="#0071e3" x1={x} y1={10} x2={x - 18} y2={70} />
        ))}
      </>
    ),
  },
  {
    type: 'panneau_pv', name: 'Panneau PV', category: 'Production',
    keywords: ['panneau', 'pv', 'photovoltaique', 'electrique', 'solaire'],
    w: 150, h: 90,
    anchors: [{ id: 'out', x: 75, y: 90, side: 'bottom' }],
    render: () => (
      <>
        <rect x={4} y={4} width={142} height={72} rx={4} {...solid} />
        {[42, 80, 118].map((x) => <line key={x} {...line} stroke="#c7c7cc" x1={x} y1={4} x2={x} y2={76} />)}
        {[28, 52].map((y) => <line key={y} {...line} stroke="#c7c7cc" x1={4} y1={y} x2={146} y2={y} />)}
      </>
    ),
  },

  // ── Échange ───────────────────────────────────────────────────────────────────
  {
    type: 'echangeur', name: 'Échangeur à plaques', category: 'Échange',
    keywords: ['echangeur', 'plaques', 'inox', 'separation', 'primaire', 'secondaire'],
    w: 80, h: 110,
    anchors: [
      { id: 'p_in', x: 4, y: 24, side: 'left' },
      { id: 'p_out', x: 4, y: 86, side: 'left' },
      { id: 's_in', x: 76, y: 86, side: 'right' },
      { id: 's_out', x: 76, y: 24, side: 'right' },
    ],
    render: () => (
      <>
        <rect x={20} y={4} width={40} height={102} rx={6} {...solid} />
        {[22, 34, 46, 58, 70, 82, 94].map((y) => (
          <line key={y} {...line} x1={26} y1={y} x2={54} y2={y - 8} />
        ))}
      </>
    ),
  },

  // ── Circulation ─────────────────────────────────────────────────────────────
  {
    type: 'pompe', name: 'Circulateur', category: 'Circulation',
    keywords: ['pompe', 'circulateur', 'debit', 'circulation'],
    w: 46, h: 46,
    anchors: [
      { id: 'in', x: 0, y: 23, side: 'left' },
      { id: 'out', x: 46, y: 23, side: 'right' },
    ],
    render: () => (
      <>
        <circle cx={23} cy={23} r={20} {...solid} />
        <path d="M15,15 L33,23 L15,31 Z" fill={STROKE} />
      </>
    ),
  },
  {
    type: 'vanne_3v', name: 'Vanne 3 voies', category: 'Circulation',
    keywords: ['vanne', '3 voies', 'trois voies', 'melange', 'directionnelle'],
    w: 60, h: 60,
    anchors: [
      { id: 'a', x: 0, y: 30, side: 'left' },
      { id: 'b', x: 60, y: 30, side: 'right' },
      { id: 'c', x: 30, y: 60, side: 'bottom' },
    ],
    render: () => (
      <>
        <path d="M30,30 L6,16 L6,44 Z" {...solid} />
        <path d="M30,30 L54,16 L54,44 Z" {...solid} />
        <path d="M30,30 L16,54 L44,54 Z" {...solid} />
      </>
    ),
  },
  {
    type: 'vanne_melangeuse', name: 'Vanne mélangeuse', category: 'Circulation',
    keywords: ['vanne', 'melangeuse', 'motorisee', 'mitigeuse', 'regulation'],
    w: 60, h: 74,
    anchors: [
      { id: 'a', x: 0, y: 44, side: 'left' },
      { id: 'b', x: 60, y: 44, side: 'right' },
      { id: 'c', x: 30, y: 74, side: 'bottom' },
    ],
    render: () => (
      <>
        <rect x={18} y={2} width={24} height={18} rx={4} {...solid} />
        <line {...line} x1={30} y1={20} x2={30} y2={30} />
        <path d="M30,44 L6,30 L6,58 Z" {...solid} />
        <path d="M30,44 L54,30 L54,58 Z" {...solid} />
        <path d="M30,44 L16,68 L44,68 Z" {...solid} />
      </>
    ),
  },
  {
    type: 'vase_expansion', name: 'Vase d\'expansion', category: 'Circulation',
    keywords: ['vase', 'expansion', 'pression', 'securite'],
    w: 56, h: 90,
    anchors: [{ id: 'in', x: 28, y: 90, side: 'bottom' }],
    render: () => (
      <>
        <rect x={6} y={4} width={44} height={82} rx={20} {...solid} />
        <line {...line} stroke="#c7c7cc" x1={10} y1={40} x2={46} y2={40} />
      </>
    ),
  },

  // ── Émission ────────────────────────────────────────────────────────────────
  {
    type: 'radiateur', name: 'Radiateur', category: 'Émission',
    keywords: ['radiateur', 'chauffage', 'emission', 'fonte'],
    w: 100, h: 70,
    anchors: [
      { id: 'in', x: 0, y: 60, side: 'left' },
      { id: 'out', x: 100, y: 60, side: 'right' },
    ],
    render: () => (
      <>
        <rect x={4} y={4} width={92} height={52} rx={6} {...solid} />
        {[20, 32, 44, 56, 68, 80].map((x) => <line key={x} {...line} x1={x} y1={8} x2={x} y2={52} />)}
      </>
    ),
  },
  {
    type: 'plancher_chauffant', name: 'Plancher chauffant', category: 'Émission',
    keywords: ['plancher', 'chauffant', 'sol', 'basse temperature', 'emission'],
    w: 150, h: 60,
    anchors: [
      { id: 'in', x: 0, y: 12, side: 'left' },
      { id: 'out', x: 0, y: 48, side: 'left' },
    ],
    render: () => (
      <>
        <rect x={2} y={2} width={146} height={56} rx={6} {...solid} />
        <path {...line} stroke="#FF3B30"
          d="M12,12 H132 V26 H24 V40 H132 V52" />
      </>
    ),
  },
  {
    type: 'ventilo_convecteur', name: 'Ventilo-convecteur', category: 'Émission',
    keywords: ['ventilo', 'convecteur', 'fan coil', 'clim', 'emission'],
    w: 120, h: 60,
    anchors: [
      { id: 'in', x: 0, y: 30, side: 'left' },
      { id: 'out', x: 120, y: 30, side: 'right' },
    ],
    render: () => (
      <>
        <rect x={4} y={4} width={112} height={52} rx={8} {...solid} />
        <circle cx={36} cy={30} r={14} {...line} />
        {[40, 60, 80, 100].map((x) => <line key={x} {...line} stroke="#c7c7cc" x1={x} y1={44} x2={x + 8} y2={50} />)}
      </>
    ),
  },
];

export const COMPONENT_MAP: Record<string, ComponentDef> =
  Object.fromEntries(COMPONENTS.map((c) => [c.type, c]));

export const CATEGORIES = ['Stockage', 'Production', 'Échange', 'Circulation', 'Émission'];

export function searchComponents(q: string): ComponentDef[] {
  const s = q.trim().toLowerCase();
  if (!s) return COMPONENTS;
  return COMPONENTS.filter(
    (c) => c.name.toLowerCase().includes(s) || c.keywords.some((k) => k.includes(s)),
  );
}

export default COMPONENTS;
