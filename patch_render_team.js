const fs = require('fs');

function patchAppV2(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // 1. Add renderTeamStatus to salvarFotoPerfil
    const salvarFotoTarget = `            fetch(API_BASE_URL + '/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            }).catch(() => { });`;
    if (content.includes(salvarFotoTarget) && !content.includes(salvarFotoTarget + '\n            if (window.renderTeamStatus) window.renderTeamStatus();')) {
        content = content.replace(salvarFotoTarget, salvarFotoTarget + '\n            if (window.renderTeamStatus) window.renderTeamStatus();');
    }

    // 2. Add renderTeamStatus to removerFotoPerfil
    // It's the same target string, so a global replace would hit both, or I can just use replace() twice if I want.
    // Let's use a regex with global flag to hit both instances.
    const regex = new RegExp(salvarFotoTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, salvarFotoTarget + '\n            if (window.renderTeamStatus) window.renderTeamStatus();');

    // 3. Make renderTeamStatus poll every 15 seconds
    const intervalTarget = `    if (window.renderTeamStatus) window.renderTeamStatus();`;
    if (content.includes(intervalTarget) && !content.includes('setInterval(window.renderTeamStatus, 15000)')) {
        content = content.replace(intervalTarget, intervalTarget + '\n    if (window.renderTeamStatus) setInterval(window.renderTeamStatus, 15000);');
    }

    fs.writeFileSync(filename, content);
    console.log(`Patched ${filename}`);
}

patchAppV2('app_v2.js');
patchAppV2('live_app_v2.js');

function patchApp(filename) {
    let content = fs.readFileSync(filename, 'utf8');
    content = content.replace(/\r\n/g, '\n');

    // Make renderTeamStatus bulletproof
    const targetBlock = `        const usersRes = await fetch(API_BASE_URL + '/api/users');
        let users = await usersRes.json();
        
        try {
            const localUsers = JSON.parse(localStorage.getItem('serverUsers') || '[]');
            users = users.concat(localUsers);
        } catch(e) {}`;

    const newBlock = `        const usersRes = await fetch(API_BASE_URL + '/api/users');
        let users = [];
        try {
            const jsonText = await usersRes.text();
            users = JSON.parse(jsonText);
            if (!Array.isArray(users)) users = [];
        } catch(e) {
            users = [];
        }
        
        try {
            const localUsers = JSON.parse(localStorage.getItem('serverUsers') || '[]');
            if (Array.isArray(localUsers)) {
                users = users.concat(localUsers);
            }
        } catch(e) {}`;

    if (content.includes(targetBlock)) {
        content = content.replace(targetBlock, newBlock);
        fs.writeFileSync(filename, content);
        console.log(`Patched ${filename} bulletproof users parse`);
    } else {
        console.log(`Could not find targetBlock in ${filename}`);
    }
}

patchApp('app.js');
