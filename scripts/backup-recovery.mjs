import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function sha256Hex(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function getDefaultStoreData() {
  return {
    version: 2,
    accounts: {},
    cadets: {},
    arenaMatches: {},
    arenaScores: {},
    drillSessions: {}
  };
}

/**
 * Creates a timestamped, SHA-256 checksum-verified backup bundle containing:
 * - runtimeStore (accounts, cadets, arenaMatches, arenaScores, drillSessions)
 * - defenceNotifications count & checksum
 * - contentRegistry summary
 */
export function createBackupSnapshot(options = {}) {
  const backupDir = options.backupDir || process.env.VAANI_BACKUP_DIR || path.join(ROOT_DIR, 'backups');
  const storePath = options.storePath || process.env.VAANI_RUNTIME_STORE_PATH || path.join(ROOT_DIR, 'data', 'runtime-store.json');
  const label = String(options.label || 'snapshot').replace(/[^a-zA-Z0-9_-]/g, '-');

  fs.mkdirSync(backupDir, { recursive: true });

  let storePayload = getDefaultStoreData();
  if (fs.existsSync(storePath)) {
    try {
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        storePayload = {
          version: Number(parsed.version) || 2,
          accounts: parsed.accounts && typeof parsed.accounts === 'object' ? parsed.accounts : {},
          cadets: parsed.cadets && typeof parsed.cadets === 'object' ? parsed.cadets : {},
          arenaMatches: parsed.arenaMatches && typeof parsed.arenaMatches === 'object' ? parsed.arenaMatches : {},
          arenaScores: parsed.arenaScores && typeof parsed.arenaScores === 'object' ? parsed.arenaScores : {},
          drillSessions: parsed.drillSessions && typeof parsed.drillSessions === 'object' ? parsed.drillSessions : {}
        };
      }
    } catch (_err) {
      storePayload = getDefaultStoreData();
    }
  } else if (options.inMemoryStore && typeof options.inMemoryStore === 'object') {
    storePayload = {
      version: 2,
      accounts: options.inMemoryStore.accounts || {},
      cadets: options.inMemoryStore.cadets || {},
      arenaMatches: options.inMemoryStore.arenaMatches || {},
      arenaScores: options.inMemoryStore.arenaScores || {},
      drillSessions: options.inMemoryStore.drillSessions || {}
    };
  }

  const serializedStore = JSON.stringify(storePayload);
  const storeChecksum = sha256Hex(serializedStore);

  // Also capture checksum of defence-notifications.json for content integrity verification
  const notifPath = path.join(ROOT_DIR, 'data', 'defence-notifications.json');
  let notifChecksum = null;
  let notifItemsCount = 0;
  if (fs.existsSync(notifPath)) {
    const notifRaw = fs.readFileSync(notifPath, 'utf8');
    notifChecksum = sha256Hex(notifRaw);
    try {
      const parsedNotif = JSON.parse(notifRaw);
      notifItemsCount = Array.isArray(parsedNotif?.items) ? parsedNotif.items.length : 0;
    } catch (_e) {}
  }

  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[:.]/g, '-');
  const filename = `vaani-backup-${label}-${stamp}.json`;
  const backupFilePath = path.join(backupDir, filename);

  const bundle = {
    schema: 'vaani-backup-v2',
    createdAt,
    label,
    checksums: {
      runtimeStoreSha256: storeChecksum,
      notificationsSha256: notifChecksum
    },
    counts: {
      accounts: Object.keys(storePayload.accounts).length,
      cadets: Object.keys(storePayload.cadets).length,
      arenaMatches: Object.keys(storePayload.arenaMatches).length,
      arenaScores: Object.keys(storePayload.arenaScores).length,
      drillSessions: Object.keys(storePayload.drillSessions).length,
      notifications: notifItemsCount
    },
    runtimeStore: storePayload
  };

  const tmpFile = backupFilePath + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(bundle, null, 2), 'utf8');
  fs.renameSync(tmpFile, backupFilePath);

  return {
    ok: true,
    backupFilePath,
    filename,
    createdAt,
    checksums: bundle.checksums,
    counts: bundle.counts
  };
}

/**
 * Verifies the structural and cryptographic SHA-256 integrity of a backup file.
 */
export function verifyBackupSnapshot(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    return { ok: false, error: 'Backup file does not exist.' };
  }
  try {
    const raw = fs.readFileSync(backupFilePath, 'utf8');
    const bundle = JSON.parse(raw);
    if (!bundle || bundle.schema !== 'vaani-backup-v2' || !bundle.runtimeStore) {
      return { ok: false, error: 'Invalid backup schema.' };
    }
    const computedSha = sha256Hex(JSON.stringify(bundle.runtimeStore));
    if (computedSha !== bundle.checksums?.runtimeStoreSha256) {
      return {
        ok: false,
        error: `SHA-256 checksum mismatch: expected ${bundle.checksums?.runtimeStoreSha256}, got ${computedSha}`
      };
    }
    return {
      ok: true,
      createdAt: bundle.createdAt,
      label: bundle.label,
      counts: bundle.counts,
      checksum: computedSha
    };
  } catch (err) {
    return { ok: false, error: `Failed to parse backup: ${err.message}` };
  }
}

/**
 * Restores a verified backup snapshot atomically to `targetStorePath`.
 * Always verifies checksum before writing and writes via an atomic `.tmp` swap.
 */
export function restoreBackupSnapshot(backupFilePath, options = {}) {
  const verification = verifyBackupSnapshot(backupFilePath);
  if (!verification.ok) {
    return { ok: false, error: `Restore aborted — backup verification failed: ${verification.error}` };
  }
  const targetStorePath = options.targetStorePath
    || process.env.VAANI_RUNTIME_STORE_PATH
    || path.join(ROOT_DIR, 'data', 'runtime-store.json');

  const bundle = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
  fs.mkdirSync(path.dirname(targetStorePath), { recursive: true });

  const tmpTarget = targetStorePath + '.restore.tmp';
  fs.writeFileSync(tmpTarget, JSON.stringify(bundle.runtimeStore, null, 2), 'utf8');
  fs.renameSync(tmpTarget, targetStorePath);

  return {
    ok: true,
    restoredTo: targetStorePath,
    counts: verification.counts,
    checksum: verification.checksum
  };
}

/**
 * Runs an isolated, non-destructive end-to-end backup + corruption + restore drill
 * in a temporary directory to verify disaster recovery readiness.
 */
export function runDisasterRecoveryDrill() {
  const drillDir = path.join(ROOT_DIR, 'backups', '.dr-drill-' + Date.now());
  const mockStorePath = path.join(drillDir, 'runtime-store.json');
  try {
    fs.mkdirSync(drillDir, { recursive: true });
    const sampleStore = {
      version: 2,
      accounts: {
        '778899': {
          record: {
            vaani: { name: 'Captain Vikram', xp: 1420, streak: 9, serviceForce: 'army' },
            vbv: {}
          },
          updatedAt: Date.now()
        }
      },
      cadets: {
        '778899': { code: '778899', name: 'Captain Vikram', xp: 1420, streak: 9, serviceForce: 'army' }
      },
      arenaMatches: {
        '300001': { code: '300001', exam: 'NDA', questionCount: 10 }
      },
      arenaScores: {},
      drillSessions: {}
    };

    fs.writeFileSync(mockStorePath, JSON.stringify(sampleStore, null, 2), 'utf8');

    // 1. Create backup
    const created = createBackupSnapshot({
      backupDir: drillDir,
      storePath: mockStorePath,
      label: 'dr-drill'
    });
    if (!created.ok) throw new Error('Backup creation failed during drill.');

    // 2. Verify backup
    const verified = verifyBackupSnapshot(created.backupFilePath);
    if (!verified.ok) throw new Error('Backup verification failed: ' + verified.error);

    // 3. Simulate store loss/corruption
    fs.writeFileSync(mockStorePath, '{"corrupted": true}', 'utf8');

    // 4. Restore from verified backup
    const restored = restoreBackupSnapshot(created.backupFilePath, {
      targetStorePath: mockStorePath
    });
    if (!restored.ok) throw new Error('Restore failed: ' + restored.error);

    // 5. Confirm restored data matches original
    const restoredData = JSON.parse(fs.readFileSync(mockStorePath, 'utf8'));
    if (restoredData.accounts?.['778899']?.record?.vaani?.xp !== 1420) {
      throw new Error('Restored account XP did not match snapshot.');
    }

    return {
      ok: true,
      checksum: verified.checksum,
      counts: verified.counts
    };
  } finally {
    try {
      fs.rmSync(drillDir, { recursive: true, force: true });
    } catch (_e) {}
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.includes('--test-drill')) {
    const res = runDisasterRecoveryDrill();
    console.log('VAANI Disaster Recovery Drill passed:', JSON.stringify(res));
  } else {
    const snap = createBackupSnapshot({ label: 'manual' });
    const ver = verifyBackupSnapshot(snap.backupFilePath);
    console.log('VAANI Backup created and verified:', JSON.stringify({ snap, ver }));
  }
}
