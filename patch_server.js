const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// 1. Add appStats to DB_FILES
if (!code.includes("appStats: path.join(DATA_DIR, 'appStats.json')")) {
    code = code.replace(
        "presence: path.join(DATA_DIR, 'presence.json'),\n};",
        "presence: path.join(DATA_DIR, 'presence.json'),\n  appStats: path.join(DATA_DIR, 'appStats.json'),\n};"
    );
    // fallback if replacing \n didn't work exactly
    if (!code.includes("appStats.json")) {
        code = code.replace(
            "presence: path.join(DATA_DIR, 'presence.json'),\r\n};",
            "presence: path.join(DATA_DIR, 'presence.json'),\r\n  appStats: path.join(DATA_DIR, 'appStats.json'),\r\n};"
        );
    }
}

// 2. Add appStats to allowed in /api/save
if (code.includes("const allowed = ['inventory'")) {
    if (!code.includes("'appStats'")) {
        code = code.replace(
            "const allowed = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','users','presence'];",
            "const allowed = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','users','presence','appStats'];"
        );
    }
}

fs.writeFileSync(serverFile, code, 'utf8');
console.log('Patched server.js');
