import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HelpCircle, Package, CreditCard, Truck, RotateCcw, User } from "lucide-react";

const faqCategories = [
  {
    title: "Commandes & Paiement",
    icon: CreditCard,
    questions: [
      {
        q: "Quels moyens de paiement acceptez-vous ?",
        a: "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express), PayPal et le virement bancaire pour les professionnels. Tous les paiements sont sécurisés par le protocole SSL."
      },
      {
        q: "Comment passer commande ?",
        a: "Ajoutez vos produits au panier, puis cliquez sur 'Commander'. Vous serez guidé à travers les étapes de livraison et de paiement. Un compte client n'est pas obligatoire mais recommandé pour suivre vos commandes."
      },
      {
        q: "Puis-je modifier ou annuler ma commande ?",
        a: "Vous pouvez modifier ou annuler votre commande dans les 2 heures suivant la validation, si elle n'a pas encore été expédiée. Contactez notre service client rapidement."
      },
      {
        q: "Comment obtenir une facture ?",
        a: "La facture est automatiquement envoyée par email après validation de la commande. Vous pouvez également la télécharger depuis votre espace client dans 'Mes commandes'."
      }
    ]
  },
  {
    title: "Livraison",
    icon: Truck,
    questions: [
      {
        q: "Quels sont les délais de livraison ?",
        a: "La livraison standard prend 3-5 jours ouvrés. La livraison express en 24-48h est disponible pour les commandes passées avant 14h. Comptez 5-10 jours pour les DOM-TOM et l'international."
      },
      {
        q: "La livraison est-elle gratuite ?",
        a: "Oui, la livraison est gratuite pour toute commande supérieure à 49 €. En dessous, les frais de port standard sont de 4,90 €."
      },
      {
        q: "Comment suivre mon colis ?",
        a: "Dès l'expédition, vous recevez un email avec le numéro de suivi. Vous pouvez également suivre votre commande depuis votre espace client ou directement sur le site du transporteur."
      },
      {
        q: "Livrez-vous à l'étranger ?",
        a: "Oui, nous livrons dans toute l'Union Européenne, en Suisse et au Royaume-Uni. Les frais et délais varient selon la destination."
      }
    ]
  },
  {
    title: "Retours & Remboursements",
    icon: RotateCcw,
    questions: [
      {
        q: "Quel est le délai pour retourner un article ?",
        a: "Vous disposez de 30 jours à compter de la réception pour retourner un article. Les produits doivent être non utilisés et dans leur emballage d'origine."
      },
      {
        q: "Comment effectuer un retour ?",
        a: "Connectez-vous à votre espace client, sélectionnez la commande concernée et cliquez sur 'Demander un retour'. Vous recevrez une étiquette de retour prépayée par email."
      },
      {
        q: "Quand serai-je remboursé ?",
        a: "Le remboursement est effectué sous 14 jours après réception et vérification du retour, sur le même moyen de paiement utilisé lors de la commande."
      },
      {
        q: "Les frais de retour sont-ils à ma charge ?",
        a: "Non, les retours sont gratuits en France métropolitaine. Pour les autres destinations, les frais de retour restent à la charge du client sauf en cas de produit défectueux."
      }
    ]
  },
  {
    title: "Produits",
    icon: Package,
    questions: [
      {
        q: "Les produits sont-ils de qualité professionnelle ?",
        a: "Oui, nous sélectionnons rigoureusement nos fournisseurs pour garantir une qualité professionnelle. Nous proposons des marques reconnues et des produits certifiés."
      },
      {
        q: "Un produit est en rupture de stock, que faire ?",
        a: "Vous pouvez vous inscrire à l'alerte de réapprovisionnement sur la fiche produit. Vous serez notifié par email dès que le produit sera à nouveau disponible."
      },
      {
        q: "Proposez-vous des produits éco-responsables ?",
        a: "Oui, nous avons une gamme complète de produits éco-responsables : papier recyclé, stylos en bambou, colles végétales, etc. Recherchez le badge 'Éco' sur nos fiches produits."
      }
    ]
  },
  {
    title: "Mon Compte",
    icon: User,
    questions: [
      {
        q: "Comment créer un compte ?",
        a: "Cliquez sur 'Mon Compte' en haut de page, puis 'Créer un compte'. Remplissez le formulaire avec votre email et un mot de passe. Vous pouvez aussi créer un compte lors d'une commande."
      },
      {
        q: "J'ai oublié mon mot de passe, que faire ?",
        a: "Cliquez sur 'Mot de passe oublié' sur la page de connexion. Vous recevrez un email avec un lien pour réinitialiser votre mot de passe."
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Conformément au RGPD, vous pouvez demander la suppression de votre compte depuis votre espace client ou en contactant notre service client. Vos données seront supprimées sous 30 jours."
      }
    ]
  }
];

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <HelpCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Foire Aux Questions</h1>
            <p className="text-lg text-muted-foreground">
              Trouvez rapidement les réponses à vos questions
            </p>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, idx) => {
              const Icon = category.icon;
              return (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                      <h2 className="text-xl font-bold">{category.title}</h2>
                    </div>
                    
                    <Accordion type="single" collapsible className="w-full">
                      {category.questions.map((item, qIdx) => (
                        <AccordionItem key={qIdx} value={`item-${idx}-${qIdx}`}>
                          <AccordionTrigger className="text-left">
                            {item.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground">
                            {item.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact CTA */}
          <Card className="mt-12 bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-bold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
              <p className="text-muted-foreground mb-4">
                Notre équipe est là pour vous aider du lundi au vendredi, 9h-18h.
              </p>
              <Button asChild>
                <Link to="/contact">Nous contacter</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;
