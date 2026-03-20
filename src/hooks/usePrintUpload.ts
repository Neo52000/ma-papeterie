import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PrintFormat, PrintColor } from '@/components/print/printPricing';

export interface PrintOrderParams {
  file: File;
  format: PrintFormat;
  color: PrintColor;
  rectoVerso: boolean;
  copies: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export function usePrintUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const submit = async (params: PrintOrderParams): Promise<string | null> => {
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un document.");
      return null;
    }

    const { file, format, color, rectoVerso, copies, notes, unitPrice, totalPrice } = params;

    // Validate PDF
    if (file.type !== 'application/pdf') {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return null;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 50 Mo.");
      return null;
    }

    setUploading(true);
    try {
      // 1. Upload file to storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('print-documents')
        .upload(filePath, file, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      // 2. Insert print order record
      const { data, error: insertError } = await supabase
        .from('print_orders' as any)
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          format,
          color,
          recto_verso: rectoVerso,
          copies,
          notes: notes || null,
          unit_price: unitPrice,
          total_price: totalPrice,
          status: 'pending',
        } as any)
        .select('id')
        .single();

      if (insertError) throw insertError;

      toast.success("Document envoyé avec succès ! Nous vous contacterons quand il sera prêt.");
      return (data as any)?.id ?? null;
    } catch (err: any) {
      console.error('Print upload error:', err);
      toast.error(err.message || "Erreur lors de l'envoi du document.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { submit, uploading };
}
