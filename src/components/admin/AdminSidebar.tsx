import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Package, ShoppingCart, Users, TrendingUp, Truck, School,
  Calculator, Activity, Sparkles, Bell, LayoutDashboard, Shield,
  Settings, LogOut, ChevronLeft, ChevronRight, Store, PackageCheck,
  Globe, ImageIcon, Zap, Warehouse, Percent, FolderTree, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MenuGroup {
  label: string;
  items: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
    superAdminOnly?: boolean;
  }[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { title: "Tableau de bord", icon: LayoutDashboard, path: "/admin" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Produits", icon: Package, path: "/admin/products" },
      { title: "Catégories", icon: FolderTree, path: "/admin/categories" },
      { title: "Commandes", icon: ShoppingCart, path: "/admin/orders" },
      { title: "Utilisateurs", icon: Users, path: "/admin/users" },
      { title: "CRM Clients", icon: Users, path: "/admin/crm" },
      { title: "Listes Scolaires", icon: School, path: "/admin/school-lists" },
    ],
  },
  {
    label: "Approvisionnement",
    items: [
      { title: "Achats & Fournisseurs", icon: Truck, path: "/admin/purchases", superAdminOnly: true },
      { title: "Fournisseurs", icon: Truck, path: "/admin/suppliers", superAdminOnly: true },
      { title: "Soft Carrier", icon: PackageCheck, path: "/admin/softcarrier" },
      { title: "ALKOR / Burolike", icon: Package, path: "/admin/alkor" },
      { title: "COMLANDI", icon: Package, path: "/admin/comlandi" },
      { title: "Stock Virtuel", icon: Warehouse, path: "/admin/stock-virtuel" },
    ],
  },
  {
    label: "Pricing & Concurrence",
    items: [
      { title: "Comparateur Prix", icon: TrendingUp, path: "/admin/price-comparison" },
      { title: "Prix Concurrentiels", icon: TrendingUp, path: "/admin/competitors" },
      { title: "Pricing Auto", icon: Calculator, path: "/admin/pricing" },
      { title: "Évolution Prix", icon: Activity, path: "/admin/price-evolution" },
      { title: "Grilles B2B", icon: Percent, path: "/admin/b2b" },
      { title: "Offres fournisseurs", icon: Layers, path: "/admin/product-offers" },
    ],
  },
  {
    label: "Intelligence & Automatisation",
    items: [
      { title: "Intelligence Achat", icon: Sparkles, path: "/admin/sales-predictions" },
      { title: "Alertes", icon: Bell, path: "/admin/alerts" },
      { title: "Automatisations", icon: Zap, path: "/admin/automations" },
      { title: "Exceptions", icon: Bell, path: "/admin/exceptions" },
    ],
  },
  {
    label: "Marketplaces & Distribution",
    items: [
      { title: "Export Amazon", icon: Store, path: "/admin/amazon-export" },
      { title: "Multi-Marketplace", icon: Globe, path: "/admin/marketplaces" },
      { title: "Expéditions", icon: PackageCheck, path: "/admin/shipping" },
    ],
  },
  {
    label: "Contenu & Conformité",
    items: [
      { title: "Collecteur Images", icon: ImageIcon, path: "/admin/image-collector" },
      { title: "Images Produits", icon: ImageIcon, path: "/admin/product-images" },
      { title: "RGPD", icon: Shield, path: "/admin/gdpr" },
    ],
  },
];

export function AdminSidebar() {
  const { isSuperAdmin, signOut } = useAuth();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      className={cn(
        "border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Settings className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 overflow-y-auto">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || isSuperAdmin
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className={cn("text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold", isCollapsed && "sr-only")}>
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={isCollapsed ? item.title : undefined}
                        >
                          <NavLink
                            to={item.path}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center px-0"
          )}
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Déconnexion</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
