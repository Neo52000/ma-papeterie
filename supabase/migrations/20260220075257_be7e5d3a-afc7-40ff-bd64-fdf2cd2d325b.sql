
-- 1. Fusionner supplier_products : Liderpapel → Comlandi (CS Group)
UPDATE public.supplier_products
SET supplier_id = '450c421b-c5d4-4357-997d-e0b7931b5de8'
WHERE supplier_id = 'ad988aee-7256-4e8f-a92f-5eb4e816af0c';

-- Supprimer les doublons créés par la fusion (même supplier_id + product_id)
DELETE FROM public.supplier_products a
USING public.supplier_products b
WHERE a.supplier_id = b.supplier_id
  AND a.product_id = b.product_id
  AND a.ctid < b.ctid;

-- 2. Renommer Comlandi → CS Group (Comlandi / Liderpapel)
UPDATE public.suppliers
SET name = 'CS Group (Comlandi / Liderpapel)',
    country = 'ES',
    is_active = true
WHERE id = '450c421b-c5d4-4357-997d-e0b7931b5de8';

-- 3. Désactiver l'entrée Liderpapel (ne pas supprimer pour les FK)
UPDATE public.suppliers
SET is_active = false,
    name = 'Liderpapel [fusionné → CS Group]'
WHERE id = 'ad988aee-7256-4e8f-a92f-5eb4e816af0c';
