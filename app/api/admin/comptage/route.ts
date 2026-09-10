import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

// Crée/met à jour la configuration d'un comptage (idx 1 ou 2) d'un module.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const b = await req.json();
  if (!b.deviceId || (b.idx !== 1 && b.idx !== 2)) {
    return NextResponse.json({ error: 'deviceId et idx (1|2) requis' }, { status: 400 });
  }

  const row = {
    device_id: b.deviceId,
    idx: b.idx,
    type: b.type === 'chauffage' ? 'chauffage' : 'solaire',
    enabled: !!b.enabled,
    label: typeof b.label === 'string' && b.label.trim() !== '' ? b.label.trim() : null,
    debit_source: b.debit_source === 2 ? 2 : 1,
    depart_kind: b.depart_kind ?? null,
    depart_ref: b.depart_ref ?? null,
    retour_kind: b.retour_kind ?? null,
    retour_ref: b.retour_ref ?? null,
  };

  const admin = createAdminClient();
  const { error } = await admin.from('device_comptages').upsert(row, { onConflict: 'device_id,idx' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
