import { useState } from "react";
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
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { StampLine } from "@/components/stamp-designer/types";
import {
  STAMP_FONTS,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
} from "@/components/stamp-designer/constants";

interface StampTextLineEditorProps {
  lineNumber: number;
  line: StampLine;
  onUpdate: (id: string, updates: Partial<StampLine>) => void;
  onRemove: (id: string) => void;
  onAddAfter: (id: string) => void;
  canAdd: boolean;
  canRemove: boolean;
}

export function StampTextLineEditor({
  lineNumber,
  line,
  onUpdate,
  onRemove,
  onAddAfter,
  canAdd,
  canRemove,
}: StampTextLineEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const fontLabel =
    STAMP_FONTS.find((f) => f.family === line.fontFamily)?.label ||
    line.fontFamily;

  return (
    <div className="space-y-1">
      {/* Main row: label + input + action buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground w-7 shrink-0">
          L{lineNumber}
        </span>

        <Input
          className="flex-1"
          placeholder="Votre texte ici"
          value={line.text}
          onChange={(e) => onUpdate(line.id, { text: e.target.value })}
        />

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canAdd}
          onClick={() => onAddAfter(line.id)}
          title="Ajouter une ligne après"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canRemove}
          onClick={() => onRemove(line.id)}
          title="Supprimer cette ligne"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Masquer les options" : "Options de mise en forme"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded: formatting options */}
      {expanded && (
        <div className="ml-9 space-y-2">
          {/* Info line */}
          <p className="text-xs text-muted-foreground italic">
            {fontLabel} - {line.fontSize}pt
            {line.bold ? " - gras" : ""}
            {line.italic ? " - italique" : ""}
          </p>

          {/* Formatting toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Font select */}
            <Select
              value={line.fontFamily}
              onValueChange={(value) =>
                onUpdate(line.id, { fontFamily: value })
              }
            >
              <SelectTrigger className="w-36 h-8 text-xs">
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
              className="w-16 h-8 text-xs"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              value={line.fontSize}
              onChange={(e) =>
                onUpdate(line.id, { fontSize: Number(e.target.value) })
              }
            />

            {/* Bold */}
            <Button
              variant={line.bold ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdate(line.id, { bold: !line.bold })}
              aria-label="Gras"
            >
              <span className="font-bold text-sm">B</span>
            </Button>

            {/* Italic */}
            <Button
              variant={line.italic ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              onClick={() => onUpdate(line.id, { italic: !line.italic })}
              aria-label="Italique"
            >
              <span className="italic text-sm">I</span>
            </Button>

            {/* Alignment */}
            <ToggleGroup
              type="single"
              value={line.alignment}
              onValueChange={(value) => {
                if (value)
                  onUpdate(line.id, {
                    alignment: value as StampLine["alignment"],
                  });
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
          </div>
        </div>
      )}
    </div>
  );
}
