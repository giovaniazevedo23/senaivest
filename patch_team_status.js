const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app_v2.js');
let code = fs.readFileSync(file, 'utf8');

// Fix 1: Add renderTeamStatus inside switchTab
code = code.replace(
    /if \(tabId === 'coordenacao' && window\.initDiarioClasse\) \{\s*window\.initDiarioClasse\('coord'\);\s*\}/,
    `if (tabId === 'coordenacao' && window.initDiarioClasse) {
        window.initDiarioClasse('coord');
    }
    if (tabId === 'inicio' && window.renderTeamStatus) {
        window.renderTeamStatus();
    }`
);

// Fix 2: Add renderTeamStatus inside DOMContentLoaded initial load
code = code.replace(
    /setInterval\(checkLessonPlanExpirations, 5000\);/,
    `setInterval(checkLessonPlanExpirations, 5000);
    if (window.renderTeamStatus) window.renderTeamStatus();`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Fixed renderTeamStatus');
