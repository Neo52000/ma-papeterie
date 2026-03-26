import { useState, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Phone, Mail, X, LogOut, Settings, Shield, ChevronDown, ArrowLeftRight, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { usePriceModeStore } from "@/stores/priceModeStore";
import MegaMenu from "@/components/layout/MegaMenu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { Button } from "@/components/ui/button";
import { ShopifyCartDrawer } from "@/components/cart/ShopifyCartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMenuBySlug } from "@/hooks/useNavigationMenus";
import { DEFAULT_HEADER_NAV, DEFAULT_HEADER_SERVICES, DEFAULT_HEADER_PRO } from "@/data/defaultMenus";
import logo from "@/assets/logo-ma-papeterie.png";

const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { mode: priceMode, toggle: togglePriceMode } = usePriceModeStore();
  const { theme, toggle: toggleTheme } = useTheme();
  // Dynamic menus with static fallbacks
  const { data: navMenu } = useMenuBySlug("header_nav");
  const { data: servicesMenu } = useMenuBySlug("header_services");
  const { data: proMenu } = useMenuBySlug("header_professionnels");
  const { data: megaCatMenu } = useMenuBySlug("mega_categories");

  const navLinks = navMenu?.items ?? DEFAULT_HEADER_NAV;
  const servicesLinks = servicesMenu?.items ?? DEFAULT_HEADER_SERVICES;
  const proLinks = proMenu?.items ?? DEFAULT_HEADER_PRO;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
      {/* Skip Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Aller au contenu principal
      </a>

      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 flex justify-between items-center h-9">
          <div className="hidden sm:flex items-center gap-5 text-xs">
            <a href="tel:0310960224" className="flex items-center gap-1.5 hover:text-secondary transition-colors">
              <Phone className="w-3 h-3" /> 03 10 96 02 24
            </a>
            <a href="mailto:contact@ma-papeterie.fr" className="flex items-center gap-1.5 hover:text-secondary transition-colors">
              <Mail className="w-3 h-3" /> contact@ma-papeterie.fr
            </a>
          </div>
          <div className="text-xs font-medium mx-auto sm:mx-0">
            Livraison gratuite dès 89€
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="Ma Papeterie" className="h-9 w-auto" decoding="async" />
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden md:block flex-1 max-w-xl mx-6">
          <SearchAutocomplete />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" onClick={() => setSearchOpen(!searchOpen)} aria-label={searchOpen ? "Fermer la recherche" : "Ouvrir la recherche"}>
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Mon compte">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover">
                <DropdownMenuItem onClick={() => navigate('/mon-compte')}>
                  <Settings className="mr-2 h-4 w-4" /> Mon compte
                </DropdownMenuItem>
                {(isAdmin || isSuperAdmin) && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => navigate('/auth')} className="min-h-[44px] text-xs">
              Connexion
            </Button>
          )}

          <WishlistDrawer />
          <ShopifyCartDrawer />

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}>
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="md:hidden border-t border-border px-4 py-3 animate-fade-in">
          <SearchAutocomplete autoFocus onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {/* Navigation - Desktop */}
      <nav className="hidden md:block border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-1">
              <MegaMenu />
              {navLinks.map((link) => (
                <Link
                  key={link.url}
                  to={link.url}
                  className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}

              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center gap-1">
                  Services <ChevronDown className="w-3 h-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-popover">
                  {servicesLinks.map((item) => (
                    <DropdownMenuItem
                      key={item.url}
                      onClick={() => navigate(item.url)}
                      className={item.css_class ?? undefined}
                    >
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center gap-1">
                  Professionnels <ChevronDown className="w-3 h-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 bg-popover">
                  {proLinks.map((item) => (
                    <DropdownMenuItem key={item.url} onClick={() => navigate(item.url)}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {(isAdmin || isSuperAdmin) && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-md hover:bg-primary/20 transition-all ml-1"
                >
                  <Shield className="w-3.5 h-3.5" /> Admin
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                title={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
                aria-label={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
              >
                {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={togglePriceMode}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                title="Basculer entre prix HT et TTC"
              >
                Prix {priceMode === 'ttc' ? 'TTC' : 'HT'}
                <ArrowLeftRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {/* Mobile Categories Accordion */}
            {megaCatMenu?.items && megaCatMenu.items.length > 0 && (
              <Accordion type="multiple" className="mb-2">
                <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Catégories</p>
                {megaCatMenu.items.filter((item) => !item.parent_id).map((cat) => (
                  <AccordionItem key={cat.id} value={cat.id} className="border-none">
                    <AccordionTrigger className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg hover:no-underline">
                      {cat.label}
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <Link
                        to={cat.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-8 py-1.5 text-sm text-primary font-medium hover:bg-muted rounded-lg transition-colors"
                      >
                        Tout voir
                      </Link>
                      {(cat.children ?? []).map((sub) => (
                        <Link
                          key={sub.id}
                          to={sub.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-8 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.url}
                to={link.url}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Services</p>
              {servicesLinks.map((link) => (
                <Link
                  key={link.url}
                  to={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${
                    link.css_class === "font-medium"
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Professionnels</p>
              {proLinks.map((link) => (
                <Link
                  key={link.url}
                  to={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

export default Header;
