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
  const [simBusy, setSimBusy]       = useState(false);
  const [simMsg, setSimMsg]         = useState('');

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

  async function simulate() {
    setSimBusy(true);
    setSimMsg('');
    try {
      const res = await fetch('/api/admin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const d = await res.json();
      setSimMsg(res.ok ? `✓ ${d.points} points injectés` : `Erreur : ${d.error ?? '—'}`);
    } catch {
      setSimMsg('Erreur réseau');
    } finally {
      setSimBusy(false);
      setTimeout(() => setSimMsg(''), 4000);
    }
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
    <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold text-[#1d1d1f] mb-3">Flux de données</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={toggleFlux}
            disabled={loading || publishing === null}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 ${
              publishing !== false
                ? 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/30 hover:bg-[#FF3B30]/20'
                : 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30 hover:bg-[#34C759]/20'
            }`}
          >
            {publishing === null
              ? 'Chargement…'
              : publishing
                ? '⏹ Arrêter'
                : '▶ Démarrer'
            }
          </button>

          <button
            onClick={simulate}
            disabled={simBusy}
            title="Injecte des données réalistes (mode test, sans boîtier physique)"
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/20"
          >
            {simBusy ? 'Simulation…' : '🧪 Test — simuler des données'}
          </button>

          {simMsg && <span className="text-sm text-[#6e6e73]">{simMsg}</span>}
        </div>
        <p className="text-xs text-[#8e8e93] mt-2">
          Le bouton test génère ~30 mesures des 30 dernières minutes (plein jour) sur les sondes, le débitmètre et la pompe.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-[#1d1d1f] mb-3">Mise à jour firmware (OTA)</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <label className="cursor-pointer px-4 py-2.5 bg-[#f2f2f7] border border-[#e5e5ea] hover:border-[#6e6e73] rounded-xl text-sm font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition">
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
            className="px-4 py-2.5 bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/20 rounded-xl font-semibold text-sm transition disabled:opacity-50"
          >
            Flash OTA
          </button>
        </div>
        {otaStatus && <p className="mt-2 text-sm text-[#6e6e73]">{otaStatus}</p>}
      </div>
    </div>
  );
}
