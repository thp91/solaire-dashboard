import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import ClientNavbar from '@/components/ClientNavbar';
import ClientTabs from '@/components/ClientTabs';
import HistorySection from '@/components/HistorySection';
import MonthlyHistory from '@/components/MonthlyHistory';
import ReportSection from '@/components/ReportSection';
import ComptagesHistory from '@/components/ComptagesHistory';
import { getEconomics, getMonthlySeries } from '@/lib/economics';
import { getComptagesStats } from '@/lib/comptages-stats';

type Props = { params: Promise<{ id: string }> };

export default async function DeviceHistoriquePage({ params }: Props) {
  const { id: deviceId } = await params;
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: device } = await supabase
    .from('devices')
    .select('id, name')
    .eq('id', deviceId)
    .single();
  if (!device) redirect('/');

  // Nombre de modules du client (pour le bouton « ← Mes modules »)
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

  const [eco, series, comptages] = await Promise.all([
    getEconomics(deviceId),
    getMonthlySeries(deviceId),
    getComptagesStats(deviceId),
  ]);

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      <ClientNavbar deviceId={deviceId} showBack={multiDevice} />
      <ClientTabs deviceId={deviceId} active="historique" />

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="pb-1">
            <h1 className="text-[30px] leading-tight font-semibold text-[#1d1d1f] tracking-tight">Historique</h1>
            <p className="text-[14px] text-[#6e6e73] mt-1">{device.name ?? deviceId}</p>
          </div>

          <ReportSection
            deviceId={deviceId}
            deviceName={device.name ?? deviceId}
            tarif={eco.tarif}
            months={series.map((s) => s.month)}
          />

          <ComptagesHistory stats={comptages} />

          <MonthlyHistory data={series} />

          <HistorySection deviceId={deviceId} />
        </div>
      </main>
    </div>
  );
}
