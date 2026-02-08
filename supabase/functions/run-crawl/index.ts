import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        // Remove fragment
        full.hash = "";
        links.add(full.href);
      }
    } catch {
      // skip
    }
  }

  // Also check for direct image links in <a href>
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
    // Sanitize: keep only alphanumeric, dots, dashes, underscores
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
  } catch {
    return "image";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

        // Fetch page
        let html = "";
        let httpStatus = 0;
        try {
          const headers: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          };
          if (job.source === "ALKOR_B2B" && sessionCookie) {
            headers["Cookie"] = sessionCookie;
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);

          const resp = await fetch(pageUrl, { headers, signal: controller.signal, redirect: "follow" });
          clearTimeout(timeout);

          httpStatus = resp.status;
          const contentType = resp.headers.get("content-type") || "";

          if (contentType.includes("text/html")) {
            html = await resp.text();
          } else if (IMAGE_CONTENT_TYPES.has(contentType.split(";")[0].trim())) {
            // Direct image link - treat as image
            // We'll handle this below
          }
        } catch (err) {
          console.error(`Error fetching ${pageUrl}:`, err.message);
          // Record the page as visited even on error
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
        imagesFound += pageImageUrls.filter((u) => !collectedUrls.has(u)).length;

        // Download images
        for (const imgUrl of pageImageUrls) {
          if (imagesUploaded >= job.max_images) break;
          if (collectedUrls.has(imgUrl)) continue;
          collectedUrls.add(imgUrl);

          // Validate image host - allow same host + common CDN patterns
          try {
            const imgParsed = new URL(imgUrl);
            // Allow images from the same domain or subdomains
            if (!imgParsed.hostname.endsWith(allowedHost) && imgParsed.hostname !== allowedHost) {
              // For MRS, also allow images from their CDN patterns
              if (job.source === "MRS_PUBLIC" && !imgParsed.hostname.includes("ma-rentree-scolaire")) {
                continue;
              }
              if (job.source === "ALKOR_B2B" && !imgParsed.hostname.includes("alkorshop") && !imgParsed.hostname.includes("alkor")) {
                continue;
              }
            }
          } catch {
            continue;
          }

          try {
            const imgHeaders: Record<string, string> = {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            };
            if (job.source === "ALKOR_B2B" && sessionCookie) {
              imgHeaders["Cookie"] = sessionCookie;
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);

            const imgResp = await fetch(imgUrl, {
              headers: imgHeaders,
              signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!imgResp.ok) {
              // Record as found but not uploaded
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

        // Update progress every 10 pages
        if (pagesSinceUpdate >= 10) {
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

      // Final update
      await supabase.from("crawl_jobs").update({
        status: "done",
        pages_visited: pagesVisited,
        images_found: imagesFound,
        images_uploaded: imagesUploaded,
      }).eq("id", jobId);

      console.log(
        `Crawl ${jobId} done: ${pagesVisited} pages, ${imagesFound} images found, ${imagesUploaded} uploaded`
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
