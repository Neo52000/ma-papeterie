import { useState, useEffect, useCallback } from 'react';

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

interface UsePaginationReturn<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook réutilisable pour les appels API paginés.
 * Appelle fetchFn à chaque changement de page.
 */
export function usePagination<T>(
  fetchFn: (page: number, limit: number) => Promise<PaginatedResult<T>>,
  limit = 20,
): UsePaginationReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn(page, limit);
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur inconnue'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, total, page, totalPages, setPage, isLoading, error };
}
