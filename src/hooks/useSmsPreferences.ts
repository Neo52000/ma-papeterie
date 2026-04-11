import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";

// Table sms_preferences non encore présente dans les types Supabase auto-générés
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sbAny = supabase as any;

export interface SmsPreferences {
  id: string;
  user_id: string;
  phone_number: string | null;
  phone_verified: boolean;
  order_status: boolean;
  shipping_alerts: boolean;
  service_order_updates: boolean;
  wishlist_alerts: boolean;
  promotional: boolean;
  sms_enabled: boolean;
}

/** Lit les préférences SMS de l'utilisateur connecté */
export function useSmsPreferences() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["sms-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await sbAny
        .from("sms_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as SmsPreferences | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
}

type SmsPrefsUpdate = Partial<Omit<SmsPreferences, "id" | "user_id" | "phone_verified">>;

/** Mutation pour créer ou mettre à jour les préférences SMS */
export function useUpdateSmsPreferences() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (updates: SmsPrefsUpdate) => {
      if (!user?.id) throw new Error("Non connecté");

      // Upsert: insert if not exists, update if exists
      const { error } = await sbAny
        .from("sms_preferences")
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms-preferences"] });
      toast.success("Préférences SMS mises à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour des préférences SMS");
    },
  });
}
