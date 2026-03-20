import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from "@/components/ui/carousel";
import { ArrowRight, Star, Package } from "lucide-react";
import { usePublicPage, type ContentBlock, type BlockSettings } from "@/hooks/useStaticPages";
import { getLucideIcon } from "@/lib/lucide-icon-map";
import { PricingDetailSection } from "@/components/pricing/PricingDetailSection";
import { cn } from "@/lib/utils";

const SITE_URL = "https://ma-papeterie.fr";
const SITE_NAME = "Ma Papeterie — Expert conseil en fournitures";

/** Escape < to prevent </script> injection in JSON-LD blocks */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const ALLOWED_VIDEO_HOSTS = [
  "youtube.com", "www.youtube.com", "youtu.be",
  "vimeo.com", "player.vimeo.com",
  "dailymotion.com", "www.dailymotion.com",
];

// ── Settings wrapper ──────────────────────────────────────────────────────────

const PADDING_CLASSES: Record<string, string> = {
  none: "",
  sm: "py-4",
  md: "py-8",
  lg: "py-12 md:py-16",
  xl: "py-16 md:py-24",
};

function BlockWrapper({
  settings,
  fullWidth,
  children,
}: {
  settings?: BlockSettings;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  const bg = settings?.backgroundColor ?? "";
  const pad = PADDING_CLASSES[settings?.padding ?? "none"] ?? "";
  const custom = settings?.customClass ?? "";
  const vis =
    settings?.visibility === "desktop" ? "hidden md:block" :
    settings?.visibility === "mobile" ? "md:hidden" : "";

  return (
    <section
      id={settings?.anchor}
      className={cn(bg, pad, custom, vis)}
    >
      {fullWidth ? children : (
        <div className="container mx-auto px-4 max-w-3xl">{children}</div>
      )}
    </section>
  );
}

// ── Original renderers ────────────────────────────────────────────────────────

function BlockHeading({ block }: { block: ContentBlock }) {
  if (block.type !== "heading") return null;
  const cls = "font-bold text-foreground";
  if (block.level === 3) return <h3 className={`text-xl ${cls} mt-6 mb-3`}>{block.content}</h3>;
  return <h2 className={`text-2xl ${cls} mt-10 mb-4 pb-2 border-b`}>{block.content}</h2>;
}

function BlockParagraph({ block }: { block: ContentBlock }) {
  if (block.type !== "paragraph") return null;
  return <p className="text-muted-foreground leading-relaxed mb-4">{block.content}</p>;
}

function BlockList({ block }: { block: ContentBlock }) {
  if (block.type !== "list") return null;
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className={`mb-4 space-y-1.5 ${block.ordered ? "list-decimal" : "list-disc"} pl-6`}>
      {(block.items ?? []).map((item, i) => (
        <li key={i} className="text-muted-foreground leading-relaxed">{item}</li>
      ))}
    </Tag>
  );
}

function BlockFaq({ block }: { block: ContentBlock }) {
  if (block.type !== "faq") return null;
  const questions = block.questions ?? [];
  if (questions.length === 0) return null;
  return (
    <div className="mb-6 border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b">
        <h3 className="font-semibold text-sm">Questions fréquentes</h3>
      </div>
      <Accordion type="multiple" className="px-2">
        {questions.map((q, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-sm text-left font-medium">{q.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">{q.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function BlockCta({ block }: { block: ContentBlock }) {
  if (block.type !== "cta") return null;
  return (
    <div className="my-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
      {block.title && <h3 className="text-xl font-bold mb-2">{block.title}</h3>}
      {block.description && <p className="text-muted-foreground mb-4">{block.description}</p>}
      {block.link && block.button && (
        <Button asChild>
          <Link to={block.link}>{block.button}</Link>
        </Button>
      )}
    </div>
  );
}

// ── New renderers ─────────────────────────────────────────────────────────────

function BlockHero({ block }: { block: ContentBlock }) {
  if (block.type !== "hero") return null;
  const slides = block.slides ?? [];
  if (slides.length === 0) return null;

  return (
    <div className="relative">
      <Carousel opts={{ loop: true }}>
        <CarouselContent>
          {slides.map((slide, i) => (
            <CarouselItem key={i}>
              <div className="relative min-h-[400px] md:min-h-[500px] bg-gradient-to-b from-primary/5 to-background flex items-center justify-center overflow-hidden">
                {slide.imageUrl && (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className={cn(
                  "relative z-10 text-center px-4 max-w-3xl mx-auto",
                  slide.imageUrl && "text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]"
                )}>
                  <h2 className="text-3xl md:text-5xl font-bold">{slide.title}</h2>
                  {slide.subtitle && (
                    <p className="text-lg md:text-xl mt-4 opacity-90">{slide.subtitle}</p>
                  )}
                  {slide.buttonText && slide.buttonLink && (
                    <Button asChild size="lg" className="mt-6">
                      <Link to={slide.buttonLink}>{slide.buttonText}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
}

function BlockServiceGrid({ block }: { block: ContentBlock }) {
  if (block.type !== "service_grid") return null;
  const cols = block.columns ?? 3;
  const gridCls =
    cols === 2 ? "md:grid-cols-2" :
    cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  const isImageCard = block.displayMode === "image-card";
  const heightCls =
    block.cardHeight === "sm" ? "h-[200px]" :
    block.cardHeight === "lg" ? "h-[360px]" : "h-[280px]";

  return (
    <div className="container mx-auto px-4">
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCls} gap-6`}>
        {(block.services ?? []).map((svc, i) => {
          const Icon = getLucideIcon(svc.icon) ?? Package;

          if (isImageCard) {
            const imageCard = (
              <div className={cn("relative rounded-xl overflow-hidden group", heightCls)}>
                {svc.imageUrl ? (
                  <img
                    src={svc.imageUrl}
                    alt={svc.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-5 text-white">
                  <div className="mb-3 w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold leading-tight">{svc.title}</h3>
                  {svc.description && (
                    <p className="text-sm text-white/80 mt-1 line-clamp-2">{svc.description}</p>
                  )}
                  {svc.link && (
                    <div className="flex items-center text-white/90 font-medium mt-2 text-sm">
                      <span>Découvrir</span>
                      <ArrowRight className="ml-1.5 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </div>
              </div>
            );

            return svc.link ? (
              <Link key={i} to={svc.link} className="group">{imageCard}</Link>
            ) : (
              <div key={i} className="group">{imageCard}</div>
            );
          }

          const inner = (
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 group">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {svc.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{svc.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              {(svc.features?.length ?? 0) > 0 && (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {svc.features!.map((f, j) => (
                      <span key={j} className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                  {svc.link && (
                    <div className="flex items-center text-primary font-medium mt-4">
                      <span>En savoir plus</span>
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );

          return svc.link ? (
            <Link key={i} to={svc.link} className="group">{inner}</Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

function BlockImageText({ block }: { block: ContentBlock }) {
  if (block.type !== "image_text") return null;
  const imgLeft = block.imagePosition !== "right";

  return (
    <div className="container mx-auto px-4">
      <div className={cn("flex flex-col md:flex-row gap-8 items-center", !imgLeft && "md:flex-row-reverse")}>
        {block.imageUrl && (
          <div className="flex-1">
            <img
              src={block.imageUrl}
              alt={block.imageAlt ?? ""}
              className="rounded-xl w-full h-auto object-cover shadow-lg"
            />
          </div>
        )}
        <div className="flex-1 space-y-4">
          {block.title && <h3 className="text-2xl font-bold">{block.title}</h3>}
          {block.text && <p className="text-muted-foreground leading-relaxed">{block.text}</p>}
          {block.buttonText && block.buttonLink && (
            <Button asChild>
              <Link to={block.buttonLink}>
                {block.buttonText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!ALLOWED_VIDEO_HOSTS.some((h) => u.hostname === h)) return null;
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
    if (u.hostname.includes("dailymotion.com")) {
      const id = u.pathname.split("/").pop();
      return `https://www.dailymotion.com/embed/video/${id}`;
    }
  } catch { /* ignore */ }
  return null;
}

function BlockVideoEmbed({ block }: { block: ContentBlock }) {
  if (block.type !== "video_embed" || !block.url) return null;
  const embedUrl = getYouTubeEmbedUrl(block.url);
  const ratio =
    block.aspectRatio === "4:3" ? "aspect-[4/3]" :
    block.aspectRatio === "1:1" ? "aspect-square" : "aspect-video";

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      {block.title && <h3 className="text-xl font-bold mb-4 text-center">{block.title}</h3>}
      {embedUrl ? (
        <div className={cn("w-full rounded-xl overflow-hidden shadow-lg", ratio)}>
          <iframe
            src={embedUrl}
            title={block.title ?? "Vidéo"}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="w-full rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center py-16 text-sm text-muted-foreground">
          URL vidéo invalide — utilisez YouTube, Vimeo ou Dailymotion
        </div>
      )}
      {block.caption && (
        <p className="text-sm text-muted-foreground text-center mt-3">{block.caption}</p>
      )}
    </div>
  );
}

function BlockIconFeatures({ block }: { block: ContentBlock }) {
  if (block.type !== "icon_features") return null;
  const cols = block.columns ?? 3;
  const gridCls =
    cols === 2 ? "md:grid-cols-2" :
    cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <div className="container mx-auto px-4">
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCls} gap-8`}>
        {(block.features ?? []).map((feat, i) => {
          const Icon = getLucideIcon(feat.icon) ?? Star;
          return (
            <div key={i} className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-7 w-7 text-primary" />
              </div>
              <h4 className="font-semibold">{feat.title}</h4>
              <p className="text-sm text-muted-foreground">{feat.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BlockTestimonials({ block }: { block: ContentBlock }) {
  if (block.type !== "testimonials") return null;
  const items = block.testimonials ?? [];
  if (items.length === 0) return null;

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <Card key={i} className="h-full">
            <CardContent className="pt-6">
              {t.rating && (
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={cn("h-4 w-4", j < t.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted")}
                    />
                  ))}
                </div>
              )}
              <blockquote className="text-sm text-muted-foreground italic mb-4">
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BlockPricingTable({ block }: { block: ContentBlock }) {
  if (block.type !== "pricing_table") return null;
  const plans = block.plans ?? [];
  if (plans.length === 0) return null;

  return (
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <Card
            key={i}
            className={cn(
              "h-full flex flex-col",
              plan.highlighted && "border-primary shadow-lg ring-1 ring-primary/20"
            )}
          >
            <CardHeader>
              {plan.highlighted && (
                <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Recommandé</span>
              )}
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground ml-1">/{plan.period}</span>}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.buttonText && plan.buttonLink && (
                <Button asChild variant={plan.highlighted ? "default" : "outline"} className="w-full">
                  <Link to={plan.buttonLink}>{plan.buttonText}</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BlockPricingDetail({ block }: { block: ContentBlock }) {
  if (block.type !== "pricing_detail") return null;
  const tables = block.tables ?? [];
  if (tables.length === 0) return null;
  return (
    <div className="container mx-auto px-4">
      <PricingDetailSection title={block.title} tables={tables} />
    </div>
  );
}

function BlockPromoTicker({ block }: { block: ContentBlock }) {
  if (block.type !== "promo_ticker") return null;
  const items = block.items ?? [];
  if (items.length === 0) return null;
  const speed = block.speed ?? 30;

  return (
    <div className="bg-secondary text-foreground overflow-hidden hover:[&>div]:pause">
      <div
        className="flex animate-marquee whitespace-nowrap py-1.5"
        style={{ animationDuration: `${speed}s` }}
      >
        {[...items, ...items].map((item, i) => {
          const Icon = getLucideIcon(item.icon);
          return (
            <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium mx-8">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              {item.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BlockSeparatorEl({ block }: { block: ContentBlock }) {
  if (block.type !== "separator") return null;
  if (block.style === "space") return <div className="h-8" />;
  if (block.style === "dots") {
    return (
      <div className="flex justify-center gap-2 py-4">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>
    );
  }
  return <Separator className="my-6" />;
}

function BlockImageEl({ block }: { block: ContentBlock }) {
  if (block.type !== "image" || !block.url) return null;
  const widthCls =
    block.width === "sm" ? "max-w-sm" :
    block.width === "md" ? "max-w-lg" :
    block.width === "full" ? "w-full" : "max-w-2xl";

  const img = (
    <figure className={cn("mx-auto", widthCls)}>
      <img src={block.url} alt={block.alt ?? ""} className="rounded-xl w-full h-auto shadow-md" loading="lazy" decoding="async" />
      {block.caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-2">{block.caption}</figcaption>
      )}
    </figure>
  );

  if (block.link) {
    return <Link to={block.link}>{img}</Link>;
  }
  return img;
}

function BlockGallery({ block }: { block: ContentBlock }) {
  if (block.type !== "gallery") return null;
  const cols = block.columns ?? 3;
  const gridCls =
    cols === 2 ? "md:grid-cols-2" :
    cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <div className="container mx-auto px-4">
      <div className={`grid grid-cols-2 ${gridCls} gap-4`}>
        {(block.images ?? []).map((img, i) => (
          <figure key={i}>
            <img src={img.url} alt={img.alt ?? ""} className="rounded-lg w-full h-48 object-cover" loading="lazy" decoding="async" />
            {img.caption && (
              <figcaption className="text-xs text-muted-foreground mt-1">{img.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}

function BlockColumns({ block }: { block: ContentBlock }) {
  if (block.type !== "columns") return null;
  const { widths, columns } = block.layout;

  return (
    <div className="container mx-auto px-4">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: widths.map((w) => `${w}%`).join(" ") }}
      >
        {columns.map((colBlocks, i) => (
          <div key={i} className="space-y-4">
            {colBlocks.map((childBlock, j) => (
              <RenderBlock key={childBlock.id ?? j} block={childBlock} index={j} fullWidth={false} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Master renderer ───────────────────────────────────────────────────────────

export function RenderBlock({
  block,
  fullWidth = false,
}: {
  block: ContentBlock;
  fullWidth?: boolean;
}) {
  const needsOwnContainer = [
    "hero", "service_grid", "image_text", "video_embed",
    "icon_features", "testimonials", "pricing_table", "pricing_detail",
    "gallery", "columns", "promo_ticker",
  ].includes(block.type);

  const inner = (() => {
    switch (block.type) {
      case "heading":       return <BlockHeading block={block} />;
      case "paragraph":     return <BlockParagraph block={block} />;
      case "list":          return <BlockList block={block} />;
      case "faq":           return <BlockFaq block={block} />;
      case "cta":           return <BlockCta block={block} />;
      case "hero":          return <BlockHero block={block} />;
      case "service_grid":  return <BlockServiceGrid block={block} />;
      case "image_text":    return <BlockImageText block={block} />;
      case "video_embed":   return <BlockVideoEmbed block={block} />;
      case "icon_features": return <BlockIconFeatures block={block} />;
      case "testimonials":  return <BlockTestimonials block={block} />;
      case "pricing_table": return <BlockPricingTable block={block} />;
      case "pricing_detail": return <BlockPricingDetail block={block} />;
      case "separator":     return <BlockSeparatorEl block={block} />;
      case "image":         return <BlockImageEl block={block} />;
      case "gallery":       return <BlockGallery block={block} />;
      case "columns":       return <BlockColumns block={block} fullWidth={fullWidth} />;
      case "promo_ticker":  return <BlockPromoTicker block={block} />;
      default:              return null;
    }
  })();

  if (!inner) return null;

  // Blocks that manage their own container don't need wrapping in article mode
  if (fullWidth || needsOwnContainer) {
    return (
      <BlockWrapper settings={block.settings} fullWidth>
        {inner}
      </BlockWrapper>
    );
  }

  return (
    <BlockWrapper settings={block.settings} fullWidth={false}>
      {inner}
    </BlockWrapper>
  );
}

// ── JSON-LD helpers ──────────────────────────────────────────────────────────

function buildBreadcrumbJsonLd(slug: string, title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/p/${slug}` },
    ],
  };
}

function buildFaqJsonLd(blocks: ContentBlock[]) {
  const faqBlocks = blocks.filter((b) => b.type === "faq") as Extract<ContentBlock, { type: "faq" }>[];
  const allQs = faqBlocks.flatMap((b) => b.questions ?? []);
  if (allQs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQs.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: { "@type": "Answer", text: q.a },
    })),
  };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-5/6" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
    </div>
  );
}

// ── Page component ──────────────────────────────────────────────────────────

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = usePublicPage(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main><PageSkeleton /></main>
        <Footer />
      </div>
    );
  }

  if (error || !page) {
    return <Navigate to="/404" replace />;
  }

  const isFullWidth = page.layout === "full-width";
  const canonical = `${SITE_URL}/p/${page.slug}`;
  const metaTitle = page.meta_title || `${page.title} | ${SITE_NAME}`;
  const metaDesc = page.meta_description || "";
  const breadcrumbLd = buildBreadcrumbJsonLd(page.slug, page.title);
  const faqLd = buildFaqJsonLd(page.content ?? []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="fr_FR" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {page.json_ld && (
          <script type="application/ld+json">{safeJsonLd(page.json_ld)}</script>
        )}
        <script type="application/ld+json">{safeJsonLd(breadcrumbLd)}</script>
        {faqLd && <script type="application/ld+json">{safeJsonLd(faqLd)}</script>}
      </Helmet>

      <Header />

      <main>
        {!isFullWidth && (
          <div className="container mx-auto px-4 py-12 max-w-3xl">
            <nav className="text-sm text-muted-foreground mb-8 flex items-center gap-1.5">
              <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-foreground">{page.title}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6 leading-tight">
              {page.h1 || page.title}
            </h1>
            {page.published_at && (
              <p className="text-xs text-muted-foreground mb-8">
                Publié le {new Date(page.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        <div className={isFullWidth ? "" : "container mx-auto px-4 max-w-3xl pb-12"}>
          {(page.content ?? []).map((block, i) => (
            <RenderBlock key={block.id ?? i} block={block} index={i} fullWidth={isFullWidth} />
          ))}
        </div>

        {!isFullWidth && (
          <div className="container mx-auto px-4 max-w-3xl pb-12">
            <div className="pt-8 border-t">
              <Link to="/" className="text-sm text-primary hover:underline">← Retour à l'accueil</Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
