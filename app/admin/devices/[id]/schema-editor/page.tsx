'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SchemaEditor from '@/components/SchemaEditor';
import { type CustomSchema, isCustomSchema } from '@/lib/schema-custom';
import type { SchemaConfig } from '@/lib/schema-types';
import { fromTemplate } from '@/lib/schema-migrate';

export default function SchemaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deviceId } = use(params);
  const [initial, setInitial] = useState<CustomSchema | null>(null);
  const [legacy, setLegacy] = useState<SchemaConfig | null>(null);   // ancien modèle figé à reprendre
  const [ready, setReady] = useState(false);                          // choix de migration fait
  const [deviceName, setDeviceName] = useState(deviceId);
  const [sensorRoles, setSensorRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: dev }, { data: sch }, { data: sensors }] = await Promise.all([
        supabase.from('devices').select('name').eq('id', deviceId).maybeSingle(),
        supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
        supabase.from('device_sensors').select('role').eq('device_id', deviceId).not('role', 'is', null),
      ]);
      if (dev?.name) setDeviceName(dev.name);

      const cfg = sch?.config;
      if (cfg && isCustomSchema(cfg)) { setInitial(cfg as CustomSchema); setReady(true); }
      else if (cfg) setLegacy(cfg as SchemaConfig);   // ancien format → on propose la reprise
      else setReady(true);                            // rien encore → page blanche

      const roles = [...new Set((sensors ?? []).map((s: { role: string | null }) => s.role).filter(Boolean) as string[])];
      setSensorRoles(roles);
      setLoading(false);
    })();
  }, [deviceId]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <Link href="/admin" className="text-[13px] text-[#0071e3] hover:underline">← Admin</Link>
          <h1 className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight mt-1">Éditeur de schéma</h1>
          <p className="text-[14px] text-[#6e6e73]">{deviceName}</p>
        </div>

        {loading ? (
          <div className="app-card p-10 text-center text-[#8e8e93] text-[14px]">Chargement…</div>
        ) : !ready && legacy ? (
          <div className="app-card p-8 max-w-xl mx-auto text-center space-y-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Ce module utilise l&apos;ancien schéma</h2>
            <p className="text-[14px] text-[#6e6e73] leading-relaxed">
              Modèle « {legacy.template === '2_ballons' ? '2 ballons' : '1 ballon'} ». La reprise conserve vos
              <strong> libellés</strong> et vos <strong>liaisons de données</strong> ; la disposition générée est un
              point de départ que vous pourrez déplacer librement.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="btn btn-primary" onClick={() => { setInitial(fromTemplate(legacy)); setReady(true); }}>
                Reprendre l&apos;ancien schéma
              </button>
              <button className="btn btn-secondary" onClick={() => { setInitial(null); setReady(true); }}>
                Partir d&apos;une page blanche
              </button>
            </div>
            <p className="text-[12px] text-[#8e8e93]">
              Rien n&apos;est modifié tant que vous n&apos;avez pas cliqué sur « Enregistrer ».
            </p>
          </div>
        ) : (
          <SchemaEditor deviceId={deviceId} initial={initial} deviceName={deviceName} sensorRoles={sensorRoles} />
        )}
      </div>
    </div>
  );
}
