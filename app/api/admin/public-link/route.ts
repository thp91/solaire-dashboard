import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  return { error: null };
}

// Lien public actif d'un module (ou null).
export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const deviceId = req.nextUrl.searchParams.get('deviceId');
  if (!deviceId) return NextResponse.json({ error: 'deviceId requis' }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('public_links')
    .select('token, active, created_at')
    .eq('device_id', deviceId)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ link: data ?? null });
}

// action: 'create' (génère/régénère) | 'revoke' (supprime)
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { deviceId, action, label } = await req.json();
  if (!deviceId || !action) {
    return NextResponse.json({ error: 'deviceId et action requis' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (action === 'revoke') {
    const { error: delErr } = await admin.from('public_links').delete().eq('device_id', deviceId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
    return NextResponse.json({ ok: true, link: null });
  }

  if (action === 'create') {
    const { data: device } = await admin.from('devices').select('id').eq('id', deviceId).single();
    if (!device) return NextResponse.json({ error: 'Module introuvable' }, { status: 404 });

    // Un seul lien actif par module : on remplace l'éventuel existant.
    await admin.from('public_links').delete().eq('device_id', deviceId);

    const token = randomBytes(9).toString('base64url'); // ~12 caractères URL-safe
    const { data, error: insErr } = await admin
      .from('public_links')
      .insert({ token, device_id: deviceId, label: label ?? null })
      .select('token, active, created_at')
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, link: data });
  }

  return NextResponse.json({ error: 'action invalide' }, { status: 400 });
}
