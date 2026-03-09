'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import type { Prospect, Product, Quote } from '@/types'

const lineSchema = z.object({
  label: z.string().min(1, 'Libellé requis'),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).max(100),
  discount: z.coerce.number().min(0).max(100).optional(),
})

const quoteSchema = z.object({
  prospect_id: z.string().min(1, 'Client requis'),
  valid_until: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, 'Au moins une ligne requise'),
})

type QuoteForm = z.infer<typeof quoteSchema>

function calcLine(item: { quantity: number; unit_price: number; vat_rate: number; discount?: number }) {
  const base = item.quantity * item.unit_price
  const afterDiscount = item.discount ? base * (1 - item.discount / 100) : base
  return {
    ht: afterDiscount,
    tva: afterDiscount * (item.vat_rate / 100),
    ttc: afterDiscount * (1 + item.vat_rate / 100),
  }
}

export default function NouveauDevisPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { data: prospects } = useQuery({
    queryKey: ['prospects-list'],
    queryFn: () => apiGet<{ data: Prospect[] }>('/api/prospects', { params: { limit: 500 } }),
  })

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiGet<Product[]>('/api/products'),
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      items: [{ label: '', quantity: 1, unit_price: 0, vat_rate: 20 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  const totals = watchedItems.reduce(
    (acc, item) => {
      const line = calcLine({
        quantity: Number(item.quantity) || 0,
        unit_price: Number(item.unit_price) || 0,
        vat_rate: Number(item.vat_rate) || 0,
        discount: item.discount ? Number(item.discount) : undefined,
      })
      acc.ht += line.ht
      acc.tva += line.tva
      acc.ttc += line.ttc
      return acc
    },
    { ht: 0, tva: 0, ttc: 0 }
  )

  const onSubmit = async (data: QuoteForm) => {
    try {
      setError(null)
      const items = data.items.map((item) => {
        const line = calcLine({
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          vat_rate: Number(item.vat_rate),
          discount: item.discount ? Number(item.discount) : undefined,
        })
        return { ...item, total_ht: line.ht }
      })
      await apiPost<Quote>('/api/quotes', {
        ...data,
        items,
        total_ht: totals.ht,
        total_tva: totals.tva,
        total_ttc: totals.ttc,
      })
      router.push('/devis')
    } catch {
      setError('Erreur lors de la création du devis.')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Nouveau devis</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-700">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select onValueChange={(v) => setValue('prospect_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client…" />
                </SelectTrigger>
                <SelectContent>
                  {prospects?.data.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.company_name}
                      {p.city && ` — ${p.city}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.prospect_id && (
                <p className="text-xs text-red-500">{errors.prospect_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Valide jusqu'au</Label>
              <Input id="valid_until" type="date" {...register('valid_until')} className="max-w-xs" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" {...register('notes')} placeholder="Notes internes ou conditions particulières…" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Lignes de devis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              <div className="col-span-4">Libellé</div>
              <div className="col-span-2 text-right">Qté</div>
              <div className="col-span-2 text-right">PU HT</div>
              <div className="col-span-1 text-right">TVA%</div>
              <div className="col-span-2 text-right">Total HT</div>
              <div className="col-span-1" />
            </div>

            {fields.map((field, index) => {
              const line = calcLine({
                quantity: Number(watchedItems[index]?.quantity) || 0,
                unit_price: Number(watchedItems[index]?.unit_price) || 0,
                vat_rate: Number(watchedItems[index]?.vat_rate) || 0,
                discount: watchedItems[index]?.discount
                  ? Number(watchedItems[index].discount)
                  : undefined,
              })
              return (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Input
                      {...register(`items.${index}.label`)}
                      placeholder="Produit ou service…"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      {...register(`items.${index}.quantity`)}
                      type="number"
                      min={1}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      {...register(`items.${index}.unit_price`)}
                      type="number"
                      step="0.01"
                      min={0}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-1">
                    <Input
                      {...register(`items.${index}.vat_rate`)}
                      type="number"
                      min={0}
                      max={100}
                      className="text-sm text-right"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium text-gray-700 pr-1">
                    {formatCurrency(line.ht)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ label: '', quantity: 1, unit_price: 0, vat_rate: 20 })
              }
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter une ligne
            </Button>

            <Separator />

            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-8">
                <span className="text-gray-500">Total HT</span>
                <span className="font-medium w-28 text-right tabular-nums">
                  {formatCurrency(totals.ht)}
                </span>
              </div>
              <div className="flex gap-8">
                <span className="text-gray-500">TVA</span>
                <span className="font-medium w-28 text-right tabular-nums">
                  {formatCurrency(totals.tva)}
                </span>
              </div>
              <div className="flex gap-8 text-base">
                <span className="font-semibold text-gray-800">Total TTC</span>
                <span className="font-bold w-28 text-right tabular-nums text-navy-900">
                  {formatCurrency(totals.ttc)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Création…' : 'Créer le devis'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/devis')}
          >
            Annuler
          </Button>
        </div>
      </form>
    </div>
  )
}
