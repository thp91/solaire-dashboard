'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Props = { deviceId: string; showBack?: boolean };

export default function ClientNavbar({ deviceId, showBack }: Props) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="glass sticky top-0 z-40 border-b border-[var(--separator)] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <Image src="/logo.png" alt="EnerVisio" width={104} height={42} className="object-contain" priority />
        {showBack && (
          <Link href="/" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition">
            ← Mes modules
          </Link>
        )}
      </div>
      <div className="flex items-center gap-5">
        <span className="text-[12px] text-[#8e8e93] hidden sm:block font-mono">{deviceId}</span>
        <button
          onClick={logout}
          className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
