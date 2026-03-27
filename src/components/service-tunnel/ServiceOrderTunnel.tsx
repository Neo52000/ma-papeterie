import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ServiceStepper from './ServiceStepper';
import FileUploader from './FileUploader';
import PrintFileConfig from './PrintFileConfig';
import PhotoFileConfig from './PhotoFileConfig';
import ServiceCart from './ServiceCart';
import DeliverySelector from './DeliverySelector';
import CustomerInfoForm from './CustomerInfoForm';
import ServiceCheckout from './ServiceCheckout';
import { useServiceUpload, type ServiceType, type UploadedFile } from '@/hooks/useServiceUpload';
import { useServiceCartStore, type ServiceCartItem } from '@/stores/serviceCartStore';
import { usePrintPricing } from '@/hooks/usePrintPricing';
import { usePhotoPricing } from '@/hooks/usePhotoPricing';
import { useFinishingPricing } from '@/hooks/useFinishingPricing';
import { calculatePrintItemTotal, calculatePhotoItemTotal } from '@/lib/servicePricing';
import type { PrintFormat, PrintColor, PaperWeight, PrintFinishing, PrintPriceEntry, FinishingPriceEntry } from '@/components/print/printPricing';
import type { PhotoFormat, PhotoPaperType, PhotoPriceEntry } from '@/components/photos/photoPricing';

interface ServiceOrderTunnelProps {
  serviceType: ServiceType;
}

const STEPS_LABELS = ['Fichiers', 'Options', 'Panier', 'Livraison', 'Paiement'];

let cartItemId = 0;

export default function ServiceOrderTunnel({ serviceType }: ServiceOrderTunnelProps) {
  const [step, setStep] = useState(1);
  const upload = useServiceUpload(serviceType);
  const store = useServiceCartStore();
  const { data: printPrices = [] } = usePrintPricing() as { data: PrintPriceEntry[] | undefined };
  const { data: photoPrices = [] } = usePhotoPricing() as { data: PhotoPriceEntry[] | undefined };
  const { data: finishingPrices = [] } = useFinishingPricing() as { data: FinishingPriceEntry[] | undefined };

  // Sync serviceType
  useEffect(() => {
    store.setServiceType(serviceType);
  }, [serviceType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1 → 2: Build cart items from uploaded files
  const proceedToConfig = useCallback(async () => {
    if (upload.files.length === 0) {
      toast.error('Ajoutez au moins un fichier');
      return;
    }

    // Upload all files first
    const results = await upload.uploadAll();
    const failed = results.filter(f => f.status === 'error');
    if (failed.length > 0) {
      toast.error(`${failed.length} fichier(s) en erreur`);
      return;
    }

    // Create cart items from uploaded files
    const newItems: ServiceCartItem[] = results.map((f: UploadedFile) => {
      const id = `cart-${++cartItemId}`;
      if (serviceType === 'reprography') {
        const config = { format: 'A4' as PrintFormat, color: 'nb' as PrintColor, rectoVerso: false, paperWeight: 80 as PaperWeight, finishing: 'none' as PrintFinishing, copies: 1 };
        const { unitPrice, lineTotal } = calculatePrintItemTotal(config, printPrices, finishingPrices);
        return {
          id,
          fileId: f.id,
          filePath: f.filePath,
          fileName: f.fileName,
          fileSize: f.fileSize,
          fileType: f.fileType,
          preview: f.preview,
          format: 'A4',
          color: 'nb',
          rectoVerso: false,
          paperWeight: 80,
          finishing: 'none',
          copies: 1,
          unitPrice,
          lineTotal,
          dimensions: f.dimensions,
        };
      } else {
        const config = { format: '10x15' as PhotoFormat, paperType: 'brillant' as PhotoPaperType, whiteMargin: false, quantity: 1 };
        const { unitPrice, lineTotal } = calculatePhotoItemTotal(config, photoPrices);
        return {
          id,
          fileId: f.id,
          filePath: f.filePath,
          fileName: f.fileName,
          fileSize: f.fileSize,
          fileType: f.fileType,
          preview: f.preview,
          photoFormat: '10x15',
          paperType: 'brillant',
          whiteMargin: false,
          quantity: 1,
          unitPrice,
          lineTotal,
          dimensions: f.dimensions,
        };
      }
    });

    store.setItems(newItems);
    setStep(2);
  }, [upload, serviceType, printPrices, photoPrices, finishingPrices, store]);

  const canProceedFromStep4 = () => {
    const { customer, delivery } = store;
    if (!customer.email || !customer.name) return false;
    if (delivery.mode === 'delivery') {
      const a = delivery.address;
      if (!a?.street || !a?.city || !a?.postal_code) return false;
    }
    return true;
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <ServiceStepper steps={STEPS_LABELS} currentStep={step} />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">
                {serviceType === 'photo' ? 'Tirage photo express' : 'Reprographie express'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {serviceType === 'photo'
                  ? 'Formats acceptés : JPG, PNG, TIFF — Max 50 Mo par fichier'
                  : 'Formats acceptés : PDF, DOC, DOCX, JPG, PNG — Max 50 Mo par fichier'}
              </p>
            </div>

            <FileUploader
              files={upload.files}
              onAddFiles={upload.addFiles}
              onRemoveFile={upload.removeFile}
              acceptedTypes={upload.acceptedTypes}
              maxFiles={upload.maxFiles}
              maxFileSize={upload.maxFileSize}
              uploading={upload.uploading}
            />

            <div className="flex justify-end">
              <Button
                onClick={proceedToConfig}
                disabled={upload.files.length === 0 || upload.uploading}
                size="lg"
              >
                {upload.uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Per-file configuration */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">Options par fichier</h3>
              <p className="text-sm text-muted-foreground">{store.items.length} fichier(s)</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {store.items.map(item => (
                serviceType === 'reprography' ? (
                  <PrintFileConfig
                    key={item.id}
                    item={item}
                    prices={printPrices}
                    finishingPrices={finishingPrices}
                    onUpdate={store.updateItem}
                  />
                ) : (
                  <PhotoFileConfig
                    key={item.id}
                    item={item}
                    prices={photoPrices}
                    onUpdate={store.updateItem}
                  />
                )
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setStep(3)} size="lg">
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Cart review */}
        {step === 3 && (
          <div className="space-y-6">
            <ServiceCart />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button onClick={() => setStep(4)} disabled={store.items.length === 0} size="lg">
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Delivery + Customer info */}
        {step === 4 && (
          <div className="space-y-6">
            <DeliverySelector />
            <CustomerInfoForm />

            {/* Notes */}
            <div className="space-y-2 max-w-md mx-auto">
              <Label className="text-sm">Instructions (optionnel)</Label>
              <Textarea
                placeholder="Ex : Qualité maximale, recadrer..."
                value={store.notes}
                onChange={e => store.setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
              <Button
                onClick={() => {
                  if (!canProceedFromStep4()) {
                    toast.error('Veuillez compléter les champs obligatoires');
                    return;
                  }
                  setStep(5);
                }}
                size="lg"
              >
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Checkout */}
        {step === 5 && (
          <div className="space-y-6">
            <ServiceCheckout />

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Retour
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
