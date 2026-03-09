'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import type { Quote } from '@/types'

const STATUS_LABELS: Record<Quote['status'], string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  expired: 'Expiré',
}

const STATUS_COLORS: Record<Quote['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  refused: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
}

export default function DevisPage() {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => apiGet<Quote[]>('/api/quotes'),
    staleTime: 30_000,
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Devis</h2>
          <p className="text-sm text-gray-500">
            {quotes?.length ?? 0} devis
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/devis/nouveau">
            <Plus className="mr-1.5 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N°</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total HT</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total TTC</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Valide jusqu'au</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Créé le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : quotes?.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {quote.quote_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {quote.prospect?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          STATUS_COLORS[quote.status]
                        )}
                      >
                        {STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {formatCurrency(quote.total_ht)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(quote.total_ttc)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {quote.valid_until ? formatDate(quote.valid_until) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(quote.created_at)}
                    </td>
                  </tr>
                ))}
            {!isLoading && !quotes?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Aucun devis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
