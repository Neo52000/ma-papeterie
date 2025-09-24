import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Percent, Gift, Star } from "lucide-react";

export default function Promotions() {
  const promotions = [
    {
      id: 1,
      title: "Rentrée des Classes",
      subtitle: "Jusqu'à -40% sur tout le scolaire",
      description: "Préparez la rentrée avec nos packs complets à prix réduits",
      discount: "40%",
      validUntil: "30 Septembre 2024",
      image: "/src/assets/category-scolaire.jpg",
      type: "flash"
    },
    {
      id: 2,
      title: "Pack Bureau Pro",
      subtitle: "3 produits achetés = le 4ème offert",
      description: "Équipez votre bureau avec notre sélection professionnelle",
      discount: "3+1",
      validUntil: "15 Octobre 2024",
      image: "/src/assets/category-bureau.jpg",
      type: "pack"
    },
    {
      id: 3,
      title: "Collection Vintage",
      subtitle: "Livraison offerte dès 50€ d'achat",
      description: "Redécouvrez le charme des années 80-90",
      discount: "Gratuit",
      validUntil: "31 Décembre 2024",
      image: "/src/assets/category-vintage.jpg",
      type: "shipping"
    }
  ];

  const flashDeals = [
    { name: "Stylos BIC x20", originalPrice: "8.90", newPrice: "5.90", discount: "34%" },
    { name: "Cahiers spirales x5", originalPrice: "12.50", newPrice: "8.90", discount: "29%" },
    { name: "Classeurs A4 x3", originalPrice: "15.90", newPrice: "11.90", discount: "25%" },
    { name: "Feutres couleur x24", originalPrice: "19.90", newPrice: "14.90", discount: "25%" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">Nos Promotions</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Profitez de nos offres spéciales et économisez sur vos fournitures préférées
          </p>
        </div>

        {/* Flash Sale Banner */}
        <Card className="mb-8 bg-gradient-to-r from-accent/20 to-accent/10 border-accent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-full">
                  <Timer className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-accent">Vente Flash - 24h seulement !</h3>
                  <p className="text-muted-foreground">Jusqu'à -40% sur une sélection d'articles</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">23:45:12</div>
                <div className="text-sm text-muted-foreground">Temps restant</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Promotions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {promotions.map((promo) => (
            <Card key={promo.id} className="group hover:shadow-vintage transition-all duration-300">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img 
                    src={promo.image} 
                    alt={promo.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <Badge 
                    className={`absolute top-3 right-3 text-lg px-3 py-1 ${
                      promo.type === 'flash' ? 'bg-accent text-accent-foreground' :
                      promo.type === 'pack' ? 'bg-primary text-primary-foreground' :
                      'bg-eco-green text-white'
                    }`}
                  >
                    -{promo.discount}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <CardTitle className="text-xl mb-2 group-hover:text-primary transition-colors">
                  {promo.title}
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-accent mb-3">
                  {promo.subtitle}
                </CardDescription>
                <p className="text-muted-foreground mb-4">
                  {promo.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Jusqu'au {promo.validUntil}
                  </div>
                  <Button variant="cta">
                    Profiter
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Flash Deals Grid */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-accent rounded-full">
              <Percent className="h-5 w-5 text-accent-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Ventes Flash</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flashDeals.map((deal, index) => (
              <Card key={index} className="hover:shadow-soft transition-all duration-300">
                <CardContent className="p-4 text-center">
                  <div className="mb-3">
                    <h4 className="font-semibold mb-2">{deal.name}</h4>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground line-through">
                        {deal.originalPrice}€
                      </div>
                      <div className="text-xl font-bold text-accent">
                        {deal.newPrice}€
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        -{deal.discount}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="w-full">
                    Ajouter au panier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <Card className="bg-secondary/20">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-full">
                <Gift className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-4">Ne ratez aucune promotion !</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Inscrivez-vous à notre newsletter et recevez en exclusivité nos meilleures offres
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
              />
              <Button variant="cta">
                S'inscrire
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}