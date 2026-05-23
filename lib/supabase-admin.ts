import { createClient } from '@supabase/supabase-js';

// Utilisé uniquement dans les API routes server-side (service_role bypasse RLS)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
