import type { Economics } from '@/lib/economics';

// Équivalences parlantes pour le CO₂ évité (facteurs indicatifs).
const KM_PER_KG_CO2 = 1000 / 120;   // ~120 g CO₂/km voiture → km évités
const KG_CO2_PER_TREE_YEAR = 25;    // ~25 kg CO₂ absorbés / arbre / an

function fmtEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number, unit = '') {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)}${unit}`;
}

export default function EconomicsSummary({ eco }: { eco: Economics }) {
  const co2Km = Math.round(eco.totalCo2Kg * KM_PER_KG_CO2);
  const trees = Math.round(eco.totalCo2Kg / KG_CO2_PER_TREE_YEAR);

  return (
    <div className="app-card p-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Économies & impact</h2>
        <span className="text-[12px] text-[#8e8e93]">depuis la mise en service</span>
      </div>

      {/* Chiffres phares */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric big label="Économies totales" value={fmtEur(eco.totalEur)} accent="#34C759" />
        <Metric label="CO₂ évité" value={fmtNum(eco.totalCo2Kg, ' kg')} accent="#0071e3" />
        <Metric label="Production totale" value={fmtNum(eco.totalKwh, ' kWh')} accent="#FF9500" />
        <Metric label="Ce mois" value={fmtEur(eco.monthEur)} sub={`${fmtNum(eco.monthKwh, ' kWh')}`} accent="#34C759" />
      </div>

      {/* Équivalences CO₂ */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#6e6e73]">
        <span>🚗 ≈ {fmtNum(co2Km, ' km')} en voiture évités</span>
        <span>🌳 ≈ {fmtNum(trees)} arbre{trees > 1 ? 's' : ''} sur un an</span>
      </div>

      {/* Amortissement */}
      {eco.installCost != null && eco.roiPct != null && (
        <div className="border-t border-[var(--separator)] pt-4 space-y-2.5">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <p className="text-[14px] font-medium text-[#1d1d1f]">Amortissement de l'installation</p>
            <p className="text-[13px] text-[#6e6e73]">
              {fmtEur(eco.totalEur)} / {fmtEur(eco.installCost)}
              {eco.paybackDate && (
                <> · rentabilisée vers{' '}
                  <span className="text-[#1d1d1f] font-medium">
                    {new Date(eco.paybackDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="h-2.5 rounded-full bg-[#e5e5ea] overflow-hidden">
            <div className="h-full rounded-full bg-[#34C759] transition-all"
              style={{ width: `${Math.min(100, eco.roiPct)}%` }} />
          </div>
          <p className="text-[12px] text-[#8e8e93]">
            {eco.roiPct >= 100 ? 'Installation rentabilisée 🎉' : `${eco.roiPct}% remboursé`}
            {eco.annualEur != null && eco.roiPct < 100 && <> · ~{fmtEur(eco.annualEur)}/an au rythme actuel</>}
          </p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, accent, big }: {
  label: string; value: string; sub?: string; accent: string; big?: boolean;
}) {
  return (
    <div className="bg-[#f2f2f7] rounded-2xl p-4">
      <p className="text-[12px] text-[#6e6e73] font-medium tracking-tight mb-1.5">{label}</p>
      <p className={`${big ? 'text-[26px]' : 'text-[22px]'} font-semibold tracking-tight`} style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="text-[12px] text-[#8e8e93] mt-0.5">{sub}</p>}
    </div>
  );
}
