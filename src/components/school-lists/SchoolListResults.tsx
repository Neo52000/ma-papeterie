import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CheckCircle, AlertTriangle, AlertCircle, ShoppingCart,
  ChevronDown, Mail, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SchoolListMatch, MatchStats } from '@/hooks/useSchoolCopilot';

interface SchoolListResultsProps {
  matches: SchoolListMatch[];
  stats: MatchStats | null;
  classe: string | null;
  ecole: string | null;
  onAddToCart: (selectedMatchIds: string[]) => void;
}

const SchoolListResults = ({
  matches,
  stats,
  classe,
  ecole,
  onAddToCart,
}: SchoolListResultsProps) => {
  // Par défaut, cocher les articles matchés et partiels
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const m of matches) {
      if (m.match_status === 'matched' || m.match_status === 'partial') {
        initial.add(m.id);
      }
    }
    return initial;
  });

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const matchable = matches.filter((m) => m.candidates?.length > 0);
    if (selectedIds.size === matchable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(matchable.map((m) => m.id)));
    }
  };

  // Calcul du total panier
  const { totalTtc, selectedCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const m of matches) {
      if (!selectedIds.has(m.id)) continue;
      const candidate = m.candidates?.[0];
      if (!candidate) continue;
      const price = candidate.price_ttc ?? candidate.price ?? 0;
      total += price * (m.item_quantity || 1);
      count++;
    }
    return { totalTtc: Math.round(total * 100) / 100, selectedCount: count };
  }, [matches, selectedIds]);

  const matchRate = stats
    ? Math.round(((stats.matched + stats.partial) / Math.max(stats.total_items, 1)) * 100)
    : 0;

  const handleAddToCart = () => {
    onAddToCart(Array.from(selectedIds));
  };

  // Corps du mailto pour le CTA secondaire
  const mailtoBody = matches
    .map((m) => `- ${m.item_label} × ${m.item_quantity}${m.constraints ? ` (${m.constraints})` : ''}`)
    .join('\n');
  const mailtoHref = `mailto:contact@ma-papeterie.fr?subject=Liste scolaire${classe ? ` ${classe}` : ''}&body=${encodeURIComponent(`Bonjour,\n\nVoici ma liste scolaire :\n\n${mailtoBody}\n\nMerci !`)}`;

  return (
    <div className="space-y-4">
      {/* En-tête stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-sm">
                  {stats?.matched ?? 0} / {stats?.total_items ?? 0} articles trouvés
                </Badge>
                {classe && (
                  <Badge variant="secondary" className="gap-1">
                    <GraduationCap className="w-3 h-3" />
                    {classe}
                  </Badge>
                )}
                {ecole && (
                  <Badge variant="outline" className="text-xs">{ecole}</Badge>
                )}
              </div>
              <Progress value={matchRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats?.matched ?? 0} trouvés · {stats?.partial ?? 0} proches · {stats?.unmatched ?? 0} non trouvés
              </p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={selectedCount === 0}
              size="lg"
              className="shrink-0"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ajouter {selectedCount} article{selectedCount > 1 ? 's' : ''} au panier
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des articles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Détail des articles</span>
            <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
              {selectedIds.size === matches.filter((m) => m.candidates?.length > 0).length
                ? 'Tout décocher'
                : 'Tout cocher'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* En-tête du tableau (masqué sur mobile) */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_56px] gap-4 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
            <span>Article demandé</span>
            <span>Produit trouvé</span>
            <span className="text-center">Sélection</span>
          </div>

          {/* Lignes */}
          <div className="divide-y">
            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                selected={selectedIds.has(match.id)}
                onToggle={() => toggleItem(match.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer sticky sur mobile */}
      <div className="sticky bottom-0 z-10 bg-background border-t p-4 md:static md:border-t-0 md:p-0">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-lg font-bold">{totalTtc.toFixed(2)} € TTC</p>
            <p className="text-xs text-muted-foreground">
              {selectedCount} article{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleAddToCart}
              disabled={selectedCount === 0}
              className="flex-1 sm:flex-none"
              size="lg"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ajouter au panier
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href={mailtoHref}>
                <Mail className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Envoyer à la boutique</span>
                <span className="sm:hidden">Envoyer</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Ligne d'article ────────────────────────────────────────────────────────

interface MatchRowProps {
  match: SchoolListMatch;
  selected: boolean;
  onToggle: () => void;
}

const MatchRow = ({ match, selected, onToggle }: MatchRowProps) => {
  const bestCandidate = match.candidates?.[0];
  const alternatives = match.candidates?.slice(1) ?? [];
  const hasProduct = Boolean(bestCandidate);
  const price = bestCandidate?.price_ttc ?? bestCandidate?.price ?? 0;
  const lineTotal = price * (match.item_quantity || 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_56px] gap-2 md:gap-4 p-4 hover:bg-muted/30 transition-colors">
      {/* Colonne 1 : Article demandé */}
      <div className="flex items-start gap-2">
        <StatusIcon status={match.match_status} />
        <div className="min-w-0">
          <p className="font-medium text-sm">
            {match.item_label}
            <span className="text-muted-foreground ml-1">× {match.item_quantity}</span>
          </p>
          {match.constraints && (
            <p className="text-xs text-muted-foreground mt-0.5">{match.constraints}</p>
          )}
        </div>
      </div>

      {/* Colonne 2 : Produit trouvé */}
      <div className="flex items-center gap-2 ml-6 md:ml-0">
        {hasProduct ? (
          <>
            {bestCandidate?.image_url && (
              <img
                src={bestCandidate.image_url}
                alt={bestCandidate.product_name || bestCandidate.name || ''}
                className="w-8 h-8 rounded object-cover shrink-0"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm line-clamp-1">
                {bestCandidate?.product_name || bestCandidate?.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-medium">{lineTotal.toFixed(2)} €</span>
                <MatchBadge status={match.match_status} />
                {alternatives.length > 0 && (
                  <AlternativesPopover alternatives={alternatives} itemQty={match.item_quantity} />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">Non trouvé</Badge>
          </div>
        )}
      </div>

      {/* Colonne 3 : Checkbox */}
      <div className="flex items-center justify-center ml-6 md:ml-0">
        {hasProduct && (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Sélectionner ${match.item_label}`}
          />
        )}
      </div>
    </div>
  );
};

// ── Composants utilitaires ─────────────────────────────────────────────────

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'matched':
      return <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />;
    case 'partial':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    default:
      return <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
  }
};

const MatchBadge = ({ status }: { status: string }) => {
  if (status === 'matched') {
    return <Badge variant="default" className="text-[10px] px-1.5 py-0">Trouvé</Badge>;
  }
  if (status === 'partial') {
    return <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800")}>Proche</Badge>;
  }
  return null;
};

interface AlternativesPopoverProps {
  alternatives: SchoolListMatch['candidates'];
  itemQty: number;
}

const AlternativesPopover = ({ alternatives, itemQty }: AlternativesPopoverProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground">
        Alternatives
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-72 p-3" align="start">
      <p className="text-xs font-medium mb-2">Produits alternatifs</p>
      <div className="space-y-2">
        {alternatives.map((alt, i) => {
          const price = alt.price_ttc ?? alt.price ?? 0;
          return (
            <div key={i} className="flex items-center gap-2">
              {alt.image_url && (
                <img
                  src={alt.image_url}
                  alt={alt.product_name || alt.name || ''}
                  className="w-6 h-6 rounded object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs line-clamp-1">{alt.product_name || alt.name}</p>
                {alt.brand && <p className="text-[10px] text-muted-foreground">{alt.brand}</p>}
              </div>
              <span className="text-xs font-medium whitespace-nowrap">
                {(price * (itemQty || 1)).toFixed(2)} €
              </span>
            </div>
          );
        })}
      </div>
    </PopoverContent>
  </Popover>
);

export default SchoolListResults;
