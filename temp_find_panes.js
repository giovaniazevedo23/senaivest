const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');
const panes = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('class="view-') || lines[i].includes('class="tab-pane') || lines[i].includes('class="view-section') || lines[i].includes('-pane"')) {
        panes.push(`${i}: ${lines[i].trim()}`);
    }
}
console.log(panes.join('\n'));
