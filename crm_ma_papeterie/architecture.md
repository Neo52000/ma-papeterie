# Architecture Technique — CRM ma-papeterie.fr

## Vue d'ensemble

```
                        ┌─────────────────────────────────────────┐
                        │              VPS Hostinger               │
                        │         srv1475682.hstgr.cloud           │
                        │                                          │
  Utilisateur ──HTTPS──▶│  Nginx (reverse proxy + SSL Let's Encrypt)│
                        │         ↓                  ↓            │
                        │   Next.js Frontend    Node.js API       │
                        │   (port 3000)         (port 4000)       │
                        │         ↓                  ↓            │
                        │          n8n (port 5678)                │
                        │         ↗        ↓        ↘            │
                        │   API Sirene  Claude AI  SMTP/IMAP      │
                        └────────────────────┬────────────────────┘
                                             │ DATABASE_URL (SSL)
                                             ▼
                        ┌─────────────────────────────────────────┐
                        │           Supabase (cloud)               │
                        │    db.[ref].supabase.co:5432             │
                        │    PostgreSQL 15+ managé                 │
                        └─────────────────────────────────────────┘
```

## Stack Technique

| Couche        | Technologie            | Version  |
|---------------|------------------------|----------|
| Frontend      | Next.js (App Router)   | 14+      |
| Backend API   | Node.js + Express      | 20 LTS   |
| Base données  | Supabase (PostgreSQL)  | 15+      |
| Orchestration | n8n auto-hébergé       | latest   |
| Reverse proxy | Nginx                  | stable   |
| SSL           | Let's Encrypt (certbot)| -        |
| Conteneurs    | Docker + Compose       | latest   |
| PDF           | Puppeteer / PDFKit     | latest   |
| IA            | Claude API / OpenAI    | paramétrable |
| Email         | Nodemailer (SMTP)      | -        |
| Auth          | JWT + bcrypt           | -        |

## Composants Détaillés

### Frontend (Next.js)

```
/app
  /dashboard          ← Vue synthétique KPI
  /prospects          ← Liste + fiche prospect
  /pipeline           ← Kanban drag-and-drop
  /taches             ← Relances / rappels
  /agenda             ← Calendrier RDV
  /clients            ← Fiches clients
  /devis              ← Génération + historique
  /factures           ← Facturation simple
  /catalogue          ← Produits / tarifs
  /sav                ← Tickets support
  /ai-copilot         ← Interface copilote IA
  /settings           ← Config SMTP, IA, utilisateur
  /admin
    /imports          ← Import CSV / API
    /analytics        ← Statistiques avancées
    /automations      ← Statut workflows n8n
    /logs-ia          ← Journal IA
```

### Backend API (Node.js/Express)

```
/src
  /routes
    prospects.js
    clients.js
    opportunities.js
    devis.js
    factures.js
    catalogue.js
    taches.js
    emails.js
    ai.js
    auth.js
    webhooks.js       ← Réception n8n
  /services
    ai.service.js     ← Appels Claude/OpenAI
    email.service.js  ← Nodemailer SMTP
    pdf.service.js    ← Génération PDF
    geo.service.js    ← Haversine / distance
    sirene.service.js ← API Sirene wrapper
  /middleware
    auth.js
    rateLimit.js
    logger.js
  /models             ← ORM (Prisma ou Knex)
```

### Calcul distance géographique

```javascript
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Centre Chaumont
const CHAUMONT = { lat: 48.111338, lng: 5.138481 };
const RAYON_KM = 20;

function estDansZone(lat, lng) {
  return haversine(CHAUMONT.lat, CHAUMONT.lng, lat, lng) <= RAYON_KM;
}
```

## Flux de données

```
API Sirene (hebdo) ──▶ n8n Workflow 1 ──▶ Filtre distance ──▶ PostgreSQL
                                                                    │
                              n8n Workflow 2 (new prospect) ◀───────┘
                                    │
                              Claude/GPT API
                                    │
                          Score + Email draft ──▶ PostgreSQL
                                    │
                              n8n Workflow 3 ──▶ SMTP Hostinger ──▶ Prospect
                                                        │
                              n8n Workflow 4 ◀── IMAP polling
                                    │
                          Update prospect + Create task
```

## Sécurité

- JWT avec expiration 8h
- HTTPS uniquement (redirection HTTP→HTTPS dans Nginx)
- Rate limiting : 100 req/min par IP
- Firewall UFW : ports 22, 80, 443 uniquement exposés
- Variables d'environnement dans `.env` (jamais commitées)
- Backup chiffré quotidien PostgreSQL vers stockage offsite
- Logs d'accès Nginx + logs applicatifs

## Ports internes (non exposés)

| Service    | Port  |
|------------|-------|
| Next.js    | 3000  |
| Node API   | 4000  |
| PostgreSQL | 5432  |
| n8n        | 5678  |
| Nginx      | 80/443|
