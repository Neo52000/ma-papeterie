import { ShopifyConfig } from '@/types/shopify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StoreConfigProps {
  config: ShopifyConfig | null
  loading: boolean
}

export default function StoreConfig({ config, loading }: StoreConfigProps) {
  if (loading || !config) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  const rows = [
    { label: 'Domaine boutique', value: config.shop_domain, monospace: true, alert: false },
    { label: 'Version API', value: config.api_version, monospace: true, alert: false },
    { label: 'Access Token', value: config.access_token_set ? '••••••••••••••••' : 'Non configuré — ajouter SHOPIFY_ACCESS_TOKEN dans Supabase Secrets', monospace: false, alert: !config.access_token_set },
    { label: 'Webhook Secret', value: config.webhook_secret_set ? '••••••••••••••••' : 'Non configuré — optionnel si webhooks inactifs', monospace: false, alert: false },
    { label: 'Dernière mise à jour', value: new Date(config.updated_at).toLocaleString('fr-FR'), monospace: false, alert: false },
  ]

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Configuration du store</CardTitle>
        <p className="text-xs text-muted-foreground">
          Les secrets ne sont jamais exposés dans cette interface. Ils sont gérés via les variables d'environnement Supabase (Settings &rarr; Edge Functions &rarr; Secrets).
        </p>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {rows.map(row => (
            <div key={row.label} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className={`text-sm ${row.monospace ? 'font-mono' : ''} ${row.alert ? 'text-red-600' : ''}`}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
