import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Trash2 } from 'lucide-react';
import { usePilotageGoals, useSaveGoal, useDeleteGoal } from '@/hooks/usePilotageGoals';
import type { PilotagePeriod, PilotageChannel } from '@/types/pilotage';
import { DATA_NOIR } from '../_shared/colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface GoalEditorProps {
  goalId: string | null;
  onClose: () => void;
}

export function GoalEditor({ goalId, onClose }: GoalEditorProps) {
  const { data: allGoals } = usePilotageGoals();
  const saveGoal = useSaveGoal();
  const deleteGoal = useDeleteGoal();

  const existingGoal = allGoals?.find(g => g.id === goalId) ?? null;

  const [period, setPeriod] = useState<PilotagePeriod>(existingGoal?.period ?? 'month');
  const [channel, setChannel] = useState<PilotageChannel>(existingGoal?.channel ?? 'all');
  const [periodStart, setPeriodStart] = useState<string>(
    existingGoal?.period_start ?? getDefaultStart('month')
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    existingGoal?.period_end ?? getDefaultEnd('month')
  );
  const [objectifCa, setObjectifCa] = useState<string>(
    existingGoal?.objectif_ca_ht?.toString() ?? ''
  );
  const [objectifTauxMarge, setObjectifTauxMarge] = useState<string>(
    existingGoal?.objectif_taux_marge?.toString() ?? ''
  );
  const [notes, setNotes] = useState<string>(existingGoal?.notes ?? '');

  // Recalcule les dates par défaut si on change de période (uniquement en création)
  useEffect(() => {
    if (!existingGoal) {
      setPeriodStart(getDefaultStart(period));
      setPeriodEnd(getDefaultEnd(period));
    }
  }, [period, existingGoal]);

  const handleSave = async () => {
    await saveGoal.mutateAsync({
      ...(existingGoal?.id ? { id: existingGoal.id } : {}),
      period,
      period_start: periodStart,
      period_end: periodEnd,
      channel,
      objectif_ca_ht: objectifCa ? Number(objectifCa) : null,
      objectif_taux_marge: objectifTauxMarge ? Number(objectifTauxMarge) : null,
      notes: notes || null,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!existingGoal?.id) return;
    if (!confirm('Supprimer cet objectif ?')) return;
    await deleteGoal.mutateAsync(existingGoal.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        className={cn(
          'w-full max-w-lg rounded-xl border shadow-xl',
          DATA_NOIR.bgCard,
          DATA_NOIR.bgBorder
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center justify-between p-5 border-b', DATA_NOIR.bgBorder)}>
          <h3 className={cn('text-lg font-semibold', DATA_NOIR.textPrimary)}>
            {existingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={cn('p-1 rounded hover:bg-zinc-800', DATA_NOIR.textMuted)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Période */}
          <div>
            <Label className={DATA_NOIR.textSecondary}>Période</Label>
            <div className="flex gap-1 mt-1.5">
              {(['month', 'quarter', 'year'] as PilotagePeriod[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'flex-1 text-xs px-3 py-2 rounded-md transition-colors',
                    period === p
                      ? 'bg-zinc-700 text-zinc-100 font-medium'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  {p === 'month' ? 'Mensuel' : p === 'quarter' ? 'Trimestriel' : 'Annuel'}
                </button>
              ))}
            </div>
          </div>

          {/* Canal */}
          <div>
            <Label className={DATA_NOIR.textSecondary}>Canal</Label>
            <div className="grid grid-cols-2 gap-1 mt-1.5">
              {(['all', 'web_b2c', 'web_b2b', 'pos'] as PilotageChannel[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    'text-xs px-3 py-2 rounded-md transition-colors',
                    channel === c
                      ? 'bg-zinc-700 text-zinc-100 font-medium'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  {c === 'all' ? 'Tous' : c === 'web_b2c' ? 'Web B2C' : c === 'web_b2b' ? 'Web B2B' : 'Boutique'}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={DATA_NOIR.textSecondary}>Début</Label>
              <Input
                type="date"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 mt-1.5"
              />
            </div>
            <div>
              <Label className={DATA_NOIR.textSecondary}>Fin</Label>
              <Input
                type="date"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 mt-1.5"
              />
            </div>
          </div>

          {/* Objectifs */}
          <div>
            <Label className={DATA_NOIR.textSecondary}>Objectif CA HT (€)</Label>
            <Input
              type="number"
              min="0"
              step="100"
              value={objectifCa}
              onChange={e => setObjectifCa(e.target.value)}
              placeholder="30000"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 mt-1.5"
            />
          </div>

          <div>
            <Label className={DATA_NOIR.textSecondary}>Taux de marge cible (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={objectifTauxMarge}
              onChange={e => setObjectifTauxMarge(e.target.value)}
              placeholder="32"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 mt-1.5"
            />
          </div>

          <div>
            <Label className={DATA_NOIR.textSecondary}>Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contexte, stratégie associée…"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 mt-1.5"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={cn(
            'flex items-center justify-between gap-2 p-5 border-t',
            DATA_NOIR.bgBorder
          )}
        >
          {existingGoal ? (
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              disabled={deleteGoal.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="text-zinc-400">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveGoal.isPending}
              className="bg-zinc-200 hover:bg-zinc-100 text-zinc-900"
            >
              {saveGoal.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function getDefaultStart(period: PilotagePeriod): string {
  const now = new Date();
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
  }
  return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

function getDefaultEnd(period: PilotagePeriod): string {
  const now = new Date();
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().slice(0, 10);
  }
  return new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
}
