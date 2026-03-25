import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft, Monitor, Smartphone, Save, Globe, Undo2, Redo2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";

import { useAdminPage, useUpdatePage, usePublishPage, type SchemaType, type PageLayout } from "@/hooks/useStaticPages";
import { cn } from "@/lib/utils";
import { usePageBuilderStore } from "@/stores/pageBuilderStore";

import { BlockPalette } from "@/components/page-builder/BlockPalette";
import { BlockList } from "@/components/page-builder/BlockList";
import { BlockSettingsPanel } from "@/components/page-builder/BlockSettingsPanel";
import { LivePreview } from "@/components/page-builder/LivePreview";

const SCHEMA_OPTIONS: { value: SchemaType; label: string }[] = [
  { value: "WebPage", label: "Page Web générique" },
  { value: "Service", label: "Service local" },
  { value: "FAQPage", label: "FAQ" },
  { value: "Article", label: "Article / Blog" },
  { value: "LocalBusiness", label: "Business local" },
  { value: "HowTo", label: "Guide pratique" },
];

export default function AdminPageBuilder() {
  const { id } = useParams<{ id: string }>();

  const { data: page, isLoading } = useAdminPage(id);
  const updatePage = useUpdatePage();
  const publishPage = usePublishPage();

  const store = usePageBuilderStore();
  const {
    blocks, isDirty, viewMode, activeTab,
    setPage, setBlocks, setViewMode, setActiveTab,
    undo, redo, undoStack, redoStack, markClean, reset,
    page: storePage, setPageField,
  } = store;

  const [jsonError, setJsonError] = useState(false);

  // Load page data into store
  useEffect(() => {
    if (page) {
      setPage(page);
      setBlocks(page.content ?? []);
    }
    return () => { reset(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!id || !storePage) return false;
    try {
      await updatePage.mutateAsync({
        id,
        title: storePage.title ?? "",
        slug: storePage.slug ?? "",
        meta_title: storePage.meta_title ?? null,
        meta_description: storePage.meta_description ?? null,
        h1: storePage.h1 ?? null,
        content: blocks,
        schema_type: storePage.schema_type ?? "WebPage",
        layout: storePage.layout ?? "article",
        json_ld: storePage.json_ld ?? null,
      });
      markClean();
      toast.success("Page sauvegardée");
      return true;
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : String(err) });
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, storePage, blocks]);

  const handlePublish = async () => {
    if (!id) return;
    const saved = await handleSave();
    if (!saved) return;
    try {
      await publishPage.mutateAsync({ id, publish: true });
      toast.success("Page publiée !");
    } catch (err) {
      toast.error("Erreur", { description: err instanceof Error ? err.message : String(err) });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Escape") {
        store.selectBlock(null);
      }
      if (e.key === "Delete" && store.selectedBlockId && !isEditorFocused()) {
        store.removeBlock(store.selectedBlockId);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSave, undo, redo]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Page introuvable</p>
        <Button asChild variant="outline">
          <Link to="/admin/pages">Retour aux pages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur z-20">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <Input
            value={storePage?.title ?? ""}
            onChange={(e) => setPageField("title", e.target.value)}
            className="h-8 text-sm font-semibold border-none bg-transparent px-1 focus-visible:ring-1"
            placeholder="Titre de la page"
          />
        </div>

        {isDirty && (
          <Badge variant="secondary" className="text-xs shrink-0">
            Non sauvegardé
          </Badge>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={undoStack.length === 0} title="Annuler (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={redoStack.length === 0} title="Refaire (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* View mode */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === "desktop" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setViewMode("desktop")}
            title="Bureau"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "mobile" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setViewMode("mobile")}
            title="Mobile"
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleSave} disabled={updatePage.isPending}>
          {updatePage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Sauver
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={publishPage.isPending}>
          {publishPage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
          Publier
        </Button>
      </div>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel — editor */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "blocks" | "settings" | "seo" | "schema")}
            className="h-full flex flex-col"
          >
            <TabsList className="mx-3 mt-2 grid grid-cols-4">
              <TabsTrigger value="blocks" className="text-xs">Blocs</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Réglages</TabsTrigger>
              <TabsTrigger value="seo" className="text-xs">SEO</TabsTrigger>
              <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Ajouter un bloc
                    </p>
                    <BlockPalette />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      Structure ({blocks.length} blocs)
                    </p>
                    <BlockList />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-hidden mt-0">
              <BlockSettingsPanel pageSlug={storePage?.slug} />
            </TabsContent>

            <TabsContent value="seo" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Slug</Label>
                    <Input
                      value={storePage?.slug ?? ""}
                      onChange={(e) => setPageField("slug", e.target.value)}
                      placeholder="mon-slug"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">H1 principal</Label>
                    <Input
                      value={storePage?.h1 ?? ""}
                      onChange={(e) => setPageField("h1", e.target.value)}
                      placeholder="Titre H1 de la page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Meta Title</Label>
                    <Input
                      value={storePage?.meta_title ?? ""}
                      onChange={(e) => setPageField("meta_title", e.target.value)}
                      placeholder="Titre pour les moteurs de recherche"
                    />
                    <p className="text-xs text-muted-foreground">{(storePage?.meta_title ?? "").length}/60</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Meta Description</Label>
                    <Textarea
                      value={storePage?.meta_description ?? ""}
                      onChange={(e) => setPageField("meta_description", e.target.value)}
                      placeholder="Description pour les moteurs de recherche"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">{(storePage?.meta_description ?? "").length}/160</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Layout</Label>
                    <Select
                      value={storePage?.layout ?? "article"}
                      onValueChange={(v) => setPageField("layout", v as PageLayout)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article (max-w-3xl)</SelectItem>
                        <SelectItem value="full-width">Pleine largeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="schema" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Type de schema</Label>
                    <Select
                      value={storePage?.schema_type ?? "WebPage"}
                      onValueChange={(v) => setPageField("schema_type", v as SchemaType)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCHEMA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">JSON-LD personnalisé</Label>
                    <Textarea
                      value={storePage?.json_ld ? JSON.stringify(storePage.json_ld, null, 2) : ""}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setPageField("json_ld", parsed);
                          setJsonError(false);
                        } catch {
                          setJsonError(true);
                        }
                      }}
                      rows={10}
                      className={cn("font-mono text-xs", jsonError && "border-destructive")}
                      placeholder='{"@context": "https://schema.org", ...}'
                    />
                    {jsonError && (
                      <p className="text-xs text-destructive">JSON invalide</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel — live preview */}
        <ResizablePanel defaultSize={65}>
          <LivePreview />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/** Returns true if an input, textarea, or contenteditable is focused */
function isEditorFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || (el as HTMLElement).isContentEditable;
}
