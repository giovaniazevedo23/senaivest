const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// 1. Injetar driver do MongoDB e conexão
const mongoSetup = `
const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;
let mongoClient = null;

if (MONGODB_URI) {
  mongoClient = new MongoClient(MONGODB_URI);
  mongoClient.connect().then(() => {
    db = mongoClient.db('senaivest');
    console.log('✅ Conectado ao MongoDB!');
  }).catch(err => {
    console.error('❌ Erro ao conectar no MongoDB:', err);
  });
}
`;
code = code.replace("const path = require('path');", "const path = require('path');\n" + mongoSetup);

// 2. Refatorar readDB e writeDB para async e usar MongoDB se disponível
const newDBFunctions = `
async function readDB(key) {
  if (db) {
    try {
      const collection = db.collection('data_' + key);
      const docs = await collection.find({}).toArray();
      if (key === 'appStats') {
         if (docs.length > 0 && docs[0].data) return docs[0].data;
         return { downloads: 0, reviews: [] };
      }
      if (docs.length === 1 && docs[0]._id === 'singleton') {
         return docs[0].data || [];
      }
      if (docs.length === 0) return [];
      if (docs[0].data) return docs[0].data;
      return docs;
    } catch(e) {
      console.error('Erro no MongoDB readDB:', e);
      return key === 'appStats' ? { downloads: 0, reviews: [] } : [];
    }
  }

  // Fallback para arquivo local
  try {
    const file = DB_FILES[key];
    if (!file || !fs.existsSync(file)) return key === 'appStats' ? { downloads: 0, reviews: [] } : [];
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return key === 'appStats' ? { downloads: 0, reviews: [] } : [];
    let parsed = JSON.parse(raw);
    if (key === 'appStats' && Array.isArray(parsed)) parsed = { downloads: 0, reviews: [] };
    return parsed;
  } catch (e) {
    return key === 'appStats' ? { downloads: 0, reviews: [] } : [];
  }
}

async function writeDB(key, data) {
  if (db) {
    try {
      const collection = db.collection('data_' + key);
      await collection.updateOne({ _id: 'singleton' }, { $set: { data: data } }, { upsert: true });
      return;
    } catch(e) {
      console.error('Erro no MongoDB writeDB:', e);
    }
  }

  try {
    const file = DB_FILES[key];
    if (file) fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}
`;

// Replace standard synchronous readDB and writeDB
const oldRegex = /function readDB\(key\) \{[\s\S]*?function writeDB\(key, data\) \{[\s\S]*?catch \(e\) \{\s*console.warn\(\`Error writing DB\[\$\{key\}\]:\`, e\.message\);\s*\}\s*\}/;
code = code.replace(oldRegex, newDBFunctions);

// 3. Modificar getAllUsers e saveAllUsers para async
code = code.replace(/function getAllUsers\(\) \{[\s\S]*?return readDB\('users'\) \|\| \[\];[\s\S]*?\}/, 'async function getAllUsers() { return (await readDB("users")) || []; }');
code = code.replace(/function saveAllUsers\(users\) \{[\s\S]*?writeDB\('users', users\);[\s\S]*?\}/, 'async function saveAllUsers(users) { await writeDB("users", users); }');

// 4. Modificar cleanupPresence
code = code.replace(/function cleanupPresence\(\) \{/, 'async function cleanupPresence() {');
code = code.replace(/const presence = readDB\('presence'\) \|\| \{\};/, 'const presence = (await readDB("presence")) || {};');
code = code.replace(/if \(changed\) writeDB\('presence', presence\);/, 'if (changed) await writeDB("presence", presence);');

// 5. Substituir getAllUsers() por await getAllUsers()
code = code.replace(/const users = getAllUsers\(\);/g, 'const users = await getAllUsers();');
code = code.replace(/users = getAllUsers\(\);/g, 'users = await getAllUsers();');

// 6. Substituir saveAllUsers(users) por await saveAllUsers(users)
code = code.replace(/saveAllUsers\(users\);/g, 'await saveAllUsers(users);');

// 7. Substituir as chamadas de writeDB (que estão sozinhas)
// We only want to replace writeDB('...', ...) calls with await writeDB('...', ...)
code = code.replace(/([^\w\.])writeDB\((.*?)\);/g, '$1await writeDB($2);');

// 8. Substituir o bloco GET /api/data
const apiDataRegex = /const result = \{[\s\S]*?appStats: readDB\('appStats'\),\s*\};/;
const apiDataReplacement = `const keys = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','appStats'];
    const result = {};
    for (const k of keys) {
      result[k] = await readDB(k);
    }`;
code = code.replace(apiDataRegex, apiDataReplacement);

// 9. Substituir outras chamadas de readDB('schools') e readDB('presence')
code = code.replace(/const schools = readDB\('schools'\)/g, 'const schools = await readDB("schools")');
code = code.replace(/let schools = readDB\('schools'\)/g, 'let schools = await readDB("schools")');
code = code.replace(/const presence = readDB\('presence'\)/g, 'const presence = await readDB("presence")');
code = code.replace(/let presence = readDB\('presence'\)/g, 'let presence = await readDB("presence")');

fs.writeFileSync('server.js', code);
console.log('✅ server.js migrado para MongoDB/Async');
