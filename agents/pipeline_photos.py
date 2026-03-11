#!/usr/bin/env python3
"""
Pipeline photos ma-papeterie.fr
Traitement automatique : détourage → fond blanc → WebP → upload Supabase → alt text IA
"""

import os
import io
import sys
import time
import requests
import logging
from pathlib import Path
from PIL import Image
import anthropic
from supabase import create_client
from rembg import remove
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('logs/photo_pipeline.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# Config depuis .env
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']
ANTHROPIC_KEY = os.environ['ANTHROPIC_API_KEY']
STORAGE_BUCKET = 'product-images'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
claude = anthropic.Anthropic(api_key=ANTHROPIC_KEY)


def download_image(url: str) -> Image.Image | None:
    """Télécharge une image depuis une URL fournisseur"""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; ma-papeterie-bot/1.0)'}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert('RGBA')
        return img
    except Exception as e:
        log.error(f"Download failed for {url}: {e}")
        return None


def process_image(img: Image.Image) -> bytes:
    """
    Pipeline complet :
    1. Détourage fond (rembg)
    2. Fond blanc
    3. Recadrage carré 800x800
    4. Compression WebP < 80Ko
    """
    # Étape 1 : Détourage
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    removed = remove(img_bytes.getvalue())
    img_no_bg = Image.open(io.BytesIO(removed)).convert('RGBA')

    # Étape 2 : Fond blanc
    background = Image.new('RGBA', img_no_bg.size, (255, 255, 255, 255))
    background.paste(img_no_bg, mask=img_no_bg.split()[3])
    img_white = background.convert('RGB')

    # Étape 3 : Recadrage carré avec padding 5%
    w, h = img_white.size
    max_side = max(w, h)
    padding = int(max_side * 0.05)
    canvas_size = max_side + 2 * padding
    canvas = Image.new('RGB', (canvas_size, canvas_size), (255, 255, 255))
    offset_x = (canvas_size - w) // 2
    offset_y = (canvas_size - h) // 2
    canvas.paste(img_white, (offset_x, offset_y))
    final = canvas.resize((800, 800), Image.LANCZOS)

    # Étape 4 : Compression WebP < 80Ko
    quality = 85
    output = io.BytesIO()
    while quality > 30:
        output.seek(0)
        output.truncate(0)
        final.save(output, format='WEBP', quality=quality, optimize=True)
        if output.tell() < 80 * 1024:
            break
        quality -= 5

    output.seek(0)
    return output.read()


def upload_to_supabase(image_bytes: bytes, filename: str) -> str | None:
    """Upload vers Supabase Storage, retourne l'URL publique"""
    try:
        path = f"products/{filename}"
        supabase.storage.from_(STORAGE_BUCKET).upload(
            path,
            image_bytes,
            {'content-type': 'image/webp', 'x-upsert': 'true'}
        )
        url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
        return url
    except Exception as e:
        log.error(f"Upload failed for {filename}: {e}")
        return None


def generate_alt_text(product_name: str, brand: str, category: str, photo_num: int) -> str:
    """Génère un alt text SEO optimisé via Claude"""
    view_labels = {1: 'vue principale', 2: 'packaging et conditionnement', 3: "en situation d'usage"}
    view = view_labels.get(photo_num, 'vue')

    prompt = f"""Génère un alt text SEO pour une image produit e-commerce.
Produit : {product_name}
Marque : {brand}
Catégorie : {category}
Vue : {view}

Règles strictes :
- Maximum 120 caractères
- Commence par la marque si connue
- Inclus le nom produit exact
- Mentionne la vue ({view})
- Pas de majuscules inutiles
- Format : "[Marque] [Nom produit] – [vue]"
- Réponds UNIQUEMENT avec l'alt text, rien d'autre"""

    try:
        msg = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text.strip()
    except Exception as e:
        log.warning(f"Alt text generation failed: {e}")
        return f"{brand} {product_name} – {view}"


def process_product(product: dict) -> bool:
    """Traite toutes les photos d'un produit"""
    pid = product['id']
    ean = product.get('ean') or pid[:8]
    name = product.get('name', 'Produit')
    brand = product.get('brand', '')
    category = product.get('category', '')

    log.info(f"Processing: {brand} {name} (EAN: {ean})")

    updates = {'images_processed': True}
    processed_any = False

    for i in range(1, 4):
        url_key = f'image_url_{i}'
        url = product.get(url_key)

        if not url:
            continue

        img = download_image(url)
        if not img:
            continue

        processed = process_image(img)
        filename = f"{ean}-{i}.webp"
        public_url = upload_to_supabase(processed, filename)

        if not public_url:
            continue

        alt_text = generate_alt_text(name, brand, category, i)

        updates[f'processed_image_{i}'] = public_url
        updates[f'alt_text_{i}'] = alt_text
        processed_any = True

        log.info(f"  Photo {i} -> {filename} ({len(processed)//1024}Ko) | Alt: {alt_text[:60]}...")
        time.sleep(0.5)  # Rate limiting API

    if processed_any:
        supabase.table('products').update(updates).eq('id', pid).execute()

    return processed_any


def run_pipeline(batch_size: int = 50, only_unprocessed: bool = True):
    """Lance le pipeline sur tout le catalogue"""
    log.info("=== DEMARRAGE PIPELINE PHOTOS MA-PAPETERIE.FR ===")

    # Crée le dossier logs
    Path('logs').mkdir(exist_ok=True)

    # Récupère les produits à traiter
    query = supabase.table('products').select(
        'id, ean, name, brand, category, image_url_1, image_url_2, image_url_3'
    )

    if only_unprocessed:
        query = query.eq('images_processed', False)

    query = query.limit(batch_size)
    response = query.execute()
    products = response.data

    if not products:
        log.info("Aucun produit a traiter.")
        return

    log.info(f"Produits a traiter : {len(products)}")

    success = 0
    errors = 0

    for i, product in enumerate(products, 1):
        log.info(f"[{i}/{len(products)}]")
        try:
            if process_product(product):
                success += 1
            else:
                errors += 1
        except Exception as e:
            log.error(f"ERREUR produit {product.get('id')}: {e}")
            errors += 1

        time.sleep(1)  # Pause entre produits

    log.info(f"=== TERMINE : {success} succes / {errors} erreurs ===")


if __name__ == '__main__':
    batch = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    reprocess = '--reprocess' in sys.argv
    run_pipeline(batch_size=batch, only_unprocessed=not reprocess)
