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
        value={pumpOn ? 'EN MARCHE' : 'ARRÊTÉE'}
        valueColor={pumpOn ? '#42F5A7' : '#7A8A99'}
        dot={pumpOn ? '#42F5A7' : '#7A8A99'}
        pulse={pumpOn}
      />
      <Card
        label="Débit 1"
        value={debit ? `${Number(debit.lph).toFixed(0)} L/h` : '—'}
        valueColor="#00D4FF"
        dot="#00D4FF"
      />
      <Card
        label="Débit 2"
        value={debit ? `${Number(debit.lph_2).toFixed(0)} L/h` : '—'}
        valueColor="#00D4FF"
        dot="#00D4FF"
      />
      <Card
        label="Énergie produite"
        value={etat ? `${Number(etat.energie_produite_wh).toFixed(0)} Wh` : '—'}
        valueColor="#FFD166"
        dot="#FFD166"
      />
      <Card
        label="Temp. ESP32"
        value={esp32Temp != null ? `${Number(esp32Temp).toFixed(1)}°C` : '—'}
        valueColor={esp32Hot ? '#FF4D6D' : '#7A8A99'}
        dot={esp32Hot ? '#FF4D6D' : '#1A2D42'}
      />
      <Card
        label="Firmware"
        value={etat?.firmware ?? '—'}
        valueColor="#7A8A99"
        dot="#1A2D42"
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
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: dot }}
        />
        <span className="text-[10px] text-[#7A8A99] uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-lg font-bold font-[var(--font-space-grotesk)]" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
