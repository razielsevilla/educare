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

describe('EduCare teacher login (session refresh)', () => {
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

  it('issues a fresh, working token for the correct teacherId + password', async () => {
    const registerRes = await request(app).post('/api/teacher/register').send({
      name: 'Returning Teacher',
      password: 'CorrectHorse1!'
    });
    const { teacherId } = registerRes.body;

    const loginRes = await request(app).post('/api/teacher/login').send({
      teacherId,
      password: 'CorrectHorse1!'
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.status).toBe('success');
    expect(loginRes.body.teacherId).toBe(teacherId);
    expect(loginRes.body.token).toMatch(/\S+/);

    // The refreshed token must actually work against protected endpoints.
    const pullRes = await request(app)
      .get('/api/sync/pull')
      .query({ teacherId, since: 0 })
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(pullRes.status).toBe(200);
  });

  it('rejects login with the wrong password', async () => {
    const registerRes = await request(app).post('/api/teacher/register').send({
      name: 'Wrong Password Teacher',
      password: 'CorrectHorse1!'
    });
    const { teacherId } = registerRes.body;

    const loginRes = await request(app).post('/api/teacher/login').send({
      teacherId,
      password: 'IncorrectHorse!'
    });

    expect(loginRes.status).toBe(401);
  });

  it('rejects login for an unknown teacherId', async () => {
    const loginRes = await request(app).post('/api/teacher/login').send({
      teacherId: '11111111-1111-4111-8111-111111111111',
      password: 'WhateverPass1!'
    });

    expect(loginRes.status).toBe(401);
  });

  it('rejects malformed login requests before touching the database', async () => {
    const missingPasswordRes = await request(app).post('/api/teacher/login').send({
      teacherId: '11111111-1111-4111-8111-111111111111'
    });
    expect(missingPasswordRes.status).toBe(400);

    const badUuidRes = await request(app).post('/api/teacher/login').send({
      teacherId: 'not-a-uuid',
      password: 'WhateverPass1!'
    });
    expect(badUuidRes.status).toBe(400);
  });
});
