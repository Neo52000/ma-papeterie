import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Search, Sparkles, Globe, Eye, Trash2, Save,
  ExternalLink, CheckCircle2, LayoutDashboard, AlertCircle, Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminPages, useCreatePage, useUpdatePage, useDeletePage,
  usePublishPage, useGeneratePageContent,
  type StaticPage, type SchemaType, type ContentBlock, type GeneratedPageContent,
} from "@/hooks/useStaticPages";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SCHEMA_OPTIONS: { value: SchemaType; label: string }[] = [
  { value: "WebPage", label: "Page Web générique" },
  { value: "Service", label: "Service local" },
  { value: "FAQPage", label: "FAQ" },
  { value: "Article", label: "Article / Blog" },
  { value: "LocalBusiness", label: "Business local" },
  { value: "HowTo", label: "Guide pratique" },
];

const STATUS_CONFIG = {
  draft:     { label: "Brouillon",  variant: "secondary" as const, color: "text-muted-foreground" },
  published: { label: "Publié",     variant: "default"   as const, color: "text-green-600" },
  archived:  { label: "Archivé",    variant: "outline"   as const, color: "text-muted-foreground" },
};

function SeoScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 80 ? "bg-green-500/10 text-green-700" : score >= 50 ? "bg-yellow-500/10 text-yellow-700" : "bg-red-500/10 text-red-700";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}/100</span>;
}

function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return <p className={`font-semibold ${block.level === 2 ? "text-base" : "text-sm"}`}>{block.content}</p>;
    case "paragraph":
      return <p className="text-sm text-muted-foreground line-clamp-2">{block.content}</p>;
    case "list":
      return (
        <ul className="text-sm text-muted-foreground space-y-0.5 list-disc ml-4">
          {(block.items ?? []).slice(0, 3).map((it, i) => <li key={i}>{it}</li>)}
          {(block.items?.length ?? 0) > 3 && <li className="text-xs">+ {(block.items?.length ?? 0) - 3} autres...</li>}
        </ul>
      );
    case "faq":
      return (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">FAQ</span> — {(block.questions ?? []).length} question(s)
        </div>
      );
    case "cta":
      return (
        <div className="text-sm border rounded p-2 bg-primary/5">
          <span className="font-medium">{block.title}</span>
          {block.button && <span className="ml-2 text-xs text-primary">→ {block.button}</span>}
        </div>
      );
    default:
      return null;
  }
}

// ── Dialogue Génération IA ─────────────────────────────────────────────────────

function AiGenerateDialog({
  open,
  slug,
  onApply,
  onClose,
}: {
  open: boolean;
  slug: string;
  onApply: (data: GeneratedPageContent) => void;
  onClose: () => void;
}) {
  const [brief, setBrief] = useState("");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("Chaumont, Haute-Marne");
  const [schemaType, setSchemaType] = useState<SchemaType>("Service");
  const [tone, setTone] = useState<"professional" | "friendly" | "informative">("professional");
  const generate = useGeneratePageContent();

  const handleGenerate = async () => {
    if (!brief.trim()) { toast.error("Décrivez la page en quelques mots"); return; }
    try {
      const result = await generate.mutateAsync({
        slug,
        brief: brief.trim(),
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        location: location.trim() || "Chaumont, Haute-Marne",
        schema_type: schemaType,
        tone,
      });
      toast.success("Contenu généré avec succès !");
      onApply(result);
      onClose();
    } catch (e: any) {
      toast.error("Erreur génération IA", { description: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer avec l'IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Résumé de la page <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              placeholder="Ex: Page de présentation de notre service d'impression urgente à Chaumont, pour les particuliers et professionnels qui ont besoin de documents imprimés rapidement..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Mots-clés cibles <span className="text-xs text-muted-foreground">(séparés par virgule)</span></Label>
            <Input
              placeholder="impression urgente, Chaumont, document express, papeterie"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de schéma</Label>
              <Select value={schemaType} onValueChange={(v) => setSchemaType(v as SchemaType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMA_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Ton</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="friendly">Chaleureux</SelectItem>
                  <SelectItem value="informative">Informatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Localisation</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="gap-2">
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? "Génération en cours..." : "Générer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Éditeur de page ────────────────────────────────────────────────────────────

function PageEditor({ page, onClose }: { page: StaticPage | "new"; onClose: () => void }) {
  const isNew = page === "new";
  const initial: Partial<StaticPage> = isNew
    ? { slug: "", title: "", meta_title: "", meta_description: "", h1: "", content: [], schema_type: "WebPage", status: "draft", ai_generated: false }
    : { ...page };

  const [form, setForm] = useState<Partial<StaticPage>>(initial);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const publishPage = usePublishPage();

  const set = (k: keyof StaticPage, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.slug?.trim() || !form.title?.trim()) {
      toast.error("Slug et titre sont requis");
      return;
    }
    try {
      if (isNew) {
        await createPage.mutateAsync(form);
        toast.success("Page créée");
      } else {
        await updatePage.mutateAsync({ id: (page as StaticPage).id, ...form });
        toast.success("Page sauvegardée");
      }
      onClose();
    } catch (e: any) {
      toast.error("Erreur sauvegarde", { description: e.message });
    }
  };

  const handlePublish = async () => {
    if (isNew) { toast.error("Sauvegardez d'abord la page"); return; }
    try {
      await publishPage.mutateAsync({ id: (page as StaticPage).id, publish: form.status !== "published" });
      set("status", form.status === "published" ? "draft" : "published");
      toast.success(form.status === "published" ? "Page dépubliée" : "Page publiée !");
    } catch (e: any) {
      toast.error("Erreur publication", { description: e.message });
    }
  };

  const handleDelete = async () => {
    if (isNew) return;
    try {
      await deletePage.mutateAsync((page as StaticPage).id);
      toast.success("Page supprimée");
      onClose();
    } catch (e: any) {
      toast.error("Erreur suppression", { description: e.message });
    }
  };

  const handleAiApply = (data: { meta_title: string; meta_description: string; h1: string; content: ContentBlock[]; json_ld: Record<string, unknown>; seo_score: number }) => {
    setForm((f) => ({
      ...f,
      meta_title: data.meta_title,
      meta_description: data.meta_description,
      h1: data.h1,
      content: data.content,
      json_ld: data.json_ld,
      seo_score: data.seo_score,
      ai_generated: true,
    }));
  };

  const openJsonEditor = () => {
    setJsonText(JSON.stringify(form.content ?? [], null, 2));
    setJsonEditorOpen(true);
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      set("content", parsed);
      setJsonEditorOpen(false);
      toast.success("Contenu mis à jour");
    } catch {
      toast.error("JSON invalide");
    }
  };

  const metaTitleLen = (form.meta_title ?? "").length;
  const metaDescLen = (form.meta_description ?? "").length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b pb-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>← Retour</Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-sm">{isNew ? "Nouvelle page" : form.title}</span>
          {!isNew && <Badge variant={STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.variant ?? "secondary"}>{STATUS_CONFIG[form.status as keyof typeof STATUS_CONFIG]?.label ?? form.status}</Badge>}
          {!isNew && <SeoScoreBadge score={form.seo_score ?? null} />}
        </div>
        <div className="flex items-center gap-2">
          {!isNew && form.status === "published" && (
            <Button variant="outline" size="sm" asChild className="gap-1">
              <a href={`/p/${form.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Voir
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAiDialog(true)}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> IA
          </Button>
          <Button
            variant={form.status === "published" ? "outline" : "default"}
            size="sm"
            className="gap-1"
            onClick={handlePublish}
            disabled={isNew || publishPage.isPending}
          >
            <Globe className="h-3.5 w-3.5" />
            {form.status === "published" ? "Dépublier" : "Publier"}
          </Button>
          <Button size="sm" className="gap-1" onClick={handleSave} disabled={createPage.isPending || updatePage.isPending}>
            <Save className="h-3.5 w-3.5" /> Sauvegarder
          </Button>
        </div>
      </div>

      {/* Éditeur */}
      <Tabs defaultValue="meta" className="flex-1 overflow-auto">
        <TabsList className="mb-4">
          <TabsTrigger value="meta">Métadonnées SEO</TabsTrigger>
          <TabsTrigger value="content">Contenu ({(form.content ?? []).length} blocs)</TabsTrigger>
          <TabsTrigger value="schema">Schema JSON-LD</TabsTrigger>
        </TabsList>

        {/* Onglet Métadonnées */}
        <TabsContent value="meta" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Titre de la page <span className="text-destructive">*</span></Label>
              <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Impression urgente à Chaumont" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (URL) <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground shrink-0">/p/</span>
                <Input
                  value={form.slug ?? ""}
                  onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                  placeholder="impression-urgente"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Balise title SEO</span>
              <span className={`text-xs ${metaTitleLen > 65 ? "text-destructive" : metaTitleLen >= 45 ? "text-green-600" : "text-muted-foreground"}`}>
                {metaTitleLen}/60
              </span>
            </Label>
            <Input
              value={form.meta_title ?? ""}
              onChange={(e) => set("meta_title", e.target.value)}
              placeholder="Impression urgente Chaumont | Papeterie Reine & Fils"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center justify-between">
              <span>Meta description SEO</span>
              <span className={`text-xs ${metaDescLen > 165 ? "text-destructive" : metaDescLen >= 120 ? "text-green-600" : "text-muted-foreground"}`}>
                {metaDescLen}/160
              </span>
            </Label>
            <Textarea
              rows={3}
              value={form.meta_description ?? ""}
              onChange={(e) => set("meta_description", e.target.value)}
              placeholder="Impressions urgentes sans rendez-vous à Chaumont. Documents A4/A3, photocopies, affiches. Ouvert du lundi au samedi. Devis immédiat."
            />
          </div>

          <div className="space-y-1.5">
            <Label>H1 de la page</Label>
            <Input
              value={form.h1 ?? ""}
              onChange={(e) => set("h1", e.target.value)}
              placeholder="Votre service d'impression express à Chaumont"
            />
            <p className="text-xs text-muted-foreground">Peut différer du title SEO pour plus d'impact visuel</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type de schéma Schema.org</Label>
              <Select value={form.schema_type ?? "WebPage"} onValueChange={(v) => set("schema_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status ?? "draft"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(form.ai_generated || form.seo_score != null) && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-sm">
              {form.ai_generated && <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Généré par IA</Badge>}
              {form.seo_score != null && (
                <span className="flex items-center gap-1.5">
                  Score SEO : <SeoScoreBadge score={form.seo_score} />
                </span>
              )}
            </div>
          )}
        </TabsContent>

        {/* Onglet Contenu */}
        <TabsContent value="content" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(form.content ?? []).length === 0
                ? "Aucun bloc — utilisez ✨ IA pour générer ou éditez le JSON ci-dessous."
                : `${(form.content ?? []).length} bloc(s) de contenu`}
            </p>
            <Button variant="outline" size="sm" onClick={openJsonEditor} className="gap-1">
              <FileText className="h-3.5 w-3.5" /> Éditer le JSON
            </Button>
          </div>

          {(form.content ?? []).length > 0 && (
            <div className="space-y-2">
              {(form.content ?? []).map((block, i) => (
                <div key={i} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{block.type}</Badge>
                    {block.level && <Badge variant="outline" className="text-xs">H{block.level}</Badge>}
                  </div>
                  <BlockPreview block={block} />
                </div>
              ))}
            </div>
          )}

          {/* JSON editor dialog */}
          <Dialog open={jsonEditorOpen} onOpenChange={setJsonEditorOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Éditer les blocs (JSON)</DialogTitle>
              </DialogHeader>
              <Textarea
                className="font-mono text-xs min-h-[400px]"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setJsonEditorOpen(false)}>Annuler</Button>
                <Button onClick={applyJson}>Appliquer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onglet Schema JSON-LD */}
        <TabsContent value="schema" className="space-y-3">
          <p className="text-sm text-muted-foreground">Schema.org JSON-LD injecté dans le `&lt;head&gt;` de la page.</p>
          <Textarea
            className="font-mono text-xs min-h-[300px]"
            value={form.json_ld ? JSON.stringify(form.json_ld, null, 2) : ""}
            onChange={(e) => {
              try { set("json_ld", JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
            }}
            placeholder='{"@context":"https://schema.org","@type":"Service",...}'
          />
        </TabsContent>
      </Tabs>

      {/* Danger zone */}
      {!isNew && (
        <>
          <Separator className="my-4" />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer cette page
            </Button>
          </div>
        </>
      )}

      <AiGenerateDialog
        open={showAiDialog}
        slug={form.slug ?? ""}
        onApply={handleAiApply}
        onClose={() => setShowAiDialog(false)}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la page ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. La page sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AdminPages() {
  const { data: pages, isLoading } = useAdminPages();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<StaticPage | "new" | null>(null);

  const filtered = (pages ?? []).filter((p) => {
    const matchSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: pages?.length ?? 0,
    draft: pages?.filter((p) => p.status === "draft").length ?? 0,
    published: pages?.filter((p) => p.status === "published").length ?? 0,
    archived: pages?.filter((p) => p.status === "archived").length ?? 0,
  };

  if (selected !== null) {
    return (
      <AdminLayout title="Pages" description="CMS — Gestionnaire de pages statiques boostées IA">
        <PageEditor page={selected} onClose={() => setSelected(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Pages" description="CMS — Gestionnaire de pages statiques boostées IA">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 w-64"
                placeholder="Rechercher une page..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous ({counts.all})</SelectItem>
                <SelectItem value="published">Publiés ({counts.published})</SelectItem>
                <SelectItem value="draft">Brouillons ({counts.draft})</SelectItem>
                <SelectItem value="archived">Archivés ({counts.archived})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setSelected("new")} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle page
          </Button>
        </div>

        {/* Bannière IA */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Pages boostées IA — standards AI Search 2025</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Chaque page est optimisée pour Google AI Overview, Perplexity et les moteurs IA avec Schema.org JSON-LD, FAQ structurée et score SEO automatique.
              Cliquez sur <strong>✨ IA</strong> dans l'éditeur pour générer le contenu en quelques secondes.
            </p>
          </div>
        </div>

        {/* Liste des pages */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl">
            <FileText className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">{search ? "Aucune page trouvée" : "Aucune page pour l'instant"}</p>
            <p className="text-sm mt-1">
              {search ? "Essayez un autre terme" : "Créez votre première page en cliquant sur \"Nouvelle page\""}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((page) => {
              const cfg = STATUS_CONFIG[page.status] ?? STATUS_CONFIG.draft;
              return (
                <button
                  key={page.id}
                  onClick={() => setSelected(page)}
                  className="w-full text-left border rounded-xl p-4 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors shrink-0">
                        {page.status === "published" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : page.status === "archived" ? (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{page.title}</p>
                          {page.ai_generated && (
                            <Sparkles className="h-3 w-3 text-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">/p/{page.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <SeoScoreBadge score={page.seo_score} />
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(page.updated_at).toLocaleDateString("fr-FR")}
                      </span>
                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  {page.meta_description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1 pl-11">{page.meta_description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Stats footer */}
        {pages && pages.length > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1"><LayoutDashboard className="h-3 w-3" />{counts.all} pages</span>
            <span className="flex items-center gap-1 text-green-600"><Globe className="h-3 w-3" />{counts.published} publiées</span>
            <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" />{counts.draft} brouillons</span>
            <span className="ml-auto">{pages.filter((p) => p.ai_generated).length} générées par IA</span>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
