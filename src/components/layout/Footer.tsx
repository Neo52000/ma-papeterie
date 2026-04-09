import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Shield,
  Truck,
  CreditCard,
  Recycle,
  Loader2,
} from "lucide-react";
import { useNewsletterSubscribe } from "@/hooks/useNewsletterSubscribe";
import { HoneypotField } from "@/components/HoneypotField";
import { useMenuBySlug } from "@/hooks/useNavigationMenus";
import { DEFAULT_FOOTER_SERVICES, DEFAULT_FOOTER_INFO, DEFAULT_FOOTER_LEGAL } from "@/data/defaultMenus";
import logo from "@/assets/logo-ma-papeterie.png";

const Footer = memo(function Footer() {
  const { data: servicesMenu } = useMenuBySlug("footer_services");
  const { data: infoMenu } = useMenuBySlug("footer_informations");
  const { data: legalMenu } = useMenuBySlug("footer_legal");

  const servicesLinks = servicesMenu?.items ?? DEFAULT_FOOTER_SERVICES;
  const infoLinks = infoMenu?.items ?? DEFAULT_FOOTER_INFO;
  const legalLinks = legalMenu?.items ?? DEFAULT_FOOTER_LEGAL;

  const [footerEmail, setFooterEmail] = useState("");
  const {
    subscribe,
    isLoading: newsletterLoading,
    isSuccess: newsletterSuccess,
    isError: newsletterError,
    errorMessage: newsletterErrorMessage,
    isAlreadySubscribed,
  } = useNewsletterSubscribe();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!footerEmail.trim()) return;
    await subscribe(footerEmail.trim(), "footer");
  };

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
          {isAlreadySubscribed || newsletterSuccess ? (
            <p className="text-primary-foreground/90 text-sm">
              ✓ Vous êtes déjà inscrit(e)
            </p>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <HoneypotField />
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Votre adresse email"
                  className="bg-primary-foreground text-foreground border-0"
                  value={footerEmail}
                  onChange={(e) => setFooterEmail(e.target.value)}
                  disabled={newsletterLoading}
                  required
                />
                {newsletterError && newsletterErrorMessage && (
                  <p className="text-destructive-foreground text-xs mt-1 text-left">{newsletterErrorMessage}</p>
                )}
              </div>
              <Button variant="secondary" size="lg" className="whitespace-nowrap" type="submit" disabled={newsletterLoading}>
                {newsletterLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                S'inscrire
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Main Footer */}
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Ma Papeterie" className="h-8 w-auto invert" loading="lazy" decoding="async" />
              </div>
              <p className="text-background/80 text-sm leading-relaxed">
                Votre expert en fournitures scolaires et de bureau à Chaumont.
                Une sélection rigoureuse et un conseil personnalisé.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-secondary" />
                  <span>10 rue Toupot de Beveaux, 52000 Chaumont</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-secondary" />
                  <span>03 10 96 02 24</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-secondary" />
                  <span>contact@ma-papeterie.fr</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Services</h4>
              <ul className="space-y-2">
                {servicesLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} className="text-background/80 hover:text-secondary transition-smooth text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Informations */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Informations</h4>
              <ul className="space-y-2">
                {infoLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} className="text-background/80 hover:text-secondary transition-smooth text-sm">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust & Social */}
            <div>
              <h4 className="font-semibold text-lg mb-4 font-poppins">Confiance & Social</h4>

              {/* Trust Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10" asChild>
                    <a href="https://www.facebook.com/papeteriereineetchaumont" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                      <Facebook className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10" asChild>
                    <a href="https://www.instagram.com/mapapeterie_chaumont" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <Instagram className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" className="text-background hover:text-secondary hover:bg-background/10" asChild>
                    <a href="https://g.co/kgs/papeterie-reine-chaumont" target="_blank" rel="noopener noreferrer" aria-label="Google Business Profile">
                      <MapPin className="w-4 h-4" />
                    </a>
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
              © {new Date().getFullYear()} ma-papeterie.fr. Tous droits réservés.
            </div>
            <div className="flex gap-6 text-sm">
              {legalLinks.map((link) => (
                <a key={link.url} href={link.url} className="text-background/60 hover:text-secondary transition-smooth">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
