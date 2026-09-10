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
  sonde_4:         number | null;
  sonde_5:         number | null;
  esp32_temp:      number | null;
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
  lph:   number;
  lph_2: number;
};

export type EnergyDaily = {
  date:  string;
  stats: {
    kwh:               number;
    savings_eur:       number;
    energie_totale_wh: number;
    pompe_on_count:    number;
    nb_mesures:        number;
  };
};

export type Alerte = {
  id:         number;
  device_id:  string;
  type:       string;
  message:    string;
  resolved:   boolean;
  created_at: string;
};

// Sonde DS18B20 identifiée par son adresse OneWire (rôle assignable, tolérante à la panne).
export type DeviceSensor = {
  address:   string;
  role:      string | null;
  last_temp: number | null;
  last_seen: string | null;
  active:    boolean;
};

// Comptage d'énergie (solaire ou chauffage) : 1 débitmètre + départ/retour.
export type DeviceComptage = {
  idx:            number;                     // 1 | 2
  type:           'solaire' | 'chauffage';
  enabled:        boolean;
  label:          string | null;
  debit_source:   number;                    // 1 | 2
  depart_kind:    'vbus' | 'sonde' | null;
  depart_ref:     string | null;
  retour_kind:    'vbus' | 'sonde' | null;
  retour_ref:     string | null;
  last_power_w:   number | null;
  last_energy_wh: number;
  last_seen:      string | null;
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
