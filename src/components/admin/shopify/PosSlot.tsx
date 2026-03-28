import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MapPin, BarChart3, CheckCircle2, Save, Loader2, Store, Package,
  Search, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

interface PosConfig {
  pos_active: boolean
  pos_location_id: string | null
  shop_domain: string | null
}

interface ShopifyLocation {
  id: string
  name: string
  address: string
  active: boolean
}

export default function PosSlot() {
  const [config, setConfig] = useState<PosConfig | null>(null)
  const [locationId, setLocationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [storeStockCount, setStoreStockCount] = useState<number | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [locations, setLocations] = useState<ShopifyLocation[]>([])

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('shopify_config')
        .select('pos_active, pos_location_id, shop_domain')
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

  const handleDetectLocations = async () => {
    setDetecting(true)
    setLocations([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const { data, error } = await supabase.functions.invoke('shopify-status', {
        body: JSON.stringify({ include_locations: true }),
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (error) throw error

      const locs = data?.locations || []
      setLocations(locs)

      if (locs.length === 0) {
        toast.error('Aucun emplacement trouvé', {
          description: 'Vérifiez que le SHOPIFY_ACCESS_TOKEN est configuré et que la connexion Shopify fonctionne.',
        })
      } else {
        toast.success(`${locs.length} emplacement${locs.length > 1 ? 's' : ''} trouvé${locs.length > 1 ? 's' : ''}`)
      }
    } catch (e) {
      toast.error('Erreur détection', {
        description: e instanceof Error ? e.message : String(e),
      })
    } finally {
      setDetecting(false)
    }
  }

  const handleSelectLocation = (loc: ShopifyLocation) => {
    setLocationId(loc.id)
    toast.success(`Emplacement sélectionné : ${loc.name}`, {
      description: `ID : ${loc.id}`,
    })
  }

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
        .not('id', 'is', null)

      if (error) throw error

      setConfig(prev => prev ? { ...prev, pos_active: true, pos_location_id: locationId.trim() } : null)
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
  const shopDomain = config?.shop_domain || 'ma-papeterie.myshopify.com'
  const shopifyLocationsUrl = `https://${shopDomain}/admin/settings/locations`

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
            Seul le stock magasin sera synchronisé vers Shopify POS.
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

          {/* Bouton détection automatique */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectLocations}
              disabled={detecting}
            >
              {detecting
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Search className="h-4 w-4 mr-2" />
              }
              Détecter les emplacements Shopify
            </Button>
            <a
              href={shopifyLocationsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Ouvrir les emplacements dans Shopify Admin
            </a>
          </div>

          {/* Liste des emplacements détectés */}
          {locations.length > 0 && (
            <div className="border rounded-lg divide-y">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectLocation(loc)}
                >
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      {loc.name}
                      {loc.id === locationId && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{loc.address || 'Pas d\'adresse'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={loc.active ? 'default' : 'secondary'} className="text-xs">
                      {loc.active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {loc.id}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          )}

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
                Cliquez sur &quot;Détecter&quot; ci-dessus, ou trouvez-le dans{' '}
                <a
                  href={shopifyLocationsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Shopify Admin &gt; Paramètres &gt; Emplacements
                </a>
                {' '}&gt; cliquez sur le magasin &gt; ID dans l'URL
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
