'use client'

import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users, Mail, Brain, AlertTriangle } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/prospects/StatusBadge'
import { formatRelative, formatDateShort, getPriorityColor, getTaskTypeLabel } from '@/lib/utils'
import type { DashboardKPIs, Task, Interaction } from '@/types'

const PIPELINE_LABELS = [
  { key: 'a_contacter', label: 'À contacter' },
  { key: 'contacte', label: 'Contacté' },
  { key: 'interesse', label: 'Intéressé' },
  { key: 'devis', label: 'Devis' },
  { key: 'gagne', label: 'Gagné' },
]

interface PipelineStats {
  [key: string]: number
}

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => apiGet<DashboardKPIs>('/api/dashboard/kpis'),
  })

  const { data: pipelineStats, isLoading: pipelineLoading } = useQuery({
    queryKey: ['dashboard-pipeline'],
    queryFn: () => apiGet<PipelineStats>('/api/dashboard/pipeline'),
  })

  const { data: todayTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => apiGet<Task[]>('/api/tasks', { params: { due_today: true, limit: 5 } }),
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => apiGet<Interaction[]>('/api/interactions', { params: { limit: 5 } }),
  })

  const chartData = PIPELINE_LABELS.map((stage) => ({
    name: stage.label,
    count: pipelineStats?.[stage.key] ?? 0,
  }))

  const kpiCards = [
    {
      label: "Prospects aujourd'hui",
      value: kpis?.prospects_today ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Emails envoyés',
      value: kpis?.emails_sent ?? 0,
      icon: Mail,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Score IA moyen',
      value: kpis?.avg_ai_score != null ? `${Math.round(kpis.avg_ai_score)}/100` : '—',
      icon: Brain,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Tâches en retard',
      value: kpis?.overdue_tasks ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Tableau de bord</h2>
        <p className="text-sm text-gray-500">Vue d'ensemble de votre activité commerciale</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                {kpisLoading ? (
                  <Skeleton className="h-16" />
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {card.value}
                      </p>
                    </div>
                    <div className={`rounded-lg p-2 ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Pipeline commercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                    }}
                  />
                  <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} name="Prospects" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Today's tasks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Tâches du jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-48" />
            ) : !todayTasks?.length ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Aucune tâche pour aujourd'hui
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {todayTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}
                    >
                      {getTaskTypeLabel(task.type)}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {task.title}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-gray-400">
                        {formatDateShort(task.due_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <Skeleton className="h-32" />
          ) : !recentActivity?.length ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Aucune activité récente
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-navy-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelative(item.happened_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize shrink-0">
                    {item.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
