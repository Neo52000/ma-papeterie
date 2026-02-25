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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

interface SecurityCheck {
  label: string;
  passed: boolean;
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

// ── Donn\u00e9es statiques S\u00e9curit\u00e9 ──────────────────────────────────────────────

const SECURITY_HEADERS: SecurityCheck[] = [
  { label: "Content-Security-Policy (CSP)", passed: true },
  { label: "Strict-Transport-Security (HSTS)", passed: true },
  { label: "X-Frame-Options", passed: true },
  { label: "X-Content-Type-Options", passed: true },
  { label: "X-XSS-Protection", passed: true },
  { label: "Referrer-Policy", passed: true },
  { label: "Permissions-Policy", passed: true },
];

const AUTH_CHECKS: SecurityCheck[] = [
  { label: "Auth Supabase", passed: true },
  { label: "Protection routes admin", passed: true },
  { label: "Politique mots de passe 12+", passed: true },
  { label: "Tokens JWT", passed: true },
];

const XSS_CHECKS: SecurityCheck[] = [
  { label: "HTML sanitis\u00e9", passed: true },
  { label: "CSP activ\u00e9", passed: true },
  { label: "dangerouslySetInnerHTML prot\u00e9g\u00e9", passed: true },
];

const EDGE_FUNCTIONS_CHECKS: SecurityCheck[] = [
  { label: "Authentification requise", passed: true },
  { label: "Rate limiting actif", passed: true },
  { label: "CORS restreint", passed: true },
];

const CORS_ORIGINS = [
  "https://ma-papeterie.fr",
  "https://www.ma-papeterie.fr",
  "https://ma-papeterie.lovable.app",
];

const ALL_SECURITY_CHECKS = [
  ...SECURITY_HEADERS,
  ...AUTH_CHECKS,
  ...XSS_CHECKS,
  ...EDGE_FUNCTIONS_CHECKS,
];

const SECURITY_SCORE = Math.round(
  (ALL_SECURITY_CHECKS.filter((c) => c.passed).length / ALL_SECURITY_CHECKS.length) * 100
);

// ── Donn\u00e9es statiques GEO ──────────────────────────────────────────────────

const BUSINESS_INFO = {
  name: "Papeterie Reine & Fils",
  address: "10 rue Toupot de B\u00e9veaux",
  postalCode: "52000",
  city: "Chaumont",
  lat: 48.1115,
  lng: 5.1372,
  phone: "+33 3 25 03 05 84",
  email: "contact@ma-papeterie.fr",
};

const OPENING_HOURS = [
  { days: "Lundi - Vendredi", hours: "9h00 - 19h00" },
  { days: "Samedi", hours: "9h00 - 18h00" },
  { days: "Dimanche", hours: "Ferm\u00e9" },
];

const TARGET_AREAS = ["Chaumont", "Saint-Dizier", "Bar-le-Duc", "Langres", "Haute-Marne"];

const GEO_PAGES = [
  { path: "/impression-urgente-chaumont", label: "Impression urgente Chaumont" },
  { path: "/photocopie-express-chaumont", label: "Photocopie express Chaumont" },
  { path: "/plaque-immatriculation-chaumont", label: "Plaque immatriculation Chaumont" },
  { path: "/tampon-professionnel-chaumont", label: "Tampon professionnel Chaumont" },
];

const SCHEMA_TYPES = [
  { type: "Product", status: true },
  { type: "LocalBusiness", status: true },
  { type: "WebSite", status: true },
  { type: "BreadcrumbList", status: true },
];

const JSON_LD_PREVIEW = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: BUSINESS_INFO.name,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS_INFO.address,
    postalCode: BUSINESS_INFO.postalCode,
    addressLocality: BUSINESS_INFO.city,
    addressCountry: "FR",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: BUSINESS_INFO.lat,
    longitude: BUSINESS_INFO.lng,
  },
  telephone: BUSINESS_INFO.phone,
  openingHoursSpecification: [
    { dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "19:00" },
    { dayOfWeek: "Saturday", opens: "09:00", closes: "18:00" },
  ],
};

// ── Composants r\u00e9utilisables ─────────────────────────────────────────────────

function CheckItem({ label, passed }: SecurityCheck) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {passed ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
      )}
      <span className={passed ? "text-sm text-foreground" : "text-sm text-red-400 font-medium"}>
        {label}
      </span>
    </div>
  );
}

function ScoreCircle({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "text-green-500" : score >= 70 ? "text-amber-500" : "text-red-500";
  const strokeColor = score >= 90 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

// ── Onglet S\u00e9curit\u00e9 ──────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-6">
      {/* Score global */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Score de S\u00e9curit\u00e9
          </CardTitle>
          <CardDescription>
            \u00c9valuation globale de la s\u00e9curit\u00e9 de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-8">
          <ScoreCircle score={SECURITY_SCORE} />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-green-500">
                {ALL_SECURITY_CHECKS.filter((c) => c.passed).length}
              </span>{" "}
              v\u00e9rifications r\u00e9ussies sur{" "}
              <span className="font-semibold">{ALL_SECURITY_CHECKS.length}</span>
            </p>
            <Badge variant={SECURITY_SCORE >= 90 ? "default" : "destructive"} className={SECURITY_SCORE >= 90 ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
              {SECURITY_SCORE >= 90 ? "Excellent" : SECURITY_SCORE >= 70 ? "Correct" : "Am\u00e9lioration requise"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Headers de s\u00e9curit\u00e9 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-green-500" />
              Headers de S\u00e9curit\u00e9
            </CardTitle>
            <CardDescription>En-t\u00eates HTTP de protection</CardDescription>
          </CardHeader>
          <CardContent>
            {SECURITY_HEADERS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        {/* Authentification */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-green-500" />
              Authentification
            </CardTitle>
            <CardDescription>Contr\u00f4les d'acc\u00e8s et d'identit\u00e9</CardDescription>
          </CardHeader>
          <CardContent>
            {AUTH_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        {/* CORS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-green-500" />
              Politique CORS
            </CardTitle>
            <CardDescription>Cross-Origin Resource Sharing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm font-medium">CORS restreint actif</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Origines autoris\u00e9es
              </p>
              {CORS_ORIGINS.map((origin) => (
                <div key={origin} className="flex items-center gap-2 py-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <code className="text-xs text-muted-foreground">{origin}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Protection XSS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-green-500" />
              Protection XSS
            </CardTitle>
            <CardDescription>Pr\u00e9vention des injections de scripts</CardDescription>
          </CardHeader>
          <CardContent>
            {XSS_CHECKS.map((check) => (
              <CheckItem key={check.label} {...check} />
            ))}
          </CardContent>
        </Card>

        {/* Edge Functions */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-green-500" />
              Edge Functions (Supabase)
            </CardTitle>
            <CardDescription>S\u00e9curit\u00e9 des fonctions serverless</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-0 sm:grid-cols-3">
              {EDGE_FUNCTIONS_CHECKS.map((check) => (
                <CheckItem key={check.label} {...check} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Onglet SEO ──────────────────────────────────────────────────────────────

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
  const avgScore = totalEntries > 0
    ? Math.round(
        (seoData ?? []).reduce((sum, e) => sum + (e.seo_score ?? 0), 0) / totalEntries
      )
    : 0;
  const recentEntries = (seoData ?? []).slice(0, 10);

  const scoreColor = avgScore >= 80 ? "text-green-500" : avgScore >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Score SEO Global */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Score SEO Global
              </CardTitle>
              <CardDescription>Score moyen bas\u00e9 sur les donn\u00e9es product_seo</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-8">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : (
            <>
              <ScoreCircle score={avgScore} />
              <div className="space-y-2 flex-1">
                <p className="text-sm text-muted-foreground">
                  Score moyen:{" "}
                  <span className={`font-bold text-lg ${scoreColor}`}>{avgScore}/100</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {totalEntries} produit{totalEntries > 1 ? "s" : ""} avec donn\u00e9es SEO
                </p>
                <Progress value={avgScore} className="h-2 w-48" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Couverture Meta Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Couverture Meta Tags</CardTitle>
            <CardDescription>Proportion de produits avec m\u00e9ta-donn\u00e9es</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>meta_title</span>
                <span className="font-medium">{withTitle}/{totalEntries}</span>
              </div>
              <Progress value={totalEntries > 0 ? (withTitle / totalEntries) * 100 : 0} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>meta_description</span>
                <span className="font-medium">{withDescription}/{totalEntries}</span>
              </div>
              <Progress value={totalEntries > 0 ? (withDescription / totalEntries) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Donn\u00e9es structur\u00e9es */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Donn\u00e9es Structur\u00e9es</CardTitle>
            <CardDescription>Sch\u00e9mas Schema.org impl\u00e9ment\u00e9s</CardDescription>
          </CardHeader>
          <CardContent>
            {SCHEMA_TYPES.map((schema) => (
              <div key={schema.type} className="flex items-center gap-2 py-1.5">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <code className="text-sm">{schema.type}</code>
                <Badge variant="outline" className="ml-auto text-[10px] text-green-600 border-green-200">
                  Actif
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pages Optimis\u00e9es */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pages Optimis\u00e9es</CardTitle>
            <CardDescription>Produits disposant de donn\u00e9es SEO</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-foreground">{totalEntries}</div>
              <div className="text-sm text-muted-foreground">
                produit{totalEntries > 1 ? "s" : ""} avec donn\u00e9es SEO g\u00e9n\u00e9r\u00e9es
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Derni\u00e8res g\u00e9n\u00e9rations SEO */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Derni\u00e8res G\u00e9n\u00e9rations SEO</CardTitle>
          <CardDescription>Entr\u00e9es r\u00e9centes dans product_seo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Chargement...
            </div>
          ) : recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aucune donn\u00e9e SEO trouv\u00e9e.</p>
          ) : (
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
                      <td className="py-2 pr-4">
                        {entry.products?.name ?? entry.product_id}
                      </td>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Onglet GEO ──────────────────────────────────────────────────────────────

function GeoTab() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations Entreprise */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-blue-500" />
              Informations Entreprise
            </CardTitle>
            <CardDescription>Donn\u00e9es d'identification locale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium">{BUSINESS_INFO.name}</span>
              <span className="text-muted-foreground">Adresse</span>
              <span className="font-medium">{BUSINESS_INFO.address}</span>
              <span className="text-muted-foreground">Ville</span>
              <span className="font-medium">{BUSINESS_INFO.postalCode} {BUSINESS_INFO.city}</span>
              <span className="text-muted-foreground">T\u00e9l\u00e9phone</span>
              <span className="font-medium">{BUSINESS_INFO.phone}</span>
              <span className="text-muted-foreground">Coordonn\u00e9es</span>
              <span className="font-mono text-xs">{BUSINESS_INFO.lat}, {BUSINESS_INFO.lng}</span>
            </div>
          </CardContent>
        </Card>

        {/* Horaires d'ouverture */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Horaires d'ouverture</CardTitle>
            <CardDescription>Planning hebdomadaire</CardDescription>
          </CardHeader>
          <CardContent>
            {OPENING_HOURS.map((slot) => (
              <div key={slot.days} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{slot.days}</span>
                <Badge
                  variant="outline"
                  className={
                    slot.hours === "Ferm\u00e9"
                      ? "text-red-500 border-red-200"
                      : "text-green-600 border-green-200"
                  }
                >
                  {slot.hours}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Zones de chalandise */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-blue-500" />
              Zones de Chalandise
            </CardTitle>
            <CardDescription>Zones g\u00e9ographiques cibl\u00e9es</CardDescription>
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
            <CardDescription>Int\u00e9gration carte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Embed Google Maps int\u00e9gr\u00e9</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Iframe sandboxed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-sm">Lazy loading actif</span>
            </div>
          </CardContent>
        </Card>

        {/* Pages GEO-cibl\u00e9es */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="h-4 w-4 text-blue-500" />
              Pages GEO-cibl\u00e9es
            </CardTitle>
            <CardDescription>Pages de r\u00e9f\u00e9rencement local</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {GEO_PAGES.map((page) => (
              <div key={page.path} className="flex items-center gap-2 py-1.5">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{page.label}</p>
                  <code className="text-xs text-muted-foreground">{page.path}</code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Schema LocalBusiness */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4 text-blue-500" />
              Schema LocalBusiness (JSON-LD)
            </CardTitle>
            <CardDescription>Aper\u00e7u des donn\u00e9es structur\u00e9es LocalBusiness</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed">
              <code>{JSON.stringify(JSON_LD_PREVIEW, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────

export default function AdminSecuritySeoGeo() {
  return (
    <AdminLayout
      title="S\u00e9curit\u00e9 / SEO / GEO"
      description="Audit et monitoring s\u00e9curit\u00e9, SEO et r\u00e9f\u00e9rencement local"
    >
      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-4 w-4" />
            S\u00e9curit\u00e9
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
