import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

export type StepState =
  | 'idle'
  | 'uploading'
  | 'ocr_processing'
  | 'parsing'
  | 'matching'
  | 'results'
  | 'error';

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

export interface SchoolListCandidate {
  product_id: string;
  product_name: string;
  name?: string;
  score: number;
  price_ttc?: number;
  price?: number;
  image_url?: string | null;
  brand?: string;
  reason?: string;
  tier?: string;
  eco?: boolean;
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
  candidates: SchoolListCandidate[];
  selected_product_id: string | null;
  tier: string | null;
}

export interface SchoolListCartItem {
  product_id: string;
  product_name: string;
  price_ttc?: number;
  price?: number;
  image_url?: string | null;
  quantity: number;
  eco?: boolean;
}

export interface SchoolListCart {
  id: string;
  upload_id: string;
  tier: 'essentiel' | 'equilibre' | 'premium';
  total_ht: number;
  total_ttc: number;
  items_count: number;
  items: SchoolListCartItem[];
}

export interface MatchStats {
  total_items: number;
  matched: number;
  partial: number;
  unmatched: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export const useSchoolCopilot = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();

  const [state, setState] = useState<StepState>('idle');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<SchoolListUpload | null>(null);
  const [matches, setMatches] = useState<SchoolListMatch[]>([]);
  const [carts, setCarts] = useState<SchoolListCart[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [classe, setClasse] = useState<string | null>(null);
  const [ecole, setEcole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, schoolName?: string, classLevel?: string) => {
    if (!user) {
      toast.error("Veuillez vous connecter");
      return null;
    }

    setUploading(true);
    setState('uploading');
    setError(null);

    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('school-lists')
        .upload(filePath, file);

      if (storageError) throw storageError;

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Erreur lors de l'upload");
      setState('error');
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, [user]);

  // Pipeline unifié : OCR + parsing + matching en un seul appel
  const processUpload = useCallback(async (uploadId: string) => {
    setProcessing(true);
    setState('ocr_processing');
    setError(null);

    try {
      // Simuler la progression des étapes via un timer
      // L'Edge Function fait tout en interne
      const progressTimer = setTimeout(() => setState('parsing'), 5000);
      const matchingTimer = setTimeout(() => setState('matching'), 10000);

      const { data, error: fnError } = await supabase.functions.invoke('process-school-list', {
        body: { uploadId },
      });

      clearTimeout(progressTimer);
      clearTimeout(matchingTimer);

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Mettre à jour les stats
      if (data?.stats) {
        setStats(data.stats as MatchStats);
      }
      if (data?.classe) setClasse(data.classe);
      if (data?.ecole) setEcole(data.ecole);

      // Récupérer les matches et carts depuis la DB
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

      setMatches((matchesRes.data || []) as unknown as SchoolListMatch[]);
      setCarts((cartsRes.data || []) as unknown as SchoolListCart[]);

      setState('results');
      toast.success(`${data.items_count} articles extraits — ${data.matched} produits trouvés`);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Erreur lors du traitement");
      setState('error');
      setError(msg);
      return null;
    } finally {
      setProcessing(false);
      setMatching(false);
    }
  }, []);

  // Conservé pour compatibilité mais redirige vers processUpload
  const matchProducts = useCallback(async (uploadId: string) => {
    setMatching(true);
    try {
      // Les matches sont déjà faits par processUpload, on recharge juste
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

      setMatches((matchesRes.data || []) as unknown as SchoolListMatch[]);
      setCarts((cartsRes.data || []) as unknown as SchoolListCart[]);

      const matched = (matchesRes.data || []).filter(
        (m: Record<string, unknown>) => m.match_status === 'matched',
      ).length;
      const unmatched = (matchesRes.data || []).filter(
        (m: Record<string, unknown>) => m.match_status === 'unmatched',
      ).length;

      return { success: true, matched, unmatched };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du matching");
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
    setMatches((matchesRes.data || []) as unknown as SchoolListMatch[]);
    setCarts((cartsRes.data || []) as unknown as SchoolListCart[]);
  }, []);

  // Ajouter des articles sélectionnés au panier (vue checkboxes)
  const addSelectedToCart = useCallback((selectedMatchIds: string[]) => {
    const selected = matches.filter((m) => selectedMatchIds.includes(m.id));
    let addedCount = 0;

    for (const match of selected) {
      const candidate = match.candidates?.[0];
      if (!candidate) continue;

      const productId = candidate.product_id;
      const productName = candidate.product_name || candidate.name || 'Produit';
      const price = String(candidate.price_ttc ?? candidate.price ?? 0);
      const image = candidate.image_url || '/placeholder.svg';

      for (let i = 0; i < (match.item_quantity || 1); i++) {
        addToCart({
          id: productId,
          name: productName,
          price,
          image,
          category: 'scolaire',
          stock_quantity: 999,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} article${addedCount > 1 ? 's' : ''} ajouté${addedCount > 1 ? 's' : ''} au panier`);

      // Tracker la conversion
      if (currentUpload?.id) {
        supabase
          .from('school_list_sessions')
          .update({ cart_added_at: new Date().toISOString() })
          .eq('upload_id', currentUpload.id)
          .then(() => { /* fire and forget */ });
      }
    }
  }, [matches, addToCart, currentUpload]);

  const reset = useCallback(() => {
    setCurrentUpload(null);
    setMatches([]);
    setCarts([]);
    setStats(null);
    setClasse(null);
    setEcole(null);
    setError(null);
    setState('idle');
  }, []);

  return {
    // États
    state,
    uploading,
    processing,
    matching,
    error,
    // Données
    currentUpload,
    matches,
    carts,
    stats,
    classe,
    ecole,
    // Actions
    uploadFile,
    processUpload,
    matchProducts,
    fetchUploadData,
    addSelectedToCart,
    reset,
  };
};
