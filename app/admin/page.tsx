import { createSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function AdminOverview() {
  const supabase = await createSupabaseServer();

  const [
    { count: orgCount },
    { count: deviceCount },
    { count: userCount },
    { data: recentDevices },
    { count: unassignedCount },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('devices').select('id, name, firmware, last_seen, organization_id')
      .order('last_seen', { ascending: false }).limit(5),
    supabase.from('devices').select('*', { count: 'exact', head: true }).is('organization_id', null),
  ]);

  const stats = [
    { label: 'Clients',          value: orgCount ?? 0,        icon: '🏢', href: '/admin/organizations', color: 'text-[#0071e3]' },
    { label: 'Modules total',    value: deviceCount ?? 0,     icon: '🖥️', href: '/admin/devices',       color: 'text-[#1d1d1f]' },
    { label: 'Non assignés',     value: unassignedCount ?? 0, icon: '⚠️', href: '/admin/devices',       color: 'text-[#FF9500]' },
    { label: 'Utilisateurs',     value: userCount ?? 0,       icon: '👥', href: '/admin/users',         color: 'text-[#AF52DE]' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f]">Vue d&apos;ensemble</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="app-card p-5 hover:bg-[#e5e5ea] transition group"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-3xl font-bold ${s.color} group-hover:scale-105 transition`}>
              {s.value}
            </div>
            <div className="text-xs text-[#6e6e73] mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Modules récents */}
      <div className="app-card p-6">
        <h2 className="text-lg font-semibold text-[#1d1d1f] mb-4">Dernière activité</h2>
        {(recentDevices ?? []).length === 0 ? (
          <p className="text-[#6e6e73] text-sm">Aucun module enregistré.</p>
        ) : (
          <div className="space-y-2">
            {(recentDevices ?? []).map((d) => (
              <Link key={d.id} href={`/admin/devices/${d.id}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#f5f5f7] transition"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${d.organization_id ? 'bg-[#34C759]' : 'bg-[#FF9500]'}`} />
                  <div>
                    <p className="text-sm font-medium text-[#1d1d1f]">{d.name ?? d.id}</p>
                    <p className="text-xs text-[#6e6e73]">Firmware {d.firmware ?? '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-[#8e8e93]">
                  {d.last_seen ? new Date(d.last_seen).toLocaleString('fr-FR') : '—'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
