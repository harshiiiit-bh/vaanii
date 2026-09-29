import assert from "node:assert/strict";
import { arenaCodeChecksum, normalizeArenaMatchCode, sanitizeArenaRows } from "../supabase/functions/_shared/arena-leaderboard.mjs";

const body = ["2", "0", "01", "001", "01", "000000", "0000000", "00", "000", "00", "0"].join("");
assert.equal(body.length, 30, "Synthetic match code body must preserve the Arena v2 layout");
const validCode = body + arenaCodeChecksum(body);
assert.equal(normalizeArenaMatchCode(validCode), validCode, "Valid Arena v2 code should pass checksum validation");
assert.equal(normalizeArenaMatchCode(validCode.toLowerCase()), validCode, "Lowercase valid code should normalize");
assert.equal(normalizeArenaMatchCode(validCode.slice(0, 31) + "00"), null, "Bad checksum should be rejected");
assert.equal(normalizeArenaMatchCode("123456"), null, "Short codes should be rejected");

const rows = sanitizeArenaRows([
  { code: validCode, pid: "cadet-a", name: "  Cadet\u0000 Alpha  ", score: 14, seconds: 61, total: 15, at: 1000, answers: { q1: 3 } },
  { code: validCode, pid: "cadet-b", name: "Cadet Beta", score: 15, seconds: 70, total: 15, at: 1001, answers: { q2: 1 } },
  { code: validCode, pid: "cadet-a", name: "Cadet Alpha", score: 14.5, seconds: 60, total: 15, at: 1002, answers: { secret: true } },
  { code: "another-match", pid: "other", name: "Other", score: 15, seconds: 30, total: 15, at: 1003 },
  { code: validCode, pid: "bad-score", name: "Bad", score: 999, seconds: 30, total: 15, at: 1004 },
  { code: validCode, pid: "bad-time", name: "Bad", score: 10, seconds: -1, total: 15, at: 1005 },
  null
], validCode);

assert.equal(rows.length, 2, "Only valid rows for the requested match should remain, deduped by player");
assert.equal(rows[0].pid, "cadet-b", "Rows should sort by score descending");
assert.equal(rows[1].score, 14.5, "The latest attempt per player should be retained");
assert.equal(rows[1].name, "Cadet Alpha", "Names should be sanitized");
assert.deepEqual(Object.keys(rows[0]).sort(), ["at", "code", "name", "pid", "score", "seconds", "total"],
  "Public rows must omit answer data and any unexpected database fields");
console.log("PASS Arena leaderboard endpoint contract: code validation, match scoping, sanitization, dedupe and ranking");
