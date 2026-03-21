import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-black/95 border-none flex flex-col items-center justify-center gap-0 [&>button]:text-white [&>button]:hover:text-white/80">
        {/* Counter */}
        <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
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
              onClick={prev}
              disabled={index === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-2 text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              disabled={index === images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full p-2 text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 pb-4 px-4 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === index ? "border-white" : "border-transparent opacity-50 hover:opacity-75"}`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-contain bg-white p-1" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
