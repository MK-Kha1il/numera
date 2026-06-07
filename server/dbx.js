'use strict';

/**
 * Database extensions: promisified helpers + real ACID transactions.
 *
 * WHY A SEPARATE CONNECTION
 * -------------------------
 * `node-sqlite3` runs every statement on a single connection in submission
 * order. If we issued BEGIN/COMMIT on the *main* connection (db.js), unrelated
 * autocommit writes from other concurrent requests could slip *between* our
 * statements and get caught inside — or rolled back by — our transaction.
 *
 * To get true isolation we open a dedicated write connection here and run all
 * transactional work on it. Combined with the promise-chain mutex below (only
 * one transaction in flight at a time), BEGIN IMMEDIATE on this connection is
 * fully isolated. WAL mode lets the main connection keep reading meanwhile;
 * its writes simply wait on the lock (busy_timeout) until our COMMIT.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Honor NUMERA_DB_PATH exactly like db.js, so the transaction connection always points at the
// SAME database file as the main connection. (Previously hardcoded to numera.db, which silently
// sent transactional writes to the dev DB even under tests that set NUMERA_DB_PATH.)
const dbPath = process.env.NUMERA_DB_PATH || path.join(__dirname, 'numera.db');
const txDb = new sqlite3.Database(dbPath);
txDb.run('PRAGMA busy_timeout = 5000;');
txDb.run('PRAGMA foreign_keys = ON;');

// --- Promisified single-statement helpers (bound to the tx connection) -------
// `run` resolves with the sqlite3 Statement so callers can read `.changes` /
// `.lastID`. Must use a normal function (not arrow) to receive `this`.
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    txDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    txDb.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    txDb.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// --- Transaction runner ------------------------------------------------------
// Serialize transactions: only one BEGIN..COMMIT runs at a time on txDb.
let txChain = Promise.resolve();

/**
 * Run `work` inside a single ACID transaction.
 *
 * `work` receives a `tx` object with promisified `run/get/all`. Resolve to a
 * value to COMMIT and return it; throw to ROLLBACK and propagate the error.
 * Because everything either commits or rolls back as a unit, callers no longer
 * need manual refund/compensation code, and a crash mid-way cannot leave coins
 * deducted without the matching grant.
 *
 * @template T
 * @param {(tx: {run: typeof run, get: typeof get, all: typeof all}) => Promise<T>} work
 * @returns {Promise<T>}
 */
function withTransaction(work) {
  const result = txChain.then(() => runOne(work));
  // Keep the chain alive whether this transaction succeeds or fails, but don't
  // let one transaction's rejection break the next one's turn.
  txChain = result.then(
    () => {},
    () => {}
  );
  return result;
}

async function runOne(work) {
  await run('BEGIN IMMEDIATE');
  try {
    const out = await work({ run, get, all });
    await run('COMMIT');
    return out;
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch (_) {
      /* ignore rollback failure — original error is what matters */
    }
    throw err;
  }
}

/**
 * Build an Error carrying an HTTP status, for control flow inside `work`.
 * Throwing it rolls back the transaction; the route handler maps `.status`.
 */
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { txDb, run, get, all, withTransaction, httpError };
