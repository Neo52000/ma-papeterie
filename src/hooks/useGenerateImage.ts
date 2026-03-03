import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GenerateImageInput {
  prompt: string;
  model?: "dall-e-3" | "gpt-image-1";
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd" | "auto";
  style?: "natural" | "vivid";
  pageSlug?: string;
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt: string | null;
  fileName: string;
  model: string;
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: async (input: GenerateImageInput): Promise<GenerateImageResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous");

      const resp = await supabase.functions.invoke("generate-page-image", {
        body: input,
      });

      if (resp.error) throw new Error(resp.error.message ?? "Erreur edge function");
      return resp.data as GenerateImageResult;
    },
  });
}
