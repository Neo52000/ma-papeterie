import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface School {
  id: string;
  name: string;
  address: string | null;
  postal_code: string;
  city: string;
  school_type: 'primaire' | 'collège' | 'lycée';
  official_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const useSchools = (postalCode?: string, schoolType?: string) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from('schools').select('*');
      
      if (postalCode) {
        query = query.eq('postal_code', postalCode);
      }
      
      if (schoolType) {
        query = query.eq('school_type', schoolType);
      }
      
      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setSchools((data || []) as School[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setError('Erreur lors du chargement des établissements');
    } finally {
      setLoading(false);
    }
  }, [postalCode, schoolType]);

  useEffect(() => {
    if (postalCode || schoolType) {
      fetchSchools();
    }
  }, [fetchSchools, postalCode, schoolType]);

  const searchSchools = async (searchQuery: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,postal_code.ilike.%${searchQuery}%`)
        .order('name', { ascending: true });

      if (error) throw error;
      setSchools((data || []) as School[]);
      setError(null);
    } catch (err) {
      console.error('Error searching schools:', err);
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  return { schools, loading, error, searchSchools, refetch: fetchSchools };
};
