// Seed default users into the fresh database
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const users = [
  { username: 'mk',    password: '123456', avatar: 'avatar_pythagoras' },
  { username: 'mk1',   password: '123456', avatar: 'avatar_owl' },
  { username: 'admin', password: '123456', avatar: 'avatar_euler' },
];

async function seedUsers() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const now = Math.floor(Date.now() / 1000);
    await new Promise((resolve) => {
      db.run(
        `INSERT OR IGNORE INTO users (username, password_hash, last_active, avatar, last_league_reset)
         VALUES (?, ?, ?, ?, ?)`,
        [u.username, hash, now, u.avatar, now],
        (err) => {
          if (err) console.error(`Error inserting ${u.username}:`, err.message);
          else console.log(`User '${u.username}' seeded (password: 123456)`);
          resolve();
        }
      );
    });
  }
  console.log('All done.');
  process.exit(0);
}

seedUsers().catch(console.error);
