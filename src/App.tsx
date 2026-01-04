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
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
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

// Admin pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
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

import NotFound from "./pages/NotFound";
import { CookieBanner } from "./components/gdpr/CookieBanner";

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
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:handle" element={<ProductPage />} />
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
                <Route path="/livraison" element={<Livraison />} />
                
                {/* Legal pages */}
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/cgv" element={<CGV />} />
                <Route path="/cookies" element={<Cookies />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
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
