import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://ma-papeterie.fr";

interface DynamicCanonicalProps {
  title?: string;
  description?: string;
}

export function DynamicCanonical({ title, description }: DynamicCanonicalProps) {
  const { pathname } = useLocation();
  const canonical = `${SITE_URL}${pathname === "/" ? "" : pathname}`;

  return (
    <Helmet>
      <link rel="canonical" href={canonical} />
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <meta property="og:url" content={canonical} />
    </Helmet>
  );
}
