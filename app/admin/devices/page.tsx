'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Device, Organization } from '@/lib/supabase';

export default function DevicesAdminPage() {
  const [devices, setDevices]   = useState<Device[]>([]);
  const [orgs, setOrgs]         = useState<Organization[]>([]);
  const [loading, setLoading]   = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  async function load() {
    const [{ data: devs }, { data: orgsList }] = await Promise.all([
      supabase.from('devices').select('*').order('last_seen', { ascending: false, nullsFirst: false }),
      supabase.from('organizations').select('*').order('name'),
    ]);
    setDevices(devs ?? []);
    setOrgs(orgsList ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function assign(deviceId: string, orgId: string | null) {
    setAssigning(deviceId);
    await supabase.from('devices').update({ organization_id: orgId }).eq('id', deviceId);
    await load();
    setAssigning(null);
  }

  const unassigned = devices.filter((d) => !d.organization_id);
  const assigned   = devices.filter((d) => d.organization_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Modules</h1>
        <div className="flex gap-2 text-sm">
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-medium">
            {unassigned.length} non assigné{unassigned.length > 1 ? 's' : ''}
          </span>
          <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full font-medium">
            {assigned.length} assigné{assigned.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : (
        <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
          {devices.length === 0 && (
            <p className="p-6 text-gray-400 text-sm">Aucun module enregistré.</p>
          )}
          {devices.map((d) => {
            const org = orgs.find((o) => o.id === d.organization_id);
            return (
              <div key={d.id} className="flex items-center gap-4 p-4">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.organization_id ? 'bg-green-400' : 'bg-orange-400'}`} />

                <div className="flex-1 min-w-0">
                  <Link href={`/admin/devices/${d.id}`}
                    className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition"
                  >
                    {d.name ?? d.id}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {d.id} · fw {d.firmware ?? '—'} ·{' '}
                    {d.last_seen ? new Date(d.last_seen).toLocaleString('fr-FR') : 'jamais vu'}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <select
                    value={d.organization_id ?? ''}
                    onChange={(e) => assign(d.id, e.target.value || null)}
                    disabled={assigning === d.id}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                  >
                    <option value="">— Non assigné —</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {org && (
                  <Link href={`/admin/organizations/${org.id}`}
                    className="text-xs text-blue-500 hover:underline flex-shrink-0"
                  >
                    {org.name}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
