import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMMM yyyy', { locale: fr })
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy', { locale: fr })
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: fr })
}

export function getScoreColor(score: number | undefined | null): string {
  if (score === undefined || score === null) return 'text-gray-400'
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-orange-500'
  return 'text-red-500'
}

export function getScoreBgColor(score: number | undefined | null): string {
  if (score === undefined || score === null) return 'bg-gray-100 text-gray-500'
  if (score >= 70) return 'bg-green-100 text-green-700'
  if (score >= 40) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    a_contacter: 'À contacter',
    contacte: 'Contacté',
    interesse: 'Intéressé',
    devis: 'Devis',
    gagne: 'Gagné',
    perdu: 'Perdu',
    client: 'Client',
  }
  return labels[status] ?? status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    a_contacter: 'bg-gray-100 text-gray-700',
    contacte: 'bg-blue-100 text-blue-700',
    interesse: 'bg-yellow-100 text-yellow-700',
    devis: 'bg-purple-100 text-purple-700',
    gagne: 'bg-green-100 text-green-700',
    perdu: 'bg-red-100 text-red-700',
    client: 'bg-teal-100 text-teal-700',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-700'
}

export function getTemperatureLabel(temp: string | undefined): string {
  const labels: Record<string, string> = {
    cold: 'Froid',
    warm: 'Tiède',
    hot: 'Chaud',
  }
  return temp ? (labels[temp] ?? temp) : ''
}

export function getTemperatureColor(temp: string | undefined): string {
  const colors: Record<string, string> = {
    cold: 'bg-blue-50 text-blue-600',
    warm: 'bg-orange-50 text-orange-600',
    hot: 'bg-red-50 text-red-600',
  }
  return temp ? (colors[temp] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-600'
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Haute',
    urgent: 'Urgente',
  }
  return labels[priority] ?? priority
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  }
  return colors[priority] ?? 'bg-gray-100 text-gray-600'
}

export function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    call: 'Appel',
    email: 'Email',
    visit: 'Visite',
    follow_up: 'Relance',
    other: 'Autre',
  }
  return labels[type] ?? type
}
