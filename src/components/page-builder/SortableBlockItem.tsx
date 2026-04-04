import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBlockEntry } from "@/lib/block-registry";
import { usePageBuilderStore } from "@/stores/pageBuilderStore";
import type { ContentBlock } from "@/hooks/useStaticPages";
import { cn } from "@/lib/utils";

interface Props {
  block: ContentBlock;
}

export function SortableBlockItem({ block }: Props) {
  const selectedBlockId = usePageBuilderStore((s) => s.selectedBlockId);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  const removeBlock = usePageBuilderStore((s) => s.removeBlock);
  const duplicateBlock = usePageBuilderStore((s) => s.duplicateBlock);

  const entry = getBlockEntry(block.type);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSelected = selectedBlockId === block.id;
  const Icon = entry?.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-1.5 p-2 rounded-lg border transition-colors cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-transparent hover:border-muted-foreground/20 hover:bg-muted/50",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={() => selectBlock(block.id)}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/50 hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Icon + label */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium truncate">
          {entry?.labelFr ?? block.type}
        </span>
        {getPreviewText(block) && (
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            — {getPreviewText(block)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(block.id);
          }}
          title="Dupliquer"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(block.id);
          }}
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function getPreviewText(block: ContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.content?.slice(0, 40) || "";
    case "paragraph":
      return block.content?.slice(0, 40) || "";
    case "cta":
      return block.title?.slice(0, 40) || "";
    case "hero":
      return block.slides?.[0]?.title?.slice(0, 30) || "";
    case "image":
      return block.alt || "";
    case "image_text":
      return block.title?.slice(0, 30) || "";
    default:
      return "";
  }
}
