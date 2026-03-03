import { Link } from "react-router-dom";
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
                <img src={logo} alt="Papeterie Reine & Fils" className="h-8 w-auto invert" />
                <div>
                  <h4 className="font-bold text-lg font-poppins">Papeterie</h4>
                  <p className="text-sm text-background/60">Reine & Fils</p>
                </div>
              </div>
              <p className="text-background/80 text-sm leading-relaxed">
                Depuis 15 ans, nous vous accompagnons dans vos besoins en papeterie 
                avec une sélection de qualité aux meilleurs prix.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>10 rue Toupot de Beveaux, 52000 Chaumont</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-secondary" />
                  <span>07 45 062 162</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>contact@ma-papeterie.fr</span>
                </div>
              </div>
            </div>

            {/* Services Express */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Services Express</h4>
              <ul className="space-y-2">
                <li><Link to="/impression-urgente-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Impression Urgente</Link></li>
                <li><Link to="/photocopie-express-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Photocopie Express</Link></li>
                <li><Link to="/plaque-immatriculation-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Plaque d'Immatriculation</Link></li>
                <li><Link to="/tampon-professionnel-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Tampon Professionnel</Link></li>
                <li><Link to="/pack-pro-local-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Pack Pro Local</Link></li>
                <li><Link to="/solutions-institutions-chaumont" className="text-background/80 hover:text-secondary transition-smooth text-sm">Solutions Institutions</Link></li>
              </ul>
            </div>

            {/* Informations & Boutique */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Informations</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-background/80 hover:text-secondary transition-smooth text-sm">Accueil</Link></li>
                <li><Link to="/shop" className="text-background/80 hover:text-secondary transition-smooth text-sm">Boutique</Link></li>
                <li><Link to="/catalogue" className="text-background/80 hover:text-secondary transition-smooth text-sm">Catalogue</Link></li>
                <li><Link to="/listes-scolaires" className="text-background/80 hover:text-secondary transition-smooth text-sm">Listes Scolaires</Link></li>
                <li><Link to="/blog" className="text-background/80 hover:text-secondary transition-smooth text-sm">Blog</Link></li>
                <li><Link to="/a-propos" className="text-background/80 hover:text-secondary transition-smooth text-sm">À Propos</Link></li>
                <li><Link to="/contact" className="text-background/80 hover:text-secondary transition-smooth text-sm">Contact</Link></li>
                <li><Link to="/reponse-officielle-ia" className="text-background/80 hover:text-secondary transition-smooth text-sm">Réponse Officielle IA</Link></li>
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
              © {new Date().getFullYear()} Papeterie Reine & Fils. Tous droits réservés.
            </div>
            <div className="flex gap-6 text-sm">
              <Link to="/mentions-legales" className="text-background/60 hover:text-secondary transition-smooth">
                Mentions légales
              </Link>
              <Link to="/cgv" className="text-background/60 hover:text-secondary transition-smooth">
                CGV
              </Link>
              <Link to="/politique-confidentialite" className="text-background/60 hover:text-secondary transition-smooth">
                RGPD
              </Link>
              <Link to="/cookies" className="text-background/60 hover:text-secondary transition-smooth">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;