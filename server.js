const http = require('http');
const fs = require('fs');
const path = require('path');

// Load local environment variables from .env file if available
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, using process.env directly
}

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = __dirname;
const MONGODB_URI = process.env.MONGODB_URI; // Set this in Railway/Render env vars

// ────────────────────────────────────────────────────────────────────────────
// MONGODB — persistent cross-device user database
// Falls back to JSON files if MONGODB_URI is not set (local dev mode)
// ────────────────────────────────────────────────────────────────────────────
let usersCollection = null;
let appDataCollection = null;

async function initMongoDB() {
    if (!MONGODB_URI) {
        console.log('ℹ️  MONGODB_URI not configured — using JSON file storage (local mode)');
        return false;
    }
    try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(MONGODB_URI, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000
        });
        await client.connect();
        const db = client.db('senaivest');
        
        usersCollection = db.collection('users');
        appDataCollection = db.collection('appdata');
        
        // Unique index on email (case-insensitive)
        await usersCollection.createIndex(
            { email: 1 },
            { unique: true, collation: { locale: 'en', strength: 2 } }
        );
        
        console.log('✅ Connected to MongoDB Atlas — persistent storage active');
        return true;
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('↩️  Falling back to JSON file storage');
        return false;
    }
}

// ── JSON file helpers (fallback) ──────────────────────────────────────────
function readJSONFile(name) {
    const filePath = path.join(PUBLIC_DIR, `${name}.json`);
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || 'null');
    } catch (_) { return null; }
}

function writeJSONFile(name, data) {
    try {
        const filePath = path.join(PUBLIC_DIR, `${name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.warn(`Could not write ${name}.json:`, err.message);
        return false;
    }
}

// ── User operations ──────────────────────────────────────────────────────
async function findUserByEmail(email) {
    const normalized = email.toLowerCase().trim();
    if (usersCollection) {
        return await usersCollection.findOne(
            { email: normalized },
            { collation: { locale: 'en', strength: 2 } }
        );
    }
    const users = readJSONFile('users') || [];
    return users.find(u => u.email.toLowerCase() === normalized) || null;
}

async function registerUser(user) {
    const toSave = { ...user, email: user.email.toLowerCase().trim() };
    if (usersCollection) {
        try {
            await usersCollection.insertOne(toSave);
            return { ok: true };
        } catch (err) {
            if (err.code === 11000) return { ok: false, duplicate: true };
            throw err;
        }
    }
    // JSON fallback
    const users = readJSONFile('users') || [];
    const exists = users.some(u => u.email.toLowerCase() === toSave.email);
    if (exists) return { ok: false, duplicate: true };
    users.push(toSave);
    writeJSONFile('users', users);
    return { ok: true };
}

async function upsertUser(user) {
    const toSave = { ...user, email: user.email.toLowerCase().trim() };
    if (usersCollection) {
        await usersCollection.updateOne(
            { email: toSave.email },
            { $set: toSave },
            { upsert: true }
        );
        return true;
    }
    const users = readJSONFile('users') || [];
    const idx = users.findIndex(u => u.email.toLowerCase() === toSave.email);
    if (idx !== -1) users[idx] = { ...users[idx], ...toSave };
    else users.push(toSave);
    writeJSONFile('users', users);
    return true;
}

// ── App data (shared across all users) ──────────────────────────────────
const DATA_TYPES = ['schools', 'labs', 'posts', 'plans', 'inventory', 'boletins', 'notifications'];
const memoryStore = {};

async function initAppData() {
    if (appDataCollection) {
        // Load from MongoDB
        const docs = await appDataCollection.find({ _type: { $in: DATA_TYPES } }).toArray();
        DATA_TYPES.forEach(t => {
            const doc = docs.find(d => d._type === t);
            memoryStore[t] = doc ? doc.data : null;
        });
    } else {
        // Load from JSON files
        DATA_TYPES.forEach(t => {
            memoryStore[t] = readJSONFile(t);
        });
    }
}

async function saveAppData(type, data) {
    memoryStore[type] = data; // update in-memory (all clients see instantly on next poll)
    if (appDataCollection) {
        await appDataCollection.updateOne(
            { _type: type },
            { $set: { _type: type, data } },
            { upsert: true }
        );
    } else {
        writeJSONFile(type, data);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// MIME types
// ────────────────────────────────────────────────────────────────────────────
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

// ────────────────────────────────────────────────────────────────────────────
// HTTP Server
// ────────────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
        console.error('Unhandled request error:', err);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
        }
    });
});

async function handleRequest(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`${req.method} ${req.url}`);

    let safeUrl = req.url.split('?')[0];
    if (safeUrl === '/') safeUrl = '/index.html';

    // ── API Routes ───────────────────────────────────────────────────────
    if (safeUrl.startsWith('/api/')) {
        const body = await readBody(req);

        // POST /api/register — create new user account
        if (safeUrl === '/api/register' && req.method === 'POST') {
            const newUser = parseJSON(body);
            if (!newUser || !newUser.email || !newUser.password) {
                respond(res, 400, { error: 'ID de Acesso e senha são obrigatórios.' });
                return;
            }
            const result = await registerUser(newUser);
            if (result.ok) {
                respond(res, 201, { message: 'Usuário cadastrado com sucesso!', user: newUser });
            } else if (result.duplicate) {
                respond(res, 409, { error: 'Este ID de Acesso já possui uma conta cadastrada. Utilize seu login e senha para acessar o sistema.' });
            } else {
                respond(res, 500, { error: 'Erro ao salvar o usuário.' });
            }
            return;
        }

        // POST /api/login — authenticate user, return specific errors
        if (safeUrl === '/api/login' && req.method === 'POST') {
            const creds = parseJSON(body);
            if (!creds || !creds.email || !creds.password) {
                respond(res, 400, { error: 'ID de Acesso e senha são obrigatórios.' });
                return;
            }

            const user = await findUserByEmail(creds.email);

            if (!user) {
                // Email not found in database
                respond(res, 404, { error: 'EMAIL_NOT_FOUND', message: 'Nenhuma conta encontrada com este ID de Acesso.' });
                return;
            }

            if (user.password !== creds.password) {
                // Email found but password wrong
                respond(res, 401, { error: 'WRONG_PASSWORD', message: 'Senha incorreta. Verifique e tente novamente.' });
                return;
            }

            // Success
            respond(res, 200, { message: 'Login bem-sucedido!', user });
            return;
        }

        // POST /api/register-school — create new school account
        if (safeUrl === '/api/register-school' && req.method === 'POST') {
            const newSchool = parseJSON(body);
            if (!newSchool || !newSchool.name || !newSchool.coordId) {
                respond(res, 400, { error: 'Dados da escola incompletos.' });
                return;
            }
            
            if (!newSchool.code) {
                newSchool.code = newSchool.coordId;
            }

            const schools = memoryStore['schools'] || readJSONFile('schools') || [];
            if (!newSchool.id) {
                newSchool.id = newSchool.coordId;
            }

            const exists = schools.find(s => String(s.coordId || s.code || s.id || '').toLowerCase() === String(newSchool.coordId).toLowerCase());
            
            if (exists) {
                respond(res, 409, { message: 'ID da coordenação já está em uso.' });
                return;
            }

            schools.push(newSchool);
            await saveAppData('schools', schools);
            respond(res, 201, { message: 'Escola registrada com sucesso!', school: newSchool });
            return;
        }

        // POST /api/login-coord — authenticate coordination portal
        if (safeUrl === '/api/login-coord' && req.method === 'POST') {
            const creds = parseJSON(body);
            if (!creds || !creds.coordId) {
                respond(res, 400, { error: 'ID da coordenação é obrigatório.' });
                return;
            }

            const schools = memoryStore['schools'] || readJSONFile('schools') || [];
            const inputId = String(creds.coordId).trim().toLowerCase();
            const school = schools.find(s => String(s.coordId || s.code || s.id || '').trim().toLowerCase() === inputId);

            if (!school) {
                respond(res, 404, { message: 'Escola / Coordenação não encontrada com este ID.' });
                return;
            }

            respond(res, 200, { message: 'Login bem-sucedido!', school });
            return;
        }

        // POST /api/update — update user profile
        if (safeUrl === '/api/update' && req.method === 'POST') {
            const updatedUser = parseJSON(body);
            if (!updatedUser || !updatedUser.email) {
                respond(res, 400, { error: 'Dados inválidos.' });
                return;
            }
            await upsertUser(updatedUser);
            respond(res, 200, { message: 'Perfil atualizado com sucesso!', user: updatedUser });
            return;
        }

        // GET /api/users — return all registered user accounts (names/emails/roles/etc.)
        if (safeUrl === '/api/users' && req.method === 'GET') {
            let users = [];
            if (usersCollection) {
                users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
            } else {
                users = readJSONFile('users') || [];
                // strip passwords
                users = users.map(({ password, ...rest }) => rest);
            }
            respond(res, 200, users);
            return;
        }

        // GET /api/data — return all shared app data (schools, inventory, etc.)
        if (safeUrl === '/api/data' && req.method === 'GET') {
            respond(res, 200, { ...memoryStore });
            return;
        }

        // POST /api/save — save a data type (shared across all users)
        if (safeUrl === '/api/save' && req.method === 'POST') {
            const payload = parseJSON(body);
            if (!payload || !DATA_TYPES.includes(payload.type) || !Array.isArray(payload.data)) {
                respond(res, 400, { error: 'Payload inválido.' });
                return;
            }
            await saveAppData(payload.type, payload.data);
            respond(res, 200, { message: `${payload.type} salvo com sucesso!` });
            return;
        }

        // POST /api/send-boletim-email — send boletim PDF to school coordination email
        if (safeUrl === '/api/send-boletim-email' && req.method === 'POST') {
            const payload = parseJSON(body);
            if (!payload || !payload.boletim || !payload.schoolEmail) {
                respond(res, 400, { error: 'Dados do boletim e e-mail da escola são obrigatórios.' });
                return;
            }
            
            const { boletim, schoolEmail, schoolName } = payload;
            const smtpHost = process.env.SMTP_HOST;
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;
            const smtpFrom = process.env.SMTP_FROM || 'senaivest@senai.br';
            
            if (smtpHost && smtpUser && smtpPass) {
                // Real email sending with nodemailer
                try {
                    const nodemailer = require('nodemailer');
                    const transporter = nodemailer.createTransport({
                        host: smtpHost,
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: (process.env.SMTP_PORT || '587') === '465',
                        auth: { user: smtpUser, pass: smtpPass }
                    });
                    
                    const htmlBody = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: #2c3e50; padding: 20px; text-align: center;">
                                <h1 style="color: #d3bca2; margin: 0;">SENAIVEST</h1>
                                <p style="color: #fff; margin: 5px 0 0;">Sistema de Controle de Almoxarifado</p>
                            </div>
                            <div style="padding: 25px; background: #f9f9f9;">
                                <h2 style="color: #2c3e50;">Boletim de Ocorrência: ${boletim.code}</h2>
                                <p>Um novo boletim de ocorrência foi registrado no sistema SENAIVEST.</p>
                                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Categoria:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.categoria || 'N/A'}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Data:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.date} ${boletim.timeOfDay ? 'às ' + boletim.timeOfDay : ''}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Professor:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.professor}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Material:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.material}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Situação:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.situacao}</td></tr>
                                    <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Descrição:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${boletim.descricao}</td></tr>
                                </table>
                                <p style="color: #666; font-size: 0.85rem;">O PDF completo do boletim pode ser gerado diretamente no sistema SENAIVEST.</p>
                            </div>
                            <div style="background: #2c3e50; padding: 15px; text-align: center;">
                                <p style="color: #888; font-size: 0.75rem; margin: 0;">© 2026 SENAIVEST — Plataforma de Gestão de Almoxarifados SENAI</p>
                            </div>
                        </div>
                    `;
                    
                    await transporter.sendMail({
                        from: `"SENAIVEST" <${smtpFrom}>`,
                        to: schoolEmail,
                        subject: `[SENAIVEST] Boletim de Ocorrência ${boletim.code} — ${boletim.material}`,
                        html: htmlBody
                    });
                    
                    console.log(`✅ E-mail enviado para ${schoolEmail} (${schoolName}) — Boletim ${boletim.code}`);
                    respond(res, 200, { message: 'E-mail enviado com sucesso!', sent: true });
                } catch (emailErr) {
                    console.error('❌ Erro ao enviar e-mail:', emailErr.message);
                    respond(res, 500, { error: 'Falha ao enviar e-mail.', details: emailErr.message });
                }
            } else {
                // SMTP not configured — simulate (local dev mode)
                console.log(`📧 [SIMULADO] Boletim ${boletim.code} seria enviado para ${schoolEmail} (${schoolName})`);
                console.log(`   Material: ${boletim.material} | Prof: ${boletim.professor} | Situação: ${boletim.situacao}`);
                respond(res, 200, { 
                    message: 'E-mail registrado (modo simulado — configure SMTP_HOST, SMTP_USER, SMTP_PASS para envio real).', 
                    sent: false, 
                    simulated: true 
                });
            }
            return;
        }

        respond(res, 404, { error: 'Endpoint não encontrado.' });
        return;
    }

    // ── Static files ─────────────────────────────────────────────────────
    let filePath = path.join(PUBLIC_DIR, decodeURIComponent(safeUrl));
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404); res.end('Not Found'); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => resolve(body));
        req.on('error', () => resolve(''));
    });
}

function parseJSON(str) {
    try { return JSON.parse(str); } catch (_) { return null; }
}

function respond(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// ────────────────────────────────────────────────────────────────────────────
// STARTUP
// ────────────────────────────────────────────────────────────────────────────
async function start() {
    await initMongoDB();
    await initAppData();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 SENAIVEST rodando em http://0.0.0.0:${PORT}/`);
        console.log(`📦 Modo: ${MONGODB_URI ? 'MongoDB Atlas (persistente)' : 'JSON local (efêmero)'}`);
    });
}

start();
