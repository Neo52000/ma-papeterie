import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import {
  INK_COLORS,
  CASE_COLORS,
  INK_COLOR_LABELS,
  CASE_COLOR_LABELS,
} from "@/components/stamp-designer/constants";
import { cn } from "@/lib/utils";

interface StampColorPickerProps {
  mode?: "ink" | "case" | "both";
}

export function StampColorPicker({ mode = "both" }: StampColorPickerProps) {
  const inkColor = useStampDesignerStore((s) => s.inkColor);
  const caseColor = useStampDesignerStore((s) => s.caseColor);
  const setInkColor = useStampDesignerStore((s) => s.setInkColor);
  const setCaseColor = useStampDesignerStore((s) => s.setCaseColor);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);

  const availableInkColors = selectedModel?.available_ink_colors ?? [];
  const availableCaseColors = selectedModel?.available_case_colors ?? [];

  return (
    <div className="space-y-4">
      {/* Ink color */}
      {(mode === "ink" || mode === "both") && (
        <div className="space-y-2">
          {mode === "both" && (
            <h3 className="text-sm font-medium">Couleur d&apos;encre</h3>
          )}
          <div className="flex flex-wrap gap-3">
            {availableInkColors.map((colorKey) => {
              const hex = INK_COLORS[colorKey] ?? "#888";
              const label = INK_COLOR_LABELS[colorKey] ?? colorKey;
              const isSelected = inkColor === colorKey;

              return (
                <button
                  key={colorKey}
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={() => setInkColor(colorKey)}
                  aria-label={label}
                >
                  <span
                    className={cn(
                      "block h-8 w-8 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-transparent hover:border-muted-foreground/40",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Case color */}
      {(mode === "case" || mode === "both") && (
        <div className="space-y-2">
          {mode === "both" && (
            <h3 className="text-sm font-medium">Couleur du boîtier</h3>
          )}
          <div className="flex flex-wrap gap-3">
            {availableCaseColors.map((colorKey) => {
              const hex = CASE_COLORS[colorKey] ?? "#888";
              const label = CASE_COLOR_LABELS[colorKey] ?? colorKey;
              const isSelected = caseColor === colorKey;

              return (
                <button
                  key={colorKey}
                  type="button"
                  className="flex flex-col items-center gap-1"
                  onClick={() => setCaseColor(colorKey)}
                  aria-label={label}
                >
                  <span
                    className={cn(
                      "block h-8 w-8 rounded-full border-2 transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 scale-110"
                        : "border-transparent hover:border-muted-foreground/40",
                      colorKey === "blanc" && "border-muted-foreground/20",
                    )}
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
