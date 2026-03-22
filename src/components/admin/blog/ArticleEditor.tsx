import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Wand2, Pencil } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ArticleFormData {
  keyword: string;
  topic: string;
  targetAudience: string;
  category: string;
  wordCount: string;
}

export interface EditFormData {
  title: string;
  excerpt: string;
  imageUrl: string;
  content: string;
}

// ─── New Article Dialog ─────────────────────────────────────────────────────

interface NewArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: ArticleFormData;
  onFormDataChange: (data: ArticleFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function NewArticleDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isPending,
}: NewArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shadow-md">
          <Wand2 className="w-4 h-4" />
          Nouvel article IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Générer un nouvel article
          </DialogTitle>
          <DialogDescription>
            Claude AI va rédiger un article optimisé SEO à partir de vos paramètres
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Mot-clé cible <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="ex: fournitures scolaires"
              value={formData.keyword}
              onChange={(e) => onFormDataChange({ ...formData, keyword: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">Le mot-clé principal pour le référencement</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Sujet de l'article <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="ex: Guide complet des fournitures scolaires"
              value={formData.topic}
              onChange={(e) => onFormDataChange({ ...formData, topic: e.target.value })}
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Catégorie</label>
              <Select
                value={formData.category}
                onValueChange={(v) => onFormDataChange({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="papeterie">Papeterie</SelectItem>
                  <SelectItem value="conseils">Conseils</SelectItem>
                  <SelectItem value="seo">SEO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre de mots</label>
              <Select
                value={formData.wordCount}
                onValueChange={(v) => onFormDataChange({ ...formData, wordCount: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="500">~500 mots</SelectItem>
                  <SelectItem value="1000">~1 000 mots</SelectItem>
                  <SelectItem value="1500">~1 500 mots</SelectItem>
                  <SelectItem value="2000">~2 000 mots</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Audience cible</label>
            <Input
              placeholder="ex: Parents et enseignants"
              value={formData.targetAudience}
              onChange={(e) => onFormDataChange({ ...formData, targetAudience: e.target.value })}
            />
          </div>

          <Separator />

          <Button type="submit" className="w-full gap-2" size="lg" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lancer la génération
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Article Dialog ────────────────────────────────────────────────────

interface EditArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm: EditFormData;
  onEditFormChange: (data: EditFormData) => void;
  onSave: () => void;
  isPending: boolean;
}

export function EditArticleDialog({
  open,
  onOpenChange,
  editForm,
  onEditFormChange,
  onSave,
  isPending,
}: EditArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Modifier l'article
          </DialogTitle>
          <DialogDescription>
            Modifiez le titre, l'extrait, l'image et le contenu HTML
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Titre</label>
            <Input
              value={editForm.title}
              onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Extrait</label>
            <Textarea
              value={editForm.excerpt}
              onChange={(e) => onEditFormChange({ ...editForm, excerpt: e.target.value })}
              rows={2}
              className="resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">URL de l'image</label>
            <Input
              value={editForm.imageUrl}
              onChange={(e) => onEditFormChange({ ...editForm, imageUrl: e.target.value })}
              placeholder="https://..."
            />
            {editForm.imageUrl && (
              <img src={editForm.imageUrl} alt="Preview" className="mt-2 h-24 rounded-md object-cover" loading="lazy" decoding="async" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Contenu (HTML)</label>
            <Textarea
              value={editForm.content}
              onChange={(e) => onEditFormChange({ ...editForm, content: e.target.value })}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSave} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
