const fs = require('fs');

// 1. Patch server.js to add /api/sync-users
let serverCode = fs.readFileSync('server.js', 'utf8');
serverCode = serverCode.replace(/\r\n/g, '\n');
if (!serverCode.includes('/api/sync-users')) {
    const serverSyncEndpoint = `
  // ── POST /api/sync-users — Sync array of users from local cache ──
  if (url === '/api/sync-users' && method === 'POST') {
    const localUsers = await readBody(req);
    if (Array.isArray(localUsers)) {
      const users = getAllUsers();
      let changed = false;
      localUsers.forEach(lu => {
        if (!users.find(u => String(u.email || u.id).toUpperCase() === String(lu.email || lu.id).toUpperCase())) {
          users.push(lu);
          changed = true;
        }
      });
      if (changed) saveAllUsers(users);
    }
    sendJSON(res, 200, { ok: true });
    return true;
  }
`;
    // Insert before GET /api/users
    serverCode = serverCode.replace('  // ── GET /api/users', serverSyncEndpoint + '\n  // ── GET /api/users');
    fs.writeFileSync('server.js', serverCode);
    console.log("Patched server.js with /api/sync-users");
}

// 2. Patch app_v2.js and live_app_v2.js to call /api/sync-users
function patchAppV2(filename) {
    let appV2Code = fs.readFileSync(filename, 'utf8');
    appV2Code = appV2Code.replace(/\r\n/g, '\n');
    if (!appV2Code.includes('/api/sync-users')) {
        const syncCall = `
    // P2P decentralized sync: restore backend users.json if it was wiped by Railway
    try {
        const localServerUsers = localStorage.getItem('serverUsers');
        if (localServerUsers && localServerUsers !== '[]') {
            fetch(API_BASE_URL + '/api/sync-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: localServerUsers
            }).catch(console.error);
        }
    } catch(e) {}
`;
        // Insert after renderAnalyticsDashboard();
        appV2Code = appV2Code.replace('    renderAnalyticsDashboard();', '    renderAnalyticsDashboard();' + syncCall);
        fs.writeFileSync(filename, appV2Code);
        console.log("Patched " + filename + " with sync call");
    }
}
patchAppV2('app_v2.js');
patchAppV2('live_app_v2.js');

// 3. Patch app.js to remove photos from presence bubbles and only show initials
let appCode = fs.readFileSync('app.js', 'utf8');
appCode = appCode.replace(/\r\n/g, '\n');
const targetAvatarInner = `        const avatarInner =
          u.avatarType === "uploaded" && u.avatarData
            ? \`<img src="\${u.avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="\${u.name}">\`
            : \`<span style="font-size:0.9rem;font-weight:800;color:#fff;pointer-events:none;">\${initials}</span>\`;`;

const newAvatarInner = `        const avatarInner = \`<span style="font-size:0.9rem;font-weight:800;color:#fff;pointer-events:none;">\${initials}</span>\`;`;

if (appCode.includes(targetAvatarInner)) {
    appCode = appCode.replace(targetAvatarInner, newAvatarInner);
    fs.writeFileSync('app.js', appCode);
    console.log("Patched app.js to remove online professor photos");
}

// 4. Bump index.html version
let indexCode = fs.readFileSync('index.html', 'utf8');
indexCode = indexCode.replace(/app\.js\?v=50/g, 'app.js?v=51');
indexCode = indexCode.replace(/app_v2\.js\?v=26/g, 'app_v2.js?v=27');
fs.writeFileSync('index.html', indexCode);
console.log("Bumped index.html versions to v51 and v27");
