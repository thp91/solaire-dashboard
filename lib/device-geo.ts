import { createAdminClient } from '@/lib/supabase-admin';

export type DeviceGeo = { location: string | null; lat: number | null; lon: number | null };

// Récupère l'adresse + coordonnées d'un module côté serveur (service-role),
// car `energy_config` n'est pas lisible par le rôle client via RLS.
// L'accès au module est déjà validé par la page appelante.
export async function getDeviceGeo(deviceId: string): Promise<DeviceGeo> {
  const admin = createAdminClient();
  const [{ data: device }, { data: cfg }] = await Promise.all([
    admin.from('devices').select('location').eq('id', deviceId).maybeSingle(),
    admin.from('energy_config').select('location_lat, location_lon').eq('device_id', deviceId).maybeSingle(),
  ]);
  return {
    location: device?.location ?? null,
    lat: cfg?.location_lat != null ? Number(cfg.location_lat) : null,
    lon: cfg?.location_lon != null ? Number(cfg.location_lon) : null,
  };
}
