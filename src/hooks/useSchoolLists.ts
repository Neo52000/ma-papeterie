import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SchoolListItem {
  id: string;
  list_id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  is_mandatory: boolean;
  suggested_product_ids: string[] | null;
}

export interface SchoolList {
  id: string;
  school_id: string;
  class_level: string;
  school_year: string;
  list_name: string;
  status: 'active' | 'archived' | 'draft';
  created_by: string | null;
  created_at: string;
  items?: SchoolListItem[];
}

export const useSchoolLists = (schoolId?: string) => {
  const [lists, setLists] = useState<SchoolList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId) {
      fetchLists();
    }
  }, [schoolId]);

  const fetchLists = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('school_lists')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('school_year', { ascending: false });

      if (error) throw error;
      setLists((data || []) as SchoolList[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching school lists:', err);
      setError('Erreur lors du chargement des listes');
    } finally {
      setLoading(false);
    }
  };

  const fetchListItems = async (listId: string): Promise<SchoolListItem[]> => {
    try {
      const { data, error } = await supabase
        .from('school_list_items')
        .select('*')
        .eq('list_id', listId)
        .order('item_name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching list items:', err);
      throw err;
    }
  };

  return { lists, loading, error, fetchListItems, refetch: fetchLists };
};
