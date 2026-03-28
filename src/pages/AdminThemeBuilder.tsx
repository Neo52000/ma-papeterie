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
import { Slider } from "@/components/ui/slider";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Save, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  useThemeConfig, useUpdateThemeConfig,
  DEFAULT_THEME_CONFIG, type ThemeConfig,
} from "@/hooks/useSiteGlobals";

const FONT_OPTIONS = [
  "Poppins", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat",
  "Source Sans 3", "Nunito", "Raleway", "Work Sans",
];

export default function AdminThemeBuilder() {
  const { data: saved, isLoading } = useThemeConfig();
  const update = useUpdateThemeConfig();
  const [config, setConfig] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);

  useEffect(() => {
    if (saved) setConfig({ ...DEFAULT_THEME_CONFIG, ...saved });
  }, [saved]);

  const set = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const handleSave = async () => {
    try {
      await update.mutateAsync(config);
      toast.success("Thème sauvegardé");
    } catch (e) {
      toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_THEME_CONFIG);
    toast.info("Thème réinitialisé (non sauvegardé)");
  };

  if (isLoading) {
    return (
      <AdminLayout title="Theme Builder" description="Personnalisez l'apparence du site">
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  // Parse HSL for color preview
  const previewColor = (hsl: string) => {
    try { return `hsl(${hsl})`; } catch { return "#333"; }
  };

  return (
    <AdminLayout title="Theme Builder" description="Personnalisez l'apparence du site">
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button variant="outline" onClick={handleReset} className="gap-2"><RotateCcw className="h-4 w-4" /> Réinitialiser</Button>
        <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[600px] border rounded-xl">
        <ResizablePanel defaultSize={40} minSize={30}>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Colors */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Couleurs</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {([
                    ["primaryColor", "Couleur primaire", "Bleu profond — 215 85% 35%"],
                    ["secondaryColor", "Couleur secondaire", "Jaune doux — 45 95% 65%"],
                    ["accentColor", "Couleur accent", "CTA, boutons — 215 85% 35%"],
                  ] as [keyof ThemeConfig, string, string][]).map(([key, label, hint]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-2">
                        {label}
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: previewColor((config[key] as string) ?? "") }} />
                      </Label>
                      <Input value={(config[key] as string) ?? ""} onChange={(e) => set(key, e.target.value)} className="h-8 text-xs font-mono" placeholder={hint} />
                      <p className="text-[10px] text-muted-foreground">Format HSL : H S% L% (ex: {hint})</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Typographie</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Police du corps</Label>
                    <Select value={config.fontFamily ?? "Poppins"} onValueChange={(v) => set("fontFamily", v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Police des titres</Label>
                    <Select value={config.fontHeading ?? "Poppins"} onValueChange={(v) => set("fontHeading", v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Style */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Style</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Arrondi des coins : {config.borderRadius ?? "0.75rem"}</Label>
                    <Input value={config.borderRadius ?? "0.75rem"} onChange={(e) => set("borderRadius", e.target.value)} className="h-8 text-xs font-mono" placeholder="0.75rem" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Style des boutons</Label>
                    <div className="flex gap-2">
                      {(["rounded", "pill", "sharp"] as const).map((style) => (
                        <button
                          key={style}
                          onClick={() => set("buttonStyle", style)}
                          className={`px-4 py-2 text-xs border transition-all ${
                            config.buttonStyle === style ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                          } ${style === "pill" ? "rounded-full" : style === "sharp" ? "rounded-none" : "rounded-lg"}`}
                        >
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Options</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Animations au scroll</Label>
                    <Switch checked={config.animationsEnabled ?? true} onCheckedChange={(v) => set("animationsEnabled", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Mode sombre</Label>
                    <Switch checked={config.darkModeEnabled ?? true} onCheckedChange={(v) => set("darkModeEnabled", v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Custom CSS */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">CSS personnalisé</CardTitle></CardHeader>
                <CardContent>
                  <Textarea
                    rows={8}
                    value={config.customCss ?? ""}
                    onChange={(e) => set("customCss", e.target.value)}
                    className="text-xs font-mono"
                    placeholder={`:root {\n  --primary: ${config.primaryColor};\n}`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5">CSS injecté globalement dans le site.</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full bg-gray-100 overflow-auto">
            <div className="bg-white w-full p-8 space-y-8">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aperçu du thème</h2>

              {/* Colors preview */}
              <div>
                <h3 className="text-xs font-medium mb-3">Couleurs</h3>
                <div className="flex gap-3">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl shadow-sm" style={{ backgroundColor: previewColor(config.primaryColor ?? "") }} />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Primary</span>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl shadow-sm" style={{ backgroundColor: previewColor(config.secondaryColor ?? "") }} />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Secondary</span>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl shadow-sm" style={{ backgroundColor: previewColor(config.accentColor ?? "") }} />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Accent</span>
                  </div>
                </div>
              </div>

              {/* Typography preview */}
              <div>
                <h3 className="text-xs font-medium mb-3">Typographie</h3>
                <div className="space-y-2">
                  <h1 style={{ fontFamily: config.fontHeading }} className="text-2xl font-bold">Titre principal ({config.fontHeading})</h1>
                  <h2 style={{ fontFamily: config.fontHeading }} className="text-xl font-semibold">Sous-titre ({config.fontHeading})</h2>
                  <p style={{ fontFamily: config.fontFamily }} className="text-muted-foreground">
                    Corps de texte en {config.fontFamily}. Ma Papeterie est votre partenaire de confiance pour toutes vos fournitures de bureau.
                  </p>
                </div>
              </div>

              {/* Buttons preview */}
              <div>
                <h3 className="text-xs font-medium mb-3">Boutons</h3>
                <div className="flex gap-3 flex-wrap">
                  {(["rounded", "pill", "sharp"] as const).map((style) => (
                    <button
                      key={style}
                      className={`px-6 py-2.5 text-sm font-medium text-white ${
                        style === "pill" ? "rounded-full" : style === "sharp" ? "rounded-none" : "rounded-lg"
                      } ${config.buttonStyle === style ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: previewColor(config.primaryColor ?? "") }}
                    >
                      Bouton {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards preview */}
              <div>
                <h3 className="text-xs font-medium mb-3">Cartes</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border p-4 shadow-sm" style={{ borderRadius: config.borderRadius }}>
                      <div className="h-24 bg-muted mb-3" style={{ borderRadius: config.borderRadius }} />
                      <h4 style={{ fontFamily: config.fontHeading }} className="font-semibold text-sm">Produit {i}</h4>
                      <p style={{ fontFamily: config.fontFamily }} className="text-xs text-muted-foreground mt-1">Description courte</p>
                      <div className="mt-2 text-sm font-bold" style={{ color: previewColor(config.primaryColor ?? "") }}>12,90 €</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </AdminLayout>
  );
}
