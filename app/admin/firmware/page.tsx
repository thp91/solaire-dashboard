'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase, Device } from '@/lib/supabase';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://76.13.128.127:3000';

interface FirmwareVersion {
  id: string;
  version: string;
  notes: string | null;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
}

// ─── utilitaires ──────────────────────────────────────────────────────────────

function formatBytes(b: number) {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function FirmwarePage() {
  const [versions, setVersions] = useState<FirmwareVersion[]>([]);
  const [devices, setDevices]   = useState<Device[]>([]);
  const [loading, setLoading]   = useState(true);

  // Upload
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadNotes, setUploadNotes]   = useState('');
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Flash
  const [flashing, setFlashing] = useState<string | null>(null); // 'bulk-{vId}' | '{deviceId}-{vId}'
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  // ─── Chargement ─────────────────────────────────────────────────────────────
  async function load() {
    const [{ data: vers }, { data: devs }] = await Promise.all([
      supabase.from('firmware_versions').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('devices').select('*').order('name'),
    ]);
    setVersions(vers ?? []);
    setDevices(devs ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ─── Upload ──────────────────────────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile || !uploadVersion.trim()) {
      setUploadError('Fichier et version requis.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('firmware', uploadFile);
      form.append('version', uploadVersion.trim());
      form.append('notes', uploadNotes.trim());
      const res = await fetch(`${API}/firmware/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      setUploadVersion('');
      setUploadNotes('');
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
    }
  }

  // ─── Flash ───────────────────────────────────────────────────────────────────
  async function flashAll(v: FirmwareVersion) {
    const deviceIds = devices.map((d) => d.id);
    if (deviceIds.length === 0) { setFlashMsg('Aucun module enregistré.'); return; }
    setFlashing(`bulk-${v.id}`);
    setFlashMsg(null);
    try {
      const res = await fetch(`${API}/devices/flash-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds, url: v.url, size: v.size }),
      });
      if (!res.ok) throw new Error(await res.text());
      setFlashMsg(`OTA envoyé à ${deviceIds.length} module(s) → v${v.version}`);
    } catch (err: unknown) {
      setFlashMsg(err instanceof Error ? err.message : 'Erreur OTA');
    } finally {
      setFlashing(null);
    }
  }

  async function flashOne(deviceId: string, v: FirmwareVersion) {
    setFlashing(`${deviceId}-${v.id}`);
    setFlashMsg(null);
    try {
      const res = await fetch(`${API}/devices/${deviceId}/flash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: v.url, size: v.size }),
      });
      if (!res.ok) throw new Error(await res.text());
      const dev = devices.find((d) => d.id === deviceId);
      setFlashMsg(`OTA envoyé à ${dev?.name ?? deviceId} → v${v.version}`);
    } catch (err: unknown) {
      setFlashMsg(err instanceof Error ? err.message : 'Erreur OTA');
    } finally {
      setFlashing(null);
    }
  }

  // ─── Suppression ─────────────────────────────────────────────────────────────
  async function deleteVersion(id: string) {
    if (!confirm('Supprimer cette version ? Le fichier .bin sera effacé.')) return;
    setDeleting(id);
    try {
      await fetch(`${API}/firmware/versions/${id}`, { method: 'DELETE' });
      await load();
    } finally {
      setDeleting(null);
    }
  }

  // ─── Rendu ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Mise à jour firmware</h1>
        <span className="text-sm text-gray-400">{versions.length} version{versions.length > 1 ? 's' : ''} · {devices.length} module{devices.length > 1 ? 's' : ''}</span>
      </div>

      {/* Flash feedback */}
      {flashMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <span>✓ {flashMsg}</span>
          <button onClick={() => setFlashMsg(null)} className="text-green-400 hover:text-green-600 ml-4">✕</button>
        </div>
      )}

      {/* Upload */}
      <section className="bg-white rounded-2xl shadow p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-700">Ajouter une version</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Numéro de version *</label>
              <input
                type="text"
                placeholder="ex: 0.3.0"
                value={uploadVersion}
                onChange={(e) => setUploadVersion(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Notes (optionnel)</label>
              <input
                type="text"
                placeholder="ex: Correction capteur VBus"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Fichier .bin *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".bin"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
          </div>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl disabled:opacity-50 transition"
          >
            {uploading ? 'Upload en cours…' : 'Uploader'}
          </button>
        </form>
      </section>

      {/* Versions list */}
      {loading ? (
        <p className="text-gray-400 text-sm">Chargement…</p>
      ) : versions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 text-sm">
          Aucune version uploadée.
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700">Versions disponibles</h2>
          {versions.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl shadow overflow-hidden">
              {/* Version header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">v{v.version}</span>
                    {v.notes && <span className="text-xs text-gray-400">— {v.notes}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(v.uploaded_at)} · {formatBytes(v.size)}
                  </p>
                </div>

                {/* Flash tout */}
                <button
                  onClick={() => flashAll(v)}
                  disabled={flashing !== null || devices.length === 0}
                  className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold px-4 py-2 rounded-xl transition disabled:opacity-40"
                >
                  {flashing === `bulk-${v.id}` ? (
                    <span className="animate-pulse">Envoi…</span>
                  ) : (
                    <>
                      <span>⚡</span>
                      Flasher tous ({devices.length})
                    </>
                  )}
                </button>

                {/* Supprimer */}
                <button
                  onClick={() => deleteVersion(v.id)}
                  disabled={deleting === v.id}
                  className="text-xs text-gray-300 hover:text-red-400 transition px-2 py-2 disabled:opacity-40"
                  title="Supprimer cette version"
                >
                  {deleting === v.id ? '…' : '🗑'}
                </button>
              </div>

              {/* Per-device flash */}
              {devices.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {devices.map((d) => {
                    const isCurrentVersion = d.firmware === v.version;
                    const isFlashingThis   = flashing === `${d.id}-${v.id}`;
                    return (
                      <div key={d.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isCurrentVersion ? 'bg-green-400' : 'bg-gray-200'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 font-medium">{d.name ?? d.id}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            {isCurrentVersion ? (
                              <span className="text-green-500 font-medium">à jour</span>
                            ) : (
                              <>fw actuel : <span className="font-mono">{d.firmware ?? '—'}</span></>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() => flashOne(d.id, v)}
                          disabled={flashing !== null || isCurrentVersion}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                            isCurrentVersion
                              ? 'text-green-400 bg-green-50 cursor-default'
                              : 'text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40'
                          }`}
                        >
                          {isFlashingThis ? (
                            <span className="animate-pulse">Envoi…</span>
                          ) : isCurrentVersion ? (
                            '✓ À jour'
                          ) : (
                            'Mettre à jour'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
