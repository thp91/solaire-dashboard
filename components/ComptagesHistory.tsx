import type { ComptageStats } from '@/lib/comptages-stats';

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const monthLabel = (m: string) => { const [y, mo] = m.split('-'); return `${MONTHS_FR[Number(mo) - 1]} ${y.slice(2)}`; };
const fmtEur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function ComptagesHistory({ stats }: { stats: ComptageStats[] }) {
  if (stats.length === 0) return null;

  return (
    <div className="app-card p-6 space-y-6">
      <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Historique par comptage</h2>

      {stats.map((c) => {
        const solaire = c.type === 'solaire';
        const accent = solaire ? '#FF9500' : '#0071e3';
        return (
          <div key={c.idx} className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-[#1d1d1f]">{c.label || (solaire ? 'Solaire' : 'Chauffage')}</span>
                <span className="pill text-[11px]" style={{ background: `${accent}1f`, color: accent }}>
                  {solaire ? 'économie' : 'suivi'}
                </span>
              </div>
              <p className="text-[13px] text-[#6e6e73]">
                Total : <span className="text-[#1d1d1f] font-medium tabular-nums">{c.totalKwh} kWh</span>
                {solaire && <> · <span className="text-[#34C759] font-medium">{fmtEur(c.totalEur)}</span></>}
              </p>
            </div>

            {c.months.length === 0 ? (
              <p className="text-[13px] text-[#8e8e93]">Aucune donnée mensuelle pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-[13px] min-w-[300px]">
                  <thead>
                    <tr className="text-[#8e8e93] text-left border-b border-[var(--separator)]">
                      <th className="font-medium py-1.5 px-2">Mois</th>
                      <th className="font-medium py-1.5 px-2 text-right">Énergie</th>
                      {solaire && <th className="font-medium py-1.5 px-2 text-right">Économies</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...c.months].reverse().map((m) => (
                      <tr key={m.month} className="border-b border-[var(--separator)] last:border-0">
                        <td className="py-1.5 px-2 text-[#1d1d1f] capitalize">{monthLabel(m.month)}</td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-[#1d1d1f]">{m.kwh} kWh</td>
                        {solaire && <td className="py-1.5 px-2 text-right tabular-nums text-[#34C759] font-medium">{fmtEur(m.eur)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
