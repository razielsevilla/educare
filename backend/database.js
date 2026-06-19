const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.resolve(__dirname, 'educare.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the EduCare SQLite database.');
    
    // Create initial tables
    db.serialize(() => {
      // Schools table
      db.run(`CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Encrypted Sync Blobs table
      // In a zero-knowledge architecture, the backend just stores encrypted blobs of data
      // associated with a specific school and sync epoch.
      db.run(`CREATE TABLE IF NOT EXISTS sync_blobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schoolId TEXT NOT NULL,
        blobData TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schoolId) REFERENCES schools(id)
      )`);

      // Invitations table
      db.run(`CREATE TABLE IF NOT EXISTS invitations (
        code TEXT PRIMARY KEY,
        schoolId TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (schoolId) REFERENCES schools(id)
      )`);
    });
  }
});

module.exports = db;
