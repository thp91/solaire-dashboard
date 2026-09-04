'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Temperature } from '@/lib/supabase';

type Props = { data: Temperature[] };

const SERIES = [
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#FF9500' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#0071e3' },
  { key: 'ballon_bas',      label: 'Ballon bas',       color: '#34C759' },
  { key: 'retour_solaire',  label: 'Retour solaire',   color: '#AF52DE' },
  { key: 'ambiance',        label: 'Ambiance',         color: '#6e6e73' },
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
    <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-2xl p-6">
      <h2 className="text-base font-semibold text-[#1d1d1f] mb-5 tracking-tight">Températures (°C)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6e6e73' }}
            axisLine={{ stroke: '#e5e5ea' }}
            tickLine={false}
          />
          <YAxis
            unit="°C"
            tick={{ fontSize: 10, fill: '#6e6e73' }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e5e5ea', borderRadius: '12px', fontSize: 12 }}
            labelStyle={{ color: '#6e6e73' }}
            itemStyle={{ color: '#1d1d1f' }}
            formatter={(v) => v != null ? `${Number(v).toFixed(1)} °C` : '—'}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6e6e73', paddingTop: 16 }} />
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
