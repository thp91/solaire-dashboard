// Constantes énergie partagées client/serveur (aucune dépendance serveur ici).

// Le solaire évite l'appoint GAZ pour tout le parc.
// Gaz naturel — ADEME Base Carbone, combustion : ~0,227 kg CO₂e / kWh (PCI).
export const CO2_KG_PER_KWH = 0.227;

// Prix du kWh (énergie remplacée) par défaut si non configuré.
export const DEFAULT_TARIF = 0.13;

// Extrait la production en kWh d'une ligne *_daily.stats.
// La source réelle est `energie_totale_wh` (Wh) ; `kwh` sert de repli si présent.
export function kwhFromStats(
  stats: { kwh?: number | null; energie_totale_wh?: number | null } | null | undefined,
): number {
  if (!stats) return 0;
  if (stats.kwh != null) return Number(stats.kwh);
  if (stats.energie_totale_wh != null) return Number(stats.energie_totale_wh) / 1000;
  return 0;
}
