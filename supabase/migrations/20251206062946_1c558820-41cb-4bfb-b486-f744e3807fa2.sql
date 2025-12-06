-- Table pour le registre des traitements de données (Article 30 RGPD)
CREATE TABLE public.data_processing_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processing_name TEXT NOT NULL,
  processing_purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  data_categories TEXT[] NOT NULL DEFAULT '{}',
  data_subjects TEXT[] NOT NULL DEFAULT '{}',
  recipients TEXT[] DEFAULT '{}',
  third_country_transfers TEXT,
  retention_period TEXT NOT NULL,
  security_measures TEXT,
  data_source TEXT,
  is_automated_decision BOOLEAN DEFAULT false,
  dpia_required BOOLEAN DEFAULT false,
  dpia_conducted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.data_processing_register ENABLE ROW LEVEL SECURITY;

-- Only admins can manage the register
CREATE POLICY "Admins can manage processing register"
  ON public.data_processing_register
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can view processing register"
  ON public.data_processing_register
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_data_processing_register_updated_at
  BEFORE UPDATE ON public.data_processing_register
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default processing activities
INSERT INTO public.data_processing_register (
  processing_name, processing_purpose, legal_basis, data_categories, data_subjects,
  recipients, retention_period, security_measures, data_source, created_by
) VALUES 
(
  'Gestion des commandes',
  'Traitement des commandes clients, facturation et livraison',
  'Exécution du contrat (Art. 6.1.b)',
  ARRAY['Identité', 'Coordonnées', 'Données de paiement', 'Historique des commandes'],
  ARRAY['Clients'],
  ARRAY['Service comptable', 'Transporteurs'],
  '10 ans (obligations comptables)',
  'Chiffrement des données, accès restreint, sauvegardes régulières',
  'Formulaire de commande',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Création de compte utilisateur',
  'Permettre aux utilisateurs de créer un compte et gérer leurs informations',
  'Exécution du contrat (Art. 6.1.b)',
  ARRAY['Identité', 'Coordonnées', 'Mot de passe hashé'],
  ARRAY['Utilisateurs inscrits'],
  ARRAY['Équipe support'],
  'Durée du compte + 3 ans',
  'Hashage des mots de passe, authentification sécurisée',
  'Formulaire d''inscription',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Newsletter et communications marketing',
  'Envoi de newsletters et offres promotionnelles',
  'Consentement (Art. 6.1.a)',
  ARRAY['Email', 'Préférences de communication'],
  ARRAY['Abonnés newsletter'],
  ARRAY['Plateforme d''emailing'],
  'Jusqu''au retrait du consentement',
  'Double opt-in, lien de désinscription',
  'Formulaire d''inscription newsletter',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Cookies et analytics',
  'Analyse de la navigation et amélioration du site',
  'Consentement (Art. 6.1.a)',
  ARRAY['Données de navigation', 'Adresse IP anonymisée'],
  ARRAY['Visiteurs du site'],
  ARRAY['Google Analytics'],
  '13 mois maximum',
  'Anonymisation IP, consentement préalable',
  'Navigation sur le site',
  '00000000-0000-0000-0000-000000000000'
),
(
  'Gestion des demandes RGPD',
  'Traitement des demandes d''accès, rectification, suppression',
  'Obligation légale (Art. 6.1.c)',
  ARRAY['Identité', 'Coordonnées', 'Contenu de la demande'],
  ARRAY['Personnes concernées'],
  ARRAY['DPO', 'Service juridique'],
  '5 ans après traitement',
  'Accès restreint, traçabilité',
  'Formulaire de demande RGPD',
  '00000000-0000-0000-0000-000000000000'
);