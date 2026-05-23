'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Temperature } from '@/lib/supabase';

type Props = { data: Temperature[] };

const SERIES = [
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#f97316' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#3b82f6' },
  { key: 'ballon_bas',      label: 'Ballon bas',       color: '#06b6d4' },
  { key: 'retour_solaire',  label: 'Retour solaire',   color: '#a855f7' },
  { key: 'ambiance',        label: 'Ambiance',         color: '#6b7280' },
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
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Températures (°C)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis unit="°C" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => v != null ? `${Number(v).toFixed(1)} °C` : '—'} />
          <Legend />
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
