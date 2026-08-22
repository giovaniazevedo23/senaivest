const fs = require('fs');

let js = fs.readFileSync('live_app_v2.js', 'utf8');

// A function to get array safely
const safeGetter = `function __getSafeArray(key) {
    try {
        const val = JSON.parse(localStorage.getItem(key));
        return Array.isArray(val) ? val : [];
    } catch(e) {
        return [];
    }
}
`;

// Add safeGetter at the top of the patch if not exists
if (!js.includes('__getSafeArray')) {
    js = js.replace('window.renderActivityLog = function() {', safeGetter + '\nwindow.renderActivityLog = function() {');
}

// Replace all those JSON.parse(...) with __getSafeArray(...)
js = js.replace(/JSON\.parse\(localStorage\.getItem\('registeredBoletins'\) \|\| '\[\]'\)/g, "__getSafeArray('registeredBoletins')");
js = js.replace(/JSON\.parse\(localStorage\.getItem\('lessonPlans'\) \|\| '\[\]'\)/g, "__getSafeArray('lessonPlans')");
js = js.replace(/JSON\.parse\(localStorage\.getItem\('inventory'\) \|\| '\[\]'\)/g, "__getSafeArray('inventory')");

fs.writeFileSync('live_app_v2.js', js);
console.log('Patch aplicado com sucesso!');
