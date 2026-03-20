import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { CLIPART_LIBRARY } from "@/components/stamp-designer/constants";

export function StampClipartsPanel() {
  const addClipart = useStampDesignerStore((s) => s.addClipart);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Cliparts</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {CLIPART_LIBRARY.map((clipart) => (
          <button
            key={clipart.name}
            type="button"
            className="flex flex-col items-center gap-1 rounded-md border p-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            onClick={() => addClipart(clipart.name, clipart.svgPath)}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={clipart.svgPath} />
            </svg>
            <span className="truncate w-full text-center">{clipart.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
