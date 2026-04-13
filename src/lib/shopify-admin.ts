import { supabase } from '@/integrations/supabase/client'
import { ShopifyStatusResponse } from '@/types/shopify'

export async function fetchShopifyStatus(): Promise<ShopifyStatusResponse> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Session expirée. Veuillez vous reconnecter.')
  }

  const { data, error } = await supabase.functions.invoke('shopify-status', {
    body: JSON.stringify({}),
    headers: { Authorization: `Bearer ${session.access_token}` }
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)

  return data as ShopifyStatusResponse
}
