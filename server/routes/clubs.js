// Clubs/teams (audit #1.7 community). A learner belongs to at most one club at a time. Create a
// club (name content-filtered + unique, creator auto-joins), browse open clubs with member counts,
// join/leave (the club is deleted when its last member leaves), and view your club's member
// ranking. Owner governance (audit #1.7 — kick/owner powers): the owner can remove a member,
// transfer ownership, or disband the club; when an owner leaves a club that still has members,
// ownership auto-transfers to the top-ranked remaining member (no dangling owner_id). ACID
// throughout via withTransaction.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { checkText } = require('../lib/contentFilter');
const NRS = require('../mathEngine/ratingEngine');

const router = express.Router();

const NAME_MIN = 3;
const NAME_MAX = 30;
const DESC_MAX = 200;

const getMyClubId = (tx, userId) =>
  tx.get('SELECT club_id FROM club_members WHERE user_id = ?', [userId]).then((r) => (r ? r.club_id : null));

// The top-ranked remaining member (by level then XP), excluding one user. Used to hand ownership
// to a successor when the owner leaves so a club is never left with a dangling owner_id.
function pickSuccessor(tx, clubId, excludeUserId) {
  return tx
    .get(
      `SELECT cm.user_id AS id FROM club_members cm JOIN users u ON u.id = cm.user_id
        WHERE cm.club_id = ? AND cm.user_id != ?
        ORDER BY u.level DESC, u.xp DESC LIMIT 1`,
      [clubId, excludeUserId]
    )
    .then((r) => (r ? r.id : null));
}

// Load a club for an owner-only action; throws if it doesn't exist or the caller isn't the owner.
async function requireOwnedClub(tx, clubId, userId, action) {
  const club = await tx.get('SELECT id, owner_id FROM clubs WHERE id = ?', [clubId]);
  if (!club) throw httpError(404, 'Club not found');
  if (club.owner_id !== userId) throw httpError(403, `Only the club owner can ${action}`);
  return club;
}

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

// Club SKILL ladder (competitive audit #17/#76/#77): rank clubs by the AVERAGE competitive rating of
// their placed members, not summed level/XP — so a tight crew of strong mathematicians outranks a
// horde of grinders, and recruiting weak accounts doesn't inflate a club. Average over members with
// an established rating (≥5 rated games); clubs with none are "Unrated". The club's rank label is
// derived from its average via the one published ladder.
router.get('/api/clubs/leaderboard/skill', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.id, c.name,
            COUNT(cm.user_id) AS memberCount,
            COUNT(r.user_id) AS ratedMembers,
            COALESCE(AVG(r.display_rating), 0) AS avgRating
       FROM clubs c
       JOIN club_members cm ON cm.club_id = c.id
       LEFT JOIN user_ratings r
              ON r.user_id = cm.user_id AND r.domain = 'global' AND r.sessions_count >= 5
      GROUP BY c.id
      ORDER BY avgRating DESC, ratedMembers DESC, memberCount DESC
      LIMIT 50`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        (rows || []).map((r, i) => {
          const avg = Math.round(r.avgRating || 0);
          return {
            id: r.id,
            name: r.name,
            position: i + 1,
            memberCount: r.memberCount,
            ratedMembers: r.ratedMembers,
            avgRating: avg,
            // A club is only "ranked" once it has at least one established member; pass 5 sessions so
            // the rank label is a real tier (not the placement string) when rated.
            clubRank: r.ratedMembers > 0 ? NRS.displayRatingToRank(avg, 5) : 'Unrated',
          };
        })
      );
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
    const club = await tx.get('SELECT owner_id FROM clubs WHERE id = ?', [clubId]);
    await tx.run('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, req.user.id]);
    const remaining = await tx.get('SELECT COUNT(*) AS n FROM club_members WHERE club_id = ?', [clubId]);
    if ((remaining.n || 0) === 0) {
      await tx.run('DELETE FROM clubs WHERE id = ?', [clubId]);
    } else if (club && club.owner_id === req.user.id) {
      // The owner left but members remain — hand ownership to the next-ranked member.
      const successor = await pickSuccessor(tx, clubId, req.user.id);
      if (successor) await tx.run('UPDATE clubs SET owner_id = ? WHERE id = ?', [successor, clubId]);
    }
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Owner-only: remove a member from the club (moderation/safety lever). Can't kick yourself.
router.post('/api/clubs/:id/kick', authenticateToken, (req, res) => {
  const clubId = parseInt(req.params.id, 10);
  const targetId = parseInt(req.body && req.body.userId, 10);
  if (!Number.isFinite(clubId) || !Number.isFinite(targetId)) return res.status(400).json({ error: 'Invalid request' });

  withTransaction(async (tx) => {
    await requireOwnedClub(tx, clubId, req.user.id, 'remove members');
    if (targetId === req.user.id) throw httpError(400, "You can't remove yourself — use Leave or Disband");
    const member = await tx.get('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, targetId]);
    if (!member) throw httpError(404, 'That user is not in your club');
    await tx.run('DELETE FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, targetId]);
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Owner-only: hand ownership to another member.
router.post('/api/clubs/:id/transfer', authenticateToken, (req, res) => {
  const clubId = parseInt(req.params.id, 10);
  const targetId = parseInt(req.body && req.body.userId, 10);
  if (!Number.isFinite(clubId) || !Number.isFinite(targetId)) return res.status(400).json({ error: 'Invalid request' });

  withTransaction(async (tx) => {
    await requireOwnedClub(tx, clubId, req.user.id, 'transfer ownership');
    if (targetId === req.user.id) throw httpError(400, 'You already own this club');
    const member = await tx.get('SELECT 1 FROM club_members WHERE club_id = ? AND user_id = ?', [clubId, targetId]);
    if (!member) throw httpError(404, 'That user is not in your club');
    await tx.run('UPDATE clubs SET owner_id = ? WHERE id = ?', [targetId, clubId]);
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Owner-only: disband the club entirely (removes all members + the club).
router.delete('/api/clubs/:id', authenticateToken, (req, res) => {
  const clubId = parseInt(req.params.id, 10);
  if (!Number.isFinite(clubId)) return res.status(400).json({ error: 'Invalid club id' });

  withTransaction(async (tx) => {
    await requireOwnedClub(tx, clubId, req.user.id, 'disband the club');
    await tx.run('DELETE FROM club_members WHERE club_id = ?', [clubId]);
    await tx.run('DELETE FROM clubs WHERE id = ?', [clubId]);
  })
    .then(() => res.json({ success: true }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
