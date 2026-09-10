'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SchemaEditor from '@/components/SchemaEditor';
import { type CustomSchema, isCustomSchema } from '@/lib/schema-custom';

export default function SchemaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: deviceId } = use(params);
  const [initial, setInitial] = useState<CustomSchema | null>(null);
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
      if (sch?.config && isCustomSchema(sch.config)) setInitial(sch.config as CustomSchema);
      const roles = [...new Set((sensors ?? []).map((s: { role: string | null }) => s.role).filter(Boolean) as string[])];
      setSensorRoles(roles);
      setLoading(false);
    })();
  }, [deviceId]);

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div>
            <Link href="/admin" className="text-[13px] text-[#0071e3] hover:underline">← Admin</Link>
            <h1 className="text-[26px] font-semibold text-[#1d1d1f] tracking-tight mt-1">Éditeur de schéma</h1>
            <p className="text-[14px] text-[#6e6e73]">{deviceName}</p>
          </div>
        </div>

        {loading
          ? <div className="app-card p-10 text-center text-[#8e8e93] text-[14px]">Chargement…</div>
          : <SchemaEditor deviceId={deviceId} initial={initial} deviceName={deviceName} sensorRoles={sensorRoles} />}
      </div>
    </div>
  );
}
