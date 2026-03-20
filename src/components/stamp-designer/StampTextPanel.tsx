import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { StampTextLineEditor } from "@/components/stamp-designer/StampTextLineEditor";

export function StampTextPanel() {
  const lines = useStampDesignerStore((s) => s.lines);
  const addLine = useStampDesignerStore((s) => s.addLine);
  const addLineAfter = useStampDesignerStore((s) => s.addLineAfter);
  const updateLine = useStampDesignerStore((s) => s.updateLine);
  const removeLine = useStampDesignerStore((s) => s.removeLine);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);

  const maxLines = selectedModel?.max_lines ?? 0;
  const canAddMore = lines.length < maxLines;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Textes / images centraux</h3>
        <span className="text-xs text-muted-foreground">
          {lines.length}/{maxLines} lignes
        </span>
      </div>

      <div className="space-y-2">
        {lines.map((line, index) => (
          <StampTextLineEditor
            key={line.id}
            lineNumber={index + 1}
            line={line}
            onUpdate={updateLine}
            onRemove={removeLine}
            onAddAfter={addLineAfter}
            canAdd={canAddMore}
            canRemove={lines.length > 1}
          />
        ))}
      </div>

      {canAddMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addLine}
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
