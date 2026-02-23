import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, RefreshCw, FileText, Users, Loader2, Lock } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useB2BAccount } from '@/hooks/useB2BAccount';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/pro/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pro/commandes', label: 'Commandes', icon: Package },
  { to: '/pro/reassort', label: 'Réassort', icon: RefreshCw },
  { to: '/pro/factures', label: 'Factures', icon: FileText },
  { to: '/pro/equipe', label: 'Équipe', icon: Users },
];

export default function ProLayout() {
  const { user, isLoading: authLoading } = useAuth();
  const { isB2BMember, account, isLoading: accountLoading } = useB2BAccount();

  if (authLoading || accountLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?redirect=/pro/dashboard" replace />;
  }

  if (!isB2BMember) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
            <Lock className="h-16 w-16 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Espace Professionnel</h1>
            <p className="text-muted-foreground max-w-md">
              Vous n'êtes pas encore associé à un compte professionnel.
              Contactez-nous pour activer votre espace pro.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* En-tête entreprise */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Espace professionnel</p>
            <h1 className="text-2xl font-bold text-foreground">{account?.name}</h1>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar navigation */}
            <aside className="lg:w-56 flex-shrink-0">
              <nav className="space-y-1 lg:sticky lg:top-28">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </aside>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
