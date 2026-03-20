import { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, Loader2, CheckCircle, ArrowRight, ArrowLeft,
  Settings2, ShoppingCart, Minus, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrintUpload } from '@/hooks/usePrintUpload';
import { usePrintPricing } from '@/hooks/usePrintPricing';
import {
  getUnitPrice, calculateTotal,
  FORMAT_LABELS, COLOR_LABELS,
  type PrintFormat, type PrintColor,
} from './printPricing';

type Step = 1 | 2 | 3;

const STEP_LABELS = ['Fichier', 'Paramètres', 'Panier'] as const;

export default function PrintDocumentUpload() {
  // Step state
  const [step, setStep] = useState<Step>(1);

  // Step 1: file
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 2: params
  const [format, setFormat] = useState<PrintFormat>('A4');
  const [color, setColor] = useState<PrintColor>('nb');
  const [rectoVerso, setRectoVerso] = useState(false);
  const [copies, setCopies] = useState(1);
  const [notes, setNotes] = useState('');

  // Step 3: confirmation
  const [orderId, setOrderId] = useState<string | null>(null);

  // Hooks
  const { submit, uploading } = usePrintUpload();
  const { data: prices = [] } = usePrintPricing();

  // Pricing
  const unitPrice = useMemo(() => getUnitPrice(prices, format, color), [prices, format, color]);
  const totalPrice = useMemo(
    () => calculateTotal(unitPrice, copies, rectoVerso),
    [unitPrice, copies, rectoVerso],
  );

  // File handling
  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') return;
    if (f.size > 50 * 1024 * 1024) return;
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file) return;
    const id = await submit({
      file, format, color, rectoVerso, copies, notes,
      unitPrice, totalPrice,
    });
    if (id) {
      setOrderId(id);
      setStep(3);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setFormat('A4');
    setColor('nb');
    setRectoVerso(false);
    setCopies(1);
    setNotes('');
    setOrderId(null);
  };

  return (
    <Card className="max-w-2xl mx-auto">
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
        {/* ── Step 1: Fichier ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">Impression A3 / A4</h3>
              <p className="text-sm text-muted-foreground">Documents acceptés : <strong>PDF</strong></p>
            </div>

            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                file && "border-primary/50 bg-primary/5",
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
                accept=".pdf,application/pdf"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Déposer ici votre fichier, un seul à la fois</p>
                  <div className="flex items-center gap-4 justify-center text-muted-foreground text-sm">
                    <span className="h-px w-12 bg-muted-foreground/30" />
                    ou
                    <span className="h-px w-12 bg-muted-foreground/30" />
                  </div>
                  <Button type="button" className="bg-green-700 hover:bg-green-800 text-white">
                    Charger mon document
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!file}
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
              <h3 className="text-xl font-bold">Paramètres d'impression</h3>
              <p className="text-sm text-muted-foreground">Configurez votre commande</p>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Format
              </Label>
              <RadioGroup
                value={format}
                onValueChange={v => setFormat(v as PrintFormat)}
                className="flex gap-4"
              >
                {(['A4', 'A3'] as PrintFormat[]).map(f => (
                  <div key={f} className="flex items-center space-x-2">
                    <RadioGroupItem value={f} id={`format-${f}`} />
                    <Label htmlFor={`format-${f}`} className="cursor-pointer">
                      {FORMAT_LABELS[f]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Couleur */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Couleur</Label>
              <RadioGroup
                value={color}
                onValueChange={v => setColor(v as PrintColor)}
                className="flex gap-4"
              >
                {(['nb', 'couleur'] as PrintColor[]).map(c => (
                  <div key={c} className="flex items-center space-x-2">
                    <RadioGroupItem value={c} id={`color-${c}`} />
                    <Label htmlFor={`color-${c}`} className="cursor-pointer">
                      {COLOR_LABELS[c]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Recto/verso */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Impression</Label>
              <RadioGroup
                value={rectoVerso ? 'recto-verso' : 'recto'}
                onValueChange={v => setRectoVerso(v === 'recto-verso')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recto" id="recto" />
                  <Label htmlFor="recto" className="cursor-pointer">Recto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recto-verso" id="recto-verso" />
                  <Label htmlFor="recto-verso" className="cursor-pointer">Recto-verso</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Nombre de copies */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nombre de copies</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  disabled={copies <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={copies}
                  onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCopies(copies + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Instructions (optionnel)</Label>
              <Textarea
                placeholder="Ex : Imprimer pages 1-5 uniquement, reliure spirale..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Prix estimé */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Prix unitaire :</span>
                  <span className="font-medium">{unitPrice.toFixed(2)} &euro; / page</span>
                </div>
                {rectoVerso && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Recto-verso (-10%) :</span>
                    <span>2 pages/feuille</span>
                  </div>
                )}
                {copies >= 50 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Remise volume :</span>
                    <span>{copies >= 100 ? '-20%' : '-10%'}</span>
                  </div>
                )}
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
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Confirmer et envoyer
                  </>
                )}
              </Button>
            </div>
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
                Votre document a été transmis avec succès. Nous vous contacterons
                dès qu'il sera prêt à retirer en magasin.
              </p>
            </div>

            <Card className="text-left bg-muted/50 max-w-md mx-auto">
              <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fichier :</span>
                  <span className="font-medium truncate ml-4 max-w-[200px]">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format :</span>
                  <span>{FORMAT_LABELS[format]}, {COLOR_LABELS[color]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Impression :</span>
                  <span>{rectoVerso ? 'Recto-verso' : 'Recto'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Copies :</span>
                  <span>{copies}</span>
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
              Envoyer un autre document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
