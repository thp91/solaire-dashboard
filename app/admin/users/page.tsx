'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type User = { id: string; email: string; role: 'admin' | 'client'; created_at: string };

export default function UsersAdminPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<'admin' | 'client'>('client');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function load() {
    const { data } = await fetch('/api/admin/users-list').then((r) => r.json()).catch(() => ({ data: null }));
    // users-list retourne { users: [...] }
    const res = await fetch('/api/admin/users-list');
    const json = await res.json();
    setUsers(json.users ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const json = await res.json();
    if (!res.ok) {
      setCreateError(json.error ?? 'Erreur lors de la création.');
    } else {
      setEmail('');
      setPassword('');
      setRole('client');
      await load();
    }
    setCreating(false);
  }

  async function changeRole(userId: string, newRole: 'admin' | 'client') {
    await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    });
    await load();
  }

  async function deleteUser(userId: string) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
        <span className="text-sm text-gray-400">{users.length} compte{users.length > 1 ? 's' : ''}</span>
      </div>

      {/* Créer un utilisateur */}
      <form onSubmit={createUser} className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-700">Nouveau compte</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="col-span-2 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'client')}
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {createError && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{createError}</p>
        )}
        <button
          type="submit"
          disabled={creating}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {creating ? 'Création…' : '+ Créer le compte'}
        </button>
      </form>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow divide-y divide-gray-100">
        {loading ? (
          <p className="p-6 text-gray-400 text-sm">Chargement…</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-gray-400 text-sm">Aucun utilisateur.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{u.email}</p>
                <p className="text-xs text-gray-300">
                  Créé le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value as 'admin' | 'client')}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => deleteUser(u.id)}
                className="text-xs text-red-400 hover:text-red-600 transition"
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
