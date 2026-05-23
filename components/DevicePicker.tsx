'use client';

import Link from 'next/link';

type Device = { id: string; name: string | null; location: string | null; last_seen: string | null };

export default function DevicePicker({ devices }: { devices: Device[] }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">☀️</div>
          <h1 className="text-2xl font-bold text-gray-800">Vos modules</h1>
          <p className="text-gray-400 text-sm mt-1">Sélectionnez un module à superviser</p>
        </div>

        <div className="space-y-3">
          {devices.map((d) => (
            <Link
              key={d.id}
              href={`/device/${d.id}`}
              className="flex items-center justify-between bg-white rounded-2xl shadow p-5 hover:shadow-md transition group"
            >
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition">
                  {d.name ?? d.id}
                </p>
                {d.location && (
                  <p className="text-xs text-gray-400 mt-0.5">{d.location}</p>
                )}
                {d.last_seen && (
                  <p className="text-xs text-gray-300 mt-0.5">
                    Dernière activité : {new Date(d.last_seen).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
              <span className="text-gray-300 group-hover:text-blue-400 text-xl transition">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
