import { ShopifyConfig, ShopifyHealthStatus, SyncStats } from '@/types/shopify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, WifiOff, HelpCircle, Package, RefreshCw, ShieldCheck } from 'lucide-react'

interface ConnectionHealthProps {
  config: ShopifyConfig | null
  stats: SyncStats | null
  loading: boolean
}

const statusConfig: Record<ShopifyHealthStatus, {
  label: string
  color: 'default' | 'destructive' | 'secondary' | 'outline'
  icon: React.FC<{ className?: string }>
  description: string
}> = {
  connected: {
    label: 'Connecté',
    color: 'default',
    icon: CheckCircle2,
    description: 'L\'API Shopify répond correctement.'
  },
  error: {
    label: 'Erreur token',
    color: 'destructive',
    icon: XCircle,
    description: 'Token d\'accès invalide ou expiré. Vérifiez les variables d\'environnement Supabase.'
  },
  unreachable: {
    label: 'Inaccessible',
    color: 'destructive',
    icon: WifiOff,
    description: 'L\'API Shopify est inaccessible. Vérifiez le domaine ou la connexion.'
  },
  unknown: {
    label: 'Inconnu',
    color: 'secondary',
    icon: HelpCircle,
    description: 'Aucun test effectué encore.'
  }
}

export default function ConnectionHealth({ config, stats, loading }: ConnectionHealthProps) {
  if (loading || !config) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const status = statusConfig[config.health_status]
  const StatusIcon = status.icon

  return (
    <div className="space-y-4 mt-4">
      {/* Bannière statut principal */}
      <Card className={config.health_status === 'connected' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="p-4 flex items-start gap-3">
          <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            config.health_status === 'connected' ? 'text-green-600' : 'text-red-600'
          }`} />
          <div>
            <p className="font-medium text-sm">{status.description}</p>
            {config.last_health_check && (
              <p className="text-xs text-muted-foreground mt-1">
                Dernier test : {new Date(config.last_health_check).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" /> Produits Shopify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(config.product_count ?? 0).toLocaleString('fr-FR')}</p>
            <p className="text-xs text-muted-foreground">SKUs actifs en catalogue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Syncs (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.last24h.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats?.last24h.success ?? 0} succès</span>
              {' · '}
              <span className={stats?.last24h.error ? 'text-red-600' : 'text-muted-foreground'}>
                {stats?.last24h.error ?? 0} erreurs
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Secrets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs">Access Token</span>
                <Badge variant={config.access_token_set ? 'default' : 'destructive'} className="text-xs">
                  {config.access_token_set ? 'Configuré' : 'Manquant'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Webhook Secret</span>
                <Badge variant={config.webhook_secret_set ? 'default' : 'secondary'} className="text-xs">
                  {config.webhook_secret_set ? 'Configuré' : 'Non défini'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
