import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import DashboardClient from '@/components/DashboardClient';

type Props = { params: Promise<{ id: string }> };

export default async function DevicePage({ params }: Props) {
  const { id: deviceId } = await params;
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Vérifier que l'utilisateur a accès à ce device (RLS gère déjà ça, on vérifie pour 404)
  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .single();

  if (!device) redirect('/');

  // L'admin voit les devices dans son layout /admin/devices/[id]
  if (isAdmin) redirect(`/admin/devices/${deviceId}`);

  // Vérifier si le client a plusieurs modules (pour afficher "← Mes modules")
  const { data: members } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);
  const orgIds = (members ?? []).map((m: { organization_id: string }) => m.organization_id);
  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .in('organization_id', orgIds);
  const multiDevice = (count ?? 0) > 1;

  return <DashboardClient deviceId={deviceId} isAdmin={false} multiDevice={multiDevice} />;
}
