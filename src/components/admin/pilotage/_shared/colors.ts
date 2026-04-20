// Palette Data Noir pour le module pilotage — cohérent avec le reste de l'admin

export const DATA_NOIR = {
  // Backgrounds
  bg: 'bg-zinc-950',
  bgCard: 'bg-zinc-900/50',
  bgCardHover: 'bg-zinc-900',
  bgBorder: 'border-zinc-800',

  // Text
  textPrimary: 'text-zinc-100',
  textSecondary: 'text-zinc-400',
  textMuted: 'text-zinc-500',

  // Accents sémantiques
  positive: 'text-emerald-400',
  positiveBg: 'bg-emerald-500/10',
  positiveBorder: 'border-emerald-500/30',

  negative: 'text-rose-400',
  negativeBg: 'bg-rose-500/10',
  negativeBorder: 'border-rose-500/30',

  neutral: 'text-zinc-400',

  warning: 'text-amber-400',
  warningBg: 'bg-amber-500/10',
  warningBorder: 'border-amber-500/30',

  info: 'text-sky-400',
  infoBg: 'bg-sky-500/10',
  infoBorder: 'border-sky-500/30',

  critical: 'text-red-500',
  criticalBg: 'bg-red-500/15',
  criticalBorder: 'border-red-500/40',
} as const;

// Couleurs pour charts Recharts
export const CHART_COLORS = {
  ca: '#60a5fa',          // blue-400
  marge: '#34d399',       // emerald-400
  cogs: '#f87171',        // red-400
  encaissements: '#a78bfa', // violet-400
  objectif: '#fbbf24',    // amber-400
  web_b2c: '#60a5fa',
  web_b2b: '#34d399',
  pos: '#f472b6',         // pink-400
  all: '#a78bfa',
} as const;
