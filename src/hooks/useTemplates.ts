import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  school_type: 'primaire' | 'collège' | 'lycée';
  class_level: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export const useTemplates = (schoolType?: string, classLevel?: string) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [schoolType, classLevel]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('school_list_templates')
        .select('*')
        .eq('is_public', true);

      if (schoolType) {
        query = query.eq('school_type', schoolType);
      }

      if (classLevel) {
        query = query.eq('class_level', classLevel);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as Template[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  };

  return { templates, loading, error, refetch: fetchTemplates };
};
