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
  FileText, BarChart3, Star, Upload, AlertTriangle, GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrders } from "@/hooks/useOrders";

// ── Types ──────────────────────────────────────────────────────────────────────

interface MenuItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  superAdminOnly?: boolean;
  badge?: number | string;
  isNew?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

// ── Sidebar principale ────────────────────────────────────────────────────────

export function AdminSidebar() {
  const { user, isSuperAdmin, signOut } = useAuth();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { orders } = useOrders();

  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;

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
        { title: "Commandes", icon: ShoppingCart, path: "/admin/orders", badge: pendingOrders || undefined },
        { title: "Utilisateurs", icon: Users, path: "/admin/users" },
        { title: "CRM Clients", icon: Users, path: "/admin/crm" },
        { title: "Listes Scolaires", icon: School, path: "/admin/school-lists" },
      ],
    },
    {
      label: "Approvisionnement",
      items: [
        { title: "Achats & Fournisseurs", icon: Truck, path: "/admin/purchases", superAdminOnly: true },
        { title: "Fournisseurs",          icon: PackageCheck, path: "/admin/suppliers", superAdminOnly: true },
        { title: "Soft Carrier",          icon: PackageCheck, path: "/admin/softcarrier" },
        { title: "ALKOR / Burolike",      icon: Package, path: "/admin/alkor" },
        { title: "COMLANDI",             icon: Package, path: "/admin/comlandi" },
        { title: "Import fournisseurs",   icon: Upload, path: "/admin/import-fournisseurs" },
        { title: "Stock Virtuel",         icon: Warehouse, path: "/admin/stock-virtuel" },
      ],
    },
    {
      label: "Pricing & Concurrence",
      items: [
        { title: "Comparateur Prix",  icon: GitCompare,  path: "/admin/price-comparison" },
        { title: "Prix concurrentiels", icon: TrendingUp, path: "/admin/competitors" },
        { title: "Pricing Auto",      icon: Calculator,  path: "/admin/pricing" },
        { title: "Pricing dynamique", icon: Activity,    path: "/admin/pricing-dynamic" },
        { title: "Évolution Prix",    icon: TrendingUp,  path: "/admin/price-evolution" },
        { title: "Grilles B2B",       icon: Percent,     path: "/admin/b2b" },
        { title: "Offres fournisseurs", icon: Layers,    path: "/admin/product-offers" },
      ],
    },
    {
      label: "Intelligence & IA",
      items: [
        { title: "Intelligence Achat", icon: Sparkles, path: "/admin/sales-predictions" },
        { title: "Recommandations",    icon: Star,     path: "/admin/recommendations" },
        { title: "Automatisations",    icon: Zap,      path: "/admin/automations" },
        { title: "Alertes",            icon: AlertTriangle, path: "/admin/alerts" },
        { title: "Exceptions",         icon: Bell,     path: "/admin/exceptions" },
      ],
    },
    {
      label: "Marketplaces",
      items: [
        { title: "Export Amazon",     icon: Store,        path: "/admin/amazon-export" },
        { title: "Multi-Marketplace", icon: Globe,        path: "/admin/marketplaces" },
        { title: "Expéditions",       icon: PackageCheck, path: "/admin/shipping" },
      ],
    },
    {
      label: "Contenu & SEO",
      items: [
        { title: "Pages (IA)",         icon: FileText,  path: "/admin/pages", isNew: true },
        { title: "Analytics",          icon: BarChart3, path: "/admin/analytics" },
        { title: "Collecteur Images",  icon: ImageIcon, path: "/admin/image-collector" },
        { title: "Images Produits",    icon: ImageIcon, path: "/admin/product-images" },
        { title: "RGPD",              icon: Shield,    path: "/admin/gdpr" },
        { title: "Audit Sécu/SEO/GEO", icon: Shield, path: "/admin/security-seo-geo", isNew: true },
      ],
    },
  ];

  // Initiales de l'utilisateur pour l'avatar
  const userInitial = user?.email?.[0]?.toUpperCase() ?? "A";
  const userEmail   = user?.email ?? "";
  const truncEmail  = userEmail.length > 22 ? userEmail.slice(0, 19) + "…" : userEmail;

  return (
    <Sidebar
      className={cn(
        "dark border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
      collapsible="icon"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Settings className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-none truncate">Ma Papeterie</p>
                <p className="text-xs text-muted-foreground mt-0.5">Administration</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <Settings className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 shrink-0">
            {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </SidebarHeader>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <SidebarContent className="p-2 overflow-y-auto">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || isSuperAdmin,
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="mb-1">
              <SidebarGroupLabel
                className={cn(
                  "text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold px-2 mb-1",
                  isCollapsed && "sr-only",
                )}
              >
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path
                      || (item.path !== "/admin" && location.pathname.startsWith(item.path));
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
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-150",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-medium"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && (
                              <span className="flex-1 truncate">{item.title}</span>
                            )}
                            {/* Badges */}
                            {!isCollapsed && item.isNew && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 font-semibold" variant="default">
                                NEW
                              </Badge>
                            )}
                            {!isCollapsed && item.badge != null && Number(item.badge) > 0 && (
                              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                                {item.badge}
                              </span>
                            )}
                            {/* Badge condensé en mode collapsed */}
                            {isCollapsed && item.badge != null && Number(item.badge) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border border-card" />
                            )}
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

      {/* ── Footer — Avatar + Déconnexion ──────────────────────────────────── */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-8 w-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-sidebar-primary font-bold text-sm shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-sidebar-foreground">{truncEmail}</p>
                <p className="text-[10px] text-sidebar-foreground/50">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-sidebar-accent h-8 text-sm"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Déconnexion
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center text-sidebar-primary font-bold text-xs">
              {userInitial}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-sidebar-accent"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
