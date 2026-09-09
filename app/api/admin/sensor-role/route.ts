import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

// Assigne (ou efface) le rôle d'une sonde DS18B20 identifiée par son adresse.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { deviceId, address, role } = await req.json();
  if (!deviceId || !address) {
    return NextResponse.json({ error: 'deviceId et address requis' }, { status: 400 });
  }

  const cleanRole = typeof role === 'string' && role.trim() !== '' ? role.trim() : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from('device_sensors')
    .update({ role: cleanRole })
    .eq('device_id', deviceId)
    .eq('address', address);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
