import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, FileText } from 'lucide-react';
import { useServiceCartStore } from '@/stores/serviceCartStore';
import { FORMAT_LABELS, COLOR_LABELS, FINISHING_LABELS } from '@/components/print/printPricing';
import { PAPER_TYPE_LABELS } from '@/components/photos/photoPricing';
import type { PrintFormat, PrintColor, PrintFinishing } from '@/components/print/printPricing';
import type { PhotoPaperType } from '@/components/photos/photoPricing';

export default function ServiceCart() {
  const { items, removeItem, serviceType, totalHT, deliveryFee, totalTTC } = useServiceCartStore();

  const ht = totalHT();
  const fee = deliveryFee();
  const ttc = totalTTC();

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-center">Récapitulatif du panier</h3>

      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Votre panier est vide.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted">
                    {item.preview ? (
                      <img src={item.preview} alt={item.fileName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {serviceType === 'reprography' ? (
                        <>
                          {FORMAT_LABELS[item.format as PrintFormat] || item.format} —{' '}
                          {COLOR_LABELS[item.color as PrintColor] || item.color} —{' '}
                          {item.rectoVerso ? 'Recto-verso' : 'Recto'} —{' '}
                          {item.paperWeight}g —{' '}
                          {FINISHING_LABELS[item.finishing as PrintFinishing] || 'Aucune'} —{' '}
                          {item.copies} copie(s)
                        </>
                      ) : (
                        <>
                          {item.photoFormat} —{' '}
                          {PAPER_TYPE_LABELS[item.paperType as PhotoPaperType] || item.paperType} —{' '}
                          {item.whiteMargin ? 'Avec marge' : 'Sans marge'} —{' '}
                          x{item.quantity}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Price + delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.lineTotal.toFixed(2)} &euro;</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Totals */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{ht.toFixed(2)} &euro;</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA (20%)</span>
                <span>{(ht * 0.2).toFixed(2)} &euro;</span>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>{fee.toFixed(2)} &euro;</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>Total TTC</span>
                <span className="text-primary">{ttc.toFixed(2)} &euro;</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
