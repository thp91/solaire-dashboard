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
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Clients</h1>
        <span className="text-sm text-[#6e6e73]">{orgs.length} client{orgs.length > 1 ? 's' : ''}</span>
      </div>

      {/* Formulaire création */}
      <form onSubmit={createOrg} className="bg-[#ffffff] rounded-2xl shadow p-5 flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du client / société"
          className="flex-1 border border-[#e5e5ea] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-5 py-2 bg-[#0071e3] hover:bg-[#0071e3] text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {saving ? 'Création…' : '+ Nouveau client'}
        </button>
      </form>

      {/* Liste */}
      <div className="bg-[#ffffff] rounded-2xl shadow divide-y divide-[#e5e5ea]">
        {loading ? (
          <p className="p-6 text-[#6e6e73] text-sm">Chargement…</p>
        ) : orgs.length === 0 ? (
          <p className="p-6 text-[#6e6e73] text-sm">Aucun client. Créez le premier ci-dessus.</p>
        ) : (
          orgs.map((org) => (
            <Link key={org.id} href={`/admin/organizations/${org.id}`}
              className="flex items-center justify-between p-5 hover:bg-[#f5f5f7] transition group"
            >
              <div>
                <p className="font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition">{org.name}</p>
                <p className="text-xs text-[#8e8e93] mt-0.5">
                  Créé le {new Date(org.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className="text-[#8e8e93] group-hover:text-[#0071e3] text-lg transition">→</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
