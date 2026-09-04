'use client';

import { Etat, Debit } from '@/lib/supabase';

type Props = { etat: Etat | null; debit: Debit | null; esp32Temp?: number | null };

export default function StatusCards({ etat, debit, esp32Temp }: Props) {
  const pumpOn = etat?.pompe_solaire;
  const esp32Hot = esp32Temp != null && esp32Temp > 80;

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card
        label="Pompe solaire"
        value={pumpOn ? 'En marche' : 'Arrêtée'}
        valueColor={pumpOn ? '#34C759' : '#6e6e73'}
        dot={pumpOn ? '#34C759' : '#8e8e93'}
        pulse={pumpOn}
      />
      <Card
        label="Débit 1"
        value={debit ? `${Number(debit.lph).toFixed(0)} L/h` : '—'}
        valueColor="#1d1d1f"
        dot="#0071e3"
      />
      <Card
        label="Débit 2"
        value={debit ? `${Number(debit.lph_2).toFixed(0)} L/h` : '—'}
        valueColor="#1d1d1f"
        dot="#0071e3"
      />
      <Card
        label="Énergie produite"
        value={etat ? `${Number(etat.energie_produite_wh).toFixed(0)} Wh` : '—'}
        valueColor="#1d1d1f"
        dot="#FF9500"
      />
      <Card
        label="Temp. ESP32"
        value={esp32Temp != null ? `${Number(esp32Temp).toFixed(1)}°C` : '—'}
        valueColor={esp32Hot ? '#FF3B30' : '#1d1d1f'}
        dot={esp32Hot ? '#FF3B30' : '#8e8e93'}
      />
      <Card
        label="Firmware"
        value={etat?.firmware ?? '—'}
        valueColor="#6e6e73"
        dot="#8e8e93"
      />
    </div>
  );
}

function Card({
  label, value, valueColor, dot, pulse,
}: {
  label: string; value: string; valueColor: string; dot: string; pulse?: boolean;
}) {
  return (
    <div className="app-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dot }}
        />
        <span className="text-[12px] text-[#6e6e73] font-medium tracking-tight">{label}</span>
      </div>
      <span className="text-[19px] font-semibold tracking-tight" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
