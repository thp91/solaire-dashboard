'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">☀️</span>
        <span className="font-semibold text-gray-700 text-sm">Supervision solaire</span>
        {showBack && (
          <Link href="/" className="text-xs text-gray-400 hover:text-blue-500 transition ml-2">
            ← Mes modules
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400 hidden sm:block">{deviceId}</span>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-red-500 transition font-medium"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
