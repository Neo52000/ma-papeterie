import { BLOCK_REGISTRY, BLOCK_CATEGORIES } from "@/lib/block-registry";
import { usePageBuilderStore } from "@/stores/pageBuilderStore";

export function BlockPalette() {
  const addBlock = usePageBuilderStore((s) => s.addBlock);

  return (
    <div className="space-y-4">
      {BLOCK_CATEGORIES.map((cat) => {
        const entries = BLOCK_REGISTRY.filter((e) => e.category === cat.key);
        if (entries.length === 0) return null;
        return (
          <div key={cat.key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.label}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {entries.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => addBlock(entry.defaultData())}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted hover:border-primary/30 transition-colors text-left"
                >
                  <entry.icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-medium truncate">{entry.labelFr}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
