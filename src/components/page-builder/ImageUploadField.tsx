import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image } from "lucide-react";
import { usePageImageUpload } from "@/hooks/usePageImageUpload";
import { toast } from "sonner";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  pageSlug?: string;
  label?: string;
}

export function ImageUploadField({ value, onChange, pageSlug = "misc", label }: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = usePageImageUpload();

  const handleFile = async (file: File) => {
    try {
      const url = await upload(file, pageSlug);
      onChange(url);
      toast.success("Image uploadée");
    } catch (e: any) {
      toast.error("Erreur upload", { description: e.message });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {value ? (
        <div className="relative group rounded-lg border overflow-hidden">
          <img src={value} alt="" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <p className="text-sm text-muted-foreground">Upload en cours...</p>
          ) : (
            <>
              <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Cliquez ou glissez une image</p>
            </>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Ou collez une URL..."
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs h-8"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
