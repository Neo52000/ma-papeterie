import { Suspense } from "react";
import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import BlogArticlePage from "@/views/BlogArticlePage";

export default function BlogArticlePageIsland(props: Record<string, unknown>) {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="BlogArticlePage">
        <Suspense fallback={null}>
          <BlogArticlePage {...(props as any)} />
        </Suspense>
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
