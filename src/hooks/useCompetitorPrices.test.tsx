import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    functions: { invoke: vi.fn() },
  },
}));

import { useCompetitorPrices } from './useCompetitorPrices';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('competitor price provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query = {
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
    };
    mocks.from.mockReturnValue(query);
    mocks.select.mockReturnValue(query);
    mocks.eq.mockReturnValue(query);
    mocks.order.mockResolvedValue({ data: [], error: null });
  });

  it('excludes invalid and simulated rows from pricing data', async () => {
    const { result } = renderHook(() => useCompetitorPrices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.eq).toHaveBeenCalledWith('is_valid', true);
    expect(mocks.eq).toHaveBeenCalledWith('is_simulated', false);
  });
});
