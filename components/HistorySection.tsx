'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type Mesure = {
  t: string;
  capteur_solaire: number;
  ballon_haut: number;
  ballon_bas: number;
  retour_solaire: number;
  ambiance: number;
};

type Stats = {
  capteur_max: number;
  capteur_min: number;
  ballon_max: number;
  ballon_min: number;
  nb_mesures: number;
};

type DebitStats = {
  lph_max: number;
  lph_moy: number;
  nb_mesures: number;
};

type EtatStats = {
  energie_totale_wh: number;
  pompe_on_count: number;
  nb_mesures: number;
};

const SERIES = [
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#FFD166' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#00D4FF' },
  { key: 'ballon_bas',      label: 'Ballon bas',       color: '#42F5A7' },
  { key: 'retour_solaire',  label: 'Retour solaire',   color: '#a78bfa' },
  { key: 'ambiance',        label: 'Ambiance',         color: '#7A8A99' },
] as const;

type Props = { deviceId: string };

export default function HistorySection({ deviceId }: Props) {
  const [date, setDate]         = useState('');
  const [mesures, setMesures]   = useState<Mesure[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [debitStats, setDebitStats] = useState<DebitStats | null>(null);
  const [etatStats, setEtatStats]   = useState<EtatStats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  async function load() {
    if (!date) return;
    setLoading(true);
    setSearched(true);

    const [{ data: tempDay }, { data: debitDay }, { data: etatDay }] = await Promise.all([
      supabase.from('temperatures_daily').select('mesures, stats').eq('device_id', deviceId).eq('date', date).single(),
      supabase.from('debits_daily').select('stats').eq('device_id', deviceId).eq('date', date).single(),
      supabase.from('etats_daily').select('stats').eq('device_id', deviceId).eq('date', date).single(),
    ]);

    setMesures(tempDay?.mesures ?? []);
    setStats(tempDay?.stats ?? null);
    setDebitStats(debitDay?.stats ?? null);
    setEtatStats(etatDay?.stats ?? null);
    setLoading(false);
  }

  return (
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6 space-y-6">
      <h2 className="text-base font-semibold text-[#F5FAFF]">Historique journalier</h2>

      <div className="flex gap-3 items-center">
        <input
          type="date"
          value={date}
          max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[#050B12] border border-[#1A2D42] rounded-xl px-4 py-2.5 text-sm text-[#F5FAFF] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition [color-scheme:dark]"
        />
        <button
          onClick={load}
          disabled={!date || loading}
          className="px-4 py-2.5 bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20 rounded-xl text-sm font-semibold transition disabled:opacity-50"
        >
          {loading ? 'Chargement…' : 'Voir'}
        </button>
      </div>

      {searched && !loading && mesures.length === 0 && (
        <p className="text-[#7A8A99] text-sm">Aucune donnée archivée pour cette date.</p>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Capteur max"     value={`${stats.capteur_max}°C`}           color="#FFD166" />
          <StatCard label="Capteur min"     value={`${stats.capteur_min}°C`}           color="#00D4FF" />
          <StatCard label="Ballon max"      value={`${stats.ballon_max}°C`}            color="#42F5A7" />
          <StatCard label="Mesures"         value={`${stats.nb_mesures}`}              color="#7A8A99" />
          {debitStats && <StatCard label="Débit max"      value={`${debitStats.lph_max} L/h`}  color="#00D4FF" />}
          {debitStats && <StatCard label="Débit moyen"    value={`${debitStats.lph_moy} L/h`}  color="#00D4FF" />}
          {etatStats && <StatCard label="Énergie totale" value={`${etatStats.energie_totale_wh} Wh`} color="#FFD166" />}
          {etatStats && (etatStats as any).kwh != null && (
            <StatCard label="Production"    value={`${(etatStats as any).kwh} kWh`}   color="#42F5A7" />
          )}
          {etatStats && <StatCard label="Pompe ON"       value={`${Math.round(etatStats.pompe_on_count * 5 / 60)} min`} color="#42F5A7" />}
        </div>
      )}

      {mesures.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A2D42" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: '#7A8A99' }}
              axisLine={{ stroke: '#1A2D42' }}
              tickLine={false}
              interval={Math.floor(mesures.length / 8)}
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
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#050B12] border border-[#1A2D42] rounded-xl p-3">
      <p className="text-[10px] text-[#7A8A99] uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
