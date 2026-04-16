import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { useAiCmoPromptRuns } from '@/hooks/admin/useAiCmo';

const PAGE_SIZE = 20;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export function AiCmoResults() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAiCmoPromptRuns(page, PAGE_SIZE);

  const runs = data?.runs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <SearchX className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Aucun résultat pour le moment</p>
          <p className="text-sm">
            Les résultats apparaîtront une fois le service de monitoring actif
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats des analyses</CardTitle>
        <CardDescription>
          {total} résultat{total > 1 ? 's' : ''} — Page {page + 1}/{totalPages}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Marque citée</TableHead>
                <TableHead className="text-right">Rang</TableHead>
                <TableHead>Top domaine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <Collapsible key={run.id} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(run.run_at)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {run.ai_cmo_questions?.prompt ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{run.llm_provider}</TableCell>
                        <TableCell className="text-sm font-mono">{run.llm_model}</TableCell>
                        <TableCell>
                          {run.brand_mentioned != null ? (
                            <Badge variant={run.brand_mentioned ? 'default' : 'secondary'}>
                              {run.brand_mentioned ? 'Oui' : 'Non'}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {run.company_domain_rank ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{run.top_domain ?? '—'}</TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Réponse brute
                              </p>
                              <pre className="text-xs whitespace-pre-wrap bg-background p-3 rounded border max-h-60 overflow-y-auto">
                                {run.raw_response ?? 'Aucune réponse'}
                              </pre>
                            </div>
                            {run.mentioned_pages && run.mentioned_pages.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Pages mentionnées
                                </p>
                                <ul className="text-xs space-y-1">
                                  {run.mentioned_pages.map((page, i) => (
                                    <li key={i} className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{i + 1}.</span>
                                      <span>{page.url}</span>
                                      {page.title && (
                                        <span className="text-muted-foreground">— {page.title}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
