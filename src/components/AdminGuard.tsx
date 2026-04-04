import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Protège les routes admin.
 * - Affiche un spinner pendant le chargement de la session.
 * - Redirige vers /auth si l'utilisateur n'est pas connecté.
 * - Redirige vers / si l'utilisateur est connecté mais n'a pas le rôle admin.
 * - Rend les enfants si l'utilisateur est admin ou super_admin.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default AdminGuard;
