import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieBanner } from "./components/gdpr/CookieBanner";
import { DynamicCanonical } from "./components/seo/DynamicCanonical";

// Public pages
const Index = lazy(() => import("./pages/Index"));
const Services = lazy(() => import("./pages/Services"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const Catalogue = lazy(() => import("./pages/Catalogue"));
const Promotions = lazy(() => import("./pages/Promotions"));
const Contact = lazy(() => import("./pages/Contact"));
const MonCompte = lazy(() => import("./pages/MonCompte"));
const MesFavoris = lazy(() => import("./pages/MesFavoris"));
const Auth = lazy(() => import("./pages/Auth"));
const Checkout = lazy(() => import("./pages/Checkout"));
const ListesScolaires = lazy(() => import("./pages/ListesScolaires"));

// Informational pages
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazy(() => import("./pages/PolitiqueConfidentialite"));
const CGV = lazy(() => import("./pages/CGV"));
const Cookies = lazy(() => import("./pages/Cookies"));
const FAQ = lazy(() => import("./pages/FAQ"));
const APropos = lazy(() => import("./pages/APropos"));
const Livraison = lazy(() => import("./pages/Livraison"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));

// SEO & B2B pages
const ReponseOfficielleIA = lazy(() => import("./pages/ReponseOfficielleIA"));
const ImpressionUrgente = lazy(() => import("./pages/ImpressionUrgente"));
const PhotocopieExpress = lazy(() => import("./pages/PhotocopieExpress"));
const PlaqueImmatriculation = lazy(() => import("./pages/PlaqueImmatriculation"));
const TamponProfessionnel = lazy(() => import("./pages/TamponProfessionnel"));
const SolutionsInstitutions = lazy(() => import("./pages/SolutionsInstitutions"));
const PackProLocal = lazy(() => import("./pages/PackProLocal"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSchoolLists = lazy(() => import("./pages/AdminSchoolLists"));
const AdminSuppliers = lazy(() => import("./pages/AdminSuppliers"));
const AdminCRM = lazy(() => import("./pages/AdminCRM"));
const AdminPurchases = lazy(() => import("./pages/AdminPurchases"));
const AdminCompetitors = lazy(() => import("./pages/AdminCompetitors"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const AdminPriceEvolution = lazy(() => import("./pages/AdminPriceEvolution"));
const AdminSalesPredictions = lazy(() => import("./pages/AdminSalesPredictions"));
const AdminAlerts = lazy(() => import("./pages/AdminAlerts"));
const AdminGDPR = lazy(() => import("./pages/AdminGDPR"));
const AdminAmazonExport = lazy(() => import("./pages/AdminAmazonExport"));
const AdminShipping = lazy(() => import("./pages/AdminShipping"));
const AdminMarketplaces = lazy(() => import("./pages/AdminMarketplaces"));
const AdminPriceComparison = lazy(() => import("./pages/AdminPriceComparison"));
const AdminImageCollector = lazy(() => import("./pages/AdminImageCollector"));
const AdminExceptions = lazy(() => import("./pages/AdminExceptions"));
const AdminProductImages = lazy(() => import("./pages/AdminProductImages"));
const AdminAutomations = lazy(() => import("./pages/AdminAutomations"));
const AdminStockVirtuel = lazy(() => import("./pages/AdminStockVirtuel"));
const AdminB2B = lazy(() => import("./pages/AdminB2B"));
const AdminSoftCarrier = lazy(() => import("./pages/AdminSoftCarrier"));
const AdminAlkor = lazy(() => import("./pages/AdminAlkor"));
const AdminComlandi = lazy(() => import("./pages/AdminComlandi"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminProductOffers = lazy(() => import("./pages/AdminProductOffers"));
const AdminSupplierOffers = lazy(() => import("./pages/AdminSupplierOffers"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

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
              <Suspense fallback={null}>
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
