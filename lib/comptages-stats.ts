import { createAdminClient } from '@/lib/supabase-admin';
import { DEFAULT_TARIF } from '@/lib/energy-constants';

export type ComptageMonthPoint = { month: string; kwh: number; eur: number };
export type ComptageStats = {
  idx: number;
  type: string;                 // 'solaire' | 'chauffage'
  label: string | null;
  totalKwh: number;
  totalEur: number;             // économies (solaire uniquement)
  months: ComptageMonthPoint[];
};

// Stats mensuelles par comptage (depuis comptages_daily). Solaire → économie, chauffage → suivi.
export async function getComptagesStats(deviceId: string): Promise<ComptageStats[]> {
  const admin = createAdminClient();
  const [{ data: comptages }, { data: daily }, { data: cfg }] = await Promise.all([
    admin.from('device_comptages').select('idx, type, label, enabled').eq('device_id', deviceId),
    admin.from('comptages_daily').select('idx, date, energy_wh').eq('device_id', deviceId).order('date', { ascending: true }),
    admin.from('energy_config').select('tarif_kwh').eq('device_id', deviceId).maybeSingle(),
  ]);

  const tarif = cfg?.tarif_kwh != null ? Number(cfg.tarif_kwh) : DEFAULT_TARIF;
  const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

  return (comptages ?? [])
    .filter((c) => c.enabled)
    .sort((a, b) => a.idx - b.idx)
    .map((c) => {
      const byMonth = new Map<string, number>();
      for (const d of (daily ?? []).filter((r) => r.idx === c.idx)) {
        const m = String(d.date).slice(0, 7);
        byMonth.set(m, (byMonth.get(m) ?? 0) + Number(d.energy_wh) / 1000);
      }
      const months = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, kwh]) => ({
          month,
          kwh: round(kwh),
          eur: c.type === 'solaire' ? round(kwh * tarif, 2) : 0,
        }));
      const totalKwh = months.reduce((a, m) => a + m.kwh, 0);
      return {
        idx: c.idx, type: c.type, label: c.label,
        totalKwh: round(totalKwh),
        totalEur: c.type === 'solaire' ? round(totalKwh * tarif, 2) : 0,
        months,
      };
    });
}
