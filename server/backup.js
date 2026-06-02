'use strict';

/**
 * Safe online backup for the Numera SQLite database, with integrity verification.
 *
 * Usage:
 *   node backup.js              # write a timestamped, verified backup; prune old ones
 *   node backup.js --keep 30    # keep the 30 most recent backups (default 14)
 *
 * It uses SQLite's `VACUUM INTO`, which produces a clean, fully-consistent
 * snapshot of the database (including any committed data still sitting in the
 * WAL) without stopping the server. This is the recommended way to back up a
 * live WAL-mode database — do NOT just file-copy numera.db while it is in use.
 *
 * After writing the snapshot it is VERIFIED before being kept:
 *   1. `PRAGMA integrity_check` is run against the backup file. If the backup is
 *      corrupt, it is deleted and the script exits non-zero — so a bad backup
 *      can never silently sit in the folder waiting to fail you at restore time.
 *   2. A SHA-256 checksum is written next to it (numera-<ts>.db.sha256) so you
 *      can detect bit-rot / tampering later with `sha256sum -c` (or PowerShell
 *      Get-FileHash).
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'numera.db');
const BACKUP_DIR = path.join(__dirname, 'backups');

// How many recent backups to retain. Override with `--keep N`.
function parseKeep() {
  const i = process.argv.indexOf('--keep');
  if (i !== -1 && process.argv[i + 1]) {
    const n = parseInt(process.argv[i + 1], 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 14;
}

function timestamp() {
  // 2026-06-01T14-32-07 -> filesystem-safe, sortable.
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+$/, '');
}

// Run PRAGMA integrity_check against a finished backup file (read-only).
// Resolves true only if SQLite reports the single row "ok".
function verifyIntegrity(filePath) {
  return new Promise((resolve) => {
    const vdb = new sqlite3.Database(filePath, sqlite3.OPEN_READONLY, (openErr) => {
      if (openErr) {
        console.error('[backup] cannot open backup to verify:', openErr.message);
        return resolve(false);
      }
      vdb.all('PRAGMA integrity_check', (err, rows) => {
        vdb.close();
        if (err) {
          console.error('[backup] integrity_check failed to run:', err.message);
          return resolve(false);
        }
        const ok = rows.length === 1 && rows[0].integrity_check === 'ok';
        if (!ok) {
          console.error('[backup] integrity_check reported problems:', JSON.stringify(rows));
        }
        resolve(ok);
      });
    });
  });
}

// Write "<sha256>  <filename>\n" sidecar next to the backup.
function writeChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  const digest = hash.digest('hex');
  const sidecar = filePath + '.sha256';
  fs.writeFileSync(sidecar, `${digest}  ${path.basename(filePath)}\n`);
  return digest;
}

function pruneOldBackups(keep) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('numera-') && f.endsWith('.db'))
    .sort(); // ISO timestamps sort chronologically
  const excess = files.length - keep;
  for (let i = 0; i < excess; i++) {
    const dbFile = path.join(BACKUP_DIR, files[i]);
    fs.unlinkSync(dbFile);
    // Remove its checksum sidecar too, if present.
    const sidecar = dbFile + '.sha256';
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
    console.log(`[backup] pruned old backup: ${files[i]}`);
  }
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[backup] database not found at ${DB_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const keep = parseKeep();
  const target = path.join(BACKUP_DIR, `numera-${timestamp()}.db`);

  const db = new sqlite3.Database(DB_PATH);
  // VACUUM INTO requires a literal string path; escape single quotes defensively.
  const safeTarget = target.replace(/'/g, "''");
  db.run(`VACUUM INTO '${safeTarget}'`, async (err) => {
    db.close();
    if (err) {
      console.error('[backup] VACUUM INTO failed:', err.message);
      process.exit(1);
    }

    // Verify the snapshot before we trust it.
    const ok = await verifyIntegrity(target);
    if (!ok) {
      console.error('[backup] VERIFICATION FAILED — discarding corrupt backup:', target);
      try {
        fs.unlinkSync(target);
      } catch (_) {
        /* nothing more we can do */
      }
      process.exit(1);
    }

    const sizeKb = (fs.statSync(target).size / 1024).toFixed(1);
    const digest = writeChecksum(target);
    console.log(`[backup] wrote ${target} (${sizeKb} KB)`);
    console.log(`[backup] integrity: ok  sha256: ${digest}`);

    try {
      pruneOldBackups(keep);
    } catch (e) {
      console.warn('[backup] prune step failed (backup itself is fine):', e.message);
    }
  });
}

main();
