import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
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
  Package, ShoppingCart, Users, TrendingUp, Truck, GraduationCap,
  Calculator, Activity, Sparkles, Bell, LayoutDashboard,
  Settings, LogOut, ChevronLeft, ChevronRight, Store, PackageCheck,
  Globe, ImageIcon, Zap, Warehouse, Percent, FolderTree,
  FileText, BarChart3, Star, Upload, AlertTriangle, GitCompare, Database,
  PenTool, Stamp, Contact, LineChart, Tag, ShoppingBag, Building2,
  BookOpen, Boxes, LayoutList, ShieldCheck, Copy, Camera, Wifi, Share2,
  PanelTop, PanelBottom, Palette, MessageSquare, Brain,
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
      label: "Général",
      items: [
        { title: "Tableau de bord", icon: LayoutDashboard, path: "/admin" },
      ],
    },
    {
      label: "Catalogue",
      items: [
        { title: "Produits",         icon: Package,       path: "/admin/products" },
        { title: "Catégories",       icon: FolderTree,    path: "/admin/categories" },
        { title: "Commandes",        icon: ShoppingCart,   path: "/admin/orders", badge: pendingOrders || undefined },
        { title: "Expéditions",      icon: Truck,          path: "/admin/shipping" },
        { title: "Listes Scolaires", icon: GraduationCap,  path: "/admin/school-lists" },
      ],
    },
    {
      label: "Services Magasin",
      items: [
        { title: "Tampons",           icon: Stamp,   path: "/admin/stamp-models" },
        { title: "Photocopies",       icon: Copy,    path: "/admin/photocopies", isNew: true },
        { title: "Photos & Identité", icon: Camera,  path: "/admin/photos", isNew: true },
      ],
    },
    {
      label: "Clients",
      items: [
        { title: "Utilisateurs", icon: Users,          path: "/admin/users" },
        { title: "CRM",          icon: Contact,        path: "/admin/crm" },
        { title: "Pipeline B2B", icon: TrendingUp,     path: "/admin/crm/pipeline", isNew: true },
        { title: "Devis",       icon: FileText,        path: "/admin/crm/quotes", isNew: true },
        { title: "SMS",          icon: MessageSquare,  path: "/admin/sms", isNew: true },
        { title: "Grilles B2B",  icon: Percent,        path: "/admin/b2b" },
      ],
    },
    {
      label: "Fournisseurs",
      items: [
        { title: "Achats",              icon: ShoppingBag,  path: "/admin/purchases", superAdminOnly: true },
        { title: "Fournisseurs",        icon: Building2,    path: "/admin/suppliers", superAdminOnly: true },
        { title: "ALKOR / Burolike",    icon: BookOpen,     path: "/admin/alkor" },
        { title: "COMLANDI",            icon: Boxes,        path: "/admin/comlandi" },
        { title: "Soft Carrier",        icon: PackageCheck, path: "/admin/softcarrier" },
        { title: "ALSO",               icon: Database,     path: "/admin/also" },
        { title: "Import fournisseurs", icon: Upload,       path: "/admin/import-fournisseurs" },
        { title: "Complétude",         icon: BarChart3,    path: "/admin/supplier-completeness", isNew: true },
        { title: "Stock Virtuel",       icon: Warehouse,    path: "/admin/stock-virtuel" },
        { title: "Gestion Stock",       icon: Package,      path: "/admin/stock", isNew: true },
      ],
    },
    {
      label: "Pricing",
      items: [
        { title: "Comparateur",        icon: GitCompare, path: "/admin/price-comparison" },
        { title: "Concurrence",        icon: TrendingUp, path: "/admin/competitors" },
        { title: "Pricing Auto",       icon: Calculator, path: "/admin/pricing" },
        { title: "Pricing Dynamique",  icon: Activity,   path: "/admin/pricing-dynamic" },
        { title: "Évolution Prix",     icon: LineChart,   path: "/admin/price-evolution" },
        { title: "Offres Fournisseurs", icon: Tag,        path: "/admin/product-offers" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { title: "Intelligence Achat",    icon: Sparkles,      path: "/admin/sales-predictions" },
        { title: "Recommandations",       icon: Star,          path: "/admin/recommendations" },
        { title: "Automatisations",       icon: Zap,           path: "/admin/automations" },
        { title: "Alertes",              icon: AlertTriangle, path: "/admin/alerts" },
        { title: "Exceptions",           icon: Bell,          path: "/admin/exceptions" },
        { title: "Enrichissement Icecat", icon: Database,      path: "/admin/icecat-enrich", isNew: true },
        { title: "AI-CMO",              icon: Brain,         path: "/admin/ai-cmo", isNew: true },
      ],
    },
    {
      label: "Canaux",
      items: [
        { title: "Export Amazon",     icon: Store, path: "/admin/amazon-export" },
        { title: "Multi-Marketplace", icon: Globe, path: "/admin/marketplaces" },
        { title: "Shopify Connect",  icon: Wifi,  path: "/admin/shopify", isNew: true },
      ],
    },
    {
      label: "Site Builder",
      items: [
        { title: "Pages & Builder",     icon: PenTool,     path: "/admin/pages", isNew: true },
        { title: "Header",             icon: PanelTop,    path: "/admin/site-builder/header", isNew: true },
        { title: "Footer",             icon: PanelBottom, path: "/admin/site-builder/footer", isNew: true },
        { title: "Thème",              icon: Palette,     path: "/admin/site-builder/theme", isNew: true },
        { title: "Menus",              icon: LayoutList,  path: "/admin/menus", isNew: true },
      ],
    },
    {
      label: "Contenu & SEO",
      items: [
        { title: "Blog",                icon: FileText,   path: "/admin/blog" },
        { title: "Social Media",        icon: Share2,     path: "/admin/social-media", isNew: true },
        { title: "Réseaux sociaux SEO", icon: Share2,     path: "/admin/social-profiles" },
        { title: "Analytics",          icon: BarChart3,   path: "/admin/analytics" },
        { title: "Images",             icon: ImageIcon,   path: "/admin/product-images" },
        { title: "Audit & Conformité", icon: ShieldCheck, path: "/admin/security-seo-geo" },
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
      style={{
        background: 'linear-gradient(180deg, rgba(15, 11, 30, 0.95) 0%, rgba(13, 27, 42, 0.95) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                <Settings className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm leading-none truncate" style={{ color: '#F3F4F6' }}>Ma Papeterie</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Administration</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="h-8 w-8 rounded-lg flex items-center justify-center mx-auto" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
              <Settings className="h-4 w-4 text-white" />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 shrink-0 text-gray-400 hover:text-white hover:bg-white/10">
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
                  "text-[10px] uppercase tracking-widest font-semibold px-2 mb-1",
                  isCollapsed && "sr-only",
                )}
                style={{ color: '#6B7280' }}
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
                                ? "shadow-sm font-medium"
                                : "hover:bg-white/5",
                            )}
                            style={{
                              color: isActive ? '#FFFFFF' : '#A1A1AA',
                              background: isActive ? 'rgba(139, 92, 246, 0.25)' : undefined,
                            }}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && (
                              <span className="flex-1 truncate">{item.title}</span>
                            )}
                            {/* Badges */}
                            {!isCollapsed && item.isNew && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 font-semibold bg-violet-500/20 text-violet-300 border-0 hover:bg-violet-500/30">
                                NEW
                              </Badge>
                            )}
                            {!isCollapsed && item.badge != null && Number(item.badge) > 0 && (
                              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {item.badge}
                              </span>
                            )}
                            {/* Badge condensé en mode collapsed */}
                            {isCollapsed && item.badge != null && Number(item.badge) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 border border-transparent" />
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
              <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA' }}>
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#E5E7EB' }}>{truncEmail}</p>
                <p className="text-[10px]" style={{ color: '#6B7280' }}>{isSuperAdmin ? "Super Admin" : "Admin"}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-white/5 h-8 text-sm"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Déconnexion
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#A78BFA' }}>
              {userInitial}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-white/5"
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
