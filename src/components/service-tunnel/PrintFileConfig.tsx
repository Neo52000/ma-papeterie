import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FileText, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PRINT_FORMATS, FORMAT_LABELS, COLOR_LABELS, FINISHING_LABELS, PAPER_WEIGHT_OPTIONS,
  type PrintFormat, type PrintColor, type PrintFinishing, type PaperWeight,
  type PrintPriceEntry, type FinishingPriceEntry,
} from '@/components/print/printPricing';
import { calculatePrintItemTotal } from '@/lib/servicePricing';
import type { ServiceCartItem } from '@/stores/serviceCartStore';

interface PrintFileConfigProps {
  item: ServiceCartItem;
  prices: PrintPriceEntry[];
  finishingPrices: FinishingPriceEntry[];
  onUpdate: (id: string, updates: Partial<ServiceCartItem>) => void;
}

export default function PrintFileConfig({ item, prices, finishingPrices, onUpdate }: PrintFileConfigProps) {
  const format = (item.format || 'A4') as PrintFormat;
  const color = (item.color || 'nb') as PrintColor;
  const rectoVerso = item.rectoVerso ?? false;
  const paperWeight = (item.paperWeight || 80) as PaperWeight;
  const finishing = (item.finishing || 'none') as PrintFinishing;
  const copies = item.copies || 1;

  const recalc = (overrides: Partial<ServiceCartItem>) => {
    const config = {
      format: (overrides.format ?? format) as PrintFormat,
      color: (overrides.color ?? color) as PrintColor,
      rectoVerso: overrides.rectoVerso ?? rectoVerso,
      paperWeight: (overrides.paperWeight ?? paperWeight) as PaperWeight,
      finishing: (overrides.finishing ?? finishing) as PrintFinishing,
      copies: overrides.copies ?? copies,
    };
    const { unitPrice, lineTotal } = calculatePrintItemTotal(config, prices, finishingPrices);
    onUpdate(item.id, { ...overrides, unitPrice, lineTotal });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
      {/* Preview */}
      <div className="flex-shrink-0 w-16 h-16 bg-muted rounded flex items-center justify-center">
        {item.preview ? (
          <img src={item.preview} alt={item.fileName} className="w-full h-full object-cover rounded" />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 space-y-3">
        <p className="text-sm font-medium truncate">{item.fileName}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Format */}
          <div>
            <Label className="text-xs">Format</Label>
            <Select value={format} onValueChange={v => recalc({ format: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRINT_FORMATS.map(f => (
                  <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div>
            <Label className="text-xs">Couleur</Label>
            <Select value={color} onValueChange={v => recalc({ color: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['nb', 'couleur'] as PrintColor[]).map(c => (
                  <SelectItem key={c} value={c}>{COLOR_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paper weight */}
          <div>
            <Label className="text-xs">Grammage</Label>
            <Select value={String(paperWeight)} onValueChange={v => recalc({ paperWeight: Number(v) })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAPER_WEIGHT_OPTIONS.map(w => (
                  <SelectItem key={w.value} value={String(w.value)}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Finishing */}
          <div>
            <Label className="text-xs">Finition</Label>
            <Select value={finishing} onValueChange={v => recalc({ finishing: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(FINISHING_LABELS) as PrintFinishing[]).map(f => (
                  <SelectItem key={f} value={f}>{FINISHING_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recto-verso */}
          <div className="flex items-end gap-2 pb-1">
            <Switch
              checked={rectoVerso}
              onCheckedChange={v => recalc({ rectoVerso: v })}
              id={`rv-${item.id}`}
            />
            <Label htmlFor={`rv-${item.id}`} className="text-xs cursor-pointer">Recto-verso</Label>
          </div>

          {/* Copies */}
          <div>
            <Label className="text-xs">Copies</Label>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => recalc({ copies: Math.max(1, copies - 1) })} disabled={copies <= 1}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input type="number" min={1} value={copies}
                onChange={e => recalc({ copies: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-14 h-8 text-center text-xs" />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => recalc({ copies: copies + 1 })}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-right self-center">
        <p className="text-lg font-bold text-primary">{item.lineTotal.toFixed(2)} &euro;</p>
        <p className="text-xs text-muted-foreground">HT</p>
      </div>
    </div>
  );
}
