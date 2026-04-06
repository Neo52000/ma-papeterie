import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useSocialProfilesConfig } from "@/hooks/useSiteGlobals";

const SITE_URL  = "https://ma-papeterie.fr";
const SITE_NAME = "Ma Papeterie — Expert conseil en fournitures";
const DEFAULT_DESC = "Ma Papeterie à Chaumont (52000) : fournitures scolaires et de bureau sélectionnées par des experts. Conseil personnalisé, livraison rapide. Ouvert lundi–samedi.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

// ── Static parts of LocalBusiness schema ────────────────────────────────────

const LOCAL_BUSINESS_BASE = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Store"],
  "@id": `${SITE_URL}/#business`,
  "name": "Papeterie Reine & Fils",
  "alternateName": "Ma Papeterie Chaumont",
  "description": DEFAULT_DESC,
  "url": SITE_URL,
  "telephone": "+33310960224",
  "email": "contact@ma-papeterie.fr",
  "priceRange": "€€",
  "currenciesAccepted": "EUR",
  "paymentAccepted": "Cash, Credit Card, Check",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "10 rue Toupot de Beveaux",
    "addressLocality": "Chaumont",
    "addressRegion": "Haute-Marne",
    "postalCode": "52000",
    "addressCountry": "FR",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 48.1115,
    "longitude": 5.1372,
  },
  "openingHoursSpecification": [
    { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "19:00" },
    { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "09:00", "closes": "18:00" },
  ],
  "hasMap": "https://maps.google.com/?q=Papeterie+Reine+Fils+Chaumont",
  "areaServed": {
    "@type": "City",
    "name": "Chaumont",
    "containedInPlace": { "@type": "AdministrativeArea", "name": "Haute-Marne" },
  },
};

// Fallback sameAs when no social profiles configured in admin
const DEFAULT_SAME_AS = ["https://www.google.com/maps?q=Papeterie+Reine+Fils+Chaumont"];

// ── WebSite Schema (sitelinks search box potentiel) ──────────────────────────

const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  "name": SITE_NAME,
  "url": SITE_URL,
  "inLanguage": "fr-FR",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${SITE_URL}/catalogue?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

interface DynamicCanonicalProps {
  title?: string;
  description?: string;
}

export function DynamicCanonical({ title, description }: DynamicCanonicalProps) {
  const { pathname } = useLocation();
  const canonical = `${SITE_URL}${pathname === "/" ? "" : pathname.replace(/\/$/, "")}`;

  // Fetch social profiles from admin config (staleTime = 5 min via hook)
  const { data: socialConfig } = useSocialProfilesConfig();

  // Build LocalBusiness schema with dynamic sameAs
  const localBusinessLD = useMemo(() => {
    const sameAs = socialConfig?.profiles?.length
      ? socialConfig.profiles.map((p) => p.url)
      : DEFAULT_SAME_AS;

    return { ...LOCAL_BUSINESS_BASE, sameAs };
  }, [socialConfig]);

  // Ne pas indexer les pages privées/admin
  const isPrivate = ["/admin", "/auth", "/mon-compte", "/mes-favoris", "/checkout"]
    .some((p) => pathname.startsWith(p));

  return (
    <Helmet defaultTitle={SITE_NAME} titleTemplate={`%s | ${SITE_NAME}`}>
      <html lang="fr" />
      <link rel="canonical" href={canonical} />

      {/* Robots */}
      {isPrivate && <meta name="robots" content="noindex, nofollow" />}

      {/* Description par défaut */}
      {!description && <meta name="description" content={DEFAULT_DESC} />}
      {description  && <meta name="description" content={description} />}
      {title        && <title>{title}</title>}

      {/* Open Graph — défauts globaux (overridables par Helmet per-page) */}
      <meta property="og:site_name"    content={SITE_NAME} />
      <meta property="og:type"         content="website" />
      <meta property="og:url"          content={canonical} />
      <meta property="og:locale"       content="fr_FR" />
      <meta property="og:image"        content={DEFAULT_OG_IMAGE} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"    content={SITE_NAME} />
      {title       && <meta property="og:title"       content={title} />}
      {description && <meta property="og:description" content={description} />}

      {/* Twitter Card */}
      <meta name="twitter:card"  content="summary_large_image" />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
      {title       && <meta name="twitter:title"       content={title} />}
      {description && <meta name="twitter:description" content={description} />}

      {/* Schema.org LocalBusiness (toutes pages) — sameAs dynamique */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessLD)}
      </script>
      {/* Schema.org WebSite + SearchAction */}
      <script type="application/ld+json">
        {JSON.stringify(WEBSITE_LD)}
      </script>
    </Helmet>
  );
}
