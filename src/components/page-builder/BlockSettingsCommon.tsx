import type { BlockSettings } from "@/hooks/useStaticPages";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const BG_OPTIONS = [
  { label: "Aucun", value: "", preview: "bg-background border" },
  { label: "Gris", value: "bg-muted/30", preview: "bg-muted/50" },
  { label: "Primary", value: "bg-primary/5", preview: "bg-primary/20" },
  { label: "Accent", value: "bg-primary text-primary-foreground", preview: "bg-primary" },
  { label: "Sombre", value: "bg-slate-900 text-white", preview: "bg-slate-900" },
];

const PADDING_OPTIONS = [
  { label: "0", value: "none" },
  { label: "S", value: "sm" },
  { label: "M", value: "md" },
  { label: "L", value: "lg" },
  { label: "XL", value: "xl" },
];

const VISIBILITY_OPTIONS = [
  { label: "Tous", value: "all" },
  { label: "Desktop", value: "desktop" },
  { label: "Tablette", value: "tablet" },
  { label: "Mobile", value: "mobile" },
];

const MARGIN_OPTIONS = [
  { label: "0", value: "none" },
  { label: "S", value: "sm" },
  { label: "M", value: "md" },
  { label: "L", value: "lg" },
  { label: "XL", value: "xl" },
];

interface BlockSettingsCommonProps {
  settings: BlockSettings;
  onChange: (settings: BlockSettings) => void;
}

export function BlockSettingsCommon({ settings, onChange }: BlockSettingsCommonProps) {
  const set = (patch: Partial<BlockSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-4 pt-4 border-t">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apparence</p>

      {/* Background */}
      <div className="space-y-1.5">
        <Label className="text-xs">Fond</Label>
        <div className="flex gap-2">
          {BG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => set({ backgroundColor: opt.value })}
              className={`w-7 h-7 rounded-full ${opt.preview} ${
                (settings.backgroundColor ?? "") === opt.value
                  ? "ring-2 ring-primary ring-offset-1"
                  : "ring-1 ring-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-1.5">
        <Label className="text-xs">Espacement vertical</Label>
        <div className="flex gap-1">
          {PADDING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ padding: opt.value as BlockSettings["padding"] })}
              className={`px-3 py-1 text-xs rounded-md border ${
                (settings.padding ?? "none") === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <Label className="text-xs">Visibilité</Label>
        <div className="flex gap-1">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ visibility: opt.value as BlockSettings["visibility"] })}
              className={`px-3 py-1 text-xs rounded-md border ${
                (settings.visibility ?? "all") === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anchor */}
      <div className="space-y-1.5">
        <Label className="text-xs">Ancre HTML (id)</Label>
        <Input
          value={settings.anchor ?? ""}
          onChange={(e) => set({ anchor: e.target.value })}
          placeholder="ex: services"
          className="h-8 text-xs"
        />
      </div>

      {/* Margin top */}
      <div className="space-y-1.5">
        <Label className="text-xs">Marge haute</Label>
        <div className="flex gap-1">
          {MARGIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ marginTop: opt.value as BlockSettings["marginTop"] })}
              className={`px-3 py-1 text-xs rounded-md border ${
                (settings.marginTop ?? "none") === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Margin bottom */}
      <div className="space-y-1.5">
        <Label className="text-xs">Marge basse</Label>
        <div className="flex gap-1">
          {MARGIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set({ marginBottom: opt.value as BlockSettings["marginBottom"] })}
              className={`px-3 py-1 text-xs rounded-md border ${
                (settings.marginBottom ?? "none") === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom class */}
      <div className="space-y-1.5">
        <Label className="text-xs">Classes CSS personnalisées</Label>
        <Input
          value={settings.customClass ?? ""}
          onChange={(e) => set({ customClass: e.target.value })}
          placeholder="ex: bg-gradient-to-r from-blue-50 to-white"
          className="h-8 text-xs font-mono"
        />
      </div>
    </div>
  );
}
