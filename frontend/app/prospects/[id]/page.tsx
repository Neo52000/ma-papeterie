'use client'

import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useProspect } from '@/hooks/useProspects'
import { useGenerateEmail, useCallScript, useScoreProspect } from '@/hooks/useAI'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoreBadge } from '@/components/prospects/ScoreBadge'
import { StatusBadge } from '@/components/prospects/StatusBadge'
import { Badge } from '@/components/ui/badge'
import {
  formatDate,
  formatRelative,
  getTemperatureColor,
  getTemperatureLabel,
} from '@/lib/utils'
import type { Interaction, Task } from '@/types'
import { Phone, Mail, Globe, MapPin, Building2, RefreshCw } from 'lucide-react'

const ProspectMap = dynamic(() => import('./ProspectMap'), { ssr: false })

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: prospect, isLoading } = useProspect(id)

  const { data: interactions } = useQuery({
    queryKey: ['interactions', id],
    queryFn: () => apiGet<Interaction[]>(`/api/prospects/${id}/interactions`),
    enabled: Boolean(id),
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks', { prospect_id: id }],
    queryFn: () => apiGet<Task[]>('/api/tasks', { params: { prospect_id: id } }),
    enabled: Boolean(id),
  })

  const scoreProspect = useScoreProspect()
  const generateEmail = useGenerateEmail()
  const callScript = useCallScript()

  const [emailResult, setEmailResult] = useState<{ subject: string; body: string } | null>(null)
  const [scriptResult, setScriptResult] = useState<{ script: string; key_points: string[] } | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!prospect) {
    return (
      <p className="text-center py-20 text-gray-400">Prospect introuvable</p>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{prospect.company_name}</h2>
          {prospect.siret && (
            <p className="text-xs text-gray-400 mt-0.5">SIRET : {prospect.siret}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ScoreBadge score={prospect.ai_score} />
            <StatusBadge status={prospect.crm_prospect_status} />
            {prospect.ai_temperature && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getTemperatureColor(prospect.ai_temperature)}`}
              >
                {getTemperatureLabel(prospect.ai_temperature)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scoreProspect.mutate(id)}
          disabled={scoreProspect.isPending}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${scoreProspect.isPending ? 'animate-spin' : ''}`} />
          Rescorer
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="taches">Tâches</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
        </TabsList>

        {/* Tab: Infos */}
        <TabsContent value="infos" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Coordonnées
                </h3>
                {prospect.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${prospect.email}`}
                      className="text-navy-700 hover:underline"
                    >
                      {prospect.email}
                    </a>
                  </div>
                )}
                {prospect.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <a href={`tel:${prospect.phone}`} className="text-gray-700">
                      {prospect.phone}
                    </a>
                  </div>
                )}
                {prospect.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-navy-700 hover:underline truncate"
                    >
                      {prospect.website}
                    </a>
                  </div>
                )}
                {(prospect.address || prospect.city) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-700">
                      {[prospect.address, prospect.postal_code, prospect.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {prospect.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700">
                      {prospect.contact_name}
                      {prospect.contact_role && ` — ${prospect.contact_role}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Informations entreprise
                </h3>
                {prospect.naf_label && (
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400">Activité : </span>
                    {prospect.naf_label}
                    {prospect.naf_code && ` (${prospect.naf_code})`}
                  </div>
                )}
                {prospect.employees != null && (
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400">Effectif : </span>
                    {prospect.employees} salariés
                  </div>
                )}
                {prospect.last_contact_at && (
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400">Dernier contact : </span>
                    {formatDate(prospect.last_contact_at)}
                  </div>
                )}
                {prospect.next_followup_at && (
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400">Prochain suivi : </span>
                    {formatDate(prospect.next_followup_at)}
                  </div>
                )}
                {prospect.distance_km != null && (
                  <div className="text-sm text-gray-700">
                    <span className="text-gray-400">Distance : </span>
                    {prospect.distance_km.toFixed(1)} km
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {prospect.lat != null && prospect.lng != null && (
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <div className="h-48">
                  <ProspectMap lat={prospect.lat} lng={prospect.lng} name={prospect.company_name} />
                </div>
              </CardContent>
            </Card>
          )}
          {prospect.notes && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{prospect.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Interactions */}
        <TabsContent value="interactions" className="pt-2">
          {!interactions?.length ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Aucune interaction enregistrée
            </p>
          ) : (
            <div className="relative space-y-0 pl-6 border-l-2 border-gray-100">
              {interactions.map((item) => (
                <div key={item.id} className="relative pb-5">
                  <div className="absolute -left-[25px] top-1 h-4 w-4 rounded-full border-2 border-white bg-navy-400" />
                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                        {item.type}
                        {item.direction && ` • ${item.direction === 'inbound' ? 'entrant' : 'sortant'}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelative(item.happened_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Tasks */}
        <TabsContent value="taches" className="pt-2">
          {!tasks?.length ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Aucune tâche associée
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    readOnly
                    className="rounded border-gray-300"
                  />
                  <span
                    className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  >
                    {task.title}
                  </span>
                  {task.due_date && (
                    <span className="text-xs text-gray-400">
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Tab: AI */}
        <TabsContent value="ai" className="space-y-4 pt-2">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                generateEmail
                  .mutateAsync({ prospectId: id })
                  .then(setEmailResult)
              }
              disabled={generateEmail.isPending}
              variant="outline"
            >
              {generateEmail.isPending ? 'Génération…' : 'Générer email'}
            </Button>
            <Button
              onClick={() =>
                callScript
                  .mutateAsync({ prospectId: id })
                  .then(setScriptResult)
              }
              disabled={callScript.isPending}
              variant="outline"
            >
              {callScript.isPending ? 'Génération…' : 'Script appel'}
            </Button>
          </div>

          {emailResult && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Email généré
                </h3>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Objet</p>
                  <p className="text-sm font-medium text-gray-700">{emailResult.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Corps</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{emailResult.body}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {scriptResult && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Script d'appel
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{scriptResult.script}</p>
                {scriptResult.key_points.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">Points clés</p>
                    <ul className="list-disc list-inside space-y-1">
                      {scriptResult.key_points.map((pt, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Devis */}
        <TabsContent value="devis" className="pt-2">
          <p className="py-10 text-center text-sm text-gray-400">
            Aucun devis pour ce prospect.{' '}
            <a href="/devis/nouveau" className="text-navy-700 hover:underline">
              Créer un devis
            </a>
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
