'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import { CO2_KG_PER_KWH, kwhFromStats } from '@/lib/energy-constants';

type Props = { deviceId: string; deviceName: string; tarif: number; months: string[] };

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthTitle = (m: string) => { const [y, mo] = m.split('-'); return `${MONTHS_FR[Number(mo) - 1]} ${y}`; };
const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);

type DayRow = { date: string; kwh: number; eur: number; capteurMax: number | null; pumpMin: number };

async function fetchMonth(deviceId: string, month: string, tarif: number) {
  const start = `${month}-01`;
  const d = new Date(`${start}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  const end = d.toISOString().slice(0, 10); // 1er du mois suivant

  const [{ data: etats }, { data: temps }] = await Promise.all([
    supabase.from('etats_daily').select('date, stats').eq('device_id', deviceId).gte('date', start).lt('date', end).order('date'),
    supabase.from('temperatures_daily').select('date, stats').eq('device_id', deviceId).gte('date', start).lt('date', end),
  ]);

  const tempByDate = new Map<string, number | null>();
  for (const t of temps ?? []) tempByDate.set(t.date, (t.stats as { capteur_max?: number })?.capteur_max ?? null);

  const rows: DayRow[] = (etats ?? []).map((e) => {
    const s = e.stats as { kwh?: number; energie_totale_wh?: number; pompe_on_count?: number } | null;
    const kwh = kwhFromStats(s);
    return {
      date: e.date,
      kwh: Math.round(kwh * 10) / 10,
      eur: Math.round(kwh * tarif * 100) / 100,
      capteurMax: tempByDate.get(e.date) ?? null,
      pumpMin: Math.round((s?.pompe_on_count ?? 0) * 5 / 60),
    };
  });

  const totalKwh = rows.reduce((a, r) => a + r.kwh, 0);
  return {
    rows,
    totalKwh: Math.round(totalKwh * 10) / 10,
    totalEur: Math.round(totalKwh * tarif * 100) / 100,
    totalCo2: Math.round(totalKwh * CO2_KG_PER_KWH * 10) / 10,
    activeDays: rows.filter((r) => r.kwh > 0).length,
    capteurMax: rows.reduce((m, r) => Math.max(m, r.capteurMax ?? 0), 0),
    pumpHours: Math.round(rows.reduce((a, r) => a + r.pumpMin, 0) / 60 * 10) / 10,
  };
}

export default function ReportSection({ deviceId, deviceName, tarif, months }: Props) {
  const [month, setMonth] = useState(months[months.length - 1] ?? '');
  const [busy, setBusy] = useState(false);

  async function downloadPdf() {
    if (!month) return;
    setBusy(true);
    try {
      const r = await fetchMonth(deviceId, month, tarif);
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      let y = 20;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(29, 29, 31);
      doc.text('EnerVisio', 20, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(110, 110, 115);
      doc.text('Rapport de production solaire', 20, y + 7);
      doc.setDrawColor(225, 225, 230); doc.line(20, y + 12, W - 20, y + 12);

      y += 22;
      doc.setTextColor(29, 29, 31); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text(deviceName, 20, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(110, 110, 115);
      doc.text(monthTitle(month), 20, y + 6);

      // Cartes résumé
      y += 16;
      const cards: [string, string][] = [
        ['Production', `${r.totalKwh} kWh`],
        ['Économies', fmtEur(r.totalEur)],
        ['CO2 évité', `${r.totalCo2} kg`],
        ['Jours actifs', `${r.activeDays}`],
      ];
      const cw = (W - 40) / 4;
      cards.forEach(([label, value], i) => {
        const x = 20 + i * cw;
        doc.setDrawColor(225, 225, 230); doc.setFillColor(247, 247, 249);
        doc.roundedRect(x, y, cw - 4, 22, 2, 2, 'FD');
        doc.setFontSize(8); doc.setTextColor(110, 110, 115); doc.text(label, x + 4, y + 7);
        doc.setFontSize(13); doc.setTextColor(29, 29, 31); doc.setFont('helvetica', 'bold');
        doc.text(value, x + 4, y + 16); doc.setFont('helvetica', 'normal');
      });

      // Extra
      y += 30;
      doc.setFontSize(10); doc.setTextColor(110, 110, 115);
      doc.text(`Capteur max : ${r.capteurMax} °C     Fonctionnement pompe : ${r.pumpHours} h     Tarif : ${tarif} €/kWh`, 20, y);

      // Tableau détaillé
      y += 10;
      const cols = [20, 60, 95, 135, 175];
      doc.setFillColor(240, 240, 243); doc.rect(20, y - 5, W - 40, 8, 'F');
      doc.setFontSize(9); doc.setTextColor(29, 29, 31); doc.setFont('helvetica', 'bold');
      doc.text('Date', cols[0] + 1, y);
      doc.text('Production', cols[1], y);
      doc.text('Économies', cols[2], y);
      doc.text('Capteur max', cols[3], y);
      doc.text('Pompe', cols[4], y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 67);
      y += 6;

      for (const d of r.rows) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.setDrawColor(235, 235, 238); doc.line(20, y - 3.5, W - 20, y - 3.5);
        doc.setFontSize(8.5);
        doc.text(new Date(d.date).toLocaleDateString('fr-FR'), cols[0] + 1, y);
        doc.text(`${d.kwh} kWh`, cols[1], y);
        doc.text(fmtEur(d.eur), cols[2], y);
        doc.text(d.capteurMax != null ? `${d.capteurMax} °C` : '—', cols[3], y);
        doc.text(`${d.pumpMin} min`, cols[4], y);
        y += 5.5;
      }

      doc.setFontSize(8); doc.setTextColor(150, 150, 155);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} · EnerVisio`, 20, 290);

      doc.save(`rapport-${slug(deviceName)}-${month}.pdf`);
    } finally { setBusy(false); }
  }

  async function downloadCsv() {
    if (!month) return;
    setBusy(true);
    try {
      const r = await fetchMonth(deviceId, month, tarif);
      const header = 'date,production_kwh,economies_eur,capteur_max_c,pompe_min';
      const lines = r.rows.map((d) => `${d.date},${d.kwh},${d.eur},${d.capteurMax ?? ''},${d.pumpMin}`);
      const csv = [header, ...lines].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `rapport-${slug(deviceName)}-${month}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }

  return (
    <div className="app-card p-6 space-y-4">
      <div>
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Rapports détaillés</h2>
        <p className="text-[13px] text-[#6e6e73] mt-1">Téléchargez le bilan mensuel de production et d'économies.</p>
      </div>

      {months.length === 0 ? (
        <p className="text-[14px] text-[#8e8e93]">Aucun mois disponible pour le moment.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="app-input !w-auto !py-2 pr-8"
          >
            {[...months].reverse().map((m) => (
              <option key={m} value={m}>{monthTitle(m)}</option>
            ))}
          </select>
          <button onClick={downloadPdf} disabled={busy} className="btn btn-primary !py-2">
            {busy ? '…' : 'Télécharger le PDF'}
          </button>
          <button onClick={downloadCsv} disabled={busy} className="btn btn-secondary !py-2">
            CSV
          </button>
        </div>
      )}
    </div>
  );
}

function slug(s: string) {
  return (s || 'module').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'module';
}
