export type ProspectStatus =
  | 'a_contacter'
  | 'contacte'
  | 'interesse'
  | 'devis'
  | 'gagne'
  | 'perdu'
  | 'client'

export type PipelineStage =
  | 'A contacter'
  | 'Contacté'
  | 'Intéressé'
  | 'Devis'
  | 'Gagné'
  | 'Perdu'

export type EntityType = 'prospect' | 'client' | 'fournisseur'

export interface Prospect {
  id: string
  company_name: string
  siret?: string
  entity_type: EntityType
  crm_prospect_status: ProspectStatus
  email?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  lat?: number
  lng?: number
  contact_name?: string
  contact_role?: string
  website?: string
  naf_code?: string
  naf_label?: string
  employees?: number
  revenue?: number
  ai_score?: number
  ai_temperature?: 'cold' | 'warm' | 'hot'
  last_contact_at?: string
  next_followup_at?: string
  distance_km?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  prospect_id?: string
  title: string
  description?: string
  type: 'call' | 'email' | 'visit' | 'follow_up' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'done' | 'cancelled'
  due_date?: string
  done_at?: string
  created_at: string
  updated_at: string
  prospect?: Pick<Prospect, 'id' | 'company_name' | 'city'>
}

export interface Email {
  id: string
  prospect_id: string
  subject: string
  body: string
  direction: 'inbound' | 'outbound'
  status: 'draft' | 'sent' | 'bounced' | 'opened' | 'clicked'
  sent_at?: string
  opened_at?: string
  created_at: string
}

export interface Interaction {
  id: string
  prospect_id: string
  type: 'email' | 'call' | 'note' | 'visit' | 'sms'
  direction?: 'inbound' | 'outbound'
  content: string
  happened_at: string
  created_at: string
}

export interface QuoteItem {
  id?: string
  quote_id?: string
  product_id?: string
  label: string
  quantity: number
  unit_price: number
  vat_rate: number
  discount?: number
  total_ht: number
}

export interface Quote {
  id: string
  prospect_id: string
  quote_number: string
  status: 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
  total_ht: number
  total_tva: number
  total_ttc: number
  valid_until?: string
  notes?: string
  items: QuoteItem[]
  created_at: string
  updated_at: string
  prospect?: Pick<Prospect, 'id' | 'company_name' | 'city'>
}

export interface Invoice {
  id: string
  quote_id?: string
  prospect_id: string
  invoice_number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  total_ht: number
  total_tva: number
  total_ttc: number
  due_date?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  reference: string
  name: string
  description?: string
  category?: string
  unit_price: number
  vat_rate: number
  stock?: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  prospect_id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  prospect?: Pick<Prospect, 'id' | 'company_name'>
}

export interface AILog {
  id: string
  prospect_id: string
  action: 'score' | 'email' | 'call_script' | 'summary'
  prompt?: string
  result: string
  model?: string
  tokens_used?: number
  created_at: string
}

export interface DashboardKPIs {
  prospects_today: number
  emails_sent: number
  avg_ai_score: number
  overdue_tasks: number
}

export interface PipelineColumn {
  id: ProspectStatus
  label: PipelineStage
  prospects: Prospect[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ProspectFilters {
  search?: string
  status?: ProspectStatus
  city?: string
  score_min?: number
  score_max?: number
  page?: number
  limit?: number
}

export interface TaskFilters {
  status?: Task['status']
  priority?: Task['priority']
  type?: Task['type']
  prospect_id?: string
  due_date?: string
}
