import { createAdminClient } from '@/lib/supabase-admin';
import type { SchemaConfig } from '@/lib/schema-types';

// Instantané « technicien » : uniquement les champs temps réel utiles.
// Volontairement PAS d'énergie/€, historique, firmware ou température ESP32.
export type PublicSnapshot = {
  device: { name: string | null; location: string | null };
  status: { last_seen: string | null; publishing: boolean };
  temps: {
    capteur_solaire: number | null;
    ballon_haut: number | null;
    ballon_bas: number | null;
    retour_solaire: number | null;
    ambiance: number | null;
    sonde_1: number | null;
    sonde_2: number | null;
    sonde_3: number | null;
    sonde_4: number | null;
    sonde_5: number | null;
  } | null;
  etat: { pompe_solaire: boolean | null } | null;
  debit: { lph: number | null; lph_2: number | null } | null;
  schema: SchemaConfig | null;
  // Sondes DS18B20 nommées (par rôle), avec état de fraîcheur pour la détection de panne.
  sensors: { role: string; last_temp: number | null; last_seen: string | null; active: boolean }[];
  recorded_at: string | null;
};

/** Résout un token public actif -> device_id, ou null si invalide/désactivé. */
export async function resolvePublicToken(token: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('public_links')
    .select('device_id, active')
    .eq('token', token)
    .maybeSingle();
  if (!data || !data.active) return null;
  return data.device_id as string;
}

/** Construit l'instantané temps réel restreint pour un module. */
export async function getPublicSnapshot(deviceId: string): Promise<PublicSnapshot> {
  const admin = createAdminClient();

  const [
    { data: device },
    { data: temps },
    { data: etats },
    { data: debits },
    { data: schemaRow },
    { data: sondes },
  ] = await Promise.all([
    admin.from('devices').select('name, location, last_seen, publishing').eq('id', deviceId).single(),
    admin
      .from('temperatures')
      .select('recorded_at, capteur_solaire, ballon_haut, ballon_bas, retour_solaire, ambiance, sonde_1, sonde_2, sonde_3, sonde_4, sonde_5')
      .eq('device_id', deviceId)
      .order('recorded_at', { ascending: false })
      .limit(1),
    admin.from('etats').select('pompe_solaire').eq('device_id', deviceId)
      .order('recorded_at', { ascending: false }).limit(1),
    admin.from('debits').select('lph, lph_2').eq('device_id', deviceId)
      .order('recorded_at', { ascending: false }).limit(1),
    admin.from('device_schemas').select('config').eq('device_id', deviceId).maybeSingle(),
    admin.from('device_sensors').select('role, last_temp, last_seen, active')
      .eq('device_id', deviceId).not('role', 'is', null).order('role', { ascending: true }),
  ]);

  const t = temps?.[0] ?? null;

  return {
    device: { name: device?.name ?? null, location: device?.location ?? null },
    status: { last_seen: device?.last_seen ?? null, publishing: device?.publishing ?? true },
    temps: t
      ? {
          capteur_solaire: t.capteur_solaire, ballon_haut: t.ballon_haut, ballon_bas: t.ballon_bas,
          retour_solaire: t.retour_solaire, ambiance: t.ambiance,
          sonde_1: t.sonde_1, sonde_2: t.sonde_2, sonde_3: t.sonde_3, sonde_4: t.sonde_4, sonde_5: t.sonde_5,
        }
      : null,
    etat: etats?.[0] ? { pompe_solaire: etats[0].pompe_solaire } : null,
    debit: debits?.[0] ? { lph: debits[0].lph, lph_2: debits[0].lph_2 } : null,
    schema: (schemaRow?.config as SchemaConfig) ?? null,
    sensors: (sondes ?? []).map((s) => ({
      role: s.role as string, last_temp: s.last_temp, last_seen: s.last_seen, active: s.active,
    })),
    recorded_at: t?.recorded_at ?? null,
  };
}
