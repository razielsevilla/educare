const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCare Backend is running' });
});

// Zero-Knowledge Sync Endpoints (Receives & Sends Encrypted Blobs)
app.post('/api/sync/push', (req, res) => {
  const { teacherId, blobData } = req.body;
  if (!teacherId || !blobData) {
    return res.status(400).json({ error: 'teacherId and blobData are required' });
  }

  db.run(`INSERT INTO sync_blobs (teacherId, blobData) VALUES (?, ?)`, [teacherId, blobData], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to push sync blob' });
    }
    res.json({ status: 'success', message: 'Changes pushed successfully.', id: this.lastID });
  });
});

app.get('/api/sync/pull', (req, res) => {
  const teacherId = req.query.teacherId;
  const since = req.query.since || 0; // Fetch blobs after a certain ID

  if (!teacherId) {
    return res.status(400).json({ error: 'teacherId is required' });
  }

  db.all(`SELECT id, blobData, timestamp FROM sync_blobs WHERE teacherId = ? AND id > ? ORDER BY id ASC`, [teacherId, since], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to pull sync blobs' });
    }
    res.json({ status: 'success', data: rows });
  });
});

// Teacher Administration Endpoints
app.post('/api/teacher/register', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Teacher name is required' });
  }

  const teacherId = uuidv4();
  db.run(`INSERT INTO teachers (id, name) VALUES (?, ?)`, [teacherId, name], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to register teacher' });
    }
    res.json({ status: 'success', teacherId });
  });
});

app.listen(PORT, () => {
  console.log(`EduCare Backend listening on port ${PORT}`);
});
