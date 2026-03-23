/**
 * Schema.org JSON-LD generators for SEO
 * These schemas improve search visibility and rich snippets
 */

export interface ProductReview {
  id: string;
  author: string;
  rating: number; // 1-5
  reviewBody: string;
  datePublished: string;
  image?: string;
  company?: string;
}

/**
 * Generate AggregateRating schema for products
 * Enables star ratings in Google Search results (+15% CTR potential)
 */
export function generateAggregateRatingSchema(reviewCount: number, ratingValue: number = 4.7) {
  return {
    "@type": "AggregateRating",
    "ratingValue": ratingValue.toString(),
    "reviewCount": reviewCount.toString(),
    "bestRating": "5",
    "worstRating": "1",
  };
}

/**
 * Generate Review schema for individual product reviews
 * Shows customer testimonials in rich results
 */
export function generateReviewSchema(review: ProductReview) {
  return {
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": review.author,
      "image": review.image || undefined,
    },
    "datePublished": review.datePublished,
    "description": review.reviewBody,
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating.toString(),
      "bestRating": "5",
      "worstRating": "1",
    },
  };
}

/**
 * Generate Product schema with reviews and ratings
 */
export function generateProductSchemaWithReviews(
  product: {
    id: string;
    name: string;
    description?: string;
    image: string;
    url: string;
    price: number;
    priceCurrency: string;
    sku?: string;
    brand?: string;
    inStock: boolean;
  },
  reviews: ProductReview[] = [],
  aggregateRating?: { ratingValue: number; reviewCount: number }
) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": product.url,
    "name": product.name,
    "description": product.description || product.name,
    "image": product.image,
    "url": product.url,
    "sku": product.sku || product.id,
    "offers": {
      "@type": "Offer",
      "url": product.url,
      "priceCurrency": product.priceCurrency,
      "price": product.price.toString(),
      "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  if (product.brand) {
    schema.brand = {
      "@type": "Brand",
      "name": product.brand,
    };
  }

  // Add AggregateRating if provided
  if (aggregateRating && aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": aggregateRating.ratingValue.toString(),
      "reviewCount": aggregateRating.reviewCount.toString(),
      "bestRating": "5",
      "worstRating": "1",
    };
  }

  // Add individual reviews
  if (reviews.length > 0) {
    schema.review = reviews.map(generateReviewSchema);
  }

  return schema;
}

/**
 * Generate BreadcrumbList schema for content navigation
 * Improves CTR in breadcrumb rich snippets
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

/**
 * Generate HowTo schema for service/guide pages
 * Enables expandable "How to" rich snippets
 */
export function generateHowToSchema(
  title: string,
  description: string,
  steps: Array<{ name: string; text: string; image?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": title,
    "description": description,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "image": step.image || undefined,
    })),
  };
}

/**
 * Generate FAQPage schema for FAQ content
 * Enables accordion-style snippets in search results
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/**
 * Generate Organization schema with local business info
 * Used on homepage and contact pages
 */
export function generateOrganizationSchema(org: {
  name: string;
  url: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  foundingDate?: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": org.name,
    "url": org.url,
    "logo": org.logo,
    "description": org.description || org.name,
    "address": org.address,
    "telephone": org.phone,
    "email": org.email,
    "foundingDate": org.foundingDate || undefined,
    "sameAs": [
      "https://www.facebook.com/mapapeteriechaumont",
      "https://www.instagram.com/mapapeteriechaumont",
    ],
  };
}
