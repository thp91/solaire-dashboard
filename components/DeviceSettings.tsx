'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = { deviceId: string };

export default function DeviceSettings({ deviceId }: Props) {
  const [name, setName]         = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat]           = useState<number | null>(null);
  const [lon, setLon]           = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: device }, { data: cfg }] = await Promise.all([
        supabase.from('devices').select('name,location').eq('id', deviceId).single(),
        supabase.from('energy_config').select('location_lat,location_lon').eq('device_id', deviceId).maybeSingle(),
      ]);
      if (device) { setName(device.name ?? ''); setLocation(device.location ?? ''); }
      if (cfg) { setLat(cfg.location_lat); setLon(cfg.location_lon); }
    }
    load();
  }, [deviceId]);

  async function geocode() {
    if (!location.trim()) return;
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const json = await res.json();
      if (json[0]) { setLat(parseFloat(json[0].lat)); setLon(parseFloat(json[0].lon)); }
      else alert('Adresse introuvable — essayez une adresse plus précise');
    } catch { alert('Erreur de géocodage'); }
    setGeocoding(false);
  }

  async function save() {
    setSaving(true);
    await supabase.from('devices').update({ name: name || null, location: location || null }).eq('id', deviceId);
    await supabase.from('energy_config').upsert(
      { device_id: deviceId, location_lat: lat, location_lon: lon },
      { onConflict: 'device_id' },
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputCls = 'w-full bg-[#050B12] border border-[#1A2D42] rounded-xl px-3 py-2.5 text-sm text-[#F5FAFF] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition placeholder:text-[#7A8A99]';

  return (
    <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#F5FAFF]">Paramètres du module</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#7A8A99] uppercase tracking-widest mb-2">Nom affiché</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={deviceId}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-[#7A8A99] uppercase tracking-widest mb-2">Adresse / lieu d'installation</label>
          <div className="flex gap-2">
            <input
              value={location}
              onChange={(e) => { setLocation(e.target.value); setLat(null); setLon(null); }}
              placeholder="12 rue des Alouettes, 69000 Lyon"
              className={inputCls}
            />
            <button
              onClick={geocode}
              disabled={!location.trim() || geocoding}
              className="px-3 py-2 bg-[#050B12] border border-[#1A2D42] hover:border-[#7A8A99] rounded-xl text-xs font-medium text-[#7A8A99] hover:text-[#F5FAFF] transition disabled:opacity-50 whitespace-nowrap"
            >
              {geocoding ? '…' : '↗ Localiser'}
            </button>
          </div>
          {lat && lon && (
            <p className="text-xs text-[#42F5A7] mt-1.5">
              ✓ Coordonnées trouvées : {lat.toFixed(4)}, {lon.toFixed(4)} — météo antigel activée
            </p>
          )}
          {!lat && !lon && location && (
            <p className="text-xs text-[#7A8A99] mt-1.5">Cliquez sur "Localiser" pour activer la surveillance antigel</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
            saved
              ? 'bg-[#42F5A7]/10 text-[#42F5A7] border border-[#42F5A7]/30'
              : 'bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/20'
          }`}
        >
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
