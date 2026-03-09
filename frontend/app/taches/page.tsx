'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, Circle } from 'lucide-react'
import { useTasks, useUpdateTask, useCreateTask } from '@/hooks/useTasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  formatDateShort,
  getPriorityColor,
  getPriorityLabel,
  getTaskTypeLabel,
  cn,
} from '@/lib/utils'
import type { Task, TaskFilters } from '@/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const taskSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  type: z.enum(['call', 'email', 'visit', 'follow_up', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
  description: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

export default function TachesPage() {
  const [filters, setFilters] = useState<TaskFilters>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: tasks, isLoading } = useTasks(filters)
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { type: 'call', priority: 'medium' },
  })

  const onSubmit = async (data: TaskForm) => {
    await createTask.mutateAsync(data)
    reset()
    setDialogOpen(false)
  }

  const toggleDone = (task: Task) => {
    updateTask.mutate({
      id: task.id,
      data: {
        status: task.status === 'done' ? 'pending' : 'done',
        done_at: task.status === 'done' ? undefined : new Date().toISOString(),
      },
    })
  }

  const taskList = tasks ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tâches</h2>
          <p className="text-sm text-gray-500">{taskList.length} tâche{taskList.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'all' ? undefined : (v as Task['status']) }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="done">Terminée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.priority ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, priority: v === 'all' ? undefined : (v as Task['priority']) }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.type ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, type: v === 'all' ? undefined : (v as Task['type']) }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="call">Appel</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="visit">Visite</SelectItem>
            <SelectItem value="follow_up">Relance</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task list */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : taskList.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            Aucune tâche trouvée
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {taskList.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <button
                  onClick={() => toggleDone(task)}
                  className="shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                >
                  {task.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'
                    )}
                  >
                    {task.title}
                  </p>
                  {task.prospect && (
                    <p className="text-xs text-gray-400 truncate">
                      {task.prospect.company_name}
                      {task.prospect.city && ` — ${task.prospect.city}`}
                    </p>
                  )}
                </div>
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {getTaskTypeLabel(task.type)}
                </span>
                {task.due_date && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDateShort(task.due_date)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create task dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" {...register('title')} />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  defaultValue="call"
                  onValueChange={(v) => setValue('type', v as Task['type'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Appel</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="visit">Visite</SelectItem>
                    <SelectItem value="follow_up">Relance</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select
                  defaultValue="medium"
                  onValueChange={(v) => setValue('priority', v as Task['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Échéance</Label>
              <Input id="due_date" type="date" {...register('due_date')} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
