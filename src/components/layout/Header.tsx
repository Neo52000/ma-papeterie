import { useState, memo, useEffect, useRef } from "react";
import { Search, User, Menu, Phone, Mail, X, LogOut, Settings, Shield, ChevronDown, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { usePriceModeStore } from "@/stores/priceModeStore";
import MegaMenu from "@/components/layout/MegaMenu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/cart/CartSheet";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { useAuth } from "@/stores/authStore";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMenuBySlug } from "@/hooks/useNavigationMenus";
import { DEFAULT_HEADER_NAV, DEFAULT_HEADER_SERVICES, DEFAULT_HEADER_PRO } from "@/data/defaultMenus";
import logo from "@/assets/logo-ma-papeterie.png";

const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = (url: string) => { window.location.href = url; };
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

  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Close mobile menu / search drawer with the Escape key + cyclic focus trap
  useEffect(() => {
    if (!mobileMenuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setSearchOpen(false);
        return;
      }
      if (e.key === "Tab" && mobileMenuOpen && mobileMenuRef.current) {
        const focusables = mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen, searchOpen]);

  // Focus management: remember/restore focus when the mobile menu opens/closes
  useEffect(() => {
    if (mobileMenuOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Move focus into the menu on next tick to ensure it's rendered
      requestAnimationFrame(() => {
        const focusable = mobileMenuRef.current?.querySelector<HTMLElement>(
          'a[href], button:not([disabled])'
        );
        focusable?.focus();
      });
    } else if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [mobileMenuOpen]);

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
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <img src={typeof logo === "string" ? logo : (logo as { src: string }).src} alt="Ma Papeterie" className="h-9 w-auto" decoding="async" />
        </a>

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
          <CartSheet />

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
              {navLinks.map((link) =>
                link.children && link.children.length > 0 ? (
                  <DropdownMenu key={link.label}>
                    <DropdownMenuTrigger className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center gap-1">
                      {link.label} <ChevronDown className="w-3 h-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-popover">
                      {link.children.map((child) => (
                        <DropdownMenuItem
                          key={child.url}
                          onClick={() => navigate(child.url)}
                          className={child.css_class ?? undefined}
                        >
                          {child.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <a
                    key={link.url}
                    href={link.url}
                    className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  >
                    {link.label}
                  </a>
                )
              )}

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
                <a
                  href="/admin"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-md hover:bg-primary/20 transition-all ml-1"
                >
                  <Shield className="w-3.5 h-3.5" /> Admin
                </a>
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
              <div
                role="group"
                aria-label="Affichage des prix"
                className="inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 text-[0.7rem] font-semibold"
              >
                <button
                  type="button"
                  onClick={() => priceMode !== 'ht' && togglePriceMode()}
                  aria-pressed={priceMode === 'ht'}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    priceMode === 'ht'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  HT
                </button>
                <button
                  type="button"
                  onClick={() => priceMode !== 'ttc' && togglePriceMode()}
                  aria-pressed={priceMode === 'ttc'}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    priceMode === 'ttc'
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  TTC
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
          className="md:hidden border-t border-border bg-background animate-fade-in max-h-[80vh] overflow-y-auto"
        >
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
                      <a
                        href={cat.url}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-8 py-1.5 text-sm text-primary font-medium hover:bg-muted rounded-lg transition-colors"
                      >
                        Tout voir
                      </a>
                      {(cat.children ?? []).map((sub) => (
                        <a
                          key={sub.id}
                          href={sub.url}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-8 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          {sub.label}
                        </a>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {navLinks.map((link) =>
              link.children && link.children.length > 0 ? (
                <div key={link.label} className="border-t border-border pt-2 mt-2">
                  <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">{link.label}</p>
                  {link.children.map((child) => (
                    <a
                      key={child.url}
                      href={child.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : (
                <a
                  key={link.url}
                  href={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </a>
              )
            )}
            <div className="border-t border-border pt-2 mt-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Services</p>
              {servicesLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors ${
                    link.css_class === "font-medium"
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Professionnels</p>
              {proLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

export default Header;
