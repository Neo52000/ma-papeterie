import { lazy, Suspense, ReactNode } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthInit } from "@/components/AuthInit";
import { AdminGuard } from "@/components/AdminGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { ProGuard } from "@/components/ProGuard";
import { Loader2 } from "lucide-react";

// ── SEULE page eagerly loaded (LCP homepage) ────────────────────────────────
import Index from "./views/Index";

// ── Pages publiques (lazy — chargées à la navigation) ───────────────────────
const Shop               = lazy(() => import("./views/Shop"));
const ProductPage         = lazy(() => import("./views/ProductPage"));
const ProductDetailPage   = lazy(() => import("./views/ProductDetailPage"));
const Catalogue           = lazy(() => import("./views/Catalogue"));
const Promotions          = lazy(() => import("./views/Promotions"));
const Contact             = lazy(() => import("./views/Contact"));
const Auth                = lazy(() => import("./views/Auth"));
const ListesScolaires     = lazy(() => import("./views/ListesScolaires"));

// ── Pages auth (lazy) ─────────────────────────────────────────────────────────
const ForgotPassword             = lazy(() => import("./views/ForgotPassword"));
const ResetPassword              = lazy(() => import("./views/ResetPassword"));
const VerifyEmail                = lazy(() => import("./views/VerifyEmail"));

// ── Pages utilisateur connecté (lazy — pas critiques pour le LCP) ────────────
const MonCompte  = lazy(() => import("./views/MonCompte"));
const MesFavoris = lazy(() => import("./views/MesFavoris"));
const Checkout   = lazy(() => import("./views/Checkout"));
const OrderConfirmation = lazy(() => import("./views/OrderConfirmation"));

// ── Pages légales / blog (lazy — contenu statique, non critique) ──────────────
const MentionsLegales          = lazy(() => import("./views/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./views/PolitiqueConfidentialite"));
const CGV                      = lazy(() => import("./views/CGV"));
const Cookies                  = lazy(() => import("./views/Cookies"));
const FAQ                      = lazy(() => import("./views/FAQ"));
const APropos                  = lazy(() => import("./views/APropos"));
const Livraison                = lazy(() => import("./views/Livraison"));
const Blog                     = lazy(() => import("./views/BlogPage").then(m => ({ default: m.BlogPage })));
const BlogArticle              = lazy(() => import("./views/BlogArticlePage").then(m => ({ default: m.BlogArticlePage })));

// ── Pages consommables (lazy) ────────────────────────────────────────────────
const Consommables             = lazy(() => import("./views/Consommables"));
const AdminConsumables         = lazy(() => import("./views/AdminConsumables"));

// ── Pages SEO & B2B (lazy) ────────────────────────────────────────────────────
const ReponseOfficielleIA      = lazy(() => import("./views/ReponseOfficielleIA"));
const ImpressionUrgente        = lazy(() => import("./views/ImpressionUrgente"));
const PhotocopieExpress        = lazy(() => import("./views/PhotocopieExpress"));
const PhotosExpress            = lazy(() => import("./views/PhotosExpress"));
const PlaqueImmatriculation    = lazy(() => import("./views/PlaqueImmatriculation"));
const TamponProfessionnel      = lazy(() => import("./views/TamponProfessionnel"));
const TamponDesigner           = lazy(() => import("./views/TamponDesigner"));
const PapierPeintPersonnalise  = lazy(() => import("./views/PapierPeintPersonnalise"));
const ImpressionFineArt        = lazy(() => import("./views/ImpressionFineArt"));
const ImpressionPlansTechniques = lazy(() => import("./views/ImpressionPlansTechniques"));
const ImpressionPatronCouture  = lazy(() => import("./views/ImpressionPatronCouture"));
const SolutionsInstitutions    = lazy(() => import("./views/SolutionsInstitutions"));
const SolutionsEmballage       = lazy(() => import("./views/SolutionsEmballage"));
const MaroquinerieBagagerie    = lazy(() => import("./views/MaroquinerieBagagerie"));
const ChaisesHomeOffice        = lazy(() => import("./views/ChaisesHomeOffice"));
const InscriptionPro           = lazy(() => import("./views/InscriptionPro"));
const PackProLocal             = lazy(() => import("./views/PackProLocal"));
const LeasingMobilier          = lazy(() => import("./views/LeasingMobilier"));

// ── Pages services (tunnel de commande) ──────────────────────────────────────
const ServiceReprographie      = lazy(() => import("./views/ServiceReprographie"));
const ServiceDeveloppementPhoto = lazy(() => import("./views/ServiceDeveloppementPhoto"));

// ── Pages admin (lazy — chargées uniquement si l'utilisateur va sur /admin) ───
const AdminDashboard           = lazy(() => import("./views/AdminDashboard"));
const AdminProducts            = lazy(() => import("./views/AdminProducts"));
const AdminOrders              = lazy(() => import("./views/AdminOrders"));
const AdminUsers               = lazy(() => import("./views/AdminUsers"));
const AdminSchoolLists         = lazy(() => import("./views/AdminSchoolLists"));
const AdminSuppliers           = lazy(() => import("./views/AdminSuppliers"));
const AdminCRM                 = lazy(() => import("./views/AdminCRM"));
const AdminPurchases           = lazy(() => import("./views/AdminPurchases"));
const AdminCompetitors         = lazy(() => import("./views/AdminCompetitors"));
const AdminPricing             = lazy(() => import("./views/AdminPricing"));
const AdminPriceEvolution      = lazy(() => import("./views/AdminPriceEvolution"));
const AdminSalesPredictions    = lazy(() => import("./views/AdminSalesPredictions"));
const AdminAlerts              = lazy(() => import("./views/AdminAlerts"));
const AdminGDPR                = lazy(() => import("./views/AdminGDPR"));
const AdminAmazonExport        = lazy(() => import("./views/AdminAmazonExport"));
const AdminShipping            = lazy(() => import("./views/AdminShipping"));
const AdminMarketplaces        = lazy(() => import("./views/AdminMarketplaces"));
const AdminShopify             = lazy(() => import("./views/admin/ShopifyConnect"));
const AdminPriceComparison     = lazy(() => import("./views/AdminPriceComparison"));
const AdminImageCollector      = lazy(() => import("./views/AdminImageCollector"));
const AdminExceptions          = lazy(() => import("./views/AdminExceptions"));
const AdminProductImages       = lazy(() => import("./views/AdminProductImages"));
const AdminAutomations         = lazy(() => import("./views/AdminAutomations"));
const AdminStockVirtuel        = lazy(() => import("./views/AdminStockVirtuel"));
const AdminB2B                 = lazy(() => import("./views/AdminB2B"));
const AdminSoftCarrier         = lazy(() => import("./views/AdminSoftCarrier"));
const AdminAlkor               = lazy(() => import("./views/AdminAlkor"));
const AdminComlandi            = lazy(() => import("./views/AdminComlandi"));
const AdminAlso                = lazy(() => import("./views/AdminAlso"));
const AdminCategories          = lazy(() => import("./views/AdminCategories"));
const AdminProductOffers       = lazy(() => import("./views/AdminProductOffers"));
const AdminSupplierOffers      = lazy(() => import("./views/AdminSupplierOffers"));
const AdminPricingDynamic      = lazy(() => import("./views/AdminPricingDynamic"));
const AdminRecommendations     = lazy(() => import("./views/AdminRecommendations"));
const AdminImportFournisseurs  = lazy(() => import("./views/AdminImportFournisseurs"));
const AdminAnalytics           = lazy(() => import("./views/AdminAnalytics"));
const AdminPages               = lazy(() => import("./views/AdminPages"));
const AdminSecuritySeoGeo      = lazy(() => import("./views/AdminSecuritySeoGeo"));
const AdminIcecatEnrich        = lazy(() => import("./views/AdminIcecatEnrich"));
const AdminPageBuilder         = lazy(() => import("./views/AdminPageBuilder"));
const AdminMenus               = lazy(() => import("./views/AdminMenus"));
const AdminSocialMedia         = lazy(() => import("./views/AdminSocialMedia"));
const AdminSocialProfiles      = lazy(() => import("./views/AdminSocialProfiles"));
const AdminHeaderBuilder       = lazy(() => import("./views/AdminHeaderBuilder"));
const AdminFooterBuilder       = lazy(() => import("./views/AdminFooterBuilder"));
const AdminThemeBuilder        = lazy(() => import("./views/AdminThemeBuilder"));
const AdminBlogArticles        = lazy(() => import("./components/admin/AdminBlogArticles").then(m => ({ default: m.AdminBlogArticles })));
const AdminStampModels         = lazy(() => import("./views/AdminStampModels"));
const AdminPhotocopies         = lazy(() => import("./views/AdminPhotocopies"));
const AdminImpressions         = lazy(() => import("./views/AdminImpressions"));
const AdminPhotos              = lazy(() => import("./views/AdminPhotos"));
const AdminPrintOrders         = lazy(() => import("./views/AdminPrintOrders"));
const AdminPhotoOrders         = lazy(() => import("./views/AdminPhotoOrders"));
const AdminStock               = lazy(() => import("./views/AdminStock"));

// ── Pages Pro / Espace client B2B (lazy) ─────────────────────────────────────
const ProDashboard             = lazy(() => import("./views/ProDashboard"));
const ProOrders                = lazy(() => import("./views/ProOrders"));
const ProReassort              = lazy(() => import("./views/ProReassort"));
const ProFactures              = lazy(() => import("./views/ProFactures"));
const ProEquipe                = lazy(() => import("./views/ProEquipe"));

// ── Pages CMS dynamiques (lazy) ───────────────────────────────────────────────
const DynamicPage              = lazy(() => import("./views/DynamicPage"));
const DynamicServicesPage      = lazy(() => import("./views/DynamicServicesPage"));

const ServiceOrderConfirmationPage = lazy(() => import("./views/ServiceOrderConfirmationPage"));
const NotFound = lazy(() => import("./views/NotFound"));

import { CookieBanner } from "./components/gdpr/CookieBanner";
import { ExitIntentPopup } from "./components/newsletter";
import { DynamicCanonical } from "./components/seo/DynamicCanonical";
import { AnalyticsProvider } from "./contexts/AnalyticsProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdminErrorBoundary } from "./components/admin/AdminErrorBoundary";
import { MobileBottomNav } from "./components/layout/MobileBottomNav";
import { CompareFloatingBar } from "./components/product/ProductCompare";

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
    <div className="flex items-center justify-center min-h-screen animate-fade-in">
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
          <AuthInit />
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
                  <Route path="/consommables/:brandSlug" element={<Consommables />} />
                  <Route path="/consommables/:brandSlug/:modelSlug" element={<Consommables />} />
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
                  <Route path="/papier-peint-personnalise" element={<PapierPeintPersonnalise />} />
                  <Route path="/impression-fine-art" element={<ImpressionFineArt />} />
                  <Route path="/impression-plans-techniques" element={<ImpressionPlansTechniques />} />
                  <Route path="/impression-patron-couture" element={<ImpressionPatronCouture />} />
                  <Route path="/solutions-institutions-chaumont" element={<SolutionsInstitutions />} />
                  <Route path="/solutions-emballage" element={<SolutionsEmballage />} />
                  <Route path="/maroquinerie-bagagerie-accessoires" element={<MaroquinerieBagagerie />} />
                  <Route path="/chaises-home-office" element={<ChaisesHomeOffice />} />
                  <Route path="/inscription-pro" element={<InscriptionPro />} />
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
                  <Route path="/admin/also" element={<AdminRoute><AdminAlso /></AdminRoute>} />
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
                  <Route path="/admin/site-builder/header" element={<AdminRoute><AdminHeaderBuilder /></AdminRoute>} />
                  <Route path="/admin/site-builder/footer" element={<AdminRoute><AdminFooterBuilder /></AdminRoute>} />
                  <Route path="/admin/site-builder/theme" element={<AdminRoute><AdminThemeBuilder /></AdminRoute>} />
                  <Route path="/admin/menus" element={<AdminRoute><AdminMenus /></AdminRoute>} />
                  <Route path="/admin/blog" element={<AdminRoute><AdminBlogArticles /></AdminRoute>} />
                  <Route path="/admin/social-media" element={<AdminRoute><AdminSocialMedia /></AdminRoute>} />
                  <Route path="/admin/social-profiles" element={<AdminRoute><AdminSocialProfiles /></AdminRoute>} />
                  <Route path="/admin/stamp-models" element={<AdminRoute><AdminStampModels /></AdminRoute>} />
                  <Route path="/admin/photocopies" element={<AdminRoute><AdminPhotocopies /></AdminRoute>} />
                  <Route path="/admin/impressions" element={<AdminRoute><AdminImpressions /></AdminRoute>} />
                  <Route path="/admin/photos" element={<AdminRoute><AdminPhotos /></AdminRoute>} />
                  <Route path="/admin/print-orders" element={<AdminRoute><AdminPrintOrders /></AdminRoute>} />
                  <Route path="/admin/photo-orders" element={<AdminRoute><AdminPhotoOrders /></AdminRoute>} />
                  <Route path="/admin/consumables" element={<AdminRoute><AdminConsumables /></AdminRoute>} />
                  <Route path="/admin/stock" element={<AdminRoute><AdminStock /></AdminRoute>} />

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
              <MobileBottomNav />
              <CompareFloatingBar />
              <CookieBanner />
              <ExitIntentPopup />
            </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
