const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'educare-dev-secret-change-me';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENCRYPTED_BLOB_PREFIX = 'enc:v1:';

app.use(cors());
app.use(express.json());

const isValidTeacherId = (teacherId) => typeof teacherId === 'string' && UUID_PATTERN.test(teacherId);
const isEncryptedBlob = (value) => {
  if (typeof value !== 'string' || !value.startsWith(ENCRYPTED_BLOB_PREFIX)) {
    return false;
  }

  try {
    const encoded = value.slice(ENCRYPTED_BLOB_PREFIX.length);
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && parsed.v === 1 && typeof parsed.iv === 'string' && typeof parsed.salt === 'string' && typeof parsed.ct === 'string';
  } catch (err) {
    return false;
  }
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const authenticateTeacher = (req, teacherId) => {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, error: 'Authorization token is required' };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || payload.teacherId !== teacherId) {
      return { ok: false, status: 403, error: 'Token does not match the requested teacherId' };
    }

    return { ok: true, teacherId: payload.teacherId };
  } catch (err) {
    return { ok: false, status: 403, error: 'Invalid or expired token' };
  }
};

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduCare Backend is running' });
});

app.post('/api/sync/push', (req, res) => {
  const { teacherId, blobData } = req.body;

  if (!teacherId || !isValidTeacherId(teacherId)) {
    return res.status(400).json({ error: 'A valid teacherId is required' });
  }

  if (!isEncryptedBlob(blobData)) {
    return res.status(400).json({ error: 'blobData must be an encrypted payload in the enc:v1 format' });
  }

  const auth = authenticateTeacher(req, teacherId);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  db.get('SELECT id FROM teachers WHERE id = ?', [teacherId], (teacherErr, teacherRow) => {
    if (teacherErr || !teacherRow) {
      return res.status(403).json({ error: 'Teacher is not registered or the token does not match the account' });
    }

    db.run('INSERT INTO sync_blobs (teacherId, blobData) VALUES (?, ?)', [teacherId, blobData], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to push sync blob' });
      }
      res.json({ status: 'success', message: 'Changes pushed successfully.', id: this.lastID });
    });
  });
});

app.get('/api/sync/pull', (req, res) => {
  const teacherId = req.query.teacherId;
  const since = Number(req.query.since ?? 0);

  if (!teacherId || !isValidTeacherId(teacherId)) {
    return res.status(400).json({ error: 'A valid teacherId is required' });
  }

  if (!Number.isFinite(since) || since < 0) {
    return res.status(400).json({ error: 'since must be a non-negative number' });
  }

  const auth = authenticateTeacher(req, teacherId);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  db.get('SELECT id FROM teachers WHERE id = ?', [teacherId], (teacherErr, teacherRow) => {
    if (teacherErr || !teacherRow) {
      return res.status(403).json({ error: 'Teacher is not registered or the token does not match the account' });
    }

    db.all('SELECT id, blobData, timestamp FROM sync_blobs WHERE teacherId = ? AND id > ? ORDER BY id ASC', [teacherId, since], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to pull sync blobs' });
      }
      res.json({ status: 'success', data: rows });
    });
  });
});

app.post('/api/teacher/register', async (req, res) => {
  const { name, password } = req.body;
  const cleanName = typeof name === 'string' ? name.trim() : '';

  if (!cleanName) {
    return res.status(400).json({ error: 'Teacher name is required' });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'A password of at least 8 characters is required' });
  }

  const teacherId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  db.run('INSERT INTO teachers (id, name, passwordHash) VALUES (?, ?, ?)', [teacherId, cleanName, passwordHash], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to register teacher' });
    }

    const token = jwt.sign({ teacherId }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ status: 'success', teacherId, token });
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`EduCare Backend listening on port ${PORT}`);
  });
}

module.exports = app;
