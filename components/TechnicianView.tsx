'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import DeviceStatus from '@/components/DeviceStatus';
import SolarSchemaView, { SchemaLiveData } from '@/components/SolarSchemaView';
import type { PublicSnapshot } from '@/lib/public-snapshot';

type Props = { token: string; initial: PublicSnapshot };

const POLL_MS = 5000;

const TEMP_FIELDS: { key: keyof NonNullable<PublicSnapshot['temps']>; label: string; color: string }[] = [
  { key: 'capteur_solaire', label: 'Capteur solaire', color: '#FF9500' },
  { key: 'ballon_haut',     label: 'Ballon haut',     color: '#0071e3' },
  { key: 'ballon_bas',      label: 'Ballon bas',      color: '#34C759' },
  { key: 'retour_solaire',  label: 'Retour solaire',  color: '#AF52DE' },
  { key: 'ambiance',        label: 'Ambiance',        color: '#6e6e73' },
];

export default function TechnicianView({ token, initial }: Props) {
  const [snap, setSnap] = useState<PublicSnapshot>(initial);
  // null au premier rendu (SSR) pour éviter tout écart d'hydratation sur l'heure.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    setUpdatedAt(new Date());
    async function poll() {
      try {
        const res = await fetch(`/api/public/${token}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as PublicSnapshot;
        if (mounted) { setSnap(data); setUpdatedAt(new Date()); }
      } catch { /* réseau instable : on réessaiera au prochain tick */ }
    }
    const id = setInterval(poll, POLL_MS);
    return () => { mounted = false; clearInterval(id); };
  }, [token]);

  const t = snap.temps;
  const sensors = snap.sensors ?? [];

  const live: SchemaLiveData = {
    capteur_solaire: t?.capteur_solaire,
    ballon_haut:     t?.ballon_haut,
    ballon_bas:      t?.ballon_bas,
    retour_solaire:  t?.retour_solaire,
    ambiance:        t?.ambiance,
    lph:             snap.debit?.lph,
    pompe_solaire:   snap.etat?.pompe_solaire,
  };

  const pumpOn = snap.etat?.pompe_solaire;

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
      {/* En-tête verre dépoli */}
      <header className="glass sticky top-0 z-40 border-b border-[var(--separator)] px-5 py-3 flex items-center justify-between">
        <Image src="/logo.png" alt="EnerVisio" width={96} height={38} className="object-contain" priority />
        <DeviceStatus lastSeen={snap.status.last_seen} publishing={snap.status.publishing} />
      </header>

      <main className="flex-1 px-5 py-7">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Titre */}
          <div>
            <p className="eyebrow mb-1">Supervision temps réel</p>
            <h1 className="text-[26px] leading-tight font-semibold text-[#1d1d1f] tracking-tight">
              {snap.device.name ?? 'Installation solaire'}
            </h1>
            {snap.device.location && (
              <p className="text-[14px] text-[#6e6e73] mt-0.5">{snap.device.location}</p>
            )}
          </div>

          {/* Températures */}
          {t && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMP_FIELDS.map(({ key, label, color }) =>
                  t[key] != null ? (
                    <TempCard key={key} label={label} value={t[key] as number} color={color} />
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* Sondes DS18B20 (par rôle, tolérantes à la panne) */}
          {sensors.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {sensors.map((s) => (
                <SensorCard key={s.role} label={s.role} temp={s.last_temp} faulted={sensorFaulted(s)} />
              ))}
            </div>
          )}

          {/* État pompe + débits */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Pompe solaire"
              value={pumpOn ? 'En marche' : 'Arrêtée'}
              color={pumpOn ? '#34C759' : '#6e6e73'}
              dot={pumpOn ? '#34C759' : '#8e8e93'}
              pulse={!!pumpOn}
            />
            <StatCard
              label="Débit 1"
              value={snap.debit ? `${Number(snap.debit.lph).toFixed(0)} L/h` : '—'}
              color="#1d1d1f" dot="#0071e3"
            />
            <StatCard
              label="Débit 2"
              value={snap.debit ? `${Number(snap.debit.lph_2).toFixed(0)} L/h` : '—'}
              color="#1d1d1f" dot="#0071e3"
            />
          </div>

          {/* Schéma interactif */}
          {snap.schema && <SolarSchemaView config={snap.schema} live={live} />}

          {!t && (
            <div className="app-card p-12 text-center text-[#6e6e73] text-[15px]">
              En attente de données du module…
            </div>
          )}

          {/* Pied de page */}
          <div className="pt-2 flex items-center justify-center gap-2 text-[12px] text-[#8e8e93]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
            Données temps réel · lecture seule
            {updatedAt && <> · mis à jour à {updatedAt.toLocaleTimeString('fr-FR')}</>}
          </div>
        </div>
      </main>
    </div>
  );
}

function TempCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="app-card p-4">
      <p className="text-[12px] text-[#6e6e73] font-medium tracking-tight mb-2">{label}</p>
      <p className="text-[26px] font-semibold tracking-tight tabular-nums" style={{ color }}>
        {Number(value).toFixed(1)}
        <span className="text-[#8e8e93] text-[17px] font-medium">°C</span>
      </p>
    </div>
  );
}

function sensorFaulted(s: { active: boolean; last_seen: string | null }) {
  if (!s.active || !s.last_seen) return true;
  return Date.now() - new Date(s.last_seen).getTime() > 120_000; // > 2 min → panne
}

function SensorCard({ label, temp, faulted }: { label: string; temp: number | null; faulted: boolean }) {
  return (
    <div className="app-card p-4">
      <p className="text-[12px] text-[#6e6e73] font-medium tracking-tight mb-2">{label}</p>
      {faulted ? (
        <p className="text-[15px] font-semibold text-[#FF3B30]">⚠️ Défectueuse</p>
      ) : (
        <p className="text-[26px] font-semibold tracking-tight tabular-nums text-[#34C759]">
          {temp != null ? Number(temp).toFixed(1) : '—'}
          <span className="text-[#8e8e93] text-[17px] font-medium">°C</span>
        </p>
      )}
    </div>
  );
}

function StatCard({
  label, value, color, dot, pulse,
}: {
  label: string; value: string; color: string; dot: string; pulse?: boolean;
}) {
  return (
    <div className="app-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: dot }} />
        <span className="text-[12px] text-[#6e6e73] font-medium tracking-tight">{label}</span>
      </div>
      <span className="text-[19px] font-semibold tracking-tight" style={{ color }}>{value}</span>
    </div>
  );
}
