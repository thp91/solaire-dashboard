import { createAdminClient } from '@/lib/supabase-admin';
import { CO2_KG_PER_KWH, DEFAULT_TARIF, kwhFromStats } from '@/lib/energy-constants';

export { CO2_KG_PER_KWH, DEFAULT_TARIF };

export type Economics = {
  tarif: number;
  installCost: number | null;
  firstDate: string | null;
  totalKwh: number;
  totalEur: number;
  totalCo2Kg: number;
  monthKwh: number;
  monthEur: number;
  yearKwh: number;
  yearEur: number;
  // Amortissement (si coût d'installation renseigné)
  roiPct: number | null;         // % du coût déjà remboursé
  annualEur: number | null;      // économies annualisées estimées
  paybackYears: number | null;   // durée totale d'amortissement estimée
  paybackDate: string | null;    // date estimée de rentabilisation (ISO)
};

export type MonthPoint = { month: string; kwh: number; eur: number; co2Kg: number };

type DailyRow = { date: string; stats: { kwh?: number; energie_totale_wh?: number } | null };

async function fetchDaily(deviceId: string): Promise<DailyRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('etats_daily')
    .select('date, stats')
    .eq('device_id', deviceId)
    .order('date', { ascending: true });
  return (data ?? []) as DailyRow[];
}

async function fetchConfig(deviceId: string): Promise<{ tarif: number; installCost: number | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('energy_config')
    .select('tarif_kwh, install_cost')
    .eq('device_id', deviceId)
    .maybeSingle();
  return {
    tarif: data?.tarif_kwh != null ? Number(data.tarif_kwh) : DEFAULT_TARIF,
    installCost: data?.install_cost != null ? Number(data.install_cost) : null,
  };
}

const kwhOf = (r: DailyRow) => kwhFromStats(r.stats);
const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

export async function getEconomics(deviceId: string): Promise<Economics> {
  const [rows, cfg] = await Promise.all([fetchDaily(deviceId), fetchConfig(deviceId)]);

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearStr = String(now.getFullYear());

  const totalKwh = rows.reduce((a, r) => a + kwhOf(r), 0);
  const monthKwh = rows.filter((r) => r.date.startsWith(monthStr)).reduce((a, r) => a + kwhOf(r), 0);
  const yearKwh = rows.filter((r) => r.date.startsWith(yearStr)).reduce((a, r) => a + kwhOf(r), 0);

  const totalEur = totalKwh * cfg.tarif;
  const firstDate = rows[0]?.date ?? null;

  // Amortissement
  let roiPct: number | null = null;
  let annualEur: number | null = null;
  let paybackYears: number | null = null;
  let paybackDate: string | null = null;

  if (cfg.installCost && cfg.installCost > 0 && firstDate) {
    roiPct = round((totalEur / cfg.installCost) * 100, 1);
    const spanDays = Math.max(1, (now.getTime() - new Date(firstDate).getTime()) / 86_400_000);
    if (spanDays >= 14 && totalEur > 0) {
      annualEur = (totalEur / spanDays) * 365;
      paybackYears = round(cfg.installCost / annualEur, 1);
      const d = new Date(firstDate);
      d.setDate(d.getDate() + Math.round(paybackYears * 365));
      paybackDate = d.toISOString();
    }
  }

  return {
    tarif: cfg.tarif,
    installCost: cfg.installCost,
    firstDate,
    totalKwh: round(totalKwh, 1),
    totalEur: round(totalEur, 2),
    totalCo2Kg: round(totalKwh * CO2_KG_PER_KWH, 1),
    monthKwh: round(monthKwh, 1),
    monthEur: round(monthKwh * cfg.tarif, 2),
    yearKwh: round(yearKwh, 1),
    yearEur: round(yearKwh * cfg.tarif, 2),
    roiPct,
    annualEur: annualEur != null ? round(annualEur, 2) : null,
    paybackYears,
    paybackDate,
  };
}

/** Série mensuelle depuis la création du module. */
export async function getMonthlySeries(deviceId: string): Promise<MonthPoint[]> {
  const [rows, cfg] = await Promise.all([fetchDaily(deviceId), fetchConfig(deviceId)]);
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const m = r.date.slice(0, 7); // YYYY-MM
    byMonth.set(m, (byMonth.get(m) ?? 0) + kwhOf(r));
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, kwh]) => ({
      month,
      kwh: round(kwh, 1),
      eur: round(kwh * cfg.tarif, 2),
      co2Kg: round(kwh * CO2_KG_PER_KWH, 1),
    }));
}
