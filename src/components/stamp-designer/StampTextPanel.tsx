import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { StampTextLineEditor } from "@/components/stamp-designer/StampTextLineEditor";

export function StampTextPanel() {
  const lines = useStampDesignerStore((s) => s.lines);
  const addLine = useStampDesignerStore((s) => s.addLine);
  const updateLine = useStampDesignerStore((s) => s.updateLine);
  const removeLine = useStampDesignerStore((s) => s.removeLine);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);

  const maxLines = selectedModel?.max_lines ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Texte</h3>
        <span className="text-xs text-muted-foreground">
          Ligne {lines.length}/{maxLines}
        </span>
      </div>

      <div className="space-y-2">
        {lines.map((line) => (
          <StampTextLineEditor
            key={line.id}
            line={line}
            onUpdate={updateLine}
            onRemove={removeLine}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={lines.length >= maxLines}
        onClick={addLine}
      >
        <Plus className="h-4 w-4 mr-1" />
        Ajouter une ligne
      </Button>
    </div>
  );
}
