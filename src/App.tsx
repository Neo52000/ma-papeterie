import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Public pages
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

// Legal pages
import MentionsLegales from "./pages/MentionsLegales";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import CGV from "./pages/CGV";
import Cookies from "./pages/Cookies";
import FAQ from "./pages/FAQ";
import APropos from "./pages/APropos";
import Livraison from "./pages/Livraison";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";

// SEO & B2B pages
import ReponseOfficielleIA from "./pages/ReponseOfficielleIA";
import ImpressionUrgente from "./pages/ImpressionUrgente";
import PhotocopieExpress from "./pages/PhotocopieExpress";
import PlaqueImmatriculation from "./pages/PlaqueImmatriculation";
import TamponProfessionnel from "./pages/TamponProfessionnel";
import SolutionsInstitutions from "./pages/SolutionsInstitutions";
import PackProLocal from "./pages/PackProLocal";

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminUsers from "./pages/AdminUsers";
import AdminSchoolLists from "./pages/AdminSchoolLists";
import AdminSuppliers from "./pages/AdminSuppliers";
import AdminCRM from "./pages/AdminCRM";
import AdminPurchases from "./pages/AdminPurchases";
import AdminCompetitors from "./pages/AdminCompetitors";
import AdminPricing from "./pages/AdminPricing";
import AdminPriceEvolution from "./pages/AdminPriceEvolution";
import AdminSalesPredictions from "./pages/AdminSalesPredictions";
import AdminAlerts from "./pages/AdminAlerts";
import AdminGDPR from "./pages/AdminGDPR";
import AdminAmazonExport from "./pages/AdminAmazonExport";
import AdminShipping from "./pages/AdminShipping";
import AdminMarketplaces from "./pages/AdminMarketplaces";
import AdminPriceComparison from "./pages/AdminPriceComparison";
import AdminImageCollector from "./pages/AdminImageCollector";
import AdminExceptions from "./pages/AdminExceptions";
import AdminProductImages from "./pages/AdminProductImages";
import AdminAutomations from "./pages/AdminAutomations";
import AdminStockVirtuel from "./pages/AdminStockVirtuel";
import AdminB2B from "./pages/AdminB2B";
import AdminSoftCarrier from "./pages/AdminSoftCarrier";
import AdminAlkor from "./pages/AdminAlkor";
import AdminComlandi from "./pages/AdminComlandi";
import AdminCategories from "./pages/AdminCategories";
import AdminProductOffers from "./pages/AdminProductOffers";

import NotFound from "./pages/NotFound";
import { CookieBanner } from "./components/gdpr/CookieBanner";
import { DynamicCanonical } from "./components/seo/DynamicCanonical";

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
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieBanner />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
