import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Package, CreditCard, MapPin, Settings, Star, Download, Shield, Trash2, Cookie, FileText, Loader2, Heart, ChevronRight, Lock } from "lucide-react";
import { useExportData, useDeleteAccount, useGdprRequests } from "@/hooks/useGdprRequests";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { OrderCard } from "@/components/order/OrderCard";
import { OrderDetailModal } from "@/components/order/OrderDetailModal";
import { GdprRequestForm } from "@/components/gdpr/GdprRequestForm";
import { useWishlistStore } from "@/stores/wishlistStore";
import { usersApi, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function MonCompte() {
  const { user, session, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const { orders, loading: ordersLoading } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // GDPR hooks
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const { data: gdprRequests } = useGdprRequests();

  const token = session?.access_token;

  // Fetch profile from backend
  const fetchProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    try {
      const profile = await usersApi.getProfile(token);
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    } catch {
      // fallback: use auth user metadata if backend profile fails
    } finally {
      setProfileLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token, fetchProfile]);

  const handleSaveProfile = async () => {
    if (!token) return;
    setProfileSaving(true);
    try {
      await usersApi.updateProfile(token, { firstName, lastName });
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été sauvegardées.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur lors de la sauvegarde';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return;
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 12) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 12 caractères.', variant: 'destructive' });
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await usersApi.changePassword(token, { currentPassword, newPassword });
      toast({ title: 'Mot de passe modifié', description: result.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur lors du changement de mot de passe';
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleViewOrderDetails = (order: any) => {
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
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-sm font-medium mb-2 block">Prénom</Label>
                          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-sm font-medium mb-2 block">Nom</Label>
                          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">Email</Label>
                        <Input type="email" value={user?.email ?? ''} disabled className="bg-muted" />
                      </div>

                      <Button variant="cta" className="w-full sm:w-auto" onClick={handleSaveProfile} disabled={profileSaving}>
                        {profileSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sauvegarde...
                          </>
                        ) : (
                          'Sauvegarder'
                        )}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Password Change Card */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Changer le mot de passe
                  </CardTitle>
                  <CardDescription>
                    Mettez à jour votre mot de passe (minimum 12 caractères)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword" className="text-sm font-medium mb-2 block">Mot de passe actuel</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newPassword" className="text-sm font-medium mb-2 block">Nouveau mot de passe</Label>
                      <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium mb-2 block">Confirmer le mot de passe</Label>
                      <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                  </div>
                  <Button variant="cta" className="w-full sm:w-auto" onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}>
                    {passwordSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      'Modifier le mot de passe'
                    )}
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

                {/* Wishlist Link Card */}
                <WishlistLinkCard />
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

// Wishlist Link Card Component
function WishlistLinkCard() {
  const { items } = useWishlistStore();
  const totalItems = items.length;

  return (
    <Link to="/mes-favoris">
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Heart className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h4 className="font-medium">Mes Favoris</h4>
                <p className="text-sm text-muted-foreground">
                  {totalItems === 0 
                    ? "Aucun produit" 
                    : `${totalItems} produit${totalItems > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}