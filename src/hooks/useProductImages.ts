import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, Product } from '@/hooks/useProducts';
import { toast } from 'sonner';

export const useProductImages = () => {
  const { products, loading, refetch } = useProducts();
  const [enriching, setEnriching] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const productsWithoutImage = products.filter(
    (p) => !p.image_url || p.image_url === '/placeholder.svg' || p.image_url.trim() === ''
  );

  const productsWithImage = products.filter(
    (p) => p.image_url && p.image_url !== '/placeholder.svg' && p.image_url.trim() !== ''
  );

  const enrichFromUrl = async (productId: string, imageUrl: string) => {
    setEnriching((prev) => ({ ...prev, [productId]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const response = await fetch(
        `https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/enrich-product-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ product_id: productId, image_url: imageUrl }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur inconnue');

      toast.success(`Image associée à "${result.product_name}"`);
      await refetch();
      return result;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'enrichissement');
      throw err;
    } finally {
      setEnriching((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const uploadDirect = async (productId: string, file: File) => {
    setUploading((prev) => ({ ...prev, [productId]: true }));
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 10 MB)');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Le fichier doit être une image');
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `${productId}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrlData.publicUrl })
        .eq('id', productId);

      if (updateError) throw updateError;

      toast.success('Image uploadée avec succès');
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
      throw err;
    } finally {
      setUploading((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const enrichBatch = async (
    items: Array<{ product_name?: string; ean?: string; image_url: string }>
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const response = await fetch(
        `https://mgojmkzovqgpipybelrr.supabase.co/functions/v1/enrich-products-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ items }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur inconnue');

      toast.success(`${result.successCount} images importées, ${result.errorCount} erreurs`);
      await refetch();
      return result;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'import en masse");
      throw err;
    }
  };

  return {
    products,
    productsWithoutImage,
    productsWithImage,
    loading,
    enriching,
    uploading,
    enrichFromUrl,
    uploadDirect,
    enrichBatch,
    refetch,
  };
};
