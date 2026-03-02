import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicPage, type ContentBlock } from "@/hooks/useStaticPages";
import { RenderBlock } from "@/pages/DynamicPage";
import { lazy, Suspense } from "react";

// Fallback to hardcoded Services page if no CMS page found
const ServicesHardcoded = lazy(() => import("@/pages/Services"));

const SITE_URL = "https://ma-papeterie.fr";

export default function DynamicServicesPage() {
  const { data: page, isLoading } = usePublicPage("services");

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-[60vh] py-12 px-4">
          <div className="max-w-5xl mx-auto space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // No CMS page found → fallback to hardcoded Services
  if (!page) {
    return (
      <Suspense fallback={null}>
        <ServicesHardcoded />
      </Suspense>
    );
  }

  const isFullWidth = page.layout === "full-width";

  return (
    <>
      <Helmet>
        <title>{page.meta_title || page.title} — Papeterie Reine &amp; Fils</title>
        {page.meta_description && <meta name="description" content={page.meta_description} />}
        <link rel="canonical" href={`${SITE_URL}/services`} />
        {page.json_ld && (
          <script type="application/ld+json">{JSON.stringify(page.json_ld)}</script>
        )}
      </Helmet>

      <Header />

      <main className="min-h-[60vh]">
        {page.h1 && !isFullWidth && (
          <div className="max-w-3xl mx-auto px-4 pt-10 pb-4">
            <h1 className="text-3xl md:text-4xl font-bold">{page.h1}</h1>
          </div>
        )}

        <div className={isFullWidth ? "" : "max-w-3xl mx-auto px-4 pb-12"}>
          {page.content.map((block) => (
            <RenderBlock key={block.id} block={block} fullWidth={isFullWidth} />
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
