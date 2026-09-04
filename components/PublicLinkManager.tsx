'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Props = { deviceId: string; deviceName: string };
type Link = { token: string; active: boolean; created_at: string } | null;

export default function PublicLinkManager({ deviceId, deviceName }: Props) {
  const [link, setLink]         = useState<Link>(null);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [qr, setQr]             = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [origin, setOrigin]     = useState('');

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const publicUrl = link ? `${origin}/t/${link.token}` : '';

  // Charger le lien existant
  useEffect(() => {
    fetch(`/api/admin/public-link?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => r.json())
      .then((d) => setLink(d.link ?? null))
      .finally(() => setLoading(false));
  }, [deviceId]);

  // (Re)générer le QR quand l'URL change
  useEffect(() => {
    if (!publicUrl) { setQr(null); return; }
    QRCode.toDataURL(publicUrl, {
      width: 512, margin: 1, errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQr).catch(() => setQr(null));
  }, [publicUrl]);

  const action = useCallback(async (act: 'create' | 'revoke') => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/public-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, action: act, label: deviceName }),
      });
      const d = await res.json();
      if (res.ok) setLink(d.link ?? null);
    } finally { setBusy(false); }
  }, [deviceId, deviceName]);

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadQr() {
    if (!qr) return;
    triggerDownload(qr, `qr-${slug(deviceName)}.png`);
  }

  async function downloadLabel() {
    if (!qr) return;
    const png = await composeLabel(qr, deviceName, publicUrl);
    triggerDownload(png, `etiquette-${slug(deviceName)}.png`);
  }

  if (loading) {
    return <div className="app-card p-6 text-[#6e6e73] text-[14px]">Chargement…</div>;
  }

  return (
    <div className="app-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Lien technicien · QR code</h2>
          <p className="text-[13px] text-[#6e6e73] mt-1 max-w-md leading-relaxed">
            Page publique en lecture seule (données temps réel uniquement), accessible sans compte.
            Collez le QR sur le boîtier.
          </p>
        </div>
        {link && (
          <span className="pill bg-[#34C759]/12 text-[#34C759]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> Actif
          </span>
        )}
      </div>

      {!link ? (
        <button onClick={() => action('create')} disabled={busy} className="btn btn-primary">
          {busy ? 'Génération…' : 'Générer le lien public'}
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6">
          {/* QR */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white rounded-2xl p-3">
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR code" width={168} height={168} className="block" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={downloadQr} className="btn btn-secondary !py-1.5 !px-3 !text-[13px]">QR PNG</button>
              <button onClick={downloadLabel} className="btn btn-secondary !py-1.5 !px-3 !text-[13px]">Étiquette</button>
            </div>
          </div>

          {/* Détails + actions */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="eyebrow mb-1.5">Lien public</p>
              <div className="flex gap-2">
                <input readOnly value={publicUrl} className="app-input font-mono !text-[13px] flex-1 min-w-0" onFocus={(e) => e.currentTarget.select()} />
                <button onClick={copyLink} className="btn btn-secondary !px-3 whitespace-nowrap">
                  {copied ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a href={publicUrl} target="_blank" rel="noreferrer" className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">
                Ouvrir la page ↗
              </a>
              <button onClick={() => action('create')} disabled={busy} className="btn btn-secondary !py-1.5 !px-3.5 !text-[13px]">
                Régénérer
              </button>
              <button onClick={() => action('revoke')} disabled={busy}
                className="btn !py-1.5 !px-3.5 !text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/10">
                Révoquer
              </button>
            </div>

            <p className="text-[12px] text-[#8e8e93] leading-relaxed pt-1">
              « Régénérer » crée un nouveau lien et invalide l'ancien QR déjà imprimé.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function slug(s: string) {
  return (s || 'module').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'module';
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Compose une étiquette imprimable (fond blanc) : titre + QR + consigne. */
function composeLabel(qrDataUrl: string, name: string, url: string): Promise<string> {
  return new Promise((resolve) => {
    const W = 620, H = 800;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    ctx.font = '600 40px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText(truncate(ctx, name || 'Installation solaire', W - 80), W / 2, 90);

    ctx.fillStyle = '#555555';
    ctx.font = '400 24px -apple-system, Helvetica, Arial, sans-serif';
    ctx.fillText('Données temps réel', W / 2, 132);

    const img = new Image();
    img.onload = () => {
      const qs = 420, qx = (W - qs) / 2, qy = 180;
      ctx.drawImage(img, qx, qy, qs, qs);

      ctx.fillStyle = '#000000';
      ctx.font = '600 30px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillText('Scannez pour superviser', W / 2, qy + qs + 70);

      ctx.fillStyle = '#888888';
      ctx.font = '400 18px monospace';
      ctx.fillText(truncate(ctx, url, W - 60), W / 2, qy + qs + 108);

      ctx.fillStyle = '#bbbbbb';
      ctx.font = '600 20px -apple-system, Helvetica, Arial, sans-serif';
      ctx.fillText('EnerVisio', W / 2, H - 34);

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = qrDataUrl;
  });
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 4 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
