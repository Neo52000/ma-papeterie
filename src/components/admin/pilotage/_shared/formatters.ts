// Formatters français pour le module pilotage

export function formatEur(n: number | null | undefined, options?: { compact?: boolean; decimals?: number }): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const compact = options?.compact ?? false;
  const decimals = options?.decimals ?? 0;

  if (compact && Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(n) + ' €';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}

export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toFixed(decimals).replace('.', ',') + ' %';
}

export function formatDelta(n: number | null | undefined): { label: string; positive: boolean; neutral: boolean } {
  if (n === null || n === undefined || Number.isNaN(n)) {
    return { label: '—', positive: false, neutral: true };
  }
  if (n === 0) return { label: '0 %', positive: false, neutral: true };
  const sign = n > 0 ? '+' : '';
  return {
    label: `${sign}${n.toFixed(1).replace('.', ',')} %`,
    positive: n > 0,
    neutral: false,
  };
}

export function formatDate(dateStr: string | null | undefined, options?: { short?: boolean }): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  if (options?.short) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'à l\'instant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHour < 24) return `il y a ${diffHour} h`;
  if (diffDay < 7) return `il y a ${diffDay} j`;
  return formatDate(dateStr, { short: true });
}

export function channelLabel(channel: string): string {
  switch (channel) {
    case 'all': return 'Tous canaux';
    case 'web_b2c': return 'Web B2C';
    case 'web_b2b': return 'Web B2B';
    case 'pos': return 'Boutique';
    default: return channel;
  }
}
