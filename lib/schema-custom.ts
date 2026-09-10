// ─────────────────────────────────────────────────────────────────────────────
// Schéma hydraulique personnalisé (drag-and-drop, remplace les templates figés).
// Stocké tel quel dans device_schemas.config (JSONB), discriminé par `kind`.
// ─────────────────────────────────────────────────────────────────────────────

export type PipeColor = 'red' | 'blue' | 'green';
export type PipeStyle = 'solid' | 'dashed';
export type Rotation = 0 | 90 | 180 | 270;

export type Pt = { x: number; y: number };

// Un équipement posé sur le plan. `type` référence COMPONENTS (la boutique).
export type SchemaNode = {
  id: string;
  type: string;
  x: number;            // coin haut-gauche, en px (aimanté à la grille)
  y: number;
  rot?: Rotation;
  flip?: boolean;
  label?: string;
  w?: number;           // override de la taille naturelle (redimensionnable)
  h?: number;
};

// Un tuyau : polyligne aimantée. from/to relient des ancrages de composants.
export type Pipe = {
  id: string;
  color: PipeColor;     // rouge = chaud/départ, bleu = froid/retour, vert = ECS/glycol
  style: PipeStyle;     // continu ou pointillé
  points: Pt[];         // ≥ 2 points
  from?: { node: string; anchor: string };
  to?: { node: string; anchor: string };
};

export type ProbeKind = 'sonde' | 'debitmetre';

// Emplacement d'une sonde ou d'un débitmètre, relié à une source de données.
export type Probe = {
  id: string;
  kind: ProbeKind;
  x: number;
  y: number;
  binding: string | null;   // rôle DS18B20 | champ VBus | 'debit1' | 'debit2'
  label: string;
};

export type CustomSchema = {
  kind: 'custom';
  installation_name: string;
  canvas: { w: number; h: number; grid: number };
  nodes: SchemaNode[];
  pipes: Pipe[];
  probes: Probe[];
};

// Données live injectées dans le rendu client (lecture seule).
export type SchemaLive = {
  temps?: Record<string, number | null>;   // binding → température
  debits?: { debit1?: number | null; debit2?: number | null };
  pumpOn?: boolean;
};

export const GRID = 20;

// Champs de température fournis par le régulateur VBus.
export const VBUS_FIELDS = ['capteur_solaire', 'ballon_haut', 'ballon_bas', 'retour_solaire', 'ambiance'] as const;
export const VBUS_LABELS: Record<string, string> = {
  capteur_solaire: 'Capteur solaire',
  ballon_haut: 'Ballon haut',
  ballon_bas: 'Ballon bas',
  retour_solaire: 'Retour solaire',
  ambiance: 'Ambiance',
};

// Libellé lisible d'une liaison de sonde/débitmètre.
// Conventions : 'vbus:<champ>', 'sonde:<rôle>', 'debit1', 'debit2'.
export function bindingLabel(binding: string | null): string {
  if (!binding) return 'Non relié';
  if (binding === 'debit1') return 'Débitmètre 1';
  if (binding === 'debit2') return 'Débitmètre 2';
  if (binding.startsWith('vbus:')) return `${VBUS_LABELS[binding.slice(5)] ?? binding.slice(5)} (VBus)`;
  if (binding.startsWith('sonde:')) return `${binding.slice(6)} (sonde)`;
  return binding;
}

export const PIPE_COLORS: Record<PipeColor, string> = {
  red: '#FF3B30',
  blue: '#0071e3',
  green: '#34C759',
};

// Sonde considérée en panne si sa dernière remontée date de plus de 2 min.
const SENSOR_STALE_MS = 120_000;

type LiveSources = {
  temp?: Record<string, unknown> | null;   // dernière ligne `temperatures`
  debit?: { lph?: number | null; lph_2?: number | null } | null;
  etat?: { pompe_solaire?: boolean | null } | null;
  sensors?: { role?: string | null; last_temp?: number | null; last_seen?: string | null; active?: boolean | null }[];
  now?: number;
};

// Construit les données live indexées par la convention de liaison des sondes
// du schéma : 'vbus:<champ>', 'sonde:<rôle>', 'debit1' / 'debit2'.
export function buildSchemaLive(src: LiveSources): SchemaLive {
  const now = src.now ?? Date.now();
  const temps: Record<string, number | null> = {};

  for (const f of VBUS_FIELDS) {
    const v = src.temp?.[f];
    if (v != null && v !== '' && !isNaN(Number(v))) temps[`vbus:${f}`] = Number(v);
  }
  for (const s of src.sensors ?? []) {
    if (!s.role || s.last_temp == null) continue;
    const stale = s.active === false || !s.last_seen || now - new Date(s.last_seen).getTime() > SENSOR_STALE_MS;
    if (!stale) temps[`sonde:${s.role}`] = Number(s.last_temp);
  }

  return {
    temps,
    debits: { debit1: src.debit?.lph ?? null, debit2: src.debit?.lph_2 ?? null },
    pumpOn: src.etat?.pompe_solaire ?? undefined,
  };
}

export function emptySchema(): CustomSchema {
  return {
    kind: 'custom',
    installation_name: '',
    canvas: { w: 760, h: 480, grid: GRID },
    nodes: [],
    pipes: [],
    probes: [],
  };
}

// Type guard : distingue un schéma perso d'un ancien template.
export function isCustomSchema(cfg: unknown): cfg is CustomSchema {
  return !!cfg && typeof cfg === 'object' && (cfg as { kind?: string }).kind === 'custom';
}

export function snap(v: number, grid = GRID): number {
  return Math.round(v / grid) * grid;
}

// Couleur d'une température (partagée avec l'ancien rendu).
export function tempColor(t?: number | null): string {
  if (t == null) return '#8e8e93';
  if (t < 25) return '#0071e3';
  if (t < 40) return '#AF52DE';
  if (t < 55) return '#FF9500';
  return '#FF3B30';
}
