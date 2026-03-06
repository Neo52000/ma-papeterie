import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminGuard } from './AdminGuard';

const mockUseAuth = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderGuard() {
  return render(
    <MemoryRouter>
      <AdminGuard>
        <div data-testid="admin-content">Admin</div>
      </AdminGuard>
    </MemoryRouter>,
  );
}

describe('AdminGuard', () => {
  it('devrait afficher un spinner pendant le chargement', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, isAdmin: false });

    renderGuard();

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('devrait rediriger vers /auth si pas d\'utilisateur', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, isAdmin: false });

    renderGuard();

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('devrait rediriger vers / si utilisateur non-admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@test.com' },
      isLoading: false,
      isAdmin: false,
    });

    renderGuard();

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
  });

  it('devrait afficher le contenu si utilisateur admin', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@test.com' },
      isLoading: false,
      isAdmin: true,
    });

    renderGuard();

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
