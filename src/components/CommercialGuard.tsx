import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface CommercialGuardProps {
  children: ReactNode;
}

/**
 * Protège les routes du module prospection CRM.
 * - Affiche un spinner pendant le chargement de la session.
 * - Redirige vers /auth si l'utilisateur n'est pas connecté.
 * - Redirige vers / si l'utilisateur est connecté mais n'a pas le rôle commercial/admin.
 * - Rend les enfants si l'utilisateur est commercial, admin ou super_admin.
 */
export function CommercialGuard({ children }: CommercialGuardProps) {
  const { user, isLoading, isCommercial } = useAuth();

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

  if (!isCommercial) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default CommercialGuard;
