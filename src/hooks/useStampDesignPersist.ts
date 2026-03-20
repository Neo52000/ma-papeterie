import { supabase } from '@/integrations/supabase/client';
import { useStampDesignerStore } from '@/stores/stampDesignerStore';
import type { StampDesignData } from '@/components/stamp-designer/types';

export function useStampDesignPersist() {
  const store = useStampDesignerStore();

  const saveDesign = async (
    stageRef: { toDataURL: (config?: { pixelRatio?: number }) => string } | null
  ): Promise<{ designId: string; previewUrl: string } | null> => {
    const { selectedModel, lines, logo, shapes, cliparts, inkColor, caseColor } = store;
    if (!selectedModel) return null;

    // 1. Get current user (optional - can be anonymous)
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Upload logo to storage if present
    let logoStoragePath: string | null = null;
    if (logo?.file) {
      const ext = logo.file.name.split('.').pop() || 'png';
      const folder = user?.id || 'anonymous';
      const path = `${folder}/logos/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('stamp-assets')
        .upload(path, logo.file, { contentType: logo.file.type });
      if (!uploadErr) {
        logoStoragePath = path;
      }
    }

    // 3. Generate preview PNG
    let previewUrl = '';
    if (stageRef) {
      const dataUrl = stageRef.toDataURL({ pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const folder = user?.id || 'anonymous';
      const previewPath = `${folder}/previews/${crypto.randomUUID()}.png`;
      const { error: prevErr } = await supabase.storage
        .from('stamp-assets')
        .upload(previewPath, blob, { contentType: 'image/png' });
      if (!prevErr) {
        const { data: urlData } = supabase.storage
          .from('stamp-assets')
          .getPublicUrl(previewPath);
        previewUrl = urlData.publicUrl;
      }
    }

    // 4. Build design data JSON
    const designData: StampDesignData = {
      lines: lines.map(({ id, text, fontFamily, fontSize, bold, italic, alignment }) => ({
        id, text, fontFamily, fontSize, bold, italic, alignment,
      })),
      logo: logo
        ? { storageKey: logoStoragePath, x: logo.x, y: logo.y, width: logo.width, height: logo.height }
        : null,
      shapes: shapes.map(({ id, type, x, y, width, height, rotation }) => ({
        id, type, x, y, width, height, rotation,
      })),
      cliparts: cliparts.map(({ id, name, svgPath, x, y, width, height }) => ({
        id, name, svgPath, x, y, width, height,
      })),
      inkColor,
      caseColor,
    };

    // 5. Insert design record
    const { data: designRow, error: insertErr } = await supabase
      .from('stamp_designs')
      .insert({
        user_id: user?.id ?? null,
        stamp_model_id: selectedModel.id,
        design_data: designData as unknown as Record<string, unknown>,
        preview_image_url: previewUrl || null,
        logo_storage_path: logoStoragePath,
        status: 'in_cart',
      })
      .select('id')
      .single();

    if (insertErr || !designRow) {
      console.error('Failed to save stamp design:', insertErr);
      return null;
    }

    return { designId: designRow.id, previewUrl };
  };

  const updateDesignStatus = async (designId: string, status: 'ordered' | 'produced') => {
    await supabase
      .from('stamp_designs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', designId);
  };

  return { saveDesign, updateDesignStatus };
}
