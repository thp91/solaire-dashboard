'use client';

import { useEffect, useState } from 'react';

type StatusLevel = 'running' | 'stopped' | 'unstable' | 'offline';

type Props = {
  lastSeen: string | null;
  publishing: boolean;
};

function computeStatus(lastSeen: string | null, publishing: boolean): StatusLevel {
  if (!publishing) return 'stopped';
  if (!lastSeen) return 'offline';
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  if (diffMs < 20_000) return 'running';
  if (diffMs < 60_000) return 'unstable';
  return 'offline';
}

const STATUS_CONFIG: Record<StatusLevel, { label: string; dot: string; bg: string; text: string }> = {
  running:  { label: 'En fonctionnement',  dot: '#42F5A7', bg: 'bg-[#42F5A7]/10 border border-[#42F5A7]/20', text: 'text-[#42F5A7]' },
  stopped:  { label: 'Flux arrêté',        dot: '#FF4D6D', bg: 'bg-[#FF4D6D]/10 border border-[#FF4D6D]/20', text: 'text-[#FF4D6D]' },
  unstable: { label: 'Connexion instable', dot: '#FFD166', bg: 'bg-[#FFD166]/10 border border-[#FFD166]/20', text: 'text-[#FFD166]' },
  offline:  { label: 'Hors ligne',         dot: '#7A8A99', bg: 'bg-[#7A8A99]/10 border border-[#7A8A99]/20', text: 'text-[#7A8A99]' },
};

export default function DeviceStatus({ lastSeen, publishing }: Props) {
  const [status, setStatus] = useState<StatusLevel>(() => computeStatus(lastSeen, publishing));

  useEffect(() => {
    setStatus(computeStatus(lastSeen, publishing));
    const id = setInterval(() => setStatus(computeStatus(lastSeen, publishing)), 5_000);
    return () => clearInterval(id);
  }, [lastSeen, publishing]);

  const cfg = STATUS_CONFIG[status];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'running' || status === 'unstable' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}
