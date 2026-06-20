'use client';

import { Etat, Debit } from '@/lib/supabase';

type Props = { etat: Etat | null; debit: Debit | null };

export default function StatusCards({ etat, debit }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card
        label="Pompe solaire"
        value={etat?.pompe_solaire ? 'EN MARCHE' : 'ARRÊTÉE'}
        color={etat?.pompe_solaire ? 'text-green-600' : 'text-gray-400'}
        icon={etat?.pompe_solaire ? '🟢' : '⚫'}
      />
      <Card
        label="Débit réel (GPIO)"
        value={debit ? `${Number(debit.lph).toFixed(0)} L/h` : '—'}
        color="text-blue-600"
        icon="💧"
      />
      <Card
        label="Énergie produite"
        value={etat ? `${Number(etat.energie_produite_wh).toFixed(0)} Wh` : '—'}
        color="text-orange-500"
        icon="☀️"
      />
      <Card
        label="Firmware"
        value={etat?.firmware ?? '—'}
        color="text-gray-500"
        icon="🔧"
      />
    </div>
  );
}

function Card({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 flex flex-col gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
