import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MapPin, Tag, BarChart3, CheckCircle2, Save, Loader2, Store, Package,
} from 'lucide-react'
import { toast } from 'sonner'

interface PosConfig {
  pos_active: boolean
  pos_location_id: string | null
}

export default function PosSlot() {
  const [config, setConfig] = useState<PosConfig | null>(null)
  const [locationId, setLocationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeStockCount, setStoreStockCount] = useState<number | null>(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('shopify_config')
        .select('pos_active, pos_location_id')
        .limit(1)
        .maybeSingle()

      if (data) {
        setConfig(data)
        setLocationId(data.pos_location_id || '')
      }

      // Compter les produits avec stock magasin
      const { count } = await supabase
        .from('product_stock_locations')
        .select('id', { count: 'exact', head: true })
        .eq('location_type', 'store')
        .gt('stock_quantity', 0)

      setStoreStockCount(count ?? 0)
    } catch {
      toast.error('Erreur chargement config POS')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    if (!locationId.trim()) {
      toast.error('Veuillez saisir un Location ID Shopify')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('shopify_config')
        .update({
          pos_location_id: locationId.trim(),
          pos_active: true,
        })
        .eq('id', config ? (config as any).id : undefined)
        // Mettre à jour la seule ligne existante
        .not('id', 'is', null)

      if (error) throw error

      setConfig({ pos_active: true, pos_location_id: locationId.trim() })
      toast.success('Configuration POS sauvegardée', {
        description: `Location ID : ${locationId.trim()} — POS activé`,
      })
    } catch (e) {
      toast.error('Erreur sauvegarde', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('shopify_config')
        .update({ pos_active: false })
        .not('id', 'is', null)

      if (error) throw error

      setConfig(prev => prev ? { ...prev, pos_active: false } : null)
      toast.success('POS désactivé')
    } catch (e) {
      toast.error('Erreur', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Chargement configuration POS...</p>
        </CardContent>
      </Card>
    )
  }

  const isActive = config?.pos_active && config?.pos_location_id

  return (
    <div className="space-y-4">
      {/* Configuration POS Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Point de vente Chaumont
          </CardTitle>
          <CardDescription>
            Configurez le Location ID Shopify pour le magasin physique.
            Seul le stock magasin (product_stock_locations type &quot;store&quot;) sera synchronisé vers Shopify POS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'POS Actif' : 'POS Inactif'}
            </Badge>
            {config?.pos_location_id && (
              <Badge variant="outline" className="font-mono text-xs">
                Location : {config.pos_location_id}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="pos-location-id">Shopify Location ID</Label>
              <Input
                id="pos-location-id"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                placeholder="Ex: 12345678901"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Trouvable dans Shopify Admin &gt; Paramètres &gt; Emplacements &gt; ID dans l'URL
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !locationId.trim()}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isActive ? 'Mettre à jour' : 'Activer POS'}
              </Button>
              {isActive && (
                <Button variant="outline" onClick={handleDeactivate} disabled={saving}>
                  Désactiver
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé stock magasin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Store className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Stock magasin</p>
              <p className="text-xs text-muted-foreground">
                {storeStockCount !== null ? (
                  <>{storeStockCount} produit{storeStockCount > 1 ? 's' : ''} avec stock &gt; 0</>
                ) : (
                  'Chargement...'
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Package className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Sync Shopify POS</p>
              <p className="text-xs text-muted-foreground">
                {isActive ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Seul le stock magasin est poussé
                  </span>
                ) : (
                  'Activez le POS pour synchroniser'
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <BarChart3 className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Décrémentation</p>
              <p className="text-xs text-muted-foreground">
                Ventes POS → stock magasin<br />
                Ventes web → stock agrégé
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
