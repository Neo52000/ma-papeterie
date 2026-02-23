## Description

<!-- Résumé des changements et contexte. Quel problème est résolu ? -->

Fixes # <!-- numéro d'issue si applicable -->

---

## 🧪 Tests

- [ ] `npx tsc --noEmit` — zéro erreur TypeScript
- [ ] Application démarre en local (`npm run dev`) sans erreur console
- [ ] Routes publiques accessibles (/, /shop, /catalogue, un produit)
- [ ] Routes admin redirigent vers login si non-authentifié
- [ ] Import liste scolaire : OCR OK sur un PDF valide, erreur gracieuse sur PDF illisible
- [ ] Panier : ajout / suppression / vidage fonctionne
- [ ] Paiement : le flow checkout démarre correctement (n'a pas besoin d'aller jusqu'au bout)

---

## 🔒 Sécurité

- [ ] RLS activé sur **toutes** les nouvelles tables (vérifier avec `scripts/check-rls.sql`)
- [ ] Nouvelles Edge Functions : `verify_jwt` (ou validation manuelle du token) présent
- [ ] Aucun secret / clé API commité dans le code (`scripts/check-release.sh` — section secrets)
- [ ] `.env` et `.env.*` figurent dans `.gitignore`
- [ ] Pas d'endpoint admin accessible sans rôle `admin`/`super_admin`
- [ ] Inputs utilisateur validés/échappés côté serveur

---

## 🔍 SEO

- [ ] Balise `<link rel="canonical">` présente sur les nouvelles pages publiques
- [ ] `/admin/*` figure dans `robots.txt` avec `Disallow: /admin`
- [ ] `sitemap.xml` mis à jour si de nouvelles pages publiques ont été ajoutées
- [ ] Redirections 301 en place si des URLs publiques ont changé
- [ ] Balises `<title>` et `<meta name="description">` renseignées sur les nouvelles pages

---

## ⚡ Performance

- [ ] Images : format WebP ou attribut `loading="lazy"` sur les images above-the-fold absents
- [ ] Pas de dépendance lourde ajoutée sans justification (`npm run build` — vérifier la taille du bundle)
- [ ] États de chargement (Skeleton / spinner) présents sur les données asynchrones
- [ ] Pas de `useEffect` qui déclenche des boucles de re-render infinies

---

## 🔄 Rollback

- [ ] Tag git créé avant tout déploiement en production (`git tag vX.Y.Z`)
- [ ] Migrations SQL réversibles **ou** plan de rollback documenté dans `docs/release-process.md`
- [ ] Nouvelles Edge Functions peuvent être désactivées sans casser l'app frontend
- [ ] Feature flags / variables d'environnement documentés si la feature est togglable

---

## 📋 Général

- [ ] Pas de `console.log` / `console.error` de debug oublié dans le code final
- [ ] Variables d'environnement nouvelles documentées dans `.env.example`
- [ ] MEMORY.md / docs projet mis à jour si de nouveaux patterns ou tables ont été ajoutés
- [ ] PR cible la bonne branche (`main` sauf cas particulier)
