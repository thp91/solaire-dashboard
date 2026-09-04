'use client';

import Link from 'next/link';

type Device = { id: string; name: string | null; location: string | null; last_seen: string | null };

export default function DevicePicker({ devices }: { devices: Device[] }) {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-9">
          <h1 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Vos modules</h1>
          <p className="text-[#6e6e73] text-[15px] mt-1.5">Sélectionnez un module à superviser</p>
        </div>

        <div className="space-y-2.5">
          {devices.map((d) => (
            <Link
              key={d.id}
              href={`/device/${d.id}`}
              className="app-card flex items-center justify-between p-5 hover:bg-[#e5e5ea] transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#1d1d1f] text-[16px] tracking-tight truncate">
                  {d.name ?? d.id}
                </p>
                {d.location && (
                  <p className="text-[13px] text-[#6e6e73] mt-0.5">{d.location}</p>
                )}
                {d.last_seen && (
                  <p className="text-[12px] text-[#8e8e93] mt-0.5">
                    Dernière activité : {new Date(d.last_seen).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
              <span className="text-[#8e8e93] group-hover:text-[#0071e3] text-xl transition ml-4 flex-shrink-0">
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
