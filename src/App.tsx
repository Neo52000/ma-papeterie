import { lazy, Suspense, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminGuard } from "@/components/AdminGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { ProGuard } from "@/components/ProGuard";
import { Loader2 } from "lucide-react";

// ── Pages publiques (chargées eagerly — critiques pour le LCP) ────────────────
import Index from "./pages/Index";
// Services is now loaded dynamically via DynamicServicesPage (with fallback)
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import Catalogue from "./pages/Catalogue";
import Promotions from "./pages/Promotions";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import ListesScolaires from "./pages/ListesScolaires";

// ── Pages auth (lazy) ─────────────────────────────────────────────────────────
const ForgotPassword             = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword              = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail                = lazy(() => import("./pages/VerifyEmail"));

// ── Pages utilisateur connecté (lazy — pas critiques pour le LCP) ────────────
const MonCompte  = lazy(() => import("./pages/MonCompte"));
const MesFavoris = lazy(() => import("./pages/MesFavoris"));
const Checkout   = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));

// ── Pages légales / blog (lazy — contenu statique, non critique) ──────────────
const MentionsLegales          = lazy(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const CGV                      = lazy(() => import("./pages/CGV"));
const Cookies                  = lazy(() => import("./pages/Cookies"));
const FAQ                      = lazy(() => import("./pages/FAQ"));
const APropos                  = lazy(() => import("./pages/APropos"));
const Livraison                = lazy(() => import("./pages/Livraison"));
const Blog                     = lazy(() => import("./pages/BlogPage").then(m => ({ default: m.BlogPage })));
const BlogArticle              = lazy(() => import("./pages/BlogArticlePage").then(m => ({ default: m.BlogArticlePage })));

// ── Pages consommables (lazy) ────────────────────────────────────────────────
const Consommables             = lazy(() => import("./pages/Consommables"));
const AdminConsumables         = lazy(() => import("./pages/AdminConsumables"));

// ── Pages SEO & B2B (lazy) ────────────────────────────────────────────────────
const ReponseOfficielleIA      = lazy(() => import("./pages/ReponseOfficielleIA"));
const ImpressionUrgente        = lazy(() => import("./pages/ImpressionUrgente"));
const PhotocopieExpress        = lazy(() => import("./pages/PhotocopieExpress"));
const PhotosExpress            = lazy(() => import("./pages/PhotosExpress"));
const PlaqueImmatriculation    = lazy(() => import("./pages/PlaqueImmatriculation"));
const TamponProfessionnel      = lazy(() => import("./pages/TamponProfessionnel"));
const TamponDesigner           = lazy(() => import("./pages/TamponDesigner"));
const SolutionsInstitutions    = lazy(() => import("./pages/SolutionsInstitutions"));
const PackProLocal             = lazy(() => import("./pages/PackProLocal"));
const LeasingMobilier          = lazy(() => import("./pages/LeasingMobilier"));

// ── Pages services (tunnel de commande) ──────────────────────────────────────
const ServiceReprographie      = lazy(() => import("./pages/ServiceReprographie"));
const ServiceDeveloppementPhoto = lazy(() => import("./pages/ServiceDeveloppementPhoto"));

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
const AdminShopify             = lazy(() => import("./pages/AdminShopify"));
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
const AdminPageBuilder         = lazy(() => import("./pages/AdminPageBuilder"));
const AdminMenus               = lazy(() => import("./pages/AdminMenus"));
const AdminBlogArticles        = lazy(() => import("./components/admin/AdminBlogArticles").then(m => ({ default: m.AdminBlogArticles })));
const AdminStampModels         = lazy(() => import("./pages/AdminStampModels"));
const AdminPhotocopies         = lazy(() => import("./pages/AdminPhotocopies"));
const AdminImpressions         = lazy(() => import("./pages/AdminImpressions"));
const AdminPhotos              = lazy(() => import("./pages/AdminPhotos"));
const AdminPrintOrders         = lazy(() => import("./pages/AdminPrintOrders"));
const AdminPhotoOrders         = lazy(() => import("./pages/AdminPhotoOrders"));

// ── Pages Pro / Espace client B2B (lazy) ─────────────────────────────────────
const ProDashboard             = lazy(() => import("./pages/ProDashboard"));
const ProOrders                = lazy(() => import("./pages/ProOrders"));
const ProReassort              = lazy(() => import("./pages/ProReassort"));
const ProFactures              = lazy(() => import("./pages/ProFactures"));
const ProEquipe                = lazy(() => import("./pages/ProEquipe"));

// ── Pages CMS dynamiques (lazy) ───────────────────────────────────────────────
const DynamicPage              = lazy(() => import("./pages/DynamicPage"));
const DynamicServicesPage      = lazy(() => import("./pages/DynamicServicesPage"));

const ServiceOrderConfirmationPage = lazy(() => import("./pages/ServiceOrderConfirmationPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { CookieBanner } from "./components/gdpr/CookieBanner";
import { DynamicCanonical } from "./components/seo/DynamicCanonical";
import { AnalyticsProvider } from "./contexts/AnalyticsProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminErrorBoundary } from "./components/admin/AdminErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min — évite les refetch inutiles
      gcTime: 15 * 60 * 1000,    // 15 min — garde le cache plus longtemps
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function AdminRoute({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <AdminErrorBoundary>{children}</AdminErrorBoundary>
    </AdminGuard>
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
              <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/services" element={<DynamicServicesPage />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:handle" element={<ProductPage />} />
                  <Route path="/produit/:slug" element={<ProductDetailPage />} />
                  <Route path="/catalogue" element={<Catalogue />} />
                  <Route path="/consommables" element={<Consommables />} />
                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  {/* Service order tunnels */}
                  <Route path="/services/reprographie" element={<AuthGuard><ServiceReprographie /></AuthGuard>} />
                  <Route path="/services/developpement-photo" element={<AuthGuard><ServiceDeveloppementPhoto /></AuthGuard>} />

                  <Route path="/mon-compte" element={<AuthGuard><MonCompte /></AuthGuard>} />
                  <Route path="/mes-favoris" element={<AuthGuard><MesFavoris /></AuthGuard>} />
                  <Route path="/checkout" element={<AuthGuard><Checkout /></AuthGuard>} />
                  <Route path="/order-confirmation" element={<AuthGuard><OrderConfirmation /></AuthGuard>} />
                  <Route path="/service-confirmation" element={<AuthGuard><ServiceOrderConfirmationPage /></AuthGuard>} />
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
                  <Route path="/photos-express-chaumont" element={<PhotosExpress />} />
                  <Route path="/plaque-immatriculation-chaumont" element={<PlaqueImmatriculation />} />
                  <Route path="/tampon-professionnel-chaumont" element={<TamponProfessionnel />} />
                  <Route path="/tampon-designer" element={<TamponDesigner />} />
                  <Route path="/tampon-designer/:modelSlug" element={<TamponDesigner />} />
                  <Route path="/solutions-institutions-chaumont" element={<SolutionsInstitutions />} />
                  <Route path="/pack-pro-local-chaumont" element={<PackProLocal />} />
                  <Route path="/leasing-mobilier-bureau" element={<LeasingMobilier />} />

                  {/* Legal pages */}
                  <Route path="/mentions-legales" element={<MentionsLegales />} />
                  <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                  <Route path="/cgv" element={<CGV />} />
                  <Route path="/cookies" element={<Cookies />} />

                  {/* Admin routes — protégées par AdminGuard */}
                  <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                  <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
                  <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
                  <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                  <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                  <Route path="/admin/school-lists" element={<AdminRoute><AdminSchoolLists /></AdminRoute>} />
                  <Route path="/admin/suppliers" element={<AdminRoute><AdminSuppliers /></AdminRoute>} />
                  <Route path="/admin/crm" element={<AdminRoute><AdminCRM /></AdminRoute>} />
                  <Route path="/admin/purchases" element={<AdminRoute><AdminPurchases /></AdminRoute>} />
                  <Route path="/admin/competitors" element={<AdminRoute><AdminCompetitors /></AdminRoute>} />
                  <Route path="/admin/pricing" element={<AdminRoute><AdminPricing /></AdminRoute>} />
                  <Route path="/admin/price-evolution" element={<AdminRoute><AdminPriceEvolution /></AdminRoute>} />
                  <Route path="/admin/sales-predictions" element={<AdminRoute><AdminSalesPredictions /></AdminRoute>} />
                  <Route path="/admin/alerts" element={<AdminRoute><AdminAlerts /></AdminRoute>} />
                  <Route path="/admin/gdpr" element={<AdminRoute><AdminGDPR /></AdminRoute>} />
                  <Route path="/admin/amazon-export" element={<AdminRoute><AdminAmazonExport /></AdminRoute>} />
                  <Route path="/admin/shipping" element={<AdminRoute><AdminShipping /></AdminRoute>} />
                  <Route path="/admin/marketplaces" element={<AdminRoute><AdminMarketplaces /></AdminRoute>} />
                  <Route path="/admin/shopify" element={<AdminRoute><AdminShopify /></AdminRoute>} />
                  <Route path="/admin/price-comparison" element={<AdminRoute><AdminPriceComparison /></AdminRoute>} />
                  <Route path="/admin/image-collector" element={<AdminRoute><AdminImageCollector /></AdminRoute>} />
                  <Route path="/admin/exceptions" element={<AdminRoute><AdminExceptions /></AdminRoute>} />
                  <Route path="/admin/product-images" element={<AdminRoute><AdminProductImages /></AdminRoute>} />
                  <Route path="/admin/automations" element={<AdminRoute><AdminAutomations /></AdminRoute>} />
                  <Route path="/admin/stock-virtuel" element={<AdminRoute><AdminStockVirtuel /></AdminRoute>} />
                  <Route path="/admin/b2b" element={<AdminRoute><AdminB2B /></AdminRoute>} />
                  <Route path="/admin/softcarrier" element={<AdminRoute><AdminSoftCarrier /></AdminRoute>} />
                  <Route path="/admin/alkor" element={<AdminRoute><AdminAlkor /></AdminRoute>} />
                  <Route path="/admin/comlandi" element={<AdminRoute><AdminComlandi /></AdminRoute>} />
                  <Route path="/admin/products/:id/offers" element={<AdminRoute><AdminProductOffers /></AdminRoute>} />
                  <Route path="/admin/product-offers" element={<AdminRoute><AdminSupplierOffers /></AdminRoute>} />
                  <Route path="/admin/pricing-dynamic" element={<AdminRoute><AdminPricingDynamic /></AdminRoute>} />
                  <Route path="/admin/recommendations" element={<AdminRoute><AdminRecommendations /></AdminRoute>} />
                  <Route path="/admin/import-fournisseurs" element={<AdminRoute><AdminImportFournisseurs /></AdminRoute>} />
                  <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
                  <Route path="/admin/pages" element={<AdminRoute><AdminPages /></AdminRoute>} />
                  <Route path="/admin/security-seo-geo" element={<AdminRoute><AdminSecuritySeoGeo /></AdminRoute>} />
                  <Route path="/admin/icecat-enrich" element={<AdminRoute><AdminIcecatEnrich /></AdminRoute>} />
                  <Route path="/admin/page-builder/:id" element={<AdminRoute><AdminPageBuilder /></AdminRoute>} />
                  <Route path="/admin/menus" element={<AdminRoute><AdminMenus /></AdminRoute>} />
                  <Route path="/admin/blog" element={<AdminRoute><AdminBlogArticles /></AdminRoute>} />
                  <Route path="/admin/stamp-models" element={<AdminRoute><AdminStampModels /></AdminRoute>} />
                  <Route path="/admin/photocopies" element={<AdminRoute><AdminPhotocopies /></AdminRoute>} />
                  <Route path="/admin/impressions" element={<AdminRoute><AdminImpressions /></AdminRoute>} />
                  <Route path="/admin/photos" element={<AdminRoute><AdminPhotos /></AdminRoute>} />
                  <Route path="/admin/print-orders" element={<AdminRoute><AdminPrintOrders /></AdminRoute>} />
                  <Route path="/admin/photo-orders" element={<AdminRoute><AdminPhotoOrders /></AdminRoute>} />
                  <Route path="/admin/consumables" element={<AdminRoute><AdminConsumables /></AdminRoute>} />

                  {/* Espace Pro / B2B — protege par ProGuard */}
                  <Route path="/pro/dashboard" element={<ProGuard><ProDashboard /></ProGuard>} />
                  <Route path="/pro/commandes" element={<ProGuard><ProOrders /></ProGuard>} />
                  <Route path="/pro/reassort" element={<ProGuard><ProReassort /></ProGuard>} />
                  <Route path="/pro/factures" element={<ProGuard><ProFactures /></ProGuard>} />
                  <Route path="/pro/equipe" element={<ProGuard><ProEquipe /></ProGuard>} />

                  {/* CMS pages dynamiques */}
                  <Route path="/p/:slug" element={<DynamicPage />} />

                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </ErrorBoundary>
              <CookieBanner />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
