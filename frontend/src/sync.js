// src/sync.js
import { getStore, saveStore, getSyncBlob, applySyncBlob } from './store.js';

const PC_IP = '192.168.100.32';
const hostname = window.location.hostname;
const API_BASE = (hostname === 'localhost' || hostname === '127.0.0.1') 
  ? `http://${PC_IP}:3000/api` 
  : `http://${hostname}:3000/api`;

export const registerTeacher = async (name, password = 'demo-teacher-password') => {
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

export const pushSync = async () => {
  const state = getStore();
  if (!state.teacherId) return;

  const blobData = getSyncBlob();

  try {
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
      const latestBlob = data.data[data.data.length - 1];
      applySyncBlob(latestBlob.blobData, latestBlob.id);
      console.log('Successfully pulled remote changes.');
      return true;
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
