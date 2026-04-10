import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import ProductDetailPage from "@/views/ProductDetailPage";

export default function ProductDetailPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="ProductDetailPage">
        <Suspense fallback={null}>
          <ProductDetailPage />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
