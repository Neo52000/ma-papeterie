import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PhotoFinish, PhotoItem, PhotoPriceEntry } from '@/components/photos/photoPricing';
import { getPhotoUnitPrice, calculatePhotoOrderTotal } from '@/components/photos/photoPricing';

// Helper: cast supabase to bypass stale generated types
const db = supabase as unknown as SupabaseClient;

export interface PhotoOrderParams {
  items: PhotoItem[];
  finish: PhotoFinish;
  notes?: string;
  prices: PhotoPriceEntry[];
}

export function usePhotoUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const submit = async (params: PhotoOrderParams): Promise<string | null> => {
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer vos photos.");
      return null;
    }

    const { items, finish, notes, prices } = params;
    if (items.length === 0) {
      toast.error("Ajoutez au moins une photo.");
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const totalPrice = calculatePhotoOrderTotal(items, prices);

      // 1. Create the order
      const { data: order, error: orderError } = await db
        .from('photo_orders')
        .insert({
          user_id: user.id,
          finish,
          notes: notes || null,
          total_price: totalPrice,
          status: 'pending',
        })
        .select('id')
        .single();

      if (orderError) throw orderError;
      const orderId = (order as { id: string }).id;

      // 2. Upload each photo and create order items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const timestamp = Date.now();
        const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${user.id}/${orderId}/${timestamp}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('photo-prints')
          .upload(filePath, item.file, { contentType: item.file.type });

        if (uploadError) throw uploadError;

        const unitPrice = getPhotoUnitPrice(prices, item.format);

        const { error: itemError } = await db
          .from('photo_order_items')
          .insert({
            order_id: orderId,
            file_path: filePath,
            file_name: item.file.name,
            file_size: item.file.size,
            format: item.format,
            quantity: item.quantity,
            unit_price: unitPrice,
          });

        if (itemError) throw itemError;

        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      toast.success(`${items.length} photo(s) envoyée(s) avec succès ! Retrait en magasin.`);
      return orderId;
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error((err instanceof Error ? err.message : String(err)) || "Erreur lors de l'envoi des photos.");
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return { submit, uploading, progress };
}
