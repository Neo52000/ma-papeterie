import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Save, Plus, Trash2, Loader2, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import {
  useFooterConfig, useUpdateFooterConfig,
  DEFAULT_FOOTER_CONFIG, type FooterConfig,
} from "@/hooks/useSiteGlobals";
import { cn } from "@/lib/utils";

const SOCIAL_PLATFORMS = ["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok", "whatsapp", "pinterest"];

export default function AdminFooterBuilder() {
  const { data: saved, isLoading } = useFooterConfig();
  const update = useUpdateFooterConfig();
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (saved) setConfig({ ...DEFAULT_FOOTER_CONFIG, ...saved });
  }, [saved]);

  const set = <K extends keyof FooterConfig>(key: K, value: FooterConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    try {
      await update.mutateAsync(config);
      toast.success("Footer sauvegardé");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Footer Builder" description="Personnalisez le pied de page">
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Footer Builder" description="Personnalisez le pied de page">
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
              {/* Newsletter */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Newsletter</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Activée</Label>
                    <Switch checked={config.newsletterEnabled ?? true} onCheckedChange={(v) => set("newsletterEnabled", v)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Titre</Label>
                    <Input value={config.newsletterTitle ?? ""} onChange={(e) => set("newsletterTitle", e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input value={config.newsletterDescription ?? ""} onChange={(e) => set("newsletterDescription", e.target.value)} className="h-8 text-xs" />
                  </div>
                </CardContent>
              </Card>

              {/* Columns */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Colonnes de liens</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {(config.columns ?? []).map((col, ci) => (
                    <div key={ci} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Colonne {ci + 1}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => set("columns", config.columns.filter((_, j) => j !== ci))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input placeholder="Titre" value={col.title} onChange={(e) => {
                        const next = [...config.columns];
                        next[ci] = { ...next[ci], title: e.target.value };
                        set("columns", next);
                      }} className="h-8 text-xs" />
                      {col.links.map((link, li) => (
                        <div key={li} className="flex gap-1">
                          <Input value={link.label} onChange={(e) => {
                            const next = [...config.columns];
                            const links = [...next[ci].links];
                            links[li] = { ...links[li], label: e.target.value };
                            next[ci] = { ...next[ci], links };
                            set("columns", next);
                          }} placeholder="Label" className="h-7 text-xs" />
                          <Input value={link.href} onChange={(e) => {
                            const next = [...config.columns];
                            const links = [...next[ci].links];
                            links[li] = { ...links[li], href: e.target.value };
                            next[ci] = { ...next[ci], links };
                            set("columns", next);
                          }} placeholder="/page" className="h-7 text-xs" />
                          <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => {
                            const next = [...config.columns];
                            next[ci] = { ...next[ci], links: next[ci].links.filter((_, j) => j !== li) };
                            set("columns", next);
                          }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="gap-1 w-full" onClick={() => {
                        const next = [...config.columns];
                        next[ci] = { ...next[ci], links: [...next[ci].links, { label: "", href: "" }] };
                        set("columns", next);
                      }}><Plus className="h-3 w-3" /> Lien</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => set("columns", [...config.columns, { title: "", links: [] }])}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter une colonne
                  </Button>
                </CardContent>
              </Card>

              {/* Company info */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Informations société</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {([
                    ["companyName", "Nom"],
                    ["companyAddress", "Adresse"],
                    ["companyPhone", "Téléphone"],
                    ["companyEmail", "Email"],
                    ["companyHours", "Horaires"],
                    ["copyrightText", "Copyright"],
                  ] as [keyof FooterConfig, string][]).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <Input value={(config[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} className="h-8 text-xs" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Réseaux sociaux</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(config.socialLinks ?? []).map((link, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Select value={link.platform} onValueChange={(v) => {
                        const next = [...(config.socialLinks ?? [])];
                        next[i] = { ...next[i], platform: v };
                        set("socialLinks", next);
                      }}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SOCIAL_PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input value={link.url} onChange={(e) => {
                        const next = [...(config.socialLinks ?? [])];
                        next[i] = { ...next[i], url: e.target.value };
                        set("socialLinks", next);
                      }} className="h-8 text-xs flex-1" placeholder="https://..." />
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => set("socialLinks", (config.socialLinks ?? []).filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => set("socialLinks", [...(config.socialLinks ?? []), { platform: "facebook", url: "" }])}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full bg-gray-100 overflow-auto flex flex-col justify-end">
            <div className={cn("bg-white mx-auto transition-all", viewMode === "mobile" ? "max-w-[375px] border-x shadow-lg" : "w-full")}>
              {/* Newsletter preview */}
              {config.newsletterEnabled && (
                <div className="bg-primary text-primary-foreground p-6 text-center">
                  <h3 className="font-bold text-lg">{config.newsletterTitle}</h3>
                  <p className="text-sm opacity-80 mt-1">{config.newsletterDescription}</p>
                  <div className="flex gap-2 max-w-sm mx-auto mt-3">
                    <div className="flex-1 h-9 rounded bg-white/20" />
                    <div className="h-9 px-4 rounded bg-white/30 text-sm flex items-center">S'inscrire</div>
                  </div>
                </div>
              )}

              {/* Footer columns preview */}
              <div className="bg-slate-900 text-white p-6">
                <div className={cn("grid gap-6", viewMode === "mobile" ? "grid-cols-1" : `grid-cols-${Math.min(config.columns.length + 1, 4)}`)}>
                  <div>
                    <p className="font-bold mb-2">{config.companyName}</p>
                    <div className="text-xs text-white/60 space-y-1">
                      {config.companyAddress && <p>{config.companyAddress}</p>}
                      {config.companyPhone && <p>📞 {config.companyPhone}</p>}
                      {config.companyEmail && <p>✉️ {config.companyEmail}</p>}
                      {config.companyHours && <p>🕐 {config.companyHours}</p>}
                    </div>
                  </div>
                  {config.columns.map((col, i) => (
                    <div key={i}>
                      <p className="font-semibold text-sm mb-2">{col.title || "—"}</p>
                      <div className="space-y-1">
                        {col.links.map((link, j) => (
                          <p key={j} className="text-xs text-white/60 hover:text-white cursor-pointer">{link.label || "—"}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Social + copyright */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
                  <span>© {new Date().getFullYear()} {config.copyrightText}</span>
                  <div className="flex gap-3">
                    {(config.socialLinks ?? []).map((s, i) => (
                      <span key={i} className="capitalize">{s.platform}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AdminLayout>
  );
}
