'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href: '/admin',               icon: '📊', label: 'Vue d\'ensemble' },
  { href: '/admin/organizations', icon: '🏢', label: 'Clients'         },
  { href: '/admin/devices',       icon: '🖥️', label: 'Modules'         },
  { href: '/admin/users',         icon: '👥', label: 'Utilisateurs'    },
];

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-56 bg-white shadow-sm flex flex-col border-r border-gray-100 min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">Solaire</p>
            <p className="text-xs text-orange-500 font-medium">Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate mb-2">{userEmail}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-gray-400 hover:text-red-500 transition px-1"
        >
          Se déconnecter →
        </button>
      </div>
    </aside>
  );
}
