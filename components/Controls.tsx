'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://76.13.128.127:3000';

type Props = { deviceId: string };

export default function Controls({ deviceId }: Props) {
  const [publishing, setPublishing] = useState<boolean | null>(null);
  const [loading, setLoading]       = useState(false);
  const [otaFile, setOtaFile]       = useState<File | null>(null);
  const [otaStatus, setOtaStatus]   = useState('');

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

    await fetch(`${API}/devices/${deviceId}/commande`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

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
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#F5FAFF] mb-3">Flux de données</h2>
        <button
          onClick={toggleFlux}
          disabled={loading || publishing === null}
          className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
            publishing !== false
              ? 'bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/30 hover:bg-[#FF4D6D]/20'
              : 'bg-[#42F5A7]/10 text-[#42F5A7] border border-[#42F5A7]/30 hover:bg-[#42F5A7]/20'
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
        <h2 className="text-base font-semibold text-[#F5FAFF] mb-3">Mise à jour firmware (OTA)</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <label className="cursor-pointer px-4 py-2.5 bg-[#050B12] border border-[#1A2D42] hover:border-[#7A8A99] rounded-xl text-sm font-medium text-[#7A8A99] hover:text-[#F5FAFF] transition">
            ↑ {otaFile ? otaFile.name : 'Choisir un .bin'}
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
            className="px-4 py-2.5 bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20 rounded-xl font-semibold text-sm transition disabled:opacity-50"
          >
            Flash OTA
          </button>
        </div>
        {otaStatus && <p className="mt-2 text-sm text-[#7A8A99]">{otaStatus}</p>}
      </div>
    </div>
  );
}
