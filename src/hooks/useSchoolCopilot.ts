import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SchoolListUpload {
  id: string;
  file_name: string;
  file_type: string;
  school_name: string | null;
  class_level: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message: string | null;
  items_count: number;
  created_at: string;
}

export interface SchoolListMatch {
  id: string;
  upload_id: string;
  item_label: string;
  item_quantity: number;
  is_mandatory: boolean;
  constraints: string | null;
  match_status: 'pending' | 'matched' | 'partial' | 'unmatched';
  confidence: number;
  candidates: any[];
  selected_product_id: string | null;
  tier: string | null;
}

export interface SchoolListCart {
  id: string;
  upload_id: string;
  tier: 'essentiel' | 'equilibre' | 'premium';
  total_ht: number;
  total_ttc: number;
  items_count: number;
  items: any[];
}

export const useSchoolCopilot = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<SchoolListUpload | null>(null);
  const [matches, setMatches] = useState<SchoolListMatch[]>([]);
  const [carts, setCarts] = useState<SchoolListCart[]>([]);

  const uploadFile = useCallback(async (file: File, schoolName?: string, classLevel?: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter");
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      // Upload to storage
      const { error: storageError } = await supabase.storage
        .from('school-lists')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // Create upload record
      const { data: upload, error: dbError } = await supabase
        .from('school_list_uploads')
        .insert({
          user_id: user.id,
          file_path: filePath,
          file_name: file.name,
          file_type: file.type,
          school_name: schoolName || null,
          class_level: classLevel || null,
          status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setCurrentUpload(upload as SchoolListUpload);
      return upload as SchoolListUpload;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
      return null;
    } finally {
      setUploading(false);
    }
  }, [user]);

  const processUpload = useCallback(async (uploadId: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-school-list', {
        body: { uploadId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${data.items_count} articles extraits`);
      return data;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du traitement");
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  const matchProducts = useCallback(async (uploadId: string) => {
    setMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke('match-school-products', {
        body: { uploadId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Fetch matches and carts
      const [matchesRes, cartsRes] = await Promise.all([
        supabase
          .from('school_list_matches')
          .select('*')
          .eq('upload_id', uploadId)
          .order('item_label'),
        supabase
          .from('school_list_carts')
          .select('*')
          .eq('upload_id', uploadId)
          .order('tier'),
      ]);

      setMatches((matchesRes.data || []) as SchoolListMatch[]);
      setCarts((cartsRes.data || []) as SchoolListCart[]);

      toast.success(`${data.matched} produits trouvés, ${data.unmatched} sans correspondance`);
      return data;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du matching");
      return null;
    } finally {
      setMatching(false);
    }
  }, []);

  const fetchUploadData = useCallback(async (uploadId: string) => {
    const [uploadRes, matchesRes, cartsRes] = await Promise.all([
      supabase.from('school_list_uploads').select('*').eq('id', uploadId).single(),
      supabase.from('school_list_matches').select('*').eq('upload_id', uploadId).order('item_label'),
      supabase.from('school_list_carts').select('*').eq('upload_id', uploadId).order('tier'),
    ]);

    if (uploadRes.data) setCurrentUpload(uploadRes.data as SchoolListUpload);
    setMatches((matchesRes.data || []) as SchoolListMatch[]);
    setCarts((cartsRes.data || []) as SchoolListCart[]);
  }, []);

  const reset = useCallback(() => {
    setCurrentUpload(null);
    setMatches([]);
    setCarts([]);
  }, []);

  return {
    uploading,
    processing,
    matching,
    currentUpload,
    matches,
    carts,
    uploadFile,
    processUpload,
    matchProducts,
    fetchUploadData,
    reset,
  };
};
