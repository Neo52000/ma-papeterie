import { useRef } from "react";
import type Konva from "konva";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const reset = useStampDesignerStore((s) => s.reset);

  if (!selectedModel) return null;

  return (
    <>
      <div className="space-y-6 pb-24">
        {/* Aperçu canvas */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <StampDesignerCanvas ref={stageRef} />

          {/* Zoom + delete */}
          <div className="flex items-center gap-3 mt-3">
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
            <div className="space-y-1.5 mt-3">
              {warnings.map((w, i) => (
                <Alert
                  key={i}
                  variant={w.type === "empty" ? "default" : "destructive"}
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

        {/* Tabs: Lignes / Images / Options */}
        <Tabs defaultValue="lignes">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="lignes">Lignes</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
          </TabsList>

          <TabsContent value="lignes" className="space-y-6 mt-4">
            <StampTemplates />
            <StampTextPanel />
          </TabsContent>

          <TabsContent value="images" className="space-y-6 mt-4">
            <StampLogoUploader />
            <StampShapesPanel />
            <StampClipartsPanel />
          </TabsContent>

          <TabsContent value="options" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Couleur d'encre</h3>
              <StampColorPicker mode="ink" />
            </div>
            <div>
              <h3 className="text-sm font-medium mb-3">Couleur du boîtier</h3>
              <StampColorPicker mode="case" />
            </div>
          </TabsContent>
        </Tabs>

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

      {/* Sticky CTA */}
      <StampStickyCTA stageRef={stageRef} />
    </>
  );
}
