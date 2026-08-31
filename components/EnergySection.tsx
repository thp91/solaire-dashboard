'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Props = { deviceId: string };

type DailyRow = { date: string; stats: { kwh: number; pompe_on_count: number } };

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
      setMonthKwh(Math.round(monthRows.reduce((a, r) => a + ((r.stats as any)?.kwh ?? 0), 0) * 10) / 10);

      const { data: yearRows } = await supabase
        .from('etats_daily')
        .select('stats')
        .eq('device_id', deviceId)
        .gte('date', yearStart);

      setYearKwh(Math.round((yearRows ?? []).reduce((a, r) => a + ((r.stats as any)?.kwh ?? 0), 0) * 10) / 10);
    }
    load();
  }, [deviceId]);

  const chartData = last30.map((r) => ({
    date: r.date.slice(5),
    kwh:  (r.stats as any)?.kwh ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card label="Puissance actuelle" value={`${(powerW / 1000).toFixed(2)} kW`} color="#00D4FF" sub="en temps réel" />
        <Card label="Ce mois"            value={`${monthKwh} kWh`}                   color="#42F5A7" sub="production mensuelle" />
        <Card label="Cette année"        value={`${yearKwh} kWh`}                    color="#42F5A7" sub="production annuelle" />
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-[#7A8A99] mb-4 uppercase tracking-widest">Production journalière — 30 derniers jours (kWh)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2D42" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#7A8A99' }}
                axisLine={{ stroke: '#1A2D42' }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                unit=" kWh"
                tick={{ fontSize: 10, fill: '#7A8A99' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#050B12', border: '1px solid #1A2D42', borderRadius: '12px', fontSize: 12 }}
                labelStyle={{ color: '#7A8A99' }}
                itemStyle={{ color: '#42F5A7' }}
                formatter={(v) => [`${Number(v).toFixed(2)} kWh`, 'Production']}
              />
              <Bar dataKey="kwh" fill="#42F5A7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-4 text-center">
      <p className="text-[10px] text-[#7A8A99] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#7A8A99] mt-1">{sub}</p>}
    </div>
  );
}
