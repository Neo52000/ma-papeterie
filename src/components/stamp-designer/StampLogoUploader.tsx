import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, AlertCircle } from "lucide-react";
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const processFile = useCallback(
    (file: File) => {
      setUploadError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError(
          "Format non supporté. Utilisez un fichier PNG, JPEG ou SVG."
        );
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        setUploadError(
          `Votre fichier fait ${sizeMB} Mo. La taille maximale est de 2 Mo. Réduisez la taille ou la résolution de votre image.`
        );
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
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={logo.dataUrl}
              alt="Logo"
              className="h-16 w-16 rounded-md border object-contain bg-white"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5"
              onClick={removeLogo}
              aria-label="Supprimer le logo"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Logo ajouté</p>
            <p>Glissez-le sur l'aperçu pour le positionner</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-5 text-sm text-muted-foreground cursor-pointer transition-colors",
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
        <Upload className="h-6 w-6" />
        <span className="text-center">Glissez un logo ou cliquez pour parcourir</span>
        <span className="text-xs">PNG, JPEG, SVG — max 2 Mo</span>
      </div>

      {/* Inline error — highly visible */}
      {uploadError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {uploadError}
          </AlertDescription>
        </Alert>
      )}

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
