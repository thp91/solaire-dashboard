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
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#f97316' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#3b82f6' },
  { key: 'ballon_bas',      label: 'Ballon bas',       color: '#06b6d4' },
  { key: 'retour_solaire',  label: 'Retour solaire',   color: '#a855f7' },
  { key: 'ambiance',        label: 'Ambiance',         color: '#6b7280' },
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
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-700">Historique journalier</h2>

      {/* Sélecteur de date */}
      <div className="flex gap-3 items-center">
        <input
          type="date"
          value={date}
          max={new Date(Date.now() - 86400000).toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={load}
          disabled={!date || loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? 'Chargement…' : 'Voir'}
        </button>
      </div>

      {/* Pas de données */}
      {searched && !loading && mesures.length === 0 && (
        <p className="text-gray-400 text-sm">Aucune donnée archivée pour cette date.</p>
      )}

      {/* Stats du jour */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Capteur max"     value={`${stats.capteur_max}°C`}           color="text-orange-500" />
          <StatCard label="Capteur min"     value={`${stats.capteur_min}°C`}           color="text-blue-400"   />
          <StatCard label="Ballon max"      value={`${stats.ballon_max}°C`}            color="text-blue-600"   />
          <StatCard label="Mesures"         value={`${stats.nb_mesures}`}              color="text-gray-500"   />
          {debitStats && (
            <StatCard label="Débit max"     value={`${debitStats.lph_max} L/h`}        color="text-cyan-600"   />
          )}
          {debitStats && (
            <StatCard label="Débit moyen"   value={`${debitStats.lph_moy} L/h`}        color="text-cyan-400"   />
          )}
          {etatStats && (
            <StatCard label="Énergie totale" value={`${etatStats.energie_totale_wh} Wh`} color="text-orange-400" />
          )}
          {etatStats && (
            <StatCard label="Pompe ON"      value={`${Math.round(etatStats.pompe_on_count * 5 / 60)} min`} color="text-green-500" />
          )}
        </div>
      )}

      {/* Graphique */}
      {mesures.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mesures}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10 }}
              interval={Math.floor(mesures.length / 8)}
            />
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
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
