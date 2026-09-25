// Liveness/readiness probe for uptime monitors and reverse proxies. Unauthenticated by design and
// deliberately
// boring: it proves the process is serving and the database answers, and reports the schema
// version + uptime. Nothing user-related, no config, no versions of dependencies.
const express = require('express');
const { db } = require('../db');

const router = express.Router();
const startedAt = Date.now();

router.get('/healthz', (req, res) => {
  db.get('SELECT MAX(version) AS v FROM schema_version', [], (err, row) => {
    const body = {
      ok: !err,
      db: err ? 'error' : 'ok',
      schemaVersion: row ? row.v : null,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    };
    res.set('Cache-Control', 'no-store');
    res.status(err ? 503 : 200).json(body);
  });
});

module.exports = router;
