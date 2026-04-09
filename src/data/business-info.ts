/**
 * Source unique de vérité pour les informations de l'entreprise.
 * Utilisé par les schemas JSON-LD, les pages légales, le footer, et les composants SEO.
 */
export const BUSINESS = {
  name: "Papeterie Reine & Fils",
  tradeName: "Ma Papeterie",
  alternateName: "Ma Papeterie Chaumont",
  phone: "+33310960224",
  phoneDisplay: "03 10 96 02 24",
  email: "contact@ma-papeterie.fr",
  address: {
    street: "10 rue Toupot de Beveaux",
    city: "Chaumont",
    region: "Haute-Marne",
    postalCode: "52000",
    country: "FR",
    full: "10 rue Toupot de Beveaux, 52000 Chaumont",
  },
  geo: { lat: 48.1115, lng: 5.1372 },
  hours: {
    weekdays: { open: "09:00", close: "19:00" },
    saturday: { open: "09:00", close: "18:00" },
    display: "Lun-Ven 9h-19h, Sam 9h-18h",
  },
  url: "https://ma-papeterie.fr",
  priceRange: "€€",
  mapUrl: "https://maps.google.com/?cid=Ma+Papeterie+Chaumont",
  foundingYear: "1970",
  logo: "https://ma-papeterie.fr/logo.png",
  image: "https://ma-papeterie.fr/og-default.png",
  sameAs: [
    "https://www.facebook.com/mapapeteriechaumont",
    "https://www.instagram.com/mapapeteriechaumont",
  ],
} as const;


/** Site-level SEO metadata (used by BaseHead.astro) */
export const SITE = {
  name: BUSINESS.tradeName,
  description: "Ma Papeterie — Votre papeterie en ligne et en boutique à Chaumont. Fournitures de bureau, scolaires, loisirs créatifs. Livraison rapide.",
  url: BUSINESS.url,
  ogImage: `${BUSINESS.url}/og-default.png`,
} as const;

/** Schema.org PostalAddress object */
export const SCHEMA_ADDRESS = {
  "@type": "PostalAddress" as const,
  streetAddress: BUSINESS.address.street,
  addressLocality: BUSINESS.address.city,
  addressRegion: BUSINESS.address.region,
  postalCode: BUSINESS.address.postalCode,
  addressCountry: BUSINESS.address.country,
};

/** Schema.org OpeningHoursSpecification array */
export const SCHEMA_HOURS = [
  {
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: BUSINESS.hours.weekdays.open,
    closes: BUSINESS.hours.weekdays.close,
  },
  {
    "@type": "OpeningHoursSpecification" as const,
    dayOfWeek: "Saturday",
    opens: BUSINESS.hours.saturday.open,
    closes: BUSINESS.hours.saturday.close,
  },
];
