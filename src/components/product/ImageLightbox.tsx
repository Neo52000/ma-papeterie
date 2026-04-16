import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxImage {
  url: string;
  alt: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ images, initialIndex = 0, open, onOpenChange }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(images.length - 1, i + 1)), [images.length]);

  // Reset index when the lightbox opens with a new initial image.
  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  // Keyboard navigation (arrows). Escape is already handled by Radix Dialog.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, prev, next]);

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-black/95 border-none flex flex-col items-center justify-center gap-0 [&>button]:text-white [&>button]:hover:text-white/80"
        aria-label="Galerie d'images produit"
      >
        {/* Counter */}
        <div
          className="absolute top-4 left-4 text-white/70 text-sm z-10"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {index + 1} / {images.length}
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center w-full p-8">
          <img
            src={images[index]?.url}
            alt={images[index]?.alt}
            className="max-w-full max-h-full object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-2 text-white disabled:opacity-30 transition-colors focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={index === images.length - 1}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-2 text-white disabled:opacity-30 transition-colors focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 pb-4 px-4 overflow-x-auto" role="tablist" aria-label="Miniatures">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Image ${i + 1} sur ${images.length}`}
                onClick={() => setIndex(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-75"
                }`}
              >
                <img src={img.url} alt="" aria-hidden="true" className="w-full h-full object-contain bg-white p-1" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
