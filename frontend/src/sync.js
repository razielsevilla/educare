// src/sync.js
import { getStore, saveStore, getSyncBlob, applySyncBlob } from './store.js';

const API_BASE = 'http://localhost:3000/api';

export const registerTeacher = async (name) => {
  try {
    const res = await fetch(`${API_BASE}/teacher/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.status === 'success') {
      const state = getStore();
      state.teacherId = data.teacherId;
      state.teacherName = name;
      saveStore(state);
      return data.teacherId;
    }
    throw new Error(data.error);
  } catch (err) {
    console.error('Registration failed:', err);
    throw err;
  }
};

export const pushSync = async () => {
  const state = getStore();
  if (!state.teacherId) return;

  const blobData = getSyncBlob();
  
  try {
    const res = await fetch(`${API_BASE}/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: state.teacherId,
        blobData
      })
    });
    const data = await res.json();
    if (data.status === 'success') {
      console.log('Successfully pushed local changes.');
    }
  } catch (err) {
    console.error('Push sync failed:', err);
  }
};

export const pullSync = async () => {
  const state = getStore();
  if (!state.teacherId) return;

  try {
    const res = await fetch(`${API_BASE}/sync/pull?teacherId=${state.teacherId}&since=${state.lastSyncId}`);
    const data = await res.json();
    if (data.status === 'success' && data.data && data.data.length > 0) {
      // Apply the latest blob (for V1, we just take the last one)
      const latestBlob = data.data[data.data.length - 1];
      applySyncBlob(latestBlob.blobData, latestBlob.id);
      console.log('Successfully pulled remote changes.');
      return true; // Indicates data was updated
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
