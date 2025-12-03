import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Instagram, 
  Twitter,
  Shield,
  Truck,
  CreditCard,
  Recycle
} from "lucide-react";
import logo from "@/assets/logo-ma-papeterie.png";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter Section */}
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold text-primary-foreground mb-4 font-poppins">
            Restez informé de nos nouveautés
          </h3>
          <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto">
            Inscrivez-vous à notre newsletter et recevez en exclusivité nos offres spéciales, 
            nouveaux produits et conseils papeterie.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Input 
              placeholder="Votre adresse email"
              className="bg-primary-foreground text-foreground border-0"
            />
            <Button variant="secondary" size="lg" className="whitespace-nowrap">
              S'inscrire
            </Button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Ma Papeterie" className="h-8 w-auto invert" />
                <div>
                  <h4 className="font-bold text-lg font-poppins">Ma Papeterie</h4>
                  <p className="text-sm text-background/60">Reine & Fils</p>
                </div>
              </div>
              <p className="text-background/80 text-sm leading-relaxed">
                Depuis 15 ans, nous vous accompagnons dans vos besoins en papeterie 
                avec une sélection de qualité alliant modernité et nostalgie.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>123 Rue de la Papeterie, 75001 Paris</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-secondary" />
                  <span>01 23 45 67 89</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>contact@ma-papeterie.fr</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Liens Rapides</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Accueil</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Catalogue</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Promotions</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Espace Pro</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Mon Compte</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Contact</a></li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Nos Services</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Livraison Express</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Click & Collect</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Abonnements Pro</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Catalogues PDF</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Service Client</a></li>
                <li><a href="#" className="text-background/80 hover:text-secondary transition-smooth text-sm">Retours & SAV</a></li>
              </ul>
            </div>

            {/* Trust & Social */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Confiance & Social</h4>
              
              {/* Trust Icons */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2 text-xs">
                  <Shield className="w-4 h-4 text-accent" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Truck className="w-4 h-4 text-accent" />
                  <span>Livraison rapide</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CreditCard className="w-4 h-4 text-accent" />
                  <span>CB, PayPal, Virement</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Recycle className="w-4 h-4 text-accent" />
                  <span>Produits éco</span>
                </div>
              </div>

              {/* Social Media */}
              <div>
                <p className="text-sm mb-3">Suivez-nous</p>
                <div className="flex gap-3">
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10">
                    <Facebook className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10">
                    <Instagram className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10">
                    <Twitter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/20 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-background/60">
              © 2024 Ma Papeterie - Reine & Fils. Tous droits réservés.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/mentions-legales" className="text-background/60 hover:text-secondary transition-smooth">
                Mentions légales
              </a>
              <a href="/cgv" className="text-background/60 hover:text-secondary transition-smooth">
                CGV
              </a>
              <a href="/politique-confidentialite" className="text-background/60 hover:text-secondary transition-smooth">
                RGPD
              </a>
              <a href="/cookies" className="text-background/60 hover:text-secondary transition-smooth">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;