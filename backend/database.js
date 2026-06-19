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
      // Teachers table
      db.run(`CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Encrypted Sync Blobs table
      // In a zero-knowledge architecture, the backend just stores encrypted blobs of data
      // associated with a specific teacher and sync epoch.
      db.run(`CREATE TABLE IF NOT EXISTS sync_blobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacherId TEXT NOT NULL,
        blobData TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacherId) REFERENCES teachers(id)
      )`);
    });
  }
});

module.exports = db;
