import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";
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

// ── Pricing Detail (tariff grid) ─────────────────────────────────────────────

export function PricingDetailEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "pricing_detail") return null;
  const tables = block.tables ?? [];

  const updateTable = (ti: number, patch: Partial<typeof tables[0]>) => {
    const next = [...tables];
    next[ti] = { ...next[ti], ...patch };
    onChange({ tables: next });
  };

  const updateRow = (ti: number, ri: number, patch: Partial<typeof tables[0]["rows"][0]>) => {
    const next = [...tables];
    const rows = [...next[ti].rows];
    rows[ri] = { ...rows[ri], ...patch };
    next[ti] = { ...next[ti], rows };
    onChange({ tables: next });
  };

  const removeRow = (ti: number, ri: number) => {
    const next = [...tables];
    next[ti] = { ...next[ti], rows: next[ti].rows.filter((_, j) => j !== ri) };
    onChange({ tables: next });
  };

  const addRow = (ti: number) => {
    const next = [...tables];
    next[ti] = { ...next[ti], rows: [...next[ti].rows, { label: "", price_ht: null, display: "" }] };
    onChange({ tables: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre global">
        <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8 text-xs" />
      </FieldRow>

      {tables.map((table, ti) => (
        <div key={ti} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Tableau {ti + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ tables: tables.filter((_, j) => j !== ti) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Titre du tableau" value={table.title ?? ""} onChange={(e) => updateTable(ti, { title: e.target.value })} className="h-8 text-xs" />

          {table.rows.map((row, ri) => (
            <div key={ri} className="border rounded p-2 space-y-1 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Ligne {ri + 1}</span>
                <Button variant="ghost" size="sm" className="h-5 px-1" onClick={() => removeRow(ti, ri)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <Input placeholder="Libellé" value={row.label} onChange={(e) => updateRow(ti, ri, { label: e.target.value })} className="h-7 text-xs" />
              <div className="grid grid-cols-3 gap-1">
                <Input placeholder="Prix HT" type="number" step="0.01" value={row.price_ht ?? ""} onChange={(e) => updateRow(ti, ri, { price_ht: e.target.value ? parseFloat(e.target.value) : null })} className="h-7 text-xs" />
                <Input placeholder="Affichage (si pas de prix)" value={row.display} onChange={(e) => updateRow(ti, ri, { display: e.target.value })} className="h-7 text-xs" />
                <Input placeholder="Suffixe" value={row.suffix ?? ""} onChange={(e) => updateRow(ti, ri, { suffix: e.target.value })} className="h-7 text-xs" />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1 w-full" onClick={() => addRow(ti)}>
            <Plus className="h-3.5 w-3.5" /> Ligne
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ tables: [...tables, { title: "", rows: [] }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un tableau
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

// ── Promo Ticker ─────────────────────────────────────────────────────────────

export function PromoTickerEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "promo_ticker") return null;
  const items = block.items ?? [];

  const updateItem = (i: number, patch: Partial<typeof items[0]>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange({ items: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Vitesse (secondes)">
        <Input
          type="number"
          min={5}
          max={120}
          value={block.speed ?? 30}
          onChange={(e) => onChange({ speed: Number(e.target.value) || 30 })}
          className="h-8"
        />
      </FieldRow>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Message {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <FieldRow label="Icône"><IconPicker value={item.icon} onChange={(v) => updateItem(i, { icon: v })} /></FieldRow>
          <FieldRow label="Texte">
            <Input value={item.text} onChange={(e) => updateItem(i, { text: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ items: [...items, { icon: "Star", text: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un message
      </Button>
    </div>
  );
}

// ── Trust Strip ──────────────────────────────────────────────────────────────

export function TrustStripEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "trust_strip") return null;
  const items = block.items ?? [];

  const updateItem = (i: number, patch: Partial<typeof items[0]>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange({ items: next });
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Élément {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <FieldRow label="Icône">
            <IconPicker value={item.icon} onChange={(v) => updateItem(i, { icon: v })} />
          </FieldRow>
          <FieldRow label="Titre">
            <Input value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="Sous-titre">
            <Input value={item.subtitle} onChange={(e) => updateItem(i, { subtitle: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="Couleur CSS (optionnel)">
            <Input value={item.color ?? ""} onChange={(e) => updateItem(i, { color: e.target.value })} className="h-8 text-xs" placeholder="bg-primary/8 text-primary" />
          </FieldRow>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ items: [...items, { icon: "Star", title: "", subtitle: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}

// ── Promo Dual ───────────────────────────────────────────────────────────────

export function PromoDualEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "promo_dual") return null;
  const cards = block.cards ?? [];

  const updateCard = (i: number, patch: Partial<typeof cards[0]>) => {
    const next = [...cards];
    next[i] = { ...next[i], ...patch };
    onChange({ cards: next });
  };

  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Carte {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ cards: cards.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <FieldRow label="Label (petit texte)">
            <Input value={card.label} onChange={(e) => updateCard(i, { label: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="Titre">
            <Input value={card.title} onChange={(e) => updateCard(i, { title: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="Texte du bouton">
            <Input value={card.buttonText} onChange={(e) => updateCard(i, { buttonText: e.target.value })} className="h-8 text-xs" />
          </FieldRow>
          <FieldRow label="Lien du bouton">
            <Input value={card.buttonLink} onChange={(e) => updateCard(i, { buttonLink: e.target.value })} className="h-8 text-xs" placeholder="/catalogue" />
          </FieldRow>
          <FieldRow label="Couleur de fond (hex)">
            <div className="flex gap-2 items-center">
              <input type="color" value={card.bgColor} onChange={(e) => updateCard(i, { bgColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={card.bgColor} onChange={(e) => updateCard(i, { bgColor: e.target.value })} className="h-8 text-xs flex-1" placeholder="#1e3a8a" />
            </div>
          </FieldRow>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ cards: [...cards, { label: "", title: "", buttonText: "Découvrir", buttonLink: "/", bgColor: "#1e3a8a" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une carte
      </Button>
    </div>
  );
}

// ── Best Sellers ─────────────────────────────────────────────────────────────

export function BestSellersEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "best_sellers") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre">
        <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" placeholder="Les indispensables du moment" />
      </FieldRow>
      <FieldRow label="Sous-titre">
        <Input value={block.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} className="h-8" placeholder="Les favoris de nos clients..." />
      </FieldRow>
      <FieldRow label="Nombre de produits (max)">
        <Input type="number" min={2} max={16} value={block.maxProducts ?? 8} onChange={(e) => onChange({ maxProducts: Number(e.target.value) })} className="h-8" />
      </FieldRow>
      <FieldRow label="Lien catalogue">
        <Input value={block.catalogueLink ?? ""} onChange={(e) => onChange({ catalogueLink: e.target.value })} className="h-8" placeholder="/catalogue" />
      </FieldRow>
      <p className="text-xs text-muted-foreground">Ce bloc affiche automatiquement les meilleures ventes depuis la base produits.</p>
    </div>
  );
}

// ── B2B Section ──────────────────────────────────────────────────────────────

export function B2BSectionEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "b2b_section") return null;
  const benefits = block.benefits ?? [];

  const updateBenefit = (i: number, patch: Partial<typeof benefits[0]>) => {
    const next = [...benefits];
    next[i] = { ...next[i], ...patch };
    onChange({ benefits: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Label">
        <Input value={block.label ?? ""} onChange={(e) => onChange({ label: e.target.value })} className="h-8" placeholder="Professionnels" />
      </FieldRow>
      <FieldRow label="Titre">
        <Textarea rows={2} value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="Simplifiez vos achats..." />
      </FieldRow>
      <FieldRow label="CTA texte">
        <Input value={block.ctaText ?? ""} onChange={(e) => onChange({ ctaText: e.target.value })} className="h-8" placeholder="Créer mon compte Pro" />
      </FieldRow>
      <FieldRow label="CTA lien">
        <Input value={block.ctaLink ?? ""} onChange={(e) => onChange({ ctaLink: e.target.value })} className="h-8" placeholder="/inscription-pro" />
      </FieldRow>
      <FieldRow label="Titre formulaire">
        <Input value={block.formTitle ?? ""} onChange={(e) => onChange({ formTitle: e.target.value })} className="h-8" placeholder="Devis gratuit en 1 heure" />
      </FieldRow>

      <Label className="text-xs">Avantages</Label>
      {benefits.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="w-24 shrink-0">
            <IconPicker value={b.icon} onChange={(v) => updateBenefit(i, { icon: v })} />
          </div>
          <Input value={b.text} onChange={(e) => updateBenefit(i, { text: e.target.value })} className="h-8 text-xs flex-1" />
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onChange({ benefits: benefits.filter((_, j) => j !== i) })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ benefits: [...benefits, { icon: "Star", text: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un avantage
      </Button>
    </div>
  );
}

// ── SEO Content ──────────────────────────────────────────────────────────────

export function SeoContentEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "seo_content") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre">
        <Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" />
      </FieldRow>
      <FieldRow label="Contenu HTML">
        <Textarea rows={12} value={block.html ?? ""} onChange={(e) => onChange({ html: e.target.value })} className="text-xs font-mono" placeholder="<p>Bienvenue chez <strong>Ma Papeterie</strong>...</p>" />
      </FieldRow>
      <p className="text-xs text-muted-foreground">Le HTML sera nettoyé automatiquement (les scripts et iframes sont supprimés).</p>
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

// ══════════════════════════════════════════════════════════════════════════════
// NEW BLOCK EDITORS (Phase 2)
// ══════════════════════════════════════════════════════════════════════════════

// ── Contact Form ────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Téléphone" },
  { value: "textarea", label: "Zone de texte" },
  { value: "select", label: "Liste déroulante" },
];

export function ContactFormEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "contact_form") return null;
  const fields = block.fields ?? [];

  const updateField = (i: number, patch: Partial<typeof fields[0]>) => {
    const next = [...fields];
    next[i] = { ...next[i], ...patch };
    onChange({ fields: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Description"><Textarea rows={2} value={block.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} /></FieldRow>
      <FieldRow label="Texte du bouton"><Input value={block.submitText ?? "Envoyer"} onChange={(e) => onChange({ submitText: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Message de succès"><Input value={block.successMessage ?? ""} onChange={(e) => onChange({ successMessage: e.target.value })} className="h-8" placeholder="Merci, votre message a été envoyé !" /></FieldRow>

      <Label className="text-xs font-semibold">Champs</Label>
      {fields.map((field, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Champ {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ fields: fields.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as typeof field.type })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Label" className="h-8 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Requis</Label>
            <Switch checked={field.required ?? false} onCheckedChange={(v) => updateField(i, { required: v })} />
          </div>
          {field.type === "select" && (
            <FieldRow label="Options (1 par ligne)">
              <Textarea rows={3} value={(field.options ?? []).join("\n")} onChange={(e) => updateField(i, { options: e.target.value.split("\n") })} className="text-xs" />
            </FieldRow>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ fields: [...fields, { type: "text", label: "", required: false }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un champ
      </Button>
    </div>
  );
}

// ── Map Embed ───────────────────────────────────────────────────────────────

export function MapEmbedEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "map_embed") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Adresse"><Input value={block.address ?? ""} onChange={(e) => onChange({ address: e.target.value })} className="h-8" placeholder="10 rue Toupot de Beveaux, 52000 Chaumont" /></FieldRow>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Latitude"><Input type="number" step="0.0001" value={block.lat ?? ""} onChange={(e) => onChange({ lat: e.target.value ? parseFloat(e.target.value) : undefined })} className="h-8 text-xs" /></FieldRow>
        <FieldRow label="Longitude"><Input type="number" step="0.0001" value={block.lng ?? ""} onChange={(e) => onChange({ lng: e.target.value ? parseFloat(e.target.value) : undefined })} className="h-8 text-xs" /></FieldRow>
      </div>
      <FieldRow label="Zoom (1-20)"><Input type="number" min={1} max={20} value={block.zoom ?? 15} onChange={(e) => onChange({ zoom: Number(e.target.value) })} className="h-8" /></FieldRow>
      <FieldRow label="Hauteur (px)"><Input type="number" min={200} max={800} value={block.height ?? 400} onChange={(e) => onChange({ height: Number(e.target.value) })} className="h-8" /></FieldRow>
    </div>
  );
}

// ── Countdown ───────────────────────────────────────────────────────────────

export function CountdownEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "countdown") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Date cible"><Input type="datetime-local" value={block.targetDate?.slice(0, 16) ?? ""} onChange={(e) => onChange({ targetDate: new Date(e.target.value).toISOString() })} className="h-8" /></FieldRow>
      <FieldRow label="Message de fin"><Input value={block.endMessage ?? ""} onChange={(e) => onChange({ endMessage: e.target.value })} className="h-8" placeholder="L'offre est terminée !" /></FieldRow>
      <FieldRow label="Style">
        <Select value={block.style ?? "cards"} onValueChange={(v) => onChange({ style: v as "cards" | "inline" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cards">Cartes</SelectItem>
            <SelectItem value="inline">En ligne</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  );
}

// ── Tabs Block ──────────────────────────────────────────────────────────────

export function TabsBlockEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "tabs_block") return null;
  const tabs = block.tabs ?? [];

  const updateTab = (i: number, patch: Partial<typeof tabs[0]>) => {
    const next = [...tabs];
    next[i] = { ...next[i], ...patch };
    onChange({ tabs: next });
  };

  return (
    <div className="space-y-3">
      {tabs.map((tab, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Onglet {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ tabs: tabs.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Titre" value={tab.title} onChange={(e) => updateTab(i, { title: e.target.value })} className="h-8 text-xs" />
          <Textarea placeholder="Contenu" rows={3} value={tab.content} onChange={(e) => updateTab(i, { content: e.target.value })} className="text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ tabs: [...tabs, { title: "", content: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un onglet
      </Button>
    </div>
  );
}

// ── Accordion ───────────────────────────────────────────────────────────────

export function AccordionEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "accordion") return null;
  const items = block.items ?? [];

  const updateItem = (i: number, patch: Partial<typeof items[0]>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange({ items: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Plusieurs ouverts</Label>
        <Switch checked={block.allowMultiple ?? false} onCheckedChange={(v) => onChange({ allowMultiple: v })} />
      </div>
      {items.map((item, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Section {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ items: items.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Titre" value={item.title} onChange={(e) => updateItem(i, { title: e.target.value })} className="h-8 text-xs" />
          <Textarea placeholder="Contenu" rows={3} value={item.content} onChange={(e) => updateItem(i, { content: e.target.value })} className="text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ items: [...items, { title: "", content: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une section
      </Button>
    </div>
  );
}

// ── Product Grid ────────────────────────────────────────────────────────────

export function ProductGridEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "product_grid") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Slug catégorie (optionnel)"><Input value={block.categorySlug ?? ""} onChange={(e) => onChange({ categorySlug: e.target.value })} className="h-8 text-xs" placeholder="fournitures-scolaires" /></FieldRow>
      <FieldRow label="Nombre de produits">
        <Input type="number" min={2} max={24} value={block.maxProducts ?? 8} onChange={(e) => onChange({ maxProducts: Number(e.target.value) })} className="h-8" />
      </FieldRow>
      <FieldRow label="Colonnes">
        <Select value={String(block.columns ?? 4)} onValueChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <p className="text-xs text-muted-foreground">Affiche dynamiquement les produits depuis la base de données.</p>
    </div>
  );
}

// ── Category Grid ───────────────────────────────────────────────────────────

export function CategoryGridEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "category_grid") return null;
  const categories = block.categories ?? [];

  const updateCat = (i: number, patch: Partial<typeof categories[0]>) => {
    const next = [...categories];
    next[i] = { ...next[i], ...patch };
    onChange({ categories: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Colonnes">
        <Select value={String(block.columns ?? 4)} onValueChange={(v) => onChange({ columns: Number(v) as 2 | 3 | 4 })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {categories.map((cat, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Catégorie {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ categories: categories.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input placeholder="Nom" value={cat.name} onChange={(e) => updateCat(i, { name: e.target.value })} className="h-8 text-xs" />
          <ImageUploadField value={cat.imageUrl} onChange={(url) => updateCat(i, { imageUrl: url })} pageSlug={pageSlug} label="Image" />
          <Input placeholder="Lien" value={cat.link} onChange={(e) => updateCat(i, { link: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Description (optionnel)" value={cat.description ?? ""} onChange={(e) => updateCat(i, { description: e.target.value })} className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ categories: [...categories, { name: "", link: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une catégorie
      </Button>
    </div>
  );
}

// ── Newsletter ──────────────────────────────────────────────────────────────

export function NewsletterEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "newsletter") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Description"><Textarea rows={2} value={block.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} /></FieldRow>
      <FieldRow label="Texte du bouton"><Input value={block.buttonText ?? "S'inscrire"} onChange={(e) => onChange({ buttonText: e.target.value })} className="h-8" /></FieldRow>
    </div>
  );
}

// ── Stats Counter ───────────────────────────────────────────────────────────

export function StatsCounterEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "stats_counter") return null;
  const stats = block.stats ?? [];

  const updateStat = (i: number, patch: Partial<typeof stats[0]>) => {
    const next = [...stats];
    next[i] = { ...next[i], ...patch };
    onChange({ stats: next });
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
      {stats.map((stat, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Compteur {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ stats: stats.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input type="number" placeholder="Valeur" value={stat.value} onChange={(e) => updateStat(i, { value: Number(e.target.value) })} className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Préfixe" value={stat.prefix ?? ""} onChange={(e) => updateStat(i, { prefix: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Suffixe (ex: +, ans)" value={stat.suffix ?? ""} onChange={(e) => updateStat(i, { suffix: e.target.value })} className="h-8 text-xs" />
          </div>
          <Input placeholder="Label" value={stat.label} onChange={(e) => updateStat(i, { label: e.target.value })} className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ stats: [...stats, { value: 0, label: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}

// ── Team Grid ───────────────────────────────────────────────────────────────

export function TeamGridEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "team_grid") return null;
  const members = block.members ?? [];

  const updateMember = (i: number, patch: Partial<typeof members[0]>) => {
    const next = [...members];
    next[i] = { ...next[i], ...patch };
    onChange({ members: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
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
      {members.map((m, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Membre {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ members: members.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ImageUploadField value={m.photoUrl} onChange={(url) => updateMember(i, { photoUrl: url })} pageSlug={pageSlug} label="Photo" />
          <Input placeholder="Nom" value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Rôle" value={m.role} onChange={(e) => updateMember(i, { role: e.target.value })} className="h-8 text-xs" />
          <Textarea placeholder="Bio (optionnel)" rows={2} value={m.bio ?? ""} onChange={(e) => updateMember(i, { bio: e.target.value })} className="text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ members: [...members, { name: "", role: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un membre
      </Button>
    </div>
  );
}

// ── Logo Carousel ───────────────────────────────────────────────────────────

export function LogoCarouselEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "logo_carousel") return null;
  const logos = block.logos ?? [];

  const updateLogo = (i: number, patch: Partial<typeof logos[0]>) => {
    const next = [...logos];
    next[i] = { ...next[i], ...patch };
    onChange({ logos: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Vitesse (secondes)">
        <Input type="number" min={5} max={120} value={block.speed ?? 30} onChange={(e) => onChange({ speed: Number(e.target.value) })} className="h-8" />
      </FieldRow>
      {logos.map((logo, i) => (
        <div key={i} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Logo {i + 1}</span>
            <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => onChange({ logos: logos.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ImageUploadField value={logo.url} onChange={(url) => updateLogo(i, { url })} pageSlug={pageSlug} label="Logo" />
          <Input placeholder="Alt texte" value={logo.alt} onChange={(e) => updateLogo(i, { alt: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Lien (optionnel)" value={logo.link ?? ""} onChange={(e) => updateLogo(i, { link: e.target.value })} className="h-8 text-xs" />
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ logos: [...logos, { url: "", alt: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter un logo
      </Button>
    </div>
  );
}

// ── Promo Banner ────────────────────────────────────────────────────────────

export function PromoBannerEditor({ block, onChange, pageSlug }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void; pageSlug?: string }) {
  if (block.type !== "promo_banner") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="Titre"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Sous-titre"><Input value={block.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} className="h-8" /></FieldRow>
      <ImageUploadField value={block.imageUrl} onChange={(url) => onChange({ imageUrl: url })} pageSlug={pageSlug} label="Image de fond" />
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Texte bouton"><Input value={block.buttonText ?? ""} onChange={(e) => onChange({ buttonText: e.target.value })} className="h-8 text-xs" /></FieldRow>
        <FieldRow label="Lien bouton"><Input value={block.buttonLink ?? ""} onChange={(e) => onChange({ buttonLink: e.target.value })} className="h-8 text-xs" /></FieldRow>
      </div>
      <FieldRow label="Countdown (optionnel)"><Input type="datetime-local" value={block.countdownDate?.slice(0, 16) ?? ""} onChange={(e) => onChange({ countdownDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="h-8" /></FieldRow>
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Couleur fond">
          <div className="flex gap-2 items-center">
            <input type="color" value={block.bgColor ?? "#1e3a8a"} onChange={(e) => onChange({ bgColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
            <Input value={block.bgColor ?? ""} onChange={(e) => onChange({ bgColor: e.target.value })} className="h-8 text-xs flex-1" />
          </div>
        </FieldRow>
        <FieldRow label="Couleur texte">
          <div className="flex gap-2 items-center">
            <input type="color" value={block.textColor ?? "#ffffff"} onChange={(e) => onChange({ textColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
            <Input value={block.textColor ?? ""} onChange={(e) => onChange({ textColor: e.target.value })} className="h-8 text-xs flex-1" />
          </div>
        </FieldRow>
      </div>
    </div>
  );
}

// ── HTML Custom ─────────────────────────────────────────────────────────────

export function HtmlCustomEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "html_custom") return null;
  return (
    <div className="space-y-3">
      <FieldRow label="HTML">
        <Textarea rows={10} value={block.html ?? ""} onChange={(e) => onChange({ html: e.target.value })} className="text-xs font-mono" placeholder="<div class='my-custom'>\n  ...\n</div>" />
      </FieldRow>
      <FieldRow label="CSS (optionnel)">
        <Textarea rows={5} value={block.css ?? ""} onChange={(e) => onChange({ css: e.target.value })} className="text-xs font-mono" placeholder=".my-custom {\n  color: red;\n}" />
      </FieldRow>
      <p className="text-xs text-muted-foreground">Le HTML sera nettoyé automatiquement (scripts supprimés). Le CSS est scopé au bloc.</p>
    </div>
  );
}

// ── Spacer ───────────────────────────────────────────────────────────────────

export function SpacerEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "spacer") return null;
  return (
    <div className="space-y-3">
      <FieldRow label={`Hauteur : ${block.height ?? 48}${block.unit ?? "px"}`}>
        <Slider
          value={[block.height ?? 48]}
          onValueChange={([v]) => onChange({ height: v })}
          min={8}
          max={200}
          step={4}
        />
      </FieldRow>
      <FieldRow label="Unité">
        <Select value={block.unit ?? "px"} onValueChange={(v) => onChange({ unit: v as "px" | "rem" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="px">Pixels (px)</SelectItem>
            <SelectItem value="rem">REM</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  );
}

// ── Social Links ────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = ["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok", "whatsapp", "pinterest"];

export function SocialLinksEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type !== "social_links") return null;
  const links = block.links ?? [];

  const updateLink = (i: number, patch: Partial<typeof links[0]>) => {
    const next = [...links];
    next[i] = { ...next[i], ...patch };
    onChange({ links: next });
  };

  return (
    <div className="space-y-3">
      <FieldRow label="Titre (optionnel)"><Input value={block.title ?? ""} onChange={(e) => onChange({ title: e.target.value })} className="h-8" /></FieldRow>
      <FieldRow label="Style">
        <Select value={block.style ?? "colored"} onValueChange={(v) => onChange({ style: v as "icons" | "buttons" | "colored" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="icons">Icônes simples</SelectItem>
            <SelectItem value="buttons">Boutons</SelectItem>
            <SelectItem value="colored">Coloré</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Alignement">
        <Select value={block.alignment ?? "center"} onValueChange={(v) => onChange({ alignment: v as "left" | "center" | "right" })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Gauche</SelectItem>
            <SelectItem value="center">Centre</SelectItem>
            <SelectItem value="right">Droite</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Select value={link.platform} onValueChange={(v) => updateLink(i, { platform: v })}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} placeholder="https://..." className="h-8 text-xs flex-1" />
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onChange({ links: links.filter((_, j) => j !== i) })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="gap-1" onClick={() => onChange({ links: [...links, { platform: "facebook", url: "" }] })}>
        <Plus className="h-3.5 w-3.5" /> Ajouter
      </Button>
    </div>
  );
}
