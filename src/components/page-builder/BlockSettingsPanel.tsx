import { usePageBuilderStore } from "@/stores/pageBuilderStore";
import { BlockSettingsCommon } from "./BlockSettingsCommon";
import {
  HeadingEditor, ParagraphEditor, ListEditor, FaqEditor, CtaEditor,
  HeroEditor, ServiceGridEditor, ImageTextEditor, VideoEmbedEditor,
  IconFeaturesEditor, TestimonialsEditor, PricingTableEditor, PricingDetailEditor,
  SeparatorEditor, ImageEditor, GalleryEditor, ColumnsEditor, PromoTickerEditor,
  TrustStripEditor, PromoDualEditor, BestSellersEditor, B2BSectionEditor, SeoContentEditor,
  ContactFormEditor, MapEmbedEditor, CountdownEditor, TabsBlockEditor, AccordionEditor,
  ProductGridEditor, CategoryGridEditor, NewsletterEditor, StatsCounterEditor,
  TeamGridEditor, LogoCarouselEditor, PromoBannerEditor, HtmlCustomEditor,
  SpacerEditor, SocialLinksEditor,
} from "./BlockEditors";
import { getBlockEntry } from "@/lib/block-registry";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContentBlock, BlockSettings } from "@/hooks/useStaticPages";

export function BlockSettingsPanel({ pageSlug }: { pageSlug?: string }) {
  const { blocks, selectedBlockId, updateBlock, selectBlock } = usePageBuilderStore();
  const block = blocks.find((b) => b.id === selectedBlockId);

  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
        <p className="text-sm">Sélectionnez un bloc pour modifier ses réglages</p>
        <p className="text-xs mt-1">Cliquez sur un bloc dans l'aperçu ou dans la liste</p>
      </div>
    );
  }

  const entry = getBlockEntry(block.type);
  const handleChange = (patch: Partial<ContentBlock>) => updateBlock(block.id, patch);
  const handleSettingsChange = (settings: BlockSettings) => updateBlock(block.id, { settings });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{entry?.labelFr ?? block.type}</Badge>
          <button onClick={() => selectBlock(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Fermer
          </button>
        </div>

        {/* Block-specific editor */}
        {block.type === "heading" && <HeadingEditor block={block} onChange={handleChange} />}
        {block.type === "paragraph" && <ParagraphEditor block={block} onChange={handleChange} />}
        {block.type === "list" && <ListEditor block={block} onChange={handleChange} />}
        {block.type === "faq" && <FaqEditor block={block} onChange={handleChange} />}
        {block.type === "cta" && <CtaEditor block={block} onChange={handleChange} />}
        {block.type === "hero" && <HeroEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "service_grid" && <ServiceGridEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "image_text" && <ImageTextEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "video_embed" && <VideoEmbedEditor block={block} onChange={handleChange} />}
        {block.type === "icon_features" && <IconFeaturesEditor block={block} onChange={handleChange} />}
        {block.type === "testimonials" && <TestimonialsEditor block={block} onChange={handleChange} />}
        {block.type === "pricing_table" && <PricingTableEditor block={block} onChange={handleChange} />}
        {block.type === "pricing_detail" && <PricingDetailEditor block={block} onChange={handleChange} />}
        {block.type === "separator" && <SeparatorEditor block={block} onChange={handleChange} />}
        {block.type === "image" && <ImageEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "gallery" && <GalleryEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "columns" && <ColumnsEditor block={block} onChange={handleChange} />}
        {block.type === "promo_ticker" && <PromoTickerEditor block={block} onChange={handleChange} />}
        {block.type === "trust_strip" && <TrustStripEditor block={block} onChange={handleChange} />}
        {block.type === "promo_dual" && <PromoDualEditor block={block} onChange={handleChange} />}
        {block.type === "best_sellers" && <BestSellersEditor block={block} onChange={handleChange} />}
        {block.type === "b2b_section" && <B2BSectionEditor block={block} onChange={handleChange} />}
        {block.type === "seo_content" && <SeoContentEditor block={block} onChange={handleChange} />}
        {block.type === "contact_form" && <ContactFormEditor block={block} onChange={handleChange} />}
        {block.type === "map_embed" && <MapEmbedEditor block={block} onChange={handleChange} />}
        {block.type === "countdown" && <CountdownEditor block={block} onChange={handleChange} />}
        {block.type === "tabs_block" && <TabsBlockEditor block={block} onChange={handleChange} />}
        {block.type === "accordion" && <AccordionEditor block={block} onChange={handleChange} />}
        {block.type === "product_grid" && <ProductGridEditor block={block} onChange={handleChange} />}
        {block.type === "category_grid" && <CategoryGridEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "newsletter" && <NewsletterEditor block={block} onChange={handleChange} />}
        {block.type === "stats_counter" && <StatsCounterEditor block={block} onChange={handleChange} />}
        {block.type === "team_grid" && <TeamGridEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "logo_carousel" && <LogoCarouselEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "promo_banner" && <PromoBannerEditor block={block} onChange={handleChange} pageSlug={pageSlug} />}
        {block.type === "html_custom" && <HtmlCustomEditor block={block} onChange={handleChange} />}
        {block.type === "spacer" && <SpacerEditor block={block} onChange={handleChange} />}
        {block.type === "social_links" && <SocialLinksEditor block={block} onChange={handleChange} />}

        {/* Common settings */}
        <BlockSettingsCommon
          settings={block.settings ?? {}}
          onChange={handleSettingsChange}
        />
      </div>
    </ScrollArea>
  );
}
