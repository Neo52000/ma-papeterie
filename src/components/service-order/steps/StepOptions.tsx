import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Settings2, Minus, Plus } from 'lucide-react';
import PriceDisplay from '../PriceDisplay';
import type { ServiceConfig } from '@/lib/serviceConfig';
import { REPRO_FORMATS, REPRO_COLORS, PHOTO_FORMATS, PHOTO_FINISHES } from '@/lib/serviceConfig';
import type { UploadedFile } from './StepUpload';

// ── Reprographie state ────────────────────────────────────────────
export interface ReproOptions {
  format: string;
  color: string;
  rectoVerso: boolean;
  copies: number;
}

// ── Photo state (per-item format + global finish) ─────────────────
export interface PhotoItemOption {
  fileId: string;
  format: string;
  quantity: number;
}

export interface PhotoOptions {
  finish: string;
  items: PhotoItemOption[];
}

export type ServiceOptions = ReproOptions | PhotoOptions;

interface StepOptionsProps {
  config: ServiceConfig;
  files: UploadedFile[];
  options: ServiceOptions;
  onOptionsChange: (opts: ServiceOptions) => void;
  unitPricesHt: Record<string, number>; // keyed by format or "format|color"
  onBack: () => void;
  onNext: () => void;
}

export default function StepOptions({
  config, files, options, onOptionsChange, unitPricesHt, onBack, onNext,
}: StepOptionsProps) {
  const isPhoto = config.type === 'photo';

  // ── Reprographie ────────────────────────────────────────────────
  if (!isPhoto) {
    const opts = options as ReproOptions;
    const priceKey = `${opts.format}|${opts.color}`;
    const unitHt = unitPricesHt[priceKey] ?? 0;
    const pages = opts.rectoVerso ? 2 : 1;
    let totalHt = unitHt * pages * opts.copies;
    if (opts.rectoVerso) totalHt *= 0.9;
    if (opts.copies >= 100) totalHt *= 0.8;
    else if (opts.copies >= 50) totalHt *= 0.9;
    totalHt = Math.round(totalHt * 100) / 100;

    return (
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
            value={opts.format}
            onValueChange={v => onOptionsChange({ ...opts, format: v })}
            className="flex gap-4"
          >
            {REPRO_FORMATS.map(f => (
              <div key={f.value} className="flex items-center space-x-2">
                <RadioGroupItem value={f.value} id={`fmt-${f.value}`} />
                <Label htmlFor={`fmt-${f.value}`} className="cursor-pointer">{f.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Couleur</Label>
          <RadioGroup
            value={opts.color}
            onValueChange={v => onOptionsChange({ ...opts, color: v })}
            className="flex gap-4"
          >
            {REPRO_COLORS.map(c => (
              <div key={c.value} className="flex items-center space-x-2">
                <RadioGroupItem value={c.value} id={`clr-${c.value}`} />
                <Label htmlFor={`clr-${c.value}`} className="cursor-pointer">{c.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Recto/Verso */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Impression</Label>
          <RadioGroup
            value={opts.rectoVerso ? 'recto-verso' : 'recto'}
            onValueChange={v => onOptionsChange({ ...opts, rectoVerso: v === 'recto-verso' })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recto" id="recto" />
              <Label htmlFor="recto" className="cursor-pointer">Recto</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recto-verso" id="rv" />
              <Label htmlFor="rv" className="cursor-pointer">Recto-verso</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Copies */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nombre de copies</Label>
          <div className="flex items-center gap-3">
            <Button
              type="button" variant="outline" size="icon"
              onClick={() => onOptionsChange({ ...opts, copies: Math.max(1, opts.copies - 1) })}
              disabled={opts.copies <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number" min={1} max={9999}
              value={opts.copies}
              onChange={e => onOptionsChange({ ...opts, copies: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-20 text-center"
            />
            <Button
              type="button" variant="outline" size="icon"
              onClick={() => onOptionsChange({ ...opts, copies: opts.copies + 1 })}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Price estimate */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prix unitaire :</span>
              <PriceDisplay priceHt={unitHt} />
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t">
              <span className="font-semibold">Total estimé :</span>
              <PriceDisplay priceHt={totalHt} className="text-lg" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <Button onClick={onNext} size="lg">
            Suivant <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Photo ───────────────────────────────────────────────────────
  const opts = options as PhotoOptions;

  const updateItem = (fileId: string, patch: Partial<PhotoItemOption>) => {
    onOptionsChange({
      ...opts,
      items: opts.items.map(it => it.fileId === fileId ? { ...it, ...patch } : it),
    });
  };

  const applyGlobalFormat = (format: string) => {
    onOptionsChange({
      ...opts,
      items: opts.items.map(it => ({ ...it, format })),
    });
  };

  const totalHt = opts.items.reduce((sum, it) => {
    const unitHt = unitPricesHt[it.format] ?? 0;
    return sum + unitHt * it.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold">Paramètres de tirage</h3>
        <p className="text-sm text-muted-foreground">{files.length} photo(s) sélectionnée(s)</p>
      </div>

      {/* Global format */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Format pour toutes les photos
              </Label>
              <Select
                value={opts.items[0]?.format ?? '10x15'}
                onValueChange={v => applyGlobalFormat(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHOTO_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label} — <PriceDisplay priceHt={unitPricesHt[f.value] ?? 0} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => applyGlobalFormat(opts.items[0]?.format ?? '10x15')}>
              Appliquer à toutes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Finish */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Finition</Label>
        <RadioGroup
          value={opts.finish}
          onValueChange={v => onOptionsChange({ ...opts, finish: v })}
          className="flex gap-4"
        >
          {PHOTO_FINISHES.map(f => (
            <div key={f.value} className="flex items-center space-x-2">
              <RadioGroupItem value={f.value} id={`fin-${f.value}`} />
              <Label htmlFor={`fin-${f.value}`} className="cursor-pointer">{f.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Per-photo settings */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Détail par photo</Label>
        <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-3">
          {opts.items.map(item => {
            const uploaded = files.find(f => f.id === item.fileId);
            if (!uploaded) return null;
            const unitHt = unitPricesHt[item.format] ?? 0;
            return (
              <div key={item.fileId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <img
                  src={uploaded.preview}
                  alt={uploaded.file.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate text-muted-foreground">{uploaded.file.name}</p>
                  <Select
                    value={item.format}
                    onValueChange={v => updateItem(item.fileId, { format: v })}
                  >
                    <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PHOTO_FORMATS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button" variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateItem(item.fileId, { quantity: Math.max(1, item.quantity - 1) })}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number" min={1} max={99}
                    value={item.quantity}
                    onChange={e => updateItem(item.fileId, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-12 h-7 text-center text-xs"
                  />
                  <Button
                    type="button" variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => updateItem(item.fileId, { quantity: item.quantity + 1 })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm font-medium w-20 text-right">
                  <PriceDisplay priceHt={Math.round(unitHt * item.quantity * 100) / 100} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <span className="font-semibold">Total estimé :</span>
            <PriceDisplay priceHt={Math.round(totalHt * 100) / 100} className="text-lg" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Button onClick={onNext} size="lg">
          Suivant <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
