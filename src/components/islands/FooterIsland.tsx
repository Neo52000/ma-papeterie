import IslandProviders from "./IslandProviders";
import IslandErrorBoundary from "./IslandErrorBoundary";
import Footer from "@/components/layout/Footer";

export default function FooterIsland() {
  return (
    <IslandProviders>
      <IslandErrorBoundary name="Footer">
        <Footer />
      </IslandErrorBoundary>
    </IslandProviders>
  );
}
