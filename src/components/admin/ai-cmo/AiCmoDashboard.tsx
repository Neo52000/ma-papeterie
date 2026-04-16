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
import { Eye, Globe, Activity, SearchX } from 'lucide-react';
import { useAiCmoDashboardStats, useAiCmoLlmCosts, useAiCmoCompetitors } from '@/hooks/admin/useAiCmo';

export function AiCmoDashboard() {
  const { data: stats, isLoading: loadingStats } = useAiCmoDashboardStats();
  const { data: costs = [], isLoading: loadingCosts } = useAiCmoLlmCosts();
  const { data: competitors = [] } = useAiCmoCompetitors();

  const competitorDomains = new Set(
    competitors.map((c) => {
      try { return new URL(c.website ?? '').hostname.replace('www.', ''); } catch { return ''; }
    }).filter(Boolean),
  );

  const getDomainType = (domain: string): { label: string; variant: 'default' | 'destructive' | 'secondary' } => {
    const clean = domain.replace('www.', '');
    if (clean.includes('ma-papeterie') || clean.includes('mapapeterie'))
      return { label: 'Vous', variant: 'default' };
    if (competitorDomains.has(clean))
      return { label: 'Concurrent', variant: 'destructive' };
    return { label: 'Autre', variant: 'secondary' };
  };

  if (loadingStats || loadingCosts) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-3xl font-bold">{stats.ai_visibility_score.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Score de visibilité IA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-3xl font-bold">{stats.website_citation_share.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Part de citation du site</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-3xl font-bold">{stats.total_runs}</p>
                <p className="text-sm text-muted-foreground">Total des analyses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share of Voice */}
      {sov.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Share of Voice</CardTitle>
            <CardDescription>Top {sov.length} domaines mentionnés par les IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domaine</TableHead>
                    <TableHead className="text-right">Mentions</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sov.map((entry, i) => {
                    const dt = getDomainType(entry.domain);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{entry.domain}</TableCell>
                        <TableCell className="text-right">{entry.count}</TableCell>
                        <TableCell className="text-right font-semibold">{entry.percentage.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant={dt.variant}>{dt.label}</Badge>
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

      {/* LLM Costs */}
      {costs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Coûts LLM récents</CardTitle>
            <CardDescription>Suivi des dépenses API par modèle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={cost.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(cost.date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{cost.model}</TableCell>
                      <TableCell className="text-right">{cost.call_count ?? '—'}</TableCell>
                      <TableCell className="text-right">{cost.tokens_in?.toLocaleString('fr-FR') ?? '—'}</TableCell>
                      <TableCell className="text-right">{cost.tokens_out?.toLocaleString('fr-FR') ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {cost.cost.toFixed(4)}
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
