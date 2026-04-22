import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DATA_NOIR } from './colors';

interface PilotageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/**
 * État d'erreur uniformisé pour les vues du module Pilotage.
 * Utilisé quand un useQuery renvoie `isError` — évite que l'UI reste bloquée
 * en état "loading" ou affiche des valeurs undefined formatées.
 */
export function PilotageErrorState({
  title = 'Impossible de charger les données',
  message,
  onRetry,
}: PilotageErrorStateProps) {
  return (
    <div className={cn('p-6 flex items-center justify-center min-h-[400px]', DATA_NOIR.bg)}>
      <div
        className={cn(
          'max-w-md text-center p-8 rounded-xl border',
          DATA_NOIR.bgCard,
          DATA_NOIR.bgBorder,
        )}
        role="alert"
      >
        <div
          className={cn(
            'inline-flex h-12 w-12 rounded-xl items-center justify-center mb-4',
            DATA_NOIR.warningBg,
          )}
        >
          <AlertTriangle className={cn('h-6 w-6', DATA_NOIR.warning)} aria-hidden="true" />
        </div>
        <h3 className={cn('text-lg font-semibold mb-2', DATA_NOIR.textPrimary)}>
          {title}
        </h3>
        {message && (
          <p className={cn('text-sm mb-4', DATA_NOIR.textSecondary)}>
            {message}
          </p>
        )}
        <p className={cn('text-xs mb-6', DATA_NOIR.textMuted)}>
          Si le problème persiste, vérifiez que les snapshots KPI sont
          bien générés (cron <code>pilotage-compute-kpi-snapshot</code>)
          et que les vues matérialisées sont rafraîchies.
        </p>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="ghost"
            className={cn('border', DATA_NOIR.bgBorder, DATA_NOIR.textPrimary, 'hover:bg-zinc-800')}
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
