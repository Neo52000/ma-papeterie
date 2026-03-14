import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DataProcessingRecord {
  id: string;
  processing_name: string;
  processing_purpose: string;
  legal_basis: string;
  data_categories: string[];
  data_subjects: string[];
  recipients: string[];
  third_country_transfers: string | null;
  retention_period: string;
  security_measures: string | null;
  data_source: string | null;
  is_automated_decision: boolean;
  dpia_required: boolean;
  dpia_conducted_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
}

export function useDataProcessingRegister() {
  return useQuery({
    queryKey: ["data-processing-register"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_processing_register")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DataProcessingRecord[];
    },
  });
}

export function useCreateProcessingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase
        .from("data_processing_register")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-processing-register"] });
      toast.success("Traitement ajouté au registre");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'ajout: " + error.message);
    },
  });
}

export function useUpdateProcessingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DataProcessingRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from("data_processing_register")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-processing-register"] });
      toast.success("Traitement mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteProcessingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("data_processing_register")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-processing-register"] });
      toast.success("Traitement supprimé du registre");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
