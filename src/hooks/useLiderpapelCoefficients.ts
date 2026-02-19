import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LiderpapelCoefficient {
  id: string;
  family: string;
  subfamily: string | null;
  coefficient: number;
  created_at: string;
  updated_at: string;
}

export function useLiderpapelCoefficients() {
  const queryClient = useQueryClient();

  const { data: coefficients = [], isLoading } = useQuery({
    queryKey: ["liderpapel-coefficients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liderpapel_pricing_coefficients" as any)
        .select("*")
        .order("family", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LiderpapelCoefficient[];
    },
  });

  const addCoefficient = useMutation({
    mutationFn: async (input: { family: string; subfamily?: string; coefficient: number }) => {
      const { error } = await supabase
        .from("liderpapel_pricing_coefficients" as any)
        .insert({
          family: input.family,
          subfamily: input.subfamily || null,
          coefficient: input.coefficient,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liderpapel-coefficients"] });
      toast.success("Coefficient ajouté");
    },
    onError: (e: any) => toast.error("Erreur", { description: e.message }),
  });

  const updateCoefficient = useMutation({
    mutationFn: async (input: { id: string; coefficient: number }) => {
      const { error } = await supabase
        .from("liderpapel_pricing_coefficients" as any)
        .update({ coefficient: input.coefficient } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liderpapel-coefficients"] });
      toast.success("Coefficient mis à jour");
    },
    onError: (e: any) => toast.error("Erreur", { description: e.message }),
  });

  const deleteCoefficient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("liderpapel_pricing_coefficients" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liderpapel-coefficients"] });
      toast.success("Coefficient supprimé");
    },
    onError: (e: any) => toast.error("Erreur", { description: e.message }),
  });

  return { coefficients, isLoading, addCoefficient, updateCoefficient, deleteCoefficient };
}
