import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Header from "@/components/layout/Header";
import Auth from "@/views/Auth";
import Footer from "@/components/layout/Footer";

export default function AuthIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Auth">
        <Header />
        <Suspense fallback={<div className="min-h-screen" />}>
          <Auth />
        </Suspense>
        <Footer />
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
