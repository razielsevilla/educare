import { getStore, getStudents, getAttState, getAssessments, getSubmissions, getWorkflows } from './store.js';

export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ── STATE ──
    let pinVal = '';
    let selectedAction = 'ac1';
    let outcomeSelected = 'improving';
    let careCurrentStep = 1;

    // Use dynamic store for state
    
    



    // ── PERSONA DATABASE ──
    const personaData = {
      'Maria Santos': {
        initials: 'MS', color: 'critical', statusText: 'Critical — 3 active concerns',
        meta: 'LRN 10230001 · Grade 5, Section Sampaguita',
        stats: [
          { num: 5, color: 'var(--critical)', lbl: 'Absences' },
          { num: 67, color: 'var(--flagged)', lbl: 'Avg Score' },
          { num: '40%', color: 'var(--flagged)', lbl: 'HW Rate' }
        ],
        insightsHtml: `
      <div class="insight-card critical" style="margin-bottom:8px;">
        <div class="insight-icon"><i class="ti ti-calendar-x"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--critical);">Attendance — Critical</div>
          <div style="font-size:12px;color:#791F1F;margin-top:3px;line-height:1.5;">Velocity Pattern: Absent 3 consecutive Mondays. Parent has not responded to 2 contact attempts.</div>
        </div>
      </div>
      <div class="insight-card flagged" style="margin-bottom:8px;">
        <div class="insight-icon"><i class="ti ti-trending-down"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--flagged);">Academic decline — Flagged</div>
          <div style="font-size:12px;color:#993C1D;margin-top:3px;line-height:1.5;">Baseline Anomaly: Sudden standard deviation drop in Math from A-average to C-average.</div>
        </div>
      </div>
      <div class="insight-card monitoring">
        <div class="insight-icon"><i class="ti ti-file-off"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--monitoring);">Homework — Monitoring</div>
          <div style="font-size:12px;color:var(--amber-deep);margin-top:3px;line-height:1.5;">3 of the last 5 homework assignments not submitted. Compliance rate: 40%.</div>
        </div>
      </div>`,
        triageHtml: `
      <div style="background:var(--critical-bg);border:1px solid #F7C1C1;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--critical);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Overall — Critical</div>
        <div style="font-size:14px;color:#791F1F;line-height:1.6;">Maria has 3 active concern signals simultaneously — attendance, academic, and homework. This combination places her at high risk of continued decline without intervention.</div>
      </div>`,
        actionTitle: 'One-on-one check-in',
        actionSub: 'Historically successful for this student. Generates context-aware script.',
        actionIcon: '<i class="ti ti-message-circle"></i>',
        promptsHtml: `
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Opening (Generative Context)</div>
      <div class="prompt-chip">"Maria, I noticed you were out recently and your science teacher noted you looked a bit exhausted. Are you getting enough rest at home?"</div>
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;margin-top:12px;">Academic</div>
      <div class="prompt-chip">"Your math scores dropped a bit sharply recently. Is there a specific topic that's been hard to follow?"</div>
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;margin-top:12px;">Student-Specific Anti-Pattern</div>
      <div style="background:var(--critical-bg);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--critical);line-height:1.6;margin-bottom:14px;">
        Avoid suggesting immediate parent involvement. LIS data indicates high household stress, and this could cause Maria to shut down.
      </div>`
      },
      'Dante Pascual': {
        initials: 'DP', color: 'critical', statusText: 'Critical — Behavioral anomaly',
        meta: 'LRN 10230045 · Grade 5, Section Sampaguita',
        stats: [
          { num: 3, color: 'var(--critical)', lbl: 'Incidents' },
          { num: 2, color: 'var(--amber)', lbl: 'Absences' },
          { num: '↓', color: 'var(--critical)', lbl: 'Peer Rel.' }
        ],
        insightsHtml: `
      <div class="insight-card critical" style="margin-bottom:8px;">
        <div class="insight-icon"><i class="ti ti-mood-sad"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--critical);">Behavioral — Critical</div>
          <div style="font-size:12px;color:#791F1F;margin-top:3px;line-height:1.5;">Sudden spike: 3 peer conflicts in 5 days. Not aligned with historical baseline.</div>
        </div>
      </div>
      <div class="insight-card flagged">
        <div class="insight-icon"><i class="ti ti-users-x"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--flagged);">Social Withdrawal</div>
          <div style="font-size:12px;color:#993C1D;margin-top:3px;line-height:1.5;">Reported by PE teacher: sitting out of group activities.</div>
        </div>
      </div>`,
        triageHtml: `
      <div style="background:var(--critical-bg);border:1px solid #F7C1C1;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--critical);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Overall — Escalation Recommended</div>
        <div style="font-size:14px;color:#791F1F;line-height:1.6;">Dante is showing sudden, uncharacteristic aggression and withdrawal. This indicates a potential external trigger requiring specialized counseling.</div>
      </div>`,
        actionTitle: 'Refer to counselor',
        actionSub: 'Escalate to school guidance — auto-fills referral note',
        actionIcon: '<i class="ti ti-user-heart"></i>',
        promptsHtml: `
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">De-escalation Check-in</div>
      <div class="prompt-chip">"Hey Dante, I wanted to check in. I know the yard has been loud lately. How are you feeling today?"</div>
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;margin-top:12px;">Counselor Handoff</div>
      <div class="prompt-chip">"Sometimes it helps to talk to Mr. Santos in the counseling office. He's really good at helping figure things out. Would you like to go see him?"</div>`
      },
      'Carla Garcia': {
        initials: 'CG', color: 'flagged', statusText: 'Flagged — Health & Routine',
        meta: 'LRN 10230012 · Grade 5, Section Sampaguita',
        stats: [
          { num: 6, color: 'var(--flagged)', lbl: 'Tardies' },
          { num: 4, color: 'var(--amber)', lbl: 'Clinic Vis.' },
          { num: 75, color: 'var(--monitoring)', lbl: 'Avg Score' }
        ],
        insightsHtml: `
      <div class="insight-card flagged" style="margin-bottom:8px;">
        <div class="insight-icon"><i class="ti ti-clock"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--flagged);">Routine — Flagged</div>
          <div style="font-size:12px;color:#993C1D;margin-top:3px;line-height:1.5;">Pattern detected: Late arrival 6 times in the last 2 weeks (averaging 25 mins late).</div>
        </div>
      </div>
      <div class="insight-card monitoring">
        <div class="insight-icon"><i class="ti ti-bed"></i></div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--monitoring);">Health — Monitoring</div>
          <div style="font-size:12px;color:var(--amber-deep);margin-top:3px;line-height:1.5;">4 clinic visits for headaches/fatigue. Often sleeping during first period.</div>
        </div>
      </div>`,
        triageHtml: `
      <div style="background:var(--monitoring-bg);border:1px solid #FFE4A0;border-radius:12px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:var(--amber-deep);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Overall — Parent Contact Needed</div>
        <div style="font-size:14px;color:var(--amber-deep);line-height:1.6;">Carla's tardiness and fatigue are impacting her morning classes. The pattern suggests a sleep or routine disruption at home.</div>
      </div>`,
        actionTitle: 'Contact parent/guardian',
        actionSub: 'Reach out to establish a supportive morning routine.',
        actionIcon: '<i class="ti ti-phone"></i>',
        promptsHtml: `
      <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Parent Call Guide</div>
      <div class="prompt-chip">"Hi Mr./Ms. Garcia, I'm calling to check on Carla. We've noticed she's been arriving tired and visiting the clinic. Is she having trouble sleeping?"</div>
      <div class="prompt-chip">"We want to support her morning routine. Is there anything changing at home that might be making mornings difficult right now?"</div>`
      }
    };

    function openProfile(studentName) {
      // Use data-driven profile generation (FE-6) instead of hardcoded personas
      let data = window.generateStudentProfileData(studentName);
      
      // For demo students, optionally preserve hardcoded rich content
      // (current implementation in generateStudentProfileData already includes demo content for Maria/Dante/Carla)
      if (data.demoMode && personaData[studentName]) {
        // Blend: use generated structure but preserve hardcoded rich content fields if present
        const hardcoded = personaData[studentName];
        data = { ...data, ...hardcoded, demoMode: true, studentName }; // merge but keep studentName
      }

      // Update Profile Screen
      const profileHero = document.querySelector('#screen-profile .profile-hero');
      if (profileHero) {
        profileHero.innerHTML = `
      <div class="avatar-ring ${data.color}" style="margin-top:16px;">
        <div class="avatar avatar-lg">${data.initials}</div>
      </div>
      <div class="profile-name">${studentName}</div>
      <div class="profile-meta">${data.meta}</div>
      <div style="margin-top:10px;"><span class="badge badge-${data.color}"><i class="ti ti-urgent"></i> ${data.statusText}</span></div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        ${data.stats.map(s => `
          <div class="stat-chip" style="min-width:72px;"><div class="num" style="color:${s.color};">${s.num}</div><div class="lbl">${s.lbl}</div></div>
        `).join('')}
      </div>
    `;
      }

      const profInsights = document.getElementById('prof-insights');
      if (profInsights) profInsights.innerHTML = data.insightsHtml;

      // Update Care Screen
      const topBarSub = document.querySelector('#screen-care .top-bar-sub');
      if (topBarSub) topBarSub.textContent = studentName;

      const careStep1 = document.getElementById('care-step-1');
      if (careStep1) {
        careStep1.innerHTML = `
      <div style="font-family:var(--serif);font-size:18px;font-weight:700;color:var(--deep-brown);margin-bottom:4px;">Triage Summary</div>
      <div style="font-size:13px;color:var(--mid-brown);margin-bottom:14px;">Here's why ${studentName.split(' ')[0]} needs your attention right now.</div>
      ${data.triageHtml}
      ${data.insightsHtml}
      <button class="btn-primary" onclick="careStep(2)" style="margin-top:16px;">Choose care action <i class="ti ti-arrow-right"></i></button>
    `;
      }

      // Update action cards highlight
      const ac1Title = document.querySelector('#ac1 .action-title');
      const ac1Sub = document.querySelector('#ac1 .action-sub');
      const ac1Icon = document.querySelector('#ac1 .action-icon');
      if (ac1Title) ac1Title.innerHTML = data.actionTitle + ' <span class="badge badge-monitoring" style="font-size:9px;padding:2px 6px;">✨ Recommended</span>';
      if (ac1Sub) ac1Sub.textContent = data.actionSub;
      if (ac1Icon) ac1Icon.innerHTML = data.actionIcon;

      const careStep3 = document.getElementById('care-step-3');
      if (careStep3) {
        careStep3.innerHTML = `
      <div style="font-family:var(--serif);font-size:18px;font-weight:700;color:var(--deep-brown);margin-bottom:4px;">Check-in guide</div>
      <div style="font-size:13px;color:var(--mid-brown);margin-bottom:14px;">Suggested conversation prompts for your check-in with ${studentName.split(' ')[0]}. Use your judgment — these are guides, not scripts.</div>
      ${data.promptsHtml}
      <button class="btn-primary" onclick="careStep(4)">Log outcome <i class="ti ti-arrow-right"></i></button>
      <div style="height:8px;"></div>
      <button class="btn-ghost" onclick="careStep(2)">Back</button>
      <div style="height:16px;"></div>
    `;
      }

      // Set default action selection
      selectAction('ac1');
      careStep(1);
      navTo('screen-profile');
    }
    // ───────────────────────

    // ── SPLIT-SCREEN DETAIL PANE CONTROLLER ──
    function openDetailView(viewName) {
      const sidePanel = document.querySelector('.dashboard-side');
      if (sidePanel) {
        sidePanel.classList.add('active-detail');
      }
      
      const defaultView = document.getElementById('dash-side-default');
      const attView = document.getElementById('side-view-attendance');
      const assessView = document.getElementById('side-view-assessment');
      const behaviorView = document.getElementById('side-view-behavior');
      
      if (defaultView) defaultView.style.display = 'none';
      if (attView) attView.style.display = 'none';
      if (assessView) assessView.style.display = 'none';
      if (behaviorView) behaviorView.style.display = 'none';
      
      document.querySelectorAll('.quick-action-card').forEach(card => {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--card-bg)';
      });
      
      const activeCard = document.getElementById(`qa-${viewName}`);
      if (activeCard) {
        activeCard.style.borderColor = 'var(--amber)';
        activeCard.style.background = 'var(--amber-bg)';
      }
      
      if (viewName === 'attendance') {
        if (attView) attView.style.display = 'flex';
        attRollCallIndex = -1;
        renderAttWorkspace();
      } else if (viewName === 'assessment') {
        if (assessView) assessView.style.display = 'flex';
        showAssessList();
      } else if (viewName === 'behavior') {
        if (behaviorView) behaviorView.style.display = 'flex';
        renderBehaviorGrid();
      }
    }

    function closeDetailView() {
      const sidePanel = document.querySelector('.dashboard-side');
      if (sidePanel) {
        sidePanel.classList.remove('active-detail');
      }
      
      document.querySelectorAll('.quick-action-card').forEach(card => {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--card-bg)';
      });
      
      const defaultView = document.getElementById('dash-side-default');
      const attView = document.getElementById('side-view-attendance');
      const assessView = document.getElementById('side-view-assessment');
      const behaviorView = document.getElementById('side-view-behavior');
      
      if (defaultView) defaultView.style.display = 'block';
      if (attView) attView.style.display = 'none';
      if (assessView) assessView.style.display = 'none';
      if (behaviorView) behaviorView.style.display = 'none';
    }

    // ── NAVIGATION ──
    function navTo(id) {
      if (id !== 'screen-dashboard') {
        closeDetailView();
      }
      document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
      });
      const target = document.getElementById(id);
      if (target) {
        target.style.display = 'flex';
        target.classList.add('active');
        target.querySelector('.scroll-area') && (target.querySelector('.scroll-area').scrollTop = 0);
      }

      // Update sidebar nav visibility and active state on desktop
      const mainScreens = ['screen-dashboard', 'screen-discovery', 'screen-response', 'screen-recovery', 'screen-students', 'screen-profile', 'screen-care'];
      const sideNav = document.querySelector('.sidebar-nav');
      if (mainScreens.includes(id)) {
        document.body.classList.add('sidebar-nav-visible');
        if (sideNav) sideNav.style.display = 'flex';
      } else {
        document.body.classList.remove('sidebar-nav-visible');
        if (sideNav) sideNav.style.display = 'none';
      }
      
      document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.target === id);
      });

      // Update active tab highlight across all bottom navs
      document.querySelectorAll('.nav-item[data-target]').forEach(item => {
        item.classList.toggle('active', item.dataset.target === id);
      });

      if (typeof tutorials !== 'undefined' && tutorials[id] && !tutorialSeen[id]) {
        setTimeout(() => startTutorial(id), 300);
      }
    }

    // ── SPLASH → SCREEN SELECT ──
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const storedTeacher = localStorage.getItem('educare_teacher_name');
      const storedClass = localStorage.getItem('educare_current_class');
      const hasPin = window.hasSecurityPinConfigured ? window.hasSecurityPinConfigured() : false;
      if (!storedTeacher || !storedClass || !hasPin) {
        navTo('screen-setup');
      } else {
        // Update PIN screen dynamically
        const pinAvatar = document.querySelector('.pin-avatar');
        const pinName = document.querySelector('.pin-name');
        const pinSub = document.querySelector('.pin-sub');
        if (pinName) pinName.textContent = storedTeacher;
        if (pinSub) pinSub.textContent = storedClass;
        if (pinAvatar) {
          const initials = storedTeacher.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
          pinAvatar.textContent = initials;
        }
        navTo('screen-pin');
        refreshBiometricButton();
        refreshPinLockMessage();
        }
      }, 2000);
    }

    // ── PIN ──
    function formatLockDelay(ms) {
      const seconds = Math.max(1, Math.ceil(ms / 1000));
      return `${seconds}s`;
    }

    function refreshPinLockMessage() {
      const pinStatus = document.getElementById('pin-status-msg');
      if (!pinStatus || !window.getPinLockStatus) return;

      const lock = window.getPinLockStatus();
      if (lock.isLocked) {
        pinStatus.textContent = `Too many attempts. Try again in ${formatLockDelay(lock.remainingMs)}.`;
      } else {
        pinStatus.textContent = 'Enter your PIN';
      }
    }

    async function refreshBiometricButton() {
      const btn = document.getElementById('pin-biometric-btn');
      if (!btn || !window.isBiometricAvailable) return;

      const info = await window.isBiometricAvailable();
      btn.style.display = info.available ? 'inline-block' : 'none';
    }

    async function handleBiometricUnlock() {
      if (!window.tryBiometricUnlock) {
        showToast('Biometric unlock is unavailable');
        return;
      }

      const result = await window.tryBiometricUnlock();
      if (result.ok) {
        pinVal = '';
        updatePinDots();
        navTo('screen-dashboard');
        showToast('Unlocked with biometrics');
        return;
      }

      if (result.reason === 'not-enrolled') {
        showToast('Use PIN once to enable biometric unlock');
      } else if (result.reason === 'unsupported') {
        showToast('Biometric unlock not available on this device');
      } else {
        showToast('Biometric unlock failed');
      }
    }

    function pinPress(d) {
      if (window.getPinLockStatus) {
        const lock = window.getPinLockStatus();
        if (lock.isLocked) {
          refreshPinLockMessage();
          showToast(`Try again in ${formatLockDelay(lock.remainingMs)}`);
          return;
        }
      }

      if (pinVal.length >= 4) return;
      pinVal += d;
      updatePinDots();
      if (pinVal.length === 4) {
        setTimeout(() => {
          const attemptedPin = pinVal;
          const result = window.verifySecurityPin ? window.verifySecurityPin(attemptedPin) : { ok: false, reason: 'invalid' };
          if (result.ok) {
            pinVal = '';
            updatePinDots();
            if (window.syncAfterUnlock) {
              window.syncAfterUnlock();
            }
            if (window.saveBiometricPin) {
              window.saveBiometricPin(attemptedPin);
            }
            navTo('screen-dashboard');
          } else {
            pinVal = '';
            updatePinDots();
            refreshPinLockMessage();
            if (result.reason === 'locked') {
              showToast(`Locked. Try again in ${formatLockDelay(result.remainingMs || 1000)}`);
            } else {
              showToast('Incorrect PIN');
            }
          }
        }, 400);
      }
    }
    function pinDel() {
      pinVal = pinVal.slice(0, -1);
      updatePinDots();
    }
    function updatePinDots() {
      for (let i = 1; i <= 4; i++) {
        document.getElementById('d' + i).classList.toggle('filled', i <= pinVal.length);
      }
    }

    // ── ADD STUDENT MODAL CONTROLS ──
    function openAddStudentModal() {
      const overlay = document.getElementById('add-student-overlay');
      const modal = document.getElementById('add-student-modal');
      if (overlay && modal) {
        overlay.style.display = 'block';
        modal.style.display = 'block';
        setTimeout(() => { modal.style.transform = 'translateY(0)'; }, 10);
      }
    }

    function closeAddStudentModal() {
      const overlay = document.getElementById('add-student-overlay');
      const modal = document.getElementById('add-student-modal');
      if (overlay && modal) {
        modal.style.transform = 'translateY(100%)';
        setTimeout(() => {
          overlay.style.display = 'none';
          modal.style.display = 'none';
        }, 300);
      }
      const nameInput = document.getElementById('new-student-name');
      if (nameInput) nameInput.value = '';
    }

    function handleAddStudent() {
      const nameInput = document.getElementById('new-student-name');
      if (!nameInput) return;
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Please enter a student name');
        return;
      }
      
      const currentClass = window.currentClass ? window.currentClass.name : (localStorage.getItem('educare_current_class') || '');
      if (!currentClass) {
        showToast('No class active');
        return;
      }

      if (window.addStudent) {
        window.addStudent(name, currentClass);
      } else {
        const state = window.getStore ? window.getStore() : { students: [], attState: {} };
        if (!state.students) state.students = [];
        state.students.push({ name, class: currentClass });
        state.attState[name] = 'P';
        if (window.saveStore) window.saveStore(state);
      }

      closeAddStudentModal();
      showToast(`${name.split(' ')[0]} added successfully!`);
      
      // Force render of pages
      if (window.renderDynamicScreens) {
        window.renderDynamicScreens();
      }
      // Re-trigger layout updates
      renderAttWorkspace();
      renderBehaviorGrid();
    }

    // ── INITIAL ACCOUNT SETUP ──
    async function handleCreateClass() {
      const teacherName = document.getElementById('setup-teacher-name').value.trim();
      const pin = document.getElementById('setup-teacher-pin').value.trim();
      const className = document.getElementById('setup-class-name').value.trim();
      const studentsText = document.getElementById('setup-students').value.trim();

      if (!teacherName) {
        showToast('Please enter your name');
        return;
      }
      if (pin.length !== 4) {
        showToast('PIN must be exactly 4 digits');
        return;
      }
      if (!className) {
        showToast('Please enter class name');
        return;
      }

      // Save credentials & initialize class
      localStorage.setItem('educare_teacher_name', teacherName);
      localStorage.setItem('educare_current_class', className);
      localStorage.setItem('educare_classes', JSON.stringify([{ name: className, isAdvisory: true }]));

      if (window.setupSecurityPin) {
        try {
          window.setupSecurityPin(pin);
        } catch (_err) {
          showToast('Failed to set PIN. Please try again.');
          return;
        }
      }

      // Initialize store
      const state = window.getStore ? window.getStore() : { students: [], attState: {} };
      state.teacherName = teacherName;
      state.currentClass = className;
      state.classes = [{ name: className, isAdvisory: true }];
      
      // Parse bulk students
      const studentNames = studentsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      state.students = studentNames.map(s => ({ name: s, class: className }));
      studentNames.forEach(s => {
        state.attState[s] = 'P';
      });

      if (window.saveStore) {
        window.saveStore(state);
      }

      if (window.saveBiometricPin) {
        await window.saveBiometricPin(pin);
      }

      // Update UI variables
      window.currentClass = { name: className, isAdvisory: true };
      
      // Set name on dashboard
      const dashGreetingName = document.querySelector('.greeting-name');
      if (dashGreetingName) {
        dashGreetingName.textContent = teacherName;
      }

      // Clear setup inputs
      document.getElementById('setup-teacher-name').value = '';
      document.getElementById('setup-teacher-pin').value = '';
      document.getElementById('setup-class-name').value = '';
      document.getElementById('setup-students').value = '';

      showToast('Class initialized!');
      
      if (window.renderDynamicScreens) {
        window.renderDynamicScreens();
      }

      if (window.syncAfterUnlock) {
        window.syncAfterUnlock();
      }
      
      // Initialize other components
      renderAttWorkspace();
      showAssessList();
      renderBehaviorGrid();

      setTimeout(() => {
        navTo('screen-dashboard');
      }, 1000);
    }

    // ── ATTENDANCE ──
    let attRollCallIndex = -1;

    function renderAttWorkspace() {
      const el = document.getElementById('attWorkspace');
      if (!el) return;
      
      const currentStudents = getStudents();
      const currentAttState = getAttState();

      if (currentStudents.length === 0) {
        el.innerHTML = `
          <div style="text-align:center; margin-top: 40px;">
            <div style="font-family:var(--serif); font-size:24px; font-weight:700; color:var(--deep-brown); margin-bottom: 12px;">No Students</div>
            <div style="font-size:14px; color:var(--mid-brown); margin-bottom: 30px; line-height: 1.5;">Your roster is empty.</div>
          </div>
        `;
        return;
      }

      if (attRollCallIndex === -1) {
        el.innerHTML = `
          <div style="text-align:center; margin-top: 40px;">
            <div style="font-family:var(--serif); font-size:24px; font-weight:700; color:var(--deep-brown); margin-bottom: 12px;">Roll Call</div>
            <div style="font-size:14px; color:var(--mid-brown); margin-bottom: 30px; line-height: 1.5;">Call out names and record<br>attendance one by one.</div>
            <div style="width: 100px; height: 100px; border-radius: 50%; background: rgba(212,130,10,0.1); color: var(--amber); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 30px; cursor:pointer;" onclick="startRollCall()">
              <i class="ti ti-microphone"></i>
            </div>
            <button class="btn-primary" onclick="startRollCall()">Start Roll Call</button>
          </div>
        `;
      } else if (attRollCallIndex < currentStudents.length) {
        const s = currentStudents[attRollCallIndex];
        el.innerHTML = `
          <div style="text-align:center; margin-top: 10px; margin-bottom: 20px;">
            <div style="font-size:13px; font-weight:700; color:var(--mid-brown); text-transform:uppercase; letter-spacing:0.05em;">Student ${attRollCallIndex + 1} of ${currentStudents.length}</div>
            <div style="width: 100%; height: 4px; background: var(--border-light); border-radius: 2px; margin-top: 10px;">
              <div style="height: 100%; background: var(--amber); border-radius: 2px; width: ${((attRollCallIndex + 1) / currentStudents.length) * 100}%;"></div>
            </div>
          </div>
          <div class="card" style="padding: 40px 20px; text-align:center; margin-bottom: 30px; border: 2px solid var(--border-light);">
            <div class="avatar avatar-lg" style="margin: 0 auto 20px; width: 80px; height: 80px; font-size: 32px; background: var(--amber-bg); color: var(--amber-deep);">${s.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
            <div style="font-family:var(--serif); font-size:26px; font-weight:700; color:var(--deep-brown);">${s}</div>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <button class="btn-primary" style="height: 70px; font-size: 20px; background: var(--clear); border: none; font-weight:700;" onclick="recordAttendanceAndNext('P')">P <span style="font-size:12px; font-weight:500; display:block; margin-top:4px;">Present</span></button>
            <button class="btn-primary" style="height: 70px; font-size: 20px; background: var(--critical); border: none; font-weight:700;" onclick="recordAttendanceAndNext('A')">A <span style="font-size:12px; font-weight:500; display:block; margin-top:4px;">Absent</span></button>
            <button class="btn-primary" style="height: 70px; font-size: 20px; background: var(--amber-deep); border: none; font-weight:700;" onclick="recordAttendanceAndNext('L')">L <span style="font-size:12px; font-weight:500; display:block; margin-top:4px;">Late</span></button>
            <button class="btn-primary" style="height: 70px; font-size: 20px; background: var(--info); border: none; font-weight:700;" onclick="recordAttendanceAndNext('E')">E <span style="font-size:12px; font-weight:500; display:block; margin-top:4px;">Excused</span></button>
          </div>
          <div style="text-align:center;">
             <button class="btn-ghost" onclick="attRollCallIndex = currentStudents.length; renderAttWorkspace();">Skip to Sealed Record</button>
          </div>
        `;
      } else {
        const absentStudents = currentStudents.filter(s => currentAttState[s] === 'A');
        const lateStudents = currentStudents.filter(s => currentAttState[s] === 'L');
        
        let html = `
          <div style="background:var(--clear-bg); border: 1px solid var(--clear-border); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 8px;">
              <i class="ti ti-lock" style="font-size:20px; color:var(--clear);"></i>
              <div style="font-size: 14px; font-weight: 700; color:var(--clear);">Record Sealed</div>
            </div>
            <div style="font-size: 13px; color: var(--deep-brown); line-height:1.4;">
              Roll call is complete. If a student arrives mid-class, you can mark them as late below.
            </div>
          </div>
        `;
        
        if (absentStudents.length > 0) {
          html += `<div style="font-size:13px; font-weight:700; color:var(--mid-brown); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px;">Currently Absent (${absentStudents.length})</div>`;
          html += absentStudents.map(s => `
            <div class="card" style="margin-bottom: 8px; padding: 12px 16px; display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap: 12px;">
                <div class="avatar avatar-sm" style="background: var(--critical-bg); color: var(--critical);">${s.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                <div style="font-size: 15px; font-weight: 600; color: var(--deep-brown);">${s}</div>
              </div>
              <button class="btn-sm" style="background: var(--amber-bg); color: var(--amber-deep); border: 1px solid rgba(212,130,10,0.3); font-weight: 700; padding: 6px 12px;" onclick="markLateFromSealed('${s}')">Mark Late</button>
            </div>
          `).join('');
        } else {
          html += `<div style="text-align:center; padding: 20px; color: var(--mid-brown); font-size: 13px;">No absent students today.</div>`;
        }

        if (lateStudents.length > 0) {
          html += `<div style="font-size:13px; font-weight:700; color:var(--mid-brown); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; margin-top: 20px;">Arrived Late (${lateStudents.length})</div>`;
          html += lateStudents.map(s => `
            <div class="card" style="margin-bottom: 8px; padding: 12px 16px; display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap: 12px;">
                <div class="avatar avatar-sm" style="background: var(--amber-bg); color: var(--amber-deep);">${s.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                <div style="font-size: 15px; font-weight: 600; color: var(--deep-brown);">${s}</div>
              </div>
              <div style="font-size: 12px; font-weight: 700; color: var(--amber-deep); background: rgba(212,130,10,0.1); padding: 4px 8px; border-radius: 6px;">LATE</div>
            </div>
          `).join('');
        }
        
        el.innerHTML = html + '<div style="height: 40px;"></div>';
      }
    }

    function startRollCall() {
      attRollCallIndex = 0;
      renderAttWorkspace();
    }

    function recordAttendanceAndNext(status) {
      const currentStudents = getStudents();
      const currentAttState = getAttState();
      const s = currentStudents[attRollCallIndex];
      
      currentAttState[s] = status;
      if (window.syncLocalStateToBackend) window.syncLocalStateToBackend('attState', currentAttState);

      attRollCallIndex++;
      
      if (attRollCallIndex >= currentStudents.length) {
        showToast('Roll call complete. Record sealed.');
      }
      renderAttWorkspace();
    }

    function markLateFromSealed(student) {
      const currentAttState = getAttState();
      currentAttState[student] = 'L';
      if (window.syncLocalStateToBackend) window.syncLocalStateToBackend('attState', currentAttState);
      
      showToast(`${student.split(' ')[0]} marked as Late.`);
      renderAttWorkspace();
    }

    // ── ASSESSMENTS & HOMEWORK ──
    // ── ASSESSMENTS & HOMEWORK ──
    const getStoreAssessments = () => window.getStore ? (window.getStore().assessments || []) : [];
    const getStoreSubmissions = () => window.getStore ? (window.getStore().submissions || {}) : {};

    let currentNewType = 'in-class';
    let activeAssessId = null;

    // Helper to initialize missing submission data for new students
    function ensureSubmissionsData() {
      const assessments = getStoreAssessments();
      const submissions = getStoreSubmissions();
      let changed = false;
      assessments.forEach(a => {
        if (!submissions[a.id]) { submissions[a.id] = {}; changed = true; }
        getStudents().forEach(s => {
          if (!submissions[a.id][s]) {
            submissions[a.id][s] = { score: null, submitted: false, date: null };
            changed = true;
          }
        });
      });
      if (changed && window.syncLocalStateToBackend) {
        window.syncLocalStateToBackend('submissions', submissions);
      }
    }

    function showAssessList() {
      document.getElementById('view-assess-list').style.display = 'flex';
      document.getElementById('view-assess-create').style.display = 'none';
      document.getElementById('view-assess-grade').style.display = 'none';
      renderAssessments();
    }

    function showAssessCreate() {
      document.getElementById('view-assess-list').style.display = 'none';
      document.getElementById('view-assess-create').style.display = 'flex';
      document.getElementById('view-assess-grade').style.display = 'none';
      document.getElementById('newAssessDue').value = new Date().toISOString().split('T')[0];
    }

    function setAssessType(type) {
      currentNewType = type;
      if (type === 'in-class') {
        document.getElementById('btnTypeInClass').style.borderColor = 'var(--amber)';
        document.getElementById('btnTypeInClass').querySelector('i').style.color = 'var(--amber)';
        document.getElementById('btnTypeTakeHome').style.borderColor = 'transparent';
        document.getElementById('btnTypeTakeHome').querySelector('i').style.color = 'var(--mid-brown)';
      } else {
        document.getElementById('btnTypeTakeHome').style.borderColor = 'var(--amber)';
        document.getElementById('btnTypeTakeHome').querySelector('i').style.color = 'var(--amber)';
        document.getElementById('btnTypeInClass').style.borderColor = 'transparent';
        document.getElementById('btnTypeInClass').querySelector('i').style.color = 'var(--mid-brown)';
      }
    }

    function createAssessment() {
      const title = document.getElementById('newAssessName').value || 'New Assessment';
      const maxScore = parseInt(document.getElementById('newAssessMax').value) || 100;
      const due = document.getElementById('newAssessDue').value;
      const id = 'a' + Date.now();
      
      const assessments = getStoreAssessments();
      const submissions = getStoreSubmissions();
      
      assessments.unshift({ id, title, type: currentNewType, maxScore, due });
      submissions[id] = {};
      getStudents().forEach(s => {
        submissions[id][s] = { score: null, submitted: false, date: null };
      });
      
      if (window.syncLocalStateToBackend) {
        window.syncLocalStateToBackend('assessments', assessments);
        window.syncLocalStateToBackend('submissions', submissions);
      }
      
      document.getElementById('newAssessName').value = '';
      showToast('Assessment Created');
      openGradeView(id);
    }

    function renderAssessments() {
      ensureSubmissionsData();
      const el = document.getElementById('assessmentsContainer');
      if (!el) return;
      
      const assessments = getStoreAssessments();
      const submissions = getStoreSubmissions();
      
      if (assessments.length === 0) {
        el.innerHTML = '<div style="text-align:center; padding:30px; color:var(--mid-brown); font-size:14px;">No assessments yet.</div>';
        return;
      }
      
      el.innerHTML = assessments.map(a => {
        let submittedCount = 0;
        let gradedCount = 0;
        getStudents().forEach(s => {
          if (submissions[a.id] && submissions[a.id][s]) {
            if (submissions[a.id][s].submitted) submittedCount++;
            if (submissions[a.id][s].score !== null && submissions[a.id][s].score !== '') gradedCount++;
          }
        });
        
        const icon = a.type === 'in-class' ? 'ti-school' : 'ti-home';
        const progressStr = a.type === 'take-home' 
          ? `${submittedCount}/${getStudents().length} Submitted` 
          : `${gradedCount}/${getStudents().length} Graded`;
          
        return `
          <div class="card" style="margin-bottom:12px; padding:16px; cursor:pointer;" onclick="openGradeView('${a.id}')">
            <div style="display:flex; align-items:flex-start; gap:12px;">
              <div style="width:40px; height:40px; border-radius:10px; background:var(--clear-bg); color:var(--clear); display:flex; align-items:center; justify-content:center;">
                <i class="ti ${icon}" style="font-size:20px;"></i>
              </div>
              <div style="flex:1;">
                <div style="font-size:16px; font-weight:700; color:var(--deep-brown); margin-bottom:4px;">${a.title}</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="font-size:12px; color:var(--mid-brown);">Due: ${a.due}</div>
                  <div style="font-size:11px; font-weight:600; color:var(--amber-deep); background:rgba(212,130,10,0.1); padding:2px 8px; border-radius:4px;">${progressStr}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function openGradeView(id) {
      activeAssessId = id;
      const assessments = getStoreAssessments();
      const a = assessments.find(x => x.id === id);
      document.getElementById('gradeTitle').textContent = a.title;
      document.getElementById('gradeSub').textContent = `${a.type === 'take-home' ? 'Homework/Project' : 'Quiz/Test'} · Max: ${a.maxScore}`;
      
      document.getElementById('view-assess-list').style.display = 'none';
      document.getElementById('view-assess-create').style.display = 'none';
      document.getElementById('view-assess-grade').style.display = 'flex';
      
      renderGradeList();
    }

    window.toggleSubmission = function(student) {
      const submissions = getStoreSubmissions();
      const sub = submissions[activeAssessId][student];
      
      sub.submitted = !sub.submitted;
      if (sub.submitted) {
        sub.date = new Date().toISOString().split('T')[0]; // Auto-fill today
      } else {
        sub.date = null;
        sub.score = null;
      }
      if (window.syncLocalStateToBackend) window.syncLocalStateToBackend('submissions', submissions);
      renderGradeList();
    };

    window.updateScore = function(student, val) {
      const submissions = getStoreSubmissions();
      submissions[activeAssessId][student].score = val;
      if (window.syncLocalStateToBackend) window.syncLocalStateToBackend('submissions', submissions);
    };

    function renderGradeList() {
      const el = document.getElementById('gradeListContainer');
      const assessments = getStoreAssessments();
      const submissions = getStoreSubmissions();
      const a = assessments.find(x => x.id === activeAssessId);
      
      let html = `<div style="padding:4px 20px;">`;
      
      getStudents().forEach(s => {
        const sub = submissions[activeAssessId][s];
        
        html += `<div style="padding:12px 0; border-bottom:1px solid var(--border-light); display:flex; align-items:center; gap:12px;">`;
        html += `<div class="avatar avatar-sm">${s.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>`;
        html += `<div style="flex:1;">
                   <div style="font-size:15px; font-weight:600; color:var(--deep-brown);">${s}</div>`;
                   
        if (a.type === 'take-home') {
          if (sub.submitted) {
             html += `<div style="font-size:11px; color:var(--clear); margin-top:2px;">Submitted ${sub.date}</div>`;
          } else {
             html += `<div style="font-size:11px; color:var(--critical); margin-top:2px;">Missing</div>`;
          }
        }
        
        html += `</div>`; // end flex:1
        
        if (a.type === 'take-home') {
          html += `<div style="width:40px; height:40px; border-radius:8px; border:2px solid ${sub.submitted ? 'var(--clear)' : 'var(--border)'}; background:${sub.submitted ? 'var(--clear-bg)' : 'transparent'}; color:var(--clear); display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="window.toggleSubmission('${s}')">
                     ${sub.submitted ? '<i class="ti ti-check" style="font-size:20px;"></i>' : ''}
                   </div>`;
        }
        
        if (a.type === 'in-class' || sub.submitted) {
          html += `<div style="display:flex; align-items:center; gap:6px;">
                     <input class="score-input" value="${sub.score || ''}" type="number" min="0" max="${a.maxScore}" onchange="window.updateScore('${s}', this.value)" placeholder="-">
                     <span style="font-size:12px; color:var(--mid-brown);">/ ${a.maxScore}</span>
                   </div>`;
        }
        
        html += `</div>`;
      });
      
      html += `</div>`;
      el.innerHTML = html;
    }

    function saveGrades() {
      showToast('Scores & submissions saved');
      setTimeout(() => showAssessList(), 1000);
    }

    // ── PROFILE TABS ──
    function switchProfileTab(tab) {
      ['attendance', 'grades', 'history'].forEach(t => {
        document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none';
      });
      document.querySelectorAll('#profileTabs .tab').forEach((el, i) => {
        el.classList.toggle('active', ['attendance', 'grades', 'history'][i] === tab);
      });
    }

    // ── CARE WORKFLOW ──
    function careStep(step) {
      careCurrentStep = step;
      [1, 2, 3, 4].forEach(i => {
        const el = document.getElementById('care-step-' + i);
        if (el) el.style.display = i === step ? 'block' : 'none';
      });
      // Update step indicators
      [1, 2, 3, 4].forEach(i => {
        const dot = document.getElementById('cs' + i);
        if (!dot) return;
        if (i < step) {
          dot.style.background = 'var(--clear)';
          dot.style.color = 'white';
          dot.innerHTML = '<i class="ti ti-check" style="font-size:12px;"></i>';
        } else if (i === step) {
          dot.style.background = 'var(--amber)';
          dot.style.color = 'white';
          dot.innerHTML = i;
        } else {
          dot.style.background = 'var(--border)';
          dot.style.color = 'var(--neutral-400)';
          dot.innerHTML = i;
        }
        const line = document.getElementById('csline' + i);
        if (line) line.style.background = i < step ? 'var(--amber)' : 'var(--border)';
      });
      document.querySelector('#screen-care .scroll-area').scrollTop = 0;
    }

    function selectAction(id) {
      ['ac1', 'ac2', 'ac3', 'ac4'].forEach(a => {
        const card = document.getElementById(a);
        const check = document.getElementById(a + '-check');
        if (!card || !check) return;
        if (a === id) {
          card.classList.add('selected');
          card.querySelector('.action-icon').style.background = 'rgba(212,130,10,0.15)';
          card.querySelector('.action-icon').style.color = 'var(--amber)';
          check.style.background = 'var(--amber)';
          check.style.border = 'none';
          check.innerHTML = '<i class="ti ti-check" style="font-size:11px;color:white;"></i>';
        } else {
          card.classList.remove('selected');
          card.querySelector('.action-icon').style.background = 'var(--neutral-50)';
          card.querySelector('.action-icon').style.color = 'var(--mid-brown)';
          check.style.background = 'transparent';
          check.style.border = '2px solid var(--border)';
          check.innerHTML = '';
        }
      });
      selectedAction = id;
    }

    function setOutcome(val) {
      outcomeSelected = val;
      const configs = {
        improving: { bg: 'var(--clear-bg)', border: 'var(--clear-border)', color: 'var(--clear)' },
        unchanged: { bg: 'var(--neutral-50)', border: 'var(--border)', color: 'var(--neutral-400)' },
        worsening: { bg: 'var(--critical-bg)', border: '#F7C1C1', color: 'var(--critical)' }
      };
      ['improving', 'unchanged', 'worsening'].forEach(o => {
        const el = document.getElementById('out-' + o);
        if (!el) return;
        const cfg = configs[o];
        const isSelected = o === val;
        el.style.background = isSelected ? cfg.bg : 'white';
        el.style.borderColor = isSelected ? cfg.border : 'var(--border)';
        el.querySelector('div:last-child').style.color = cfg.color;
      });
    }

    function toggleCheck(el) {
      const box = el.querySelector('.check-box');
      const text = el.querySelector('.check-text');
      const isChecked = box.classList.contains('checked');
      box.classList.toggle('checked', !isChecked);
      box.innerHTML = !isChecked ? '<i class="ti ti-check" style="font-size:12px;"></i>' : '';
      text.classList.toggle('done', !isChecked);
    }

    function completeCarework() {
      const studentName = document.querySelector('#screen-care .top-bar-sub')?.textContent || '';
      if (!studentName) {
        showToast('Student name not found');
        return;
      }

      // Map action card ID to action name
      const actionMap = {
        ac1: 'check-in',
        ac2: 'parent-contact',
        ac3: 'counselor-referral',
        ac4: 'admin-escalation'
      };
      const actionTaken = actionMap[selectedAction] || 'check-in';
      const outcome = outcomeSelected || 'improving';
      const notesEl = document.getElementById('care-notes-input');
      const notes = notesEl?.value || '';

      // Add the care interaction to the store
      let interaction = null;
      if (typeof window.addCareInteraction === 'function') {
        interaction = window.addCareInteraction(studentName, actionTaken, outcome, notes);
        if (interaction && window.syncLocalStateToBackend) {
          window.syncLocalStateToBackend('careInteractions', window.getStore().careInteractions || []);
        }
      }

      // Move student to recovery workflow
      if (window.moveToRecovery) {
        window.moveToRecovery(studentName);
      }

      const followUpDate = new Date(interaction?.followUpDate || Date.now() + 7 * 24 * 60 * 60 * 1000);
      const followUpStr = followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      showToast(`Care workflow saved · Follow-up scheduled for ${followUpStr}`);
      setTimeout(() => {
        careStep(1);
        navTo('screen-dashboard');
      }, 1200);
    }

    // ── TOAST ──
    function showToast(msg) {
      const t = document.getElementById('toast');
      document.getElementById('toast-msg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    }

    // ── 1-TAP BEHAVIOR ──
    let activeBehaviorStudent = null;

    function renderBehaviorGrid() {
      const el = document.getElementById('behavior-grid');
      if (!el) return;
      el.innerHTML = getStudents().map(s => {
        const initials = s.split(' ').map(x => x[0]).join('').slice(0, 2);
        const firstName = s.split(' ')[0];
        return `
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer;" onclick="openBehaviorSheet('${s}')">
            <div class="avatar avatar-md" style="background:var(--card-bg); border:1px solid var(--border-light);">${initials}</div>
            <div style="font-size:11px; font-weight:600; color:var(--deep-brown); text-align:center;">${firstName}</div>
          </div>
        `;
      }).join('');
    }

    function openBehaviorSheet(student) {
      activeBehaviorStudent = student;
      const initials = student.split(' ').map(x => x[0]).join('').slice(0, 2);
      
      document.getElementById('behavior-sheet-avatar').textContent = initials;
      document.getElementById('behavior-sheet-name').textContent = student;
      
      const overlay = document.getElementById('behavior-overlay');
      const sheet = document.getElementById('behavior-sheet');
      
      overlay.style.display = 'block';
      setTimeout(() => { sheet.style.bottom = '0'; }, 10);
    }

    function closeBehaviorSheet() {
      const overlay = document.getElementById('behavior-overlay');
      const sheet = document.getElementById('behavior-sheet');
      
      sheet.style.bottom = '-100%';
      setTimeout(() => { overlay.style.display = 'none'; }, 300);
      activeBehaviorStudent = null;
    }

    function logBehavior(tag) {
      const student = activeBehaviorStudent;
      if (!student || !tag) {
        closeBehaviorSheet();
        return;
      }

      const log = window.addBehaviorLog ? window.addBehaviorLog(student, tag) : null;
      if (log && window.syncLocalStateToBackend) {
        window.syncLocalStateToBackend('behaviorLogs', window.getStore().behaviorLogs || []);
      }
      showToast(`Logged '${tag}' for ${student.split(' ')[0]}`);
      closeBehaviorSheet();
      setTimeout(() => navTo('screen-dashboard'), 600);
    }

    // ── TUTORIAL ──
    let tutStep = 0;
    let activeTutorialId = null;
    let tutorialSeen = {};

    const tutorials = {
      'screen-dashboard': [
        { target: null, title: 'Welcome to EduCare 👋', text: 'This is your daily dashboard. It gives you a quick overview of your class health and immediate action items.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'tut-alerts', title: 'Smart Alerts', text: 'Critical alerts generated by the Early Warning System will appear right here at the top.', top: '210px', left: '50%', transform: 'translateX(-50%)' },
        { target: 'tut-quick', title: 'Quick Actions', text: 'Use these shortcuts to quickly log daily attendance or assessment scores without digging through menus.', top: '650px', left: '50%', transform: 'translateX(-50%)' },
        { target: 'tut-nav', title: 'Navigation', text: 'Access your full student roster, detailed logs, and reports down here. You are all set!', top: 'auto', bottom: '110px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-students': [
        { target: null, title: 'Student Roster', text: 'Here you can view all your students at a glance.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'stu-search', title: 'Search Bar', text: 'Use the search bar to quickly find a specific student.', top: '180px', left: '50%', transform: 'translateX(-50%)' },
        { target: 'stu-list', title: 'Student List', text: 'Tap on any student to open their detailed 360° profile.', top: '450px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-attendance': [
        { target: null, title: 'Daily Log', text: 'Mark attendance or assessment scores for the whole class.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'attList', title: 'Attendance Chips', text: 'Simply tap the P/A/L/E buttons to mark attendance. The buttons are large for easy tapping.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'att-save', title: 'Save Button', text: "Don't forget to hit Save at the bottom when you're done!", top: 'auto', bottom: '150px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-discovery': [
        { target: null, title: 'Smart Alerts', text: 'This is where the Early Warning System highlights students needing attention.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'alert-card', title: 'Alert Cards', text: 'Tap on any critical alert to immediately start a Care Workflow.', top: '250px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-report': [
        { target: null, title: 'Class Reports', text: 'Analyze overall performance and attendance trends.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'rep-export', title: 'Export Buttons', text: 'Easily export full-quarter reports or handover summaries as PDFs for parents and admins.', top: 'auto', bottom: '150px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-profile': [
        { target: null, title: 'Student Profile', text: "A 360° view of the student's performance, attendance, and well-being.", top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'prof-insights', title: 'AI Insights', text: 'The system automatically generates natural-language narratives explaining exactly why a student was flagged.', top: '420px', left: '50%', transform: 'translateX(-50%)' },
        { target: 'profileTabs', title: 'Tabs', text: 'Use these tabs to dive deeper into Attendance patterns, Grades, or the student\'s past Care History.', top: '150px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-care': [
        { target: null, title: 'Care Workflow', text: 'This wizard guides you through recording and tracking interventions.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'care-step-1', title: 'Triage Summary', text: 'Before taking action, review the synthesized critical signals to understand the student\'s risk profile.', top: '120px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-assessment': [
        { target: 'assess-config', title: 'Configuration', text: 'Set the assessment type and maximum score here before inputting the grades below.', top: '220px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-response': [
        { target: null, title: 'Active Interventions', text: 'This screen displays students currently in active care workflows.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'responseContainer', title: 'Pending Check-ins', text: 'Tap on a student to resume their care workflow, access check-in guides, or log intervention outcomes.', top: '280px', left: '50%', transform: 'translateX(-50%)' }
      ],
      'screen-recovery': [
        { target: null, title: 'Shadow Monitoring', text: 'This screen lists students who are currently in the recovery phase.', top: '35%', left: '50%', transform: 'translateX(-50%)' },
        { target: 'recoveryContainer', title: 'Recovery Watchlist', text: 'The system watches these students closely. Once their data stabilizes, the care loop is successfully closed.', top: '280px', left: '50%', transform: 'translateX(-50%)' }
      ]
    };

    function startTutorial(screenId = 'screen-dashboard') {
      if (!tutorials[screenId]) return;
      activeTutorialId = screenId;
      tutorialSeen[screenId] = true;
      document.getElementById('tutOverlay').classList.add('show');
      tutStep = 0;
      showTutStep();
    }

    function showTutStep() {
      document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));

      const steps = tutorials[activeTutorialId];
      if (!steps || tutStep >= steps.length) {
        endTutorial();
        return;
      }

      const step = steps[tutStep];
      const tooltip = document.getElementById('tutTooltip');

      if (step.target) {
        const el = document.getElementById(step.target);
        if (el) {
          el.classList.add('tutorial-highlight');
          if (step.target === 'tut-nav') el.style.borderRadius = '0 0 44px 44px';
        }
      }

      document.getElementById('tutTitle').innerText = step.title;
      document.getElementById('tutText').innerText = step.text;
      document.getElementById('tutBtn').innerText = tutStep === steps.length - 1 ? 'Get Started' : 'Next';

      // Always center — positions are set via CSS
      tooltip.classList.add('show');
    }

    function nextTutStep() {
      tutStep++;
      showTutStep();
    }

    function endTutorial() {
      document.getElementById('tutOverlay').classList.remove('show');
      document.getElementById('tutTooltip').classList.remove('show');
      document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    }

    // Make all students in the roster clickable
    if (typeof document !== 'undefined') {
      document.querySelectorAll('#screen-students .student-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.onclick = () => { const name = row.querySelector('.student-name').textContent; if (personaData[name]) openProfile(name); else navTo('screen-profile'); };
      });
    }

    // ── CLASS SWITCHER LOGIC ──
    let currentClass = {
      name: localStorage.getItem('educare_current_class') || 'No Class Selected',
      isAdvisory: true
    };
    window.currentClass = currentClass;

    function openClassSelect() {
      const storedClasses = JSON.parse(localStorage.getItem('educare_classes') || '[]');
      const container = document.getElementById('class-options-container');
      if (container) {
        if (storedClasses.length === 0) {
          container.innerHTML = `
            <div style="text-align:center; padding: 20px 0; color: var(--mid-brown); font-size:14px; line-height:1.5;">
              No classes available.<br>Please add a class below.
            </div>
          `;
        } else {
          let html = '';
          const advisoryClasses = storedClasses.filter(c => c.isAdvisory);
          const subjectClasses = storedClasses.filter(c => !c.isAdvisory);

          if (advisoryClasses.length > 0) {
            html += `<div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Advisory</div>`;
            advisoryClasses.forEach(c => {
              const isSelected = currentClass.name === c.name;
              html += `
                <div class="card class-option" style="margin-bottom:12px;border:1.5px solid ${isSelected ? 'var(--amber)' : 'transparent'};cursor:pointer;"
                  onclick="selectClass('${c.name}', true, this)">
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
                    <div style="font-size:14px;font-weight:700;color:var(--deep-brown);">${c.name}</div>
                    <i class="ti ti-check class-check" style="color:var(--amber);font-size:18px;display:${isSelected ? 'block' : 'none'};"></i>
                  </div>
                </div>`;
            });
          }

          if (subjectClasses.length > 0) {
            html += `<div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;margin-top:8px;">Subject Classes</div>`;
            subjectClasses.forEach(c => {
              const isSelected = currentClass.name === c.name;
              html += `
                <div class="card class-option" style="margin-bottom:8px;border:1.5px solid ${isSelected ? 'var(--amber)' : 'transparent'};cursor:pointer;"
                  onclick="selectClass('${c.name}', false, this)">
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;">
                    <div>
                      <div style="font-size:14px;font-weight:700;color:var(--deep-brown);">${c.name}</div>
                      <div style="font-size:12px;color:var(--mid-brown);">Subject Class</div>
                    </div>
                    <i class="ti ti-check class-check" style="color:var(--amber);font-size:18px;display:${isSelected ? 'block' : 'none'};"></i>
                  </div>
                </div>`;
            });
          }
          container.innerHTML = html;
        }

        // Add inline add-class form at the bottom of the switcher modal if not already present
        let addForm = document.getElementById('switcher-add-class-form');
        if (!addForm) {
          const formDiv = document.createElement('div');
          formDiv.id = 'switcher-add-class-form';
          formDiv.style.marginTop = '16px';
          formDiv.style.borderTop = '1px solid var(--border-light)';
          formDiv.style.paddingTop = '16px';
          formDiv.innerHTML = `
            <div style="font-size:12px;font-weight:700;color:var(--mid-brown);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Add New Class</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <input type="text" id="switcher-new-class-name" placeholder="e.g. Grade 5 — Mabini" class="form-input" style="padding:10px 12px; font-size:14px;">
              <div style="display:flex; gap:10px; align-items:center;">
                <label style="font-size:13px; color:var(--deep-brown); display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="checkbox" id="switcher-is-advisory" style="cursor:pointer;"> Advisory Class
                </label>
                <button class="btn-primary btn-sm" onclick="handleSwitcherAddClass()" style="margin-left:auto; padding:6px 12px; font-size:12px; width:auto; height:auto;">Add Class</button>
              </div>
            </div>
          `;
          container.parentElement.appendChild(formDiv);
        }
      }

      const modal = document.getElementById('class-modal');
      const overlay = document.getElementById('class-overlay');
      overlay.style.display = 'block';
      modal.style.display = 'block';
      setTimeout(() => { modal.style.transform = 'translateY(0)'; }, 10);
    }

    function handleSwitcherAddClass() {
      const nameInput = document.getElementById('switcher-new-class-name');
      const isAdvisoryInput = document.getElementById('switcher-is-advisory');
      if (!nameInput) return;
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Please enter a class name');
        return;
      }
      const isAdvisory = isAdvisoryInput ? isAdvisoryInput.checked : false;

      // Add to store
      if (window.addClass) {
        window.addClass(name, isAdvisory);
      } else {
        const storedClasses = JSON.parse(localStorage.getItem('educare_classes') || '[]');
        const exists = storedClasses.some(c => c.name === name);
        if (!exists) {
          storedClasses.push({ name, isAdvisory });
          localStorage.setItem('educare_classes', JSON.stringify(storedClasses));
        }
      }

      // Reset input values
      nameInput.value = '';
      if (isAdvisoryInput) isAdvisoryInput.checked = false;

      showToast('Class added!');
      
      // Refresh dynamic listings inside modal
      openClassSelect();
    }

    function closeClassSelect() {
      const modal = document.getElementById('class-modal');
      const overlay = document.getElementById('class-overlay');
      modal.style.transform = 'translateY(100%)';
      setTimeout(() => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
      }, 300);
    }

    function selectClass(name, isAdvisory, element) {
      currentClass = { name, isAdvisory };
      window.currentClass = currentClass;
      localStorage.setItem('educare_current_class', name);
      
      const state = window.getStore ? window.getStore() : {};
      state.currentClass = name;
      if (window.saveStore) window.saveStore(state);

      // Update UI checkmarks
      if (element) {
        document.querySelectorAll('.class-option').forEach(el => {
          el.style.borderColor = 'transparent';
          const check = el.querySelector('.class-check');
          if (check) check.style.display = 'none';
        });
        element.style.borderColor = 'var(--amber)';
        const check = element.querySelector('.class-check');
        if (check) check.style.display = 'block';
      }

      // Update dashboard display
      const dashNameEl = document.getElementById('dash-class-name');
      if (dashNameEl) dashNameEl.textContent = name;
      const typeEl = document.getElementById('dash-class-type');
      if (typeEl) {
        if (isAdvisory) {
          typeEl.innerHTML = '<i class="ti ti-star" style="color:var(--amber);"></i> Advisory Class';
        } else {
          typeEl.innerHTML = '<i class="ti ti-book" style="color:var(--info);"></i> Subject Class';
        }
      }

      // Update top bars across app
      const topBarSubs = document.querySelectorAll('.top-bar-sub');
      topBarSubs.forEach(el => {
        if (el.textContent.includes('Section Sampaguita') || el.textContent.includes('Grade 5') || el.textContent.includes('Grade 6')) {
          el.textContent = name;
        }
      });

      // Update Care Workflow action card
      const careActionTitle = document.getElementById('care-action-title');
      const careActionSub = document.getElementById('care-action-sub');
      if (careActionTitle && careActionSub) {
        if (isAdvisory) {
          careActionTitle.textContent = 'Contact parent/guardian';
          careActionSub.textContent = 'Reach out to Maria\'s guardian — 2 prior attempts unanswered';
          const ac2Btn = document.getElementById('ac2');
          if (ac2Btn) ac2Btn.onclick = () => selectAction('ac2');
        } else {
          careActionTitle.textContent = 'Message Class Adviser';
          careActionSub.textContent = 'Send EWS summary to the class adviser';
          const ac2Btn = document.getElementById('ac2');
          if (ac2Btn) {
            ac2Btn.onclick = () => {
              selectAction('ac2');
              setTimeout(() => { showToast('Messaging coming in a future version'); }, 500);
            };
          }
        }
      }

      closeClassSelect();
      showToast('Switched to ' + name);
      if (window.renderDynamicScreens) {
        window.renderDynamicScreens();
      }
    }

    // ── INIT ──
    if (typeof document !== 'undefined' && document.getElementById('view-assess-list')) {
      const storedTeacher = localStorage.getItem('educare_teacher_name');
      const storedClass = localStorage.getItem('educare_current_class');
    if (storedTeacher) {
      const el = document.querySelector('.greeting-name');
      if (el) el.textContent = storedTeacher;
    }
    if (storedClass) {
      const el = document.getElementById('dash-class-name');
      if (el) el.textContent = storedClass;
      
      const rosterClassSub = document.getElementById('roster-class-name');
      if (rosterClassSub) {
        const students = getStudents();
        rosterClassSub.textContent = `${storedClass} · ${students.length} students`;
      }

      const topBarSubs = document.querySelectorAll('.top-bar-sub');
      topBarSubs.forEach(el => {
        el.textContent = storedClass;
      });
    }

    renderAttWorkspace();
      showAssessList();
      renderBehaviorGrid();
    }

window.openProfile = openProfile;
window.openDetailView = openDetailView;
window.closeDetailView = closeDetailView;
window.navTo = navTo;
window.formatLockDelay = formatLockDelay;
window.refreshPinLockMessage = refreshPinLockMessage;
window.refreshBiometricButton = refreshBiometricButton;
window.handleBiometricUnlock = handleBiometricUnlock;
window.pinPress = pinPress;
window.pinDel = pinDel;
window.updatePinDots = updatePinDots;
window.openAddStudentModal = openAddStudentModal;
window.closeAddStudentModal = closeAddStudentModal;
window.handleAddStudent = handleAddStudent;
window.handleCreateClass = handleCreateClass;
window.renderAttWorkspace = renderAttWorkspace;
window.startRollCall = startRollCall;
window.recordAttendanceAndNext = recordAttendanceAndNext;
window.markLateFromSealed = markLateFromSealed;
window.ensureSubmissionsData = ensureSubmissionsData;
window.showAssessList = showAssessList;
window.showAssessCreate = showAssessCreate;
window.setAssessType = setAssessType;
window.createAssessment = createAssessment;
window.renderAssessments = renderAssessments;
window.openGradeView = openGradeView;
window.renderGradeList = renderGradeList;
window.saveGrades = saveGrades;
window.switchProfileTab = switchProfileTab;
window.careStep = careStep;
window.selectAction = selectAction;
window.setOutcome = setOutcome;
window.toggleCheck = toggleCheck;
window.completeCarework = completeCarework;
window.showToast = showToast;
window.renderBehaviorGrid = renderBehaviorGrid;
window.openBehaviorSheet = openBehaviorSheet;
window.closeBehaviorSheet = closeBehaviorSheet;
window.logBehavior = logBehavior;
window.startTutorial = startTutorial;
window.showTutStep = showTutStep;
window.nextTutStep = nextTutStep;
window.endTutorial = endTutorial;
window.openClassSelect = openClassSelect;
window.handleSwitcherAddClass = handleSwitcherAddClass;
window.closeClassSelect = closeClassSelect;
window.selectClass = selectClass;
window.escapeHtml = escapeHtml;