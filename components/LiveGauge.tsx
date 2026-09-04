'use client';

import { useEffect, useState } from 'react';

type Temps = {
  capteur_solaire?: number | null;
  ballon_haut?: number | null;
  ballon_bas?: number | null;
  ambiance?: number | null;
} | null;

type Props = {
  data: Temps;
  location?: string | null;
  lat?: number | null;
  lon?: number | null;
};

const MIN = 0, MAX = 100;          // plage du cadran (°C)
const START = 135, SWEEP = 270;    // arc de 270°

function tempColor(t: number) {
  if (t < 25) return '#0071e3';
  if (t < 45) return '#34C759';
  if (t < 65) return '#FF9500';
  return '#FF3B30';
}

// Code météo WMO → icône + libellé (Open-Meteo)
function weatherInfo(code: number, isDay: boolean): { icon: string; label: string } {
  const clearIcon = isDay ? '☀️' : '🌙';
  const map: Record<number, { icon: string; label: string }> = {
    0: { icon: clearIcon, label: 'Ciel dégagé' },
    1: { icon: isDay ? '🌤️' : '🌙', label: 'Peu nuageux' },
    2: { icon: '⛅', label: 'Partiellement nuageux' },
    3: { icon: '☁️', label: 'Couvert' },
    45: { icon: '🌫️', label: 'Brouillard' }, 48: { icon: '🌫️', label: 'Brouillard givrant' },
    51: { icon: '🌦️', label: 'Bruine légère' }, 53: { icon: '🌦️', label: 'Bruine' }, 55: { icon: '🌦️', label: 'Bruine dense' },
    61: { icon: '🌧️', label: 'Pluie faible' }, 63: { icon: '🌧️', label: 'Pluie' }, 65: { icon: '🌧️', label: 'Pluie forte' },
    71: { icon: '🌨️', label: 'Neige faible' }, 73: { icon: '🌨️', label: 'Neige' }, 75: { icon: '🌨️', label: 'Neige forte' },
    80: { icon: '🌦️', label: 'Averses' }, 81: { icon: '🌧️', label: 'Averses' }, 82: { icon: '🌧️', label: 'Fortes averses' },
    95: { icon: '⛈️', label: 'Orage' }, 96: { icon: '⛈️', label: 'Orage grêle' }, 99: { icon: '⛈️', label: 'Orage grêle' },
  };
  return map[code] ?? { icon: '🌡️', label: '—' };
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, endDeg);
  const e = polar(cx, cy, r, startDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

type Weather = { temp: number; icon: string; label: string } | null;

export default function LiveGauge({ data, location, lat, lon }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<Weather>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Météo extérieure au lieu d'installation (Open-Meteo, sans clé)
  useEffect(() => {
    if (lat == null || lon == null) { setWeather(null); return; }
    let alive = true;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (!alive || !j.current) return;
        const w = weatherInfo(j.current.weather_code, j.current.is_day === 1);
        setWeather({ temp: j.current.temperature_2m, icon: w.icon, label: w.label });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [lat, lon]);

  const temp = data?.capteur_solaire ?? data?.ballon_haut ?? data?.ambiance ?? null;
  const pct = temp != null ? Math.min(1, Math.max(0, (temp - MIN) / (MAX - MIN))) : 0;
  const color = temp != null ? tempColor(temp) : '#8e8e93';
  const cx = 100, cy = 100, r = 78;

  return (
    <div className="app-card p-6 flex flex-col sm:flex-row items-center gap-6">
      {/* Cadran */}
      <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" width="200" height="200">
          <path d={arc(cx, cy, r, START, START + SWEEP)} fill="none" stroke="#e5e5ea" strokeWidth={14} strokeLinecap="round" />
          {temp != null && (
            <path d={arc(cx, cy, r, START, START + SWEEP * pct)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[44px] font-semibold tracking-tight leading-none tabular-nums" style={{ color }}>
            {temp != null ? temp.toFixed(1) : '—'}
            {temp != null && <span className="text-[20px] text-[#8e8e93] font-medium">°C</span>}
          </span>
          <span className="text-[12px] text-[#6e6e73] font-medium mt-1.5">Capteur solaire</span>
        </div>
      </div>

      {/* Horloge + météo + secondaires */}
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-[40px] font-semibold tracking-tight text-[#1d1d1f] tabular-nums leading-none">
          {now ? now.toLocaleTimeString('fr-FR') : '—'}
        </p>
        <p className="text-[15px] text-[#6e6e73] mt-1.5 capitalize">
          {now ? now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        </p>

        {/* Météo extérieure à l'adresse du boîtier */}
        <div className="mt-4 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
          {weather ? (
            <span className="inline-flex items-center gap-2 bg-[#f2f2f7] border border-[#e5e5ea] rounded-full pl-2.5 pr-3.5 py-1.5">
              <span className="text-[18px] leading-none">{weather.icon}</span>
              <span className="text-[16px] font-semibold text-[#1d1d1f] tabular-nums">{Number(weather.temp).toFixed(1)}°C</span>
              <span className="text-[13px] text-[#6e6e73]">· {weather.label}</span>
            </span>
          ) : (lat != null && lon != null) ? (
            <span className="text-[13px] text-[#8e8e93]">Météo en cours…</span>
          ) : (
            <span className="text-[13px] text-[#8e8e93]">Localisez le module pour la météo extérieure</span>
          )}
          {location && <span className="text-[13px] text-[#8e8e93] truncate max-w-[220px]">📍 {location}</span>}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <Mini label="Ballon haut" value={data?.ballon_haut} />
          <Mini label="Ballon bas" value={data?.ballon_bas} />
          <Mini label="Ambiance" value={data?.ambiance} />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="bg-[#f2f2f7] rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-[#8e8e93] font-medium">{label}</p>
      <p className="text-[17px] font-semibold text-[#1d1d1f] tabular-nums">
        {value != null ? `${Number(value).toFixed(1)}°` : '—'}
      </p>
    </div>
  );
}
