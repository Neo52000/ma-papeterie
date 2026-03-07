import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderGuard() {
  return render(
    <MemoryRouter>
      <AuthGuard>
        <div data-testid="protected">Contenu protégé</div>
      </AuthGuard>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  it('devrait afficher un spinner pendant le chargement', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    renderGuard();

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('devrait rediriger vers /auth si pas d\'utilisateur', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    renderGuard();

    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('devrait afficher le contenu si utilisateur connecté', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@test.com' },
      isLoading: false,
    });

    renderGuard();

    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });
});
