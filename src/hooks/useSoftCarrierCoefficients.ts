import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SoftCarrierCoefficient {
  id: string;
  family: string;
  subfamily: string | null;
  coefficient: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSoftCarrierCoefficients() {
  const queryClient = useQueryClient();

  const { data: coefficients = [], isLoading } = useQuery({
    queryKey: ["softcarrier-coefficients"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("softcarrier_pricing_coefficients")
        .select("*")
        .order("family", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SoftCarrierCoefficient[];
    },
  });

  const addCoefficient = useMutation({
    mutationFn: async (input: { family: string; subfamily?: string; coefficient: number }) => {
      const { error } = await supabase
        .from("softcarrier_pricing_coefficients")
        .insert({
          family: input.family,
          subfamily: input.subfamily || null,
          coefficient: input.coefficient,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["softcarrier-coefficients"] });
      toast.success("Coefficient ajouté");
    },
    onError: (e: unknown) => toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) }),
  });

  const updateCoefficient = useMutation({
    mutationFn: async (input: { id: string; coefficient: number }) => {
      const { error } = await supabase
        .from("softcarrier_pricing_coefficients")
        .update({ coefficient: input.coefficient } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["softcarrier-coefficients"] });
      toast.success("Coefficient mis à jour");
    },
    onError: (e: unknown) => toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) }),
  });

  const deleteCoefficient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("softcarrier_pricing_coefficients")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["softcarrier-coefficients"] });
      toast.success("Coefficient supprimé");
    },
    onError: (e: unknown) => toast.error("Erreur", { description: e instanceof Error ? e.message : String(e) }),
  });

  return { coefficients, isLoading, addCoefficient, updateCoefficient, deleteCoefficient };
}
