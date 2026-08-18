const fs = require('fs');
let code = fs.readFileSync('frontend/src/ui.js', 'utf8');

// Remove getStoreStudents and getStoreAttState
code = code.replace(/const getStoreStudents = \(\) => window\.getStore \? window\.getStore\(\)\.students : \[\];/g, '');
code = code.replace(/const getStoreAttState = \(\) => window\.getStore \? window\.getStore\(\)\.attState : \{\};/g, '');

// Add imports at top
const imports = "import { getStore, getStudents, getAttState, getAssessments, getSubmissions, getWorkflows } from './store.js';\nimport { escapeHtml } from './app.js';\n";
code = imports + '\n' + code;

// Replace all usages of getStoreStudents() and getStoreAttState() with getStudents() and getAttState()
code = code.replace(/getStoreStudents\(\)/g, 'getStudents()');
code = code.replace(/getStoreAttState\(\)/g, 'getAttState()');

// Add exports at the bottom
const exportsList = [
'openProfile', 'openDetailView', 'closeDetailView', 'navTo', 'formatLockDelay', 'refreshPinLockMessage', 'refreshBiometricButton', 'handleBiometricUnlock', 'pinPress', 'pinDel', 'handleForgotPin', 'updatePinDots', 'openAddStudentModal', 'closeAddStudentModal', 'handleAddStudent', 'handleCreateClass', 'renderAttWorkspace', 'startRollCall', 'recordAttendanceAndNext', 'markLateFromSealed', 'ensureSubmissionsData', 'showAssessList', 'showAssessCreate', 'setAssessType', 'createAssessment', 'renderAssessments', 'openGradeView', 'renderGradeList', 'saveGrades', 'switchProfileTab', 'careStep', 'selectAction', 'setOutcome', 'toggleCheck', 'completeCarework', 'showToast', 'renderBehaviorGrid', 'openBehaviorSheet', 'closeBehaviorSheet', 'logBehavior', 'startTutorial', 'showTutStep', 'nextTutStep', 'endTutorial', 'openClassSelect', 'handleSwitcherAddClass', 'closeClassSelect', 'selectClass'
];

const exportStr = '\n\n' + exportsList.map(fn => "window." + fn + " = " + fn + ";").join('\n');
code += exportStr;

fs.writeFileSync('frontend/src/ui.js', code);
console.log('Updated ui.js');
