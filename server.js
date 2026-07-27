require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// ── DATA FILES ─────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILES = {
  inventory: path.join(DATA_DIR, 'inventory.json'),
  plans: path.join(DATA_DIR, 'plans.json'),
  boletins: path.join(DATA_DIR, 'boletins.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  schools: path.join(DATA_DIR, 'schools.json'),
  labs: path.join(DATA_DIR, 'labs.json'),
  users: path.join(DATA_DIR, 'users.json'),
  posts: path.join(DATA_DIR, 'posts.json'),
  agenda: path.join(DATA_DIR, 'agenda.json'),
  news: path.join(DATA_DIR, 'news.json'),
  diario: path.join(DATA_DIR, 'diario.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  deletedCategories: path.join(DATA_DIR, 'deletedCategories.json'),
  presence: path.join(DATA_DIR, 'presence.json'),
};

function readDB(key) {
  try {
    const file = DB_FILES[key];
    if (!file) return [];
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw || raw === '') return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`Error reading DB[${key}]:`, e.message);
    return [];
  }
}

function writeDB(key, data) {
  try {
    const file = DB_FILES[key];
    if (!file) return;
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn(`Error writing DB[${key}]:`, e.message);
  }
}

// ── MIME TYPES ─────────────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
};

// ── HELPER: READ REQUEST BODY ──────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ── HELPER: SEND JSON ──────────────────────────────────────────────────────────
function sendJSON(res, status, data) {
  const json = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(json);
}

// ── PRESENCE: CLEANUP OLD ENTRIES ─────────────────────────────────────────────
function cleanupPresence() {
  const presence = readDB('presence') || {};
  const STALE = 5 * 60 * 1000; // 5 min
  const now = Date.now();
  let changed = false;
  Object.keys(presence).forEach(email => {
    if (now - (presence[email].lastSeen || 0) > STALE) {
      delete presence[email];
      changed = true;
    }
  });
  if (changed) writeDB('presence', presence);
}
setInterval(cleanupPresence, 60 * 1000);

// ── USERS: FIND & NORMALIZE ────────────────────────────────────────────────────
function getAllUsers() {
  return readDB('users') || [];
}
function saveAllUsers(users) {
  writeDB('users', users);
}

// ── API ROUTER ────────────────────────────────────────────────────────────────
async function handleAPI(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return true;
  }

  // ── GET /api/data — Load all backend data ─────────────────────────────────
  if (url === '/api/data' && method === 'GET') {
    const result = {
      inventory: readDB('inventory'),
      plans: readDB('plans'),
      boletins: readDB('boletins'),
      notifications: readDB('notifications'),
      schools: readDB('schools'),
      labs: readDB('labs'),
      posts: readDB('posts'),
      agenda: readDB('agenda'),
      news: readDB('news'),
      diario: readDB('diario'),
      categories: readDB('categories'),
      deletedCategories: readDB('deletedCategories'),
    };
    sendJSON(res, 200, result);
    return true;
  }

  // ── POST /api/save — Save array data ──────────────────────────────────────
  if (url === '/api/save' && method === 'POST') {
    const body = await readBody(req);
    const { type, data } = body;
    if (!type || data === undefined) {
      sendJSON(res, 400, { error: 'Missing type or data' });
      return true;
    }
    const allowed = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','users','presence'];
    if (!allowed.includes(type)) {
      sendJSON(res, 400, { error: 'Unknown type: ' + type });
      return true;
    }
    writeDB(type, data);
    sendJSON(res, 200, { ok: true });
    return true;
  }

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

  // ── GET /api/users — Get all registered users (for analytics/presence) ────
  if (url === '/api/users' && method === 'GET') {
    const users = getAllUsers();
    // Never return passwords in listing
    const safe = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    sendJSON(res, 200, safe);
    return true;
  }

  // ── POST /api/register — Register a new teacher ───────────────────────────
  if (url === '/api/register' && method === 'POST') {
    const newUser = await readBody(req);
    if (!newUser || (!newUser.email && !newUser.id)) {
      sendJSON(res, 400, { error: 'Dados inválidos.' });
      return true;
    }

    const users = getAllUsers();
    const userKey = String(newUser.email || newUser.id || '').toUpperCase();
    const exists = users.some(u =>
      String(u.email || u.id || '').toUpperCase() === userKey
    );

    if (exists) {
      sendJSON(res, 409, { message: 'Usuário já cadastrado com este ID.' });
      return true;
    }

    users.push(newUser);
    saveAllUsers(users);
    sendJSON(res, 200, { user: newUser });
    return true;
  }

  // ── POST /api/admin/wipe - Wipe database ──
  if (url === '/api/admin/wipe' && method === 'POST') {
    writeDB('users', []);
    writeDB('presence', {});
    sendJSON(res, 200, { ok: true, message: 'Database wiped.' });
    return true;
  }

  // ── POST /api/update — Update user profile ────────────────────────────────
  if (url === '/api/update' && method === 'POST') {
    const updatedUser = await readBody(req);
    if (!updatedUser || (!updatedUser.email && !updatedUser.id)) {
      sendJSON(res, 400, { error: 'Dados inválidos.' });
      return true;
    }

    const users = getAllUsers();
    const userKey = String(updatedUser.email || updatedUser.id || '').toUpperCase();
    const idx = users.findIndex(u =>
      String(u.email || u.id || '').toUpperCase() === userKey
    );

    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedUser };
      saveAllUsers(users);
      sendJSON(res, 200, { user: users[idx] });
    } else {
      // user not in DB yet — create it
      users.push(updatedUser);
      saveAllUsers(users);
      sendJSON(res, 200, { user: updatedUser });
    }
    return true;
  }

  // ── POST /api/reset-password ──────────────────────────────────────────────
  if (url === '/api/reset-password' && method === 'POST') {
    const { id, newPassword } = await readBody(req);
    if (!id || !newPassword) {
      sendJSON(res, 400, { error: 'Dados inválidos.' });
      return true;
    }

    const users = getAllUsers();
    const idKey = String(id).toUpperCase();
    const idx = users.findIndex(u =>
      String(u.id || u.email || u.code || '').toUpperCase() === idKey
    );

    if (idx === -1) {
      sendJSON(res, 404, { message: 'ID não encontrado.' });
      return true;
    }

    users[idx].password = newPassword;
    saveAllUsers(users);
    sendJSON(res, 200, { ok: true });
    return true;
  }

  // ── POST /api/recover-id — Find user by name/email query ─────────────────
  if (url === '/api/recover-id' && method === 'POST') {
    const { query } = await readBody(req);
    if (!query) {
      sendJSON(res, 200, { users: [] });
      return true;
    }

    const q = String(query).toLowerCase();
    const users = getAllUsers();
    const found = users.filter(u => {
      return (
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.id || '').toLowerCase().includes(q)
      );
    }).map(u => ({ id: u.id || u.email, name: u.name, email: u.email }));

    sendJSON(res, 200, { users: found });
    return true;
  }

  // ── POST /api/register-school — Register a new school ────────────────────
  if (url === '/api/register-school' && method === 'POST') {
    const newSchool = await readBody(req);
    if (!newSchool || !newSchool.name) {
      sendJSON(res, 400, { error: 'Dados de escola inválidos.' });
      return true;
    }

    let schools = readDB('schools') || [];
    const key = String(newSchool.code || newSchool.coordId || newSchool.name).toLowerCase();
    const exists = schools.some(s =>
      String(s.code || s.coordId || s.name || '').toLowerCase() === key
    );

    if (exists) {
      // Return the existing one
      const existing = schools.find(s =>
        String(s.code || s.coordId || s.name || '').toLowerCase() === key
      );
      sendJSON(res, 200, { school: existing });
      return true;
    }

    schools.push(newSchool);
    writeDB('schools', schools);
    sendJSON(res, 200, { school: newSchool });
    return true;
  }

  // ── POST /api/login — Authenticate teacher or coordinator ─────────────────
  if (url === '/api/login' && method === 'POST') {
    const { email, password } = await readBody(req);
    if (!email || !password) {
      sendJSON(res, 400, { error: 'Dados inválidos.' });
      return true;
    }
    
    const idKey = String(email).toUpperCase().trim();
    
    // Check teachers first
    const users = getAllUsers();
    const foundUser = users.find(u =>
      String(u.id || u.email || '').toUpperCase().trim() === idKey
    );
    if (foundUser && (foundUser.password === password || foundUser.senha === password)) {
      sendJSON(res, 200, { user: foundUser, type: 'professor' });
      return true;
    }

    // Check schools
    const schools = readDB('schools') || [];
    const foundSchool = schools.find(s =>
      String(s.coordId || s.code || s.id || '').toUpperCase().trim() === idKey
    );
    if (foundSchool && (foundSchool.coordPassword === password || foundSchool.password === password)) {
      sendJSON(res, 200, { school: foundSchool, type: 'school' });
      return true;
    }

    sendJSON(res, 401, { error: 'ID ou senha incorretos. Verifique suas credenciais.' });
    return true;
  }

  // ── POST /api/login-coord — Authenticate school coordinator ──────────────
  if (url === '/api/login-coord' && method === 'POST') {
    const { coordId } = await readBody(req);
    if (!coordId) {
      sendJSON(res, 400, { error: 'ID não informado.' });
      return true;
    }

    const schools = readDB('schools') || [];
    const idKey = String(coordId).toUpperCase().trim();
    const found = schools.find(s =>
      String(s.coordId || s.code || s.id || '').toUpperCase().trim() === idKey
    );

    if (found) {
      sendJSON(res, 200, { school: found });
    } else {
      sendJSON(res, 404, { message: 'Escola não encontrada com este ID.' });
    }
    return true;
  }

  // ── POST /api/recover-coord-id — Find school by name/bairro/estado ────────
  if (url === '/api/recover-coord-id' && method === 'POST') {
    const { schoolName, bairro, estado } = await readBody(req);
    const schools = readDB('schools') || [];
    const sN = String(schoolName || '').toLowerCase();
    const sB = String(bairro || '').toLowerCase();
    const sE = String(estado || '').toLowerCase();

    const found = schools.filter(s => {
      const nMatch = !sN || String(s.name || '').toLowerCase().includes(sN);
      const bMatch = !sB || String(s.bairro || '').toLowerCase().includes(sB);
      const eMatch = !sE || String(s.estado || '').toLowerCase().includes(sE);
      return nMatch && bMatch && eMatch;
    }).map(s => ({ coordId: s.coordId || s.code, name: s.name, bairro: s.bairro, estado: s.estado, city: s.city }));

    sendJSON(res, 200, { schools: found });
    return true;
  }

  // ── POST /api/presence — Heartbeat from a user ────────────────────────────
  if (url === '/api/presence' && method === 'POST') {
    const { email, name, statusAula, labName, avatarType, avatarData } = await readBody(req);
    if (!email) {
      sendJSON(res, 400, { error: 'Email obrigatório.' });
      return true;
    }

    const presence = readDB('presence') || {};
    presence[email] = { email, name, statusAula, labName, avatarType, avatarData, lastSeen: Date.now() };
    writeDB('presence', presence);
    sendJSON(res, 200, { ok: true });
    return true;
  }

  // ── GET /api/presence — Get all online users ──────────────────────────────
  if (url === '/api/presence' && method === 'GET') {
    cleanupPresence();
    const presence = readDB('presence') || {};
    const ONLINE_THRESHOLD = 90000; // 90s
    const now = Date.now();
    const onlineUsers = Object.values(presence).filter(u =>
      now - (u.lastSeen || 0) < ONLINE_THRESHOLD
    );
    sendJSON(res, 200, onlineUsers);
    return true;
  }

  // ── POST /api/send-boletim-email — Mock email (no-op without nodemailer config) ──
  if (url === '/api/send-boletim-email' && method === 'POST') {
    // Can be extended later with nodemailer
    sendJSON(res, 200, { ok: true, message: 'Email registrado (sem envio configurado).' });
    return true;
  }

  // ── POST /api/send-status-notification — Mock notification ───────────────
  if (url === '/api/send-status-notification' && method === 'POST') {
    sendJSON(res, 200, { ok: true });
    return true;
  }

  // ── POST /api/import-pdf-invoice — Mock PDF import ───────────────────────
  if (url === '/api/import-pdf-invoice' && method === 'POST') {
    sendJSON(res, 200, { ok: true, fields: {} });
    return true;
  }

  return false; // not an API route
}

// ── HTTP SERVER ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Check if it is an API request
  const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
  if (cleanUrl.startsWith('/api/')) {
    const handled = await handleAPI(req, res);
    if (!handled) {
      sendJSON(res, 404, { error: 'API route not found: ' + cleanUrl });
    }
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, cleanUrl === '/' ? 'index.html' : cleanUrl);

  // Security: prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback
        fs.readFile(path.join(__dirname, 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ SENAIVEST Server rodando em: http://localhost:${PORT}`);
  console.log(`   Acesse no navegador: http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso. Tente outra porta.`);
  } else {
    console.error('Erro no servidor:', err.message);
  }
  process.exit(1);
});
