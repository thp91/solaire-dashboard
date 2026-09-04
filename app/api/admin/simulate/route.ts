import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServer } from '@/lib/supabase-server';

// Génère une rafale de données réalistes « plein jour » pour un module de test
// (aucun boîtier physique requis). Admin uniquement.
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { deviceId } = await req.json();
  if (!deviceId) return NextResponse.json({ error: 'deviceId requis' }, { status: 400 });

  const admin = createAdminClient();

  const N = 30;                       // points sur les 30 dernières minutes
  const now = Date.now();
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  const temps: Record<string, unknown>[] = [];
  const debits: Record<string, unknown>[] = [];
  let energieCumul = 0;

  for (let i = N - 1; i >= 0; i--) {
    const ts = new Date(now - i * 60_000).toISOString();
    const p = (N - 1 - i) / (N - 1);              // 0 → 1 sur la fenêtre
    const wave = Math.sin(p * Math.PI);           // cloche « journée »

    const capteur = 55 + 18 * wave + rnd(-1.5, 1.5);
    const retour  = capteur - rnd(10, 14);
    const ballonH = 48 + 9 * p + rnd(-1, 1);
    const ballonB = 35 + 6 * p + rnd(-1, 1);
    const ambiance = 21 + rnd(-0.6, 0.8);
    const lph = 260 + 60 * wave + rnd(-15, 15);

    // Puissance thermique instantanée P = débit × Cp × ΔT
    const deltaT = Math.max(0, capteur - retour);
    const powerW = Math.round((lph / 3600) * 4186 * deltaT); // L/s × J/kg°C × °C
    energieCumul += (powerW * 60) / 3600;         // Wh sur 1 min

    temps.push({
      device_id: deviceId, recorded_at: ts,
      capteur_solaire: +capteur.toFixed(1),
      ballon_haut: +ballonH.toFixed(1),
      ballon_bas: +ballonB.toFixed(1),
      retour_solaire: +retour.toFixed(1),
      ambiance: +ambiance.toFixed(1),
      sonde_1: +(ballonH - 4).toFixed(1),
      sonde_2: +(ballonB + 3).toFixed(1),
      sonde_3: +(retour + 5).toFixed(1),
      esp32_temp: +rnd(38, 44).toFixed(1),
      power_w: powerW,
    });
    debits.push({
      device_id: deviceId, recorded_at: ts,
      lph: +lph.toFixed(0), lph_2: +rnd(0, 5).toFixed(0),
    });
  }

  const last = temps[temps.length - 1];

  const [tErr, dErr, eErr] = await Promise.all([
    admin.from('temperatures').insert(temps).then((r) => r.error),
    admin.from('debits').insert(debits).then((r) => r.error),
    admin.from('etats').insert({
      device_id: deviceId, recorded_at: new Date(now).toISOString(),
      pompe_solaire: true,
      energie_produite_wh: Math.round(energieCumul),
      firmware: 'sim-1.0', mode: 'auto',
    }).then((r) => r.error),
  ]);

  await admin.from('devices').update({
    last_seen: new Date(now).toISOString(), publishing: true,
  }).eq('id', deviceId);

  const err = tErr || dErr || eErr;
  if (err) return NextResponse.json({ error: err.message }, { status: 400 });

  return NextResponse.json({ ok: true, points: N, last });
}
