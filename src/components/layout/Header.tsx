import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Menu, Phone, Mail, ShoppingCart, Heart, LogOut, Settings, Package, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShopifyCartDrawer } from "@/components/cart/ShopifyCartDrawer";
import { WishlistDrawer } from "@/components/wishlist/WishlistDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo-ma-papeterie.png";

const Header = () => {
  const [userType, setUserType] = useState<'B2C' | 'B2B'>('B2C');
  const { user, signOut, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground text-sm py-2">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              01 23 45 67 89
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              contact@ma-papeterie.fr
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Livraison gratuite dès 49€</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Ma Papeterie" className="h-10 w-auto" />
            <div>
              <h1 className="font-bold text-xl text-primary font-poppins">Ma Papeterie</h1>
              <p className="text-xs text-muted-foreground">Reine & Fils</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Rechercher vos fournitures..." 
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* User Type Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setUserType('B2C')}
                className={`px-3 py-1 rounded-md text-sm transition-smooth ${
                  userType === 'B2C' 
                    ? 'bg-primary text-primary-foreground shadow-soft' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Particulier
              </button>
              <button
                onClick={() => setUserType('B2B')}
                className={`px-3 py-1 rounded-md text-sm transition-smooth ${
                  userType === 'B2B' 
                    ? 'bg-primary text-primary-foreground shadow-soft' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Professionnel
              </button>
            </div>

            {/* User Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-accent/50">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/mon-compte')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Mon compte
                  </DropdownMenuItem>
                  {(isAdmin || isSuperAdmin) && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Tableau de bord Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate('/auth')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Connexion
              </Button>
            )}

            {/* Wishlist */}
            <WishlistDrawer />

            {/* Cart */}
            <ShopifyCartDrawer />

            {/* Mobile Menu */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-sm font-medium hover:text-primary transition-smooth">Accueil</Link>
              <Link to="/shop" className="text-sm font-medium hover:text-primary transition-smooth">Boutique</Link>
              <Link to="/catalogue" className="text-sm font-medium hover:text-primary transition-smooth">Catalogue</Link>
              <Link to="/listes-scolaires" className="text-sm font-medium hover:text-primary transition-smooth">Listes Scolaires</Link>
              <a href="#" className="text-sm font-medium hover:text-primary transition-smooth">Écoresponsable</a>
              <Link to="/promotions" className="text-sm font-medium hover:text-primary transition-smooth">Promotions</Link>
              <Link to="/contact" className="text-sm font-medium hover:text-primary transition-smooth">Contact</Link>
              
              {/* Admin Button - Visible only for admins */}
              {(isAdmin || isSuperAdmin) && (
                <Link 
                  to="/admin" 
                  className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-md hover:bg-primary/20 transition-smooth"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {userType === 'B2C' ? 'Prix TTC' : 'Prix HT'}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;