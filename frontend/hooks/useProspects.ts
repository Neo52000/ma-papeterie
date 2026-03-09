import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type { Prospect, ProspectFilters, PaginatedResponse } from '@/types'

const QUERY_KEY = 'prospects'

export function useProspects(filters?: ProspectFilters) {
  return useQuery({
    queryKey: [QUERY_KEY, filters],
    queryFn: () =>
      apiGet<PaginatedResponse<Prospect>>('/api/prospects', {
        params: filters,
      }),
    staleTime: 30_000,
  })
}

export function useProspect(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => apiGet<Prospect>(`/api/prospects/${id}`),
    enabled: Boolean(id),
  })
}

export function useUpdateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Prospect>
    }) => apiPatch<Prospect>(`/api/prospects/${id}`, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
      queryClient.setQueryData([QUERY_KEY, updated.id], updated)
    },
  })
}

export function useCreateProspect() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Prospect>) =>
      apiPost<Prospect>('/api/prospects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
