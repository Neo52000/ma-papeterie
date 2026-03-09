'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

export default function CataloguePage() {
  const [search, setSearch] = useState('')

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () =>
      apiGet<Product[]>('/api/products', {
        params: { search: search || undefined },
      }),
    staleTime: 60_000,
  })

  const filtered = products?.filter((p) =>
    search
      ? p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.reference.toLowerCase().includes(search.toLowerCase())
      : true
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Catalogue produits</h2>
        <p className="text-sm text-gray-500">
          {filtered?.length ?? 0} produit{(filtered?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Référence</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Catégorie</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Prix HT</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">TVA</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered?.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {product.reference}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {product.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 tabular-nums">
                      {formatCurrency(product.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      {product.vat_rate}%
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      {product.stock != null ? product.stock : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          product.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {product.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
            {!isLoading && filtered?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  Aucun produit trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
