-- Tables RGPD et cron logging

-- Table gdpr_requests pour suivre les demandes RGPD
CREATE TABLE public.gdpr_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification', 'access')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  response_data JSONB
);

-- Table user_consents pour la traçabilité des consentements
CREATE TABLE public.user_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies_essential', 'cookies_analytics', 'cookies_marketing', 'newsletter')),
  consented BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Table data_retention_logs pour historique des suppressions
CREATE TABLE public.data_retention_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID
);

-- Table cron_job_logs pour tracer les exécutions
CREATE TABLE public.cron_job_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'running')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Policies pour gdpr_requests
CREATE POLICY "Users can view their own GDPR requests" 
ON public.gdpr_requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own GDPR requests" 
ON public.gdpr_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all GDPR requests" 
ON public.gdpr_requests FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update GDPR requests" 
ON public.gdpr_requests FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Policies pour user_consents
CREATE POLICY "Users can view their own consents" 
ON public.user_consents FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create consent records" 
ON public.user_consents FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own consents" 
ON public.user_consents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consents" 
ON public.user_consents FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Policies pour data_retention_logs
CREATE POLICY "Admins can view retention logs" 
ON public.data_retention_logs FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service can insert retention logs" 
ON public.data_retention_logs FOR INSERT 
WITH CHECK (true);

-- Policies pour cron_job_logs
CREATE POLICY "Admins can view cron logs" 
ON public.cron_job_logs FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Service can insert cron logs" 
ON public.cron_job_logs FOR INSERT 
WITH CHECK (true);