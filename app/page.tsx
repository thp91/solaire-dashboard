import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import DevicePicker from '@/components/DevicePicker';

export default async function RootPage() {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') redirect('/admin');

  // Client : récupérer ses modules via ses organisations
  const { data: members } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  const orgIds = (members ?? []).map((m: { organization_id: string }) => m.organization_id);

  if (orgIds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-sm">
          <div className="text-4xl mb-3">☀️</div>
          <p className="text-gray-600 font-medium">Aucun module assigné</p>
          <p className="text-gray-400 text-sm mt-2">
            Contactez votre administrateur pour accéder à vos données.
          </p>
        </div>
      </div>
    );
  }

  const { data: devices } = await supabase
    .from('devices')
    .select('id, name, location, last_seen')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: true });

  const list = devices ?? [];

  if (list.length === 1) redirect(`/device/${list[0].id}`);

  return <DevicePicker devices={list} />;
}
