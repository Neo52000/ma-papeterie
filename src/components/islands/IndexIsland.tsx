import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Header from "@/components/layout/Header";
import Index from "@/views/Index";
import Footer from "@/components/layout/Footer";

export default function IndexIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Index">
        <Suspense fallback={null}>
          <Header />
          <main id="main-content">
            <Index />
          </main>
          <Footer />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
