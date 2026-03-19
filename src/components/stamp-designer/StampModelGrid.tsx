import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStampModels } from "@/hooks/useStampModels";
import { STAMP_TYPE_LABELS, BRAND_LABELS } from "@/components/stamp-designer/constants";
import { StampModelCard } from "@/components/stamp-designer/StampModelCard";
import type { StampModel } from "@/components/stamp-designer/types";

interface StampModelGridProps {
  onSelectModel: (model: StampModel) => void;
}

const ALL_VALUE = "__all__";

export function StampModelGrid({ onSelectModel }: StampModelGridProps) {
  const [brand, setBrand] = useState<string>(ALL_VALUE);
  const [type, setType] = useState<string>(ALL_VALUE);

  const { data: models, isLoading } = useStampModels({
    brand: brand === ALL_VALUE ? undefined : brand,
    type: type === ALL_VALUE ? undefined : type,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-48">
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Toutes les marques</SelectItem>
              {Object.entries(BRAND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tous les types</SelectItem>
              {Object.entries(STAMP_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && models?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            Aucun modèle de tampon trouvé.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Essayez de modifier vos filtres.
          </p>
        </div>
      )}

      {/* Model grid */}
      {!isLoading && models && models.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <StampModelCard
              key={model.id}
              model={model}
              onSelect={onSelectModel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
