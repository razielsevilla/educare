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
  const { schoolId, blobData } = req.body;
  if (!schoolId || !blobData) {
    return res.status(400).json({ error: 'schoolId and blobData are required' });
  }

  db.run(`INSERT INTO sync_blobs (schoolId, blobData) VALUES (?, ?)`, [schoolId, blobData], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to push sync blob' });
    }
    res.json({ status: 'success', message: 'Changes pushed successfully.', id: this.lastID });
  });
});

app.get('/api/sync/pull', (req, res) => {
  const schoolId = req.query.schoolId;
  const since = req.query.since || 0; // Fetch blobs after a certain ID

  if (!schoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }

  db.all(`SELECT id, blobData, timestamp FROM sync_blobs WHERE schoolId = ? AND id > ? ORDER BY id ASC`, [schoolId, since], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to pull sync blobs' });
    }
    res.json({ status: 'success', data: rows });
  });
});

// School Administration Endpoints
app.post('/api/school/register', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'School name is required' });
  }

  const schoolId = uuidv4();
  db.run(`INSERT INTO schools (id, name) VALUES (?, ?)`, [schoolId, name], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to register school' });
    }
    res.json({ status: 'success', schoolId });
  });
});

app.post('/api/school/invite-teacher', (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }

  const inviteCode = uuidv4().substring(0, 8).toUpperCase();
  db.run(`INSERT INTO invitations (code, schoolId, role) VALUES (?, ?, 'teacher')`, [inviteCode, schoolId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to generate invitation' });
    }
    res.json({ status: 'success', inviteCode });
  });
});

app.listen(PORT, () => {
  console.log(`EduCare Backend listening on port ${PORT}`);
});
