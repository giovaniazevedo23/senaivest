const fs = require('fs');

function patchAppV2(filename) {
    let c = fs.readFileSync(filename, 'utf8');
    c = c.replace(/\r\n/g, '\n');
    const target = `            try {
                const localUsers = JSON.parse(localStorage.getItem('serverUsers') || '[]');
                allUsers = allUsers.concat(localUsers);
            } catch(e) {}
            
            const uniqueUsersMap = new Map();`;
            
    const replacement = `            try {
                const localUsers = JSON.parse(localStorage.getItem('serverUsers') || '[]');
                allUsers = allUsers.concat(localUsers);
            } catch(e) {}
            
            if (onlineUsers && Array.isArray(onlineUsers)) {
                onlineUsers.forEach(ou => {
                    if (!allUsers.find(x => x.email === ou.email)) {
                        allUsers.push({ ...ou, escola: (userSchool || ''), instituicao: (userSchool || '') });
                    }
                });
            }
            
            const uniqueUsersMap = new Map();`;

    if (c.includes(target)) {
        c = c.replace(target, replacement);
        fs.writeFileSync(filename, c);
        console.log("Patched " + filename);
    } else {
        console.log("Target not found in " + filename);
    }
}

function patchAppJs() {
    let c = fs.readFileSync('app.js', 'utf8');
    c = c.replace(/\r\n/g, '\n');
    
    const target = `        // Fetch presence
        const presenceRes = await fetch(API_BASE_URL + '/api/presence');
        const presence = await presenceRes.json();
        
        const userSchoolLower = userSchool.toLowerCase();`;
        
    const replacement = `        // Fetch presence
        const presenceRes = await fetch(API_BASE_URL + '/api/presence');
        const presence = await presenceRes.json();
        
        if (presence && Array.isArray(presence)) {
            presence.forEach(pu => {
                if (!users.find(u => u.email === pu.email)) {
                    users.push({ ...pu, escola: userSchool, instituicao: userSchool });
                }
            });
        }
        
        const userSchoolLower = userSchool.toLowerCase();`;

    if (c.includes(target)) {
        c = c.replace(target, replacement);
        fs.writeFileSync('app.js', c);
        console.log("Patched app.js");
    } else {
        console.log("Target not found in app.js");
    }
}

patchAppV2('app_v2.js');
patchAppV2('live_app_v2.js');
patchAppJs();
