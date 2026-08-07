import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  refreshMfa: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: mocks.listFactors,
        getAuthenticatorAssuranceLevel: mocks.getAuthenticatorAssuranceLevel,
        challenge: mocks.challenge,
        verify: mocks.verify,
      },
    },
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ refreshMfa: mocks.refreshMfa }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { use2FAStatus, useVerifyTOTP } from './use2FA';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('Supabase Auth MFA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a verified native TOTP factor and the AAL2 session', async () => {
    mocks.listFactors.mockResolvedValue({
      data: {
        totp: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }],
      },
      error: null,
    });
    mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    });

    const { result } = renderHook(() => use2FAStatus(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ enabled: true, currentLevel: 'aal2' });
  });

  it('challenges then verifies the factor before refreshing the session AAL', async () => {
    mocks.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mocks.verify.mockResolvedValue({ data: { access_token: 'upgraded' }, error: null });
    mocks.refreshMfa.mockResolvedValue(undefined);

    const { result } = renderHook(() => useVerifyTOTP(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ factorId: 'factor-1', code: '123456' });
    });

    expect(mocks.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' });
    expect(mocks.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(mocks.refreshMfa).toHaveBeenCalledOnce();
  });

  it('does not verify when creation of the challenge fails', async () => {
    mocks.challenge.mockResolvedValue({ data: null, error: new Error('expired session') });

    const { result } = renderHook(() => useVerifyTOTP(), { wrapper: createWrapper() });

    await expect(
      act(async () => result.current.mutateAsync({ factorId: 'factor-1', code: '123456' })),
    ).rejects.toThrow('expired session');
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});
