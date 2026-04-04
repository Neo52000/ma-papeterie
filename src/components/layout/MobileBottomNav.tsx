import { Link, useLocation } from "react-router-dom";
import { House, Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/stores/mainCartStore";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { label: "Accueil", icon: House, href: "/" },
  { label: "Catalogue", icon: Search, href: "/catalogue" },
  { label: "Panier", icon: ShoppingCart, href: "/checkout" },
  { label: "Compte", icon: User, href: "/mon-compte" },
] as const;

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const { state } = useCart();
  const totalItems = state.itemCount;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isCart = label === "Panier";
          return (
            <Link
              key={href}
              to={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {isCart && totalItems > 0 && (
                  <Badge className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] rounded-full p-0 flex items-center justify-center text-[9px] bg-accent text-accent-foreground">
                    {totalItems}
                  </Badge>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
