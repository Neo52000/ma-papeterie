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
        <Header />
        <Suspense fallback={<div className="min-h-screen" />}>
          <BlogArticlePage />
        </Suspense>
        <Footer />
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
