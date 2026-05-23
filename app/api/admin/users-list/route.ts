import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const admin = createAdminClient();
  const { data: authUsers, error } = await admin.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Récupérer les rôles depuis profiles
  const { data: profiles } = await admin.from('profiles').select('id, role');
  const roleMap = new Map((profiles ?? []).map((p: { id: string; role: string }) => [p.id, p.role]));

  const users = authUsers.users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    role: (roleMap.get(u.id) ?? 'client') as 'admin' | 'client',
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}
