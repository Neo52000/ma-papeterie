// ── AI-CMO Marketing Prompt Library ─────────────────────────────────────────
// Based on https://github.com/AICMO/AiCMO-Marketing-Prompt-Collection
// Static index embedded in the app — no API dependency.

export interface AiCmoPrompt {
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  githubPath: string;
}

export interface AiCmoSubcategory {
  name: string;
  prompts: AiCmoPrompt[];
}

export interface AiCmoCategory {
  name: string;
  subcategories: AiCmoSubcategory[];
}

const REPO_BASE = 'https://github.com/AICMO/AiCMO-Marketing-Prompt-Collection/blob/main';

export const buildGithubUrl = (path: string) => `${REPO_BASE}/${path}`;

export const AI_CMO_PROMPT_CATEGORIES: AiCmoCategory[] = [
  // ── 1. CMO & Leadership ──────────────────────────────────────────────────
  {
    name: 'CMO & Leadership',
    subcategories: [
      {
        name: 'Strategie',
        prompts: [
          { title: 'Plan strategique marketing annuel', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '01-CMO-Leadership/strategy/annual-marketing-plan.md' },
          { title: 'Analyse SWOT marketing', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '01-CMO-Leadership/strategy/swot-analysis.md' },
          { title: 'Audit de maturite marketing', difficulty: 'advanced', estimatedTime: '60 min', githubPath: '01-CMO-Leadership/strategy/maturity-audit.md' },
        ],
      },
      {
        name: 'Brand',
        prompts: [
          { title: 'Guide de marque et positionnement', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '01-CMO-Leadership/brand/brand-guidelines.md' },
          { title: 'Storytelling de marque', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '01-CMO-Leadership/brand/brand-storytelling.md' },
          { title: 'Audit de perception de marque', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '01-CMO-Leadership/brand/perception-audit.md' },
        ],
      },
      {
        name: 'Reporting',
        prompts: [
          { title: 'Tableau de bord CMO mensuel', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '01-CMO-Leadership/reporting/monthly-dashboard.md' },
          { title: 'Rapport ROI marketing', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '01-CMO-Leadership/reporting/roi-report.md' },
        ],
      },
      {
        name: 'Team Building',
        prompts: [
          { title: 'Organisation equipe marketing', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '01-CMO-Leadership/team/org-structure.md' },
          { title: 'Plan de formation equipe', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '01-CMO-Leadership/team/training-plan.md' },
        ],
      },
    ],
  },

  // ── 2. Product Marketing ─────────────────────────────────────────────────
  {
    name: 'Product Marketing',
    subcategories: [
      {
        name: 'Positionnement',
        prompts: [
          { title: 'Matrice de positionnement produit', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '02-Product-Marketing/positioning/positioning-matrix.md' },
          { title: 'Proposition de valeur unique', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '02-Product-Marketing/positioning/value-proposition.md' },
          { title: 'Analyse concurrentielle produit', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '02-Product-Marketing/positioning/competitive-analysis.md' },
        ],
      },
      {
        name: 'Go-To-Market',
        prompts: [
          { title: 'Plan de lancement GTM', difficulty: 'advanced', estimatedTime: '60 min', githubPath: '02-Product-Marketing/gtm/launch-plan.md' },
          { title: 'Checklist pre-lancement', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '02-Product-Marketing/gtm/pre-launch-checklist.md' },
          { title: 'Strategie de tarification', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '02-Product-Marketing/gtm/pricing-strategy.md' },
        ],
      },
      {
        name: 'Recherche',
        prompts: [
          { title: 'Profil client ideal (ICP)', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '02-Product-Marketing/research/icp-profile.md' },
          { title: 'Interview utilisateur', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '02-Product-Marketing/research/user-interview.md' },
        ],
      },
      {
        name: 'Sales Enablement',
        prompts: [
          { title: 'Battle card commercial', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '02-Product-Marketing/sales-enablement/battle-card.md' },
          { title: 'Script de demo produit', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '02-Product-Marketing/sales-enablement/demo-script.md' },
        ],
      },
      {
        name: 'Pricing',
        prompts: [
          { title: 'Strategie de pricing psychologique', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '02-Product-Marketing/pricing/psychological-pricing.md' },
          { title: 'Analyse d\'elasticite prix', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '02-Product-Marketing/pricing/price-elasticity.md' },
        ],
      },
    ],
  },

  // ── 3. Contenu & Creatif ─────────────────────────────────────────────────
  {
    name: 'Contenu & Creatif',
    subcategories: [
      {
        name: 'Blog',
        prompts: [
          { title: 'Article de blog optimise SEO', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '03-Content-Creative/blog/seo-blog-post.md' },
          { title: 'Calendrier editorial trimestriel', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '03-Content-Creative/blog/editorial-calendar.md' },
          { title: 'Guide pratique long format', difficulty: 'intermediate', estimatedTime: '40 min', githubPath: '03-Content-Creative/blog/long-form-guide.md' },
        ],
      },
      {
        name: 'Social Media',
        prompts: [
          { title: 'Strategie social media multi-plateforme', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '03-Content-Creative/social-media/multi-platform-strategy.md' },
          { title: 'Pack de posts LinkedIn', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '03-Content-Creative/social-media/linkedin-posts.md' },
          { title: 'Calendrier de contenu social', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '03-Content-Creative/social-media/content-calendar.md' },
        ],
      },
      {
        name: 'Viral',
        prompts: [
          { title: 'Hook viral pour reseaux sociaux', difficulty: 'intermediate', estimatedTime: '15 min', githubPath: '03-Content-Creative/viral/viral-hooks.md' },
          { title: 'Strategie de contenu viral', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '03-Content-Creative/viral/viral-strategy.md' },
        ],
      },
      {
        name: 'Copywriting',
        prompts: [
          { title: 'Page de vente haute conversion', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '03-Content-Creative/copywriting/sales-page.md' },
          { title: 'Accroches et titres percutants', difficulty: 'beginner', estimatedTime: '10 min', githubPath: '03-Content-Creative/copywriting/headlines.md' },
        ],
      },
      {
        name: 'SEO',
        prompts: [
          { title: 'Recherche de mots-cles strategiques', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '03-Content-Creative/seo/keyword-research.md' },
          { title: 'Optimisation on-page SEO', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '03-Content-Creative/seo/on-page-optimization.md' },
          { title: 'Strategie de link building', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '03-Content-Creative/seo/link-building.md' },
        ],
      },
      {
        name: 'Video',
        prompts: [
          { title: 'Script video YouTube', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '03-Content-Creative/video/youtube-script.md' },
          { title: 'Storyboard video courte (Reels/TikTok)', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '03-Content-Creative/video/short-video-storyboard.md' },
        ],
      },
      {
        name: 'Case Studies',
        prompts: [
          { title: 'Etude de cas client', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '03-Content-Creative/case-studies/customer-case-study.md' },
          { title: 'Temoignage client structure', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '03-Content-Creative/case-studies/testimonial.md' },
        ],
      },
    ],
  },

  // ── 4. Demand & Lead Generation ──────────────────────────────────────────
  {
    name: 'Demand & Lead Generation',
    subcategories: [
      {
        name: 'Email',
        prompts: [
          { title: 'Sequence d\'email de bienvenue', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '04-Demand-LeadGen/email/welcome-sequence.md' },
          { title: 'Campagne email de nurturing', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '04-Demand-LeadGen/email/nurturing-campaign.md' },
          { title: 'Email de relance panier abandonne', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '04-Demand-LeadGen/email/cart-abandonment.md' },
        ],
      },
      {
        name: 'Lead Gen',
        prompts: [
          { title: 'Lead magnet irresistible', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '04-Demand-LeadGen/lead-gen/lead-magnet.md' },
          { title: 'Landing page haute conversion', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '04-Demand-LeadGen/lead-gen/landing-page.md' },
          { title: 'Formulaire de qualification leads', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '04-Demand-LeadGen/lead-gen/lead-qualification.md' },
        ],
      },
      {
        name: 'PPC',
        prompts: [
          { title: 'Structure campagne Google Ads', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '04-Demand-LeadGen/ppc/google-ads-structure.md' },
          { title: 'Annonces Facebook/Meta Ads', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '04-Demand-LeadGen/ppc/meta-ads.md' },
        ],
      },
      {
        name: 'Growth Hacking',
        prompts: [
          { title: 'Strategie de growth hacking', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '04-Demand-LeadGen/growth/growth-strategy.md' },
          { title: 'Programme de parrainage', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '04-Demand-LeadGen/growth/referral-program.md' },
        ],
      },
      {
        name: 'Inbound',
        prompts: [
          { title: 'Strategie inbound marketing', difficulty: 'intermediate', estimatedTime: '35 min', githubPath: '04-Demand-LeadGen/inbound/inbound-strategy.md' },
          { title: 'Funnel de contenu inbound', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '04-Demand-LeadGen/inbound/content-funnel.md' },
        ],
      },
      {
        name: 'Outbound',
        prompts: [
          { title: 'Sequence de prospection froide', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '04-Demand-LeadGen/outbound/cold-outreach.md' },
          { title: 'Script d\'appel a froid', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '04-Demand-LeadGen/outbound/cold-call-script.md' },
        ],
      },
      {
        name: 'ABM',
        prompts: [
          { title: 'Strategie Account-Based Marketing', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '04-Demand-LeadGen/abm/abm-strategy.md' },
          { title: 'Playbook ABM par compte cible', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '04-Demand-LeadGen/abm/account-playbook.md' },
        ],
      },
      {
        name: 'Community',
        prompts: [
          { title: 'Strategie de communaute', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '04-Demand-LeadGen/community/community-strategy.md' },
          { title: 'Programme ambassadeurs', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '04-Demand-LeadGen/community/ambassador-program.md' },
        ],
      },
    ],
  },

  // ── 5. Analytics & Marketing Ops ─────────────────────────────────────────
  {
    name: 'Analytics & Marketing Ops',
    subcategories: [
      {
        name: 'Performance',
        prompts: [
          { title: 'Tableau de bord performance marketing', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '05-Analytics-MarOps/performance/marketing-dashboard.md' },
          { title: 'Analyse de cohortes clients', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '05-Analytics-MarOps/performance/cohort-analysis.md' },
        ],
      },
      {
        name: 'KPI',
        prompts: [
          { title: 'Definition des KPI marketing', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '05-Analytics-MarOps/kpi/kpi-definition.md' },
          { title: 'Scorecard marketing trimestriel', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '05-Analytics-MarOps/kpi/quarterly-scorecard.md' },
        ],
      },
      {
        name: 'Automation',
        prompts: [
          { title: 'Workflow d\'automatisation marketing', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '05-Analytics-MarOps/automation/marketing-workflow.md' },
          { title: 'Automatisation du lead scoring', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '05-Analytics-MarOps/automation/lead-scoring.md' },
        ],
      },
      {
        name: 'Tech Stack',
        prompts: [
          { title: 'Audit du stack MarTech', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '05-Analytics-MarOps/tech-stack/martech-audit.md' },
          { title: 'Selection d\'outil marketing', difficulty: 'intermediate', estimatedTime: '20 min', githubPath: '05-Analytics-MarOps/tech-stack/tool-selection.md' },
        ],
      },
      {
        name: 'Knowledge Base',
        prompts: [
          { title: 'Base de connaissances marketing', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '05-Analytics-MarOps/knowledge-base/marketing-wiki.md' },
          { title: 'Documentation des processus', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '05-Analytics-MarOps/knowledge-base/process-docs.md' },
        ],
      },
    ],
  },

  // ── 6. Playbooks par marche ──────────────────────────────────────────────
  {
    name: 'Playbooks par marche',
    subcategories: [
      {
        name: 'B2B',
        prompts: [
          { title: 'Playbook marketing B2B complet', difficulty: 'advanced', estimatedTime: '60 min', githubPath: '06-Market-Playbooks/b2b/b2b-playbook.md' },
          { title: 'Strategie LinkedIn B2B', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '06-Market-Playbooks/b2b/linkedin-b2b.md' },
          { title: 'Webinar marketing B2B', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '06-Market-Playbooks/b2b/webinar-marketing.md' },
        ],
      },
      {
        name: 'B2C',
        prompts: [
          { title: 'Playbook marketing B2C', difficulty: 'advanced', estimatedTime: '50 min', githubPath: '06-Market-Playbooks/b2c/b2c-playbook.md' },
          { title: 'Strategie de fidelisation client', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '06-Market-Playbooks/b2c/loyalty-strategy.md' },
          { title: 'Marketing saisonnier', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '06-Market-Playbooks/b2c/seasonal-marketing.md' },
        ],
      },
      {
        name: 'SaaS',
        prompts: [
          { title: 'Playbook growth SaaS', difficulty: 'advanced', estimatedTime: '55 min', githubPath: '06-Market-Playbooks/saas/saas-growth-playbook.md' },
          { title: 'Strategie d\'onboarding SaaS', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '06-Market-Playbooks/saas/onboarding-strategy.md' },
          { title: 'Reduction du churn SaaS', difficulty: 'advanced', estimatedTime: '40 min', githubPath: '06-Market-Playbooks/saas/churn-reduction.md' },
        ],
      },
      {
        name: 'D2C & Retail',
        prompts: [
          { title: 'Playbook D2C e-commerce', difficulty: 'advanced', estimatedTime: '50 min', githubPath: '06-Market-Playbooks/d2c-retail/d2c-playbook.md' },
          { title: 'Strategie omnicanale retail', difficulty: 'advanced', estimatedTime: '45 min', githubPath: '06-Market-Playbooks/d2c-retail/omnichannel-strategy.md' },
          { title: 'Marketing local pour magasin', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '06-Market-Playbooks/d2c-retail/local-marketing.md' },
        ],
      },
    ],
  },

  // ── 7. Gestion equipe hybride IA ─────────────────────────────────────────
  {
    name: 'Gestion equipe hybride IA',
    subcategories: [
      {
        name: 'Collaboration',
        prompts: [
          { title: 'Framework de collaboration humain-IA', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '07-Hybrid-AI-Team/collaboration/human-ai-framework.md' },
          { title: 'Integration IA dans les workflows', difficulty: 'intermediate', estimatedTime: '30 min', githubPath: '07-Hybrid-AI-Team/collaboration/ai-workflow-integration.md' },
        ],
      },
      {
        name: 'Prompt Engineering',
        prompts: [
          { title: 'Guide de prompt engineering marketing', difficulty: 'beginner', estimatedTime: '20 min', githubPath: '07-Hybrid-AI-Team/prompt-engineering/marketing-prompts-guide.md' },
          { title: 'Templates de prompts avances', difficulty: 'advanced', estimatedTime: '35 min', githubPath: '07-Hybrid-AI-Team/prompt-engineering/advanced-templates.md' },
          { title: 'Optimisation de prompts iterative', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '07-Hybrid-AI-Team/prompt-engineering/iterative-optimization.md' },
        ],
      },
      {
        name: 'Ethique',
        prompts: [
          { title: 'Charte ethique IA marketing', difficulty: 'intermediate', estimatedTime: '25 min', githubPath: '07-Hybrid-AI-Team/ethics/ai-ethics-charter.md' },
          { title: 'Detection de biais dans le contenu IA', difficulty: 'advanced', estimatedTime: '30 min', githubPath: '07-Hybrid-AI-Team/ethics/bias-detection.md' },
          { title: 'Transparence et disclosure IA', difficulty: 'beginner', estimatedTime: '15 min', githubPath: '07-Hybrid-AI-Team/ethics/ai-disclosure.md' },
        ],
      },
    ],
  },
];
