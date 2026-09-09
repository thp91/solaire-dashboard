'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, DeviceSensor } from '@/lib/supabase';

const STALE_MS = 120_000; // 2 min sans nouvelle mesure → considérée en panne

function isFaulted(s: DeviceSensor) {
  if (!s.active) return true;
  if (!s.last_seen) return true;
  return Date.now() - new Date(s.last_seen).getTime() > STALE_MS;
}

export default function SensorLabels({ deviceId }: { deviceId: string }) {
  const [sensors, setSensors] = useState<DeviceSensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts]   = useState<Record<string, string>>({});
  const [savingAddr, setSavingAddr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('device_sensors')
      .select('address, role, last_temp, last_seen, active')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: true });
    setSensors((data as DeviceSensor[]) ?? []);
    setLoading(false);
  }, [deviceId]);

  useEffect(() => { load(); }, [load]);

  async function save(address: string) {
    setSavingAddr(address);
    const role = drafts[address] ?? sensors.find((s) => s.address === address)?.role ?? '';
    await fetch('/api/admin/sensor-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, address, role }),
    });
    await load();
    setSavingAddr(null);
  }

  return (
    <div className="app-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Sondes DS18B20</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1 max-w-lg leading-relaxed">
            Nomme chaque sonde par son rôle. En cas de panne, la case reste affichée avec une
            alerte ; au remplacement, la nouvelle sonde reprend automatiquement le rôle libéré.
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">Rafraîchir</button>
      </div>

      {loading ? (
        <p className="text-[14px] text-[#8e8e93]">Chargement…</p>
      ) : sensors.length === 0 ? (
        <p className="text-[14px] text-[#8e8e93]">
          Aucune sonde détectée pour l'instant. Branche les sondes et attends une remontée (~5 s), puis « Rafraîchir ».
        </p>
      ) : (
        <div className="space-y-2.5">
          {sensors.map((s) => {
            const faulted = isFaulted(s);
            const draft = drafts[s.address] ?? s.role ?? '';
            return (
              <div key={s.address} className="bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl p-3 flex items-center gap-3 flex-wrap">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${faulted ? 'bg-[#FF3B30]' : 'bg-[#34C759]'}`} />
                <div className="min-w-0 flex-1">
                  <input
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.address]: e.target.value }))}
                    placeholder="Rôle (ex. Ballon bas)"
                    className="app-input !py-1.5 !text-[14px]"
                  />
                  <p className="text-[11px] text-[#8e8e93] font-mono mt-1 truncate">
                    {s.address}
                    {' · '}
                    {faulted
                      ? <span className="text-[#FF3B30] font-sans font-medium">⚠️ défectueuse</span>
                      : <span className="font-sans">{s.last_temp != null ? `${Number(s.last_temp).toFixed(1)}°C` : '—'}</span>}
                  </p>
                </div>
                <button
                  onClick={() => save(s.address)}
                  disabled={savingAddr === s.address}
                  className="btn btn-primary !py-1.5 !px-3.5 !text-[13px]"
                >
                  {savingAddr === s.address ? '…' : 'Enregistrer'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
