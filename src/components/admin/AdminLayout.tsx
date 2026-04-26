import { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/stores/authStore";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { Home, Menu, Bell, ChevronRight } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useLastDataUpdate } from "@/hooks/useLastDataUpdate";

// ── Mapping breadcrumb path → label ──────────────────────────────────────────

const PATH_LABELS: Record<string, string> = {
  // Général
  "/admin":                    "Tableau de bord",
  // Pilotage
  "/admin/pilotage":              "Tableau de pilotage",
  "/admin/pilotage/overview":     "Pilotage — Vue d'ensemble",
  "/admin/pilotage/ca-marge":     "Pilotage — CA & Marge",
  "/admin/pilotage/tresorerie":   "Pilotage — Trésorerie",
  "/admin/pilotage/boutique-pos": "Pilotage — Boutique POS",
  "/admin/pilotage/objectifs":    "Pilotage — Objectifs",
  "/admin/pilotage/coach":        "Pilotage — Coach IA",
  "/admin/pilotage/alertes":      "Pilotage — Alertes",
  // Catalogue
  "/admin/products":           "Produits",
  "/admin/categories":         "Catégories",
  "/admin/orders":             "Commandes",
  "/admin/shipping":           "Expéditions",
  "/admin/school-lists":       "Listes Scolaires",
  // Services Magasin
  "/admin/stamp-models":       "Tampons",
  "/admin/photocopies":        "Photocopies",
  "/admin/impressions":        "Impressions",
  "/admin/photos":             "Photos & Identité",
  // Clients
  "/admin/users":              "Utilisateurs",
  "/admin/crm":                "CRM",
  "/admin/crm/prospection":    "Prospection B2B",
  "/admin/b2b":                "Grilles B2B",
  // Fournisseurs
  "/admin/purchases":          "Achats",
  "/admin/suppliers":          "Fournisseurs",
  "/admin/alkor":              "ALKOR / Burolike",
  "/admin/comlandi":           "COMLANDI",
  "/admin/softcarrier":        "Soft Carrier",
  "/admin/import-fournisseurs":"Import fournisseurs",
  "/admin/stock-virtuel":      "Stock Virtuel",
  "/admin/stock":              "Gestion des Stocks",
  "/admin/supplier-completeness": "Complétude fournisseurs",
  // Pricing
  "/admin/price-comparison":   "Comparateur",
  "/admin/competitors":        "Concurrence",
  "/admin/pricing":            "Pricing Auto",
  "/admin/pricing-dynamic":    "Pricing Dynamique",
  "/admin/price-evolution":    "Évolution Prix",
  "/admin/product-offers":     "Offres Fournisseurs",
  // Intelligence
  "/admin/sales-predictions":  "Intelligence Achat",
  "/admin/recommendations":    "Recommandations",
  "/admin/automations":        "Automatisations",
  "/admin/alerts":             "Alertes",
  "/admin/exceptions":         "Exceptions",
  "/admin/icecat-enrich":      "Enrichissement Icecat",
  "/admin/ai-cmo":             "AI-CMO",
  // Canaux
  "/admin/amazon-export":      "Export Amazon",
  "/admin/marketplaces":       "Multi-Marketplace",
  // Contenu & SEO
  "/admin/blog":               "Blog",
  "/admin/social-media":       "Social Media",
  "/admin/social-profiles":    "Réseaux Sociaux (SEO)",
  "/admin/pages":              "Pages & Builder",
  "/admin/menus":              "Menus",
  "/admin/analytics":          "Analytics",
  "/admin/product-images":     "Images",
  "/admin/security-seo-geo":   "Audit & Conformité",
  // Routes legacy (gardées pour compatibilité)
  "/admin/image-collector":    "Collecteur Images",
  "/admin/gdpr":               "RGPD",
  "/admin/shopify":            "Shopify Connect",
  "/admin/page-builder":       "Éditeur visuel",
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
  const { lastUpdate } = useLastDataUpdate();
  const breadcrumbs = useBreadcrumbs(pathname);

  // Date la plus récente entre données Supabase et déploiement
  const latestDate = (() => {
    const buildTime = new Date(__BUILD_DATE__).getTime();
    const dataTime = lastUpdate ? new Date(lastUpdate).getTime() : 0;
    return new Date(Math.max(buildTime, dataTime));
  })();

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
      <div className="dark min-h-screen flex w-full" style={{ background: 'linear-gradient(135deg, #0f0b1e 0%, #1a1145 25%, #0d1b2a 50%, #0a0e1a 100%)' }}>
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header
            className="sticky top-0 z-40 border-b"
            style={{
              background: 'rgba(15, 11, 30, 0.7)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Breadcrumb bar + dernière mise à jour */}
            <div className="flex items-center justify-between px-6 pt-3">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center gap-1.5">
                    {i < breadcrumbs.length - 1 ? (
                      <Link to={crumb.path} className="hover:text-white transition-colors">{crumb.label}</Link>
                    ) : (
                      <span className="font-medium" style={{ color: '#E5E7EB' }}>{crumb.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  </span>
                ))}
              </div>
              <span className="text-[10px] hidden sm:block" style={{ color: '#6B7280' }}>
                Mis à jour le{" "}
                {latestDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                {" à "}
                {latestDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* Main header row */}
            <div className="flex h-12 items-center gap-4 px-6 pb-2">
              <SidebarTrigger className="md:hidden shrink-0 text-gray-300">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold leading-none" style={{ color: '#F9FAFB' }}>{title}</h1>
                {description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF' }}>{description}</p>
                )}
              </div>

              {/* Actions droite */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Cloche notifications */}
                <button
                  className="relative h-8 w-8 flex items-center justify-center rounded-md transition-colors hover:bg-white/10"
                  onClick={() => navigate("/admin/orders")}
                  title={pendingOrders > 0 ? `${pendingOrders} commande(s) en attente` : "Commandes"}
                >
                  <Bell className="h-4 w-4" style={{ color: '#D1D5DB' }} />
                  {pendingOrders > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {pendingOrders > 9 ? "9+" : pendingOrders}
                    </span>
                  )}
                </button>

                {/* Retour au site */}
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md transition-colors hover:bg-white/10"
                  style={{
                    color: '#D1D5DB',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Retour au site</span>
                </button>

                {/* Avatar utilisateur */}
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-default"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
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
