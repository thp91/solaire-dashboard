import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolvePublicToken, getPublicSnapshot } from '@/lib/public-snapshot';
import TechnicianView from '@/components/TechnicianView';

type Props = { params: Promise<{ token: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const deviceId = await resolvePublicToken(token);
  if (!deviceId) return { title: 'Lien invalide — EnerVisio' };
  const snap = await getPublicSnapshot(deviceId);
  return { title: `${snap.device.name ?? 'Installation'} — Temps réel` };
}

export default async function PublicTokenPage({ params }: Props) {
  const { token } = await params;

  const deviceId = await resolvePublicToken(token);
  if (!deviceId) notFound();

  const snapshot = await getPublicSnapshot(deviceId);
  return <TechnicianView token={token} initial={snapshot} />;
}
