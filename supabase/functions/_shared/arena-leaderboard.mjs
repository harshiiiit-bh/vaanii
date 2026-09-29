export function arenaCodeChecksum(body) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash % 1296).toString(36).toUpperCase().padStart(2, "0");
}

export function normalizeArenaMatchCode(value) {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  if (!/^[0-9A-Z]{32}$/.test(code) || code[0] !== "2") return null;
  return arenaCodeChecksum(code.slice(0, 30)) === code.slice(30) ? code : null;
}

export function sanitizeArenaRows(input, code) {
  if (!Array.isArray(input)) return [];
  const byPlayer = new Map();
  for (const value of input) {
    if (!value || typeof value !== "object") continue;
    const row = value;
    if (row.code !== code) continue;
    const pid = typeof row.pid === "string" ? row.pid.trim().slice(0, 80) : "";
    const name = typeof row.name === "string"
      ? row.name.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 48)
      : "Cadet";
    const score = Number(row.score);
    const seconds = Number(row.seconds);
    const total = Number(row.total);
    const at = Number(row.at);
    if (!pid || !Number.isFinite(score) || !Number.isInteger(seconds) ||
        !Number.isInteger(total) || !Number.isInteger(at) || !Number.isFinite(at) ||
        at <= 0 || total < 1 || total > 100 || seconds < 0 || seconds > 86400 ||
        score < -total || score > total) continue;
    const cleaned = {
      code,
      pid,
      name: name || "Cadet",
      score,
      seconds,
      total,
      at
    };
    const previous = byPlayer.get(pid);
    if (!previous || cleaned.at >= previous.at) byPlayer.set(pid, cleaned);
  }
  return [...byPlayer.values()]
    .sort((a, b) => b.score - a.score || a.seconds - b.seconds || a.at - b.at)
    .slice(0, 100);
}
