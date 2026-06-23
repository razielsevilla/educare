import { getStore, saveStore, addStudent, fillMockData, getStudents, getAssessments, getSubmissions, getAttState } from './store.js';
import { registerTeacher, pullSync, pushSync, startBackgroundSync } from './sync.js';

// Expose store globally so inline scripts in index.html still work without breaking
window.getStore = getStore;
window.saveStore = saveStore;
window.pushSync = () => { pushSync(); if(window.renderDynamicScreens) window.renderDynamicScreens(); };
window.addStudent = (name) => { addStudent(name); window.pushSync(); };
window.fillMockData = () => { fillMockData(); window.pushSync(); location.reload(); };

// Risk Computation Engine
window.computeRisk = (student) => {
  const attState = getAttState();
  const assessments = getAssessments();
  const submissions = getSubmissions();

  // 1. Attendance Risk
  // Note: we only store current day's attendance in attState mapping for this prototype.
  // To make it interesting, we'll assign pseudo-random risk if the user used fillMockData,
  // or base it on mock metrics. But since we want dynamic, we'll look at the actual data.
  // Actually, we need to track historical absences for the risk engine to be robust. 
  // For V1, we'll use a deterministic hash of the student's name to generate fake historical data
  // combined with their real current attendance/assessment data.
  
  let scoreSum = 0;
  let scoreCount = 0;
  let hwTotal = 0;
  let hwSubmitted = 0;

  assessments.forEach(a => {
    const sub = submissions[a.id]?.[student];
    if (sub) {
      if (a.type === 'in-class' && sub.score !== null && sub.score !== '') {
        scoreSum += (sub.score / a.maxScore) * 100;
        scoreCount++;
      }
      if (a.type === 'take-home') {
        hwTotal++;
        if (sub.submitted) hwSubmitted++;
      }
    }
  });

  const avgScore = scoreCount > 0 ? scoreSum / scoreCount : 100;
  const hwRate = hwTotal > 0 ? hwSubmitted / hwTotal : 1.0;
  const currentAtt = attState[student];

  let reasons = [];
  let tier = 'clear'; // clear, monitoring, flagged, critical

  if (currentAtt === 'A') {
    reasons.push('Absent today');
    tier = 'monitoring';
  } else if (currentAtt === 'L') {
    reasons.push('Late today');
  }

  if (avgScore < 75) {
    reasons.push(`Low average score (${Math.round(avgScore)}%)`);
    tier = 'critical';
  } else if (avgScore < 85) {
    reasons.push(`Declining score (${Math.round(avgScore)}%)`);
    tier = tier === 'clear' ? 'flagged' : tier;
  }

  if (hwTotal > 0) {
    if (hwRate === 0) {
      reasons.push('0% homework compliance');
      tier = 'critical';
    } else if (hwRate < 0.6) {
      reasons.push('Low homework compliance');
      tier = tier === 'clear' || tier === 'monitoring' ? 'flagged' : tier;
    }
  }

  return { tier, reasons };
};

// Expose accessors
window.getStoreStudents = getStudents;
window.getStoreAssessments = getAssessments;
window.getStoreSubmissions = getSubmissions;
window.getStoreAttState = getAttState;

window.renderDynamicScreens = () => {
  const students = getStudents();
  let critical = [];
  let flagged = [];
  let monitoring = [];
  let clear = [];

  students.forEach(s => {
    const { tier, reasons } = window.computeRisk(s);
    const obj = { name: s, initials: s.split(' ').map(x=>x[0]).join('').substring(0,2), reasons };
    if (tier === 'critical') critical.push(obj);
    else if (tier === 'flagged') flagged.push(obj);
    else if (tier === 'monitoring') monitoring.push(obj);
    else clear.push(obj);
  });

  // Render Roster
  const rosterContainer = document.getElementById('rosterContainer');
  if (rosterContainer) {
    let html = '';
    const renderSection = (title, list, badgeClass) => {
      if (list.length === 0) return '';
      let sHtml = `<div class="section-header">${title} &middot; ${list.length}</div><div style="padding:0 20px 0;"><div class="card" style="margin-bottom:10px;">`;
      list.forEach(s => {
        sHtml += `
          <div class="student-row" onclick="openProfile('${s.name}')">
            <div class="avatar-ring ${badgeClass.replace('badge-','')}">
              <div class="avatar avatar-md">${s.initials}</div>
            </div>
            <div class="student-info">
              <div class="student-name">${s.name}</div>
              <div class="student-meta">${s.reasons.length > 0 ? s.reasons.join(' &middot; ') : 'All signals normal'}</div>
            </div>
            <span class="badge ${badgeClass}">${title}</span>
          </div>`;
      });
      sHtml += `</div></div>`;
      return sHtml;
    };
    html += renderSection('Critical', critical, 'badge-critical');
    html += renderSection('Flagged', flagged, 'badge-flagged');
    html += renderSection('Monitoring', monitoring, 'badge-monitoring');
    html += renderSection('Clear', clear, 'badge-clear');
    if(students.length === 0) {
        html = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No students. Click Fill Mock Data to start.</div>';
    }
    rosterContainer.innerHTML = html;
  }

  // Render Discovery
  const discoveryContainer = document.getElementById('discoveryContainer');
  if (discoveryContainer) {
    let html = '';
    const renderDiscoverySection = (title, list, badgeClass) => {
      if (list.length === 0) return '';
      let sHtml = `<div class="section-header">${title} &middot; ${list.length}</div><div style="padding:0 20px 0;"><div class="card" style="margin-bottom:10px;">`;
      list.forEach(s => {
        sHtml += `
          <div class="student-row" onclick="navTo('screen-care')">
            <div class="avatar-ring ${badgeClass.replace('badge-','')}">
              <div class="avatar avatar-md">${s.initials}</div>
            </div>
            <div class="student-info">
              <div class="student-name">${s.name}</div>
              <div class="student-meta">${s.reasons.join(' &middot; ')}</div>
            </div>
            <i class="ti ti-chevron-right" style="color:var(--neutral-400);font-size:18px;"></i>
          </div>`;
      });
      sHtml += `</div></div>`;
      return sHtml;
    };
    html += renderDiscoverySection('Critical', critical, 'badge-critical');
    html += renderDiscoverySection('Flagged', flagged, 'badge-flagged');
    if(critical.length === 0 && flagged.length === 0) {
        html = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No students require attention right now.</div>';
    }
    discoveryContainer.innerHTML = html;
  }

  // Render Response
  const responseContainer = document.getElementById('responseContainer');
  if (responseContainer) {
    let html = '';
    if (critical.length > 0) {
      html += `
        <div style="margin:16px 20px 0;">
          <div style="font-size:13px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px;">
            Pending Check-ins
          </div>
          <div class="card">`;
      critical.forEach(s => {
        html += `
            <div class="student-row" onclick="navTo('screen-care')">
              <div class="avatar-ring critical">
                <div class="avatar avatar-md">${s.initials}</div>
              </div>
              <div class="student-info">
                <div class="student-name">${s.name}</div>
                <div class="student-meta">Intervention required</div>
              </div>
              <i class="ti ti-chevron-right" style="color:var(--neutral-400);font-size:18px;"></i>
            </div>`;
      });
      html += `</div></div>`;
    } else {
        html = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No active workflows.</div>';
    }
    responseContainer.innerHTML = html;
  }
  // Render Recovery
  const recoveryContainer = document.getElementById('recoveryContainer');
  if (recoveryContainer) {
    let html = '';
    if (monitoring.length > 0) {
      html += `
        <div class="section-header">In Shadow Monitoring &middot; ${monitoring.length}</div>
        <div style="padding:0 20px 0;">
          <div class="card" style="margin-bottom:10px;">`;
      monitoring.forEach(s => {
        html += `
            <div class="student-row" onclick="openProfile('${s.name}')">
              <div class="avatar-ring monitoring">
                <div class="avatar avatar-md">${s.initials}</div>
              </div>
              <div class="student-info">
                <div class="student-name">${s.name}</div>
                <div class="student-meta">Monitoring signals</div>
              </div>
              <span class="badge badge-monitoring">Watching</span>
            </div>`;
      });
      html += `</div></div>`;
    } else {
        html = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No students in recovery phase.</div>';
    }
    recoveryContainer.innerHTML = html;
  }

  // Update navbar badges if they exist
  const discoveryBadge = document.querySelector('.nav-item[data-target="screen-discovery"] .nav-badge');
  if (discoveryBadge) {
    const totalDiscovery = critical.length + flagged.length;
    discoveryBadge.style.display = totalDiscovery > 0 ? 'flex' : 'none';
    discoveryBadge.textContent = totalDiscovery;
  }

  const responseBadge = document.querySelector('.nav-item[data-target="screen-response"] .nav-badge');
  if (responseBadge) {
    responseBadge.style.display = critical.length > 0 ? 'flex' : 'none';
    responseBadge.textContent = critical.length;
  }
};

// Example of integrating with the UI
async function initApp() {
  console.log('App initialized.');
  window.renderDynamicScreens();
  
  let state = getStore();
  
  if (!state.teacherId) {
    console.log('Registering teacher...');
    await registerTeacher('Demo Teacher');
  }

  // Pull latest data on load
  await pullSync();
  
  // Start background sync polling (single instance with UI refresh callback)
  startBackgroundSync(() => {
    console.log('Data synced from server. Rerendering UI...');
    if (window.renderDynamicScreens) window.renderDynamicScreens();
  });
}

// Ensure the prototype's hardcoded state can be synced
// Called from index.html inline scripts for attendance, assessments, submissions
window.syncLocalStateToBackend = function(key, val) {
  const state = getStore();
  if (key === 'attState') {
    state.attState = val;
  } else if (key === 'assessments') {
    state.assessments = val;
  } else if (key === 'submissions') {
    state.submissions = val;
  } else if (key === 'workflows') {
    state.workflows = val;
  }
  saveStore(state);
  pushSync();
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // Register service worker for offline PWA support
  // (Capacitor handles offline natively, so this is only for web/PWA installs)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Service worker registered:', reg.scope);
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }
});
