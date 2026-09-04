'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { kwhFromStats } from '@/lib/energy-constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Props = { deviceId: string };

type DailyRow = { date: string; stats: { kwh?: number; energie_totale_wh?: number; pompe_on_count?: number } };

export default function EnergySection({ deviceId }: Props) {
  const [powerW, setPowerW]     = useState(0);
  const [last30, setLast30]     = useState<DailyRow[]>([]);
  const [monthKwh, setMonthKwh] = useState(0);
  const [yearKwh, setYearKwh]   = useState(0);

  useEffect(() => {
    async function load() {
      const now       = new Date();
      const monthStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const yearStart = `${now.getFullYear()}-01-01`;

      const { data: lastTemp } = await supabase
        .from('temperatures')
        .select('power_w')
        .eq('device_id', deviceId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      setPowerW(lastTemp?.power_w ?? 0);

      const { data: rows } = await supabase
        .from('etats_daily')
        .select('date,stats')
        .eq('device_id', deviceId)
        .order('date', { ascending: false })
        .limit(30);

      const sorted = (rows ?? []).reverse() as DailyRow[];
      setLast30(sorted);

      const monthRows = sorted.filter((r) => r.date.startsWith(monthStr));
      setMonthKwh(Math.round(monthRows.reduce((a, r) => a + kwhFromStats(r.stats), 0) * 10) / 10);

      const { data: yearRows } = await supabase
        .from('etats_daily')
        .select('stats')
        .eq('device_id', deviceId)
        .gte('date', yearStart);

      setYearKwh(Math.round((yearRows ?? []).reduce((a, r) => a + kwhFromStats(r.stats), 0) * 10) / 10);
    }
    load();
  }, [deviceId]);

  const chartData = last30.map((r) => ({
    date: r.date.slice(5),
    kwh:  Math.round(kwhFromStats(r.stats) * 100) / 100,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card label="Puissance actuelle" value={`${(powerW / 1000).toFixed(2)} kW`} color="#0071e3" sub="en temps réel" />
        <Card label="Ce mois"            value={`${monthKwh} kWh`}                   color="#34C759" sub="production mensuelle" />
        <Card label="Cette année"        value={`${yearKwh} kWh`}                    color="#34C759" sub="production annuelle" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-[#6e6e73] mb-4 tracking-tight">Production journalière — 30 derniers jours (kWh)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6e6e73' }}
                axisLine={{ stroke: '#e5e5ea' }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                unit=" kWh"
                tick={{ fontSize: 10, fill: '#6e6e73' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e5e5ea', borderRadius: '12px', fontSize: 12 }}
                labelStyle={{ color: '#6e6e73' }}
                itemStyle={{ color: '#34C759' }}
                formatter={(v) => [`${Number(v).toFixed(2)} kWh`, 'Production']}
              />
              <Bar dataKey="kwh" fill="#34C759" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-2xl p-4 text-center">
      <p className="text-[10px] text-[#6e6e73] tracking-tight mb-2">{label}</p>
      <p className="text-[28px] font-semibold tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#6e6e73] mt-1">{sub}</p>}
    </div>
  );
}
