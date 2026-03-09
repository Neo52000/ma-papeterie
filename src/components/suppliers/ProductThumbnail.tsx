import { Package } from "lucide-react";

interface ProductThumbnailProps {
  imageUrl?: string | null;
  name?: string;
}

export function ProductThumbnail({ imageUrl, name }: ProductThumbnailProps) {
  return imageUrl ? (
    <img
      src={imageUrl}
      alt={name || ""}
      loading="lazy"
      className="h-10 w-10 rounded object-contain border bg-muted flex-shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <div className="h-10 w-10 rounded border bg-muted/50 flex items-center justify-center flex-shrink-0">
      <Package className="h-4 w-4 text-muted-foreground/30" />
    </div>
  );
}
