import { Button } from "@/components/ui/button";
import { Square, Circle, Minus } from "lucide-react";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import type { StampShape } from "@/components/stamp-designer/types";

const SHAPES: { type: StampShape["type"]; label: string; icon: React.ReactNode }[] = [
  { type: "rect", label: "Rectangle", icon: <Square className="h-5 w-5" /> },
  { type: "circle", label: "Cercle", icon: <Circle className="h-5 w-5" /> },
  { type: "line", label: "Ligne", icon: <Minus className="h-5 w-5" /> },
  {
    type: "frame",
    label: "Cadre",
    icon: (
      <Square className="h-5 w-5" strokeWidth={1} />
    ),
  },
];

export function StampShapesPanel() {
  const addShape = useStampDesignerStore((s) => s.addShape);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Formes</h3>
      <div className="grid grid-cols-2 gap-2">
        {SHAPES.map((shape) => (
          <Button
            key={shape.type}
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3"
            onClick={() => addShape(shape.type)}
          >
            {shape.icon}
            <span className="text-xs">{shape.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
