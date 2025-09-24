import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Package, CreditCard, MapPin, Settings, Star, Download } from "lucide-react";

export default function MonCompte() {
  const mockOrders = [
    {
      id: "CMD-2024-001",
      date: "15 Mars 2024",
      status: "Livré",
      total: "45.80€",
      items: 3
    },
    {
      id: "CMD-2024-002", 
      date: "8 Mars 2024",
      status: "En cours",
      total: "23.50€",
      items: 2
    },
    {
      id: "CMD-2024-003",
      date: "1 Mars 2024", 
      status: "En préparation",
      total: "67.20€",
      items: 5
    }
  ];

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

        <Tabs defaultValue="profile" className="space-y-6">
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
                  Suivez l'état de vos commandes et téléchargez vos factures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-secondary rounded-lg">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{order.id}</h4>
                          <p className="text-sm text-muted-foreground">
                            {order.date} • {order.items} article{order.items > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold">{order.total}</div>
                          <Badge 
                            variant={
                              order.status === 'Livré' ? 'default' :
                              order.status === 'En cours' ? 'secondary' : 
                              'outline'
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Détails
                          </Button>
                          {order.status === 'Livré' && (
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                
                <div className="pt-4 border-t">
                  <Button variant="destructive">
                    Supprimer mon compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}