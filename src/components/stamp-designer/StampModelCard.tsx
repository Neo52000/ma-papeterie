import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stamp, Image, Check } from "lucide-react";
import type { StampModel } from "@/components/stamp-designer/types";
import { STAMP_TYPE_LABELS } from "@/components/stamp-designer/constants";

interface StampModelCardProps {
  model: StampModel;
  onSelect: (model: StampModel) => void;
}

export function StampModelCard({ model, onSelect }: StampModelCardProps) {
  const formattedPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(model.base_price_ttc);

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="aspect-[4/3] w-full rounded-md bg-muted flex items-center justify-center overflow-hidden mb-3">
          {model.image_url ? (
            <img
              src={model.image_url}
              alt={model.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <Stamp className="h-16 w-16 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{model.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {model.brand}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            {model.width_mm} x {model.height_mm} mm
          </p>
          <p>Max {model.max_lines} lignes</p>
          <div className="flex items-center gap-1.5">
            {model.supports_logo ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                <span>Logo supporté</span>
              </>
            ) : (
              <>
                <Image className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Sans logo</span>
              </>
            )}
          </div>
          {STAMP_TYPE_LABELS[model.type] && (
            <Badge variant="outline" className="text-xs">
              {STAMP_TYPE_LABELS[model.type]}
            </Badge>
          )}
        </div>

        {model.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {model.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-lg font-semibold">{formattedPrice}</span>
          <Button size="sm" onClick={() => onSelect(model)}>
            Personnaliser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
