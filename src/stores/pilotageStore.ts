import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PilotageChannel, PilotagePeriod } from '@/types/pilotage';

// Plages temporelles pré-définies pour les vues graphiques
export type PilotageTimeRange = '7d' | '30d' | '90d' | '180d' | '365d' | 'custom';

interface PilotageState {
  // Filtres actifs
  channel: PilotageChannel;
  timeRange: PilotageTimeRange;
  customStartDate: string | null;
  customEndDate: string | null;
  comparisonPeriod: PilotagePeriod;

  // UI
  sidebarOpen: boolean;
  coachPanelOpen: boolean;
  activeView: string; // 'overview' | 'ca-marge' | 'tresorerie' | 'boutique-pos' | 'objectifs' | 'coach' | 'alertes'

  // Actions
  setChannel: (channel: PilotageChannel) => void;
  setTimeRange: (range: PilotageTimeRange) => void;
  setCustomDateRange: (start: string | null, end: string | null) => void;
  setComparisonPeriod: (period: PilotagePeriod) => void;
  setSidebarOpen: (open: boolean) => void;
  setCoachPanelOpen: (open: boolean) => void;
  setActiveView: (view: string) => void;

  // Helper : plage de dates résolue à partir du timeRange
  getResolvedDateRange: () => { start: string; end: string };
}

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const usePilotageStore = create<PilotageState>()(
  persist(
    (set, get) => ({
      // State initial
      channel: 'all',
      timeRange: '30d',
      customStartDate: null,
      customEndDate: null,
      comparisonPeriod: 'month',
      sidebarOpen: true,
      coachPanelOpen: false,
      activeView: 'overview',

      // Setters
      setChannel: (channel) => set({ channel }),
      setTimeRange: (range) => set({ timeRange: range }),
      setCustomDateRange: (start, end) =>
        set({ customStartDate: start, customEndDate: end, timeRange: 'custom' }),
      setComparisonPeriod: (period) => set({ comparisonPeriod: period }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCoachPanelOpen: (open) => set({ coachPanelOpen: open }),
      setActiveView: (view) => set({ activeView: view }),

      // Calcul de la plage résolue (utile pour les requêtes)
      getResolvedDateRange: () => {
        const { timeRange, customStartDate, customEndDate } = get();
        const end = today();
        switch (timeRange) {
          case '7d':   return { start: daysAgo(7),   end };
          case '30d':  return { start: daysAgo(30),  end };
          case '90d':  return { start: daysAgo(90),  end };
          case '180d': return { start: daysAgo(180), end };
          case '365d': return { start: daysAgo(365), end };
          case 'custom':
            return {
              start: customStartDate ?? daysAgo(30),
              end: customEndDate ?? end,
            };
          default:     return { start: daysAgo(30),  end };
        }
      },
    }),
    {
      name: 'pilotage-store',
      // On ne persiste que les préférences utilisateur
      partialize: (state) => ({
        channel: state.channel,
        timeRange: state.timeRange,
        comparisonPeriod: state.comparisonPeriod,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
