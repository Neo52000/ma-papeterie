import { useState, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface TagsEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Éditeur de tags réutilisable. Saisie + Enter pour ajouter, × pour supprimer.
 * Utilisé sur `prospects.tags` et `profiles.tags`.
 */
export function TagsEditor({
  tags,
  onChange,
  placeholder = "Ajouter un tag (Entrée pour valider)",
  disabled = false,
}: TagsEditorProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!value) return;
    if (tags.includes(value)) return;
    onChange([...tags, value]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-background min-h-[40px]">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive"
              aria-label={`Supprimer le tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] border-0 h-6 px-0 focus-visible:ring-0"
        />
      )}
    </div>
  );
}
