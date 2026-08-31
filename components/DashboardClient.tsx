'use client';

import { useEffect, useState } from 'react';
import { supabase, Temperature, Etat, Debit } from '@/lib/supabase';
import TemperatureChart from '@/components/TemperatureChart';
import StatusCards from '@/components/StatusCards';
import Controls from '@/components/Controls';
import HistorySection from '@/components/HistorySection';
import ClientNavbar from '@/components/ClientNavbar';
import DeviceStatus from '@/components/DeviceStatus';
import SolarSchemaView, { SchemaLiveData } from '@/components/SolarSchemaView';
import EnergySection from '@/components/EnergySection';
import AlertBanner from '@/components/AlertBanner';
import DeviceSettings from '@/components/DeviceSettings';
import { SchemaConfig } from '@/lib/schema-types';

const HISTORY_SIZE = 60;

type Props = { deviceId: string; isAdmin?: boolean; multiDevice?: boolean };

export default function DashboardClient({ deviceId, isAdmin, multiDevice }: Props) {
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [lastEtat, setLastEtat]         = useState<Etat | null>(null);
  const [lastDebit, setLastDebit]       = useState<Debit | null>(null);
  const [lastSeen, setLastSeen]         = useState<string | null>(null);
  const [publishing, setPublishing]     = useState<boolean>(true);
  const [deviceName, setDeviceName]     = useState<string | null>(null);
  const [schema, setSchema]             = useState<SchemaConfig | null>(null);

  useEffect(() => {
    async function load() {
      const [
        { data: temps },
        { data: etats },
        { data: debits },
        { data: device },
        { data: schemaRow },
      ] = await Promise.all([
        supabase.from('temperatures').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(HISTORY_SIZE),
        supabase.from('etats').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(1),
        supabase.from('debits').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(1),
        supabase.from('devices').select('last_seen, publishing, name').eq('id', deviceId).single(),
        supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
      ]);

      if (temps)      setTemperatures([...temps].reverse());
      if (etats?.[0]) setLastEtat(etats[0]);
      if (debits?.[0]) setLastDebit(debits[0]);
      if (device) { setLastSeen(device.last_seen); setPublishing(device.publishing ?? true); setDeviceName(device.name ?? null); }
      if (schemaRow?.config) setSchema(schemaRow.config as SchemaConfig);
    }
    load();
  }, [deviceId]);

  useEffect(() => {
    let currentChannel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let mounted = true;

    function cleanup() {
      if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null; }
      if (currentChannel) { supabase.removeChannel(currentChannel); currentChannel = null; }
    }

    async function subscribe() {
      if (!mounted) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        retryTimeout = setTimeout(subscribe, 2000);
        return;
      }

      cleanup();

      currentChannel = supabase
        .channel(`solaire-${deviceId}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'temperatures',
          filter: `device_id=eq.${deviceId}` }, (payload) => {
          setTemperatures((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), payload.new as Temperature]);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'etats',
          filter: `device_id=eq.${deviceId}` }, (payload) => {
          setLastEtat(payload.new as Etat);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debits',
          filter: `device_id=eq.${deviceId}` }, (payload) => {
          setLastDebit(payload.new as Debit);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices',
          filter: `id=eq.${deviceId}` }, (payload) => {
          const d = payload.new as { last_seen?: string; publishing?: boolean };
          if (d.last_seen) setLastSeen(d.last_seen);
          if (typeof d.publishing === 'boolean') setPublishing(d.publishing);
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            cleanup();
            retryTimeout = setTimeout(subscribe, 5000);
          }
        });
    }

    subscribe();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      cleanup();
      subscribe();
    });

    return () => {
      mounted = false;
      cleanup();
      authSub.unsubscribe();
    };
  }, [deviceId]);

  const lastTemp = temperatures[temperatures.length - 1];

  const liveForSchema: SchemaLiveData = {
    capteur_solaire: lastTemp?.capteur_solaire,
    ballon_haut:     lastTemp?.ballon_haut,
    ballon_bas:      lastTemp?.ballon_bas,
    retour_solaire:  lastTemp?.retour_solaire,
    ambiance:        lastTemp?.ambiance,
    lph:             lastDebit?.lph,
    pompe_solaire:   lastEtat?.pompe_solaire,
  };

  return (
    <div className="min-h-screen bg-[#050B12] flex flex-col">
      {!isAdmin && <ClientNavbar deviceId={deviceId} showBack={multiDevice} />}

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
            <div>
              {isAdmin && <p className="text-[10px] text-[#7A8A99] uppercase tracking-widest mb-1">Module</p>}
              <h1 className="text-2xl font-bold text-[#F5FAFF] tracking-tight">
                {deviceName || schema?.installation_name || (isAdmin ? deviceId : 'Mon installation')}
              </h1>
              {isAdmin && <p className="text-xs text-[#1A2D42] font-mono mt-0.5">{deviceId}</p>}
            </div>
            <div className="flex items-center gap-3">
              <DeviceStatus lastSeen={lastSeen} publishing={publishing} />
              {isAdmin && (
                <a href={`/admin/devices/${deviceId}/schema`}
                  className="px-3 py-1.5 text-xs border border-[#1A2D42] rounded-xl text-[#7A8A99] hover:bg-[#0B1B2B] hover:border-[#7A8A99] hover:text-[#F5FAFF] transition">
                  Schéma
                </a>
              )}
            </div>
          </div>

          {/* Alertes */}
          <AlertBanner deviceId={deviceId} isAdmin={isAdmin} />

          {/* Schéma interactif */}
          {schema && <SolarSchemaView config={schema} live={liveForSchema} />}
          {!schema && isAdmin && (
            <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6 text-center">
              <p className="text-[#7A8A99] text-sm mb-3">Aucun schéma configuré pour ce module.</p>
              <a href={`/admin/devices/${deviceId}/schema`}
                className="inline-block px-5 py-2 bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20 rounded-xl text-sm font-semibold transition">
                Configurer le schéma →
              </a>
            </div>
          )}

          {/* Températures instantanées VBus */}
          {lastTemp && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lastTemp.capteur_solaire != null && (
                  <TempCard label="Capteur solaire" value={lastTemp.capteur_solaire} color="#FFD166" />
                )}
                {lastTemp.ballon_haut != null && (
                  <TempCard label="Ballon haut" value={lastTemp.ballon_haut} color="#00D4FF" />
                )}
                {lastTemp.ballon_bas != null && (
                  <TempCard label="Ballon bas" value={lastTemp.ballon_bas} color="#42F5A7" />
                )}
                {lastTemp.retour_solaire != null && (
                  <TempCard label="Retour solaire" value={lastTemp.retour_solaire} color="#a78bfa" />
                )}
                {lastTemp.ambiance != null && (
                  <TempCard label="Ambiance" value={lastTemp.ambiance} color="#7A8A99" />
                )}
              </div>

              {/* Sondes additionnelles DS18B20 */}
              {[1, 2, 3, 4, 5].some((n) => (lastTemp as any)[`sonde_${n}`] != null) && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const v = (lastTemp as any)[`sonde_${n}`];
                    return v != null ? (
                      <TempCard key={n} label={`Sonde ${n}`} value={v} color="#42F5A7" border />
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}

          <StatusCards etat={lastEtat} debit={lastDebit} esp32Temp={lastTemp?.esp32_temp} />

          {temperatures.length > 0
            ? <TemperatureChart data={temperatures} />
            : (
              <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-10 text-center text-[#7A8A99]">
                En attente de données…
              </div>
            )
          }

          {/* Énergie */}
          <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#F5FAFF]">Énergie solaire</h2>
            <EnergySection deviceId={deviceId} />
          </div>

          {isAdmin && <DeviceSettings deviceId={deviceId} />}
          {isAdmin && <Controls deviceId={deviceId} />}
          <HistorySection deviceId={deviceId} />
        </div>
      </main>
    </div>
  );
}

function TempCard({ label, value, color, border }: { label: string; value: number; color: string; border?: boolean }) {
  return (
    <div className={`bg-[#0B1B2B] rounded-2xl p-4 text-center ${border ? 'border border-[#42F5A7]/20' : 'border border-[#1A2D42]'}`}>
      <p className="text-[10px] text-[#7A8A99] uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{Number(value).toFixed(1)}°C</p>
    </div>
  );
}
