# Architecture — Flux critiques

Documentation des 4 flux métier principaux de Ma Papeterie.

---

## 1. Flux Panier

### Vue d'ensemble

Trois stores Zustand indépendants gèrent trois types de produits :

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  mainCartStore   │   │ shopifyCartStore  │   │ serviceCartStore │
│  (produits BDD)  │   │ (produits Shopify)│   │ (services photo) │
│  localStorage    │   │  localStorage     │   │  sessionStorage  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Fichiers

| Fichier | Rôle |
|---------|------|
| `src/stores/mainCartStore.ts` | Panier principal (produits internes Supabase) |
| `src/stores/shopifyCartStore.ts` | Panier Shopify Storefront API |
| `src/stores/serviceCartStore.ts` | Panier services (photo, reprographie) — sessionStorage |
| `src/contexts/CartContext.tsx` | Wrapper legacy (40 lignes), délègue à `mainCartStore` |

### Comportement clé

- **Validation stock** : `addToCart` vérifie `stock_quantity` avant ajout ; refuse avec `toast.error` si insuffisant
- **Persistance** : `mainCartStore` et `shopifyCartStore` → `localStorage` ; `serviceCartStore` → `sessionStorage`
- **Calculs** : `calculateTotals()` interne, recalcule `total` et `itemCount` à chaque mutation
- **Analytics** : `track('add_to_cart', ...)` sur chaque ajout
- **Stamp design** : `stamp_design_id` optionnel sur `CartItem` pour tampons personnalisés

### Points d'attention

- `CartContext` est un wrapper legacy — le vrai état est dans `useMainCartStore`
- Les 3 stores sont indépendants : pas de total global unifié
- `serviceCartStore` calcule TVA 20% + frais livraison 5.90€ en interne

---

## 2. Flux Commande

### Vue d'ensemble

```
Panier → Checkout (2 étapes) → Stripe → Confirmation
                                  ↓
                              createOrder() → Supabase orders + order_items
                                  ↓
                              fireBrevoSync() → CRM
```

### Fichiers

| Fichier | Rôle |
|---------|------|
| `src/pages/Checkout.tsx` | Page checkout 2 étapes (845 lignes) |
| `src/hooks/useOrders.ts` | Hook orders : fetch, create, Stripe checkout (269 lignes) |
| `src/lib/checkoutSchema.ts` | Schémas Zod pour validation formulaire |

### Cycle de vie

```
Commande : pending → confirmed → preparing → shipped → delivered
                                                      → cancelled

Paiement : pending → paid → refunded
                   → failed
                   → cancelled
```

### Étapes du checkout

1. **Étape 1** : Informations client (email, nom, adresse facturation) — validé par `checkoutStep1Schema`
2. **Étape 2** : Adresse livraison + mode de livraison — validé par `checkoutStep2Schema`
3. **Paiement** : Redirection Stripe via `createStripeCheckout()`
4. **Retour** : Gestion du retour Stripe (succès/annulation) avec récupération de session

### Points d'attention

- `Checkout.tsx` est monolithique (845 lignes) — candidat au refactoring
- Intégration Brevo CRM via `fireBrevoSync()` après création commande
- Gestion des paiements annulés avec récupération de session Stripe

---

## 3. Flux Authentification

### Vue d'ensemble

```
Supabase Auth (JWT)
       ↓
AuthContext.tsx → user, session, rôles
       ↓
  ┌────────────┐
  │ Rôle check │→ isAdmin, isSuperAdmin, isPro
  │ (roles DB) │
  └────────────┘
       ↓
  Guards: AdminGuard, AuthGuard, ProGuard
       ↓
  B2B: auto-switch HT si TVA (b2b_company_users + b2b_accounts)
```

### Fichiers

| Fichier | Rôle |
|---------|------|
| `src/contexts/AuthContext.tsx` | Provider auth principal (190 lignes) |
| `src/stores/authStore.ts` | Store Zustand auth (coexiste avec Context) |
| `src/stores/priceModeStore.ts` | Toggle HT/TTC (24 lignes) |
| `src/components/AdminGuard.tsx` | Protège routes admin |
| `src/components/AuthGuard.tsx` | Protège routes authentifiées |
| `src/components/ProGuard.tsx` | Protège fonctionnalités B2B |

### Rôles

- **isAdmin** : accès au back-office (`/admin/*`)
- **isSuperAdmin** : accès étendu (gestion utilisateurs, config)
- **isPro** : compte B2B avec prix HT, paliers volume

### Flux B2B

1. Connexion utilisateur
2. Vérification `b2b_company_users` → `b2b_accounts`
3. Si numéro TVA présent → `priceModeStore.setMode('ht')` automatique
4. Affichage prix HT partout via `usePriceModeStore`

### Points d'attention

- `AuthContext` et `authStore` coexistent — migration vers Zustand en cours
- Session timeout géré par `useSessionTimeout` hook
- Les guards redirigent vers `/login` ou `/` selon le cas

---

## 4. Flux Pricing / Marge

### Règle critique

> **Aucun produit ne peut avoir une marge inférieure à 10% sur le prix de vente HT.**
> Cette règle est NON NÉGOCIABLE — ne jamais modifier sans validation direction.

### Formule

```
marge (%) = (Prix HT − Prix d'achat HT) / Prix HT × 100

Prix minimum HT = Prix d'achat / (1 − marge_min / 100)
```

### Fichiers

| Fichier | Rôle |
|---------|------|
| `src/lib/margin.ts` | Fonctions de calcul (32 lignes) |
| Formulaire produit admin | Validation à la saisie |
| Paliers de volume | Vérification par palier |
| `supabase/functions/` | Edge Functions pricing dynamique |

### Fonctions

- `calculateMargin(priceHt, costPrice)` → marge en %
- `minimumSellingPrice(costPrice, minMargin?)` → prix HT minimum
- `isMarginValid(priceHt, costPrice, minMargin?)` → boolean

### Points d'attention

- Si pas de prix d'achat : avertissement uniquement (pas de blocage)
- La constante `MINIMUM_MARGIN_PERCENT = 10` est la source de vérité unique
- S'applique aussi aux offres fournisseurs (`supplier_offers`)
