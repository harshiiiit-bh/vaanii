import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { normalizeArenaMatchCode, sanitizeArenaRows } from "../_shared/arena-leaderboard.mjs";

const ALLOWED_ORIGINS = [
  "https://harshiiiit-bh.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith("-vaanii.vercel.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function serviceCredentials(): { apiKey: string; authorization?: string } | null {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return { apiKey: legacy, authorization: "Bearer " + legacy };

  try {
    const configured = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (typeof configured.default === "string" && configured.default.startsWith("sb_secret_")) {
      return { apiKey: configured.default };
    }
  } catch {
    // Missing or malformed secrets are handled as an unavailable service.
  }
  return null;
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return jsonResponse(403, { error: "Origin not allowed" }, null);
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, origin);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(415, { error: "Content-Type must be application/json" }, origin);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonResponse(400, { error: "Invalid request body" }, origin);
  }
  if (raw.length > 1024) return jsonResponse(413, { error: "Request body too large" }, origin);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, origin);
  }
  const requestedCode = body && typeof body === "object"
    ? (body as Record<string, unknown>).code
    : null;
  const code = normalizeArenaMatchCode(requestedCode);
  if (!code) return jsonResponse(400, { error: "Invalid match code" }, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const credentials = serviceCredentials();
  if (!supabaseUrl || !credentials) {
    return jsonResponse(503, { error: "Leaderboard service is not configured" }, origin);
  }

  try {
    const url = new URL("/rest/v1/arena_scores", supabaseUrl);
    url.searchParams.set("select", "code,pid,name,score,seconds,total,at");
    url.searchParams.set("code", "eq." + code);
    url.searchParams.set("order", "score.desc,seconds.asc,at.asc");
    url.searchParams.set("limit", "100");

    const headers: Record<string, string> = {
      apikey: credentials.apiKey,
      Accept: "application/json"
    };
    if (credentials.authorization) headers.Authorization = credentials.authorization;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      console.error("Arena leaderboard database read failed:", response.status);
      return jsonResponse(502, { error: "Unable to load leaderboard" }, origin);
    }
    const rows = sanitizeArenaRows(await response.json(), code);
    return jsonResponse(200, { rows, verified: false, source: "historical" }, origin);
  } catch (error) {
    console.error("Arena leaderboard request failed:", error instanceof Error ? error.message : "unknown error");
    return jsonResponse(502, { error: "Unable to load leaderboard" }, origin);
  }
});
