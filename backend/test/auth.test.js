import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalDbPath = process.env.EDUCARE_DB_PATH;
const TEST_DB_PATH = ':memory:';

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

describe('EduCare auth & sync API', () => {
  beforeEach(async () => {
    process.env.EDUCARE_DB_PATH = TEST_DB_PATH;
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

  it('registers a teacher with a credential and allows a valid session token to push sync data', async () => {
    const registerRes = await request(app).post('/api/teacher/register').send({
      name: 'Ada Teacher',
      password: 'StrongPass123!'
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty('teacherId');
    expect(registerRes.body).toHaveProperty('token');
    expect(registerRes.body.token).toMatch(/\S+/);

    const teacherId = registerRes.body.teacherId;
    const token = registerRes.body.token;

    const pushRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send({
        teacherId,
        blobData: JSON.stringify({ attState: { 'Student A': 'P' }, assessScores: {}, workflows: [] })
      });

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.status).toBe('success');
  });

  it('rejects push requests with a missing or wrong token', async () => {
    const registerRes = await request(app).post('/api/teacher/register').send({
      name: 'Wrong Token User',
      password: 'Passw0rd!'
    });

    const teacherId = registerRes.body.teacherId;

    const missingTokenRes = await request(app)
      .post('/api/sync/push')
      .send({ teacherId, blobData: JSON.stringify({ attState: {} }) });

    expect(missingTokenRes.status).toBe(401);

    const wrongTokenRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', 'Bearer invalid-token')
      .send({ teacherId, blobData: JSON.stringify({ attState: {} }) });

    expect(wrongTokenRes.status).toBe(403);
  });

  it('only returns the requesting teacher\'s own sync data from pull', async () => {
    const teacherA = await request(app).post('/api/teacher/register').send({
      name: 'Teacher A',
      password: 'AlphaPass1!'
    });
    const teacherB = await request(app).post('/api/teacher/register').send({
      name: 'Teacher B',
      password: 'BravoPass2!'
    });

    await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${teacherA.body.token}`)
      .send({
        teacherId: teacherA.body.teacherId,
        blobData: JSON.stringify({ attState: { Alice: 'P' }, assessScores: {}, workflows: [] })
      });

    await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${teacherB.body.token}`)
      .send({
        teacherId: teacherB.body.teacherId,
        blobData: JSON.stringify({ attState: { Bob: 'A' }, assessScores: {}, workflows: [] })
      });

    const pullRes = await request(app)
      .get('/api/sync/pull')
      .query({ teacherId: teacherA.body.teacherId, since: 0 })
      .set('Authorization', `Bearer ${teacherA.body.token}`);

    expect(pullRes.status).toBe(200);
    expect(pullRes.body.data).toHaveLength(1);
    expect(pullRes.body.data[0].blobData).toContain('Alice');
    expect(pullRes.body.data[0].blobData).not.toContain('Bob');
  });
});
