import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, MapPin, Tag, BarChart3 } from 'lucide-react'

export default function PosSlot() {
  const futureFeatures = [
    { icon: MapPin, label: 'Point de vente Chaumont', desc: 'Location ID + configuration caisse' },
    { icon: Tag, label: 'Prix POS spécifiques', desc: 'Overrides HT/TTC indépendants du prix web' },
    { icon: BarChart3, label: 'Stock en temps réel', desc: 'Vue comparée online vs magasin physique' },
  ]

  return (
    <div className="mt-4 space-y-4">
      <Card className="border-dashed border-2">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-muted rounded-full">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <Badge variant="secondary" className="mb-3">Shopify POS — Non activé</Badge>
          <h3 className="font-medium text-sm mb-1">Module POS non disponible</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Shopify POS est connecté mais pas encore finalisé. Ce module sera déverrouillé automatiquement
            dès qu'une location POS sera configurée dans votre compte Shopify.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
        Fonctionnalités prévues
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {futureFeatures.map(feature => {
          const Icon = feature.icon
          return (
            <Card key={feature.label} className="opacity-50">
              <CardContent className="p-4 flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
