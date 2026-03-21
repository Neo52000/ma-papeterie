import { useState, useEffect, useCallback } from 'react'
import { ShopifyStatusResponse } from '@/types/shopify'
import { fetchShopifyStatus } from '@/lib/shopify-admin'

interface UseShopifyStatusReturn {
  data: ShopifyStatusResponse | null
  loading: boolean
  error: string | null
  refresh: () => void
  lastRefreshed: Date | null
}

export function useShopifyStatus(autoRefreshMs: number = 60000): UseShopifyStatusReturn {
  const [data, setData] = useState<ShopifyStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const result = await fetchShopifyStatus()
      setData(result)
      setLastRefreshed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, autoRefreshMs)
    return () => clearInterval(interval)
  }, [fetchData, autoRefreshMs])

  return { data, loading, error, refresh: fetchData, lastRefreshed }
}
