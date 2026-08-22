const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');
c = c.replace(/\r\n/g, '\n');

const target1 = `        // Fetch all users
        const usersRes = await fetch(API_BASE_URL + '/api/users');
        const users = await usersRes.json();
        
        // Fetch presence
        const presenceRes = await fetch(API_BASE_URL + '/api/presence');
        const presence = await presenceRes.json();`;

const replacement1 = `        // Fetch all users
        const usersRes = await fetch(API_BASE_URL + '/api/users');
        let users = await usersRes.json();
        
        try {
            const localUsers = JSON.parse(localStorage.getItem('serverUsers') || '[]');
            users = users.concat(localUsers);
        } catch(e) {}
        
        if (loggedUser && loggedUser.email && !users.find(u => u.email === loggedUser.email)) {
            users.push(loggedUser);
        }
        
        const uMap = new Map();
        users.forEach(x => {
            if (!uMap.has(x.email) || x.avatarType === 'uploaded') {
                uMap.set(x.email, x);
            }
        });
        users = Array.from(uMap.values());

        // Fetch presence
        const presenceRes = await fetch(API_BASE_URL + '/api/presence');
        const presence = await presenceRes.json();`;

if (c.includes(target1)) {
    c = c.replace(target1, replacement1);
    console.log("Replaced user fetch logic");
} else {
    console.log("Target 1 not found or already replaced");
}

const target2 = `                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #2d3139; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        \${member.avatarType === 'emoji' ? (member.avatarData || '👤') : '👤'}
                    </div>`;

const replacement2 = `                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #2d3139; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; overflow: hidden;">
                        \${member.avatarType === 'uploaded' && member.avatarData ? \`<img src="\${member.avatarData}" style="width:100%;height:100%;object-fit:cover;" alt="\${member.name || ''}">\` : (member.avatarType === 'emoji' ? (member.avatarData || '👤') : '👤')}
                    </div>`;

if (c.includes(target2)) {
    c = c.replace(target2, replacement2);
    console.log("Replaced avatar rendering logic");
} else {
    console.log("Target 2 not found or already replaced");
}

fs.writeFileSync('app.js', c);
