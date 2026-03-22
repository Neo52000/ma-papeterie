import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export function useSocialMediaUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File): Promise<string> => {
    const isImage = IMAGE_TYPES.includes(file.type);
    const isVideo = VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      throw new Error("Format non supporté. Utilisez JPG, PNG, WebP, GIF, MP4 ou MOV.");
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      throw new Error("L'image ne doit pas dépasser 10 Mo");
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      throw new Error("La vidéo ne doit pas dépasser 50 Mo");
    }

    setUploading(true);
    try {
      // Derive extension from MIME type (not filename) to prevent spoofing
      const ext = file.type.split("/")[1]?.replace("+xml", "").replace("quicktime", "mov") || (isImage ? "jpg" : "mp4");
      const path = `standalone/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("social-media")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("social-media").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading };
}
