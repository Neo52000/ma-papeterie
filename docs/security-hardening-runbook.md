# Déploiement du durcissement de sécurité

## Ordre de déploiement

1. Sauvegarder la base et vérifier qu'un second administrateur peut accéder au projet Supabase.
2. Appliquer `20260807121617_security_hardening_phase_1_3.sql`.
3. Déployer les Edge Functions modifiées.
4. Déployer l'application Astro/Netlify.
5. Demander à chaque administrateur d'enrôler un facteur TOTP sur `/admin/2fa`.
6. Vérifier qu'une session AAL1 est redirigée vers l'enrôlement et qu'une session AAL2 accède à l'administration.

Les anciens secrets et codes de secours TOTP personnalisés sont invalidés par la migration. Ils ne doivent pas être restaurés.

## Contrôles après déploiement

- Une requête admin AAL1 vers une Edge Function renvoie `403` avec `mfa_required`.
- Une requête admin AAL2 est autorisée si le rôle `admin` ou `super_admin` est présent dans `user_roles`.
- `scrape-competitor-prices` renvoie `410` et n'écrit plus de valeurs aléatoires.
- Seules les lignes `competitor_prices` avec `is_valid = true` et `is_simulated = false` alimentent les calculs.
- Les routes protégées renvoient `Cache-Control: private, no-store`.

## Perte du téléphone d'un administrateur

1. Un second administrateur ouvre le projet Supabase et supprime le facteur MFA perdu depuis la gestion de l'utilisateur.
2. L'utilisateur se reconnecte et enrôle un nouveau facteur sur `/admin/2fa`.
3. Vérifier une nouvelle session AAL2 avant de rendre l'accès.

Ne pas contourner temporairement l'AAL2 et ne jamais communiquer de clé `service_role` à l'utilisateur.

## Retour arrière contrôlé

Conserver la sauvegarde et la migration appliquée tant que possible. En cas de défaut bloquant, redéployer d'abord la version applicative précédente, puis appliquer une migration d'urgence revue qui retire uniquement les politiques restrictives `require_admin_aal2` et restaure l'ancienne définition de `has_role`. Ne pas réactiver les RPC TOTP personnalisées et ne pas remettre les prix simulés en production.

Après correction, réappliquer le contrôle AAL2 avant de rouvrir les opérations d'administration.
