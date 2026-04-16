import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ExternalLink, SearchX } from 'lucide-react';
import { useAiCmoDashboardStats, useAiCmoLlmCosts, useAiCmoCompetitors, useAiCmoQuestions } from '@/hooks/admin/useAiCmo';

// ── Donut Chart SVG Component ──────────────────────────────────────────────

function DonutChart({ value, size = 140, strokeWidth = 12, color = '#6366f1' }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      {/* Value arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

function DonutKPI({ value, label, description, color }: {
  value: number;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <Card className="bg-card">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <DonutChart value={value} size={120} strokeWidth={10} color={color} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold rotate-0" style={{ color }}>
                {value.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold">{label}</p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Progress Bar Component ─────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-medium w-14 text-right">{value.toFixed(1)}%</span>
    </div>
  );
}

// ── Domain Favicon ─────────────────────────────────────────────────────────

function DomainIcon({ domain }: { domain: string }) {
  const clean = domain.replace('www.', '');
  const initial = clean[0]?.toUpperCase() ?? '?';

  // Generate a deterministic color from the domain
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 45%, 55%)`;

  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

// ── Quota Usage Card ───────────────────────────────────────────────────────

function QuotaBar({ label, used, total }: { label: string; used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{used}/{total}</span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────────────

export function AiCmoDashboard() {
  const { data: stats, isLoading: loadingStats } = useAiCmoDashboardStats();
  const { data: costs = [], isLoading: loadingCosts } = useAiCmoLlmCosts();
  const { data: competitors = [] } = useAiCmoCompetitors();
  const { data: questions = [] } = useAiCmoQuestions();

  const competitorDomains = new Set(
    competitors.map((c) => {
      try { return new URL(c.website ?? '').hostname.replace('www.', ''); } catch { return ''; }
    }).filter(Boolean),
  );

  const getDomainType = (domain: string): { label: string; color: string } => {
    const clean = domain.replace('www.', '');
    if (clean.includes('ma-papeterie') || clean.includes('mapapeterie'))
      return { label: 'Vous', color: '#22c55e' };
    if (competitorDomains.has(clean))
      return { label: 'Concurrent', color: '#ef4444' };
    return { label: 'Autre', color: '#6b7280' };
  };

  if (loadingStats || loadingCosts) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <SearchX className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Aucune donnée de tableau de bord</p>
          <p className="text-sm">
            Les statistiques apparaîtront une fois le service de monitoring actif
          </p>
        </CardContent>
      </Card>
    );
  }

  const sov = (stats.share_of_voice ?? []).slice(0, 20);
  const totalLlmCalls = costs.reduce((acc, c) => acc + (c.call_count ?? 0), 0);
  const totalCost = costs.reduce((acc, c) => acc + c.cost, 0);

  return (
    <div className="space-y-6">
      {/* ── KPI Donut Charts ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DonutKPI
          value={stats.ai_visibility_score}
          label="AI Visibility Score"
          description="Prompts produit où votre marque ou site web est mentionné"
          color="#8b5cf6"
        />
        <DonutKPI
          value={stats.website_citation_share}
          label="Website Citation"
          description="Prompts où votre site web est cité dans la réponse"
          color="#6366f1"
        />

        {/* ── Quota Usage ─────────────────────────────────────────────── */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilisation des quotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuotaBar label="Questions actives" used={questions.filter(q => q.is_active).length} total={questions.length || 1} />
            <QuotaBar label="Appels LLM" used={totalLlmCalls} total={Math.max(totalLlmCalls, 120)} />
            <QuotaBar label="Analyses totales" used={stats.total_runs} total={Math.max(stats.total_runs, 100)} />
            <QuotaBar label="Concurrents" used={competitors.length} total={Math.max(competitors.length, 10)} />
          </CardContent>
        </Card>
      </div>

      {/* ── Share of Voice Table ──────────────────────────────────────── */}
      {sov.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Share of Voice (top {sov.length})</CardTitle>
                <CardDescription>Domaines les plus mentionnés dans les réponses IA</CardDescription>
              </div>
              {stats.computed_at && (
                <span className="text-xs text-muted-foreground">
                  Mis à jour le {new Date(stats.computed_at).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Domaine</TableHead>
                    <TableHead className="w-64">Share of Voice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sov.map((entry, i) => {
                    const dt = getDomainType(entry.domain);
                    // Color the bar based on domain type
                    const barColor = dt.label === 'Vous' ? '#22c55e' : dt.label === 'Concurrent' ? '#ef4444' : '#8b5cf6';

                    return (
                      <TableRow key={i} className="hover:bg-muted/10">
                        <TableCell className="text-center font-medium text-muted-foreground">
                          {i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <DomainIcon domain={entry.domain} />
                            <span className="font-medium text-sm">{entry.domain}</span>
                            <a
                              href={`https://${entry.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            {dt.label !== 'Autre' && (
                              <Badge
                                variant={dt.label === 'Vous' ? 'default' : 'destructive'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {dt.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ProgressBar value={entry.percentage} color={barColor} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── LLM Costs ────────────────────────────────────────────────── */}
      {costs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Coûts LLM récents</CardTitle>
                <CardDescription>Suivi des dépenses API par modèle</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Coût total</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Date</TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead className="text-right">Appels</TableHead>
                    <TableHead className="text-right">Tokens in</TableHead>
                    <TableHead className="text-right">Tokens out</TableHead>
                    <TableHead className="text-right">Coût ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow key={cost.id} className="hover:bg-muted/10">
                      <TableCell className="whitespace-nowrap">
                        {new Date(cost.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cost.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{cost.call_count ?? '—'}</TableCell>
                      <TableCell className="text-right">{cost.tokens_in?.toLocaleString('fr-FR') ?? '—'}</TableCell>
                      <TableCell className="text-right">{cost.tokens_out?.toLocaleString('fr-FR') ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${cost.cost.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
