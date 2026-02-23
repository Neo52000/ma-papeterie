import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/components/ui/button";
import { Home, Menu, Bell, ChevronRight } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

// ── Mapping breadcrumb path → label ──────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  "/admin":                    "Tableau de bord",
  "/admin/products":           "Produits",
  "/admin/categories":         "Catégories",
  "/admin/orders":             "Commandes",
  "/admin/users":              "Utilisateurs",
  "/admin/crm":                "CRM Clients",
  "/admin/school-lists":       "Listes Scolaires",
  "/admin/purchases":          "Achats & Fournisseurs",
  "/admin/suppliers":          "Fournisseurs",
  "/admin/softcarrier":        "Soft Carrier",
  "/admin/alkor":              "ALKOR / Burolike",
  "/admin/comlandi":           "COMLANDI",
  "/admin/import-fournisseurs":"Import fournisseurs",
  "/admin/stock-virtuel":      "Stock Virtuel",
  "/admin/price-comparison":   "Comparateur Prix",
  "/admin/competitors":        "Prix concurrentiels",
  "/admin/pricing":            "Pricing Auto",
  "/admin/pricing-dynamic":    "Pricing dynamique",
  "/admin/price-evolution":    "Évolution Prix",
  "/admin/b2b":                "Grilles B2B",
  "/admin/product-offers":     "Offres fournisseurs",
  "/admin/sales-predictions":  "Intelligence Achat",
  "/admin/recommendations":    "Recommandations",
  "/admin/automations":        "Automatisations",
  "/admin/alerts":             "Alertes",
  "/admin/exceptions":         "Exceptions",
  "/admin/amazon-export":      "Export Amazon",
  "/admin/marketplaces":       "Multi-Marketplace",
  "/admin/shipping":           "Expéditions",
  "/admin/pages":              "Pages (IA)",
  "/admin/analytics":          "Analytics",
  "/admin/image-collector":    "Collecteur Images",
  "/admin/product-images":     "Images Produits",
  "/admin/gdpr":               "RGPD",
};

function useBreadcrumbs(pathname: string) {
  const parts: { label: string; path: string }[] = [
    { label: "Admin", path: "/admin" },
  ];
  if (pathname !== "/admin" && PATH_LABELS[pathname]) {
    parts.push({ label: PATH_LABELS[pathname], path: pathname });
  }
  return parts;
}

// ── Layout ─────────────────────────────────────────────────────────────────────

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();
  const { orders } = useOrders();
  const breadcrumbs = useBreadcrumbs(pathname);

  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;
  const userInitial   = user?.email?.[0]?.toUpperCase() ?? "A";

  useEffect(() => {
    if (!isLoading && (!user || (!isAdmin && !isSuperAdmin))) {
      navigate("/auth");
    }
  }, [isLoading, user, isAdmin, isSuperAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isSuperAdmin)) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            {/* Breadcrumb bar */}
            <div className="flex items-center gap-1.5 px-6 pt-3 text-xs text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.path} className="flex items-center gap-1.5">
                  {i < breadcrumbs.length - 1 ? (
                    <Link to={crumb.path} className="hover:text-foreground transition-colors">{crumb.label}</Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 shrink-0" />}
                </span>
              ))}
            </div>

            {/* Main header row */}
            <div className="flex h-12 items-center gap-4 px-6 pb-2">
              <SidebarTrigger className="md:hidden shrink-0">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground leading-none">{title}</h1>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                )}
              </div>

              {/* Actions droite */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Cloche notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8"
                  onClick={() => navigate("/admin/orders")}
                  title={pendingOrders > 0 ? `${pendingOrders} commande(s) en attente` : "Commandes"}
                >
                  <Bell className="h-4 w-4" />
                  {pendingOrders > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {pendingOrders > 9 ? "9+" : pendingOrders}
                    </span>
                  )}
                </Button>

                {/* Retour au site */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Retour au site</span>
                </Button>

                {/* Avatar utilisateur */}
                <div
                  className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm cursor-default"
                  title={user?.email ?? ""}
                >
                  {userInitial}
                </div>
              </div>
            </div>
          </header>

          {/* ── Main Content ────────────────────────────────────────────────── */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
