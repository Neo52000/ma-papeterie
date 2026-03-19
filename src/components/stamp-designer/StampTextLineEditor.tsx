import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import type { StampLine } from "@/components/stamp-designer/types";
import {
  STAMP_FONTS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from "@/components/stamp-designer/constants";

interface StampTextLineEditorProps {
  line: StampLine;
  onUpdate: (id: string, updates: Partial<StampLine>) => void;
  onRemove: (id: string) => void;
  showTextInput?: boolean;
}

export function StampTextLineEditor({
  line,
  onUpdate,
  onRemove,
  showTextInput = true,
}: StampTextLineEditorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Text input — hidden when textarea handles text */}
      {showTextInput && (
        <Input
          className="flex-1 min-w-[120px]"
          placeholder="Texte de la ligne"
          value={line.text}
          onChange={(e) => onUpdate(line.id, { text: e.target.value })}
        />
      )}

      {/* Font select */}
      <Select
        value={line.fontFamily}
        onValueChange={(value) => onUpdate(line.id, { fontFamily: value })}
      >
        <SelectTrigger className={showTextInput ? "w-40" : "w-32"}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAMP_FONTS.map((font) => (
            <SelectItem key={font.family} value={font.family}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size */}
      <Input
        type="number"
        className="w-16"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        value={line.fontSize}
        onChange={(e) =>
          onUpdate(line.id, { fontSize: Number(e.target.value) })
        }
      />

      {/* Bold toggle */}
      <Button
        variant={line.bold ? "default" : "outline"}
        size="icon"
        className="h-8 w-8"
        onClick={() => onUpdate(line.id, { bold: !line.bold })}
        aria-label="Gras"
      >
        <span className="font-bold text-sm">B</span>
      </Button>

      {/* Italic toggle */}
      <Button
        variant={line.italic ? "default" : "outline"}
        size="icon"
        className="h-8 w-8"
        onClick={() => onUpdate(line.id, { italic: !line.italic })}
        aria-label="Italique"
      >
        <span className="italic text-sm">I</span>
      </Button>

      {/* Alignment toggle group */}
      <ToggleGroup
        type="single"
        value={line.alignment}
        onValueChange={(value) => {
          if (value) onUpdate(line.id, { alignment: value as StampLine["alignment"] });
        }}
        size="sm"
      >
        <ToggleGroupItem value="left" aria-label="Aligner à gauche">
          <AlignLeft className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Centrer">
          <AlignCenter className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Aligner à droite">
          <AlignRight className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Delete button — only when showing text input (standalone mode) */}
      {showTextInput && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(line.id)}
          aria-label="Supprimer la ligne"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
