import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

function checksum(body: string): string {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 1296).toString(36).toUpperCase().padStart(2, "0");
}

function validMatchCode(value: unknown): value is string {
  if (typeof value !== "string" || !/^[0-9A-Z]{32}$/.test(value)) return false;
  return value[0] === "2" && checksum(value.slice(0, 30)) === value.slice(30);
}

function serviceCredentials(): { apiKey: string; authorization?: string } | null {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return { apiKey: legacy, authorization: "Bearer " + legacy };

  // New Supabase secret keys are JSON encoded by the platform. They are
  // server-only and must never be copied to the browser.
  try {
    const configured = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (typeof configured.default === "string" && configured.default.startsWith("sb_secret_")) {
      return { apiKey: configured.default };
    }
  } catch {
    // A missing or malformed secret is handled as an unavailable service.
  }
  return null;
}

type ArenaRow = {
  code: string;
  pid: string;
  name: string;
  score: number;
  seconds: number;
  total: number;
  at: number;
};

function sanitizeRows(input: unknown, code: string): ArenaRow[] {
  if (!Array.isArray(input)) return [];
  const byPlayer = new Map<string, ArenaRow>();
  for (const value of input) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const pid = typeof row.pid === "string" ? row.pid.trim().slice(0, 80) : "";
    const name = typeof row.name === "string"
      ? row.name.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48)
      : "Cadet";
    const score = Number(row.score);
    const seconds = Number(row.seconds);
    const total = Number(row.total);
    const at = Number(row.at);
    if (!pid || !Number.isFinite(score) || !Number.isFinite(seconds) ||
        !Number.isFinite(total) || !Number.isFinite(at) || at <= 0 ||
        total < 1 || total > 100 || seconds < 0 || seconds > 86400 ||
        score < -total || score > total) continue;
    const cleaned: ArenaRow = {
      code,
      pid,
      name: name || "Cadet",
      score,
      seconds: Math.floor(seconds),
      total: Math.floor(total),
      at: Math.floor(at)
    };
    const previous = byPlayer.get(pid);
    if (!previous || cleaned.at >= previous.at) byPlayer.set(pid, cleaned);
  }
  return [...byPlayer.values()]
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.at - b.at)
    .slice(0, 100);
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
  const code = body && typeof body === "object"
    ? (body as Record<string, unknown>).code
    : null;
  if (!validMatchCode(code)) return jsonResponse(400, { error: "Invalid match code" }, origin);

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
    const rows = sanitizeRows(await response.json(), code);
    // These historic entries were created before server-side score
    // verification. Return only public standings fields; never expose answers.
    return jsonResponse(200, { rows, verified: false, source: "historical" }, origin);
  } catch (error) {
    console.error("Arena leaderboard request failed:", error instanceof Error ? error.message : "unknown error");
    return jsonResponse(502, { error: "Unable to load leaderboard" }, origin);
  }
});
