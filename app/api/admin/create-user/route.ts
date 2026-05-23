import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // Vérifier que l'appelant est admin
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { email, password, role } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: role ?? 'client' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mettre à jour le rôle dans profiles si admin
  if (role === 'admin' && data.user) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }

  return NextResponse.json({ id: data.user?.id });
}
