import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ServiceConfig } from '@/lib/serviceConfig';
import { calculateTva, htToTtc } from '@/lib/serviceConfig';
import type { UploadedFile } from '@/components/service-order/steps/StepUpload';
import type { ServiceOptions, ReproOptions, PhotoOptions } from '@/components/service-order/steps/StepOptions';
import type { DeliveryData } from '@/components/service-order/steps/StepDelivery';

export interface ServiceOrderSubmitParams {
  config: ServiceConfig;
  files: UploadedFile[];
  options: ServiceOptions;
  delivery: DeliveryData;
  notes: string;
  subtotalHt: number;
  shippingCostTtc: number;
  unitPricesHt: Record<string, number>;
}

interface SubmitResult {
  sessionUrl?: string;
  orderNumber: string;
}

export function useServiceOrder() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (params: ServiceOrderSubmitParams): Promise<SubmitResult | null> => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer commande.');
      return null;
    }

    const { config, files, options, delivery, notes, subtotalHt, shippingCostTtc, unitPricesHt } = params;
    if (files.length === 0) {
      toast.error(`Ajoutez au moins un ${config.file.fileLabel}.`);
      return null;
    }

    setSubmitting(true);

    try {
      const tvaAmount = calculateTva(subtotalHt);
      const totalTtc = htToTtc(subtotalHt) + shippingCostTtc;
      const orderNumber = `SVC-${Date.now()}`;
      const isPhoto = config.type === 'photo';

      // 1. Create order record
      const orderData: Record<string, any> = {
        user_id: user.id,
        order_number: orderNumber,
        service_type: config.type,
        status: 'pending',
        payment_status: 'pending',
        delivery_mode: delivery.mode,
        shipping_address: delivery.mode === 'shipping' ? delivery.address : null,
        shipping_cost: shippingCostTtc,
        subtotal_ht: subtotalHt,
        tva_amount: tvaAmount,
        total_ttc: totalTtc,
        notes: notes || null,
        customer_email: user.email || '',
        customer_phone: delivery.phone || null,
      };

      if (!isPhoto) {
        const opts = options as ReproOptions;
        orderData.print_format = opts.format;
        orderData.print_color = opts.color;
        orderData.recto_verso = opts.rectoVerso;
        orderData.copies = opts.copies;
      } else {
        const opts = options as PhotoOptions;
        orderData.photo_finish = opts.finish;
      }

      const { data: order, error: orderError } = await supabase
        .from('service_orders' as any)
        .insert(orderData as any)
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;
      const orderId = (order as any).id;

      // 2. Upload files and create items
      for (let i = 0; i < files.length; i++) {
        const uploaded = files[i];
        const timestamp = Date.now();
        const safeName = uploaded.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${user.id}/${orderId}/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('service-orders')
          .upload(filePath, uploaded.file, { contentType: uploaded.file.type });

        if (uploadError) throw uploadError;

        let itemUnitHt = 0;
        let itemQuantity = 1;
        let itemFormat: string | null = null;

        if (isPhoto) {
          const photoOpts = options as PhotoOptions;
          const itemOpt = photoOpts.items.find(it => it.fileId === uploaded.id);
          if (itemOpt) {
            itemFormat = itemOpt.format;
            itemQuantity = itemOpt.quantity;
            itemUnitHt = unitPricesHt[itemOpt.format] ?? 0;
          }
        } else {
          const reproOpts = options as ReproOptions;
          itemFormat = reproOpts.format;
          itemUnitHt = unitPricesHt[`${reproOpts.format}|${reproOpts.color}`] ?? 0;
          itemQuantity = 1; // Reprography: 1 item for the file, copies on order level
        }

        const itemSubtotalHt = Math.round(itemUnitHt * itemQuantity * 100) / 100;

        const { error: itemError } = await supabase
          .from('service_order_items' as any)
          .insert({
            order_id: orderId,
            file_path: filePath,
            file_name: uploaded.file.name,
            file_size: uploaded.file.size,
            format: itemFormat,
            quantity: itemQuantity,
            unit_price_ht: itemUnitHt,
            subtotal_ht: itemSubtotalHt,
          } as any);

        if (itemError) throw itemError;
      }

      // 3. Call Stripe checkout edge function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-service-checkout',
        {
          body: {
            service_order_id: orderId,
            order_number: orderNumber,
          },
        },
      );

      if (checkoutError) throw checkoutError;

      if (checkoutData?.sessionUrl) {
        return { sessionUrl: checkoutData.sessionUrl, orderNumber };
      }

      // Fallback if no Stripe URL (shouldn't happen normally)
      toast.success('Commande enregistrée !');
      return { orderNumber };
    } catch (err: any) {
      console.error('Service order error:', err);
      toast.error(err.message || 'Erreur lors de la commande.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting };
}
