import { useCallback } from "react";
import { usePageBuilderStore } from "@/stores/pageBuilderStore";
import { RenderBlock } from "@/views/DynamicPage";
import { cn } from "@/lib/utils";

export function LivePreview() {
  const blocks = usePageBuilderStore((s) => s.blocks);
  const selectedBlockId = usePageBuilderStore((s) => s.selectedBlockId);
  const hoveredBlockId = usePageBuilderStore((s) => s.hoveredBlockId);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  const hoverBlock = usePageBuilderStore((s) => s.hoverBlock);
  const viewMode = usePageBuilderStore((s) => s.viewMode);
  const updateBlock = usePageBuilderStore((s) => s.updateBlock);

  const isMobile = viewMode === "mobile";
  const isTablet = viewMode === "tablet";

  const handleDoubleClick = useCallback((blockId: string, e: React.MouseEvent) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Only allow inline editing for text blocks
    if (block.type !== "heading" && block.type !== "paragraph") return;

    e.stopPropagation();
    const target = e.target as HTMLElement;
    const editableEl = target.closest("h2, h3, p");
    if (!editableEl) return;

    // Make element contenteditable
    editableEl.setAttribute("contenteditable", "true");
    editableEl.classList.add("outline-none", "ring-2", "ring-primary/50", "rounded", "px-1");
    (editableEl as HTMLElement).focus();

    // Select all text
    const range = document.createRange();
    range.selectNodeContents(editableEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const handleBlur = () => {
      editableEl.removeAttribute("contenteditable");
      editableEl.classList.remove("outline-none", "ring-2", "ring-primary/50", "rounded", "px-1");
      const newContent = editableEl.textContent ?? "";
      updateBlock(blockId, { content: newContent });
      editableEl.removeEventListener("blur", handleBlur);
      editableEl.removeEventListener("keydown", handleKeyDown);
    };

    const handleKeyDown = (ev: Event) => {
      const ke = ev as KeyboardEvent;
      if (ke.key === "Enter" && !ke.shiftKey) {
        ke.preventDefault();
        (editableEl as HTMLElement).blur();
      }
      if (ke.key === "Escape") {
        editableEl.textContent = (block as { content?: string }).content ?? "";
        (editableEl as HTMLElement).blur();
      }
    };

    editableEl.addEventListener("blur", handleBlur);
    editableEl.addEventListener("keydown", handleKeyDown);
  }, [blocks, updateBlock]);

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div
        className={cn(
          "min-h-full bg-white mx-auto transition-all duration-300",
          isMobile ? "max-w-[375px] border-x shadow-lg" :
          isTablet ? "max-w-[768px] border-x shadow-lg" :
          "w-full"
        )}
      >
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-sm gap-2">
            <p>Ajoutez des blocs pour voir l'aperçu ici</p>
            <p className="text-xs">Utilisez l'onglet "Blocs" à gauche pour commencer</p>
          </div>
        ) : (
          blocks.map((block) => {
            const isSelected = selectedBlockId === block.id;
            const isHovered = hoveredBlockId === block.id;
            return (
              <div
                key={block.id}
                className={cn(
                  "relative group/preview cursor-pointer transition-shadow",
                  isSelected && "ring-2 ring-primary ring-inset",
                  !isSelected && isHovered && "ring-2 ring-primary/30 ring-inset"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  selectBlock(block.id);
                }}
                onDoubleClick={(e) => handleDoubleClick(block.id, e)}
                onMouseEnter={() => hoverBlock(block.id)}
                onMouseLeave={() => hoverBlock(null)}
              >
                {/* Block type badge on hover */}
                {(isSelected || isHovered) && (
                  <div
                    className={cn(
                      "absolute top-0 left-0 z-10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/20 text-primary"
                    )}
                  >
                    {block.type.replace(/_/g, " ")}
                  </div>
                )}

                {/* Inline edit hint */}
                {isSelected && (block.type === "heading" || block.type === "paragraph") && (
                  <div className="absolute top-0 right-0 z-10 px-2 py-0.5 text-[10px] bg-primary/10 text-primary">
                    Double-clic pour éditer
                  </div>
                )}

                <RenderBlock block={block} fullWidth />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
