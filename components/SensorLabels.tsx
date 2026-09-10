'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, DeviceSensor } from '@/lib/supabase';
import { SchemaConfig, TEMPLATE_SLOTS } from '@/lib/schema-types';
import { type CustomSchema, isCustomSchema } from '@/lib/schema-custom';

const STALE_MS = 120_000; // 2 min sans mesure → sonde en panne

function isFaulted(s: DeviceSensor) {
  if (!s.active || !s.last_seen) return true;
  return Date.now() - new Date(s.last_seen).getTime() > STALE_MS;
}

export default function SensorLabels({ deviceId }: { deviceId: string }) {
  const [sensors, setSensors] = useState<DeviceSensor[]>([]);
  const [schema, setSchema]   = useState<SchemaConfig | CustomSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAddr, setSavingAddr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: sondes }, { data: schemaRow }] = await Promise.all([
      supabase.from('device_sensors').select('address, role, last_temp, last_seen, active')
        .eq('device_id', deviceId).order('created_at', { ascending: true }),
      supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
    ]);
    setSensors((sondes as DeviceSensor[]) ?? []);
    setSchema((schemaRow?.config as SchemaConfig | CustomSchema) ?? null);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  // Emplacements proposés = les sondes posées sur le schéma personnalisé et reliées
  // à une sonde DS18B20 (le rôle est la partie après « sonde: »). Repli sur les
  // emplacements du modèle figé pour les modules pas encore migrés.
  const emplacements = !schema
    ? []
    : isCustomSchema(schema)
      ? [...new Set(
          schema.probes
            .filter((p) => p.kind === 'sonde' && p.binding?.startsWith('sonde:'))
            .map((p) => p.binding!.slice(6)),
        )]
      : TEMPLATE_SLOTS[schema.template].map((s) => schema.slots[s.key]?.label || s.defaultLabel);

  async function assign(address: string, role: string) {
    setSavingAddr(address);
    await fetch('/api/admin/sensor-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, address, role }),
    });
    await load();
    setSavingAddr(null);
  }

  return (
    <div className="app-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Sondes DS18B20</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1 max-w-lg leading-relaxed">
            Affecte chaque sonde à un <strong>emplacement du schéma</strong>. En cas de panne, la case
            reste avec une alerte ; au remplacement, la nouvelle sonde reprend l'emplacement.
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">Rafraîchir</button>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#8e8e93]">Chargement…</p>
      ) : emplacements.length === 0 ? (
        <p className="text-[14px] text-[#8e8e93]">
          Aucun emplacement affectable. Ouvre l&apos;{' '}
          <Link href={`/admin/devices/${deviceId}/schema-editor`} className="text-[#0071e3] font-medium">éditeur de schéma</Link>
          {' '}et pose des sondes reliées à « Sonde DS18B20 » pour définir les emplacements.
        </p>
      ) : sensors.length === 0 ? (
        <p className="text-[14px] text-[#8e8e93]">
          Aucune sonde détectée. Branche les sondes, attends une remontée (~5 s), puis « Rafraîchir ».
        </p>
      ) : (
        <div className="space-y-2.5">
          {sensors.map((s) => {
            const faulted = isFaulted(s);
            return (
              <div key={s.address} className="bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl p-3 flex items-center gap-3 flex-wrap">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${faulted ? 'bg-[#FF3B30]' : 'bg-[#34C759]'}`} />
                <div className="min-w-0 flex-1">
                  <select
                    value={s.role ?? ''}
                    disabled={savingAddr === s.address}
                    onChange={(e) => assign(s.address, e.target.value)}
                    className="app-input !py-1.5 !text-[14px] pr-8"
                  >
                    <option value="">— Emplacement non assigné —</option>
                    {emplacements.map((label) => {
                      // Emplacement déjà pris par une AUTRE sonde → désactivé
                      const takenByOther = sensors.some((o) => o.address !== s.address && o.role === label);
                      return (
                        <option key={label} value={label} disabled={takenByOther}>
                          {label}{takenByOther ? ' (déjà assigné)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-[#8e8e93] font-mono mt-1 truncate">
                    {s.address}
                    {' · '}
                    {faulted
                      ? <span className="text-[#FF3B30] font-sans font-medium">⚠️ défectueuse</span>
                      : <span className="font-sans">{s.last_temp != null ? `${Number(s.last_temp).toFixed(1)}°C` : '—'}</span>}
                  </p>
                </div>
                {savingAddr === s.address && <span className="text-[12px] text-[#8e8e93]">…</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
