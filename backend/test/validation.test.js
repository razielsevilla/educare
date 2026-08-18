import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalDbPath = process.env.EDUCARE_DB_PATH;
let app;
let db;

const loadFreshApp = async () => {
  vi.resetModules();
  const appModule = await import('../server.js');
  const dbModule = await import('../database.js');
  app = appModule.default || appModule;
  db = dbModule.default || dbModule;
};

const resetDb = () => new Promise((resolve, reject) => {
  if (!db || !db.serialize) {
    resolve();
    return;
  }

  db.serialize(() => {
    db.run('DELETE FROM sync_blobs', (deleteBlobErr) => {
      if (deleteBlobErr) {
        reject(deleteBlobErr);
        return;
      }
      db.run('DELETE FROM teachers', (deleteTeacherErr) => {
        if (deleteTeacherErr) {
          reject(deleteTeacherErr);
          return;
        }
        resolve();
      });
    });
  });
});

describe('EduCare API request validation', () => {
  beforeEach(async () => {
    process.env.EDUCARE_DB_PATH = ':memory:';
    await loadFreshApp();
    await db.dbReady;
    await resetDb();
  });

  afterEach(async () => {
    await db.dbReady;
    await resetDb();
    await db.closeDatabase();
    if (originalDbPath === undefined) delete process.env.EDUCARE_DB_PATH; else process.env.EDUCARE_DB_PATH = originalDbPath;
  });

  describe('POST /api/teacher/register validation', () => {
    it('rejects missing name field', async () => {
      const res = await request(app).post('/api/teacher/register').send({ password: 'ValidPass123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.error).toMatch(/name/i);
    });

    it('rejects empty name field', async () => {
      const res = await request(app).post('/api/teacher/register').send({ name: '   ', password: 'ValidPass123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects password shorter than 8 characters', async () => {
      const res = await request(app).post('/api/teacher/register').send({ name: 'TestTeacher', password: 'Short1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.error).toMatch(/password/i);
    });

    it('rejects missing password field', async () => {
      const res = await request(app).post('/api/teacher/register').send({ name: 'TestTeacher' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('accepts valid name and password', async () => {
      const res = await request(app).post('/api/teacher/register').send({ name: 'TestTeacher', password: 'ValidPass123' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.teacherId).toBeDefined();
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/sync/push validation', () => {
    let validTeacherId;
    let validToken;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/teacher/register').send({ name: 'TestTeacher', password: 'ValidPass123' });
      validTeacherId = registerRes.body.teacherId;
      validToken = registerRes.body.token;
    });

    it('rejects invalid UUID format for teacherId', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ teacherId: 'not-a-uuid', blobData: 'enc:v1:dGVzdA==' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.error).toMatch(/teacherId/i);
    });

    it('rejects missing teacherId', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ blobData: 'enc:v1:dGVzdA==' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects missing blobData', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ teacherId: validTeacherId });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects empty blobData', async () => {
      const res = await request(app)
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ teacherId: validTeacherId, blobData: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });
  });

  describe('GET /api/sync/pull validation', () => {
    let validTeacherId;
    let validToken;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/teacher/register').send({ name: 'TestTeacher', password: 'ValidPass123' });
      validTeacherId = registerRes.body.teacherId;
      validToken = registerRes.body.token;
    });

    it('rejects invalid UUID format for teacherId', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ teacherId: 'invalid-uuid', since: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.error).toMatch(/teacherId/i);
    });

    it('rejects missing teacherId query param', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ since: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('rejects non-numeric since parameter', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ teacherId: validTeacherId, since: 'not-a-number' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
      expect(res.body.error).toMatch(/since/i);
    });

    it('rejects negative since value', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ teacherId: validTeacherId, since: -1 });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/validation/i);
    });

    it('accepts valid query params with default since', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ teacherId: validTeacherId });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('accepts valid query params with numeric since', async () => {
      const res = await request(app)
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ teacherId: validTeacherId, since: 0 });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });
  });
});
