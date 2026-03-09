'use client'

import { useProspects } from '@/hooks/useProspects'
import { KanbanBoard } from '@/components/pipeline/KanbanBoard'
import { Skeleton } from '@/components/ui/skeleton'

export default function PipelinePage() {
  const { data, isLoading } = useProspects({ limit: 500 })
  const prospects = data?.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Pipeline commercial</h2>
        <p className="text-sm text-gray-500">
          Glissez les prospects d'une colonne à l'autre pour mettre à jour leur statut.
        </p>
      </div>

      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-52 shrink-0" />
          ))}
        </div>
      ) : (
        <KanbanBoard prospects={prospects} />
      )}
    </div>
  )
}
