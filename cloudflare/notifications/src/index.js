const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60",
  "access-control-allow-origin": "*"
};

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

async function upsert(db, item, now) {
  const id = String(item.id || crypto.randomUUID());
  const old = await db.prepare("SELECT first_seen FROM notifications WHERE id = ?").bind(id).first();
  await db.prepare("INSERT INTO notifications (id,title,organization,category,type,status,notification_date,application_start_date,last_date,exam_date,url,source_url,source_name,official,summary,first_seen,last_seen,archived_at,archive_reason,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,organization=excluded.organization,category=excluded.category,type=excluded.type,status=excluded.status,notification_date=excluded.notification_date,application_start_date=excluded.application_start_date,last_date=excluded.last_date,exam_date=excluded.exam_date,url=excluded.url,source_url=excluded.source_url,source_name=excluded.source_name,official=excluded.official,summary=excluded.summary,last_seen=excluded.last_seen,archived_at=excluded.archived_at,archive_reason=excluded.archive_reason,updated_at=excluded.updated_at")
  .bind(id,item.title||"Defence notification",item.organization||"Official source",item.category||"DEFENCE",item.type||"update",item.status||"upcoming",item.notificationDate||null,item.applicationStartDate||null,item.lastDate||null,item.examDate||null,item.url||item.sourceUrl||"",item.sourceUrl||item.url||null,item.sourceName||item.organization||null,item.official===false?0:1,item.summary||null,old?.first_seen||item.firstSeen||now,item.lastSeen||now,item.archivedAt||null,item.archiveReason||null,now).run();
  return id;
}

async function syncPayload(request, env) {
  const expected = env.SYNC_SECRET;
  if (!expected) return json({error:"SYNC_SECRET is not configured"},503);
  if ((request.headers.get("authorization")||"") !== `Bearer ${expected}`) return json({error:"Unauthorized"},401);
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const now = new Date().toISOString();
  for (const item of items) await upsert(env.DB,item,now);
  for (const id of (body.archiveIds||[])) await env.DB.prepare("UPDATE notifications SET archived_at=COALESCE(archived_at,?), archive_reason=COALESCE(archive_reason,'exam-date-passed'), status='archived', updated_at=? WHERE id=?").bind(now,now,String(id)).run();
  return json({ok:true,synced:items.length,archived:(body.archiveIds||[]).length});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type,Authorization"}});
    try {
      if (request.method === "GET" && url.pathname === "/api/notifications") return json({version:2,source:"VAANI Defence Notification Engine",generatedAt:new Date().toISOString(),items:await list(env.DB,false)});
      if (request.method === "GET" && url.pathname === "/api/notifications/archive") return json({version:2,source:"VAANI Defence Notification Archive",generatedAt:new Date().toISOString(),items:await list(env.DB,true)});
      if (request.method === "POST" && url.pathname === "/api/notifications/sync") return await syncPayload(request,env);
      if (request.method === "GET" && url.pathname === "/health") { await env.DB.prepare("SELECT 1").first(); return json({ok:true,service:"vaani-notifications-api"}); }
      return json({error:"Not found"},404);
    } catch(error) { console.error(error); return json({error:"Internal server error"},500); }
  }
};