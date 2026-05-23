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

const STATUS_CONFIG: Record<StatusLevel, { label: string; dot: string; badge: string }> = {
  running:  { label: 'En fonctionnement',  dot: 'bg-green-500 animate-pulse', badge: 'bg-green-100 text-green-700' },
  stopped:  { label: 'Flux arrêté',        dot: 'bg-red-400',                 badge: 'bg-red-100 text-red-600'     },
  unstable: { label: 'Connexion instable', dot: 'bg-amber-400 animate-pulse', badge: 'bg-amber-100 text-amber-600' },
  offline:  { label: 'Boîtier hors ligne', dot: 'bg-gray-400',                badge: 'bg-gray-100 text-gray-500'   },
};

export default function DeviceStatus({ lastSeen, publishing }: Props) {
  const [status, setStatus] = useState<StatusLevel>(() => computeStatus(lastSeen, publishing));

  // Recalcule toutes les 5s car le statut dépend de l'heure courante
  useEffect(() => {
    setStatus(computeStatus(lastSeen, publishing));
    const id = setInterval(() => setStatus(computeStatus(lastSeen, publishing)), 5_000);
    return () => clearInterval(id);
  }, [lastSeen, publishing]);

  const cfg = STATUS_CONFIG[status];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${cfg.badge}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
