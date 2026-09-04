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
  running:  { label: 'En fonctionnement',  dot: '#34C759', bg: 'bg-[#34C759]/10 border border-[#34C759]/20', text: 'text-[#34C759]' },
  stopped:  { label: 'Flux arrêté',        dot: '#FF3B30', bg: 'bg-[#FF3B30]/10 border border-[#FF3B30]/20', text: 'text-[#FF3B30]' },
  unstable: { label: 'Connexion instable', dot: '#FF9500', bg: 'bg-[#FF9500]/10 border border-[#FF9500]/20', text: 'text-[#FF9500]' },
  offline:  { label: 'Hors ligne',         dot: '#6e6e73', bg: 'bg-[#6e6e73]/10 border border-[#6e6e73]/20', text: 'text-[#6e6e73]' },
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
