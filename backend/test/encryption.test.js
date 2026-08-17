import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptSyncBlob, decryptSyncBlob } from '../../frontend/src/crypto.js';

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

describe('EduCare encrypted sync payloads', () => {
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

  it('rejects raw JSON sync payloads and preserves encrypted blobs that decrypt back to the original state', async () => {
    const registerRes = await request(app).post('/api/teacher/register').send({
      name: 'Encrypted Teacher',
      password: 'StrongPass123!'
    });

    const { teacherId, token } = registerRes.body;
    const plaintext = JSON.stringify({
      attState: { Alice: 'A', Bob: 'P' },
      assessScores: { Alice: 88 },
      workflows: [{ student: 'Alice', stage: 'monitoring' }]
    });
    const rawJsonBlob = JSON.stringify({ attState: { Eve: 'A' } });

    const rawJsonRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ teacherId, blobData: rawJsonBlob });

    expect(rawJsonRes.status).toBe(400);
    expect(rawJsonRes.body.error).toMatch(/encrypted payload/i);

    const encryptedBlob = await encryptSyncBlob(plaintext, 'teacher-passphrase', teacherId);
    expect(encryptedBlob).toMatch(/^enc:v1:/);
    expect(encryptedBlob).not.toContain('Alice');

    const pushRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${token}`)
      .send({ teacherId, blobData: encryptedBlob });

    expect(pushRes.status).toBe(200);

    const pulled = await request(app)
      .get('/api/sync/pull')
      .query({ teacherId, since: 0 })
      .set('Authorization', `Bearer ${token}`);

    expect(pulled.status).toBe(200);
    expect(pulled.body.data).toHaveLength(1);
    expect(pulled.body.data[0].blobData).not.toContain('Alice');
    expect(pulled.body.data[0].blobData).not.toContain('Bob');

    const decrypted = await decryptSyncBlob(pulled.body.data[0].blobData, 'teacher-passphrase', teacherId);
    expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
  });
});
