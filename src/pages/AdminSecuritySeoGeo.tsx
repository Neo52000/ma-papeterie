import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Globe,
  MapPin,
  Search,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FileWarning,
  Image,
  Link2,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// -- Types --------------------------------------------------------------------

interface AuditCheck {
  label: string;
  passed: boolean;
  severity?: "critical" | "high" | "medium" | "low";
  detail?: string;
}

interface SeoEntry {
  id: string;
  product_id: string;
  meta_title: string | null;
  meta_description: string | null;
  seo_score: number | null;
  created_at: string;
  products?: { name: string } | null;
}

// -- Audit data: Security -----------------------------------------------------

const SECURITY_HEADERS: AuditCheck[] = [
  { label: "Strict-Transport-Security (HSTS)", passed: true },
  { label: "X-Frame-Options", passed: true },
  { label: "X-Content-Type-Options", passed: true },
  { label: "X-XSS-Protection", passed: true },
  { label: "Referrer-Policy", passed: true },
  { label: "Permissions-Policy", passed: true },
  { label: "CSP sans unsafe-inline/unsafe-eval", passed: false, severity: "medium", detail: "script-src contient 'unsafe-inline' et 'unsafe-eval' ce qui affaiblit la protection CSP" },
];

const AUTH_CHECKS: AuditCheck[] = [
  { label: "Auth Supabase (RLS)", passed: true },
  { label: "Protection routes admin (frontend)", passed: true },
  { label: "Politique mots de passe 12+ chars", passed: true },
  { label: "requireAdmin sur fonctions admin (6/6)", passed: true },
  { label: "verify_jwt sur fonctions admin (15/15)", passed: true },
  { label: "Token Shopify Storefront (public read-only)", passed: true },
];

const XSS_CHECKS: AuditCheck[] = [
  { label: "dangerouslySetInnerHTML sanitise", passed: true },
  { label: "sanitizeHtml() avec whitelist de tags", passed: true },
  { label: "Iframe Google Maps sandboxed", passed: true },
];

const EDGE_FUNCTIONS_CHECKS: AuditCheck[] = [
  { label: "CORS restreint (48/48 fonctions)", passed: true },
  { label: "Rate limiting admin (6 fonctions)", passed: true },
  { label: "Rate limiting global (Redis/DB)", passed: false, severity: "high", detail: "Rate limiting en memoire par instance Deno, pas global - contournable" },
  { label: "Erreurs sanitisees cote client", passed: false, severity: "medium", detail: "Certaines fonctions exposent error.message brut au client" },
  { label: "Validation uploads cote serveur", passed: false, severity: "medium", detail: "Validation MIME/taille uniquement cote client" },
];

const CORS_ORIGINS = [
  "https://ma-papeterie.fr",
  "https://www.ma-papeterie.fr",
  "https://ma-papeterie.fr",
];

const ALL_SECURITY_CHECKS = [
  ...SECURITY_HEADERS,
  ...AUTH_CHECKS,
  ...XSS_CHECKS,
  ...EDGE_FUNCTIONS_CHECKS,
];

const SECURITY_PASSED = ALL_SECURITY_CHECKS.filter((c) => c.passed).length;
const SECURITY_TOTAL = ALL_SECURITY_CHECKS.length;
const SECURITY_SCORE = Math.round((SECURITY_PASSED / SECURITY_TOTAL) * 100);

// -- Audit data: SEO ----------------------------------------------------------

const SEO_TECHNICAL_CHECKS: AuditCheck[] = [
  { label: "robots.txt configure", passed: true },
  { label: "sitemap.xml present", passed: true },
  { label: "Sitemap dynamique (produits 40k+)", passed: false, severity: "high", detail: "Sitemap statique, les pages produit ne sont pas indexees" },
  { label: "Viewport meta tag", passed: true },
  { label: "Redirections SPA 404 -> 200", passed: false, severity: "high", detail: "netlify.toml retourne 200 pour les 404, les moteurs voient toutes les pages comme valides" },
];

const SEO_META_CHECKS: AuditCheck[] = [
  { label: "Helmet / meta tags dynamiques", passed: true },
  { label: "Helmet sur Index (homepage)", passed: true },
  { label: "Helmet sur Catalogue, Shop, Promotions, Listes", passed: true },
  { label: "OG tags avec image par defaut", passed: false, severity: "high", detail: "og-default.jpg reference mais absent de public/" },
  { label: "Twitter Card tags", passed: true },
];

const SEO_SCHEMA_CHECKS: AuditCheck[] = [
  { label: "Schema LocalBusiness", passed: true },
  { label: "Schema WebSite + SearchAction", passed: true },
  { label: "Schema BreadcrumbList", passed: true },
  { label: "Schema Article (blog)", passed: true },
  { label: "Schema Product (fiche produit)", passed: false, severity: "critical", detail: "Aucun JSON-LD Product sur ProductDetailPage malgre les donnees disponibles" },
  { label: "Schema FAQPage", passed: false, severity: "high", detail: "Page FAQ existante mais sans markup schema.org" },
  { label: "Schema ContactPage", passed: false, severity: "high", detail: "Page Contact sans structured data specifique" },
];

const SEO_CONTENT_CHECKS: AuditCheck[] = [
  { label: "URLs SEO-friendly (geo pages)", passed: true },
  { label: "Hierarchie H1/H2/H3", passed: false, severity: "medium", detail: "Catalogue et Shop manquent de H1 propre" },
  { label: "Images alt text", passed: false, severity: "high", detail: "Certaines images admin ont alt=\"\" vide" },
  { label: "Images modernes (webp/avif/srcset)", passed: false, severity: "high", detail: "Aucun format moderne ni responsive images" },
  { label: "Lazy loading images", passed: true },
  { label: "Canonical URL coherent", passed: true },
];

const ALL_SEO_CHECKS = [
  ...SEO_TECHNICAL_CHECKS,
  ...SEO_META_CHECKS,
  ...SEO_SCHEMA_CHECKS,
  ...SEO_CONTENT_CHECKS,
];

const SEO_PASSED = ALL_SEO_CHECKS.filter((c) => c.passed).length;
const SEO_TOTAL = ALL_SEO_CHECKS.length;
const SEO_INFRA_SCORE = Math.round((SEO_PASSED / SEO_TOTAL) * 100);

// -- Audit data: GEO ----------------------------------------------------------

const GEO_CHECKS: AuditCheck[] = [
  { label: "Schema LocalBusiness complet (NAP)", passed: true },
  { label: "GeoCoordinates dans schema", passed: true },
  { label: "Google Maps embed + sandbox", passed: true },
  { label: "Pages geo-ciblees (4 pages)", passed: true },
  { label: "Adresse format francais correct", passed: true },
  { label: "Liens tel: cliquables", passed: true },
  { label: "Horaires dans schema", passed: true },
  { label: "Coherence horaires (Contact vs Schema)", passed: false, severity: "critical", detail: "Contact affiche 18h30, schema et admin indiquent 19h00" },
  { label: "Coherence telephone", passed: false, severity: "critical", detail: "Deux numeros differents: 07 45 062 162 (public) et +33 3 25 03 05 84 (admin)" },
  { label: "Coherence lieu (pas de mention Paris)", passed: false, severity: "critical", detail: "SeoContent.tsx mentionne 'Notre Magasin a Paris' alors que le magasin est a Chaumont" },
  { label: "Schema AggregateRating / avis", passed: false, severity: "high", detail: "Aucun schema d'avis clients, pas d'integration Google Reviews" },
  { label: "Lien Google Business Profile", passed: false, severity: "medium", detail: "Pas d'integration directe avec le profil Google Business" },
];

const GEO_PASSED = GEO_CHECKS.filter((c) => c.passed).length;
const GEO_TOTAL = GEO_CHECKS.length;
const GEO_SCORE = Math.round((GEO_PASSED / GEO_TOTAL) * 100);

const BUSINESS_INFO = {
  name: "Papeterie Reine & Fils",
  address: "10 rue Toupot de Beveaux",
  postalCode: "52000",
  city: "Chaumont",
  region: "Haute-Marne",
  lat: 48.1115,
  lng: 5.1372,
  phone: "+33 7 45 06 21 62",
  email: "contact@ma-papeterie.fr",
};

const OPENING_HOURS = [
  { days: "Lundi - Vendredi", hours: "9h00 - 19h00" },
  { days: "Samedi", hours: "9h00 - 18h00" },
  { days: "Dimanche", hours: "Ferme" },
];

const TARGET_AREAS = ["Chaumont", "Saint-Dizier", "Bar-le-Duc", "Langres", "Haute-Marne"];

const GEO_PAGES = [
  { path: "/impression-urgente-chaumont", label: "Impression urgente Chaumont" },
  { path: "/photocopie-express-chaumont", label: "Photocopie express Chaumont" },
  { path: "/plaque-immatriculation-chaumont", label: "Plaque immatriculation Chaumont" },
  { path: "/tampon-professionnel-chaumont", label: "Tampon professionnel Chaumont" },
  { path: "/solutions-institutions-chaumont", label: "Solutions institutions Chaumont" },
  { path: "/pack-pro-local-chaumont", label: "Pack pro local Chaumont" },
];

// -- Components ---------------------------------------------------------------

function CheckItem({ label, passed, severity, detail }: AuditCheck) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        <span className={passed ? "text-sm text-foreground" : "text-sm text-red-400 font-medium"}>
          {label}
        </span>
        {!passed && severity && (
          <Badge
            variant="outline"
            className={
              severity === "critical"
                ? "text-red-600 border-red-300 text-[10px] ml-auto"
                : severity === "high"
                ? "text-orange-600 border-orange-300 text-[10px] ml-auto"
                : "text-amber-600 border-amber-300 text-[10px] ml-auto"
            }
          >
            {severity.toUpperCase()}
          </Badge>
        )}
      </div>
      {!passed && detail && (
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">{detail}</p>
      )}
    </div>
  );
}

function ScoreCircle({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-amber-500" : "text-red-500";
  const strokeColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function SeveritySummary({ checks }: { checks: AuditCheck[] }) {
  const failed = checks.filter((c) => !c.passed);
  const critical = failed.filter((c) => c.severity === "critical").length;
  const high = failed.filter((c) => c.severity === "high").length;
  const medium = failed.filter((c) => c.severity === "medium").length;

  if (failed.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {critical > 0 && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-600">{critical} critique{critical > 1 ? "s" : ""}</span>
        </div>
      )}
      {high > 0 && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-xs font-medium text-orange-600">{high} haute{high > 1 ? "s" : ""}</span>
        </div>
      )}
      {medium > 0 && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-xs font-medium text-amber-600">{medium} moyenne{medium > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

// -- Security Tab -------------------------------------------------------------

function SecurityTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            {SECURITY_SCORE >= 80 ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : SECURITY_SCORE >= 60 ? (
              <Shield className="h-5 w-5 text-amber-500" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-500" />
            )}
            Score de Securite
          </CardTitle>
          <CardDescription>Audit du 25 fevrier 2026</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-8">
          <ScoreCircle score={SECURITY_SCORE} />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-500">{SECURITY_PASSED}</span> verifications reussies sur{" "}
              <span className="font-semibold">{SECURITY_TOTAL}</span>
            </p>
            <SeveritySummary checks={ALL_SECURITY_CHECKS} />
            <Badge
              variant={SECURITY_SCORE >= 80 ? "default" : "destructive"}
              className={SECURITY_SCORE >= 80 ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
            >
              {SECURITY_SCORE >= 80 ? "Bon" : SECURITY_SCORE >= 60 ? "Amelioration requise" : "Action critique requise"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Headers de Securite
            </CardTitle>
            <CardDescription>En-tetes HTTP de protection (netlify.toml)</CardDescription>
          </CardHeader>
          <CardContent>
            {SECURITY_HEADERS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Authentification
            </CardTitle>
            <CardDescription>Controles d'acces et d'identite</CardDescription>
          </CardHeader>
          <CardContent>
            {AUTH_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-green-500" />
              Politique CORS
            </CardTitle>
            <CardDescription>48/48 Edge Functions migrees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm font-medium">CORS restreint actif sur toutes les fonctions</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Origines autorisees</p>
              {CORS_ORIGINS.map((origin) => (
                <div key={origin} className="flex items-center gap-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <code className="text-xs text-muted-foreground">{origin}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-green-500" />
              Protection XSS
            </CardTitle>
            <CardDescription>Prevention des injections de scripts</CardDescription>
          </CardHeader>
          <CardContent>
            {XSS_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Edge Functions (Supabase)
            </CardTitle>
            <CardDescription>Securite des 48 fonctions serverless</CardDescription>
          </CardHeader>
          <CardContent>
            {EDGE_FUNCTIONS_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -- SEO Tab ------------------------------------------------------------------

function SeoTab() {
  const { data: seoData, isLoading, refetch } = useQuery({
    queryKey: ["admin-seo-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_seo")
        .select("id, product_id, meta_title, meta_description, seo_score, created_at, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SeoEntry[];
    },
  });

  const totalEntries = seoData?.length ?? 0;
  const withTitle = seoData?.filter((e) => e.meta_title).length ?? 0;
  const withDescription = seoData?.filter((e) => e.meta_description).length ?? 0;
  const avgScore =
    totalEntries > 0
      ? Math.round((seoData ?? []).reduce((sum, e) => sum + (e.seo_score ?? 0), 0) / totalEntries)
      : 0;
  const recentEntries = (seoData ?? []).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Infrastructure SEO score */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Audit SEO Infrastructure
              </CardTitle>
              <CardDescription>Audit du 25 fevrier 2026 - {SEO_PASSED}/{SEO_TOTAL} verifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-8">
          <ScoreCircle score={SEO_INFRA_SCORE} />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-500">{SEO_PASSED}</span> verifications reussies sur{" "}
              <span className="font-semibold">{SEO_TOTAL}</span>
            </p>
            <SeveritySummary checks={ALL_SEO_CHECKS} />
            <Badge
              variant={SEO_INFRA_SCORE >= 80 ? "default" : "destructive"}
              className={SEO_INFRA_SCORE >= 80 ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}
            >
              {SEO_INFRA_SCORE >= 80 ? "Bon" : SEO_INFRA_SCORE >= 60 ? "Amelioration requise" : "Action critique requise"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-4 w-4" />
              Infrastructure Technique
            </CardTitle>
            <CardDescription>robots.txt, sitemap, redirections</CardDescription>
          </CardHeader>
          <CardContent>
            {SEO_TECHNICAL_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Meta Tags & Open Graph
            </CardTitle>
            <CardDescription>Helmet, OG tags, Twitter Card</CardDescription>
          </CardHeader>
          <CardContent>
            {SEO_META_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Donnees Structurees (JSON-LD)
            </CardTitle>
            <CardDescription>Schemas Schema.org implementes</CardDescription>
          </CardHeader>
          <CardContent>
            {SEO_SCHEMA_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4" />
              Contenu & Images
            </CardTitle>
            <CardDescription>URLs, headings, images, canonical</CardDescription>
          </CardHeader>
          <CardContent>
            {SEO_CONTENT_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Product SEO data from DB */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-blue-500" />
                SEO Produits (product_seo)
              </CardTitle>
              <CardDescription>Score moyen des fiches produit</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Produits SEO</p>
                  <p className="text-2xl font-bold">{totalEntries}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avec meta_title</p>
                  <p className="text-2xl font-bold">{withTitle}<span className="text-sm text-muted-foreground">/{totalEntries}</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Score moyen</p>
                  <p className={`text-2xl font-bold ${avgScore >= 80 ? "text-green-500" : avgScore >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {avgScore}<span className="text-sm text-muted-foreground">/100</span>
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>meta_title</span>
                  <span className="font-medium">{withTitle}/{totalEntries}</span>
                </div>
                <Progress value={totalEntries > 0 ? (withTitle / totalEntries) * 100 : 0} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>meta_description</span>
                  <span className="font-medium">{withDescription}/{totalEntries}</span>
                </div>
                <Progress value={totalEntries > 0 ? (withDescription / totalEntries) * 100 : 0} className="h-2" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent SEO entries */}
      {!isLoading && recentEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dernieres Generations SEO</CardTitle>
            <CardDescription>10 dernieres entrees product_seo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Produit</th>
                    <th className="text-center py-2 px-4 font-medium text-muted-foreground">Score</th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{entry.products?.name ?? entry.product_id}</td>
                      <td className="py-2 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={
                            (entry.seo_score ?? 0) >= 80
                              ? "text-green-600 border-green-200"
                              : (entry.seo_score ?? 0) >= 60
                              ? "text-amber-600 border-amber-200"
                              : "text-red-600 border-red-200"
                          }
                        >
                          {entry.seo_score ?? "N/A"}
                        </Badge>
                      </td>
                      <td className="py-2 pl-4 text-right text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// -- GEO Tab ------------------------------------------------------------------

function GeoTab() {
  return (
    <div className="space-y-6">
      {/* GEO Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Score GEO / Local
          </CardTitle>
          <CardDescription>Audit du 25 fevrier 2026 - {GEO_PASSED}/{GEO_TOTAL} verifications</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-8">
          <ScoreCircle score={GEO_SCORE} />
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-500">{GEO_PASSED}</span> verifications reussies sur{" "}
              <span className="font-semibold">{GEO_TOTAL}</span>
            </p>
            <SeveritySummary checks={GEO_CHECKS} />
          </div>
        </CardContent>
      </Card>

      {/* All GEO checks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verifications GEO detaillees</CardTitle>
          <CardDescription>Referencement local et coherence des donnees</CardDescription>
        </CardHeader>
        <CardContent>
          {GEO_CHECKS.map((check) => (
            <CheckItem key={check.label} {...check} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-blue-500" />
              Informations Entreprise
            </CardTitle>
            <CardDescription>NAP (Name, Address, Phone)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium">{BUSINESS_INFO.name}</span>
              <span className="text-muted-foreground">Adresse</span>
              <span className="font-medium">{BUSINESS_INFO.address}</span>
              <span className="text-muted-foreground">Ville</span>
              <span className="font-medium">{BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}</span>
              <span className="text-muted-foreground">Region</span>
              <span className="font-medium">{BUSINESS_INFO.region}</span>
              <span className="text-muted-foreground">Telephone</span>
              <span className="font-medium">{BUSINESS_INFO.phone}</span>
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{BUSINESS_INFO.email}</span>
              <span className="text-muted-foreground">Coordonnees</span>
              <span className="font-mono text-xs">{BUSINESS_INFO.lat}, {BUSINESS_INFO.lng}</span>
            </div>
          </CardContent>
        </Card>

        {/* Opening hours */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Horaires d'ouverture</CardTitle>
            <CardDescription>Planning hebdomadaire (schema.org)</CardDescription>
          </CardHeader>
          <CardContent>
            {OPENING_HOURS.map((slot) => (
              <div key={slot.days} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{slot.days}</span>
                <Badge
                  variant="outline"
                  className={slot.hours === "Ferme" ? "text-red-500 border-red-200" : "text-green-600 border-green-200"}
                >
                  {slot.hours}
                </Badge>
              </div>
            ))}
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-600">La page Contact affiche 18h30 au lieu de 19h00</p>
            </div>
          </CardContent>
        </Card>

        {/* Target areas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-blue-500" />
              Zones de Chalandise
            </CardTitle>
            <CardDescription>Zones geographiques ciblees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TARGET_AREAS.map((area) => (
                <Badge key={area} variant="secondary" className="text-sm">
                  <MapPin className="h-3 w-3 mr-1" />
                  {area}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Google Maps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Google Maps</CardTitle>
            <CardDescription>Integration carte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Embed Google Maps integre</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Iframe sandboxed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Lazy loading actif</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-400">Pas de lien Google Business Profile</span>
            </div>
          </CardContent>
        </Card>

        {/* GEO pages */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4 text-blue-500" />
              Pages GEO-ciblees
            </CardTitle>
            <CardDescription>6 pages de referencement local</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-0 sm:grid-cols-2">
              {GEO_PAGES.map((page) => (
                <div key={page.path} className="flex items-center gap-2 py-1.5">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{page.label}</p>
                    <code className="text-xs text-muted-foreground">{page.path}</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -- Main page ----------------------------------------------------------------

export default function AdminSecuritySeoGeo() {
  return (
    <AdminLayout
      title="Securite / SEO / GEO"
      description="Audit et monitoring securite, SEO et referencement local - Mis a jour le 25/02/2026"
    >
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4" />
            Securite
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
          <TabsTrigger value="geo" className="gap-1.5">
            <MapPin className="h-4 w-4" />
            GEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="seo">
          <SeoTab />
        </TabsContent>

        <TabsContent value="geo">
          <GeoTab />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
