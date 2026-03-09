import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProGuardProps {
  children: ReactNode;
}

/**
 * Protege les routes pro / B2B.
 * - Affiche un spinner pendant le chargement de la session.
 * - Redirige vers /auth si l'utilisateur n'est pas connecte.
 * - Redirige vers / si l'utilisateur n'a pas le role pro ou admin.
 * - Rend les enfants si l'utilisateur est pro ou admin.
 */
export function ProGuard({ children }: ProGuardProps) {
  const { user, isLoading, isPro } = useAuth();

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

  if (!isPro) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProGuard;
