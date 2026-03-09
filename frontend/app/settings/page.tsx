'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiGet, apiPut } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const companySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  siret: z.string().optional(),
  vat_number: z.string().optional(),
})

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().min(1).max(65535),
  user: z.string().min(1),
  password: z.string().optional(),
  from_name: z.string().optional(),
  from_email: z.string().email(),
})

const aiSchema = z.object({
  provider: z.string().optional(),
  api_key: z.string().optional(),
  model: z.string().optional(),
})

type CompanyForm = z.infer<typeof companySchema>
type SmtpForm = z.infer<typeof smtpSchema>
type AIForm = z.infer<typeof aiSchema>

interface Settings {
  company?: CompanyForm
  smtp?: SmtpForm
  ai?: AIForm
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState<string | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiGet<Settings>('/api/settings'),
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: (data: Settings) => apiPut<Settings>('/api/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    values: settings?.company,
  })

  const smtpForm = useForm<SmtpForm>({
    resolver: zodResolver(smtpSchema),
    values: settings?.smtp,
  })

  const aiForm = useForm<AIForm>({
    resolver: zodResolver(aiSchema),
    values: settings?.ai,
  })

  const saveSection = async (section: keyof Settings, data: unknown) => {
    await mutation.mutateAsync({ ...settings, [section]: data })
    setSaved(section)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Paramètres</h2>
      </div>

      {/* Company */}
      <Section title="Informations entreprise">
        <form
          onSubmit={companyForm.handleSubmit((data) => saveSection('company', data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom de l'entreprise</Label>
              <Input {...companyForm.register('name')} />
            </div>
            <div className="space-y-1.5">
              <Label>SIRET</Label>
              <Input {...companyForm.register('siret')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...companyForm.register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input {...companyForm.register('phone')} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Adresse</Label>
              <Input {...companyForm.register('address')} />
            </div>
            <div className="space-y-1.5">
              <Label>Code postal</Label>
              <Input {...companyForm.register('postal_code')} />
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input {...companyForm.register('city')} />
            </div>
            <div className="space-y-1.5">
              <Label>N° TVA intracommunautaire</Label>
              <Input {...companyForm.register('vat_number')} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              Enregistrer
            </Button>
            {saved === 'company' && (
              <span className="text-xs text-green-600">Sauvegardé !</span>
            )}
          </div>
        </form>
      </Section>

      {/* SMTP */}
      <Section title="Configuration email (SMTP)">
        <form
          onSubmit={smtpForm.handleSubmit((data) => saveSection('smtp', data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hôte SMTP</Label>
              <Input {...smtpForm.register('host')} placeholder="smtp.example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input
                type="number"
                {...smtpForm.register('port')}
                placeholder="587"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Utilisateur</Label>
              <Input {...smtpForm.register('user')} />
            </div>
            <div className="space-y-1.5">
              <Label>Mot de passe</Label>
              <Input type="password" {...smtpForm.register('password')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nom expéditeur</Label>
              <Input {...smtpForm.register('from_name')} placeholder="ma-papeterie" />
            </div>
            <div className="space-y-1.5">
              <Label>Email expéditeur</Label>
              <Input type="email" {...smtpForm.register('from_email')} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              Enregistrer
            </Button>
            {saved === 'smtp' && (
              <span className="text-xs text-green-600">Sauvegardé !</span>
            )}
          </div>
        </form>
      </Section>

      {/* AI */}
      <Section title="Configuration IA">
        <form
          onSubmit={aiForm.handleSubmit((data) => saveSection('ai', data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Input {...aiForm.register('provider')} placeholder="openai" />
            </div>
            <div className="space-y-1.5">
              <Label>Modèle</Label>
              <Input {...aiForm.register('model')} placeholder="gpt-4o-mini" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Clé API</Label>
              <Input
                type="password"
                {...aiForm.register('api_key')}
                placeholder="sk-…"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              Enregistrer
            </Button>
            {saved === 'ai' && (
              <span className="text-xs text-green-600">Sauvegardé !</span>
            )}
          </div>
        </form>
      </Section>
    </div>
  )
}
