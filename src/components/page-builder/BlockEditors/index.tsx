import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { IconPicker } from "../IconPicker";
import { ImageUploadField } from "../ImageUploadField";
import type { ContentBlock } from "@/hooks/useStaticPages";

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ── Heading ───────────────────────────────────────────────────────────────────

export function HeadingEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "heading") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Niveau">
        <Select value={String(block.level ?? 2)} onValueChange={(v) => onChange({ level: Number(v) as 2 | 3 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Texte">
        <Input value={block.content ?? ""} onChange={(e) => onChange({ content: e.target.value })} className="h-8" />
      </FieldRow>
    </div>
  );
}

// ── Paragraph ─────────────────────────────────────────────────────────────────

export function ParagraphEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "paragraph") return null;
  return (
    <FieldRow label="Texte">
      <Textarea rows={4} value={block.content ?? ""} onChange={(e) => onChange({ content: e.target.value })} />
    </FieldRow>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

export function ListEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "list") return null;
  const items = block.items ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Ordonnée</Label>
        <Switch checked={block.ordered ?? false} onCheckedChange={(v) => onChange({ ordered: v })} />
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-1">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange({ items: next });
            }}
            className="h-8 text-xs"
          />
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ items: [...items, ""] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

export function FaqEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "faq") return null;
  const questions = block.questions ?? [];
  return (
    <div className="space-y-3">
      {questions.map((qa, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Question {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ questions: questions.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder="Question..."
            value={qa.q}
            onChange={(e) => {
              const next = [...questions];
              next[i] = { ...next[i], q: e.target.value };
              onChange({ questions: next });
            }}
            className="h-8 text-xs"
          />
          <Textarea
            placeholder="Réponse..."
            rows={2}
            value={qa.a}
            onChange={(e) => {
              const next = [...questions];
              next[i] = { ...next[i], a: e.target.value };
              onChange({ questions: next });
            }}
            className="text-xs"
          />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ questions: [...questions, { q: "", a: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une question
      </Button>
    </div>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

export function CtaEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "cta") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Description"><Textarea rows={2} value={block.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} /></FieldRow>
      <FieldRow label="Texte du bouton"><Input value={block.button ?? ""} onChange={(e) => onChange({ button: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Lien"><Input value={block.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} className="h-8" placeholder="/contact" /></FieldRow>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export function HeroEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "hero") return null;
  const slides = block.slides ?? [];

  const updateSlide = (i: number, patch: Partial<typeof slides[0]>) => {
    const next = [...slides];
    next[i] = { ...next[i], ...patch };
    onChange({ slides: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Autoplay</Label>
        <Switch checked={block.autoplay ?? false} onCheckedChange={(v) => onChange({ autoplay: v })} />
      </div>
      {slides.map((slide, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Slide {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ slides: slides.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Titre" value={slide.title} onChange={(e) => updateSlide(i, { title: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Sous-titre" value={slide.subtitle ?? ""} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} className="h-8 text-xs" />
          <ImageUploadField value={slide.imageUrl} onChange={(url) => updateSlide(i, { imageUrl: url })} pageSlug={pageSlug} label="Image de fond" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Texte bouton" value={slide.buttonText ?? ""} onChange={(e) => updateSlide(i, { buttonText: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Lien bouton" value={slide.buttonLink ?? ""} onChange={(e) => updateSlide(i, { buttonLink: e.target.value })} className="h-8 text-xs" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ slides: [...slides, { title: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un slide
      </Button>
    </div>
  );
}

// ── Service Grid ──────────────────────────────────────────────────────────────

export function ServiceGridEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "service_grid") return null;
  const services = block.services ?? [];
  const isImageCard = block.displayMode === "image-card";

  const updateService = (i: number, patch: Partial<typeof services[0]>) => {
    const next = [...services];
    next[i] = { ...next[i], ...patch };
    onChange({ services: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Colonnes">
        <Select value={String(block.columns ?? 3)} onValueChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 colonnes</SelectItem>
            <SelectItem value="3">3 colonnes</SelectItem>
            <SelectItem value="4">4 colonnes</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Mode d'affichage">
        <Select value={block.displayMode ?? "icon"} onValueChange={(v) => onChange({ displayMode: v as "icon" | "image-card" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="icon">Icône + texte (classique)</SelectItem>
            <SelectItem value="image-card">Image de fond (style BV)</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {isImageCard && (
        <FieldRow label="Hauteur des cartes">
          <Select value={block.cardHeight ?? "md"} onValueChange={(v) => onChange({ cardHeight: v as "sm" | "md" | "lg" })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">Petite (200px)</SelectItem>
              <SelectItem value="md">Moyenne (280px)</SelectItem>
              <SelectItem value="lg">Grande (360px)</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      )}
      {services.map((svc, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Service {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ services: services.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {isImageCard && (
            <ImageUploadField
              value={svc.imageUrl}
              onChange={(url) => updateService(i, { imageUrl: url })}
              pageSlug={pageSlug}
              label="Image de fond"
            />
          )}
          <FieldRow label="Icône"><IconPicker value={svc.icon} onChange={(v) => updateService(i, { icon: v })} /></FieldRow>
          <Input placeholder="Titre" value={svc.title} onChange={(e) => updateService(i, { title: e.target.value })} className="h-8 text-xs" />
          <Textarea placeholder="Description" rows={2} value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} className="text-xs" />
          <Input placeholder="Lien (optionnel)" value={svc.link ?? ""} onChange={(e) => updateService(i, { link: e.target.value })} className="h-8 text-xs" />
          <FieldRow label="Tags (séparés par virgule)">
            <Input
              value={(svc.features ?? []).join(", ")}
              onChange={(e) => updateService(i, { features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              className="h-8 text-xs"
            />
          </FieldRow>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ services: [...services, { icon: "Package", title: "", description: "", imageUrl: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un service
      </Button>
    </div>
  );
}

// ── Image + Text ──────────────────────────────────────────────────────────────

export function ImageTextEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "image_text") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Position de l'image">
        <Select value={block.imagePosition ?? "left"} onValueChange={(v) => onChange({ imagePosition: v as "left" | "right" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Gauche</SelectItem>
            <SelectItem value="right">Droite</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <ImageUploadField value={block.imageUrl} onChange={(url) => onChange({ imageUrl: url })} pageSlug={pageSlug} label="Image" />
      <FieldRow label="Alt texte image"><Input value={block.imageAlt ?? ""} onChange={(e) => onChange({ imageAlt: e.target.value })} className="h-8 text-xs" /></FieldRow>
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Texte"><Textarea rows={3} value={block.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} /></FieldRow>
      <FieldRow label="Texte bouton"><Input value={block.buttonText ?? ""} onChange={(e) => onChange({ buttonText: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Lien bouton"><Input value={block.buttonLink ?? ""} onChange={(e) => onChange({ buttonLink: e.target.value })} className="h-8" /></FieldRow>
    </div>
  );
}

// ── Video Embed ───────────────────────────────────────────────────────────────

export function VideoEmbedEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "video_embed") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="URL (YouTube/Vimeo)"><Input value={block.url ?? ""} onChange={(e) => onChange({ url: e.target.value })} className="h-8" placeholder="https://youtube.com/watch?v=..." /></FieldRow>
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Légende"><Input value={block.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Format">
        <Select value={block.aspectRatio ?? "16:9"} onValueChange={(v) => onChange({ aspectRatio: v as "16:9" | "4:3" | "1:1" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="16:9">16:9</SelectItem>
            <SelectItem value="4:3">4:3</SelectItem>
            <SelectItem value="1:1">1:1</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  );
}

// ── Icon Features ─────────────────────────────────────────────────────────────

export function IconFeaturesEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "icon_features") return null;
  const features = block.features ?? [];

  const updateFeat = (i: number, patch: Partial<typeof features[0]>) => {
    const next = [...features];
    next[i] = { ...next[i], ...patch };
    onChange({ features: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Colonnes">
        <Select value={String(block.columns ?? 3)} onValueChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {features.map((feat, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Avantage {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ features: features.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <FieldRow label="Icône"><IconPicker value={feat.icon} onChange={(v) => updateFeat(i, { icon: v })} /></FieldRow>
          <Input placeholder="Titre" value={feat.title} onChange={(e) => updateFeat(i, { title: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Description" value={feat.description} onChange={(e) => updateFeat(i, { description: e.target.value })} className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ features: [...features, { icon: "Star", title: "", description: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────

export function TestimonialsEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "testimonials") return null;
  const testimonials = block.testimonials ?? [];

  const update = (i: number, patch: Partial<typeof testimonials[0]>) => {
    const next = [...testimonials];
    next[i] = { ...next[i], ...patch };
    onChange({ testimonials: next });
  };

  return (
    <div className="space-y-3">
      {testimonials.map((t, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Témoignage {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ testimonials: testimonials.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Nom" value={t.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Rôle (optionnel)" value={t.role ?? ""} onChange={(e) => update(i, { role: e.target.value })} className="h-8 text-xs" />
          <Textarea placeholder="Citation" rows={2} value={t.quote} onChange={(e) => update(i, { quote: e.target.value })} className="text-xs" />
          <FieldRow label="Note (1-5)">
            <Select value={String(t.rating ?? "")} onValueChange={(v) => update(i, { rating: v ? Number(v) : undefined })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Aucune" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} étoile{n > 1 ? "s" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ testimonials: [...testimonials, { name: "", quote: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}

// ── Pricing Table ─────────────────────────────────────────────────────────────

export function PricingTableEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "pricing_table") return null;
  const plans = block.plans ?? [];

  const update = (i: number, patch: Partial<typeof plans[0]>) => {
    const next = [...plans];
    next[i] = { ...next[i], ...patch };
    onChange({ plans: next });
  };

  return (
    <div className="space-y-3">
      {plans.map((plan, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Forfait {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ plans: plans.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Nom" value={plan.name} onChange={(e) => update(i, { name: e.target.value })} className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Prix (ex: 9,90€)" value={plan.price} onChange={(e) => update(i, { price: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Période (ex: mois)" value={plan.period ?? ""} onChange={(e) => update(i, { period: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Mis en avant</Label>
            <Switch checked={plan.highlighted ?? false} onCheckedChange={(v) => update(i, { highlighted: v })} />
          </div>
          <FieldRow label="Avantages (1 par ligne)">
            <Textarea
              rows={3}
              value={plan.features.join("\n")}
              onChange={(e) => update(i, { features: e.target.value.split("\n") })}
              className="text-xs"
            />
          </FieldRow>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Texte bouton" value={plan.buttonText ?? ""} onChange={(e) => update(i, { buttonText: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Lien" value={plan.buttonLink ?? ""} onChange={(e) => update(i, { buttonLink: e.target.value })} className="h-8 text-xs" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ plans: [...plans, { name: "", price: "", features: [] }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un forfait
      </Button>
    </div>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────

export function SeparatorEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "separator") return null;
  return (
    <FieldRow label="Style">
      <Select value={block.style ?? "line"} onValueChange={(v) => onChange({ style: v as "line" | "dots" | "space" })}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="line">Ligne</SelectItem>
          <SelectItem value="dots">Points</SelectItem>
          <SelectItem value="space">Espace</SelectItem>
        </SelectContent>
      </Select>
    </FieldRow>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────

export function ImageEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "image") return null;
  return (
    <div className="space-y-3">
      <ImageUploadField value={block.url} onChange={(url) => onChange({ url })} pageSlug={pageSlug} label="Image" />
      <FieldRow label="Alt"><Input value={block.alt ?? ""} onChange={(e) => onChange({ alt: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Légende"><Input value={block.caption ?? ""} onChange={(e) => onChange({ caption: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Largeur">
        <Select value={block.width ?? "lg"} onValueChange={(v) => onChange({ width: v as "sm" | "md" | "lg" | "full" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Petite</SelectItem>
            <SelectItem value="md">Moyenne</SelectItem>
            <SelectItem value="lg">Grande</SelectItem>
            <SelectItem value="full">Pleine largeur</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Lien (optionnel)"><Input value={block.link ?? ""} onChange={(e) => onChange({ link: e.target.value })} className="h-8" /></FieldRow>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────

export function GalleryEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "gallery") return null;
  const images = block.images ?? [];
  return (
    <div className="space-y-3">
      <FieldRow label="Colonnes">
        <Select value={String(block.columns ?? 3)} onValueChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {images.map((img, i) => (
        <div key={i} className="border rounded-lg p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs">Image {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ images: images.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ImageUploadField
            value={img.url}
            onChange={(url) => {
              const next = [...images];
              next[i] = { ...next[i], url };
              onChange({ images: next });
            }}
            pageSlug={pageSlug}
          />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ images: [...images, { url: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une image
      </Button>
    </div>
  );
}

// ── Columns ───────────────────────────────────────────────────────────────────

const COLUMN_PRESETS = [
  { label: "50/50", widths: [50, 50] },
  { label: "33/33/33", widths: [33, 34, 33] },
  { label: "25/25/25/25", widths: [25, 25, 25, 25] },
  { label: "66/33", widths: [66, 34] },
  { label: "33/66", widths: [34, 66] },
  { label: "25/50/25", widths: [25, 50, 25] },
];

export function ColumnsEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "columns") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Disposition des colonnes">
        <div className="grid grid-cols-3 gap-2">
          {COLUMN_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                const cols = preset.widths.map((_, i) => block.layout.columns[i] ?? []);
                onChange({ layout: { widths: preset.widths, columns: cols } });
              }}
              className={`p-2 border rounded text-xs text-center hover:bg-muted ${
                JSON.stringify(block.layout.widths) === JSON.stringify(preset.widths)
                  ? "border-primary bg-primary/5"
                  : ""
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </FieldRow>
      <p className="text-xs text-muted-foreground">
        Le contenu des colonnes se gère dans l'aperçu. Cliquez sur une colonne pour y ajouter des blocs.
      </p>
    </div>
  );
}
