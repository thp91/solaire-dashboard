import { NextResponse } from 'next/server';
import { resolvePublicToken, getPublicSnapshot } from '@/lib/public-snapshot';

// Instantané temps réel public, protégé par un token opaque.
// Aucune authentification : n'expose que les champs whitelistés du module lié.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const deviceId = await resolvePublicToken(token);
  if (!deviceId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const snapshot = await getPublicSnapshot(deviceId);
  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
