import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  BellRing,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Play,
  X,
  Archive,
} from 'lucide-react';
import {
  useActiveAlerts,
  useAlertsHistory,
  useAlertRules,
  useUpdateAlertStatus,
  useToggleAlertRule,
  useRunAlertDetection,
} from '@/hooks/usePilotageAlerts';
import type { AlertSeverity } from '@/types/pilotage';
import { DATA_NOIR } from '../_shared/colors';
import { formatRelativeDate, channelLabel } from '../_shared/formatters';
import { Button } from '@/components/ui/button';

export function AlertesPanel() {
  const [tab, setTab] = useState<'active' | 'history' | 'rules'>('active');
  const { data: active } = useActiveAlerts();
  const { data: history } = useAlertsHistory(50);
  const { data: rules } = useAlertRules();
  const updateStatus = useUpdateAlertStatus();
  const toggleRule = useToggleAlertRule();
  const runDetection = useRunAlertDetection();

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>Alertes</h2>
          <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
            Détection automatique quotidienne — règles configurables
          </p>
        </div>
        <Button
          onClick={() => runDetection.mutate()}
          disabled={runDetection.isPending}
          variant="ghost"
          className={cn('border', DATA_NOIR.bgBorder, DATA_NOIR.textSecondary, 'hover:bg-zinc-800')}
        >
          <Play className="h-4 w-4 mr-2" />
          {runDetection.isPending ? 'Détection…' : 'Lancer détection'}
        </Button>
      </div>

      {/* Tabs */}
      <div className={cn('flex gap-1 border-b', DATA_NOIR.bgBorder)}>
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>
          Actives
          {active && active.length > 0 && (
            <span
              className={cn(
                'ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                DATA_NOIR.criticalBg,
                DATA_NOIR.critical
              )}
            >
              {active.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          Historique
        </TabButton>
        <TabButton active={tab === 'rules'} onClick={() => setTab('rules')}>
          Règles
        </TabButton>
      </div>

      {/* Contenu des tabs */}
      {tab === 'active' && (
        <div className="space-y-3">
          {!active || active.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tout est au vert"
              description="Aucune alerte active. Continue comme ça."
              positive
            />
          ) : (
            active.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'rounded-xl border p-4',
                  severityBgBorder(alert.severity)
                )}
              >
                <div className="flex items-start gap-3">
                  <SeverityIcon severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={cn('text-sm font-semibold', DATA_NOIR.textPrimary)}>
                        {alert.title}
                      </h3>
                      <span className={cn('text-xs whitespace-nowrap', DATA_NOIR.textMuted)}>
                        {formatRelativeDate(alert.triggered_at)}
                      </span>
                    </div>
                    <p className={cn('text-sm mb-3', DATA_NOIR.textSecondary)}>{alert.message}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {alert.channel && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            DATA_NOIR.bgCardHover,
                            DATA_NOIR.textSecondary
                          )}
                        >
                          {channelLabel(alert.channel)}
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded uppercase tracking-wider',
                          DATA_NOIR.bgCardHover,
                          DATA_NOIR.textSecondary
                        )}
                      >
                        {alert.severity}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatus.mutate({ alertId: alert.id, status: 'acknowledged' })
                          }
                          className="text-xs h-7 text-zinc-400 hover:text-zinc-100"
                        >
                          Vu
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatus.mutate({ alertId: alert.id, status: 'resolved' })
                          }
                          className="text-xs h-7 text-emerald-400 hover:text-emerald-300"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Résolu
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            updateStatus.mutate({ alertId: alert.id, status: 'dismissed' })
                          }
                          className="text-xs h-7 text-zinc-500 hover:text-zinc-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-2">
          {!history || history.length === 0 ? (
            <EmptyState icon={Archive} title="Historique vide" description="Aucune alerte passée" />
          ) : (
            history.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'rounded-lg border p-3 flex items-start gap-3',
                  DATA_NOIR.bgCard,
                  DATA_NOIR.bgBorder
                )}
              >
                <SeverityIcon severity={alert.severity} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-sm font-medium truncate', DATA_NOIR.textPrimary)}>
                      {alert.title}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded uppercase tracking-wider',
                        alert.status === 'resolved'
                          ? cn(DATA_NOIR.positiveBg, DATA_NOIR.positive)
                          : alert.status === 'active'
                          ? cn(DATA_NOIR.warningBg, DATA_NOIR.warning)
                          : cn(DATA_NOIR.bgCardHover, DATA_NOIR.textMuted)
                      )}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <div className={cn('text-xs mt-0.5', DATA_NOIR.textMuted)}>
                    {formatRelativeDate(alert.triggered_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-2">
          {!rules || rules.length === 0 ? (
            <EmptyState icon={BellRing} title="Aucune règle" description="Ajoute des règles via le SQL seed" />
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className={cn(
                  'rounded-lg border p-4 flex items-start gap-3',
                  DATA_NOIR.bgCard,
                  DATA_NOIR.bgBorder
                )}
              >
                <SeverityIcon severity={rule.severity} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn('text-sm font-medium', DATA_NOIR.textPrimary)}>
                      {rule.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        toggleRule.mutate({ ruleId: rule.id, isActive: !rule.is_active })
                      }
                      className={cn(
                        'text-xs px-2 py-0.5 rounded uppercase tracking-wider transition-colors',
                        rule.is_active
                          ? cn(DATA_NOIR.positiveBg, DATA_NOIR.positive)
                          : cn(DATA_NOIR.bgCardHover, DATA_NOIR.textMuted)
                      )}
                    >
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {rule.description && (
                    <p className={cn('text-xs mb-2', DATA_NOIR.textSecondary)}>
                      {rule.description}
                    </p>
                  )}
                  <div className="flex gap-2 text-[10px]">
                    <span className={cn('px-2 py-0.5 rounded', DATA_NOIR.bgCardHover, DATA_NOIR.textMuted)}>
                      {rule.metric}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded', DATA_NOIR.bgCardHover, DATA_NOIR.textMuted)}>
                      {rule.operator} {rule.threshold}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded', DATA_NOIR.bgCardHover, DATA_NOIR.textMuted)}>
                      {channelLabel(rule.channel)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// -------- Sub-composants ----------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative px-4 py-2.5 text-sm transition-colors',
        active ? DATA_NOIR.textPrimary : DATA_NOIR.textMuted,
        'hover:text-zinc-100'
      )}
    >
      {children}
      {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />}
    </button>
  );
}

function SeverityIcon({ severity, size = 'md' }: { severity: AlertSeverity; size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  if (severity === 'critical') return <AlertCircle className={cn(iconSize, DATA_NOIR.critical, 'shrink-0 mt-0.5')} />;
  if (severity === 'warning') return <AlertTriangle className={cn(iconSize, DATA_NOIR.warning, 'shrink-0 mt-0.5')} />;
  return <Info className={cn(iconSize, DATA_NOIR.info, 'shrink-0 mt-0.5')} />;
}

function severityBgBorder(severity: AlertSeverity): string {
  if (severity === 'critical') return cn(DATA_NOIR.criticalBg, DATA_NOIR.criticalBorder);
  if (severity === 'warning') return cn(DATA_NOIR.warningBg, DATA_NOIR.warningBorder);
  return cn(DATA_NOIR.infoBg, DATA_NOIR.infoBorder);
}

function EmptyState({
  icon: Icon,
  title,
  description,
  positive,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  positive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-8 text-center',
        DATA_NOIR.bgCard,
        DATA_NOIR.bgBorder
      )}
    >
      <Icon
        className={cn(
          'h-10 w-10 mx-auto mb-3',
          positive ? DATA_NOIR.positive : DATA_NOIR.textMuted
        )}
      />
      <h3 className={cn('text-base font-medium mb-1', DATA_NOIR.textPrimary)}>{title}</h3>
      <p className={cn('text-sm', DATA_NOIR.textMuted)}>{description}</p>
    </div>
  );
}
