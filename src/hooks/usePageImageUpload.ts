import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePageImageUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, pageSlug: string): Promise<string> => {
    if (!file.type.startsWith("image/")) throw new Error("Le fichier doit être une image");
    if (file.size > 10 * 1024 * 1024) throw new Error("L'image ne doit pas dépasser 10 Mo");

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${pageSlug || "misc"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("page-images")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("page-images").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
