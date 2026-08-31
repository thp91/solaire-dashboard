'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Temperature } from '@/lib/supabase';

type Props = { data: Temperature[] };

const SERIES = [
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#FFD166' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#00D4FF' },
  { key: 'ballon_bas',      label: 'Ballon bas',       color: '#42F5A7' },
  { key: 'retour_solaire',  label: 'Retour solaire',   color: '#a78bfa' },
  { key: 'ambiance',        label: 'Ambiance',         color: '#7A8A99' },
] as const;

export default function TemperatureChart({ data }: Props) {
  const chartData = data.map((d) => ({
    time: new Date(d.recorded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    capteur_solaire: d.capteur_solaire,
    ballon_haut:     d.ballon_haut,
    ballon_bas:      d.ballon_bas,
    retour_solaire:  d.retour_solaire,
    ambiance:        d.ambiance,
  }));

  return (
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6">
      <h2 className="text-base font-semibold text-[#F5FAFF] mb-5 tracking-tight">Températures (°C)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2D42" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#7A8A99' }}
            axisLine={{ stroke: '#1A2D42' }}
            tickLine={false}
          />
          <YAxis
            unit="°C"
            tick={{ fontSize: 10, fill: '#7A8A99' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ background: '#050B12', border: '1px solid #1A2D42', borderRadius: '12px', fontSize: 12 }}
            labelStyle={{ color: '#7A8A99' }}
            itemStyle={{ color: '#F5FAFF' }}
            formatter={(v) => v != null ? `${Number(v).toFixed(1)} °C` : '—'}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#7A8A99', paddingTop: 16 }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
