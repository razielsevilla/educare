const fs = require('fs');

const orig = fs.readFileSync('frontend/index_orig.html', 'utf8');
const scriptStart = orig.indexOf('<script>', orig.indexOf('<!-- ── INTERACTIVE PROTOTYPE LOGIC ── -->'));
const scriptEnd = orig.indexOf('</script>', scriptStart);
let code = orig.substring(scriptStart + 8, scriptEnd).trim();

// Remove getStoreStudents and getStoreAttState
code = code.replace(/const getStoreStudents = \(\) => window\.getStore \? window\.getStore\(\)\.students : \[\];/g, '');
code = code.replace(/const getStoreAttState = \(\) => window\.getStore \? window\.getStore\(\)\.attState : \{\};/g, '');

// Add imports at top and escapeHtml
const imports = \import { getStore, getStudents, getAttState, getAssessments, getSubmissions, getWorkflows } from './store.js';

export const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
\;
code = imports + '\n' + code;

// Replace all usages of getStoreStudents() and getStoreAttState() with getStudents() and getAttState()
code = code.replace(/getStoreStudents\(\)/g, 'getStudents()');
code = code.replace(/getStoreAttState\(\)/g, 'getAttState()');

// Add exports at the bottom
const exportsList = [
'openProfile', 'openDetailView', 'closeDetailView', 'navTo', 'formatLockDelay', 'refreshPinLockMessage', 'refreshBiometricButton', 'handleBiometricUnlock', 'pinPress', 'pinDel', 'handleForgotPin', 'updatePinDots', 'openAddStudentModal', 'closeAddStudentModal', 'handleAddStudent', 'handleCreateClass', 'renderAttWorkspace', 'startRollCall', 'recordAttendanceAndNext', 'markLateFromSealed', 'ensureSubmissionsData', 'showAssessList', 'showAssessCreate', 'setAssessType', 'createAssessment', 'renderAssessments', 'openGradeView', 'renderGradeList', 'saveGrades', 'switchProfileTab', 'careStep', 'selectAction', 'setOutcome', 'toggleCheck', 'completeCarework', 'showToast', 'renderBehaviorGrid', 'openBehaviorSheet', 'closeBehaviorSheet', 'logBehavior', 'startTutorial', 'showTutStep', 'nextTutStep', 'endTutorial', 'openClassSelect', 'handleSwitcherAddClass', 'closeClassSelect', 'selectClass', 'escapeHtml'
];

const exportStr = '\n\n' + exportsList.map(fn => \window.\ = \;\).join('\n');
code += exportStr;

// Wrap INIT and SPLASH in if (typeof document !== 'undefined')
code = code.replace(
  "setTimeout(() => {\\n      const storedTeacher", 
  "if (typeof document !== 'undefined') {\\n      setTimeout(() => {\\n        const storedTeacher"
);
code = code.replace(
  "refreshPinLockMessage();\\n      }\\n    }, 2000);", 
  "refreshPinLockMessage();\\n        }\\n      }, 2000);\\n    }"
);

code = code.replace(
  "const storedTeacher = localStorage.getItem('educare_teacher_name');\\n    const storedClass = localStorage.getItem('educare_current_class');", 
  "if (typeof document !== 'undefined') {\\n      const storedTeacher = localStorage.getItem('educare_teacher_name');\\n      const storedClass = localStorage.getItem('educare_current_class');"
);
code = code.replace(
  "renderAttWorkspace();\\n    showAssessList();\\n    renderBehaviorGrid();", 
  "renderAttWorkspace();\\n      showAssessList();\\n      renderBehaviorGrid();\\n    }"
);

code = code.replace(
  "document.querySelectorAll('#screen-students .student-row').forEach(row => {", 
  "if (typeof document !== 'undefined') {\\n      document.querySelectorAll('#screen-students .student-row').forEach(row => {"
);
code = code.replace(
  "else navTo('screen-profile'); };\\n    });", 
  "else navTo('screen-profile'); };\\n      });\\n    }"
);


fs.writeFileSync('frontend/src/ui.js', code);
console.log('Regenerated ui.js');
