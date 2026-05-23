'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://76.13.128.127:3000';

type Props = { deviceId: string };

export default function Controls({ deviceId }: Props) {
  const [publishing, setPublishing] = useState<boolean | null>(null); // null = chargement
  const [loading, setLoading]       = useState(false);
  const [otaFile, setOtaFile]       = useState<File | null>(null);
  const [otaStatus, setOtaStatus]   = useState('');

  // Lecture initiale depuis la BDD
  useEffect(() => {
    supabase
      .from('devices')
      .select('publishing')
      .eq('id', deviceId)
      .single()
      .then(({ data }) => {
        if (data) setPublishing(data.publishing);
      });
  }, [deviceId]);

  // Abonnement temps réel : un autre admin peut changer l'état
  useEffect(() => {
    const channel = supabase
      .channel(`device-publishing-${deviceId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'devices',
        filter: `id=eq.${deviceId}`,
      }, (payload) => {
        const updated = payload.new as { publishing?: boolean };
        if (typeof updated.publishing === 'boolean') {
          setPublishing(updated.publishing);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deviceId]);

  async function toggleFlux() {
    if (publishing === null) return;
    setLoading(true);
    const action = publishing ? 'pompe_off' : 'pompe_on';

    // 1. Commande MQTT via le backend
    await fetch(`${API}/devices/${deviceId}/commande`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    // 2. Persiste l'état en BDD
    const next = !publishing;
    await supabase.from('devices').update({ publishing: next }).eq('id', deviceId);
    setPublishing(next);
    setLoading(false);
  }

  async function sendOta() {
    if (!otaFile) return;
    setOtaStatus('Envoi en cours...');
    const form = new FormData();
    form.append('firmware', otaFile);
    const res = await fetch(`${API}/devices/${deviceId}/ota`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    setOtaStatus(data.success ? `Déclenché ✅ ${data.url}` : 'Erreur ❌');
    setOtaFile(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Flux de données</h2>
        <button
          onClick={toggleFlux}
          disabled={loading || publishing === null}
          className={`px-5 py-2 rounded-xl font-medium text-white transition disabled:opacity-50 ${
            publishing !== false
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {publishing === null
            ? 'Chargement…'
            : publishing
              ? '⏹ Arrêter'
              : '▶ Démarrer'
          }
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Mise à jour firmware (OTA)</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition">
            📁 {otaFile ? otaFile.name : 'Choisir un .bin'}
            <input
              type="file"
              accept=".bin"
              className="hidden"
              onChange={(e) => setOtaFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            onClick={sendOta}
            disabled={!otaFile}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition disabled:opacity-50"
          >
            🚀 Flash OTA
          </button>
        </div>
        {otaStatus && <p className="mt-2 text-sm text-gray-500">{otaStatus}</p>}
      </div>
    </div>
  );
}
