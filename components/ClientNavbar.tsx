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
    <header className="bg-[#0B1B2B] border-b border-[#1A2D42] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-5">
        <Image src="/logo.png" alt="EnerVisio" width={110} height={44} className="object-contain" priority />
        {showBack && (
          <Link href="/" className="text-xs text-[#7A8A99] hover:text-[#00D4FF] transition">
            ← Mes modules
          </Link>
        )}
      </div>
      <div className="flex items-center gap-5">
        <span className="text-xs text-[#1A2D42] hidden sm:block font-mono tracking-wider">{deviceId}</span>
        <button
          onClick={logout}
          className="text-xs text-[#7A8A99] hover:text-[#FF4D6D] transition font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
