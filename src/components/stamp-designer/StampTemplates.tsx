import { Button } from "@/components/ui/button";
import { Briefcase, Stethoscope, Wrench, Building2, Users } from "lucide-react";
import { STAMP_TEMPLATES } from "@/components/stamp-designer/constants";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import type { StampTemplate } from "@/components/stamp-designer/types";

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  societe: <Building2 className="h-4 w-4" />,
  avocat: <Briefcase className="h-4 w-4" />,
  medecin: <Stethoscope className="h-4 w-4" />,
  artisan: <Wrench className="h-4 w-4" />,
  association: <Users className="h-4 w-4" />,
};

export function StampTemplates() {
  const applyTemplate = useStampDesignerStore((s) => s.applyTemplate);
  const selectedTemplate = useStampDesignerStore((s) => s.selectedTemplate);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);

  const maxLines = selectedModel?.max_lines ?? 0;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Remplissage rapide par profession
      </p>
      <div className="flex flex-wrap gap-2">
        {STAMP_TEMPLATES.map((tpl) => {
          const tooManyLines = tpl.lines.length > maxLines;
          return (
            <Button
              key={tpl.id}
              variant={selectedTemplate === tpl.id ? "default" : "outline"}
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => applyTemplate(tpl as unknown as StampTemplate)}
              disabled={tooManyLines}
              title={
                tooManyLines
                  ? `Ce modèle nécessite ${tpl.lines.length} lignes (max ${maxLines})`
                  : `Remplir avec le modèle ${tpl.name}`
              }
            >
              {TEMPLATE_ICONS[tpl.profession]}
              {tpl.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
