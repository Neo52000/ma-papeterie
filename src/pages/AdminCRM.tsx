import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerAnalytics } from '@/components/crm/CustomerAnalytics';
import { CustomerSegmentation } from '@/components/crm/CustomerSegmentation';
import { BarChart3, Users } from 'lucide-react';

export default function AdminCRM() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isAdmin, isSuperAdmin } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">CRM - Gestion Client</h1>
          <p className="text-muted-foreground">Analytics, segmentation et suivi des clients</p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="segmentation">
              <Users className="h-4 w-4 mr-2" />
              Segmentation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <CustomerAnalytics />
          </TabsContent>

          <TabsContent value="segmentation">
            <CustomerSegmentation />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
