// ─────────────────────────────────────────────────────────────────────────────
// NAF → Segment de prospection
// ─────────────────────────────────────────────────────────────────────────────
// Mappe un code NAF rev.2 (format "XX.XXZ") vers un segment de prospection
// pertinent pour Ma Papeterie :
//
//   - educational : écoles, crèches, formation (section P)
//   - public      : administrations, mairies, hôpitaux (section O)
//   - liberal     : professions libérales / cabinets (sections M, N, Q partiels)
//   - pme         : tout le reste des entreprises du tissu local (fallback)
//
// Les codes ci-dessous sont issus de la nomenclature NAF rev.2 INSEE.
// Source : https://www.insee.fr/fr/information/2120875

export type ProspectSegment = "educational" | "public" | "liberal" | "pme";

// Codes exacts (priorité haute). On matche d'abord par code précis,
// puis par préfixe de division (deux chiffres), puis fallback "pme".
const EXACT_CODES: Record<string, ProspectSegment> = {
  // ── Éducation (85.xx) ─────────────────────────────────────────────────────
  "85.10Z": "educational", // Enseignement pré-primaire (maternelles)
  "85.20Z": "educational", // Enseignement primaire
  "85.31Z": "educational", // Enseignement secondaire général
  "85.32Z": "educational", // Enseignement secondaire technique ou professionnel
  "85.41Z": "educational", // Post-secondaire non supérieur
  "85.42Z": "educational", // Enseignement supérieur
  "85.51Z": "educational", // Enseignement sport & loisirs
  "85.52Z": "educational", // Enseignement culturel
  "85.53Z": "educational", // Enseignement de la conduite
  "85.59A": "educational", // Formation continue d'adultes
  "85.59B": "educational", // Autres enseignements
  "85.60Z": "educational", // Activités de soutien à l'enseignement
  "88.91A": "educational", // Crèches (action sociale enfance)
  "88.91B": "educational", // Accueil jeunes enfants

  // ── Secteur public / administrations (84.xx, 87.xx) ───────────────────────
  "84.11Z": "public", // Administration publique générale (mairies)
  "84.12Z": "public", // Administration publique santé/enseignement/social/culture
  "84.13Z": "public", // Administration publique activités économiques
  "84.21Z": "public", // Affaires étrangères
  "84.22Z": "public", // Défense
  "84.23Z": "public", // Justice
  "84.24Z": "public", // Ordre public / sécurité
  "84.25Z": "public", // Sécurité civile
  "84.30A": "public", // Sécurité sociale obligatoire
  "84.30B": "public", // Prévoyance publique
  "84.30C": "public", // Mutuelles
  "87.10A": "public", // EHPAD
  "87.10B": "public", // Hébergement médicalisé enfants
  "87.10C": "public", // Hébergement médicalisé handicapés
  "87.20A": "public", // Hébergement social handicapé mental
  "87.30A": "public", // Hébergement social personnes âgées
  "87.30B": "public", // Hébergement social personnes handicapées
  "87.90A": "public", // Hébergement social enfants en difficulté
  "87.90B": "public", // Autres hébergements sociaux

  // ── Professions libérales / cabinets (69-75, 86) ──────────────────────────
  "69.10Z": "liberal", // Activités juridiques (avocats, notaires)
  "69.20Z": "liberal", // Activités comptables (experts-comptables)
  "70.21Z": "liberal", // Conseil en relations publiques
  "70.22Z": "liberal", // Conseil pour les affaires
  "71.11Z": "liberal", // Architecture
  "71.12A": "liberal", // Ingénierie
  "71.12B": "liberal", // Ingénierie études techniques
  "71.20A": "liberal", // Contrôle technique automobile
  "71.20B": "liberal", // Analyses & essais techniques
  "72.11Z": "liberal", // Recherche & développement biotech
  "72.19Z": "liberal", // Recherche sciences nat/ing
  "72.20Z": "liberal", // Recherche sciences humaines/sociales
  "74.10Z": "liberal", // Design
  "74.20Z": "liberal", // Photographie
  "74.30Z": "liberal", // Traduction / interprétation
  "74.90A": "liberal", // Activité courtiers & conseil
  "74.90B": "liberal", // Autres activités spécialisées
  "75.00Z": "liberal", // Vétérinaire
  "86.10Z": "liberal", // Activités hospitalières (cliniques privées)
  "86.21Z": "liberal", // Médecins généralistes
  "86.22A": "liberal", // Médecins spécialistes radiologie
  "86.22B": "liberal", // Médecins spécialistes (hors radiologie)
  "86.22C": "liberal", // Autres spécialistes
  "86.23Z": "liberal", // Dentistes
  "86.90A": "liberal", // Ambulances
  "86.90B": "liberal", // Laboratoires d'analyses médicales
  "86.90C": "liberal", // Centres de santé
  "86.90D": "liberal", // Soins infirmiers
  "86.90E": "liberal", // Activités paramédicales (kinés, ostéo, orthophonistes)
  "86.90F": "liberal", // Activités thermales
};

// Préfixes par division (2 premiers chiffres). Fallback quand le code exact
// n'est pas listé, utile pour les niches sectorielles.
const DIVISION_PREFIX: Record<string, ProspectSegment> = {
  "85": "educational",
  "84": "public",
  "86": "liberal",
  "69": "liberal",
  "70": "liberal",
  "71": "liberal",
  "72": "liberal",
  "73": "liberal",
  "74": "liberal",
  "75": "liberal",
  "87": "public",
};

/**
 * Mappe un code NAF vers un segment de prospection. Retourne "pme" par défaut
 * pour tous les codes non-listés (tissu économique local standard).
 */
export function nafToSegment(nafCode: string | null | undefined): ProspectSegment {
  if (!nafCode) return "pme";
  const normalized = nafCode.trim().toUpperCase();

  // 1. Match exact
  const exact = EXACT_CODES[normalized];
  if (exact) return exact;

  // 2. Match par préfixe de division (XX.XXX → XX)
  const division = normalized.slice(0, 2);
  const viaDivision = DIVISION_PREFIX[division];
  if (viaDivision) return viaDivision;

  return "pme";
}

/**
 * Libellé humain d'un segment pour l'affichage UI.
 */
export function segmentLabel(segment: ProspectSegment): string {
  switch (segment) {
    case "educational": return "Éducation & petite enfance";
    case "public":      return "Collectivités & secteur public";
    case "liberal":     return "Professions libérales";
    case "pme":         return "PME & commerces";
  }
}

/**
 * Codes NAF conseillés pour un segment donné — utilisé par le formulaire de
 * recherche data.gouv (checkbox pré-remplie).
 */
export const SEGMENT_NAF_PRESETS: Record<ProspectSegment, string[]> = {
  educational: ["85.10Z", "85.20Z", "85.31Z", "85.32Z", "85.59A", "88.91A", "88.91B"],
  public:      ["84.11Z", "84.12Z", "87.10A", "87.30A"],
  liberal:     ["69.10Z", "69.20Z", "71.11Z", "71.12A", "86.21Z", "86.22B", "86.23Z", "86.90E"],
  pme:         [], // tissu économique large — pas de preset, filtrer par département
};
