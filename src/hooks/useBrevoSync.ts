import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Fire-and-forget: sync contact Brevo + envoi email transactionnel.
 * Ne bloque jamais le tunnel de commande.
 */
export function fireBrevoSync(
  orderId: string,
  email: string,
  orderNumber: string,
  totalAmount: number,
) {
  // Contact sync
  supabase.functions
    .invoke("brevo-sync-contact", {
      body: { order_id: orderId },
    })
    .catch((err) => {
      if (import.meta.env.DEV) console.error("Brevo sync error:", err);
    });

  // Transactional email
  supabase.functions
    .invoke("brevo-send-transactional", {
      body: {
        to_email: email,
        params: {
          ORDER_ID: orderNumber,
          MONTANT_TTC: totalAmount,
        },
        order_id: orderId,
      },
    })
    .catch((err) => {
      if (import.meta.env.DEV) console.error("Brevo email error:", err);
    });
}

/** Mutation pour re-sync manuel depuis le dashboard admin */
export function useBrevoResync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "brevo-sync-contact",
        { body: { order_id: orderId } },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brevo-sync-logs"] });
      toast.success("Contact Brevo re-synchronisé");
    },
    onError: () => {
      toast.error("Erreur lors de la re-synchronisation Brevo");
    },
  });
}
