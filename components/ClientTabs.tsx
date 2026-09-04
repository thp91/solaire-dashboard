'use client';

import Link from 'next/link';

type Tab = 'overview' | 'historique';
type Props = { deviceId: string; active: Tab };

const TABS: { id: Tab; label: string; href: (id: string) => string }[] = [
  { id: 'overview',   label: 'Vue générale', href: (id) => `/device/${id}` },
  { id: 'historique', label: 'Historique',   href: (id) => `/device/${id}/historique` },
];

export default function ClientTabs({ deviceId, active }: Props) {
  return (
    <div className="border-b border-[var(--separator)] bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((t) => {
            const on = t.id === active;
            return (
              <Link
                key={t.id}
                href={t.href(deviceId)}
                className={`px-1 py-3.5 text-[14px] font-medium border-b-2 transition ${
                  on
                    ? 'border-[#0071e3] text-[#1d1d1f]'
                    : 'border-transparent text-[#6e6e73] hover:text-[#1d1d1f]'
                } mr-6`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
