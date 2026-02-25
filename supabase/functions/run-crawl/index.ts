import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { getCorsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const ALLOWED_HOSTS: Record<string, string> = {
  MRS_PUBLIC: "img1.ma-rentree-scolaire.fr",
  ALKOR_B2B: "b2b.alkorshop.com",
};

const IMAGE_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".bmp", ".ico",
]);

const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "image/avif", "image/bmp", "image/x-icon",
]);

// Browser-like headers to avoid 403 blocks
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return Array.from(IMAGE_EXTENSIONS).some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function extractImageUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();

  // <img src="...">
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // <img srcset="..."> and <source srcset="...">
  const srcsetRegex = /<(?:img|source)[^>]+srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    srcset.split(",").forEach((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (parts[0]) urls.add(parts[0]);
    });
  }

  // CSS url(...)
  const cssUrlRegex = /url\(['"]?([^'")]+\.(?:jpg|jpeg|png|gif|webp|svg|avif))['"]?\)/gi;
  while ((match = cssUrlRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // data-src and data-lazy-src (common lazy-load patterns)
  const dataSrcRegex = /<[^>]+data-(?:src|lazy-src|original)=["']([^"']+)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // Resolve relative URLs
  const resolved = new Set<string>();
  for (const u of urls) {
    try {
      const full = new URL(u, baseUrl).href;
      resolved.add(full);
    } catch {
      // skip invalid URLs
    }
  }

  return Array.from(resolved);
}

function extractLinks(html: string, baseUrl: string, allowedHost: string): string[] {
  const links = new Set<string>();
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const full = new URL(match[1], baseUrl);
      if (full.hostname === allowedHost && (full.protocol === "http:" || full.protocol === "https:")) {
        full.hash = "";
        links.add(full.href);
      }
    } catch {
      // skip
    }
  }

  return Array.from(links);
}

async function sha256Hash(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    const filename = parts[parts.length - 1] || "image";
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
  } catch {
    return "image";
  }
}

function isAllowedImageHost(imgUrl: string, allowedHost: string, source: string): boolean {
  try {
    const imgParsed = new URL(imgUrl);
    // Allow images from the same domain or subdomains
    if (imgParsed.hostname === allowedHost || imgParsed.hostname.endsWith(`.${allowedHost}`)) {
      return true;
    }
    // Source-specific CDN patterns
    if (source === "MRS_PUBLIC" && imgParsed.hostname.includes("ma-rentree-scolaire")) {
      return true;
    }
    if (source === "ALKOR_B2B" && (imgParsed.hostname.includes("alkorshop") || imgParsed.hostname.includes("alkor"))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries = 2,
  timeoutMs = 15000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      return resp;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

Deno.serve(async (req) => {
  const preFlightResponse = handleCorsPreFlight(req);
  if (preFlightResponse) return preFlightResponse;
  const corsHeaders = getCorsHeaders(req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let jobId: string;
  try {
    const body = await req.json();
    jobId = body.job_id;
  } catch {
    return new Response(
      JSON.stringify({ error: "job_id requis" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Load job
  const { data: job, error: jobError } = await supabase
    .from("crawl_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return new Response(
      JSON.stringify({ error: "Job non trouvé" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const allowedHost = ALLOWED_HOSTS[job.source];
  if (!allowedHost) {
    await supabase.from("crawl_jobs").update({ status: "error", last_error: "Source invalide" }).eq("id", jobId);
    return new Response(JSON.stringify({ error: "Source invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get cookie for ALKOR_B2B
  let sessionCookie = "";
  if (job.source === "ALKOR_B2B") {
    const { data: secretData } = await supabase
      .from("admin_secrets")
      .select("value")
      .eq("key", "ALKOR_SESSION_COOKIE")
      .single();

    if (secretData?.value) {
      sessionCookie = secretData.value;
    } else {
      await supabase.from("crawl_jobs").update({
        status: "error",
        last_error: "Cookie de session Alkor non configuré. Veuillez le configurer d'abord.",
      }).eq("id", jobId);
      return new Response(
        JSON.stringify({ error: "Cookie Alkor non configuré" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Update job to running
  await supabase.from("crawl_jobs").update({ status: "running" }).eq("id", jobId);

  // Return immediately, process in background
  const response = new Response(
    JSON.stringify({ status: "running", job_id: jobId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

  // BFS Crawl (runs after response is sent)
  (async () => {
    try {
      // Load already-visited pages (for resume)
      const { data: existingPages } = await supabase
        .from("crawl_pages")
        .select("page_url")
        .eq("job_id", jobId);

      const visited = new Set<string>((existingPages || []).map((p: any) => p.page_url));

      // Load already-collected image source URLs
      const { data: existingImages } = await supabase
        .from("crawl_images")
        .select("source_url, sha256")
        .eq("job_id", jobId);

      const collectedUrls = new Set<string>((existingImages || []).map((i: any) => i.source_url));
      const collectedHashes = new Set<string>(
        (existingImages || []).filter((i: any) => i.sha256).map((i: any) => i.sha256)
      );

      let pagesVisited = visited.size;
      let imagesFound = collectedUrls.size;
      let imagesUploaded = (existingImages || []).filter((i: any) => i.storage_path).length;
      let errorPages = 0;

      // BFS queue
      const queue: string[] = [];
      for (const url of job.start_urls) {
        if (!visited.has(url)) {
          queue.push(url);
        }
      }

      let pagesSinceUpdate = 0;

      while (queue.length > 0 && pagesVisited < job.max_pages && imagesUploaded < job.max_images) {
        const pageUrl = queue.shift()!;

        if (visited.has(pageUrl)) continue;
        visited.add(pageUrl);

        // Validate host
        try {
          const parsed = new URL(pageUrl);
          if (parsed.hostname !== allowedHost) continue;
        } catch {
          continue;
        }

        // Build request headers
        const fetchHeaders: Record<string, string> = { ...BROWSER_HEADERS };
        // Set Referer to simulate navigation from the same site
        fetchHeaders["Referer"] = `https://${allowedHost}/`;
        fetchHeaders["Origin"] = `https://${allowedHost}`;

        if (job.source === "ALKOR_B2B" && sessionCookie) {
          fetchHeaders["Cookie"] = sessionCookie;
        }

        // Fetch page with retry
        let html = "";
        let httpStatus = 0;
        try {
          const resp = await fetchWithRetry(pageUrl, fetchHeaders);
          httpStatus = resp.status;
          const contentType = resp.headers.get("content-type") || "";

          if (httpStatus >= 400) {
            console.warn(`Page ${pageUrl} returned HTTP ${httpStatus}`);
          }

          if (contentType.includes("text/html")) {
            html = await resp.text();
          } else if (IMAGE_CONTENT_TYPES.has(contentType.split(";")[0].trim())) {
            // Direct image link - treat as image, will be handled below
          } else {
            // Consume the body to free the connection
            await resp.text();
          }
        } catch (err) {
          console.error(`Error fetching ${pageUrl}:`, err.message);
          errorPages++;
          await supabase.from("crawl_pages").upsert(
            { job_id: jobId, page_url: pageUrl, http_status: 0, links_found: 0, images_on_page: 0 },
            { onConflict: "job_id,page_url" }
          );
          pagesVisited++;
          continue;
        }

        // Extract images and links
        let pageImageUrls: string[] = [];
        let pageLinks: string[] = [];

        if (html) {
          pageImageUrls = extractImageUrls(html, pageUrl);
          pageLinks = extractLinks(html, pageUrl, allowedHost);

          // Also check if any links are direct image links
          for (const link of pageLinks) {
            if (isImageUrl(link)) {
              pageImageUrls.push(link);
            }
          }
        }

        // If the page itself is an image URL
        if (isImageUrl(pageUrl)) {
          pageImageUrls.push(pageUrl);
        }

        // Record page
        await supabase.from("crawl_pages").upsert(
          {
            job_id: jobId,
            page_url: pageUrl,
            http_status: httpStatus,
            links_found: pageLinks.length,
            images_on_page: pageImageUrls.length,
          },
          { onConflict: "job_id,page_url" }
        );

        pagesVisited++;

        // Count new images found
        const newImages = pageImageUrls.filter((u) => !collectedUrls.has(u));
        imagesFound += newImages.length;

        // Download images
        for (const imgUrl of pageImageUrls) {
          if (imagesUploaded >= job.max_images) break;
          if (collectedUrls.has(imgUrl)) continue;
          collectedUrls.add(imgUrl);

          // Validate image host
          if (!isAllowedImageHost(imgUrl, allowedHost, job.source)) {
            continue;
          }

          try {
            const imgHeaders: Record<string, string> = {
              "User-Agent": BROWSER_HEADERS["User-Agent"],
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
              "Accept-Language": "fr-FR,fr;q=0.9",
              "Referer": pageUrl,
            };
            if (job.source === "ALKOR_B2B" && sessionCookie) {
              imgHeaders["Cookie"] = sessionCookie;
            }

            const imgResp = await fetchWithRetry(imgUrl, imgHeaders, 1, 15000);

            if (!imgResp.ok) {
              await supabase.from("crawl_images").upsert(
                { job_id: jobId, page_url: pageUrl, source_url: imgUrl },
                { onConflict: "job_id,source_url" }
              );
              continue;
            }

            const contentType = imgResp.headers.get("content-type") || "application/octet-stream";
            const ctClean = contentType.split(";")[0].trim();

            // Verify it's actually an image
            if (!IMAGE_CONTENT_TYPES.has(ctClean) && !isImageUrl(imgUrl)) {
              continue;
            }

            const imgData = new Uint8Array(await imgResp.arrayBuffer());

            // Skip very small images (likely tracking pixels)
            if (imgData.length < 100) continue;

            const hash = await sha256Hash(imgData);

            // Deduplicate by hash
            if (collectedHashes.has(hash)) {
              await supabase.from("crawl_images").upsert(
                {
                  job_id: jobId,
                  page_url: pageUrl,
                  source_url: imgUrl,
                  sha256: hash,
                  bytes: imgData.length,
                  content_type: ctClean,
                },
                { onConflict: "job_id,source_url" }
              );
              continue;
            }
            collectedHashes.add(hash);

            const filename = getFilenameFromUrl(imgUrl);
            const storagePath = `${jobId}/${hash}_${filename}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from("image-crawls")
              .upload(storagePath, imgData, {
                contentType: ctClean,
                upsert: true,
              });

            if (uploadError) {
              console.error(`Upload error for ${imgUrl}:`, uploadError.message);
              await supabase.from("crawl_images").upsert(
                {
                  job_id: jobId,
                  page_url: pageUrl,
                  source_url: imgUrl,
                  sha256: hash,
                  bytes: imgData.length,
                  content_type: ctClean,
                },
                { onConflict: "job_id,source_url" }
              );
              continue;
            }

            // Save image record
            await supabase.from("crawl_images").upsert(
              {
                job_id: jobId,
                page_url: pageUrl,
                source_url: imgUrl,
                storage_path: storagePath,
                content_type: ctClean,
                sha256: hash,
                bytes: imgData.length,
              },
              { onConflict: "job_id,source_url" }
            );

            imagesUploaded++;
          } catch (err) {
            console.error(`Error downloading image ${imgUrl}:`, err.message);
          }
        }

        // Add links to queue
        for (const link of pageLinks) {
          if (!visited.has(link) && !isImageUrl(link)) {
            queue.push(link);
          }
        }

        pagesSinceUpdate++;

        // Update progress every 5 pages
        if (pagesSinceUpdate >= 5) {
          await supabase.from("crawl_jobs").update({
            pages_visited: pagesVisited,
            images_found: imagesFound,
            images_uploaded: imagesUploaded,
          }).eq("id", jobId);
          pagesSinceUpdate = 0;
        }

        // Rate limiting
        if (job.delay_ms > 0) {
          await new Promise((resolve) => setTimeout(resolve, job.delay_ms));
        }
      }

      // Build status message
      let finalStatus = "done";
      let lastError: string | null = null;

      if (errorPages > 0 && errorPages === pagesVisited) {
        finalStatus = "error";
        lastError = `Toutes les ${errorPages} pages ont échoué (network errors)`;
      } else if (pagesVisited > 0 && imagesFound === 0) {
        // Check if pages returned error HTTP statuses
        const { data: failedPages } = await supabase
          .from("crawl_pages")
          .select("http_status")
          .eq("job_id", jobId)
          .gte("http_status", 400);

        if (failedPages && failedPages.length === pagesVisited) {
          lastError = `Toutes les pages ont retourné des erreurs HTTP (${failedPages.map((p: any) => p.http_status).join(", ")}). Le site bloque peut-être les requêtes du serveur.`;
        }
      }

      // Final update
      await supabase.from("crawl_jobs").update({
        status: finalStatus,
        pages_visited: pagesVisited,
        images_found: imagesFound,
        images_uploaded: imagesUploaded,
        last_error: lastError,
      }).eq("id", jobId);

      console.log(
        `Crawl ${jobId} ${finalStatus}: ${pagesVisited} pages, ${imagesFound} images found, ${imagesUploaded} uploaded, ${errorPages} errors`
      );
    } catch (err) {
      console.error(`Crawl ${jobId} fatal error:`, err);
      await supabase.from("crawl_jobs").update({
        status: "error",
        last_error: err.message || "Erreur fatale",
      }).eq("id", jobId);
    }
  })();

  return response;
});
