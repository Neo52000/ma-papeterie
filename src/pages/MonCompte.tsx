import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Package, CreditCard, MapPin, Settings, Star, Download, Shield, Trash2, Cookie, FileText, Loader2 } from "lucide-react";
import { useExportData, useDeleteAccount, useGdprRequests } from "@/hooks/useGdprRequests";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { OrderCard } from "@/components/order/OrderCard";
import { OrderDetailModal } from "@/components/order/OrderDetailModal";
import { GdprRequestForm } from "@/components/gdpr/GdprRequestForm";

export default function MonCompte() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const { orders, loading: ordersLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // GDPR hooks
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const { data: gdprRequests } = useGdprRequests();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">Mon Compte</h1>
          <p className="text-lg text-muted-foreground">
            Gérez votre profil, vos commandes et vos préférences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Adresses
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Paiement
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Vie Privée
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription>
                    Modifiez vos informations de profil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Prénom</label>
                      <Input defaultValue="Marie" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nom</label>
                      <Input defaultValue="Dupont" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input type="email" defaultValue="marie.dupont@email.com" />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Téléphone</label>
                    <Input type="tel" defaultValue="01 23 45 67 89" />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Date de naissance</label>
                    <Input type="date" defaultValue="1990-05-15" />
                  </div>

                  <Button variant="cta" className="w-full sm:w-auto">
                    Sauvegarder
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-accent" />
                      Statut Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <Badge className="bg-accent text-accent-foreground text-lg px-3 py-1 mb-3">
                        Client VIP
                      </Badge>
                      <p className="text-sm text-muted-foreground mb-4">
                        Vous bénéficiez de -5% sur toutes vos commandes
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Points fidélité</span>
                          <span className="font-semibold">1,245 pts</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Prochaine récompense</span>
                          <span className="text-accent">255 pts</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total commandes</span>
                      <span className="font-semibold">47</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total dépensé</span>
                      <span className="font-semibold">1,234.56€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Économies réalisées</span>
                      <span className="font-semibold text-eco-green">156.20€</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mes Commandes</CardTitle>
                <CardDescription>
                  Suivez l'état de vos commandes et consultez les détails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <p>Chargement de vos commandes...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune commande</h3>
                    <p className="text-muted-foreground mb-4">Vous n'avez pas encore passé de commande.</p>
                    <Button onClick={() => navigate('/catalogue')}>
                      Découvrir nos produits
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onViewDetails={handleViewOrderDetails}
                        isAdmin={false}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Addresses Tab */}
          <TabsContent value="addresses" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Adresse de facturation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Nom complet" defaultValue="Marie Dupont" />
                  <Input placeholder="Adresse" defaultValue="123 Rue de la Paix" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Code postal" defaultValue="75001" />
                    <Input placeholder="Ville" defaultValue="Paris" />
                  </div>
                  <Input placeholder="Pays" defaultValue="France" />
                  <Button variant="outline" className="w-full">
                    Modifier
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adresse de livraison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Nom complet" defaultValue="Marie Dupont" />
                  <Input placeholder="Adresse" defaultValue="123 Rue de la Paix" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Code postal" defaultValue="75001" />
                    <Input placeholder="Ville" defaultValue="Paris" />
                  </div>
                  <Input placeholder="Pays" defaultValue="France" />
                  <Button variant="outline" className="w-full">
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Moyens de paiement</CardTitle>
                <CardDescription>
                  Gérez vos cartes et méthodes de paiement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary rounded">
                        <CreditCard className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold">•••• •••• •••• 4242</h4>
                        <p className="text-sm text-muted-foreground">Expire 12/25</p>
                      </div>
                    </div>
                    <Badge>Principale</Badge>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    + Ajouter une carte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Préférences</CardTitle>
                <CardDescription>
                  Personnalisez votre expérience d'achat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Newsletter</h4>
                      <p className="text-sm text-muted-foreground">
                        Recevez nos offres et nouveautés
                      </p>
                    </div>
                    <input type="checkbox" defaultChecked className="rounded" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notifications SMS</h4>
                      <p className="text-sm text-muted-foreground">
                        Suivi de commande par SMS
                      </p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Mode B2B</h4>
                      <p className="text-sm text-muted-foreground">
                        Affichage des prix HT
                      </p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            {/* GDPR Request Form */}
            <GdprRequestForm />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Protection de vos données
                </CardTitle>
                <CardDescription>
                  Exercez vos droits RGPD et gérez vos données personnelles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Export Data */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Download className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-medium">Exporter mes données</h4>
                        <p className="text-sm text-muted-foreground">
                          Téléchargez une copie de toutes vos données personnelles (profil, commandes, préférences)
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => exportData.mutate()} 
                      disabled={exportData.isPending}
                      variant="outline"
                    >
                      {exportData.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Export...
                        </>
                      ) : (
                        'Exporter'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Trash2 className="h-5 w-5 text-destructive mt-1" />
                      <div>
                        <h4 className="font-medium text-destructive">Supprimer mon compte</h4>
                        <p className="text-sm text-muted-foreground">
                          Suppression définitive de votre compte et anonymisation de vos données. 
                          Cette action est irréversible.
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer votre compte ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. Toutes vos données personnelles seront 
                            supprimées et vos commandes seront anonymisées conformément au RGPD. 
                            Vous ne pourrez plus récupérer votre compte.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteAccount.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteAccount.isPending ? 'Suppression...' : 'Confirmer la suppression'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Cookie Preferences */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Cookie className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-medium">Préférences cookies</h4>
                        <p className="text-sm text-muted-foreground">
                          Gérez vos préférences de cookies et de tracking
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/cookies')}>
                      Gérer
                    </Button>
                  </div>
                </div>

                {/* Legal Links */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-medium mb-2">Documents légaux</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="link" className="h-auto p-0" onClick={() => navigate('/politique-confidentialite')}>
                          Politique de confidentialité
                        </Button>
                        <span className="text-muted-foreground">•</span>
                        <Button variant="link" className="h-auto p-0" onClick={() => navigate('/cgv')}>
                          CGV
                        </Button>
                        <span className="text-muted-foreground">•</span>
                        <Button variant="link" className="h-auto p-0" onClick={() => navigate('/mentions-legales')}>
                          Mentions légales
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GDPR Requests History */}
            {gdprRequests && gdprRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Historique de mes demandes RGPD</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gdprRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <span className="font-medium capitalize">{request.request_type}</span>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.requested_at), "d MMMM yyyy", { locale: fr })}
                          </p>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded ${
                          request.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                          request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                          {request.status === 'completed' ? 'Terminé' : 
                           request.status === 'pending' ? 'En attente' : 'En cours'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Order Detail Modal */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </main>

      <Footer />
    </div>
  );
}