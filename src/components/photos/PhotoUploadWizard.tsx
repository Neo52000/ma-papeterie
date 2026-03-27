import { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Camera, Loader2, CheckCircle, ArrowRight, ArrowLeft,
  Settings2, ShoppingCart, Minus, Plus, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { usePhotoPricing } from '@/hooks/usePhotoPricing';
import {
  getPhotoUnitPrice, calculatePhotoOrderTotal,
  FINISH_LABELS, MAX_PHOTOS, MAX_FILE_SIZE, ACCEPTED_TYPES,
  type PhotoFormat, type PhotoFinish, type PhotoItem, type PhotoPriceEntry,
} from './photoPricing';

type Step = 1 | 2 | 3;
const STEP_LABELS = ['Photos', 'Paramètres', 'Confirmation'] as const;

let itemIdCounter = 0;

export default function PhotoUploadWizard() {
  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [globalFormat, setGlobalFormat] = useState<PhotoFormat>('10x15');
  const [finish, setFinish] = useState<PhotoFinish>('brillant');
  const [notes, setNotes] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { submit, uploading, progress } = usePhotoUpload();
  const { data: prices = [] } = usePhotoPricing() as { data: PhotoPriceEntry[] | undefined };

  const totalPrice = useMemo(
    () => calculatePhotoOrderTotal(items, prices),
    [items, prices],
  );

  // ── File handling ──────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: PhotoItem[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (items.length + newItems.length >= MAX_PHOTOS) break;
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      newItems.push({
        id: `photo-${++itemIdCounter}`,
        file,
        preview: URL.createObjectURL(file),
        format: globalFormat,
        paperType: 'brillant',
        whiteMargin: false,
        quantity: 1,
      });
    }

    if (newItems.length > 0) {
      setItems(prev => [...prev, ...newItems]);
    }
  }, [items.length, globalFormat]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const updateItemFormat = useCallback((id: string, format: PhotoFormat) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, format } : i));
  }, []);

  const updateItemQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  }, []);

  const applyGlobalFormat = useCallback(() => {
    setItems(prev => prev.map(i => ({ ...i, format: globalFormat })));
  }, [globalFormat]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async () => {
    const id = await submit({ items, finish, notes, prices });
    if (id) {
      setOrderId(id);
      setStep(3);
    }
  };

  const resetForm = () => {
    items.forEach(i => URL.revokeObjectURL(i.preview));
    setStep(1);
    setItems([]);
    setGlobalFormat('10x15');
    setFinish('brillant');
    setNotes('');
    setOrderId(null);
  };

  return (
    <Card className="max-w-3xl mx-auto">
      {/* Stepper */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-center gap-0 mb-6">
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum || (stepNum === 3 && orderId);
            return (
              <div key={label} className="flex items-center">
                {i > 0 && (
                  <div className={cn(
                    "w-12 sm:w-20 h-0.5 mx-1",
                    isDone || isActive ? "bg-primary" : "bg-muted",
                  )} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : isDone
                        ? "bg-primary/20 text-primary border-primary"
                        : "bg-muted text-muted-foreground border-muted",
                  )}>
                    {isDone && !isActive ? <CheckCircle className="h-4 w-4" /> : stepNum}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Step 1: Photos ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">Tirage photo express</h3>
              <p className="text-sm text-muted-foreground">
                Formats acceptés : <strong>JPG, PNG</strong> — Max 20 Mo par photo — Jusqu'à {MAX_PHOTOS} photos
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                items.length > 0 && "border-primary/30",
              )}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={e => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <div className="space-y-3">
                <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="font-medium">
                  {items.length > 0
                    ? `${items.length} photo(s) sélectionnée(s) — Cliquez pour en ajouter`
                    : 'Déposer vos photos ici ou cliquez pour les sélectionner'
                  }
                </p>
                {items.length === 0 && (
                  <>
                    <div className="flex items-center gap-4 justify-center text-muted-foreground text-sm">
                      <span className="h-px w-12 bg-muted-foreground/30" />
                      ou
                      <span className="h-px w-12 bg-muted-foreground/30" />
                    </div>
                    <Button type="button" className="bg-green-700 hover:bg-green-800 text-white">
                      Choisir mes photos
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnails grid */}
            {items.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {items.map(item => (
                  <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                      {item.file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {items.length} / {MAX_PHOTOS} photos
              </span>
              <Button
                onClick={() => setStep(2)}
                disabled={items.length === 0}
                size="lg"
              >
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Paramètres ──────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h3 className="text-xl font-bold">Paramètres de tirage</h3>
              <p className="text-sm text-muted-foreground">{items.length} photo(s) sélectionnée(s)</p>
            </div>

            {/* Global format */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Settings2 className="h-4 w-4" /> Format pour toutes les photos
                    </Label>
                    <Select value={globalFormat} onValueChange={v => setGlobalFormat(v as PhotoFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {prices.map(p => (
                          <SelectItem key={p.format} value={p.format}>
                            {p.label} — {p.price_per_unit.toFixed(2)} &euro;
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={applyGlobalFormat}>
                    Appliquer à toutes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Finition */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Finition</Label>
              <RadioGroup
                value={finish}
                onValueChange={v => setFinish(v as PhotoFinish)}
                className="flex gap-4"
              >
                {(['brillant', 'mat'] as PhotoFinish[]).map(f => (
                  <div key={f} className="flex items-center space-x-2">
                    <RadioGroupItem value={f} id={`finish-${f}`} />
                    <Label htmlFor={`finish-${f}`} className="cursor-pointer">
                      {FINISH_LABELS[f]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Per-photo settings */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Détail par photo</Label>
              <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-3">
                {items.map((item, _idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate text-muted-foreground">{item.file.name}</p>
                      <Select
                        value={item.format}
                        onValueChange={v => updateItemFormat(item.id, v as PhotoFormat)}
                      >
                        <SelectTrigger className="h-8 mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {prices.map(p => (
                            <SelectItem key={p.format} value={p.format}>
                              {p.label} — {p.price_per_unit.toFixed(2)} &euro;
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number" min={1} max={99}
                        value={item.quantity}
                        onChange={e => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-12 h-7 text-center text-xs"
                      />
                      <Button
                        type="button" variant="outline" size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {(getPhotoUnitPrice(prices, item.format) * item.quantity).toFixed(2)} &euro;
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instructions (optionnel)</Label>
              <Textarea
                placeholder="Ex : Recadrer la photo 3, retouche couleur..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Total */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {items.reduce((s, i) => s + i.quantity, 0)} tirage(s) — Finition {FINISH_LABELS[finish]}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="font-semibold">Total estimé :</span>
                  <span className="text-lg font-bold text-primary">{totalPrice.toFixed(2)} &euro;</span>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button onClick={handleSubmit} disabled={uploading} size="lg">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi {progress}%...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Confirmer et envoyer
                  </>
                )}
              </Button>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Confirmation ────────────────────────────────── */}
        {step === 3 && orderId && (
          <div className="text-center space-y-6 py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Commande envoyée !</h3>
              <p className="text-muted-foreground">
                Vos {items.length} photo(s) ont été transmises avec succès.
                Nous vous contacterons dès qu'elles seront prêtes à retirer en magasin.
              </p>
            </div>

            <Card className="text-left bg-muted/50 max-w-md mx-auto">
              <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Photos :</span>
                  <span className="font-medium">{items.length} fichier(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tirages :</span>
                  <span>{items.reduce((s, i) => s + i.quantity, 0)} exemplaire(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Finition :</span>
                  <span>{FINISH_LABELS[finish]}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Total :</span>
                  <span className="text-primary">{totalPrice.toFixed(2)} &euro;</span>
                </div>
                <div className="flex justify-center pt-2">
                  <Badge variant="secondary">En attente de traitement</Badge>
                </div>
              </CardContent>
            </Card>

            <Button onClick={resetForm} variant="outline" size="lg">
              Envoyer d'autres photos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
