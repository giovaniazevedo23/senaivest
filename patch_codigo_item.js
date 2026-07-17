const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// Check if divergencia block already has content (was already patched)
const divCheck = c.indexOf('ATUALIZAÇÃO AUTOMÁTICA DO ESTOQUE');
const newItemCheck = c.indexOf('codigoItem,');
console.log('Divergencia already patched:', divCheck !== -1);
console.log('codigoItem already added:', newItemCheck !== -1);

// PATCH 3: Gerar codigoItem ao cadastrar novo item
// Find: const newItem = {\n        criticidade,
const itemCreationCRLF = "    const newItem = {\r\n        criticidade,\r\n        id: newId,";
const itemCreationLF = "    const newItem = {\n        criticidade,\n        id: newId,";

if (newItemCheck !== -1) {
    console.log('codigoItem ALREADY EXISTS - skipping PATCH 3');
} else {
    const newItemCreationCRLF = `    // Gerar código único do item (formato: ALM-ANO-SEQ)\r\n    const currentYear = new Date().getFullYear();\r\n    const totalItems = inventory.length;\r\n    const seqNum = String(totalItems + 1).padStart(3, '0');\r\n    const codigoItem = 'ALM-' + currentYear + '-' + seqNum;\r\n\r\n    const newItem = {\r\n        criticidade,\r\n        id: newId,\r\n        codigoItem,`;
    const newItemCreationLF = `    // Gerar código único do item (formato: ALM-ANO-SEQ)\n    const currentYear = new Date().getFullYear();\n    const totalItems = inventory.length;\n    const seqNum = String(totalItems + 1).padStart(3, '0');\n    const codigoItem = 'ALM-' + currentYear + '-' + seqNum;\n\n    const newItem = {\n        criticidade,\n        id: newId,\n        codigoItem,`;

    if (c.includes(itemCreationCRLF)) {
        c = c.replace(itemCreationCRLF, newItemCreationCRLF);
        console.log('PATCH 3 OK - CRLF');
    } else if (c.includes(itemCreationLF)) {
        c = c.replace(itemCreationLF, newItemCreationLF);
        console.log('PATCH 3 OK - LF');
    } else {
        console.log('PATCH 3 NOT FOUND');
        const idx = c.indexOf('const newItem = {');
        console.log('newItem block at:', idx);
        if (idx !== -1) console.log('Context:', JSON.stringify(c.substring(idx, idx+120)));
        process.exit(1);
    }
}

// Check and remove double-patched divergencia block if it occurred
const doublePatch = c.split('ATUALIZAÇÃO AUTOMÁTICA DO ESTOQUE').length - 1;
console.log('Divergencia patch count:', doublePatch);
if (doublePatch > 1) {
    // Need to remove the duplicate - find second occurrence and its block
    const firstIdx = c.indexOf('ATUALIZAÇÃO AUTOMÁTICA DO ESTOQUE');
    const secondIdx = c.indexOf('ATUALIZAÇÃO AUTOMÁTICA DO ESTOQUE', firstIdx + 10);
    if (secondIdx !== -1) {
        // Find the enclosing else if block boundary before secondIdx
        const blockStart = c.lastIndexOf("    } else if (cat === 'divergencia') {", secondIdx);
        // Find the next else if after second block
        const blockEnd = c.indexOf("    } else if (cat === 'reparo') {", secondIdx);
        if (blockStart !== -1 && blockEnd !== -1) {
            // Remove the duplicate block (from blockStart to before blockEnd)
            const before = c.substring(0, blockStart);
            const after = c.substring(blockEnd);
            c = before + after;
            console.log('Removed duplicate divergencia block');
        } else {
            console.log('Could not find block boundaries for dedup');
        }
    }
}

fs.writeFileSync('app.js', c);
console.log('Patch 3 done');
