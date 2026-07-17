const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// Fix the corrupted section around lines 7903-7960
// The issue is that lines from autoFillBoletimFormFields were cut incorrectly.
// Let's fix the broken function by finding and restoring the proper structure.

const brokenSection = `                if (!foundValue) {\r\n                    const schoolObj = registeredSchools.find(s => isSameSchool(s.code, userSchool) || isSameSchool(s.name, userSchool));\r\n                    const opt = document.createElement('option');\r\nconst selectPlano = document.getElementById('boletim-plano-codigo');\r\n    if (selectPlano && typeof lessonPlans !== 'undefined') {`;

const fixedSection = `                if (!foundValue) {\r\n                    const schoolObj = registeredSchools.find(s => isSameSchool(s.code, userSchool) || isSameSchool(s.name, userSchool));\r\n                    const opt = document.createElement('option');\r\n                    opt.value = schoolObj ? schoolObj.code : userSchool;\r\n                    opt.textContent = schoolObj ? (schoolObj.name || schoolObj.code) : userSchool;\r\n                    selectEscola.appendChild(opt);\r\n                    foundValue = opt.value;\r\n                }\r\n                selectEscola.value = foundValue;\r\n                selectEscola.disabled = true;\r\n            }\r\n        } catch (e) { }\r\n    }\r\n\r\n    const selectPlano = document.getElementById('boletim-plano-codigo');\r\n    if (selectPlano && typeof lessonPlans !== 'undefined') {`;

if (c.includes(brokenSection)) {
    c = c.replace(brokenSection, fixedSection);
    console.log('STRUCTURE FIX OK');
} else {
    console.log('Broken section not found — checking variant');
    const idx = c.indexOf("const opt = document.createElement('option');\r\nconst selectPlano");
    if (idx !== -1) {
        console.log('Found variant at:', idx);
        const region = c.substring(idx - 200, idx + 500);
        console.log(JSON.stringify(region));
    } else {
        console.log('Neither found');
    }
    process.exit(1);
}

// Now add the product select population BEFORE the closing } of autoFillBoletimFormFields
const closingMarker = `        // Restaurar valor anterior se ainda existir\r\n        if (prevVal) tipoSelect.value = prevVal;\r\n    }\r\n}\r\n\r\nfunction handleBoletimPlanoChange()`;

const closingReplacement = `        // Restaurar valor anterior se ainda existir\r\n        if (prevVal) tipoSelect.value = prevVal;\r\n    }\r\n\r\n    // === POPULAR SELECT DE PRODUTOS DO INVENTÁRIO NO BOLETIM ===\r\n    const matSelect = document.getElementById('boletim-material-select');\r\n    if (matSelect && typeof inventory !== 'undefined') {\r\n        const prevMatVal = matSelect.value;\r\n        matSelect.innerHTML = '<option value="">-- Selecione o produto --</option>';\r\n        const userSchoolCode = userSchool || (window.getUserSchoolCode ? window.getUserSchoolCode() : '');\r\n        const filteredItems = inventory.filter(item => {\r\n            if (item.statusItem === 'INATIVO') return false;\r\n            if (userSchoolCode && item.escolaCode && !isSameSchool(item.escolaCode, userSchoolCode)) return false;\r\n            return true;\r\n        });\r\n        filteredItems.forEach(item => {\r\n            const opt = document.createElement('option');\r\n            opt.value = item.codigoItem || String(item.id);\r\n            opt.setAttribute('data-item-id', String(item.id));\r\n            opt.setAttribute('data-item-qty', String(item.quantity || 0));\r\n            opt.setAttribute('data-item-name', item.name || '');\r\n            const codePrefix = item.codigoItem ? item.codigoItem + ' — ' : '';\r\n            opt.textContent = codePrefix + (item.name || 'Item sem nome') + ' (Estoque: ' + (item.quantity || 0) + ')';\r\n            matSelect.appendChild(opt);\r\n        });\r\n        if (prevMatVal) matSelect.value = prevMatVal;\r\n\r\n        // Ao selecionar produto, preencher quantidade prevista (contexto divergência)\r\n        matSelect.onchange = function() {\r\n            const selOpt = this.options[this.selectedIndex];\r\n            if (!selOpt || !selOpt.value) return;\r\n            const qty = selOpt.getAttribute('data-item-qty') || '';\r\n            const itemName = selOpt.getAttribute('data-item-name') || selOpt.textContent;\r\n            // Campo legado de nome do material\r\n            const nomeLegacy = document.getElementById('boletim-material-nome');\r\n            if (nomeLegacy) nomeLegacy.value = itemName;\r\n            // Preencher quantidade prevista se campo de divergência visível\r\n            const prevista = document.getElementById('boletim-divergencia-prevista');\r\n            if (prevista && qty) {\r\n                prevista.value = qty;\r\n                const realEl = document.getElementById('boletim-divergencia-real');\r\n                const difEl = document.getElementById('boletim-divergencia-diferenca');\r\n                if (realEl && difEl && realEl.value) {\r\n                    difEl.value = parseFloat(realEl.value || 0) - parseFloat(qty || 0);\r\n                }\r\n            }\r\n        };\r\n    }\r\n}\r\n\r\nfunction handleBoletimPlanoChange()`;

if (c.includes(closingMarker)) {
    c = c.replace(closingMarker, closingReplacement);
    console.log('PRODUCT SELECT POPULATION OK');
} else {
    console.log('closing marker not found, trying variant');
    const idx = c.indexOf('if (prevVal) tipoSelect.value = prevVal;');
    console.log('tipoSelect.value at:', idx, JSON.stringify(c.substring(idx, idx + 100)));
    process.exit(1);
}

fs.writeFileSync('app.js', c);
console.log('All patches applied');
