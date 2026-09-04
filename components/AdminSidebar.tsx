'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV = [
  { href: '/admin',               icon: '◈', label: 'Vue d\'ensemble' },
  { href: '/admin/organizations', icon: '◉', label: 'Clients'         },
  { href: '/admin/devices',       icon: '▣', label: 'Modules'         },
  { href: '/admin/firmware',      icon: '↑', label: 'Firmware'        },
  { href: '/admin/users',         icon: '◎', label: 'Utilisateurs'    },
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
    <aside className="w-60 glass flex flex-col border-r border-[var(--separator)] min-h-screen">
      <div className="p-5 border-b border-[var(--separator)]">
        <Image src="/logo.png" alt="EnerVisio" width={130} height={52} className="object-contain" priority />
        <p className="text-[12px] text-[#6e6e73] font-medium mt-2 ml-0.5">Administration</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition ${
                active
                  ? 'bg-[#0071e3] text-white'
                  : 'text-[#6e6e73] hover:bg-[#e5e5ea] hover:text-[#1d1d1f]'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--separator)]">
        <p className="text-[12px] text-[#6e6e73] truncate mb-3">{userEmail}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-[#6e6e73] hover:text-[#FF3B30] transition px-1"
        >
          Se déconnecter →
        </button>
      </div>
    </aside>
  );
}
