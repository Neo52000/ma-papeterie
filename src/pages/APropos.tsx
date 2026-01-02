import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Heart, Users, Leaf } from "lucide-react";

const APropos = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">À Propos de Ma Papeterie Pro</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Depuis plus de 15 ans, nous accompagnons les professionnels et les particuliers 
              dans leur quête de papeterie de qualité.
            </p>
          </div>

          {/* Story Section */}
          <section className="mb-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Notre Histoire</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Ma Papeterie Pro est née d'une passion pour les beaux objets d'écriture et 
                    d'organisation. Fondée en 2008 par une équipe de passionnés, notre boutique 
                    s'est rapidement imposée comme une référence dans le monde de la papeterie professionnelle.
                  </p>
                  <p>
                    Nous croyons que les bons outils font les bons artisans. C'est pourquoi nous 
                    sélectionnons avec soin chaque produit de notre catalogue, en privilégiant 
                    la qualité, la durabilité et l'esthétique.
                  </p>
                  <p>
                    Aujourd'hui, nous servons des milliers de clients : indépendants, PME, 
                    grandes entreprises et particuliers exigeants qui partagent notre amour 
                    pour la belle papeterie.
                  </p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 text-center">
                <div className="text-5xl font-bold text-primary mb-2">15+</div>
                <p className="text-muted-foreground">années d'expertise</p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">50k+</div>
                    <p className="text-sm text-muted-foreground">clients satisfaits</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">5000+</div>
                    <p className="text-sm text-muted-foreground">références</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Nos Valeurs</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <Award className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Qualité</h3>
                  <p className="text-muted-foreground">
                    Nous ne proposons que des produits rigoureusement sélectionnés 
                    pour leur qualité et leur durabilité.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <Heart className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Passion</h3>
                  <p className="text-muted-foreground">
                    Notre équipe est composée de vrais passionnés qui connaissent 
                    et aiment chaque produit du catalogue.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <Users className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Service</h3>
                  <p className="text-muted-foreground">
                    Un accompagnement personnalisé et un service client réactif 
                    pour répondre à tous vos besoins.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <Leaf className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Responsabilité</h3>
                  <p className="text-muted-foreground">
                    Engagement pour une papeterie plus responsable avec des 
                    produits éco-conçus et recyclés.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Team Section */}
          <section>
            <h2 className="text-2xl font-bold mb-8 text-center">Notre Engagement</h2>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="text-lg">
                    <strong className="text-foreground">Ma Papeterie Pro s'engage</strong> à vous offrir 
                    une expérience d'achat exceptionnelle :
                  </p>
                  <ul className="mt-4 space-y-2">
                    <li>✓ Des prix justes et transparents</li>
                    <li>✓ Une livraison rapide et soignée</li>
                    <li>✓ Un service client disponible et à l'écoute</li>
                    <li>✓ Des produits garantis et un droit de retour de 30 jours</li>
                    <li>✓ Une démarche environnementale avec des emballages recyclables</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default APropos;
