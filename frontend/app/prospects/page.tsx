'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { useProspects } from '@/hooks/useProspects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScoreBadge } from '@/components/prospects/ScoreBadge'
import { StatusBadge } from '@/components/prospects/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/utils'
import type { ProspectFilters, ProspectStatus } from '@/types'

export default function ProspectsPage() {
  const [filters, setFilters] = useState<ProspectFilters>({ limit: 50 })
  const [search, setSearch] = useState('')

  const { data, isLoading } = useProspects({
    ...filters,
    search: search || undefined,
  })

  const prospects = data?.data ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Prospects</h2>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} prospect{(data?.total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/prospects/nouveau">
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau prospect
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              status: v === 'all' ? undefined : (v as ProspectStatus),
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="a_contacter">À contacter</SelectItem>
            <SelectItem value="contacte">Contacté</SelectItem>
            <SelectItem value="interesse">Intéressé</SelectItem>
            <SelectItem value="devis">Devis</SelectItem>
            <SelectItem value="gagne">Gagné</SelectItem>
            <SelectItem value="perdu">Perdu</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={String(filters.score_min ?? 'all')}
          onValueChange={(v) =>
            setFilters((f) => ({
              ...f,
              score_min: v === 'all' ? undefined : Number(v),
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Score min" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous scores</SelectItem>
            <SelectItem value="70">Score ≥ 70</SelectItem>
            <SelectItem value="40">Score ≥ 40</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Nom
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ville
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Statut
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Distance
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dernier contact
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : prospects.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/prospects/${p.id}`}
                        className="font-medium text-navy-700 hover:text-navy-900 hover:underline"
                      >
                        {p.company_name}
                      </Link>
                      {p.contact_name && (
                        <p className="text-xs text-gray-400">{p.contact_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.city ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={p.ai_score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.crm_prospect_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.distance_km != null ? `${p.distance_km.toFixed(1)} km` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.last_contact_at ? formatRelative(p.last_contact_at) : '—'}
                    </td>
                  </tr>
                ))}
            {!isLoading && prospects.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-gray-400"
                >
                  Aucun prospect trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
