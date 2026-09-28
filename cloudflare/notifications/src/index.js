const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60",
  "access-control-allow-origin": "*"
};

const SYNC_CHUNK_LIMIT = 20;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extra } });
}

function rowToNotification(row) {
  return {
    id: row.id, title: row.title, organization: row.organization, category: row.category,
    type: row.type, status: row.status, notificationDate: row.notification_date,
    applicationStartDate: row.application_start_date, lastDate: row.last_date,
    examDate: row.exam_date, url: row.url, sourceUrl: row.source_url, sourceName: row.source_name,
    official: Boolean(row.official), summary: row.summary, firstSeen: row.first_seen,
    lastSeen: row.last_seen, archivedAt: row.archived_at, archiveReason: row.archive_reason,
    updatedAt: row.updated_at
  };
}

async function list(db, archived) {
  const sql = archived
    ? "SELECT * FROM notifications WHERE archived_at IS NOT NULL ORDER BY COALESCE(exam_date,last_date,archived_at) DESC LIMIT 500"
    : "SELECT * FROM notifications WHERE archived_at IS NULL ORDER BY CASE status WHEN 'closing-soon' THEN 1 WHEN 'open' THEN 2 WHEN 'upcoming' THEN 3 WHEN 'admit-card' THEN 4 WHEN 'result' THEN 5 ELSE 6 END, COALESCE(exam_date,last_date,notification_date) ASC LIMIT 500";
  const result = await db.prepare(sql).all();
  return result.results.map(rowToNotification);
}

function upsertStatement(db, item, now) {
  const id = String(item.id || crypto.randomUUID());
  const title = String(item.title || "Government notification").slice(0, 500);
  const organization = String(item.organization || "Official source").slice(0, 180);
  const category = String(item.category || "OTHER").slice(0, 80);
  const type = String(item.type || "update").slice(0, 100);
  const status = String(item.status || "upcoming").slice(0, 80);
  const url = String(item.url || item.sourceUrl || "");
  const sourceUrl = item.sourceUrl ? String(item.sourceUrl) : (url || null);
  const sourceName = item.sourceName ? String(item.sourceName).slice(0, 180) : organization;
  const official = item.official === false ? 0 : 1;
  return db.prepare(
    "INSERT INTO notifications (id,title,organization,category,type,status,notification_date,application_start_date,last_date,exam_date,url,source_url,source_name,official,summary,first_seen,last_seen,archived_at,archive_reason,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) " +
    "ON CONFLICT(id) DO UPDATE SET title=excluded.title,organization=excluded.organization,category=excluded.category,type=excluded.type,status=excluded.status,notification_date=excluded.notification_date,application_start_date=excluded.application_start_date,last_date=excluded.last_date,exam_date=excluded.exam_date,url=excluded.url,source_url=excluded.source_url,source_name=excluded.source_name,official=excluded.official,summary=excluded.summary,last_seen=excluded.last_seen,archived_at=excluded.archived_at,archive_reason=excluded.archive_reason,updated_at=excluded.updated_at"
  ).bind(
    id, title, organization, category, type, status,
    item.notificationDate || null, item.applicationStartDate || null, item.lastDate || null, item.examDate || null,
    url, sourceUrl, sourceName, official, item.summary ? String(item.summary).slice(0, 4000) : null,
    item.firstSeen || now, item.lastSeen || now, item.archivedAt || null, item.archiveReason || null, now
  );
}

async function syncPayload(request, env) {
  const expected = env.SYNC_SECRET;
  if (!expected) return json({ error: "SYNC_SECRET is not configured" }, 503);
  if ((request.headers.get("authorization") || "") !== "Bearer " + expected) return json({ error: "Unauthorized" }, 401);

  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const archiveIds = Array.isArray(body.archiveIds) ? body.archiveIds : [];
  if (items.length > SYNC_CHUNK_LIMIT || archiveIds.length > SYNC_CHUNK_LIMIT) {
    return json({ error: "Sync accepts at most " + SYNC_CHUNK_LIMIT + " items and archive IDs per request. Split the payload into smaller chunks." }, 413);
  }

  const now = new Date().toISOString();
  const statements = items.map(item => upsertStatement(env.DB, item || {}, now));
  for (const id of archiveIds) {
    statements.push(
      env.DB.prepare("UPDATE notifications SET archived_at=COALESCE(archived_at,?), archive_reason=COALESCE(archive_reason,'exam-date-passed'), status='archived', updated_at=? WHERE id=?")
        .bind(now, now, String(id))
    );
  }
  if (!statements.length) return json({ ok: true, synced: 0, archived: 0 });

  await env.DB.batch(statements);
  return json({ ok: true, synced: items.length, archived: archiveIds.length, chunkLimit: SYNC_CHUNK_LIMIT });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Content-Type,Authorization" } });
    try {
      if (request.method === "GET" && url.pathname === "/api/notifications") return json({ version: 2, source: "VAANI Government & Defence Notification Engine", generatedAt: new Date().toISOString(), items: await list(env.DB, false) });
      if (request.method === "GET" && url.pathname === "/api/notifications/archive") return json({ version: 2, source: "VAANI Government & Defence Notification Archive", generatedAt: new Date().toISOString(), items: await list(env.DB, true) });
      if (request.method === "POST" && url.pathname === "/api/notifications/sync") return await syncPayload(request, env);
      if (request.method === "GET" && url.pathname === "/health") { await env.DB.prepare("SELECT 1").first(); return json({ ok: true, service: "vaani-notifications-api" }); }
      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Vaani notification API error:", error);
      return json({ error: "Internal server error" }, 500);
    }
  }
};
