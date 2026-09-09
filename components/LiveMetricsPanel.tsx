'use client';

import { Temperature, Etat, Debit, DeviceSensor } from '@/lib/supabase';

type Props = {
  lastTemp: Temperature | null;
  etat: Etat | null;
  debit: Debit | null;
  sensors?: DeviceSensor[];
};

type Cell = { label: string; value: string; color: string };
type Group = { title: string; cells: Cell[] };

const DARK = '#1d1d1f';
const MUTED = '#6e6e73';
const RED = '#FF3B30';
const SENSOR_STALE_MS = 120_000; // 2 min sans mesure → sonde en panne

function sensorFaulted(s: DeviceSensor) {
  if (!s.active) return true;
  if (!s.last_seen) return true;
  return Date.now() - new Date(s.last_seen).getTime() > SENSOR_STALE_MS;
}

export default function LiveMetricsPanel({ lastTemp, etat, debit, sensors = [] }: Props) {
  const t = (v?: number | null) => `${Number(v).toFixed(1)}°C`;

  // ── Groupe : Températures (circuit VBus) ──
  const temps: Cell[] = [];
  if (lastTemp?.capteur_solaire != null) temps.push({ label: 'Capteur solaire', value: t(lastTemp.capteur_solaire), color: '#FF9500' });
  if (lastTemp?.ballon_haut != null)     temps.push({ label: 'Ballon haut', value: t(lastTemp.ballon_haut), color: '#0071e3' });
  if (lastTemp?.ballon_bas != null)      temps.push({ label: 'Ballon bas', value: t(lastTemp.ballon_bas), color: '#34C759' });
  if (lastTemp?.retour_solaire != null)  temps.push({ label: 'Retour solaire', value: t(lastTemp.retour_solaire), color: '#AF52DE' });
  if (lastTemp?.ambiance != null)        temps.push({ label: 'Ambiance', value: t(lastTemp.ambiance), color: MUTED });

  // ── Groupe : Sondes DS18B20 (par rôle assigné, tolérantes à la panne) ──
  const sondes: Cell[] = sensors
    .filter((s) => s.role)                       // uniquement les sondes nommées
    .map((s) => {
      const faulted = sensorFaulted(s);
      return {
        label: s.role as string,
        value: faulted ? '⚠️ Défectueuse' : (s.last_temp != null ? t(s.last_temp) : '—'),
        color: faulted ? RED : '#34C759',
      };
    });

  // ── Groupe : Circulation (pompe + débits) ──
  const pumpOn = etat?.pompe_solaire;
  const circulation: Cell[] = [
    { label: 'Pompe solaire', value: pumpOn ? 'En marche' : 'Arrêtée', color: pumpOn ? '#34C759' : MUTED },
    { label: 'Débit 1', value: debit ? `${Number(debit.lph).toFixed(0)} L/h` : '—', color: DARK },
    { label: 'Débit 2', value: debit ? `${Number(debit.lph_2).toFixed(0)} L/h` : '—', color: DARK },
  ];

  // ── Groupe : Énergie & système ──
  const esp32 = lastTemp?.esp32_temp;
  const esp32Hot = esp32 != null && esp32 > 80;
  const systeme: Cell[] = [
    { label: 'Énergie produite', value: etat ? `${Number(etat.energie_produite_wh).toFixed(0)} Wh` : '—', color: DARK },
    { label: 'Temp. ESP32', value: esp32 != null ? t(esp32) : '—', color: esp32Hot ? '#FF3B30' : DARK },
    { label: 'Firmware', value: etat?.firmware ?? '—', color: MUTED },
  ];

  const groups: Group[] = [
    { title: 'Températures', cells: temps },
    { title: 'Sondes', cells: sondes },
    { title: 'Circulation', cells: circulation },
    { title: 'Énergie & système', cells: systeme },
  ].filter((g) => g.cells.length > 0);

  return (
    <div className="app-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" />
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">Mesures en temps réel</h2>
      </div>

      <div className="space-y-5">
        {groups.map((g, i) => (
          <section
            key={g.title}
            className={i > 0 ? 'pt-5 border-t border-[var(--separator)]' : ''}
          >
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2.5">{g.title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {g.cells.map((c) => (
                <div key={c.label} className="bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl px-3 py-2.5">
                  <p className="text-[11px] text-[#8e8e93] font-medium tracking-tight mb-1">{c.label}</p>
                  <p className="text-[18px] font-semibold tracking-tight tabular-nums truncate" style={{ color: c.color }}>
                    {c.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
