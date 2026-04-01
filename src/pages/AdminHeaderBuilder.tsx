import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Save, Plus, Trash2, Loader2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  useHeaderConfig, useUpdateHeaderConfig,
  DEFAULT_HEADER_CONFIG, type HeaderConfig,
} from "@/hooks/useSiteGlobals";
import { cn } from "@/lib/utils";

export default function AdminHeaderBuilder() {
  const { data: saved, isLoading } = useHeaderConfig();
  const update = useUpdateHeaderConfig();
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (saved) setConfig({ ...DEFAULT_HEADER_CONFIG, ...saved });
  }, [saved]);

  const set = <K extends keyof HeaderConfig>(key: K, value: HeaderConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    try {
      await update.mutateAsync(config);
      toast.success("Header sauvegardé");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Header Builder" description="Personnalisez l'en-tête du site">
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Header Builder" description="Personnalisez l'en-tête du site">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setViewMode("desktop")}><Monitor className="h-4 w-4" /></Button>
          <Button variant={viewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setViewMode("mobile")}><Smartphone className="h-4 w-4" /></Button>
        </div>
        <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[600px] border rounded-xl">
        <ResizablePanel defaultSize={40} minSize={30}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Top Bar */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Barre supérieure</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Activée</Label>
                    <Switch checked={config.topBarEnabled ?? true} onCheckedChange={(v) => set("topBarEnabled", v)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Téléphone</Label>
                    <Input value={config.topBarPhone ?? ""} onChange={(e) => set("topBarPhone", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input value={config.topBarEmail ?? ""} onChange={(e) => set("topBarEmail", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texte personnalisé</Label>
                    <Input value={config.topBarText ?? ""} onChange={(e) => set("topBarText", e.target.value)} className="h-8 text-xs" placeholder="Bienvenue chez Ma Papeterie" />
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Fonctionnalités</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ["searchEnabled", "Barre de recherche"],
                    ["cartEnabled", "Panier"],
                    ["wishlistEnabled", "Favoris"],
                    ["priceModeToggle", "Toggle prix B2B/B2C"],
                    ["themeToggle", "Toggle thème clair/sombre"],
                    ["megaMenuEnabled", "Méga menu catégories"],
                    ["stickyHeader", "Header fixe au scroll"],
                  ] as [keyof HeaderConfig, string][]).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs">{label}</Label>
                      <Switch checked={(config[key] as boolean) ?? true} onCheckedChange={(v) => set(key, v)} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Navigation Links */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Liens navigation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(config.navLinks ?? []).map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={link.label} onChange={(e) => {
                        const next = [...(config.navLinks ?? [])];
                        next[i] = { ...next[i], label: e.target.value };
                        set("navLinks", next);
                      }} className="h-8 text-xs" placeholder="Label" />
                      <Input value={link.href} onChange={(e) => {
                        const next = [...(config.navLinks ?? [])];
                        next[i] = { ...next[i], href: e.target.value };
                        set("navLinks", next);
                      }} className="h-8 text-xs" placeholder="/page" />
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
                        set("navLinks", (config.navLinks ?? []).filter((_, j) => j !== i));
                      }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => set("navLinks", [...(config.navLinks ?? []), { label: "", href: "" }])}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter un lien
                  </Button>
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Couleurs</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fond du header</Label>
                    <Input value={config.backgroundColor ?? ""} onChange={(e) => set("backgroundColor", e.target.value)} className="h-8 text-xs" placeholder="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Couleur du texte</Label>
                    <Input value={config.textColor ?? ""} onChange={(e) => set("textColor", e.target.value)} className="h-8 text-xs" placeholder="text-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full bg-gray-100 overflow-auto">
            <div className={cn("bg-white mx-auto transition-all", viewMode === "mobile" ? "max-w-[375px] border-x shadow-lg" : "w-full")}>
              {/* Preview */}
              <div className="border-b">
                {config.topBarEnabled && (
                  <div className="bg-primary/5 text-xs py-1.5 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {config.topBarPhone && <span>📞 {config.topBarPhone}</span>}
                      {config.topBarEmail && <span>✉️ {config.topBarEmail}</span>}
                    </div>
                    {config.topBarText && <span className="text-muted-foreground">{config.topBarText}</span>}
                  </div>
                )}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-lg">Ma Papeterie</span>
                    {viewMode === "desktop" && (
                      <nav className="flex gap-4">
                        {(config.navLinks ?? []).map((link, i) => (
                          <span key={i} className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                            {link.label || "—"}
                            {link.isNew && <Badge className="ml-1 text-[8px] py-0 px-1">NEW</Badge>}
                          </span>
                        ))}
                      </nav>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {config.searchEnabled && <span className="text-sm">🔍</span>}
                    {config.wishlistEnabled && <span className="text-sm">♡</span>}
                    {config.cartEnabled && <span className="text-sm">🛒</span>}
                    {config.themeToggle && <span className="text-sm">🌙</span>}
                  </div>
                </div>
                {config.megaMenuEnabled && viewMode === "desktop" && (
                  <div className="px-4 py-2 bg-muted/30 border-t text-xs text-muted-foreground flex gap-4">
                    <span>📁 Catégories (méga menu)</span>
                  </div>
                )}
              </div>

              {/* Page content placeholder */}
              <div className="p-8 space-y-4">
                <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />
                <div className="h-4 rounded bg-muted/30 w-3/4" />
                <div className="h-4 rounded bg-muted/30 w-1/2" />
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AdminLayout>
  );
}
