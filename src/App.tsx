import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// ── Pages publiques (chargées eagerly — critiques pour le LCP) ────────────────
import Index from "./pages/Index";
import Services from "./pages/Services";
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import Catalogue from "./pages/Catalogue";
import Promotions from "./pages/Promotions";
import Contact from "./pages/Contact";
import MonCompte from "./pages/MonCompte";
import MesFavoris from "./pages/MesFavoris";
import Auth from "./pages/Auth";
import Checkout from "./pages/Checkout";
import ListesScolaires from "./pages/ListesScolaires";

// ── Pages légales / blog (lazy — contenu statique, non critique) ──────────────
const MentionsLegales          = lazy(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const CGV                      = lazy(() => import("./pages/CGV"));
const Cookies                  = lazy(() => import("./pages/Cookies"));
const FAQ                      = lazy(() => import("./pages/FAQ"));
const APropos                  = lazy(() => import("./pages/APropos"));
const Livraison                = lazy(() => import("./pages/Livraison"));
const Blog                     = lazy(() => import("./pages/Blog"));
const BlogArticle              = lazy(() => import("./pages/BlogArticle"));

// ── Pages SEO & B2B (lazy) ────────────────────────────────────────────────────
const ReponseOfficielleIA      = lazy(() => import("./pages/ReponseOfficielleIA"));
const ImpressionUrgente        = lazy(() => import("./pages/ImpressionUrgente"));
const PhotocopieExpress        = lazy(() => import("./pages/PhotocopieExpress"));
const PlaqueImmatriculation    = lazy(() => import("./pages/PlaqueImmatriculation"));
const TamponProfessionnel      = lazy(() => import("./pages/TamponProfessionnel"));
const SolutionsInstitutions    = lazy(() => import("./pages/SolutionsInstitutions"));
const PackProLocal             = lazy(() => import("./pages/PackProLocal"));

// ── Pages admin (lazy — chargées uniquement si l'utilisateur va sur /admin) ───
const AdminDashboard           = lazy(() => import("./pages/AdminDashboard"));
const AdminProducts            = lazy(() => import("./pages/AdminProducts"));
const AdminOrders              = lazy(() => import("./pages/AdminOrders"));
const AdminUsers               = lazy(() => import("./pages/AdminUsers"));
const AdminSchoolLists         = lazy(() => import("./pages/AdminSchoolLists"));
const AdminSuppliers           = lazy(() => import("./pages/AdminSuppliers"));
const AdminCRM                 = lazy(() => import("./pages/AdminCRM"));
const AdminPurchases           = lazy(() => import("./pages/AdminPurchases"));
const AdminCompetitors         = lazy(() => import("./pages/AdminCompetitors"));
const AdminPricing             = lazy(() => import("./pages/AdminPricing"));
const AdminPriceEvolution      = lazy(() => import("./pages/AdminPriceEvolution"));
const AdminSalesPredictions    = lazy(() => import("./pages/AdminSalesPredictions"));
const AdminAlerts              = lazy(() => import("./pages/AdminAlerts"));
const AdminGDPR                = lazy(() => import("./pages/AdminGDPR"));
const AdminAmazonExport        = lazy(() => import("./pages/AdminAmazonExport"));
const AdminShipping            = lazy(() => import("./pages/AdminShipping"));
const AdminMarketplaces        = lazy(() => import("./pages/AdminMarketplaces"));
const AdminPriceComparison     = lazy(() => import("./pages/AdminPriceComparison"));
const AdminImageCollector      = lazy(() => import("./pages/AdminImageCollector"));
const AdminExceptions          = lazy(() => import("./pages/AdminExceptions"));
const AdminProductImages       = lazy(() => import("./pages/AdminProductImages"));
const AdminAutomations         = lazy(() => import("./pages/AdminAutomations"));
const AdminStockVirtuel        = lazy(() => import("./pages/AdminStockVirtuel"));
const AdminB2B                 = lazy(() => import("./pages/AdminB2B"));
const AdminSoftCarrier         = lazy(() => import("./pages/AdminSoftCarrier"));
const AdminAlkor               = lazy(() => import("./pages/AdminAlkor"));
const AdminComlandi            = lazy(() => import("./pages/AdminComlandi"));
const AdminCategories          = lazy(() => import("./pages/AdminCategories"));
const AdminProductOffers       = lazy(() => import("./pages/AdminProductOffers"));
const AdminSupplierOffers      = lazy(() => import("./pages/AdminSupplierOffers"));
const AdminPricingDynamic      = lazy(() => import("./pages/AdminPricingDynamic"));
const AdminRecommendations     = lazy(() => import("./pages/AdminRecommendations"));
const AdminImportFournisseurs  = lazy(() => import("./pages/AdminImportFournisseurs"));
const AdminAnalytics           = lazy(() => import("./pages/AdminAnalytics"));
const AdminPages               = lazy(() => import("./pages/AdminPages"));
const AdminSecuritySeoGeo      = lazy(() => import("./pages/AdminSecuritySeoGeo"));
const AdminIcecatEnrich        = lazy(() => import("./pages/AdminIcecatEnrich"));

// ── Pages Pro / Espace client B2B (lazy) ─────────────────────────────────────
const ProDashboard             = lazy(() => import("./pages/ProDashboard"));
const ProOrders                = lazy(() => import("./pages/ProOrders"));
const ProReassort              = lazy(() => import("./pages/ProReassort"));
const ProFactures              = lazy(() => import("./pages/ProFactures"));
const ProEquipe                = lazy(() => import("./pages/ProEquipe"));

// ── Pages CMS dynamiques (lazy) ───────────────────────────────────────────────
const DynamicPage              = lazy(() => import("./pages/DynamicPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

import { CookieBanner } from "./components/gdpr/CookieBanner";
import { DynamicCanonical } from "./components/seo/DynamicCanonical";
import { AnalyticsProvider } from "./contexts/AnalyticsProvider";

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DynamicCanonical />
              <AnalyticsProvider />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:handle" element={<ProductPage />} />
                  <Route path="/produit/:id" element={<ProductDetailPage />} />
                  <Route path="/catalogue" element={<Catalogue />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/mon-compte" element={<MonCompte />} />
                  <Route path="/mes-favoris" element={<MesFavoris />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/listes-scolaires" element={<ListesScolaires />} />

                  {/* Informational pages */}
                  <Route path="/a-propos" element={<APropos />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogArticle />} />
                  <Route path="/livraison" element={<Livraison />} />

                  {/* SEO & B2B pages */}
                  <Route path="/reponse-officielle-ia" element={<ReponseOfficielleIA />} />
                  <Route path="/impression-urgente-chaumont" element={<ImpressionUrgente />} />
                  <Route path="/photocopie-express-chaumont" element={<PhotocopieExpress />} />
                  <Route path="/plaque-immatriculation-chaumont" element={<PlaqueImmatriculation />} />
                  <Route path="/tampon-professionnel-chaumont" element={<TamponProfessionnel />} />
                  <Route path="/solutions-institutions-chaumont" element={<SolutionsInstitutions />} />
                  <Route path="/pack-pro-local-chaumont" element={<PackProLocal />} />

                  {/* Legal pages */}
                  <Route path="/mentions-legales" element={<MentionsLegales />} />
                  <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                  <Route path="/cgv" element={<CGV />} />
                  <Route path="/cookies" element={<Cookies />} />

                  {/* Admin routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/products" element={<AdminProducts />} />
                  <Route path="/admin/categories" element={<AdminCategories />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/school-lists" element={<AdminSchoolLists />} />
                  <Route path="/admin/suppliers" element={<AdminSuppliers />} />
                  <Route path="/admin/crm" element={<AdminCRM />} />
                  <Route path="/admin/purchases" element={<AdminPurchases />} />
                  <Route path="/admin/competitors" element={<AdminCompetitors />} />
                  <Route path="/admin/pricing" element={<AdminPricing />} />
                  <Route path="/admin/price-evolution" element={<AdminPriceEvolution />} />
                  <Route path="/admin/sales-predictions" element={<AdminSalesPredictions />} />
                  <Route path="/admin/alerts" element={<AdminAlerts />} />
                  <Route path="/admin/gdpr" element={<AdminGDPR />} />
                  <Route path="/admin/amazon-export" element={<AdminAmazonExport />} />
                  <Route path="/admin/shipping" element={<AdminShipping />} />
                  <Route path="/admin/marketplaces" element={<AdminMarketplaces />} />
                  <Route path="/admin/price-comparison" element={<AdminPriceComparison />} />
                  <Route path="/admin/image-collector" element={<AdminImageCollector />} />
                  <Route path="/admin/exceptions" element={<AdminExceptions />} />
                  <Route path="/admin/product-images" element={<AdminProductImages />} />
                  <Route path="/admin/automations" element={<AdminAutomations />} />
                  <Route path="/admin/stock-virtuel" element={<AdminStockVirtuel />} />
                  <Route path="/admin/b2b" element={<AdminB2B />} />
                  <Route path="/admin/softcarrier" element={<AdminSoftCarrier />} />
                  <Route path="/admin/alkor" element={<AdminAlkor />} />
                  <Route path="/admin/comlandi" element={<AdminComlandi />} />
                  <Route path="/admin/products/:id/offers" element={<AdminProductOffers />} />
                  <Route path="/admin/product-offers" element={<AdminSupplierOffers />} />
                  <Route path="/admin/pricing-dynamic" element={<AdminPricingDynamic />} />
                  <Route path="/admin/recommendations" element={<AdminRecommendations />} />
                  <Route path="/admin/import-fournisseurs" element={<AdminImportFournisseurs />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/pages" element={<AdminPages />} />
                  <Route path="/admin/security-seo-geo" element={<AdminSecuritySeoGeo />} />
                  <Route path="/admin/icecat-enrich" element={<AdminIcecatEnrich />} />

                  {/* Espace Pro / B2B */}
                  <Route path="/pro/dashboard" element={<ProDashboard />} />
                  <Route path="/pro/commandes" element={<ProOrders />} />
                  <Route path="/pro/reassort" element={<ProReassort />} />
                  <Route path="/pro/factures" element={<ProFactures />} />
                  <Route path="/pro/equipe" element={<ProEquipe />} />

                  {/* CMS pages dynamiques */}
                  <Route path="/p/:slug" element={<DynamicPage />} />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <CookieBanner />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
