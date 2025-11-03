import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Truck,
  School,
  BarChart3,
} from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();
  const { orders } = useOrders();
  const { products } = useProducts();

  useEffect(() => {
    if (!authLoading && (!user || (!isAdmin && !isSuperAdmin))) {
      navigate('/auth');
    }
  }, [authLoading, user, isAdmin, isSuperAdmin, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!user || (!isAdmin && !isSuperAdmin)) {
    return null;
  }

  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const lowStockProducts = products?.filter(p => (p.stock_quantity || 0) < 10).length || 0;

  const adminSections = [
    {
      title: 'Produits',
      description: 'Gérer le catalogue de produits',
      icon: Package,
      path: '/admin/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: `${products?.length || 0} produits`,
    },
    {
      title: 'Commandes',
      description: 'Suivre et gérer les commandes',
      icon: ShoppingCart,
      path: '/admin/orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: `${pendingOrders} en attente`,
    },
    {
      title: 'Achats',
      description: 'Commandes fournisseurs et réceptions',
      icon: Truck,
      path: '/admin/purchases',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      stats: 'ERP Achats',
      superAdminOnly: true,
    },
    {
      title: 'CRM',
      description: 'Analytics et segmentation clients',
      icon: Users,
      path: '/admin/crm',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: 'Analyse complète',
    },
    {
      title: 'Prix Concurrentiels',
      description: 'Comparaison automatique des prix',
      icon: TrendingUp,
      path: '/admin/competitors',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      stats: 'Scraping auto',
    },
    {
      title: 'Fournisseurs',
      description: 'Gestion des fournisseurs et stocks',
      icon: Truck,
      path: '/admin/suppliers',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      stats: 'ERP intégré',
      superAdminOnly: true,
    },
    {
      title: 'Listes Scolaires',
      description: 'Écoles et listes de fournitures',
      icon: School,
      path: '/admin/school-lists',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      stats: 'Gestion complète',
    },
  ];

  const visibleSections = adminSections.filter(
    section => !section.superAdminOnly || isSuperAdmin
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">
            Tableau de bord Admin
          </h1>
          <p className="text-muted-foreground">
            Bienvenue dans l'interface d'administration de Ma Papeterie Pro
          </p>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produits</p>
                <p className="text-2xl font-bold">{products?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commandes</p>
                <p className="text-2xl font-bold">{orders?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                <p className="text-2xl font-bold">{totalRevenue.toFixed(0)} €</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stock faible</p>
                <p className="text-2xl font-bold">{lowStockProducts}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sections admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleSections.map((section) => (
            <Card key={section.path} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 ${section.bgColor} rounded-lg`}>
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {section.description}
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {section.stats}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(section.path)}
                className="w-full"
                variant="outline"
              >
                Accéder
              </Button>
            </Card>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
