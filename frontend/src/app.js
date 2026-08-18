import { getStore, saveStore, addStudent, addClass, fillMockData, getStudents, getAssessments, getSubmissions, getAttState, getAttendanceWindow, moveToRecovery, getWorkflows, getOrCreateAuthPassword } from './store.js';
import { registerTeacher, loginTeacher, pullSync, pushSync, startBackgroundSync } from './sync.js';

// Expose store globally so inline scripts in index.html still work without breaking
window.getStore = getStore;
window.saveStore = saveStore;
window.pushSync = () => { pushSync(); if(window.renderDynamicScreens) window.renderDynamicScreens(); };
window.addStudent = (name, className) => { addStudent(name, className); window.pushSync(); };
window.addClass = (className, isAdvisory) => { addClass(className, isAdvisory); window.pushSync(); };
window.fillMockData = () => { fillMockData(); window.pushSync(); location.reload(); };
window.clearLocalState = () => { localStorage.clear(); location.reload(); };
window.moveToRecovery = (name) => { moveToRecovery(name); window.pushSync(); };
window.getWorkflows = getWorkflows;

// Risk Computation Engine
export const computeRisk = (student) => {
  const attState = getAttState();
  const assessments = getAssessments();
  const submissions = getSubmissions();
  const attendanceWindow = getAttendanceWindow(student, 14);
  const absencesInWindow = attendanceWindow.filter((entry) => entry.status === 'A');

  const isClusteredAbsencePattern = (entries) => {
    if (entries.length < 3) return false;
    const dates = entries
      .map((entry) => new Date(`${entry.date}T00:00:00`))
      .sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0].getTime();
    const end = dates[dates.length - 1].getTime();
    return (end - start) <= 7 * 24 * 60 * 60 * 1000;
  };

  const historyScores = assessments
    .map((assessment) => {
      const sub = submissions[assessment.id]?.[student];
      if (!sub || sub.score === null || sub.score === '' || sub.score === undefined) return null;
      if (assessment.type !== 'in-class') return null;
      return (Number(sub.score) / Number(assessment.maxScore || 1)) * 100;
    })
    .filter((score) => score !== null && Number.isFinite(score));

  const computeStdDev = (values) => {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  };

  const latestScore = historyScores.length > 0 ? historyScores[historyScores.length - 1] : null;
  const baselineMean = historyScores.length > 0 ? historyScores.reduce((sum, score) => sum + score, 0) / historyScores.length : null;
  const baselineStdDev = historyScores.length > 0 ? computeStdDev(historyScores) : 0;
  const baselineWarning = historyScores.length >= 4 && latestScore !== null && baselineMean !== null && baselineStdDev > 0
    ? latestScore < baselineMean - (1.5 * baselineStdDev)
    : false;

  // 1. Attendance Risk
  // Use the FE-1 attendance log to compute a rolling 14-day absence pattern.
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

  if (absencesInWindow.length >= 3) {
    const clustered = isClusteredAbsencePattern(absencesInWindow);
    reasons.push(`${absencesInWindow.length} absences in the last 14 days`);
    reasons.push(clustered ? 'Clustered absence pattern' : 'Scattered absence pattern');
    tier = 'critical';
  }

  if (baselineWarning && latestScore !== null && baselineMean !== null) {
    reasons.push(`Baseline drop: ${Math.round(latestScore)}% vs. ${Math.round(baselineMean)}% personal baseline`);
    tier = tier === 'clear' ? 'flagged' : tier;
  }

  if (currentAtt === 'A') {
    reasons.push('Absent today');
    tier = tier === 'clear' ? 'monitoring' : tier;
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

window.computeRisk = computeRisk;

// Expose accessors
window.getStoreStudents = getStudents;
window.getStoreAssessments = getAssessments;
window.getStoreSubmissions = getSubmissions;
window.getStoreAttState = getAttState;

window.currentRosterFilter = 'All';
window.currentRosterSearch = '';

window.setRosterFilter = function(filterVal, btnEl) {
  window.currentRosterFilter = filterVal;
  
  if (btnEl && btnEl.parentElement) {
    const buttons = btnEl.parentElement.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn === btnEl) {
        btn.className = 'btn-sm';
        btn.style.padding = '6px 14px';
      } else {
        btn.className = 'btn-sm-ghost';
        btn.style.padding = '5px 12px';
      }
    });
  }
  
  window.renderDynamicScreens();
};

window.handleRosterSearch = function(searchVal) {
  window.currentRosterSearch = searchVal;
  window.renderDynamicScreens();
};

window.renderDynamicScreens = () => {
  const store = getStore();
  const teacherNameEl = document.querySelector('.greeting-name');
  if (teacherNameEl && store.teacherName) {
    teacherNameEl.textContent = store.teacherName;
  }

  const students = getStudents();
  const workflows = getWorkflows();
  const recoveryStudentsList = workflows.filter(w => w.stage === 'recovery').map(w => w.student);

  let critical = [];
  let flagged = [];
  let monitoring = [];
  let clear = [];

  const searchQuery = (window.currentRosterSearch || '').trim().toLowerCase();

  students.forEach(s => {
    // 1. Search Query filter (match name)
    if (searchQuery && !s.toLowerCase().includes(searchQuery)) {
      return;
    }

    const { tier, reasons } = window.computeRisk(s);
    
    // Determine actual tier
    let actualTier = 'Clear';
    if (recoveryStudentsList.includes(s)) {
      actualTier = 'Monitoring';
    } else {
      if (tier === 'critical') actualTier = 'Critical';
      else if (tier === 'flagged' || tier === 'monitoring') actualTier = 'Flagged';
      else actualTier = 'Clear';
    }

    // 2. Active Tab filter
    const activeFilter = window.currentRosterFilter || 'All';
    if (activeFilter !== 'All' && actualTier !== activeFilter) {
      return;
    }

    const obj = { name: s, initials: s.split(' ').map(x=>x[0]).join('').substring(0,2), reasons };
    
    if (actualTier === 'Monitoring') {
      monitoring.push(obj);
    } else if (actualTier === 'Critical') {
      critical.push(obj);
    } else if (actualTier === 'Flagged') {
      flagged.push(obj);
    } else {
      clear.push(obj);
    }
  });

  // Update Dashboard Class Switcher
  const classNameEl = document.getElementById('dash-class-name');
  const classTypeEl = document.getElementById('dash-class-type');
  if (classNameEl && classTypeEl) {
    if (students.length === 0) {
      classNameEl.textContent = 'No Class Selected';
      classTypeEl.innerHTML = '<i class="ti ti-alert-circle" style="color:var(--neutral-400);"></i> Tap to Populate';
    } else {
      const currentClass = window.currentClass || { name: 'Grade 5 — Sampaguita', isAdvisory: true };
      classNameEl.textContent = currentClass.name;
      if (currentClass.isAdvisory) {
        classTypeEl.innerHTML = '<i class="ti ti-star" style="color:var(--amber);"></i> Advisory Class';
      } else {
        classTypeEl.innerHTML = '<i class="ti ti-book" style="color:var(--info);"></i> Subject Class';
      }
    }
  }

  // Update Class Summary stats card
  const statsCardEl = document.getElementById('dash-class-stats-card');
  const statAttendanceEl = document.getElementById('stat-attendance');
  const statHomeworkEl = document.getElementById('stat-homework');
  const statGradesEl = document.getElementById('stat-grades');
  
  if (statsCardEl) {
    if (students.length === 0) {
      statsCardEl.style.display = 'none';
    } else {
      statsCardEl.style.display = 'block';
      
      // 1. Attendance Rate
      const attState = getAttState();
      let present = 0;
      let totalAtt = 0;
      students.forEach(s => {
        if (attState[s]) {
          totalAtt++;
          if (attState[s] === 'P') present++;
        }
      });
      const attRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : null;
      if (statAttendanceEl) {
        statAttendanceEl.textContent = attRate !== null ? `${attRate}%` : 'Not marked';
      }
      
      // 2. Homework Compliance
      let totalHwAssigned = 0;
      let totalHwSubmitted = 0;
      const assessments = getAssessments();
      const submissions = getSubmissions();
      assessments.forEach(a => {
        if (a.type === 'take-home') {
          students.forEach(s => {
            totalHwAssigned++;
            if (submissions[a.id]?.[s]?.submitted) {
              totalHwSubmitted++;
            }
          });
        }
      });
      const hwCompliance = totalHwAssigned > 0 ? Math.round((totalHwSubmitted / totalHwAssigned) * 100) : null;
      if (statHomeworkEl) {
        statHomeworkEl.textContent = hwCompliance !== null ? `${hwCompliance}%` : 'No tasks';
      }
      
      // 3. Average Grade
      let classGradeSum = 0;
      let classGradeCount = 0;
      assessments.forEach(a => {
        if (a.type === 'in-class') {
          students.forEach(s => {
            const sub = submissions[a.id]?.[s];
            if (sub && sub.score !== null && sub.score !== '') {
              classGradeSum += (sub.score / a.maxScore) * 100;
              classGradeCount++;
            }
          });
        }
      });
      const avgGrade = classGradeCount > 0 ? Math.round(classGradeSum / classGradeCount) : null;
      if (statGradesEl) {
        statGradesEl.textContent = avgGrade !== null ? `${avgGrade}%` : 'No grades';
      }
    }
  }

  // ── UPDATE GREETING NOTIFICATION BANNER ──
  const greetingBannerEl = document.getElementById('greeting-notification-banner');
  const greetingTextEl = document.getElementById('greeting-notification-text');
  if (greetingBannerEl && greetingTextEl) {
    if (students.length === 0) {
      greetingBannerEl.style.display = 'block';
      greetingTextEl.innerHTML = 'Welcome to EduCare! Tap <strong>Populate</strong> or click the Class Switcher to select a class and load student records.';
    } else {
      greetingBannerEl.style.display = 'block';
      
      // Check attendance
      const attState = getAttState();
      const hasMarkedAttendance = Object.keys(attState).length > 0;
      const flaggedCount = critical.length + flagged.length;
      
      if (!hasMarkedAttendance) {
        greetingTextEl.innerHTML = '<strong>Action required today</strong>: You have not marked attendance yet today. Please take attendance for your class.';
      } else if (flaggedCount > 0) {
        greetingTextEl.innerHTML = `<strong>Class Update</strong>: Attendance is complete. There are currently <strong>${flaggedCount}</strong> students flagged with warnings who require active support.`;
      } else {
        greetingTextEl.innerHTML = '<strong>All clear</strong>: Attendance is complete, and all student signals are normal. Have a great teaching day!';
      }
    }
  }

  // Update Dashboard Class Health numbers
  const discoveredEl = document.getElementById('dash-health-discovered');
  const responsesEl = document.getElementById('dash-health-responses');
  const recoveryEl = document.getElementById('dash-health-recovery');
  if (discoveredEl) discoveredEl.textContent = students.length === 0 ? '0' : (critical.length + flagged.length);
  if (responsesEl) responsesEl.textContent = students.length === 0 ? '0' : critical.length;
  if (recoveryEl) recoveryEl.textContent = students.length === 0 ? '0' : monitoring.length;

  // Update Discovery Screen Subtitle
  const discoverySubEl = document.getElementById('discovery-header-sub');
  if (discoverySubEl) {
    if (students.length === 0) {
      discoverySubEl.textContent = 'No students loaded';
    } else {
      const currentClass = window.currentClass || { name: 'Grade 5 — Sampaguita', isAdvisory: true };
      const totalDiscovery = critical.length + flagged.length;
      discoverySubEl.textContent = `${totalDiscovery} students flagged · ${currentClass.name}`;
    }
  }

  // Update Roster Screen Subtitle
  const rosterSubEl = document.querySelector('#screen-students .screen-header-sub');
  if (rosterSubEl) {
    if (students.length === 0) {
      rosterSubEl.textContent = 'No students loaded';
    } else {
      const currentClass = window.currentClass || { name: 'Grade 5 — Sampaguita', isAdvisory: true };
      rosterSubEl.textContent = `${currentClass.name} · ${students.length} students`;
    }
  }

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
    const totalRendered = critical.length + flagged.length + monitoring.length + clear.length;
    if (students.length > 0 && totalRendered === 0) {
        html = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No students match the search/filter criteria.</div>';
    } else if (students.length === 0) {
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

  // Update navbar badges dynamically across all screens
  const totalDiscovery = critical.length + flagged.length;
  document.querySelectorAll('.nav-item[data-target="screen-discovery"] .nav-badge').forEach(badge => {
    badge.style.display = totalDiscovery > 0 ? 'flex' : 'none';
    badge.textContent = totalDiscovery;
  });

  document.querySelectorAll('.nav-item[data-target="screen-response"] .nav-badge').forEach(badge => {
    badge.style.display = critical.length > 0 ? 'flex' : 'none';
    badge.textContent = critical.length;
  });
};

// Example of integrating with the UI
async function initApp() {
  console.log('App initialized.');
  window.renderDynamicScreens();
  
  let state = getStore();
  const authPassword = getOrCreateAuthPassword();

  if (!state.teacherId) {
    console.log('Registering teacher...');
    await registerTeacher(state.teacherName || 'Demo Teacher', authPassword);
  } else {
    const refreshed = await loginTeacher(state.teacherId, authPassword);
    if (!refreshed) {
      // Token expired/missing and this device is unknown to the backend (e.g. a
      // fresh/reset database) — bootstrap a new account rather than sync failing silently.
      console.log('Session could not be refreshed; registering a new teacher account...');
      await registerTeacher(state.teacherName || 'Demo Teacher', authPassword);
    }
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

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Register service worker for offline PWA support
    // (Capacitor handles offline natively, so this is only for web/PWA installs)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('Service worker registered:', reg.scope);
      }).catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  });
}
