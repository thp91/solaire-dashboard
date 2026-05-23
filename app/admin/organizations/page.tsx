'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Organization } from '@/lib/supabase';

export default function OrganizationsPage() {
  const [orgs, setOrgs]       = useState<Organization[]>([]);
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  async function load() {
    const { data } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
    setOrgs(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from('organizations').insert({ name: name.trim() });
    setName('');
    await load();
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        <span className="text-sm text-gray-400">{orgs.length} client{orgs.length > 1 ? 's' : ''}</span>
      </div>

      {/* Formulaire création */}
      <form onSubmit={createOrg} className="bg-white rounded-2xl shadow p-5 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du client / société"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? 'Création…' : '+ Nouveau client'}
        </button>
      </form>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Chargement…</p>
        ) : orgs.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">Aucun client. Créez le premier ci-dessus.</p>
        ) : (
          orgs.map((org) => (
            <Link key={org.id} href={`/admin/organizations/${org.id}`}
              className="flex items-center justify-between p-5 hover:bg-gray-50 transition group"
            >
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{org.name}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Créé le {new Date(org.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className="text-gray-300 group-hover:text-blue-400 text-lg transition">→</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
