import { create } from "zustand";

interface AlertsFilter {
  status: string | null;
  supplierId: string | null;
  search: string;
}

interface MovementsFilter {
  type: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

interface StockStoreState {
  activeTab: string;
  alertsFilter: AlertsFilter;
  movementsFilter: MovementsFilter;
  movementsPage: number;
  setActiveTab: (tab: string) => void;
  setAlertsFilter: (filter: Partial<AlertsFilter>) => void;
  setMovementsFilter: (filter: Partial<MovementsFilter>) => void;
  setMovementsPage: (page: number) => void;
}

export const useStockStore = create<StockStoreState>()((set) => ({
  activeTab: "alerts",
  alertsFilter: { status: null, supplierId: null, search: "" },
  movementsFilter: { type: null, dateFrom: null, dateTo: null },
  movementsPage: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setAlertsFilter: (filter) =>
    set((s) => ({ alertsFilter: { ...s.alertsFilter, ...filter } })),

  setMovementsFilter: (filter) =>
    set((s) => ({
      movementsFilter: { ...s.movementsFilter, ...filter },
      movementsPage: 0,
    })),

  setMovementsPage: (page) => set({ movementsPage: page }),
}));
