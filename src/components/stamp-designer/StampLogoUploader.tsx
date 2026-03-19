import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export function StampLogoUploader() {
  const logo = useStampDesignerStore((s) => s.logo);
  const setLogo = useStampDesignerStore((s) => s.setLogo);
  const removeLogo = useStampDesignerStore((s) => s.removeLogo);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Format non supporté. Utilisez PNG, JPEG ou SVG.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Le fichier dépasse la taille maximale de 2 Mo.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setLogo(file, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [setLogo],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  if (logo?.dataUrl) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Logo</h3>
        <div className="relative inline-block">
          <img
            src={logo.dataUrl}
            alt="Logo"
            className="h-20 w-20 rounded-md border object-contain bg-white"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={removeLogo}
            aria-label="Supprimer le logo"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Logo</h3>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
        )}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-8 w-8" />
        <span>Glissez un logo ou cliquez pour parcourir</span>
        <span className="text-xs">PNG, JPEG, SVG — max 2 Mo</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
