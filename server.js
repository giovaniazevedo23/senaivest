const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    // Tratamento de URL decodificada para suportar caracteres e espaços em nomes de arquivo
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let decodedPath = decodeURIComponent(parsedUrl.pathname);

    // Rota padrão ou raiz
    if (decodedPath === '/' || decodedPath === '') {
        decodedPath = '/index.html';
    }

    let filePath = path.join(__dirname, decodedPath);

    // Evitar directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Acesso Negado');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Se o arquivo não existir, servir o index.html (SPA fallback)
            filePath = path.join(__dirname, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Erro interno do servidor ao ler arquivo.');
                return;
            }

            // Cache curto para estáticos e nenhum para HTML
            const headers = { 'Content-Type': contentType };
            if (ext === '.html') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            } else {
                headers['Cache-Control'] = 'public, max-age=86400';
            }

            res.writeHead(200, headers);
            res.end(content);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 SenaiVest 2.0 rodando com sucesso em http://${HOST}:${PORT}`);
});
