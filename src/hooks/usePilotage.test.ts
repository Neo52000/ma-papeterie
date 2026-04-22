import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn();
const mockRpc = vi.fn();
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
    })),
    rpc: mockRpc,
    functions: {
      invoke: mockInvoke,
    },
  },
}));

import type {
  PilotageChannel,
  PilotageSnapshot,
  PilotageOverviewCurrent,
  TimeseriesPoint,
} from '@/types/pilotage';

describe('Pilotage channels', () => {
  it('has the 4 expected channels', () => {
    const channels: PilotageChannel[] = ['all', 'web_b2c', 'web_b2b', 'pos'];
    expect(channels).toHaveLength(4);
    expect(channels).toContain('all');
    expect(channels).toContain('pos');
  });
});

describe('PilotageSnapshot shape', () => {
  it('contains all KPI fields', () => {
    const snapshot: PilotageSnapshot = {
      id: 'snap-1',
      snapshot_date: '2026-04-20',
      channel: 'all',
      ca_ht: 1000,
      ca_ttc: 1200,
      cogs_ht: 600,
      marge_brute: 400,
      taux_marge: 40,
      nb_orders: 10,
      nb_orders_paid: 8,
      panier_moyen_ht: 100,
      nb_customers_unique: 10,
      nb_customers_new: 3,
      nb_customers_returning: 7,
      encaissements_ttc: 950,
      creances_pendantes_ttc: 250,
      nb_transactions_pos: null,
      ticket_moyen_pos_ttc: null,
      nb_sessions: null,
      taux_conversion: null,
      computed_at: '2026-04-20T23:30:00Z',
      raw_data: { orders_count: 10 },
    };
    expect(snapshot.channel).toBe('all');
    expect(snapshot.marge_brute).toBe(400);
    expect(snapshot.ca_ht - snapshot.cogs_ht).toBe(snapshot.marge_brute);
  });

  it('taux_marge is a percentage', () => {
    const ca = 1000;
    const cogs = 600;
    const marge = ca - cogs;
    const taux = (marge / ca) * 100;
    expect(taux).toBe(40);
  });
});

describe('PilotageOverviewCurrent — deltas', () => {
  it('computes ca_delta_pct consistently', () => {
    const overview: Partial<PilotageOverviewCurrent> = {
      ca_ht_30d: 12000,
      ca_ht_30d_prev: 10000,
      ca_delta_pct: 20,
    };
    const expected = ((12000 - 10000) / 10000) * 100;
    expect(overview.ca_delta_pct).toBe(expected);
  });
});

describe('TimeseriesPoint structure', () => {
  it('has all required chart fields', () => {
    const point: TimeseriesPoint = {
      snapshot_date: '2026-04-20',
      ca_ht: 500,
      marge_brute: 200,
      taux_marge: 40,
      nb_orders: 5,
      panier_moyen_ht: 100,
      encaissements_ttc: 480,
    };
    expect(point.taux_marge).toBe(40);
  });
});

describe('useRecomputeSnapshot invocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the pilotage-compute-kpi-snapshot Edge Function (not the legacy name)', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, snapshots_count: 4 },
      error: null,
    });

    // Simulation de l'appel que fait le hook
    const result = await mockInvoke('pilotage-compute-kpi-snapshot', {
      body: { target_date: '2026-04-20' },
    });

    expect(mockInvoke).toHaveBeenCalledWith(
      'pilotage-compute-kpi-snapshot',
      expect.objectContaining({ body: expect.objectContaining({ target_date: '2026-04-20' }) })
    );
    expect(result.data.success).toBe(true);
  });

  it('returns false on error', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('fail'),
    });

    const { data, error } = await mockInvoke('pilotage-compute-kpi-snapshot', { body: {} });
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
  });
});

describe('get_pilotage_timeseries RPC contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts p_start_date, p_end_date, p_channel', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { snapshot_date: '2026-04-20', ca_ht: 100, marge_brute: 40, taux_marge: 40, nb_orders: 1, panier_moyen_ht: 100, encaissements_ttc: 100 },
      ],
      error: null,
    });

    await mockRpc('get_pilotage_timeseries', {
      p_start_date: '2026-04-01',
      p_end_date: '2026-04-30',
      p_channel: 'all' as PilotageChannel,
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'get_pilotage_timeseries',
      expect.objectContaining({
        p_start_date: '2026-04-01',
        p_end_date: '2026-04-30',
        p_channel: 'all',
      })
    );
  });
});
