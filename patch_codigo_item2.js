const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// Mixed line endings: LF at start, CRLF inside
const itemCreationMixed = "    const newItem = {\n        criticidade,\r\n        id: newId,";
const newItemCreationMixed = `    // Gerar código único do item (formato: ALM-ANO-SEQ)\r\n    const currentYear = new Date().getFullYear();\r\n    const totalItems = inventory.length;\r\n    const seqNum = String(totalItems + 1).padStart(3, '0');\r\n    const codigoItem = 'ALM-' + currentYear + '-' + seqNum;\r\n\r\n    const newItem = {\n        criticidade,\r\n        id: newId,\r\n        codigoItem,`;

if (c.includes(itemCreationMixed)) {
    c = c.replace(itemCreationMixed, newItemCreationMixed);
    console.log('PATCH 3 OK - mixed line endings');
    fs.writeFileSync('app.js', c);
} else {
    console.log('NOT FOUND - trying alternate approach');
    // Find the exact byte sequence
    const idx = c.indexOf('const newItem = {');
    const region = c.substring(idx, idx + 150);
    const bytes = Buffer.from(region).slice(0, 80);
    console.log('Bytes:', bytes.toString('hex'));
    process.exit(1);
}
