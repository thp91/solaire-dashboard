'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, DeviceComptage, DeviceSensor } from '@/lib/supabase';

const VBUS_SOURCES: { field: string; label: string }[] = [
  { field: 'capteur_solaire', label: 'Capteur solaire' },
  { field: 'ballon_haut',     label: 'Ballon haut' },
  { field: 'ballon_bas',      label: 'Ballon bas' },
  { field: 'retour_solaire',  label: 'Retour solaire' },
  { field: 'ambiance',        label: 'Ambiance' },
];

type Draft = Partial<DeviceComptage>;

function encodeSrc(kind: string | null | undefined, ref: string | null | undefined) {
  return kind && ref ? `${kind}:${ref}` : '';
}

export default function ComptagesConfig({ deviceId }: { deviceId: string }) {
  const [rows, setRows]     = useState<Record<number, Draft>>({ 1: {}, 2: {} });
  const [sensors, setSensors] = useState<DeviceSensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<number | null>(null);

  const load = useCallback(async () => {
    const [{ data: comptages }, { data: sondes }] = await Promise.all([
      supabase.from('device_comptages').select('*').eq('device_id', deviceId),
      supabase.from('device_sensors').select('address, role, last_temp, last_seen, active')
        .eq('device_id', deviceId).not('role', 'is', null),
    ]);
    const map: Record<number, Draft> = { 1: { idx: 1, type: 'solaire', debit_source: 1 }, 2: { idx: 2, type: 'chauffage', debit_source: 2 } };
    for (const c of (comptages ?? []) as DeviceComptage[]) map[c.idx] = c;
    setRows(map);
    setSensors((sondes as DeviceSensor[]) ?? []);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  const sourceOptions = [
    ...VBUS_SOURCES.map((s) => ({ value: `vbus:${s.field}`, label: `${s.label} (VBus)` })),
    ...sensors.map((s) => ({ value: `sonde:${s.role}`, label: `${s.role} (sonde)` })),
  ];

  function set(idx: number, patch: Draft) {
    setRows((r) => ({ ...r, [idx]: { ...r[idx], ...patch } }));
  }

  async function save(idx: number) {
    setSaving(idx);
    const d = rows[idx];
    await fetch('/api/admin/comptage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId, idx,
        type: d.type ?? 'solaire',
        enabled: !!d.enabled,
        label: d.label ?? null,
        debit_source: d.debit_source ?? idx,
        depart_kind: d.depart_kind ?? null, depart_ref: d.depart_ref ?? null,
        retour_kind: d.retour_kind ?? null, retour_ref: d.retour_ref ?? null,
      }),
    });
    await load();
    setSaving(null);
  }

  return (
    <div className="app-card p-6 space-y-5">
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Comptages d'énergie</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1 max-w-lg leading-relaxed">
          Jusqu'à 2 circuits. Chaque comptage = 1 débitmètre + une sonde <strong>départ</strong> et
          <strong> retour</strong> → énergie = débit × ΔT. Le <em>solaire</em> compte comme économie, le
          <em> chauffage</em> comme suivi de consommation.
        </p>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#8e8e93]">Chargement…</p>
      ) : (
        [1, 2].map((idx) => {
          const d = rows[idx];
          return (
            <div key={idx} className="bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-semibold text-[#1d1d1f]">Comptage {idx}</span>
                <label className="flex items-center gap-2 text-[13px] text-[#6e6e73]">
                  <input type="checkbox" checked={!!d.enabled} onChange={(e) => set(idx, { enabled: e.target.checked })} />
                  Activé
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select className="app-input !py-1.5 !text-[14px]" value={d.type ?? 'solaire'}
                    onChange={(e) => set(idx, { type: e.target.value as 'solaire' | 'chauffage' })}>
                    <option value="solaire">Solaire (économie)</option>
                    <option value="chauffage">Chauffage (suivi)</option>
                  </select>
                </Field>
                <Field label="Débitmètre">
                  <select className="app-input !py-1.5 !text-[14px]" value={d.debit_source ?? idx}
                    onChange={(e) => set(idx, { debit_source: Number(e.target.value) })}>
                    <option value={1}>Débit 1 (GPIO33)</option>
                    <option value={2}>Débit 2 (GPIO4)</option>
                  </select>
                </Field>
                <Field label="Source départ (chaud)">
                  <SourceSelect options={sourceOptions} value={encodeSrc(d.depart_kind, d.depart_ref)}
                    onChange={(kind, ref) => set(idx, { depart_kind: kind, depart_ref: ref })} />
                </Field>
                <Field label="Source retour (froid)">
                  <SourceSelect options={sourceOptions} value={encodeSrc(d.retour_kind, d.retour_ref)}
                    onChange={(kind, ref) => set(idx, { retour_kind: kind, retour_ref: ref })} />
                </Field>
              </div>

              <div className="flex justify-end">
                <button onClick={() => save(idx)} disabled={saving === idx} className="btn btn-primary !py-1.5 !px-3.5 !text-[13px]">
                  {saving === idx ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] text-[#6e6e73] mb-1">{label}</label>
      {children}
    </div>
  );
}

function SourceSelect({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (kind: 'vbus' | 'sonde' | null, ref: string | null) => void;
}) {
  return (
    <select
      className="app-input !py-1.5 !text-[14px]"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null, null);
        const i = v.indexOf(':');
        onChange(v.slice(0, i) as 'vbus' | 'sonde', v.slice(i + 1));
      }}
    >
      <option value="">— Choisir —</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
