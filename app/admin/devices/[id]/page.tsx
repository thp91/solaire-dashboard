import { createSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';

type Props = { params: Promise<{ id: string }> };

export default async function AdminDeviceDetailPage({ params }: Props) {
  const { id: deviceId } = await params;
  const supabase = await createSupabaseServer();

  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .single();

  if (!device) redirect('/admin/devices');

  return <DashboardClient deviceId={deviceId} isAdmin />;
}
