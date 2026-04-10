import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import BlogPage from "@/views/BlogPage";

export default function BlogPageIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="BlogPage">
        <Suspense fallback={null}>
          <BlogPage />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
