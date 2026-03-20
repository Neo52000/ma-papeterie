# Ma Papeterie — Instructions Projet

## Présentation

E-commerce B2B/B2C de fournitures scolaires et de bureau, basé à Chaumont (52).
Site : ma-papeterie.fr

## Stack technique

- **Frontend** : React 18 + TypeScript 5.8 + Vite 7 (SWC)
- **Styling** : Tailwind CSS 3.4 + shadcn/ui (50+ composants Radix UI)
- **State** : Zustand 5 (stores) + TanStack Query 5 (data fetching) + React Context (auth/cart legacy)
- **Routing** : React Router DOM 6
- **Formulaires** : React Hook Form + Zod
- **Backend** : Supabase (PostgreSQL 16 + Edge Functions Deno + Auth + Realtime)
- **Déploiement** : Netlify (CDN + Serverless Functions)
- **Monitoring** : Sentry

## Commandes

```bash
npm run dev            # Serveur dev (port 8080)
npm run build          # Build production
npm run build:check    # Typecheck + build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch)
npm run test:coverage  # Couverture
```

## Structure

```
src/
├── components/        # Composants (admin/, cart/, layout/, ui/, sections/, ...)
├── config/            # env.ts (validation Zod des variables d'environnement)
├── contexts/          # React Context (AuthContext, CartContext)
├── data/              # Données statiques, constantes
├── hooks/             # 60+ hooks custom (useProducts, useOrders, ...)
├── integrations/      # supabase/client.ts + types.ts (auto-générés, NE PAS MODIFIER)
├── lib/               # Utilitaires (api.ts, formatPrice, sanitize, seo-schemas, ...)
├── pages/             # 80+ pages (lazy-loaded dans App.tsx)
├── stores/            # Zustand stores (cartStore, pageBuilderStore, ...)
├── test/              # setup.ts (Vitest + Testing Library)
supabase/
├── functions/         # 40+ Edge Functions Deno
├── migrations/        # 200+ migrations SQL versionnées
netlify/
└── functions/         # Serverless Functions Node.js
```

## Conventions de nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Composants | PascalCase | `ProductCard.tsx` |
| Hooks | `use*` prefix | `useProducts.ts` |
| Stores | `*Store.ts` | `cartStore.ts` |
| Contextes | `*Context.tsx` | `AuthContext.tsx` |
| Utilitaires | camelCase | `formatPrice.ts` |
| Tests | `*.test.ts(x)` | `cartStore.test.ts` |

## Import alias

`@/` pointe vers `src/`. Toujours utiliser :
```typescript
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
```

## Design system

- **Police** : Poppins (Google Fonts)
- **Couleurs** : Variables HSL dans `index.css`
  - Primary : bleu profond `215 85% 35%`
  - Secondary/Accent : jaune doux `45 95% 65%`
  - Thème vintage : cream, yellow, brown
- **Animations custom** : fade-in-up, fade-in-left, scale-in, cart-bounce, slide-up, marquee
- **Variantes boutons** : default, destructive, outline, secondary, accent, ghost, link, vintage, hero, cta

## Patterns de code

### Data fetching (TanStack Query)
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['products', category],
  queryFn: () => supabase.from('products').select('*'),
  staleTime: 5 * 60_000,
});
```

### Zustand stores
```typescript
export const useCartStore = create<CartState>()((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
}));
```

### Formulaires
```typescript
const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema) });
```

### Lazy loading pages
```typescript
const Page = lazy(() => import('@/pages/Page'));
<Suspense fallback={<Loader2 className="animate-spin" />}>
  <Page />
</Suspense>
```

### Guards (contrôle d'accès)
```typescript
<AdminGuard><AdminPanel /></AdminGuard>
<AuthGuard><MonCompte /></AuthGuard>
```

## Supabase

- **Client** : `src/integrations/supabase/client.ts` — singleton typé, NE PAS MODIFIER
- **Types** : `src/integrations/supabase/types.ts` — auto-générés, NE PAS MODIFIER
- **Edge Functions** : Deno runtime dans `supabase/functions/`
- **Migrations** : Pattern `YYYYMMDDHHMMSS_description.sql`

## Variables d'environnement

Requises (`.env.local`) :
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Validées par Zod dans `src/config/env.ts`.

## Sécurité

- XSS : DOMPurify via `lib/sanitize.ts`
- Validation : Zod sur tous les formulaires
- Auth : Supabase JWT + guards (AdminGuard, AuthGuard, ProGuard)
- CSP + HSTS + X-Frame-Options dans `netlify.toml`
- Anti-bot : `components/HoneypotField.tsx`

## Performance — Points d'attention

- `strictNullChecks: false` — attention aux null/undefined non vérifiés
- Certains fichiers admin dépassent 1000 lignes (AdminComlandi, AdminPurchases, AdminProducts)
- Migration en cours : CartContext/AuthContext → Zustand (éviter les re-renders)
- Utiliser `.in('id', ids)` au lieu de boucles N+1 pour les requêtes batch
- Toujours mettre `staleTime` sur les queries TanStack non-critiques
- Librairies lourdes (recharts, jspdf, xlsx) : import dynamique uniquement

## Tests

- Framework : Vitest + React Testing Library
- Setup : `src/test/setup.ts`
- Lancer : `npm run test` ou `npm run test:watch`

## Déploiement

- **Netlify** : build `npm run build`, publish `dist/`
- **Node** : v20
- **Headers** : assets immutables (1 an), index.html no-cache
- **Sitemaps** : générés dynamiquement via Edge Function, proxiés par Netlify
