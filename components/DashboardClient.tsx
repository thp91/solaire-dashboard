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
import { SchemaConfig } from '@/lib/schema-types';

const HISTORY_SIZE = 60;

type Props = { deviceId: string; isAdmin?: boolean; multiDevice?: boolean };

export default function DashboardClient({ deviceId, isAdmin, multiDevice }: Props) {
  const [temperatures, setTemperatures] = useState<Temperature[]>([]);
  const [lastEtat, setLastEtat]         = useState<Etat | null>(null);
  const [lastDebit, setLastDebit]       = useState<Debit | null>(null);
  const [lastSeen, setLastSeen]         = useState<string | null>(null);
  const [publishing, setPublishing]     = useState<boolean>(true);
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
        supabase.from('devices').select('last_seen, publishing').eq('id', deviceId).single(),
        supabase.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
      ]);

      if (temps)      setTemperatures([...temps].reverse());
      if (etats?.[0]) setLastEtat(etats[0]);
      if (debits?.[0]) setLastDebit(debits[0]);
      if (device) { setLastSeen(device.last_seen); setPublishing(device.publishing ?? true); }
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

      // Attendre que la session soit chargée — nécessaire pour que RLS passe
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session) {
        // Réessayer dans 2s si pas encore de session
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

    // Re-subscribe si la session change (login/logout/refresh)
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!isAdmin && <ClientNavbar deviceId={deviceId} showBack={multiDevice} />}

      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              {isAdmin && <p className="text-xs text-gray-400 mb-0.5">Module</p>}
              <h1 className="text-2xl font-bold text-gray-800">
                {schema?.installation_name || (isAdmin ? deviceId : '☀️ Mon installation')}
              </h1>
              {isAdmin && <p className="text-xs text-gray-300 mt-0.5">{deviceId}</p>}
            </div>
            <div className="flex items-center gap-3">
              <DeviceStatus lastSeen={lastSeen} publishing={publishing} />
              {isAdmin && (
                <a href={`/admin/devices/${deviceId}/schema`}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition">
                  ⚙ Schéma
                </a>
              )}
            </div>
          </div>

          {/* Schéma interactif */}
          {schema && (
            <SolarSchemaView config={schema} live={liveForSchema} />
          )}
          {!schema && isAdmin && (
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <p className="text-gray-400 text-sm mb-3">Aucun schéma configuré pour ce module.</p>
              <a href={`/admin/devices/${deviceId}/schema`}
                className="inline-block px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition">
                Configurer le schéma →
              </a>
            </div>
          )}

          {/* Températures instantanées — VBus régulation */}
          {lastTemp && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lastTemp.capteur_solaire != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Capteur solaire</p>
                    <p className="text-2xl font-bold text-orange-500">{Number(lastTemp.capteur_solaire).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.ballon_haut != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Ballon haut</p>
                    <p className="text-2xl font-bold text-blue-600">{Number(lastTemp.ballon_haut).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.ballon_bas != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Ballon bas</p>
                    <p className="text-2xl font-bold text-cyan-600">{Number(lastTemp.ballon_bas).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.retour_solaire != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Retour solaire</p>
                    <p className="text-2xl font-bold text-purple-600">{Number(lastTemp.retour_solaire).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.ambiance != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Ambiance</p>
                    <p className="text-2xl font-bold text-gray-500">{Number(lastTemp.ambiance).toFixed(1)}°C</p>
                  </div>
                )}
              </div>

              {/* Sondes additionnelles DS18B20 */}
              <div className="grid grid-cols-3 gap-3">
                {lastTemp.sonde_1 != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center border border-green-100">
                    <p className="text-xs text-gray-400 mb-1">🌡 Sonde 1</p>
                    <p className="text-2xl font-bold text-green-600">{Number(lastTemp.sonde_1).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.sonde_2 != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center border border-green-100">
                    <p className="text-xs text-gray-400 mb-1">🌡 Sonde 2</p>
                    <p className="text-2xl font-bold text-green-600">{Number(lastTemp.sonde_2).toFixed(1)}°C</p>
                  </div>
                )}
                {lastTemp.sonde_3 != null && (
                  <div className="bg-white rounded-2xl shadow p-4 text-center border border-green-100">
                    <p className="text-xs text-gray-400 mb-1">🌡 Sonde 3</p>
                    <p className="text-2xl font-bold text-green-600">{Number(lastTemp.sonde_3).toFixed(1)}°C</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <StatusCards etat={lastEtat} debit={lastDebit} />

          {temperatures.length > 0
            ? <TemperatureChart data={temperatures} />
            : <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">En attente de données…</div>
          }

          {isAdmin && <Controls deviceId={deviceId} />}
          <HistorySection deviceId={deviceId} />
        </div>
      </main>
    </div>
  );
}
