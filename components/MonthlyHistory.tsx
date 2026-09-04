'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthPoint } from '@/lib/economics';

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTHS_FR[Number(mo) - 1]} ${y.slice(2)}`;
}

function fmtEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export default function MonthlyHistory({ data }: { data: MonthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="app-card p-10 text-center text-[#6e6e73] text-[15px]">
        Aucune donnée mensuelle pour l'instant.
      </div>
    );
  }

  const chart = data.map((d) => ({ ...d, label: monthLabel(d.month) }));

  return (
    <div className="app-card p-6 space-y-5">
      <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Historique mensuel</h2>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6e6e73' }} axisLine={{ stroke: '#e5e5ea' }} tickLine={false} />
          <YAxis unit=" kWh" tick={{ fontSize: 10, fill: '#6e6e73' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e5e5ea', borderRadius: '12px', fontSize: 12 }}
            labelStyle={{ color: '#6e6e73' }}
            formatter={(v) => [`${Number(v)} kWh`, 'Production']}
          />
          <Bar dataKey="kwh" fill="#34C759" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Tableau */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[13px] min-w-[380px]">
          <thead>
            <tr className="text-[#8e8e93] text-left border-b border-[var(--separator)]">
              <th className="font-medium py-2 px-2">Mois</th>
              <th className="font-medium py-2 px-2 text-right">Production</th>
              <th className="font-medium py-2 px-2 text-right">Économies</th>
              <th className="font-medium py-2 px-2 text-right">CO₂ évité</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.month} className="border-b border-[var(--separator)] last:border-0">
                <td className="py-2 px-2 text-[#1d1d1f] font-medium capitalize">{monthLabel(d.month)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-[#1d1d1f]">{d.kwh} kWh</td>
                <td className="py-2 px-2 text-right tabular-nums text-[#34C759] font-medium">{fmtEur(d.eur)}</td>
                <td className="py-2 px-2 text-right tabular-nums text-[#6e6e73]">{d.co2Kg} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
