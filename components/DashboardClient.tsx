'use client';

import { useEffect, useState } from 'react';
import { supabase, Temperature, Etat, Debit, DeviceSensor } from '@/lib/supabase';
import TemperatureChart from '@/components/TemperatureChart';
import LiveMetricsPanel from '@/components/LiveMetricsPanel';
import Controls from '@/components/Controls';
import HistorySection from '@/components/HistorySection';
import ClientNavbar from '@/components/ClientNavbar';
import DeviceStatus from '@/components/DeviceStatus';
import SolarSchemaView, { SchemaLiveData } from '@/components/SolarSchemaView';
import EnergySection from '@/components/EnergySection';
import AlertBanner from '@/components/AlertBanner';
import DeviceSettings from '@/components/DeviceSettings';
import SensorLabels from '@/components/SensorLabels';
import ClientTabs from '@/components/ClientTabs';
import EconomicsSummary from '@/components/EconomicsSummary';
import LiveGauge from '@/components/LiveGauge';
import { SchemaConfig } from '@/lib/schema-types';
import type { Economics } from '@/lib/economics';
import type { DeviceGeo } from '@/lib/device-geo';

const HISTORY_SIZE = 60;

type Props = {
  deviceId: string;
  isAdmin?: boolean;
  multiDevice?: boolean;
  showHistory?: boolean;
  economics?: Economics | null;
  geo?: DeviceGeo | null;
};

export default function DashboardClient({
  deviceId, isAdmin, multiDevice, showHistory = true, economics = null, geo = null,
}: Props) {
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [lastEtat, setLastEtat]         = useState<Etat | null>(null);
  const [lastDebit, setLastDebit]       = useState<Debit | null>(null);
  const [lastSeen, setLastSeen]         = useState<string | null>(null);
  const [publishing, setPublishing]     = useState<boolean>(true);
  const [deviceName, setDeviceName]     = useState<string | null>(null);
  const [schema, setSchema]             = useState<SchemaConfig | null>(null);
  const [sensors, setSensors]           = useState<DeviceSensor[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: temps },
        { data: etats },
        { data: debits },
        { data: device },
        { data: schemaRow },
        { data: sondes },
      ] = await Promise.all([
        supabase.from('temperatures').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(HISTORY_SIZE),
        supabase.from('etats').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(1),
        supabase.from('debits').select('*').eq('device_id', deviceId)
          .order('recorded_at', { ascending: false }).limit(1),
        supabase.from('devices').select('last_seen, publishing, name').eq('id', deviceId).single(),
        supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
        supabase.from('device_sensors').select('address, role, last_temp, last_seen, active')
          .eq('device_id', deviceId).order('created_at', { ascending: true }),
      ]);

      if (temps)      setTemperatures([...temps].reverse());
      if (etats?.[0]) setLastEtat(etats[0]);
      if (debits?.[0]) setLastDebit(debits[0]);
      if (device) {
        setLastSeen(device.last_seen); setPublishing(device.publishing ?? true);
        setDeviceName(device.name ?? null);
      }
      if (schemaRow?.config) setSchema(schemaRow.config as SchemaConfig);
      if (sondes) setSensors(sondes as DeviceSensor[]);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'device_sensors',
          filter: `device_id=eq.${deviceId}` }, async () => {
          const { data } = await supabase.from('device_sensors')
            .select('address, role, last_temp, last_seen, active')
            .eq('device_id', deviceId).order('created_at', { ascending: true });
          if (data) setSensors(data as DeviceSensor[]);
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
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      {!isAdmin && <ClientNavbar deviceId={deviceId} showBack={multiDevice} />}
      {!isAdmin && <ClientTabs deviceId={deviceId} active="overview" />}

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-3 pb-1">
            <div>
              {isAdmin && <p className="eyebrow mb-1.5">Module</p>}
              <h1 className="text-[30px] leading-tight font-semibold text-[#1d1d1f] tracking-tight">
                {deviceName || schema?.installation_name || (isAdmin ? deviceId : 'Mon installation')}
              </h1>
              {isAdmin && <p className="text-[12px] text-[#8e8e93] font-mono mt-1">{deviceId}</p>}
            </div>
            <div className="flex items-center gap-3">
              <DeviceStatus lastSeen={lastSeen} publishing={publishing} />
              {isAdmin && (
                <a href={`/admin/devices/${deviceId}/schema`}
                  className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">
                  Schéma
                </a>
              )}
              {isAdmin && (
                <a href={`/admin/devices/${deviceId}/public`}
                  className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">
                  QR technicien
                </a>
              )}
            </div>
          </div>

          {/* Cadran température + heure + météo du lieu */}
          <LiveGauge data={lastTemp ?? null} location={geo?.location ?? null} lat={geo?.lat ?? null} lon={geo?.lon ?? null} />

          {/* Alertes */}
          <AlertBanner deviceId={deviceId} isAdmin={isAdmin} />

          {/* Schéma interactif */}
          {schema && <SolarSchemaView config={schema} live={liveForSchema} />}
          {!schema && isAdmin && (
            <div className="app-card p-8 text-center">
              <p className="text-[#6e6e73] text-[15px] mb-4">Aucun schéma configuré pour ce module.</p>
              <a href={`/admin/devices/${deviceId}/schema`} className="btn btn-primary">
                Configurer le schéma
              </a>
            </div>
          )}

          {/* Mesures en temps réel — regroupées dans une seule carte, cellules grises */}
          <LiveMetricsPanel lastTemp={lastTemp ?? null} etat={lastEtat} debit={lastDebit} sensors={sensors} />

          {temperatures.length > 0
            ? <TemperatureChart data={temperatures} />
            : (
              <div className="app-card p-12 text-center text-[#6e6e73] text-[15px]">
                En attente de données…
              </div>
            )
          }

          {/* Économies & impact */}
          {economics && <EconomicsSummary eco={economics} />}

          {/* Énergie */}
          <div className="app-card p-6 space-y-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Énergie solaire</h2>
            <EnergySection deviceId={deviceId} />
          </div>

          {isAdmin && <SensorLabels deviceId={deviceId} />}
          {isAdmin && <DeviceSettings deviceId={deviceId} />}
          {isAdmin && <Controls deviceId={deviceId} />}
          {showHistory && <HistorySection deviceId={deviceId} />}
        </div>
      </main>
    </div>
  );
}
