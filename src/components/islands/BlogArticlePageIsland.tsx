import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Header from "@/components/layout/Header";
import { BlogArticlePage } from "@/views/BlogArticlePage";
import Footer from "@/components/layout/Footer";

export default function BlogArticlePageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="BlogArticlePage">
        <Suspense fallback={null}>
          <Header />
          <BlogArticlePage />
          <Footer />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
