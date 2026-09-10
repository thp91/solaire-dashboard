'use client';

import { DeviceComptage } from '@/lib/supabase';

export default function ComptagesPanel({ comptages }: { comptages: DeviceComptage[] }) {
  const active = comptages.filter((c) => c.enabled);
  if (active.length === 0) return null;

  return (
    <div className="app-card p-6 space-y-4">
      <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Comptages d'énergie</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {active.map((c) => {
          const solaire = c.type === 'solaire';
          const kW = (Number(c.last_power_w ?? 0) / 1000);
          const kWh = (Number(c.last_energy_wh ?? 0) / 1000);
          const accent = solaire ? '#FF9500' : '#0071e3';
          return (
            <div key={c.idx} className="bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[14px] font-semibold text-[#1d1d1f]">
                  {c.label || (solaire ? 'Solaire' : 'Chauffage')}
                </span>
                <span className="pill text-[11px]" style={{ background: `${accent}1f`, color: accent }}>
                  {solaire ? 'Solaire · économie' : 'Chauffage · suivi'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-[#8e8e93] font-medium">Puissance</p>
                  <p className="text-[22px] font-semibold tracking-tight tabular-nums" style={{ color: accent }}>
                    {kW.toFixed(2)}<span className="text-[#8e8e93] text-[15px] font-medium"> kW</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8e8e93] font-medium">Énergie du jour</p>
                  <p className="text-[22px] font-semibold tracking-tight tabular-nums text-[#1d1d1f]">
                    {kWh.toFixed(2)}<span className="text-[#8e8e93] text-[15px] font-medium"> kWh</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
