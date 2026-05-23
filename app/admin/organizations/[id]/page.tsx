'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Member = { id: string; user_id: string; email?: string; created_at: string };
type Device = { id: string; name: string | null; firmware: string | null; last_seen: string | null; organization_id: string | null };
type UnassignedDevice = { id: string; name: string | null; firmware: string | null };

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orgId } = use(params);

  const [orgName, setOrgName]           = useState('');
  const [members, setMembers]           = useState<Member[]>([]);
  const [devices, setDevices]           = useState<Device[]>([]);
  const [unassigned, setUnassigned]     = useState<UnassignedDevice[]>([]);
  const [allUsers, setAllUsers]         = useState<{ id: string; email: string }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [addingUser, setAddingUser]     = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');

  async function load() {
    const [{ data: org }, { data: membersData }, { data: devicesData }, { data: unassignedData }] = await Promise.all([
      supabase.from('organizations').select('name').eq('id', orgId).single(),
      supabase.from('organization_members').select('id, user_id, created_at').eq('organization_id', orgId),
      supabase.from('devices').select('id, name, firmware, last_seen, organization_id').eq('organization_id', orgId),
      supabase.from('devices').select('id, name, firmware').is('organization_id', null),
    ]);

    setOrgName(org?.name ?? '');
    setDevices(devicesData ?? []);
    setUnassigned(unassignedData ?? []);

    // Enrichir les membres avec leurs emails via l'API admin
    const memberList = membersData ?? [];
    if (memberList.length > 0) {
      const enriched = await Promise.all(
        memberList.map(async (m) => {
          const res = await fetch(`/api/admin/user-info?id=${m.user_id}`);
          const json = await res.json();
          return { ...m, email: json.email ?? m.user_id };
        })
      );
      setMembers(enriched);
    } else {
      setMembers([]);
    }

    // Tous les utilisateurs pour le sélecteur
    const res = await fetch('/api/admin/users-list');
    const json = await res.json();
    setAllUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [orgId]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setAddingUser(true);
    await supabase.from('organization_members').insert({ user_id: selectedUser, organization_id: orgId });
    setSelectedUser('');
    await load();
    setAddingUser(false);
  }

  async function removeMember(memberId: string) {
    await supabase.from('organization_members').delete().eq('id', memberId);
    await load();
  }

  async function assignDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDevice) return;
    await supabase.from('devices').update({ organization_id: orgId }).eq('id', selectedDevice);
    setSelectedDevice('');
    await load();
  }

  async function unassignDevice(deviceId: string) {
    await supabase.from('devices').update({ organization_id: null }).eq('id', deviceId);
    await load();
  }

  const availableUsers = allUsers.filter((u) => !members.find((m) => m.user_id === u.id));

  if (loading) {
    return <div className="text-gray-400 p-6">Chargement…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/organizations" className="text-gray-400 hover:text-gray-600 transition text-sm">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{orgName}</h1>
      </div>

      {/* Membres */}
      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Utilisateurs ({members.length})</h2>

        {members.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{m.email ?? m.user_id}</p>
                  <p className="text-xs text-gray-300">
                    Ajouté le {new Date(m.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aucun utilisateur dans ce client.</p>
        )}

        {/* Ajouter un membre */}
        {availableUsers.length > 0 && (
          <form onSubmit={addMember} className="flex gap-2 pt-2 border-t border-gray-100">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Sélectionner un utilisateur…</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.email}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addingUser || !selectedUser}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Ajouter
            </button>
          </form>
        )}
      </section>

      {/* Modules assignés */}
      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Modules ({devices.length})</h2>

        {devices.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <Link href={`/admin/devices/${d.id}`} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                    {d.name ?? d.id}
                  </Link>
                  <p className="text-xs text-gray-400">
                    Firmware {d.firmware ?? '—'} ·{' '}
                    {d.last_seen ? new Date(d.last_seen).toLocaleString('fr-FR') : 'jamais vu'}
                  </p>
                </div>
                <button
                  onClick={() => unassignDevice(d.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  Désassigner
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aucun module assigné.</p>
        )}

        {/* Assigner un module non assigné */}
        {unassigned.length > 0 && (
          <form onSubmit={assignDevice} className="flex gap-2 pt-2 border-t border-gray-100">
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Assigner un module non attribué…</option>
              {unassigned.map((d) => (
                <option key={d.id} value={d.id}>{d.name ?? d.id} (fw {d.firmware ?? '—'})</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedDevice}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
            >
              Assigner
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
