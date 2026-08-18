const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const db = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'educare-dev-secret-change-me';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENCRYPTED_BLOB_PREFIX = 'enc:v1:';
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,http://localhost:3000,http://127.0.0.1:3000').split(',').map((origin) => origin.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const getRateLimitKey = (req) => {
  const forwardedHeader = req.headers['x-forwarded-for'];
  const sourceIp = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader || req.ip || 'unknown';
  return rateLimit.ipKeyGenerator(String(sourceIp));
};

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
  keyGenerator: getRateLimitKey,
});

const syncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
  keyGenerator: getRateLimitKey,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// Zod schemas for request validation
const uuidSchema = z.string().uuid('Invalid UUID format');

const pushSyncSchema = z.object({
  teacherId: uuidSchema,
  blobData: z.string().min(1, 'blobData is required'),
});

const pullSyncSchema = z.object({
  teacherId: uuidSchema,
  since: z.coerce.number().int('since must be an integer').nonnegative('since must be non-negative').default(0),
});

const registerTeacherSchema = z.object({
  name: z.string().trim().min(1, 'Teacher name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Validation middleware factory
const validateBody = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errorMessages = result.error.flatten().fieldErrors;
      const formattedErrors = Object.entries(errorMessages)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('; ');
      return res.status(400).json({ error: `Validation error: ${formattedErrors}` });
    }
    req.validatedBody = result.data;
    next();
  } catch (err) {
    console.error('Validation middleware error:', err);
    res.status(500).json({ error: 'Validation error' });
  }
};

const validateQuery = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errorMessages = result.error.flatten().fieldErrors;
      const formattedErrors = Object.entries(errorMessages)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('; ');
      return res.status(400).json({ error: `Validation error: ${formattedErrors}` });
    }
    req.validatedQuery = result.data;
    next();
  } catch (err) {
    console.error('Validation middleware error:', err);
    res.status(500).json({ error: 'Validation error' });
  }
};

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

app.post('/api/sync/push', syncLimiter, validateBody(pushSyncSchema), (req, res) => {
  const { teacherId, blobData } = req.validatedBody;

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

app.get('/api/sync/pull', syncLimiter, validateQuery(pullSyncSchema), (req, res) => {
  const { teacherId, since } = req.validatedQuery;

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

app.post('/api/teacher/register', registerLimiter, validateBody(registerTeacherSchema), async (req, res) => {
  const { name, password } = req.validatedBody;

  const teacherId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  db.run('INSERT INTO teachers (id, name, passwordHash) VALUES (?, ?, ?)', [teacherId, name, passwordHash], (err) => {
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
