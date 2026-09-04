import { createSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import PublicLinkManager from '@/components/PublicLinkManager';

type Props = { params: Promise<{ id: string }> };

export default async function DevicePublicLinkPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data: device } = await supabase
    .from('devices')
    .select('id, name')
    .eq('id', id)
    .single();

  if (!device) redirect('/admin/devices');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/admin/devices/${id}`} className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition">
          ← Retour au module
        </Link>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] mt-2">Lien technicien</h1>
        <p className="text-[14px] text-[#6e6e73] mt-1">{device.name ?? id}</p>
      </div>

      <PublicLinkManager deviceId={id} deviceName={device.name ?? id} />
    </div>
  );
}
