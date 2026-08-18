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

describe('EduCare API security controls', () => {
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

  it('applies explicit security headers and blocks requests above the configured rate limits', async () => {
    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.headers['x-dns-prefetch-control']).toBe('off');
    expect(healthRes.headers['x-frame-options']).toBe('SAMEORIGIN');

    const registerPayload = {
      name: 'Rate Limited Teacher',
      password: 'StrongPass123!'
    };

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/teacher/register').send(registerPayload);
      if (res.status === 429) {
        expect(res.body.error).toMatch(/too many requests/i);
        return;
      }
    }

    throw new Error('Expected a 429 rate-limit response for repeated registration attempts');
  });
});
