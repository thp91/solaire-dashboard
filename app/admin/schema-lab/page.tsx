'use client';

import { useMemo, useState } from 'react';
import SchemaCanvas from '@/components/SchemaCanvas';
import type { CustomSchema, SchemaLive } from '@/lib/schema-custom';
import { searchComponents, CATEGORIES, type ComponentDef } from '@/lib/schema-components';

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — page de démonstration : montre le moteur de rendu (schéma d'exemple
// avec données live simulées) et la « boutique » avec sa barre de recherche.
// L'interactivité (drag-and-drop) arrive en phase 2.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLE: CustomSchema = {
  kind: 'custom',
  installation_name: 'Exemple — solaire + appoint chaudière',
  canvas: { w: 760, h: 480, grid: 20 },
  nodes: [
    { id: 'n1', type: 'capteur_solaire', x: 40, y: 20, label: 'Capteurs solaires' },
    { id: 'n2', type: 'ballon_tampon', x: 440, y: 140, label: 'Ballon tampon' },
    { id: 'n3', type: 'pompe', x: 250, y: 227, label: 'Circulateur' },
    { id: 'n4', type: 'chaudiere', x: 60, y: 360, label: 'Chaudière appoint' },
    { id: 'n5', type: 'radiateur', x: 600, y: 300, label: 'Chauffage' },
  ],
  pipes: [
    // solaire départ (chaud)
    { id: 'p1', color: 'red', style: 'solid', points: [{ x: 178, y: 110 }, { x: 178, y: 140 }, { x: 500, y: 140 }] },
    // solaire retour (froid) : ballon → circulateur → capteur
    { id: 'p2', color: 'blue', style: 'solid', points: [{ x: 440, y: 250 }, { x: 296, y: 250 }] },
    { id: 'p3', color: 'blue', style: 'solid', points: [{ x: 250, y: 250 }, { x: 250, y: 110 }, { x: 52, y: 110 }] },
    // appoint chaudière → bas du ballon (chaud)
    { id: 'p4', color: 'red', style: 'solid', points: [{ x: 100, y: 360 }, { x: 100, y: 430 }, { x: 500, y: 430 }, { x: 500, y: 358 }] },
    // ECS (vert, pointillé) en sortie haute
    { id: 'p5', color: 'green', style: 'dashed', points: [{ x: 520, y: 142 }, { x: 520, y: 80 }, { x: 680, y: 80 }] },
    // circuit chauffage (chaud) vers radiateur
    { id: 'p6', color: 'red', style: 'solid', points: [{ x: 560, y: 250 }, { x: 600, y: 250 }, { x: 600, y: 360 }] },
  ],
  probes: [
    { id: 's1', kind: 'sonde', x: 178, y: 108, binding: 'vbus:capteur_solaire', label: 'Capteur' },
    { id: 's2', kind: 'sonde', x: 500, y: 175, binding: 'vbus:ballon_haut', label: 'Ballon haut' },
    { id: 's3', kind: 'sonde', x: 500, y: 330, binding: 'vbus:ballon_bas', label: 'Ballon bas' },
    { id: 'd1', kind: 'debitmetre', x: 340, y: 250, binding: 'debit1', label: 'Débit solaire' },
  ],
};

const LIVE: SchemaLive = {
  temps: { 'vbus:capteur_solaire': 62.4, 'vbus:ballon_haut': 57.8, 'vbus:ballon_bas': 39.1 },
  debits: { debit1: 184 },
  pumpOn: true,
};

function Thumb({ def }: { def: ComponentDef }) {
  const pad = 6;
  return (
    <svg viewBox={`${-pad} ${-pad} ${def.w + pad * 2} ${def.h + pad * 2}`}
      style={{ width: '100%', height: 64 }} preserveAspectRatio="xMidYMid meet">
      {def.render()}
    </svg>
  );
}

export default function SchemaLabPage() {
  const [q, setQ] = useState('');
  const results = useMemo(() => searchComponents(q), [q]);
  const byCat = useMemo(
    () => CATEGORIES.map((cat) => ({ cat, items: results.filter((c) => c.category === cat) }))
      .filter((g) => g.items.length > 0),
    [results],
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Éditeur de schéma — aperçu</h1>
          <p className="text-[14px] text-[#6e6e73] mt-1">
            Phase 1 : moteur de rendu + boutique de composants. Le glisser-déposer arrive en phase 2.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Plan (rendu lecture seule + live simulé) */}
          <div className="app-card p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-[#1d1d1f]">{SAMPLE.installation_name}</h2>
              <span className="text-[12px] text-[#8e8e93]">données simulées</span>
            </div>
            <div className="rounded-2xl bg-white border border-[#e5e5ea] overflow-hidden">
              <SchemaCanvas schema={SAMPLE} live={LIVE} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px] text-[#6e6e73]">
              <span><span style={{ color: '#FF3B30' }}>▬</span> chaud / départ</span>
              <span><span style={{ color: '#0071e3' }}>▬</span> froid / retour</span>
              <span><span style={{ color: '#34C759' }}>▬</span> ECS / glycol</span>
              <span>┄ pointillé</span>
            </div>
          </div>

          {/* Boutique */}
          <div className="app-card p-4 h-fit">
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-3">Boutique</h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un composant…"
              className="app-input w-full mb-4"
            />
            <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
              {byCat.length === 0 && <p className="text-[13px] text-[#8e8e93]">Aucun composant trouvé.</p>}
              {byCat.map(({ cat, items }) => (
                <div key={cat}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8e8e93] mb-2">{cat}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((def) => (
                      <div key={def.type}
                        className="rounded-xl border border-[#e5e5ea] bg-white p-2 hover:border-[#0071e3] transition-colors cursor-grab"
                        title={def.name}>
                        <Thumb def={def} />
                        <p className="text-[11px] text-center text-[#3a3a3c] mt-1 leading-tight">{def.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
