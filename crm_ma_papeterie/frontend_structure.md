# Frontend — Structure Next.js 14 (App Router) — CRM ma-papeterie.fr

## Stack Frontend

| Librairie          | Usage                                 |
|--------------------|---------------------------------------|
| Next.js 14         | Framework (App Router + SSR)          |
| TypeScript         | Typage                                |
| shadcn/ui          | Composants UI (basé Radix + Tailwind) |
| Tailwind CSS       | Styles                                |
| React Query (TQ)   | Fetching / cache serveur              |
| Zustand            | État global léger                     |
| React Hook Form    | Gestion formulaires                   |
| Zod                | Validation schémas                    |
| @dnd-kit/core      | Kanban drag-and-drop                  |
| Recharts           | Graphiques dashboard                  |
| Leaflet + React-L  | Carte prospects                       |
| date-fns           | Manipulation dates                    |
| jsPDF / react-pdf  | Génération/affichage PDF côté client  |

---

## Arborescence complète

```
/frontend
├── app/
│   ├── layout.tsx                    ← Layout racine (providers, navigation)
│   ├── page.tsx                      ← Redirection → /dashboard
│   ├── globals.css
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              ← Page de connexion JWT
│   │
│   ├── dashboard/
│   │   └── page.tsx                  ← KPIs + résumé journée
│   │
│   ├── prospects/
│   │   ├── page.tsx                  ← Liste prospects (table + filtres)
│   │   ├── [id]/
│   │   │   └── page.tsx              ← Fiche prospect complète
│   │   └── import/
│   │       └── page.tsx              ← Import CSV
│   │
│   ├── pipeline/
│   │   └── page.tsx                  ← Kanban drag-and-drop
│   │
│   ├── taches/
│   │   └── page.tsx                  ← Liste tâches / relances
│   │
│   ├── agenda/
│   │   └── page.tsx                  ← Calendrier RDV
│   │
│   ├── clients/
│   │   ├── page.tsx                  ← Liste clients
│   │   └── [id]/
│   │       └── page.tsx              ← Fiche client
│   │
│   ├── devis/
│   │   ├── page.tsx                  ← Liste devis
│   │   ├── nouveau/
│   │   │   └── page.tsx              ← Créer devis
│   │   └── [id]/
│   │       └── page.tsx              ← Détail + PDF devis
│   │
│   ├── factures/
│   │   ├── page.tsx                  ← Liste factures
│   │   ├── nouvelle/
│   │   │   └── page.tsx              ← Créer facture
│   │   └── [id]/
│   │       └── page.tsx              ← Détail + PDF facture
│   │
│   ├── catalogue/
│   │   └── page.tsx                  ← Produits / tarifs
│   │
│   ├── sav/
│   │   ├── page.tsx                  ← Liste tickets
│   │   └── [id]/
│   │       └── page.tsx              ← Ticket détail
│   │
│   ├── ai-copilot/
│   │   └── page.tsx                  ← Interface copilote IA
│   │
│   └── settings/
│       ├── page.tsx                  ← Paramètres généraux
│       ├── email/
│       │   └── page.tsx              ← Config SMTP/IMAP
│       ├── ia/
│       │   └── page.tsx              ← Config modèle IA
│       ├── imports/
│       │   └── page.tsx              ← Historique imports
│       ├── analytics/
│       │   └── page.tsx              ← Stats avancées
│       ├── automations/
│       │   └── page.tsx              ← Statut workflows n8n
│       └── logs-ia/
│           └── page.tsx              ← Journal appels IA
│
├── components/
│   ├── ui/                           ← shadcn/ui (Button, Card, Dialog…)
│   ├── layout/
│   │   ├── AppShell.tsx              ← Sidebar + header principal
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ModeToggle.tsx            ← Débutant / Avancé
│   │
│   ├── dashboard/
│   │   ├── KPICard.tsx               ← Carte KPI (prospects, emails, CA…)
│   │   ├── PipelineChart.tsx         ← Graphique Recharts pipeline
│   │   ├── RecentActivity.tsx        ← Fil d'activité récente
│   │   └── TasksWidget.tsx           ← Tâches du jour
│   │
│   ├── prospects/
│   │   ├── ProspectTable.tsx         ← Table avec filtres + recherche
│   │   ├── ProspectCard.tsx          ← Carte résumé prospect
│   │   ├── ProspectForm.tsx          ← Formulaire création / édition
│   │   ├── ProspectMap.tsx           ← Carte Leaflet prospects locaux
│   │   ├── ScoreBadge.tsx            ← Badge score coloré (0–100)
│   │   ├── TemperatureBadge.tsx      ← froid / tiède / chaud
│   │   └── InteractionTimeline.tsx   ← Historique interactions
│   │
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx           ← Board principal DnD
│   │   ├── KanbanColumn.tsx          ← Colonne pipeline
│   │   └── KanbanCard.tsx            ← Carte prospect draggable
│   │
│   ├── emails/
│   │   ├── EmailComposer.tsx         ← Composer email avec IA
│   │   └── EmailThread.tsx           ← Fil de messages
│   │
│   ├── devis/
│   │   ├── QuoteBuilder.tsx          ← Constructeur lignes devis
│   │   └── QuotePDFPreview.tsx       ← Aperçu PDF iframe
│   │
│   ├── ai/
│   │   ├── AICopilot.tsx             ← Chat copilote IA
│   │   ├── AIEmailDraft.tsx          ← Brouillon email généré
│   │   ├── AIScorePanel.tsx          ← Panel scoring IA
│   │   └── AICallScript.tsx          ← Script d'appel généré
│   │
│   └── common/
│       ├── SearchBar.tsx             ← Recherche globale langage naturel
│       ├── StatusBadge.tsx           ← Badge statut coloré
│       ├── ConfirmDialog.tsx         ← Dialog confirmation
│       ├── DatePicker.tsx
│       ├── LoadingSpinner.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── api.ts                        ← Client HTTP (fetch wrapper + auth)
│   ├── auth.ts                       ← JWT helpers
│   ├── geo.ts                        ← haversine(), formatDistance()
│   └── utils.ts                      ← cn(), formatCurrency(), formatDate()
│
├── hooks/
│   ├── useProspects.ts               ← React Query hooks prospects
│   ├── useOpportunities.ts
│   ├── useTasks.ts
│   ├── useEmails.ts
│   ├── useAI.ts                      ← Appels IA (score, email, script)
│   └── useAuth.ts
│
├── store/
│   ├── authStore.ts                  ← Zustand auth (user, token)
│   └── uiStore.ts                    ← Mode débutant/avancé, sidebar
│
├── types/
│   ├── prospect.ts
│   ├── opportunity.ts
│   ├── email.ts
│   ├── quote.ts
│   ├── invoice.ts
│   └── ai.ts
│
└── public/
    └── logo.png
```

---

## Pages clés — Détail

### Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────────┐
│  Bonjour !  Lundi 9 mars 2026                       │
├──────────┬──────────┬──────────┬────────────────────┤
│  12      │   3      │   87%    │   1 240 €          │
│ Prospects│ Emails   │ Score IA │ CA ce mois         │
│ du jour  │ envoyés  │ moyen    │                    │
├──────────┴──────────┴──────────┴────────────────────┤
│  Pipeline (Recharts BarChart)                       │
│  À contacter | Contacté | Intéressé | Devis | Gagné│
├─────────────────────────┬───────────────────────────┤
│  Tâches du jour (5)     │  Activité récente         │
│  ○ Relance Mairie 10h   │  ● Email envoyé – SARL X  │
│  ○ Devis Impr. Dupont   │  ● Prospect importé (23)  │
│  ○ Appel Ecole Jules F. │  ● Devis DEV-001 accepté  │
└─────────────────────────┴───────────────────────────┘
```

### Pipeline Kanban (`/pipeline`)

```tsx
// Exemple simplifié KanbanBoard.tsx
import { DndContext, DragEndEvent } from '@dnd-kit/core';

export function KanbanBoard() {
  const stages = ['a_contacter', 'contacte', 'interesse', 'devis', 'gagne'];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    // PATCH /api/prospects/:id avec nouveau pipeline_stage
    updateProspectStage(active.id as string, over.id as string);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto h-full">
        {stages.map(stage => (
          <KanbanColumn key={stage} stageId={stage} />
        ))}
      </div>
    </DndContext>
  );
}
```

### Fiche Prospect (`/prospects/[id]`)

Sections :
1. **En-tête** : nom, siret, score, badge statut, distance, température
2. **Coordonnées** : email, téléphone, adresse, carte mini Leaflet
3. **Copilote IA** : boutons « Générer email », « Script appel », « Analyser »
4. **Historique interactions** : timeline emails + appels + notes
5. **Opportunités** : liste et création
6. **Tâches liées** : à faire pour ce prospect
7. **Devis/Factures** : historique

---

## Variables d'environnement Next.js

```env
# .env.local
NEXT_PUBLIC_API_URL=https://crm.ma-papeterie.fr/api
NEXT_PUBLIC_APP_NAME=ma-papeterie CRM
NEXT_PUBLIC_MAP_CENTER_LAT=48.111338
NEXT_PUBLIC_MAP_CENTER_LNG=5.138481
```

---

## Dockerfile Frontend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
