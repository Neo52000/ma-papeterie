import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, AlertCircle, Wifi } from 'lucide-react'
import { useShopifyStatus } from '@/hooks/useShopifyStatus'
import ConnectionHealth from '@/components/admin/shopify/ConnectionHealth'
import SyncLog from '@/components/admin/shopify/SyncLog'
import StoreConfig from '@/components/admin/shopify/StoreConfig'
import PosSlot from '@/components/admin/shopify/PosSlot'

const statusBadgeVariant = {
  connected: 'default' as const,
  error: 'destructive' as const,
  unreachable: 'destructive' as const,
  unknown: 'secondary' as const,
}

export default function ShopifyConnect() {
  const { data, loading, error, refresh, lastRefreshed } = useShopifyStatus(60000)

  const healthStatus = data?.config?.health_status ?? 'unknown'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Shopify Connect
          </h1>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Actualisé à {lastRefreshed.toLocaleTimeString('fr-FR')} · Auto-refresh 60s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant[healthStatus]}>
            {healthStatus === 'connected' ? '● Connecté' : `● ${healthStatus}`}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Erreur globale */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" className="p-0 h-auto ml-2 text-xs" onClick={refresh}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs defaultValue="health">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="health">Connexion</TabsTrigger>
          <TabsTrigger value="logs">
            Sync Log
            {(data?.stats?.last24h?.error ?? 0) > 0 && (
              <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {data?.stats?.last24h?.error}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="pos">
            POS {!data?.config?.pos_active && '⚙️'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <ConnectionHealth
            config={data?.config ?? null}
            stats={data?.stats ?? null}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="logs">
          <SyncLog logs={data?.recentLogs ?? null} loading={loading} />
        </TabsContent>

        <TabsContent value="config">
          <StoreConfig config={data?.config ?? null} loading={loading} />
        </TabsContent>

        <TabsContent value="pos">
          <PosSlot />
        </TabsContent>
      </Tabs>
    </div>
  )
}
