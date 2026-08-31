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
    <aside className="w-56 bg-[#0B1B2B] flex flex-col border-r border-[#1A2D42] min-h-screen">
      <div className="p-5 border-b border-[#1A2D42]">
        <Image src="/logo.png" alt="EnerVisio" width={130} height={52} className="object-contain" priority />
        <p className="text-[10px] text-[#00D4FF] font-semibold tracking-widest uppercase mt-2 ml-0.5">Admin</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, icon, label }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20'
                  : 'text-[#7A8A99] hover:bg-[#1A2D42]/50 hover:text-[#F5FAFF]'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1A2D42]">
        <p className="text-xs text-[#7A8A99] truncate mb-3">{userEmail}</p>
        <button
          onClick={logout}
          className="w-full text-left text-xs text-[#7A8A99] hover:text-[#FF4D6D] transition px-1"
        >
          Se déconnecter →
        </button>
      </div>
    </aside>
  );
}
