/**
 * Supabase Storage image transformation helper.
 *
 * Rewrites a Supabase Storage public URL to the image render endpoint,
 * which serves resized WebP images on the fly (requires Supabase image
 * transformation add-on, included in Pro plan).
 *
 * Input:  https://xxx.supabase.co/storage/v1/object/public/bucket/path.png
 * Output: https://xxx.supabase.co/storage/v1/render/image/public/bucket/path.png?width=800&quality=80&format=webp
 *
 * Non-Supabase URLs (local assets, external CDNs) are returned unchanged.
 */
const STORAGE_RE = /\/storage\/v1\/object\/public\//;

interface ImageTransformOptions {
  /** Target width in pixels (default: 800) */
  width?: number;
  /** JPEG/WebP quality 1–100 (default: 80) */
  quality?: number;
  /** Output format: "webp" | "jpeg" | "png" (default: "webp") */
  format?: string;
}

export function supabaseImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string {
  if (!url) return "";
  if (!STORAGE_RE.test(url)) return url;

  const { width = 800, quality = 80, format = "webp" } = options;
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  // Preserve any existing query params (unlikely but safe)
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&format=${format}`;
}
