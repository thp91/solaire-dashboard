import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
