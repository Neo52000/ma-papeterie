import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Header from "@/components/layout/Header";
import BlogPage from "@/views/BlogPage";
import Footer from "@/components/layout/Footer";

export default function BlogPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="BlogPage">
        <Suspense fallback={null}>
          <Header />
          <BlogPage />
          <Footer />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
