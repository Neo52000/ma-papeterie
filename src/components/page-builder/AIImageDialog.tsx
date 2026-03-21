import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useGenerateImage, type GenerateImageInput } from "@/hooks/useGenerateImage";
import { toast } from "sonner";

interface AIImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageGenerated: (url: string) => void;
  pageSlug?: string;
}

export function AIImageDialog({ open, onOpenChange, onImageGenerated, pageSlug }: AIImageDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<GenerateImageInput["model"]>("dall-e-3");
  const [size, setSize] = useState<GenerateImageInput["size"]>("1024x1024");
  const [quality, setQuality] = useState<GenerateImageInput["quality"]>("standard");
  const [style, setStyle] = useState<GenerateImageInput["style"]>("natural");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);

  const { mutateAsync: generate, isPending } = useGenerateImage();

  const handleGenerate = async () => {
    if (prompt.trim().length < 3) {
      toast.error("Le prompt doit contenir au moins 3 caractères");
      return;
    }
    try {
      const result = await generate({
        prompt: prompt.trim(),
        model,
        size,
        quality,
        style,
        pageSlug: pageSlug ?? "ai-generated",
      });
      setPreviewUrl(result.url);
      setRevisedPrompt(result.revisedPrompt);
      toast.success("Image générée !");
    } catch (e) {
      toast.error("Erreur génération", { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      onImageGenerated(previewUrl);
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setPrompt("");
    setPreviewUrl(null);
    setRevisedPrompt(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isPending) resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer une image avec l'IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Décrivez l'image souhaitée <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              placeholder="Ex: Une papeterie chaleureuse avec des fournitures colorées, style photo professionnelle, lumière naturelle..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Modèle</Label>
              <Select value={model} onValueChange={(v) => setModel(v as GenerateImageInput["model"])} disabled={isPending}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dall-e-3">DALL-E 3</SelectItem>
                  <SelectItem value="gpt-image-1">GPT Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Format</Label>
              <Select value={size} onValueChange={(v) => setSize(v as GenerateImageInput["size"])} disabled={isPending}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Carré (1:1)</SelectItem>
                  <SelectItem value="1792x1024">Paysage (16:9)</SelectItem>
                  <SelectItem value="1024x1792">Portrait (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Qualité</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as GenerateImageInput["quality"])} disabled={isPending}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">{model === "gpt-image-1" ? "Haute" : "HD"}</SelectItem>
                  {model === "gpt-image-1" && <SelectItem value="auto">Auto</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {model === "dall-e-3" && (
              <div className="space-y-1">
                <Label className="text-xs">Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as GenerateImageInput["style"])} disabled={isPending}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Naturel</SelectItem>
                    <SelectItem value="vivid">Vivid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isPending && (
            <div className="flex items-center justify-center h-40 border rounded-lg bg-muted/50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Génération en cours (~15s)...</p>
              </div>
            </div>
          )}

          {previewUrl && !isPending && (
            <div className="space-y-2">
              <img src={previewUrl} alt="Générée par IA" className="w-full rounded-lg border" />
              {revisedPrompt && (
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  Prompt révisé : {revisedPrompt}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          {previewUrl && !isPending ? (
            <>
              <Button variant="outline" onClick={handleGenerate} disabled={prompt.trim().length < 3}>
                Régénérer
              </Button>
              <Button onClick={handleConfirm} className="gap-1.5">
                <Check className="h-4 w-4" /> Utiliser
              </Button>
            </>
          ) : (
            <Button onClick={handleGenerate} disabled={isPending || prompt.trim().length < 3} className="gap-1.5">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Générer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
