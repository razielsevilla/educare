const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.EDUCARE_DB_PATH || path.resolve(__dirname, 'educare.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    dbReadyReject(err);
    return;
  }

  console.log('Connected to the EduCare SQLite database.');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      passwordHash TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sync_blobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacherId TEXT NOT NULL,
      blobData TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacherId) REFERENCES teachers(id)
    )`);

    db.all('PRAGMA table_info(teachers)', (pragmaErr, columns) => {
      if (pragmaErr) {
        console.error('Failed to inspect teachers table:', pragmaErr.message);
        dbReadyReject(pragmaErr);
        return;
      }

      const columnNames = new Set((columns || []).map((column) => column.name));
      if (!columnNames.has('passwordHash')) {
        db.run('ALTER TABLE teachers ADD COLUMN passwordHash TEXT', (alterErr) => {
          if (alterErr) {
            console.warn('Migration warning: unable to add passwordHash column:', alterErr.message);
            return;
          }
          dbReadyResolve();
        });
        return;
      }

      dbReadyResolve();
    });
  });
});

let dbReadyResolve;
let dbReadyReject;
const dbReady = new Promise((resolve, reject) => {
  dbReadyResolve = resolve;
  dbReadyReject = reject;
});

db.dbReady = dbReady;
db.closeDatabase = () => new Promise((resolve, reject) => {
  db.close((err) => {
    if (err) reject(err); else resolve();
  });
});

module.exports = db;
