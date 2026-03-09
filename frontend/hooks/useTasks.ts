import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type { Task, TaskFilters } from '@/types'

const QUERY_KEY = 'tasks'

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () =>
      apiGet<Task[]>('/api/tasks', { params: filters }),
    staleTime: 30_000,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => apiGet<Task>(`/api/tasks/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Task>) => apiPost<Task>('/api/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      apiPatch<Task>(`/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
