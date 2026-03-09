import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import type { SchoolListMatch } from '@/hooks/useSchoolCopilot';

interface CopilotMatchTableProps {
  matches: SchoolListMatch[];
}

const CopilotMatchTable = ({ matches }: CopilotMatchTableProps) => {
  if (!matches.length) return null;

  const getStatusIcon = (status: string, confidence: number) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'unmatched':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return <Badge variant="default" className="text-xs">Sûr</Badge>;
    if (confidence >= 0.4) return <Badge variant="secondary" className="text-xs">Moyen</Badge>;
    return <Badge variant="destructive" className="text-xs">Incertain</Badge>;
  };

  const matched = matches.filter(m => m.match_status === 'matched').length;
  const partial = matches.filter(m => m.match_status === 'partial').length;
  const unmatched = matches.filter(m => m.match_status === 'unmatched').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Correspondances ({matches.length} articles)</span>
          <div className="flex gap-2 text-xs font-normal">
            <Badge variant="default">{matched} trouvés</Badge>
            {partial > 0 && <Badge variant="secondary">{partial} partiels</Badge>}
            {unmatched > 0 && <Badge variant="destructive">{unmatched} manquants</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">Statut</TableHead>
                <TableHead>Article demandé</TableHead>
                <TableHead className="w-12">Qté</TableHead>
                <TableHead>Produit suggéré</TableHead>
                <TableHead className="w-20">Confiance</TableHead>
                <TableHead className="w-20 text-right">Prix unit.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                const bestCandidate = match.candidates?.[0];
                return (
                  <TableRow key={match.id}>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {getStatusIcon(match.match_status, match.confidence)}
                          </TooltipTrigger>
                          <TooltipContent>
                            {match.match_status === 'matched' && 'Correspondance trouvée'}
                            {match.match_status === 'partial' && 'Correspondance partielle'}
                            {match.match_status === 'unmatched' && 'Aucune correspondance'}
                            {match.match_status === 'pending' && 'En attente'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{match.item_label}</p>
                        {match.constraints && (
                          <p className="text-xs text-muted-foreground">{match.constraints}</p>
                        )}
                        {match.is_mandatory && (
                          <Badge variant="outline" className="text-xs mt-1">Obligatoire</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {match.item_quantity}
                    </TableCell>
                    <TableCell>
                      {bestCandidate ? (
                        <div className="flex items-center gap-2">
                          {bestCandidate.image_url && (
                            <img
                              src={bestCandidate.image_url}
                              alt={bestCandidate.name || "Produit correspondant"}
                              className="w-8 h-8 rounded object-cover"
                              loading="lazy"
                            />
                          )}
                          <div>
                            <p className="text-sm line-clamp-1">{bestCandidate.name}</p>
                            {bestCandidate.brand && (
                              <p className="text-xs text-muted-foreground">{bestCandidate.brand}</p>
                            )}
                            {bestCandidate.reason && (
                              <p className="text-xs text-muted-foreground italic">{bestCandidate.reason}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {match.match_status !== 'pending' && getConfidenceBadge(match.confidence)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {bestCandidate ? `${bestCandidate.price_ttc?.toFixed(2) || bestCandidate.price?.toFixed(2)}€` : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CopilotMatchTable;
