import { AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { B2BBudget } from '@/hooks/useB2BBudget';

interface BudgetWidgetProps {
  budget: B2BBudget | null;
  remaining: number | null;
  percentUsed: number;
  isOverBudget: boolean;
  isNearAlert: boolean;
  isLoading: boolean;
}

export function BudgetWidget({
  budget,
  remaining,
  percentUsed,
  isOverBudget,
  isNearAlert,
  isLoading,
}: BudgetWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-20 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aucun budget défini pour {new Date().getFullYear()}</p>
          <p className="text-xs text-muted-foreground">Contactez votre chargé de compte pour configurer votre budget annuel.</p>
        </CardContent>
      </Card>
    );
  }

  const barColor = isOverBudget
    ? 'bg-destructive'
    : isNearAlert
    ? 'bg-orange-500'
    : 'bg-primary';

  return (
    <Card className={isOverBudget ? 'border-destructive/50' : isNearAlert ? 'border-orange-300' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Budget {budget.year}
          </CardTitle>
          {isOverBudget && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> Dépassé
            </Badge>
          )}
          {!isOverBudget && isNearAlert && (
            <Badge className="gap-1 text-xs bg-orange-100 text-orange-800 border-orange-200">
              <AlertTriangle className="h-3 w-3" /> {percentUsed}% utilisé
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">
            {remaining !== null && remaining >= 0
              ? remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
              : '—'}
          </span>
          <span className="text-sm text-muted-foreground mb-1">restants</span>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1">
          <Progress value={Math.min(percentUsed, 100)} className="h-2" indicatorClassName={barColor} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{budget.spent_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} dépensés</span>
            <span>{budget.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} total</span>
          </div>
        </div>

        {isOverBudget && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Budget dépassé de {Math.abs(remaining ?? 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
