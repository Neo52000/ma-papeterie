import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Minus, Plus } from 'lucide-react';
import {
  PHOTO_FORMATS, PAPER_TYPE_LABELS,
  type PhotoFormat, type PhotoPaperType, type PhotoPriceEntry,
} from '@/components/photos/photoPricing';
import { getPhotoUnitPrice, getFormatLabel } from '@/components/photos/photoPricing';
import { checkResolution } from '@/lib/resolutionCheck';
import type { ServiceCartItem } from '@/stores/serviceCartStore';

interface PhotoFileConfigProps {
  item: ServiceCartItem;
  prices: PhotoPriceEntry[];
  onUpdate: (id: string, updates: Partial<ServiceCartItem>) => void;
}

export default function PhotoFileConfig({ item, prices, onUpdate }: PhotoFileConfigProps) {
  const photoFormat = (item.photoFormat || '10x15') as PhotoFormat;
  const paperType = (item.paperType || 'brillant') as PhotoPaperType;
  const whiteMargin = item.whiteMargin ?? false;
  const quantity = item.quantity || 1;

  const recalc = (overrides: Partial<ServiceCartItem>) => {
    const fmt = (overrides.photoFormat ?? photoFormat) as PhotoFormat;
    const pt = (overrides.paperType ?? paperType) as PhotoPaperType;
    const qty = overrides.quantity ?? quantity;
    const unitPrice = getPhotoUnitPrice(prices, fmt, pt);
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;

    // Check resolution
    let resolutionWarning = false;
    if (item.dimensions) {
      const check = checkResolution(item.dimensions.width, item.dimensions.height, fmt);
      resolutionWarning = !check.ok;
    }

    onUpdate(item.id, { ...overrides, unitPrice, lineTotal, resolutionWarning });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg">
      {/* Preview */}
      <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden">
        {item.preview ? (
          <img src={item.preview} alt={item.fileName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">IMG</div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          {item.resolutionWarning && (
            <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Résolution faible
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Photo format */}
          <div>
            <Label className="text-xs">Format</Label>
            <Select value={photoFormat} onValueChange={v => recalc({ photoFormat: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PHOTO_FORMATS.map(f => (
                  <SelectItem key={f} value={f}>
                    {getFormatLabel(prices, f)} — {getPhotoUnitPrice(prices, f, paperType).toFixed(2)} &euro;
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paper type */}
          <div>
            <Label className="text-xs">Papier</Label>
            <Select value={paperType} onValueChange={v => recalc({ paperType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PAPER_TYPE_LABELS) as PhotoPaperType[]).map(pt => (
                  <SelectItem key={pt} value={pt}>{PAPER_TYPE_LABELS[pt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* White margin */}
          <div className="flex items-end gap-2 pb-1">
            <Switch
              checked={whiteMargin}
              onCheckedChange={v => recalc({ whiteMargin: v })}
              id={`margin-${item.id}`}
            />
            <Label htmlFor={`margin-${item.id}`} className="text-xs cursor-pointer">Marge blanche</Label>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-xs">Quantité</Label>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => recalc({ quantity: Math.max(1, quantity - 1) })} disabled={quantity <= 1}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input type="number" min={1} value={quantity}
                onChange={e => recalc({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-14 h-8 text-center text-xs" />
              <Button type="button" variant="outline" size="icon" className="h-8 w-8"
                onClick={() => recalc({ quantity: quantity + 1 })}>
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
