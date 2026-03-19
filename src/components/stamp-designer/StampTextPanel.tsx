import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle } from "lucide-react";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { StampTextLineEditor } from "@/components/stamp-designer/StampTextLineEditor";

export function StampTextPanel() {
  const textInput = useStampDesignerStore((s) => s.textInput);
  const setTextInput = useStampDesignerStore((s) => s.setTextInput);
  const lines = useStampDesignerStore((s) => s.lines);
  const updateLine = useStampDesignerStore((s) => s.updateLine);
  const removeLine = useStampDesignerStore((s) => s.removeLine);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);

  const maxLines = selectedModel?.max_lines ?? 6;
  const lineCount = textInput ? textInput.split("\n").length : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Votre texte</h3>
        <span className="text-xs text-muted-foreground">
          {lineCount}/{maxLines} lignes
        </span>
      </div>

      <Textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder={"Ex :\nSARL DUPONT\n12 rue de Paris\n75000 PARIS"}
        rows={Math.min(maxLines, 6)}
        className="font-mono text-sm resize-none"
      />

      {lineCount > maxLines && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Ce modèle supporte maximum {maxLines} lignes. Les lignes
            excédentaires seront ignorées.
          </AlertDescription>
        </Alert>
      )}

      <Accordion type="single" collapsible>
        <AccordionItem value="formatting" className="border-b-0">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            Options de mise en forme
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={line.id} className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    Ligne {index + 1}
                    {line.text ? ` : ${line.text.substring(0, 30)}${line.text.length > 30 ? "…" : ""}` : " (vide)"}
                  </span>
                  <StampTextLineEditor
                    line={line}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                    showTextInput={false}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
