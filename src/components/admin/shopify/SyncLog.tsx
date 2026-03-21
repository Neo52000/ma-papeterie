import { SyncLogEntry, SyncOperation, SyncStatus } from '@/types/shopify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

interface SyncLogProps {
  logs: SyncLogEntry[] | null
  loading: boolean
}

const operationLabels: Record<SyncOperation, string> = {
  product_push: 'Push produit',
  product_pull: 'Pull produit',
  webhook_received: 'Webhook reçu',
  reconciliation: 'Réconciliation',
  manual_sync: 'Sync manuelle',
  health_check: 'Health check',
  price_update: 'MAJ prix',
  inventory_update: 'MAJ stock'
}

const statusVariant: Record<SyncStatus, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  success: 'default',
  error: 'destructive',
  skipped: 'secondary',
  conflict: 'outline',
  pending: 'secondary'
}

export default function SyncLog({ logs, loading }: SyncLogProps) {
  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          Aucune opération enregistrée. Les logs apparaîtront dès la première synchronisation.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          20 dernières opérations
          <span className="ml-2 text-muted-foreground font-normal">
            ({logs.filter(l => l.status === 'error').length} erreur(s))
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opération</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Éléments</TableHead>
              <TableHead>Déclencheur</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id} className={log.status === 'error' ? 'bg-red-50/50' : ''}>
                <TableCell className="font-mono text-xs">{operationLabels[log.operation]}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={statusVariant[log.status]} className="w-fit text-xs">
                      {log.status}
                    </Badge>
                    {log.error_message && (
                      <span className="text-xs text-red-600 max-w-[200px] truncate" title={log.error_message}>
                        {log.error_message}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{log.items_affected}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.triggered_by}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
