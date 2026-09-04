'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = { deviceId: string };

export default function DeviceSettings({ deviceId }: Props) {
  const [name, setName]         = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat]           = useState<number | null>(null);
  const [lon, setLon]           = useState<number | null>(null);
  const [tarif, setTarif]       = useState<string>('');
  const [installCost, setInstallCost] = useState<string>('');
  const [saving, setSaving]     = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: device }, { data: cfg }] = await Promise.all([
        supabase.from('devices').select('name,location').eq('id', deviceId).single(),
        supabase.from('energy_config').select('location_lat,location_lon,tarif_kwh,install_cost').eq('device_id', deviceId).maybeSingle(),
      ]);
      if (device) { setName(device.name ?? ''); setLocation(device.location ?? ''); }
      if (cfg) {
        setLat(cfg.location_lat); setLon(cfg.location_lon);
        setTarif(cfg.tarif_kwh != null ? String(cfg.tarif_kwh) : '');
        setInstallCost(cfg.install_cost != null ? String(cfg.install_cost) : '');
      }
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
      {
        device_id: deviceId,
        location_lat: lat,
        location_lon: lon,
        tarif_kwh: tarif.trim() !== '' ? Number(tarif) : null,
        install_cost: installCost.trim() !== '' ? Number(installCost) : null,
      },
      { onConflict: 'device_id' },
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputCls = 'w-full bg-[#f2f2f7] border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition placeholder:text-[#6e6e73]';

  return (
    <div className="bg-[#ffffff] border border-[#e5e5ea] rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-[#1d1d1f]">Paramètres du module</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#6e6e73] tracking-tight mb-2">Nom affiché</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={deviceId}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-[#6e6e73] tracking-tight mb-2">Adresse / lieu d'installation</label>
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
              className="px-3 py-2 bg-[#f2f2f7] border border-[#e5e5ea] hover:border-[#6e6e73] rounded-xl text-xs font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition disabled:opacity-50 whitespace-nowrap"
            >
              {geocoding ? '…' : '↗ Localiser'}
            </button>
          </div>
          {lat && lon && (
            <p className="text-xs text-[#34C759] mt-1.5">
              ✓ Coordonnées trouvées : {lat.toFixed(4)}, {lon.toFixed(4)} — météo antigel activée
            </p>
          )}
          {!lat && !lon && location && (
            <p className="text-xs text-[#6e6e73] mt-1.5">Cliquez sur "Localiser" pour activer la surveillance antigel</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-[#6e6e73] tracking-tight mb-2">Tarif énergie remplacée (€/kWh)</label>
          <input
            type="number" step="0.001" min="0"
            value={tarif}
            onChange={(e) => setTarif(e.target.value)}
            placeholder="0.13"
            className={inputCls}
          />
          <p className="text-xs text-[#6e6e73] mt-1.5">Sert au calcul des économies (prix du gaz remplacé).</p>
        </div>

        <div>
          <label className="block text-xs text-[#6e6e73] tracking-tight mb-2">Coût d'installation (€)</label>
          <input
            type="number" step="1" min="0"
            value={installCost}
            onChange={(e) => setInstallCost(e.target.value)}
            placeholder="5000"
            className={inputCls}
          />
          <p className="text-xs text-[#6e6e73] mt-1.5">Active le suivi d'amortissement / ROI côté client.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
            saved
              ? 'bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/30'
              : 'bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/20'
          }`}
        >
          {saved ? '✓ Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
