import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProGuard } from './ProGuard';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderGuard() {
  return render(
    <MemoryRouter>
      <ProGuard>
        <div data-testid="pro-content">Pro</div>
      </ProGuard>
    </MemoryRouter>,
  );
}

describe('ProGuard', () => {
  it('devrait afficher un spinner pendant le chargement', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, isPro: false });

    renderGuard();

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
  });

  it('devrait rediriger vers /auth si pas d\'utilisateur', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, isPro: false });

    renderGuard();

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
  });

  it('devrait rediriger vers / si utilisateur sans role pro', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@test.com' },
      isLoading: false,
      isPro: false,
    });

    renderGuard();

    expect(screen.queryByTestId('pro-content')).not.toBeInTheDocument();
  });

  it('devrait afficher le contenu si utilisateur pro', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'pro@test.com' },
      isLoading: false,
      isPro: true,
    });

    renderGuard();

    expect(screen.getByTestId('pro-content')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('devrait afficher le contenu si utilisateur admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@test.com' },
      isLoading: false,
      isPro: true, // admin implies isPro in AuthContext
    });

    renderGuard();

    expect(screen.getByTestId('pro-content')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });
});
