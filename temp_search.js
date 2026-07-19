const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('view-section') || lines[i].includes('download-app') || lines[i].includes('nav-item')) {
        console.log(`${i}: ${lines[i].trim()}`);
    }
}
