'use client';

import { useEffect, useState } from 'react';
import { supabase, Alerte } from '@/lib/supabase';

type Props = { deviceId: string; isAdmin?: boolean };

export default function AlertBanner({ deviceId, isAdmin }: Props) {
  const [alertes, setAlertes] = useState<Alerte[]>([]);

  useEffect(() => {
    supabase
      .from('alertes')
      .select('*')
      .eq('device_id', deviceId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAlertes((data as Alerte[]) ?? []));
  }, [deviceId]);

  async function resolve(id: number) {
    await supabase.from('alertes').update({ resolved: true }).eq('id', id);
    setAlertes((prev) => prev.filter((a) => a.id !== id));
  }

  if (alertes.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertes.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-2xl px-4 py-3"
        >
          <span className="text-base mt-0.5">{a.type === 'antigel' ? '❄️' : '⚠️'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#FF9500]">{a.message}</p>
            <p className="text-xs text-[#6e6e73] mt-0.5">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => resolve(a.id)}
              className="text-xs text-[#6e6e73] hover:text-[#FF9500] font-medium whitespace-nowrap transition"
            >
              Résoudre
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
