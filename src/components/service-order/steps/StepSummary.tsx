import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Loader2, Store, Truck } from 'lucide-react';
import type { ServiceConfig } from '@/lib/serviceConfig';
import { htToTtc, calculateTva } from '@/lib/serviceConfig';
import type { UploadedFile } from './StepUpload';
import type { ServiceOptions, ReproOptions, PhotoOptions } from './StepOptions';
import type { DeliveryData } from './StepDelivery';
import { REPRO_FORMATS, REPRO_COLORS, PHOTO_FINISHES } from '@/lib/serviceConfig';

interface StepSummaryProps {
  config: ServiceConfig;
  files: UploadedFile[];
  options: ServiceOptions;
  delivery: DeliveryData;
  notes: string;
  onNotesChange: (notes: string) => void;
  subtotalHt: number;
  shippingCostTtc: number;
  unitPricesHt: Record<string, number>;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StepSummary({
  config, files, options, delivery, notes, onNotesChange,
  subtotalHt, shippingCostTtc, unitPricesHt: _unitPricesHt, submitting, onBack, onSubmit,
}: StepSummaryProps) {
  const isPhoto = config.type === 'photo';
  const tvaAmount = calculateTva(subtotalHt);
  const subtotalTtc = htToTtc(subtotalHt);
  const totalTtc = subtotalTtc + shippingCostTtc;
  const shippingHt = shippingCostTtc > 0 ? Math.round((shippingCostTtc / 1.20) * 100) / 100 : 0;
  const totalHt = subtotalHt + shippingHt;

  const getLabel = (choices: { value: string; label: string }[], value: string) =>
    choices.find(c => c.value === value)?.label ?? value;

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold">Récapitulatif de commande</h3>
        <p className="text-sm text-muted-foreground">Vérifiez votre commande avant le paiement</p>
      </div>

      {/* Order details */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">
            {config.title}
          </h4>

          {!isPhoto ? (
            <>
              {/* Reprographie summary */}
              {(() => {
                const opts = options as ReproOptions;
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fichier :</span>
                      <span className="font-medium truncate ml-4 max-w-[200px]">{files[0]?.file.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format :</span>
                      <span>{getLabel(REPRO_FORMATS, opts.format)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Couleur :</span>
                      <span>{getLabel(REPRO_COLORS, opts.color)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impression :</span>
                      <span>{opts.rectoVerso ? 'Recto-verso' : 'Recto'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Copies :</span>
                      <span>{opts.copies}</span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <>
              {/* Photo summary */}
              {(() => {
                const opts = options as PhotoOptions;
                const totalPrints = opts.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Photos :</span>
                      <span className="font-medium">{files.length} fichier(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tirages :</span>
                      <span>{totalPrints} exemplaire(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Finition :</span>
                      <span>{getLabel(PHOTO_FINISHES, opts.finish)}</span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          <Separator />

          {/* Delivery */}
          <div className="flex items-start gap-2 text-sm">
            {delivery.mode === 'pickup' ? (
              <>
                <Store className="h-4 w-4 mt-0.5 text-green-600" />
                <div>
                  <p className="font-medium">Retrait en boutique</p>
                  <p className="text-xs text-muted-foreground">Ma Papeterie — Chaumont</p>
                </div>
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium">Livraison à domicile</p>
                  <p className="text-xs text-muted-foreground">
                    {delivery.address.street}, {delivery.address.postal_code} {delivery.address.city}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Instructions (optionnel)</Label>
        <Textarea
          placeholder="Ex : Recadrage, reliure, instructions spéciales..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          rows={2}
        />
      </div>

      {/* Price breakdown */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total HT :</span>
            <span>{subtotalHt.toFixed(2)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TVA (20%) :</span>
            <span>{tvaAmount.toFixed(2)} &euro;</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total TTC :</span>
            <span>{subtotalTtc.toFixed(2)} &euro;</span>
          </div>
          {delivery.mode === 'shipping' && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Livraison :</span>
              <span>
                {shippingCostTtc === 0
                  ? <span className="text-green-600">Gratuit</span>
                  : <>{shippingCostTtc.toFixed(2)} &euro; TTC</>
                }
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Total HT :</span>
            <span className="font-semibold">{totalHt.toFixed(2)} &euro;</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold text-lg">Total TTC :</span>
            <span className="font-bold text-lg text-primary">{totalTtc.toFixed(2)} &euro;</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>
        <Button onClick={onSubmit} disabled={submitting} size="lg">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Payer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
