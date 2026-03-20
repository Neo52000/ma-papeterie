import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Eye, Pencil, RotateCcw } from "lucide-react";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";

export function StampDesignerToolbar() {
  const step = useStampDesignerStore((s) => s.step);
  const setStep = useStampDesignerStore((s) => s.setStep);
  const deleteSelectedElement = useStampDesignerStore((s) => s.deleteSelectedElement);
  const selectedElementId = useStampDesignerStore((s) => s.selectedElementId);
  const reset = useStampDesignerStore((s) => s.reset);
  const goBackToSelect = useStampDesignerStore((s) => s.goBackToSelect);

  const isPreview = step === "preview";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={goBackToSelect}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour au catalogue
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={!selectedElementId}
        onClick={deleteSelectedElement}
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Supprimer
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setStep(isPreview ? "design" : "preview")}
      >
        {isPreview ? (
          <>
            <Pencil className="h-4 w-4 mr-1" />
            Mode édition
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-1" />
            Aperçu empreinte
          </>
        )}
      </Button>

      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="h-4 w-4 mr-1" />
        Réinitialiser
      </Button>
    </div>
  );
}
