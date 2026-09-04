'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  SchemaConfig, TemplateId, TEMPLATE_SLOTS, DATA_FIELD_OPTIONS, defaultConfig,
} from '@/lib/schema-types';

export default function SchemaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deviceId } = use(params);

  const [config, setConfig]   = useState<SchemaConfig>(defaultConfig('1_ballon'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle()
      .then(({ data }) => {
        if (data?.config) setConfig(data.config as SchemaConfig);
        setLoading(false);
      });
  }, [deviceId]);

  // Quand on change de template, on réinitialise les slots (en gardant les labels)
  function changeTemplate(t: TemplateId) {
    const fresh = defaultConfig(t);
    // Réutilise les labels existants si le slot existe déjà
    for (const key of Object.keys(fresh.slots)) {
      if (config.slots[key]) {
        fresh.slots[key].label = config.slots[key].label || fresh.slots[key].label;
        fresh.slots[key].enabled = config.slots[key].enabled;
        fresh.slots[key].field = config.slots[key].field ?? fresh.slots[key].field;
      }
    }
    setConfig({ ...fresh, installation_name: config.installation_name,
      show_debit: config.show_debit, show_ecs: config.show_ecs });
  }

  function updateSlot(key: string, patch: Partial<typeof config.slots[string]>) {
    setConfig((c) => ({ ...c, slots: { ...c.slots, [key]: { ...c.slots[key], ...patch } } }));
  }

  async function save() {
    setSaving(true);
    await supabase.from('device_schemas').upsert(
      { device_id: deviceId, config, updated_at: new Date().toISOString() },
      { onConflict: 'device_id' },
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const slots = TEMPLATE_SLOTS[config.template];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/devices/${deviceId}`} className="text-[#6e6e73] hover:text-[#6e6e73] text-sm transition">
          ← Module
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Configurer le schéma</h1>
      </div>

      {loading ? (
        <p className="text-[#6e6e73] text-sm">Chargement…</p>
      ) : (
        <div className="space-y-5">

          {/* Template + nom */}
          <div className="bg-[#ffffff] rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-semibold text-[#1d1d1f]">Installation</h2>

            <div>
              <label className="text-xs text-[#6e6e73] uppercase tracking-wide block mb-1">
                Nom de l'installation
              </label>
              <input
                value={config.installation_name}
                onChange={(e) => setConfig((c) => ({ ...c, installation_name: e.target.value }))}
                placeholder="Ex: Résidence Dupont — Chaufferie"
                className="w-full border border-[#e5e5ea] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div>
              <label className="text-xs text-[#6e6e73] uppercase tracking-wide block mb-1">
                Template
              </label>
              <div className="flex gap-3">
                {(['1_ballon', '2_ballons'] as TemplateId[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTemplate(t)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition border ${
                      config.template === t
                        ? 'bg-[#0071e3] text-white border-[#0071e3]'
                        : 'bg-[#ffffff] text-[#6e6e73] border-[#e5e5ea] hover:border-[#0071e3]'
                    }`}
                  >
                    {t === '1_ballon' ? '1 Ballon' : '2 Ballons en série'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-6 pt-1">
              {[
                { key: 'show_debit', label: 'Débitmètre' },
                { key: 'show_ecs',   label: 'Appoint ECS' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!config[key as keyof SchemaConfig]}
                    onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm text-[#1d1d1f]">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sondes */}
          <div className="bg-[#ffffff] rounded-2xl shadow p-6 space-y-3">
            <h2 className="font-semibold text-[#1d1d1f]">Sondes</h2>
            <p className="text-xs text-[#6e6e73]">
              Activez les sondes présentes et mappez-les à la mesure correspondante.
            </p>

            <div className="space-y-2 pt-1">
              {slots.map(({ key, defaultLabel }) => {
                const slot = config.slots[key] ?? { enabled: false, field: null, label: defaultLabel };
                return (
                  <div key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl transition ${
                      slot.enabled ? 'bg-[#e5e5ea] border border-[#e5e5ea]' : 'bg-[#f5f5f7] border border-transparent'
                    }`}
                  >
                    {/* Enable toggle */}
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(e) => updateSlot(key, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded accent-blue-500 flex-shrink-0"
                    />

                    {/* Label */}
                    <input
                      value={slot.label}
                      onChange={(e) => updateSlot(key, { label: e.target.value })}
                      disabled={!slot.enabled}
                      placeholder={defaultLabel}
                      className="flex-1 min-w-0 border border-[#e5e5ea] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-40 bg-[#ffffff]"
                    />

                    {/* Field mapping */}
                    <select
                      value={slot.field ?? ''}
                      onChange={(e) => updateSlot(key, { field: (e.target.value || null) as typeof slot.field })}
                      disabled={!slot.enabled}
                      className="border border-[#e5e5ea] rounded-lg px-2 py-1.5 text-xs focus:outline-none disabled:opacity-40 bg-[#ffffff]"
                    >
                      {DATA_FIELD_OPTIONS.map((o) => (
                        <option key={String(o.value)} value={o.value ?? ''}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <Link href={`/admin/devices/${deviceId}`}
              className="px-5 py-2 border border-[#e5e5ea] rounded-xl text-sm text-[#6e6e73] hover:bg-[#f5f5f7] transition">
              Annuler
            </Link>
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2 bg-[#0071e3] hover:bg-[#0071e3] text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
