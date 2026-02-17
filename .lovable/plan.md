

## Agent IA de generation de descriptions produit enrichies

### Objectif
Creer un nouvel agent IA (`agent-descriptions`) qui genere automatiquement des descriptions produit enrichies en combinant les donnees du produit avec celles provenant des fournisseurs (ALKOR, Soft Carrier, COMLANDI).

### Fonctionnement

L'agent pour chaque produit :
1. Recupere les infos produit (`products`) : nom, categorie, EAN, attributs, dimensions, poids, eco, marque
2. Recupere toutes les donnees fournisseurs via `supplier_products` + jointure `suppliers(name)` : references, notes, prix, conditionnement (`quantity_discount`)
3. Envoie le tout a l'IA (OpenAI en priorite, fallback Lovable) avec un prompt specialise papeterie
4. L'IA genere une description courte (2-3 phrases) et une description longue (5-8 phrases) en exploitant les infos techniques fournisseurs
5. Met a jour directement le champ `description` de la table `products` et upsert dans `product_seo` (colonnes `description_courte` et `description_longue`)
6. Loggue dans `agent_logs` avec `agent_name = "agent-descriptions"`

### Criteres de selection des produits
- Produits actifs sans description (`description IS NULL OR description = ''`)
- Ou produits specifiques via `product_ids` en parametre
- Limite configurable (defaut : 10)

### Fichiers a creer

**`supabase/functions/agent-descriptions/index.ts`** : Edge function principale suivant le meme pattern que `agent-seo` :
- CORS headers
- Supabase service client
- Boucle sur les produits avec rate-limiting (1s entre chaque)
- Appel `callAI` depuis `_shared/ai-client.ts`
- Upsert `products.description` + `product_seo.description_courte/longue`
- Logging `agent_logs`

### Fichier a modifier

**`src/pages/AdminAutomations.tsx`** : Ajouter l'agent dans la liste `AUTOMATIONS` :
```text
{ id: "agent-descriptions", name: "Agent Descriptions", description: "Genere des descriptions enrichies a partir des donnees fournisseurs", icon: Bot, agent: "agent-descriptions", category: "ia" }
```

### Details techniques

Le prompt IA inclura :
- Nom, categorie, marque, EAN du produit
- Dimensions, poids, attributs JSON
- Indicateur eco / fin de serie
- Pour chaque fournisseur : nom, reference, notes, conditionnement
- Consigne de generer un JSON avec `description_courte`, `description_longue` et `qualite_score` (0-100)

Aucune migration de base de donnees n'est necessaire : les champs `products.description` et `product_seo.description_courte/longue` existent deja.

