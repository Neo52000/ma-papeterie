import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Phone, Mail, X, LogOut, Settings, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShopifyCartDrawer } from "@/components/cart/ShopifyCartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo-ma-papeterie.png";

const Header = () => {
  const [userType, setUserType] = useState<'B2C' | 'B2B'>('B2C');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { to: "/", label: "Accueil" },
    { to: "/shop", label: "Boutique" },
    { to: "/services", label: "Services" },
    { to: "/listes-scolaires", label: "Listes Scolaires" },
    { to: "/promotions", label: "Promotions" },
    { to: "/blog", label: "Blog" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 flex justify-between items-center h-9">
          <div className="hidden sm:flex items-center gap-5 text-xs">
            <a href="tel:0745062162" className="flex items-center gap-1.5 hover:text-secondary transition-colors">
              <Phone className="w-3 h-3" /> 07 45 062 162
            </a>
            <a href="mailto:contact@ma-papeterie.fr" className="flex items-center gap-1.5 hover:text-secondary transition-colors">
              <Mail className="w-3 h-3" /> contact@ma-papeterie.fr
            </a>
          </div>
          <div className="text-xs font-medium mx-auto sm:mx-0">
            🚚 Livraison gratuite dès 49€
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img src={logo} alt="Ma Papeterie" className="h-9 w-auto" />
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg text-primary leading-none font-poppins">Ma Papeterie</h1>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Reine & Fils • Chaumont</p>
          </div>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Rechercher vos fournitures..." 
              className="pl-10 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background transition-all"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* B2C/B2B Toggle */}
          <div className="hidden lg:flex bg-muted rounded-lg p-0.5">
            {['B2C', 'B2B'].map((type) => (
              <button
                key={type}
                onClick={() => setUserType(type as 'B2C' | 'B2B')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  userType === type 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {type === 'B2C' ? 'Particulier' : 'Professionnel'}
              </button>
            ))}
          </div>

          {/* Mobile Search Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setSearchOpen(!searchOpen)}>
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>

          {/* User */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
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
            <Button size="sm" onClick={() => navigate('/auth')} className="h-9 text-xs">
              Connexion
            </Button>
          )}

          <WishlistDrawer />
          <ShopifyCartDrawer />

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="md:hidden border-t border-border px-4 py-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Rechercher..." className="pl-10" autoFocus />
          </div>
        </div>
      )}

      {/* Navigation - Desktop */}
      <nav className="hidden md:block border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-11">
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
              
              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center gap-1">
                  Services Express <ChevronDown className="w-3 h-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 bg-popover">
                  <DropdownMenuItem onClick={() => navigate('/impression-urgente-chaumont')}>Impression Urgente</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/photocopie-express-chaumont')}>Photocopie Express</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/plaque-immatriculation-chaumont')}>Plaque d'Immatriculation</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/tampon-professionnel-chaumont')}>Tampon Professionnel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="text-sm font-medium px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 flex items-center gap-1">
                  Professionnels <ChevronDown className="w-3 h-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 bg-popover">
                  <DropdownMenuItem onClick={() => navigate('/pack-pro-local-chaumont')}>Pack Pro Local</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/solutions-institutions-chaumont')}>Solutions Institutions</DropdownMenuItem>
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
            <div className="text-xs text-muted-foreground font-medium">
              {userType === 'B2C' ? 'Prix TTC' : 'Prix HT'}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <div className="container mx-auto px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <p className="px-4 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Services Express</p>
              {[
                { to: '/impression-urgente-chaumont', label: 'Impression Urgente' },
                { to: '/photocopie-express-chaumont', label: 'Photocopie Express' },
                { to: '/plaque-immatriculation-chaumont', label: "Plaque d'Immatriculation" },
                { to: '/tampon-professionnel-chaumont', label: 'Tampon Professionnel' },
              ].map((link) => (
                <Link 
                  key={link.to}
                  to={link.to}
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
};

export default Header;
