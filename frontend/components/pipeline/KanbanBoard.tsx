'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import Link from 'next/link'
import { useUpdateProspect } from '@/hooks/useProspects'
import { ScoreBadge } from '@/components/prospects/ScoreBadge'
import type { Prospect, ProspectStatus } from '@/types'

interface Column {
  id: ProspectStatus
  label: string
  color: string
  headerColor: string
}

const COLUMNS: Column[] = [
  { id: 'a_contacter', label: 'À contacter', color: 'bg-gray-50', headerColor: 'bg-gray-200 text-gray-700' },
  { id: 'contacte', label: 'Contacté', color: 'bg-blue-50', headerColor: 'bg-blue-200 text-blue-800' },
  { id: 'interesse', label: 'Intéressé', color: 'bg-yellow-50', headerColor: 'bg-yellow-200 text-yellow-800' },
  { id: 'devis', label: 'Devis', color: 'bg-purple-50', headerColor: 'bg-purple-200 text-purple-800' },
  { id: 'gagne', label: 'Gagné', color: 'bg-green-50', headerColor: 'bg-green-200 text-green-800' },
  { id: 'perdu', label: 'Perdu', color: 'bg-red-50', headerColor: 'bg-red-200 text-red-800' },
]

interface KanbanCardProps {
  prospect: Prospect
  isDragging?: boolean
}

function KanbanCard({ prospect, isDragging }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: prospect.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/prospects/${prospect.id}`}
          className="text-sm font-medium text-navy-800 hover:underline leading-tight"
          onClick={(e) => e.stopPropagation()}
        >
          {prospect.company_name}
        </Link>
        <ScoreBadge score={prospect.ai_score} className="shrink-0" />
      </div>
      {prospect.city && (
        <p className="mt-1 text-xs text-gray-400">{prospect.city}</p>
      )}
      {prospect.contact_name && (
        <p className="mt-0.5 text-xs text-gray-500">{prospect.contact_name}</p>
      )}
    </div>
  )
}

function DragOverlayCard({ prospect }: { prospect: Prospect }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg rotate-1 cursor-grabbing">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-navy-800 leading-tight">
          {prospect.company_name}
        </span>
        <ScoreBadge score={prospect.ai_score} className="shrink-0" />
      </div>
      {prospect.city && (
        <p className="mt-1 text-xs text-gray-400">{prospect.city}</p>
      )}
    </div>
  )
}

interface KanbanBoardProps {
  prospects: Prospect[]
}

export function KanbanBoard({ prospects }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const updateProspect = useUpdateProspect()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const grouped = COLUMNS.reduce<Record<ProspectStatus, Prospect[]>>(
    (acc, col) => {
      acc[col.id] = prospects.filter((p) => p.crm_prospect_status === col.id)
      return acc
    },
    {} as Record<ProspectStatus, Prospect[]>
  )

  const activeProspect = activeId
    ? prospects.find((p) => p.id === activeId)
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const overId = String(over.id)
    const prospect = prospects.find((p) => p.id === String(active.id))
    if (!prospect) return

    const targetColumn = COLUMNS.find((c) => c.id === overId)
    const targetProspect = prospects.find((p) => p.id === overId)

    let newStatus: ProspectStatus | null = null

    if (targetColumn) {
      newStatus = targetColumn.id
    } else if (targetProspect) {
      newStatus = targetProspect.crm_prospect_status
    }

    if (newStatus && newStatus !== prospect.crm_prospect_status) {
      updateProspect.mutate({
        id: prospect.id,
        data: { crm_prospect_status: newStatus },
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colProspects = grouped[col.id] ?? []
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-xl ${col.color} min-w-[220px] w-[220px]`}
            >
              <div className={`rounded-t-xl px-3 py-2.5 ${col.headerColor}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{col.label}</span>
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-bold">
                    {colProspects.length}
                  </span>
                </div>
              </div>
              <SortableContext
                items={colProspects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
                id={col.id}
              >
                <div
                  data-column-id={col.id}
                  className="flex flex-col gap-2 p-2 min-h-[120px] flex-1"
                >
                  {colProspects.map((prospect) => (
                    <KanbanCard
                      key={prospect.id}
                      prospect={prospect}
                      isDragging={prospect.id === activeId}
                    />
                  ))}
                  {colProspects.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-xs text-gray-400 py-4">Glissez ici</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
      <DragOverlay>
        {activeProspect && <DragOverlayCard prospect={activeProspect} />}
      </DragOverlay>
    </DndContext>
  )
}
