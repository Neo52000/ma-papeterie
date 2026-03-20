import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import ServiceStepper from './ServiceStepper';
import StepUpload, { type UploadedFile } from './steps/StepUpload';
import StepOptions, {
  type ServiceOptions, type ReproOptions, type PhotoOptions, type PhotoItemOption,
} from './steps/StepOptions';
import StepDelivery, { type DeliveryData } from './steps/StepDelivery';
import StepSummary from './steps/StepSummary';
import StepConfirmation from './steps/StepConfirmation';
import type { ServiceConfig } from '@/lib/serviceConfig';
import { getShippingCost, htToTtc } from '@/lib/serviceConfig';
import { useServicePricing } from '@/hooks/useServicePricing';
import { useServiceOrder } from '@/hooks/useServiceOrder';

interface ServiceOrderTunnelProps {
  config: ServiceConfig;
}

export default function ServiceOrderTunnel({ config }: ServiceOrderTunnelProps) {
  const [searchParams] = useSearchParams();
  const isPhoto = config.type === 'photo';

  // ── State ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  // Options
  const defaultReproOptions: ReproOptions = { format: 'A4', color: 'nb', rectoVerso: false, copies: 1 };
  const defaultPhotoOptions: PhotoOptions = { finish: 'brillant', items: [] };
  const [options, setOptions] = useState<ServiceOptions>(
    isPhoto ? defaultPhotoOptions : defaultReproOptions,
  );

  // Delivery
  const [delivery, setDelivery] = useState<DeliveryData>({
    mode: 'pickup',
    address: { street: '', city: '', postal_code: '', country: 'France' },
    phone: '',
  });

  // ── Pricing ─────────────────────────────────────────────────────
  const { unitPricesHt } = useServicePricing(config.type);

  // ── Computed subtotal HT ────────────────────────────────────────
  const subtotalHt = useMemo(() => {
    if (!isPhoto) {
      const opts = options as ReproOptions;
      const key = `${opts.format}|${opts.color}`;
      const unitHt = unitPricesHt[key] ?? 0;
      const pages = opts.rectoVerso ? 2 : 1;
      let total = unitHt * pages * opts.copies;
      if (opts.rectoVerso) total *= 0.9;
      if (opts.copies >= 100) total *= 0.8;
      else if (opts.copies >= 50) total *= 0.9;
      return Math.round(total * 100) / 100;
    }
    const opts = options as PhotoOptions;
    return Math.round(
      opts.items.reduce((sum, it) => sum + (unitPricesHt[it.format] ?? 0) * it.quantity, 0) * 100,
    ) / 100;
  }, [options, unitPricesHt, isPhoto]);

  const shippingCostTtc = useMemo(
    () => delivery.mode === 'shipping' ? getShippingCost(htToTtc(subtotalHt)) : 0,
    [delivery.mode, subtotalHt],
  );

  // ── Service order hook ──────────────────────────────────────────
  const { submit, submitting } = useServiceOrder();

  // ── Handle files change (sync photo options) ────────────────────
  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    if (isPhoto) {
      setOptions(prev => {
        const photoOpts = prev as PhotoOptions;
        const existingMap = new Map(photoOpts.items.map(it => [it.fileId, it]));
        const items: PhotoItemOption[] = newFiles.map(f =>
          existingMap.get(f.id) ?? { fileId: f.id, format: '10x15', quantity: 1 },
        );
        return { ...photoOpts, items };
      });
    }
  }, [isPhoto]);

  // ── Submit → Stripe ─────────────────────────────────────────────
  const handleSubmit = async () => {
    const result = await submit({
      config,
      files,
      options,
      delivery,
      notes,
      subtotalHt,
      shippingCostTtc,
      unitPricesHt,
    });
    if (result) {
      // If Stripe URL returned, redirect
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      } else {
        setOrderNumber(result.orderNumber);
        setStep(5);
      }
    }
  };

  // ── Handle confirmation from Stripe return ──────────────────────
  const sessionId = searchParams.get('session_id');
  const returnedOrderNumber = searchParams.get('order_number');
  if (sessionId && returnedOrderNumber && step !== 5) {
    setOrderNumber(returnedOrderNumber);
    setStep(5);
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader className="pb-4">
        <ServiceStepper
          labels={config.stepLabels}
          currentStep={step}
          completedStep={step === 5 ? 5 : undefined}
        />
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <StepUpload
            config={config}
            files={files}
            onFilesChange={handleFilesChange}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepOptions
            config={config}
            files={files}
            options={options}
            onOptionsChange={setOptions}
            unitPricesHt={unitPricesHt}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepDelivery
            delivery={delivery}
            onDeliveryChange={setDelivery}
            shippingCost={shippingCostTtc}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <StepSummary
            config={config}
            files={files}
            options={options}
            delivery={delivery}
            notes={notes}
            onNotesChange={setNotes}
            subtotalHt={subtotalHt}
            shippingCostTtc={shippingCostTtc}
            unitPricesHt={unitPricesHt}
            submitting={submitting}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
          />
        )}

        {step === 5 && (
          <StepConfirmation
            config={config}
            orderNumber={orderNumber}
            deliveryMode={delivery.mode}
          />
        )}
      </CardContent>
    </Card>
  );
}
