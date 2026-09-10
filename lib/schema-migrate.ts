import type { SchemaConfig } from '@/lib/schema-types';
import { TEMPLATE_SLOTS } from '@/lib/schema-types';
import type { CustomSchema, SchemaNode, Pipe, Probe, Pt } from '@/lib/schema-custom';

// ─────────────────────────────────────────────────────────────────────────────
// Conversion d'un ancien schéma « à modèle figé » vers un schéma personnalisé.
// On conserve ce qui compte : les libellés configurés et les liaisons de données
// (slot.field → 'vbus:<champ>'). La disposition générée est un point de départ
// que l'installateur ajuste ensuite dans l'éditeur.
// ─────────────────────────────────────────────────────────────────────────────

const pipe = (id: string, color: Pipe['color'], style: Pipe['style'], points: Pt[]): Pipe =>
  ({ id, color, style, points });

// Positions des sondes par clé de slot, pour chaque modèle.
const PROBE_POS: Record<string, Record<string, Pt>> = {
  // Positions choisies pour rester sur un tuyau sans chevaucher les libellés
  // des composants (le nom d'un composant s'affiche 14 px sous sa boîte).
  '1_ballon': {
    capteur: { x: 198, y: 165 },        // sur le départ chaud, sous le capteur
    retour: { x: 240, y: 235 },         // sur le retour froid, au-dessus du circulateur
    ballon_haut: { x: 500, y: 180 },
    ballon_bas: { x: 500, y: 330 },
    depart_ecs: { x: 640, y: 60 },
    ambiance: { x: 110, y: 420 },
  },
  '2_ballons': {
    capteur: { x: 198, y: 165 },
    retour: { x: 240, y: 235 },
    ballon1_haut: { x: 420, y: 180 },
    ballon1_bas: { x: 420, y: 330 },
    ballon2_haut: { x: 620, y: 180 },
    ballon2_bas: { x: 620, y: 330 },
    depart_ecs: { x: 700, y: 60 },
    ambiance: { x: 110, y: 420 },
  },
};

function layout(template: SchemaConfig['template']): { nodes: SchemaNode[]; pipes: Pipe[] } {
  const capteur: SchemaNode = { id: 'm_capteur', type: 'capteur_solaire', x: 60, y: 40, rot: 0, label: 'Capteurs solaires' };
  const pompe: SchemaNode = { id: 'm_pompe', type: 'pompe', x: 240, y: 267, rot: 0, label: 'Circulateur' };

  if (template === '2_ballons') {
    const b1: SchemaNode = { id: 'm_b1', type: 'ballon_tampon', x: 360, y: 140, rot: 0, label: 'Ballon 1' };
    const b2: SchemaNode = { id: 'm_b2', type: 'ballon_ecs', x: 560, y: 140, rot: 0, label: 'Ballon 2' };
    return {
      nodes: [capteur, pompe, b1, b2],
      pipes: [
        pipe('m_p1', 'red', 'solid', [{ x: 198, y: 130 }, { x: 198, y: 210 }, { x: 372, y: 210 }]),
        pipe('m_p2', 'red', 'solid', [{ x: 480, y: 250 }, { x: 572, y: 250 }]),
        pipe('m_p3', 'blue', 'solid', [{ x: 372, y: 290 }, { x: 286, y: 290 }]),
        pipe('m_p4', 'blue', 'solid', [{ x: 240, y: 290 }, { x: 240, y: 130 }, { x: 72, y: 130 }]),
        pipe('m_p5', 'green', 'dashed', [{ x: 620, y: 142 }, { x: 620, y: 80 }, { x: 720, y: 80 }]),
      ],
    };
  }

  const b: SchemaNode = { id: 'm_b1', type: 'ballon_ecs', x: 440, y: 140, rot: 0, label: 'Ballon' };
  return {
    nodes: [capteur, pompe, b],
    pipes: [
      pipe('m_p1', 'red', 'solid', [{ x: 198, y: 130 }, { x: 198, y: 210 }, { x: 452, y: 210 }]),
      pipe('m_p2', 'blue', 'solid', [{ x: 452, y: 290 }, { x: 286, y: 290 }]),
      pipe('m_p3', 'blue', 'solid', [{ x: 240, y: 290 }, { x: 240, y: 130 }, { x: 72, y: 130 }]),
      pipe('m_p4', 'green', 'dashed', [{ x: 500, y: 142 }, { x: 500, y: 80 }, { x: 680, y: 80 }]),
    ],
  };
}

/** Convertit un ancien schéma à modèle figé en schéma personnalisé équivalent. */
export function fromTemplate(cfg: SchemaConfig): CustomSchema {
  const { nodes, pipes } = layout(cfg.template);
  const positions = PROBE_POS[cfg.template] ?? {};

  const probes: Probe[] = [];
  for (const slot of TEMPLATE_SLOTS[cfg.template]) {
    const conf = cfg.slots?.[slot.key];
    if (conf && conf.enabled === false) continue;          // emplacement désactivé → ignoré
    const pos = positions[slot.key];
    if (!pos) continue;
    const field = conf?.field ?? slot.defaultField;
    probes.push({
      id: `m_${slot.key}`,
      kind: 'sonde',
      x: pos.x,
      y: pos.y,
      binding: field ? `vbus:${field}` : null,
      label: conf?.label || slot.defaultLabel,
    });
  }

  // Le débitmètre principal, si le modèle l'affichait.
  if (cfg.show_debit !== false) {
    probes.push({ id: 'm_debit1', kind: 'debitmetre', x: 360, y: 290, binding: 'debit1', label: 'Débit' });
  }

  return {
    kind: 'custom',
    installation_name: cfg.installation_name ?? '',
    canvas: { w: 760, h: 480, grid: 20 },
    nodes,
    pipes,
    probes,
  };
}
