

# Correction du parser de prix Liderpapel

## Probleme identifie

Le fichier Prices JSON a une structure **differente** de celle attendue par le parser :

**Structure reelle** (votre fichier) :
```text
Product.Prices = [ { Price: [ { priceType, PriceLines... } ] } ]
                   ^-- Prices est un TABLEAU
Product.VATRates.VATRate[].Value  (V majuscule)
```

**Ce que le parser attend** :
```text
Product.Prices.Price = [ { priceType, PriceLines... } ]
                ^-- Prices est un OBJET
Product.VATRates.VATRate[].value  (v minuscule)
```

Resultat : `p.Prices?.Price` retourne `undefined` car `Prices` est un tableau, pas un objet. Aucun prix n'est extrait, `costPrice` reste vide, donc les 25 281 produits sont ignores.

Meme probleme pour `VATRates` : le parser lit `vat.value` mais le JSON contient `vat.Value`.

## Correction

Modifier la fonction `parsePricesJson` dans `fetch-liderpapel-sftp/index.ts` :

1. **Prices** : Si `p.Prices` est un tableau, prendre le premier element puis acceder a `.Price`. Sinon garder le comportement actuel (`p.Prices?.Price`).

2. **VATRate.Value** : Lire `vat.Value || vat.value` pour gerer les deux casses.

### Changement concret (ligne ~164)

Avant :
```text
const prices = p.Prices?.Price || [];
```

Apres :
```text
const pricesContainer = Array.isArray(p.Prices) ? p.Prices[0] : p.Prices;
const prices = pricesContainer?.Price || [];
```

Et ligne ~210 pour la TVA :
```text
tvaRate = String(vat.Value ?? vat.value ?? vat);
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| `supabase/functions/fetch-liderpapel-sftp/index.ts` | Correction de `parsePricesJson` : gestion du tableau `Prices` et casse `Value/value` |

## Section technique

Le correctif est minimal (2 lignes) et ne change pas la logique metier. Apres deploiement, relancer l'import Prices pour verifier que les prix sont bien extraits.

