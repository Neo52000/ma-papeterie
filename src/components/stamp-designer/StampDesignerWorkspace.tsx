import { useRef } from "react";
import type Konva from "konva";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import StampDesignerCanvas from "./StampDesignerCanvas";
import { StampTextPanel } from "./StampTextPanel";
import { StampLogoUploader } from "./StampLogoUploader";
import { StampShapesPanel } from "./StampShapesPanel";
import { StampClipartsPanel } from "./StampClipartsPanel";
import { StampColorPicker } from "./StampColorPicker";
import { StampDesignerToolbar } from "./StampDesignerToolbar";
import { StampAddToCartButton } from "./StampAddToCartButton";
import { Type, Image, Shapes, Palette, Sparkles } from "lucide-react";

export function StampDesignerWorkspace() {
  const stageRef = useRef<Konva.Stage>(null);
  const { selectedModel } = useStampDesignerStore();

  if (!selectedModel) return null;

  const priceFormatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(selectedModel.base_price_ttc);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <StampDesignerToolbar />

      {/* Model info bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <h2 className="font-semibold text-lg">{selectedModel.name}</h2>
        <Badge variant="secondary">{selectedModel.brand}</Badge>
        <Badge variant="outline">
          {selectedModel.width_mm} × {selectedModel.height_mm} mm
        </Badge>
        <Badge variant="outline">Max {selectedModel.max_lines} lignes</Badge>
        <span className="ml-auto text-xl font-bold text-primary">
          {priceFormatted}
        </span>
      </div>

      {/* Main workspace: canvas + panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Canvas area */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Aperçu de l'empreinte du tampon (cliquez sur un élément pour le
              sélectionner)
            </p>
            <div className="flex justify-center">
              <StampDesignerCanvas ref={stageRef} />
            </div>
          </Card>
        </div>

        {/* Control panels */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="text" className="text-xs gap-1">
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Texte</span>
              </TabsTrigger>
              <TabsTrigger value="logo" className="text-xs gap-1">
                <Image className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logo</span>
              </TabsTrigger>
              <TabsTrigger value="shapes" className="text-xs gap-1">
                <Shapes className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Formes</span>
              </TabsTrigger>
              <TabsTrigger value="cliparts" className="text-xs gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cliparts</span>
              </TabsTrigger>
              <TabsTrigger value="colors" className="text-xs gap-1">
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Couleurs</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="text">
                <StampTextPanel />
              </TabsContent>
              <TabsContent value="logo">
                <StampLogoUploader />
              </TabsContent>
              <TabsContent value="shapes">
                <StampShapesPanel />
              </TabsContent>
              <TabsContent value="cliparts">
                <StampClipartsPanel />
              </TabsContent>
              <TabsContent value="colors">
                <StampColorPicker />
              </TabsContent>
            </div>
          </Tabs>

          {/* Add to cart */}
          <div className="mt-6">
            <StampAddToCartButton stageRef={stageRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
