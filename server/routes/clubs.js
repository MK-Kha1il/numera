// Clubs/teams (audit #1.7 community). A learner belongs to at most one club at a time. Create a
// club (name content-filtered + unique, creator auto-joins), browse open clubs with member counts,
// join/leave (the club is deleted when its last member leaves), and view your club's member
// ranking. ACID create/join/leave via withTransaction; no special owner powers in v1.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { checkText } = require('../lib/contentFilter');

const router = express.Router();

const NAME_MIN = 3;
const NAME_MAX = 30;
const DESC_MAX = 200;

const getMyClubId = (tx, userId) =>
  tx.get('SELECT club_id FROM club_members WHERE user_id = ?', [userId]).then((r) => (r ? r.club_id : null));

// Members of a club, ranked by level then XP (the team ladder).
function membersOf(clubId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.username, u.level, u.xp, u.rank, u.avatar
         FROM club_members cm JOIN users u ON u.id = cm.user_id
        WHERE cm.club_id = ?
        ORDER BY u.level DESC, u.xp DESC
        LIMIT 200`,
      [clubId],
      (err, rows) => (err ? reject(err) : resolve((rows || []).map((r, i) => ({ ...r, position: i + 1 }))))
    );
  });
}

// Create a club and auto-join as owner.
router.post('/api/clubs', authenticateToken, (req, res) => {
  const name = String((req.body && req.body.name) || '').trim();
  const description = String((req.body && req.body.description) || '').trim().slice(0, DESC_MAX);
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    return res.status(400).json({ error: `Name must be ${NAME_MIN}-${NAME_MAX} characters` });
  }
  const nameClean = checkText(name, 'Club name');
  if (!nameClean.ok) return res.status(400).json({ error: nameClean.error });
  if (description) {
    const descClean = checkText(description, 'Description');
    if (!descClean.ok) return res.status(400).json({ error: descClean.error });
  }

  withTransaction(async (tx) => {
    if (await getMyClubId(tx, req.user.id)) throw httpError(400, 'Leave your current club before creating one');
    const dup = await tx.get('SELECT 1 FROM clubs WHERE name = ? COLLATE NOCASE', [name]);
    if (dup) throw httpError(409, 'That club name is taken');
    const now = Math.floor(Date.now() / 1000);
    const ins = await tx.run('INSERT INTO clubs (name, description, owner_id, created_at) VALUES (?, ?, ?, ?)', [name, description, req.user.id, now]);
    await tx.run('INSERT INTO club_members (club_id, user_id, joined_at) VALUES (?, ?, ?)', [ins.lastID, req.user.id, now]);
    return ins.lastID;
  })
    .then((clubId) => res.status(201).json({ success: true, clubId }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Browse clubs (most populous first), flagging the one I'm in.
router.get('/api/clubs', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.id, c.name, c.description, c.owner_id AS ownerId,
            (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id) AS memberCount,
            EXISTS(SELECT 1 FROM club_members m WHERE m.club_id = c.id AND m.user_id = ?) AS joined
       FROM clubs c
      ORDER BY memberCount DESC, c.created_at DESC
      LIMIT 100`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map((r) => ({ ...r, joined: !!r.joined })));
    }
  );
});

// Club leaderboard (the team league): clubs ranked by the combined level of their members, so a
// club has a competitive reason to recruit and climb. Total XP breaks ties.
router.get('/api/clubs/leaderboard', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.id, c.name,
            COUNT(cm.user_id) AS memberCount,
            COALESCE(SUM(u.level), 0) AS totalLevel,
            COALESCE(SUM(u.xp), 0) AS totalXp
       FROM clubs c
       JOIN club_members cm ON cm.club_id = c.id
       JOIN users u ON u.id = cm.user_id
      GROUP BY c.id
      ORDER BY totalLevel DESC, totalXp DESC
      LIMIT 50`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map((r, i) => ({ ...r, position: i + 1 })));
    }
  );
});

// My club + its ranked members (or null if I'm not in one).
router.get('/api/clubs/mine', authenticateToken, async (req, res) => {
  db.get('SELECT club_id FROM club_members WHERE user_id = ?', [req.user.id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ club: null });
    db.get('SELECT id, name, description, owner_id FROM clubs WHERE id = ?', [row.club_id], async (cErr, club) => {
      if (cErr) return res.status(500).json({ error: cErr.message });
      if (!club) return res.json({ club: null });
      try {
        const members = await membersOf(club.id);
        res.json({
          club: { id: club.id, name: club.name, description: club.description, ownerId: club.owner_id, isOwner: club.owner_id === req.user.id },
          members,
        });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });
});

// Join a club (must not already be in one).
router.post('/api/clubs/:id/join', authenticateToken, (req, res) => {
  const clubId = parseInt(req.params.id, 10);
  if (!Number.isFinite(clubId)) return res.status(400).json({ error: 'Invalid club id' });

  withTransaction(async (tx) => {
    const club = await tx.get('SELECT id FROM clubs WHERE id = ?', [clubId]);
    if (!club) throw httpError(404, 'Club not found');
    if (await getMyClubId(tx, req.user.id)) throw httpError(400, 'Leave your current club first');
    await tx.run('INSERT INTO club_members (club_id, user_id, joined_at) VALUES (?, ?, ?)', [clubId, req.user.id, Math.floor(Date.now() / 1000)]);
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Leave my current club; delete the club if it becomes empty.
router.post('/api/clubs/:id/leave', authenticateToken, (req, res) => {
  const clubId = parseInt(req.params.id, 10);
  if (!Number.isFinite(clubId)) return res.status(400).json({ error: 'Invalid club id' });

  withTransaction(async (tx) => {
    const membership = await tx.get('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, req.user.id]);
    if (!membership) throw httpError(404, 'You are not in this club');
    await tx.run('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, req.user.id]);
    const remaining = await tx.get('SELECT COUNT(*) AS n FROM club_members WHERE club_id = ?', [clubId]);
    if ((remaining.n || 0) === 0) await tx.run('DELETE FROM clubs WHERE id = ?', [clubId]);
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
