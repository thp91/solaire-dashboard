import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types raw data ───────────────────────────────────────────────────────────

export type Temperature = {
  id: number;
  recorded_at: string;
  capteur_solaire: number | null;
  ballon_haut:     number | null;
  ballon_bas:      number | null;
  retour_solaire:  number | null;
  ambiance:        number | null;
  sonde_1:         number | null;
  sonde_2:         number | null;
  sonde_3:         number | null;
};

export type Etat = {
  id: number;
  recorded_at: string;
  pompe_solaire: boolean;
  energie_produite_wh: number;
  firmware: string;
  mode: string;
};

export type Debit = {
  id: number;
  recorded_at: string;
  lph: number;
  lph_simule: number;
};

// ─── Types auth / admin ───────────────────────────────────────────────────────

export type Profile = {
  id: string;
  role: 'admin' | 'client';
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export type OrganizationMember = {
  id: string;
  user_id: string;
  organization_id: string;
  created_at: string;
};

export type Device = {
  id: string;
  name: string | null;
  location: string | null;
  firmware: string | null;
  last_seen: string | null;
  organization_id: string | null;
  created_at: string | null;
};
