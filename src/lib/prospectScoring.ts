// ─────────────────────────────────────────────────────────────────────────────
// Lead scoring des prospects data.gouv
// ─────────────────────────────────────────────────────────────────────────────
// Score 0-100 calculé à partir des données SIRENE publiques. Plus le score est
// élevé, plus le prospect est prioritaire pour les commerciaux.
//
// Composition :
//   - Segment (40 pts)       : educational/public = forte priorité Ma Papeterie
//   - Effectif (30 pts)      : plus l'entreprise est grande, plus gros potentiel
//   - Ancienneté (15 pts)    : > 5 ans = stable, < 1 an = incertain
//   - Géographie (15 pts)    : Haute-Marne (52) = cible prioritaire, Grand Est
//                              proche aussi favorisé
//
// Les tranches d'effectif INSEE (tranche_effectif_salarie) suivent un code
// numérique documenté :
//   https://www.insee.fr/fr/information/2028013

import { nafToSegment, type ProspectSegment } from "./nafToSegment";

export interface ScoringInput {
  nafCode: string | null | undefined;
  employeeRange: string | null | undefined; // code INSEE "NN", "00" ou libellé "20-49"
  foundedDate: string | null | undefined;   // "YYYY-MM-DD"
  dept: string | null | undefined;          // "52", "10", ...
}

export interface ScoringResult {
  score: number;
  segment: ProspectSegment;
  breakdown: {
    segment: number;
    employee: number;
    seniority: number;
    geography: number;
  };
}

// ── Segment (max 40) ────────────────────────────────────────────────────────

const SEGMENT_POINTS: Record<ProspectSegment, number> = {
  educational: 40, // cœur métier papeterie scolaire
  public:      35, // marchés publics, volumes récurrents
  liberal:     25, // consommation papier/impression stable
  pme:         15, // volume unitaire moindre
};

// ── Effectif (max 30) ───────────────────────────────────────────────────────

// Code INSEE → points. Le libellé "N-M" est mappé également.
// Référence : tranche_effectif_salarie dans l'API data.gouv.
const EMPLOYEE_CODE_POINTS: Record<string, number> = {
  "NN": 0,   // Non renseigné / sans salarié
  "00": 3,   // 0 salarié
  "01": 5,   // 1-2 salariés
  "02": 8,   // 3-5 salariés
  "03": 12,  // 6-9 salariés
  "11": 16,  // 10-19 salariés
  "12": 20,  // 20-49 salariés
  "21": 24,  // 50-99 salariés
  "22": 26,  // 100-199 salariés
  "31": 28,  // 200-249 salariés
  "32": 29,  // 250-499 salariés
  "41": 30,  // 500-999 salariés
  "42": 30,  // 1000-1999 salariés
  "51": 30,  // 2000-4999 salariés
  "52": 30,  // 5000-9999 salariés
  "53": 30,  // 10000+
};

// Libellés humains (fallback si l'API renvoie un libellé au lieu d'un code)
const EMPLOYEE_LABEL_POINTS: Array<[RegExp, number]> = [
  [/1[\s-]*[àa-]\s*2/i, 5],
  [/3[\s-]*[àa-]\s*5/i, 8],
  [/6[\s-]*[àa-]\s*9/i, 12],
  [/10[\s-]*[àa-]\s*19/i, 16],
  [/20[\s-]*[àa-]\s*49/i, 20],
  [/50[\s-]*[àa-]\s*99/i, 24],
  [/100[\s-]*[àa-]\s*199/i, 26],
  [/200[\s-]*[àa-]\s*249/i, 28],
  [/250[\s-]*[àa-]\s*499/i, 29],
  [/500\+|\b1000\b/i, 30],
];

function employeePoints(range: string | null | undefined): number {
  if (!range) return 0;
  const trimmed = range.trim();
  // Match par code exact (2 chiffres ou "NN")
  const viaCode = EMPLOYEE_CODE_POINTS[trimmed.toUpperCase()];
  if (viaCode !== undefined) return viaCode;
  // Match par libellé
  for (const [re, pts] of EMPLOYEE_LABEL_POINTS) {
    if (re.test(trimmed)) return pts;
  }
  return 0;
}

// ── Ancienneté (max 15) ─────────────────────────────────────────────────────

function seniorityPoints(foundedDate: string | null | undefined): number {
  if (!foundedDate) return 0;
  const founded = Date.parse(foundedDate);
  if (Number.isNaN(founded)) return 0;
  const yearsOld = (Date.now() - founded) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsOld < 0.5) return 2;   // < 6 mois : très jeune, risque
  if (yearsOld < 1)   return 5;
  if (yearsOld < 3)   return 8;
  if (yearsOld < 5)   return 12;
  return 15;                       // > 5 ans : stable
}

// ── Géographie (max 15) ─────────────────────────────────────────────────────

// Département principal = 52 (Haute-Marne, Chaumont). Départements limitrophes
// = cible secondaire (Aube 10, Marne 51, Vosges 88, Meuse 55, Haute-Saône 70).
// Autres Grand Est / France entière = score faible.
const DEPT_POINTS: Record<string, number> = {
  "52": 15, // Haute-Marne (cible principale)
  "10": 12, // Aube
  "51": 12, // Marne
  "55": 10, // Meuse
  "88": 10, // Vosges
  "70": 10, // Haute-Saône
  "21": 8,  // Côte-d'Or
  "54": 6,  // Meurthe-et-Moselle
  "57": 6,  // Moselle
  "67": 5,  // Bas-Rhin
  "68": 5,  // Haut-Rhin
  "08": 5,  // Ardennes
};

function geographyPoints(dept: string | null | undefined): number {
  if (!dept) return 0;
  return DEPT_POINTS[dept.trim()] ?? 2; // hors zone : 2 pts de base
}

// ── Fonction principale ─────────────────────────────────────────────────────

export function computeProspectScore(input: ScoringInput): ScoringResult {
  const segment = nafToSegment(input.nafCode);
  const segmentScore = SEGMENT_POINTS[segment];
  const employeeScore = employeePoints(input.employeeRange);
  const seniorityScore = seniorityPoints(input.foundedDate);
  const geographyScore = geographyPoints(input.dept);

  const total = Math.max(
    0,
    Math.min(100, segmentScore + employeeScore + seniorityScore + geographyScore),
  );

  return {
    score: total,
    segment,
    breakdown: {
      segment: segmentScore,
      employee: employeeScore,
      seniority: seniorityScore,
      geography: geographyScore,
    },
  };
}
