// Netlify Synchronous Function: Liderpapel SFTP test & trigger
import type { Context, Config } from "@netlify/functions";
import SftpClient from "ssh2-sftp-client";

const SFTP_HOST = Netlify.env.get("LIDERPAPEL_SFTP_HOST") || "sftp.liderpapel.com";
const SFTP_PORT = parseInt(Netlify.env.get("LIDERPAPEL_SFTP_PORT") || "22", 10);
const SFTP_USER = Netlify.env.get("LIDERPAPEL_SFTP_USER") || "";
const SFTP_PASSWORD = Netlify.env.get("LIDERPAPEL_SFTP_PASSWORD") || "";
const API_CRON_SECRET = Netlify.env.get("API_CRON_SECRET") || "";
const SUPABASE_SERVICE_ROLE_KEY = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CONNECT_TIMEOUT = 30000;

const CORS: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-api-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function buildSftpConfig(): any {
  return {
    host: SFTP_HOST, port: SFTP_PORT,
    username: SFTP_USER, password: SFTP_PASSWORD,
    readyTimeout: CONNECT_TIMEOUT, retries: 0,
    hostVerifier: () => true,
    algorithms: {
      serverHostKey: ["ssh-dss","ssh-rsa","ssh-ed25519","ecdsa-sha2-nistp256","ecdsa-sha2-nistp384","ecdsa-sha2-nistp521","rsa-sha2-512","rsa-sha2-256"],
    },
  };
}

function checkAuth(req: Request): boolean {
  const apiSecret = req.headers.get("x-api-secret");
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.replace("Bearer ", "");
  return (!!API_CRON_SECRET && apiSecret === API_CRON_SECRET) || (!!SUPABASE_SERVICE_ROLE_KEY && bearerToken === SUPABASE_SERVICE_ROLE_KEY);
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!checkAuth(req)) return new Response(JSON.stringify({ error: "Non autorise" }), { status: 401, headers: CORS });
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (body.testConnection) {
    if (!SFTP_USER || !SFTP_PASSWORD) return new Response(JSON.stringify({ status: "error", error: "SFTP credentials missing", runtime: "netlify-node" }), { headers: CORS });
    const sftp = new SftpClient();
    const t0 = Date.now();
    try {
      await Promise.race([sftp.connect(buildSftpConfig()), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("connect timeout")), CONNECT_TIMEOUT))]);
      const files = await Promise.race([sftp.list("/download"), new Promise<never>((_, rej) => setTimeout(() => rej(new Error("list timeout")), 15000))]);
      await sftp.end().catch(() => {});
      const jsonFiles = files.filter((f: any) => f.name.endsWith(".json")).map((f: any) => ({ name: f.name, size_mb: (f.size / 1048576).toFixed(1) }));
      return new Response(JSON.stringify({ status: "ok", runtime: "netlify-node", connect_ms: Date.now() - t0, json_files_found: jsonFiles.length, json_files: jsonFiles }), { headers: CORS });
    } catch (err: any) {
      await sftp.end().catch(() => {});
      return new Response(JSON.stringify({ status: "error", runtime: "netlify-node", connect_ms: Date.now() - t0, error: err.message }), { headers: CORS });
    }
  }
  const bgUrl = new URL(req.url).origin + "/.netlify/functions/sync-liderpapel-sftp-background";
  try {
    const bgResp = await fetch(bgUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-api-secret": API_CRON_SECRET || "", Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY }, body: JSON.stringify(body) });
    return new Response(JSON.stringify({ status: "accepted", runtime: "netlify-node", background_status: bgResp.status, message: "Sync demarree en arriere-plan.", mode: body.singleFile ? "singleFile" : body.includeEnrichment ? "full" : "daily" }), { status: 202, headers: CORS });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", error: "Failed to trigger background: " + err.message }), { status: 500, headers: CORS });
  }
};

export const config: Config = { path: "/api/sync-liderpapel" };
