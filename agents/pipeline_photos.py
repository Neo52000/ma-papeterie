#!/usr/bin/env python3
"""
Pipeline photos — ma-papeterie.fr
Téléchargement → détourage rembg → fond blanc → WebP 800×800 < 80Ko
→ Supabase Storage → alt text Claude Haiku → mise à jour base

Adapté au schéma existant : utilise la table product_images
(url_originale → url_optimisee, alt_seo)
"""
import os
import io
import sys
import time
import requests
import logging
from pathlib import Path

from PIL import Image
from rembg import remove

Path('logs').mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler('logs/photos.log'), logging.StreamHandler()]
)
log = logging.getLogger(__name__)

# Validation env vars
REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY']
missing = [v for v in REQUIRED_VARS if not os.environ.get(v)]
if missing:
    log.error(f"Variables d'environnement manquantes : {', '.join(missing)}")
    log.error("Ajoutez-les dans .env :")
    for v in missing:
        log.error(f"  {v}=votre-valeur")
    sys.exit(1)

import anthropic
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
claude = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])

BUCKET = 'product-images'

# Créer le bucket si inexistant
try:
    supabase.storage.create_bucket(BUCKET, options={'public': True})
except Exception:
    pass


def download_image(url: str):
    """Télécharge une image depuis une URL."""
    try:
        r = requests.get(url, headers={'User-Agent': 'ma-papeterie-bot/1.0'}, timeout=20)
        r.raise_for_status()
        return Image.open(io.BytesIO(r.content)).convert('RGBA')
    except Exception as e:
        log.warning(f"Téléchargement échoué ({url}): {e}")
        return None


def process_image(img: Image.Image) -> bytes:
    """Détourage rembg → fond blanc → WebP 800×800 < 80Ko."""
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    removed = remove(buf.getvalue())
    img_rb = Image.open(io.BytesIO(removed)).convert('RGBA')

    # Fond blanc
    bg = Image.new('RGBA', img_rb.size, (255, 255, 255, 255))
    bg.paste(img_rb, mask=img_rb.split()[3])
    img_white = bg.convert('RGB')

    # Padding + centrage sur canevas carré
    w, h = img_white.size
    mx = max(w, h)
    pad = int(mx * 0.05)
    sz = mx + 2 * pad
    canvas = Image.new('RGB', (sz, sz), (255, 255, 255))
    canvas.paste(img_white, ((sz - w) // 2, (sz - h) // 2))

    # Redimensionner à 800×800
    final = canvas.resize((800, 800), Image.LANCZOS)

    # Compression WebP < 80Ko
    quality = 85
    out = io.BytesIO()
    while quality > 30:
        out.seek(0)
        out.truncate(0)
        final.save(out, format='WEBP', quality=quality, optimize=True)
        if out.tell() < 80 * 1024:
            break
        quality -= 5
    out.seek(0)
    return out.read()


def upload_to_storage(data: bytes, filename: str) -> str | None:
    """Upload vers Supabase Storage et retourne l'URL publique."""
    try:
        path = f"products/{filename}"
        supabase.storage.from_(BUCKET).upload(
            path, data,
            {'content-type': 'image/webp', 'upsert': 'true'}
        )
        return supabase.storage.from_(BUCKET).get_public_url(path)
    except Exception as e:
        log.error(f"Upload échoué ({filename}): {e}")
        return None


def generate_alt_text(name: str, brand: str, category: str,
                      display_order: int, is_principal: bool) -> str:
    """Génère un alt text SEO via Claude Haiku."""
    if is_principal:
        vue = 'vue principale fond blanc'
    elif display_order == 2:
        vue = 'packaging et conditionnement'
    else:
        vue = "en situation d'usage"

    try:
        r = claude.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=120,
            messages=[{"role": "user", "content":
                       f"Alt text SEO image produit e-commerce français.\n"
                       f"Produit:{name} Marque:{brand} Catégorie:{category} Vue:{vue}\n"
                       f"Max 120 chars. Format:[Marque] [Produit] – [vue]. "
                       f"Réponds UNIQUEMENT avec l'alt text."}]
        )
        return r.content[0].text.strip()
    except Exception:
        return f"{brand} {name} – {vue}"


def process_product_images(product_id: str, images: list) -> bool:
    """Traite toutes les images d'un produit."""
    ok = False
    for img_row in images:
        url = img_row.get('url_originale')
        if not url:
            continue

        img = download_image(url)
        if not img:
            continue

        data = process_image(img)
        img_id = img_row['id'][:8]
        fn = f"{img_id}.webp"
        pub_url = upload_to_storage(data, fn)
        if not pub_url:
            continue

        # Récupérer les infos produit pour l'alt text
        product = supabase.table('products').select(
            'name,brand,category'
        ).eq('id', product_id).single().execute().data

        alt = generate_alt_text(
            product.get('name', ''),
            product.get('brand', ''),
            product.get('category', ''),
            img_row.get('display_order', 1),
            img_row.get('is_principal', False)
        )

        # Mise à jour product_images
        supabase.table('product_images').update({
            'url_optimisee': pub_url,
            'alt_seo': alt
        }).eq('id', img_row['id']).execute()

        log.info(f"  ✅ Image {img_row['id'][:8]} → {fn} ({len(data) // 1024}Ko)")
        ok = True
        time.sleep(0.3)

    if ok:
        supabase.table('products').update(
            {'images_processed': True}
        ).eq('id', product_id).execute()

    return ok


def run(batch: int = 50, reprocess: bool = False):
    log.info("=== PIPELINE PHOTOS ===")

    # Récupérer les images non traitées, groupées par produit
    query = supabase.table('product_images').select(
        'id,product_id,url_originale,url_optimisee,display_order,is_principal'
    )
    if not reprocess:
        query = query.is_('url_optimisee', 'null')
    images = query.limit(batch * 3).execute().data

    if not images:
        log.info("Aucune image à traiter.")
        return

    # Grouper par product_id
    products_map: dict[str, list] = {}
    for img in images:
        pid = img['product_id']
        if pid not in products_map:
            products_map[pid] = []
        products_map[pid].append(img)

    # Limiter au batch demandé
    product_ids = list(products_map.keys())[:batch]

    log.info(f"{len(product_ids)} produits à traiter ({len(images)} images)")
    ok = err = 0

    for i, pid in enumerate(product_ids, 1):
        imgs = products_map[pid]
        product = supabase.table('products').select('brand,name').eq('id', pid).single().execute().data
        label = f"{product.get('brand', '')} {product.get('name', '')[:40]}"
        log.info(f"[{i}/{len(product_ids)}] {label}")
        try:
            if process_product_images(pid, imgs):
                ok += 1
            else:
                err += 1
        except Exception as e:
            log.error(f"ERREUR: {e}")
            err += 1
        time.sleep(1)

    log.info(f"=== FIN : {ok} OK / {err} erreurs ===")


if __name__ == '__main__':
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    reprocess = '--reprocess' in sys.argv
    run(batch_size, reprocess)

# COMMANDES :
# python agents/pipeline_photos.py 50
# python agents/pipeline_photos.py 500
# python agents/pipeline_photos.py 1000 --reprocess
