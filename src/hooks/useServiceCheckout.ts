import { useState } from 'react';
import { supabase, SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';
import { useServiceCartStore } from '@/stores/serviceCartStore';
import { toast } from 'sonner';
import { captureException } from '@/lib/sentry-config';
import { isAllowedRedirectUrl } from '@/lib/validate-redirect';

export function useServiceCheckout() {
  const [loading, setLoading] = useState(false);
  const store = useServiceCartStore();

  const checkout = async (): Promise<void> => {
    if (store.items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    if (!store.customer.email || !store.customer.name) {
      toast.error('Veuillez renseigner votre email et votre nom');
      return;
    }

    // Validate delivery address if needed
    if (store.delivery.mode === 'delivery') {
      const addr = store.delivery.address;
      if (!addr?.street || !addr?.city || !addr?.postal_code) {
        toast.error('Veuillez compléter l\'adresse de livraison');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error('Vous devez être connecté pour passer commande');
        return;
      }

      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/create-service-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          service_type: store.serviceType,
          items: store.items.map(item => ({
            file_path: item.filePath,
            file_name: item.fileName,
            file_size: item.fileSize,
            file_type: item.fileType,
            // Reprography
            format: item.format,
            color: item.color,
            recto_verso: item.rectoVerso,
            paper_weight: item.paperWeight,
            finishing: item.finishing,
            copies: item.copies,
            // Photo
            photo_format: item.photoFormat,
            paper_type: item.paperType,
            white_margin: item.whiteMargin,
            quantity: item.quantity,
            // Pricing
            unit_price: item.unitPrice,
            line_total: item.lineTotal,
            resolution_warning: item.resolutionWarning,
          })),
          delivery_mode: store.delivery.mode,
          shipping_address: store.delivery.mode === 'delivery' ? store.delivery.address : null,
          customer_email: store.customer.email,
          customer_name: store.customer.name,
          customer_phone: store.customer.phone || null,
          email_notifications: store.customer.emailNotifications,
          notes: store.notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de la commande');
      }

      // Redirect to Stripe checkout
      if (result.sessionUrl && isAllowedRedirectUrl(result.sessionUrl)) {
        window.location.href = result.sessionUrl;
      } else if (result.sessionUrl) {
        throw new Error('URL de paiement invalide');
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Service checkout error:', err);
      captureException(err instanceof Error ? err : new Error(String(err)), { hook: 'useServiceCheckout' });
      toast.error((err instanceof Error ? err.message : String(err)) || 'Erreur lors du paiement');
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
