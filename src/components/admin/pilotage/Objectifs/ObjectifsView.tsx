import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Target, Plus, Calendar, TrendingUp } from 'lucide-react';
import { usePilotageGoals, useGoalProgress } from '@/hooks/usePilotageGoals';
import type { PilotagePeriod } from '@/types/pilotage';
import { DATA_NOIR } from '../_shared/colors';
import { formatEur, formatPct, formatDate, channelLabel } from '../_shared/formatters';
import { GoalEditor } from './GoalEditor';
import { Button } from '@/components/ui/button';

export function ObjectifsView() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PilotagePeriod>('month');

  const { data: goals, isLoading } = usePilotageGoals(periodFilter);
  const { data: progresses } = useGoalProgress(periodFilter);

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>Objectifs</h2>
          <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
            Prévisionnel vs réalisé, avec rythme quotidien requis
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGoalId(null);
            setEditorOpen(true);
          }}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvel objectif
        </Button>
      </div>

      {/* Filtre période */}
      <div className="flex gap-1">
        {(['month', 'quarter', 'year'] as PilotagePeriod[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriodFilter(p)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-md transition-colors',
              periodFilter === p
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:bg-zinc-900'
            )}
          >
            {p === 'month' ? 'Mensuel' : p === 'quarter' ? 'Trimestriel' : 'Annuel'}
          </button>
        ))}
      </div>

      {/* Liste des objectifs */}
      {isLoading ? (
        <div className={cn('text-sm', DATA_NOIR.textMuted)}>Chargement…</div>
      ) : !goals || goals.length === 0 ? (
        <div
          className={cn(
            'rounded-xl border p-8 text-center',
            DATA_NOIR.bgCard,
            DATA_NOIR.bgBorder
          )}
        >
          <Target className={cn('h-10 w-10 mx-auto mb-3', DATA_NOIR.textMuted)} />
          <h3 className={cn('text-base font-medium mb-1', DATA_NOIR.textPrimary)}>
            Aucun objectif défini
          </h3>
          <p className={cn('text-sm mb-4', DATA_NOIR.textMuted)}>
            Fixe un premier objectif pour commencer à mesurer ta progression.
          </p>
          <Button
            onClick={() => {
              setEditingGoalId(null);
              setEditorOpen(true);
            }}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
          >
            Créer un objectif
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => {
            const progress = progresses?.find(p => p.goal_id === goal.id);
            const progressionPct = progress?.progression_pct ?? 0;
            const isAhead = progressionPct >= 100;
            const isOnTrack = progressionPct >= 80 && !isAhead;

            return (
              <div
                key={goal.id}
                className={cn(
                  'rounded-xl border p-5 transition-colors cursor-pointer',
                  DATA_NOIR.bgCard,
                  DATA_NOIR.bgBorder,
                  'hover:bg-zinc-900'
                )}
                onClick={() => {
                  setEditingGoalId(goal.id);
                  setEditorOpen(true);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded font-medium',
                          DATA_NOIR.bgCardHover,
                          DATA_NOIR.textSecondary
                        )}
                      >
                        {channelLabel(goal.channel)}
                      </span>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded font-medium',
                          DATA_NOIR.bgCardHover,
                          DATA_NOIR.textSecondary
                        )}
                      >
                        {goal.period === 'month' ? 'Mensuel' : goal.period === 'quarter' ? 'Trimestriel' : 'Annuel'}
                      </span>
                    </div>
                    <div className={cn('text-sm flex items-center gap-1.5', DATA_NOIR.textMuted)}>
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(goal.period_start, { short: true })} → {formatDate(goal.period_end, { short: true })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'text-2xl font-semibold tabular-nums',
                        isAhead
                          ? DATA_NOIR.positive
                          : isOnTrack
                          ? DATA_NOIR.textPrimary
                          : DATA_NOIR.warning
                      )}
                    >
                      {formatPct(progressionPct)}
                    </div>
                    <div className={cn('text-xs', DATA_NOIR.textMuted)}>de l'objectif</div>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className={cn('w-full h-2 rounded-full overflow-hidden', DATA_NOIR.bgCardHover)}>
                  <div
                    className={cn(
                      'h-full transition-all',
                      isAhead ? 'bg-emerald-500' : isOnTrack ? 'bg-sky-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(100, progressionPct)}%` }}
                  />
                </div>

                {/* Détail */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <div className={cn('text-xs', DATA_NOIR.textMuted)}>Objectif CA</div>
                    <div className={cn('text-sm font-semibold tabular-nums', DATA_NOIR.textPrimary)}>
                      {formatEur(goal.objectif_ca_ht, { compact: true })}
                    </div>
                  </div>
                  <div>
                    <div className={cn('text-xs', DATA_NOIR.textMuted)}>Réalisé</div>
                    <div className={cn('text-sm font-semibold tabular-nums', DATA_NOIR.textPrimary)}>
                      {progress ? formatEur(progress.realise_ca_ht, { compact: true }) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className={cn('text-xs', DATA_NOIR.textMuted)}>Jours restants</div>
                    <div className={cn('text-sm font-semibold tabular-nums', DATA_NOIR.textPrimary)}>
                      {progress?.jours_restants ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className={cn('text-xs', DATA_NOIR.textMuted)}>Rythme requis /j</div>
                    <div
                      className={cn(
                        'text-sm font-semibold tabular-nums flex items-center gap-1',
                        isOnTrack || isAhead ? DATA_NOIR.positive : DATA_NOIR.warning
                      )}
                    >
                      <TrendingUp className="h-3 w-3" />
                      {progress && progress.rythme_quotidien_requis > 0
                        ? formatEur(progress.rythme_quotidien_requis, { compact: true })
                        : 'Atteint'}
                    </div>
                  </div>
                </div>

                {goal.notes && (
                  <div
                    className={cn(
                      'mt-3 pt-3 border-t text-xs',
                      DATA_NOIR.bgBorder,
                      DATA_NOIR.textMuted
                    )}
                  >
                    {goal.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <GoalEditor
          goalId={editingGoalId}
          onClose={() => {
            setEditorOpen(false);
            setEditingGoalId(null);
          }}
        />
      )}
    </div>
  );
}
