const fs = require('fs');

function patchApp(filepath) {
    if (!fs.existsSync(filepath)) return;
    let js = fs.readFileSync(filepath, 'utf8');

    // 1. Fix renderCalendar () pill logic
    const pillRegex = /if \(e\.type === 'senai'\) \{[\s\S]*?pill\.className = 'event-pill user';\s*\}/;
    const newPillLogic = `
                const cat = eventCategories.find(c => c.id === e.type) || { name: 'Comunidade', color: e.color || '#10b981' };
                if (e.type === 'senai') {
                    pill.className = 'event-pill senai';
                } else if (e.type === 'user') {
                    pill.className = 'event-pill user';
                } else {
                    pill.className = 'event-pill';
                    pill.style.background = cat.color;
                    pill.style.color = '#fff';
                }
`;
    
    if (pillRegex.test(js)) {
        js = js.replace(pillRegex, newPillLogic.trim());
        console.log("Patched renderCalendar pill logic in " + filepath);
    } else {
        console.log("Did not find pill logic in " + filepath);
    }

    // 2. Fix renderEventsForDate () badge logic
    const badgeRegex = /let badgeColor = '#10b981';[\s\S]*?badgeText = e\.categoryName \|\| 'Comunidade';\s*\}/;
    const newBadgeLogic = `
        const cat = eventCategories.find(c => c.id === e.type) || { name: 'Comunidade', color: e.color || '#10b981' };
        let badgeColor = cat.color;
        let badgeText = cat.name;
        if (e.type === 'senai') {
            badgeColor = '#3b82f6';
            badgeText = 'Senaivest';
        } else if (e.type === 'user') {
            badgeColor = '#10b981';
            badgeText = 'Comunidade';
        }
`;

    if (badgeRegex.test(js)) {
        js = js.replace(badgeRegex, newBadgeLogic.trim());
        console.log("Patched renderEventsForDate badge logic in " + filepath);
    } else {
        console.log("Did not find badge logic in " + filepath);
    }

    fs.writeFileSync(filepath, js, 'utf8');
}

try {
    patchApp('app.js');
    patchApp('app_v2.js');
} catch (e) {
    console.error(e);
}
