'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/utils'
import type { Prospect, PaginatedResponse } from '@/types'

export default function ClientsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () =>
      apiGet<PaginatedResponse<Prospect>>('/api/prospects', {
        params: { entity_type: 'client', search: search || undefined, limit: 100 },
      }),
    staleTime: 30_000,
  })

  const clients = data?.data ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Clients</h2>
        <p className="text-sm text-gray-500">
          {data?.total ?? 0} client{(data?.total ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Entreprise
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Contact
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Ville
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Téléphone
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Dernier contact
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/prospects/${client.id}`}
                        className="font-medium text-navy-700 hover:underline"
                      >
                        {client.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.contact_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.city ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="text-navy-700 hover:underline"
                        >
                          {client.email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {client.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {client.last_contact_at
                        ? formatRelative(client.last_contact_at)
                        : '—'}
                    </td>
                  </tr>
                ))}
            {!isLoading && clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Aucun client trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
