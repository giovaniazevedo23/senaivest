const fs = require('fs');
const path = require('path');

function patchServerJs() {
    const filePath = path.join(__dirname, 'server.js');
    let code = fs.readFileSync(filePath, 'utf8');

    if (!code.includes('// ── GET /api/user — Get a single user')) {
        const insertion = `
  // ── GET /api/user — Get a single user's public info (e.g., avatar) ─────────
  if (url.startsWith('/api/user?') && method === 'GET') {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const id = urlParams.get('id');
    if (!id) {
       sendJSON(res, 400, {error: 'Missing ID'});
       return true;
    }
    const users = getAllUsers();
    const idKey = String(id).toUpperCase();
    const foundUser = users.find(u => String(u.id || u.email || '').toUpperCase() === idKey);
    if (!foundUser) {
       sendJSON(res, 404, {error: 'User not found'});
       return true;
    }
    const { password, ...rest } = foundUser;
    sendJSON(res, 200, rest);
    return true;
  }
`;
        code = code.replace('// ── GET /api/users — Get all registered users', insertion.trim() + '\n\n  // ── GET /api/users — Get all registered users');
        fs.writeFileSync(filePath, code);
        console.log('server.js patched');
    } else {
        console.log('server.js already patched');
    }
}

function patchAppJs(filename) {
    const filePath = path.join(__dirname, filename);
    let code = fs.readFileSync(filePath, 'utf8');

    if (!code.includes('Sync current user profile automatically')) {
        const insertion = `
    // Sync current user profile automatically
    const regUserStr = localStorage.getItem('registeredUser');
    if (regUserStr) {
        try {
            const user = JSON.parse(regUserStr);
            const userId = user.id || user.email;
            if (userId) {
                fetch(API_BASE_URL + '/api/user?id=' + encodeURIComponent(userId))
                    .then(r => { if(r.ok) return r.json(); return null; })
                    .then(uData => {
                        if (uData && (uData.avatarData !== user.avatarData || uData.avatarType !== user.avatarType)) {
                            const merged = { ...user, ...uData };
                            localStorage.setItem('registeredUser', JSON.stringify(merged));
                            if (typeof window.updateUserUI === 'function') window.updateUserUI(merged);
                        }
                    }).catch(()=>{});
            }
        } catch(e) {}
    }
`;
        // Insert after needsRender = false;
        code = code.replace('let needsRender = false;', 'let needsRender = false;\n' + insertion);
        fs.writeFileSync(filePath, code);
        console.log(filename + ' patched');
    } else {
        console.log(filename + ' already patched');
    }
}

patchServerJs();
patchAppJs('app.js');
patchAppJs('app_v2.js');
