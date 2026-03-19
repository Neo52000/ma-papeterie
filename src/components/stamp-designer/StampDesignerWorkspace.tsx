import { useRef } from "react";
import type Konva from "konva";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import StampDesignerCanvas from "./StampDesignerCanvas";
import { StampTextPanel } from "./StampTextPanel";
import { StampTemplates } from "./StampTemplates";
import { StampLogoUploader } from "./StampLogoUploader";
import { StampShapesPanel } from "./StampShapesPanel";
import { StampClipartsPanel } from "./StampClipartsPanel";
import { StampColorPicker } from "./StampColorPicker";
import { StampStickyCTA } from "./StampStickyCTA";
import {
  ArrowLeft,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
} from "lucide-react";

export function StampDesignerWorkspace() {
  const stageRef = useRef<Konva.Stage>(null);
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);
  const zoom = useStampDesignerStore((s) => s.zoom);
  const setZoom = useStampDesignerStore((s) => s.setZoom);
  const warnings = useStampDesignerStore((s) => s.warnings);
  const selectedElementId = useStampDesignerStore((s) => s.selectedElementId);
  const deleteSelectedElement = useStampDesignerStore((s) => s.deleteSelectedElement);
  const goBackToSelect = useStampDesignerStore((s) => s.goBackToSelect);
  const reset = useStampDesignerStore((s) => s.reset);

  if (!selectedModel) return null;

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-6 px-4 py-4 pb-24">
        {/* LEFT COLUMN — Edit controls (scrollable) */}
        <div className="lg:w-[420px] xl:w-[480px] space-y-5 order-2 lg:order-1 shrink-0">
          {/* Back + Model info */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground h-7 px-2"
              onClick={goBackToSelect}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Catalogue
            </Button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-semibold text-sm">{selectedModel.name}</span>
              <Badge variant="outline" className="text-xs">
                {selectedModel.width_mm} × {selectedModel.height_mm} mm
              </Badge>
            </div>
          </div>

          {/* Templates */}
          <StampTemplates />

          {/* Text input */}
          <StampTextPanel />

          {/* Sections in accordion */}
          <Accordion
            type="multiple"
            defaultValue={["ink-color"]}
          >
            <AccordionItem value="ink-color" className="border-b-0">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                Couleur d'encre
              </AccordionTrigger>
              <AccordionContent>
                <StampColorPicker mode="ink" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="logo" className="border-b-0">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                Logo
              </AccordionTrigger>
              <AccordionContent>
                <StampLogoUploader />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="shapes" className="border-b-0">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                Formes & Cliparts
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <StampShapesPanel />
                  <StampClipartsPanel />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="case-color" className="border-b-0">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                Couleur du boîtier
              </AccordionTrigger>
              <AccordionContent>
                <StampColorPicker mode="case" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Reset */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={reset}
            >
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN — Sticky preview */}
        <div className="flex-1 order-1 lg:order-2">
          <div className="lg:sticky lg:top-4 space-y-3">
            {/* Canvas */}
            <div className="bg-gray-50 rounded-lg p-3 border">
              <StampDesignerCanvas ref={stageRef} />
            </div>

            {/* Zoom + delete controls */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={2}
                step={0.1}
                onValueChange={([v]) => setZoom(v)}
                className="flex-1 max-w-[160px]"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-10">
                {Math.round(zoom * 100)}%
              </span>

              {selectedElementId && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1 ml-auto"
                  onClick={deleteSelectedElement}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </Button>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="space-y-1.5">
                {warnings.map((w, i) => (
                  <Alert
                    key={i}
                    variant={w.type === 'empty' ? 'default' : 'destructive'}
                    className="py-1.5"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <AlertDescription className="text-xs">
                      {w.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky CTA bar */}
      <StampStickyCTA stageRef={stageRef} />
    </>
  );
}
