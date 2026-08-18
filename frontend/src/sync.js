// src/sync.js
import { getStore, saveStore, getSyncBlob, applySyncBlob } from './store.js';

const hostname = (typeof window !== 'undefined' && window.location) ? window.location.hostname : 'localhost';
const defaultApiBase = (hostname === 'localhost' || hostname === '127.0.0.1')
  ? 'http://127.0.0.1:3000/api'
  : `http://${hostname}:3000/api`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase;

export const registerTeacher = async (name, password) => {
  if (!password) {
    throw new Error('A password is required to register a teacher account');
  }

  try {
    const res = await fetch(`${API_BASE}/teacher/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password })
    });
    const data = await res.json();
    if (data.status === 'success') {
      const state = getStore();
      state.teacherId = data.teacherId;
      state.teacherName = name;
      state.authToken = data.token;
      saveStore(state);
      return data.teacherId;
    }
    throw new Error(data.error);
  } catch (err) {
    console.error('Registration failed:', err);
    throw err;
  }
};

// Refreshes the session token for an existing teacherId (e.g. after the 7-day token
// expires, or after localStorage-clearing/reinstall on a device that still knows its
// auth password). Returns false rather than throwing so callers can fall back to
// registerTeacher() when there's nothing to recover.
export const loginTeacher = async (teacherId, password) => {
  try {
    const res = await fetch(`${API_BASE}/teacher/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId, password })
    });
    const data = await res.json();
    if (data.status === 'success') {
      const state = getStore();
      state.authToken = data.token;
      saveStore(state);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Login failed:', err);
    return false;
  }
};

export const pushSync = async () => {
  const state = getStore();
  if (!state.teacherId) return;

  try {
    const blobData = await getSyncBlob();

    const res = await fetch(`${API_BASE}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.authToken || ''}`
      },
      body: JSON.stringify({
        teacherId: state.teacherId,
        blobData
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      console.log('Successfully pushed local changes.');
    } else {
      console.error('Push sync rejected:', data.error);
    }
  } catch (err) {
    console.error('Push sync failed:', err);
  }
};

export const pullSync = async () => {
  const state = getStore();
  if (!state.teacherId) return;

  try {
    const res = await fetch(`${API_BASE}/sync/pull?teacherId=${state.teacherId}&since=${state.lastSyncId}`, {
      headers: {
        'Authorization': `Bearer ${state.authToken || ''}`
      }
    });
    const data = await res.json();
    if (data.status === 'success' && data.data && data.data.length > 0) {
      let updated = false;
      for (const row of data.data) {
        const applied = await applySyncBlob(row.blobData, row.id);
        updated = updated || applied;
      }

      if (updated) {
        console.log('Successfully pulled remote changes.');
      }
      return updated;
    }
    return false;
  } catch (err) {
    console.error('Pull sync failed:', err);
    return false;
  }
};

// Start a background sync poller
export const startBackgroundSync = (onDataUpdated) => {
  setInterval(async () => {
    const updated = await pullSync();
    if (updated && onDataUpdated) {
      onDataUpdated();
    }
  }, 10000); // Poll every 10 seconds
};
