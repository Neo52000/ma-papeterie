import { usePageBuilderStore } from "@/stores/pageBuilderStore";
import { RenderBlock } from "@/pages/DynamicPage";
import { cn } from "@/lib/utils";

export function LivePreview() {
  const { blocks, selectedBlockId, hoveredBlockId, selectBlock, hoverBlock, viewMode } =
    usePageBuilderStore();

  const isMobile = viewMode === "mobile";

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div
        className={cn(
          "min-h-full bg-white mx-auto transition-all duration-300",
          isMobile ? "max-w-[375px] border-x shadow-lg" : "w-full"
        )}
      >
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            <p>Ajoutez des blocs pour voir l'aperçu ici</p>
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
                    {block.type.replace("_", " ")}
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
