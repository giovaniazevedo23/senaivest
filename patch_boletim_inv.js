const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// ==============================================================
// PATCH 1: Preencher o bloco 'divergencia' vazio em handleBoletimSubmit
// ==============================================================
const emptyDivergencia = `    } else if (cat === 'divergencia') {\r\n    } else if (cat === 'reparo') {`;
const emptyDivergenciaLF = `    } else if (cat === 'divergencia') {\n    } else if (cat === 'reparo') {`;

const filledDivergencia = `    } else if (cat === 'divergencia') {
        // Ler campos do formulário de divergência
        const produtoSelectEl = document.getElementById('boletim-material-select');
        const selectedOption = produtoSelectEl ? produtoSelectEl.options[produtoSelectEl.selectedIndex] : null;
        const selectedItemId = selectedOption ? selectedOption.getAttribute('data-item-id') : null;

        detalhesCategoria.qtdPrevista = document.getElementById('boletim-divergencia-prevista').value;
        detalhesCategoria.qtdReal = document.getElementById('boletim-divergencia-real').value;
        detalhesCategoria.qtdDiferenca = document.getElementById('boletim-divergencia-diferenca').value;
        detalhesCategoria.responsavel = document.getElementById('boletim-divergencia-responsavel').value.trim();
        detalhesCategoria.dataContagem = document.getElementById('boletim-divergencia-data-contagem').value;
        detalhesCategoria.itemId = selectedItemId;

        finalDescricao = '📊 Divergência quantitativa de estoque identificada na contagem de ' + detalhesCategoria.dataContagem + ' por ' + detalhesCategoria.responsavel + '.\\nQuantidade esperada: ' + detalhesCategoria.qtdPrevista + ' | Quantidade real: ' + detalhesCategoria.qtdReal + ' | Diferença: ' + detalhesCategoria.qtdDiferenca;
        finalSituacao = 'Divergência de estoque';
        finalQtdPrevista = detalhesCategoria.qtdPrevista || '0';
        finalQtdEncontrada = detalhesCategoria.qtdReal || '0';
        finalQtdDiferenca = detalhesCategoria.qtdDiferenca || '0';
        finalAluno = detalhesCategoria.responsavel || 'Não identificado';
        finalObservacoes = 'Contagem em ' + detalhesCategoria.dataContagem + (obsGerais ? ' | ' + obsGerais : '');

        // === ATUALIZAÇÃO AUTOMÁTICA DO ESTOQUE ===
        if (selectedItemId) {
            const itemToUpdate = inventory.find(i => String(i.id) === String(selectedItemId));
            if (itemToUpdate) {
                const qtdReal = parseFloat(detalhesCategoria.qtdReal) || 0;
                const qtdAnterior = parseFloat(itemToUpdate.quantity) || 0;
                itemToUpdate.quantity = String(qtdReal);
                if (!Array.isArray(itemToUpdate.statusHistory)) itemToUpdate.statusHistory = [];
                itemToUpdate.statusHistory.push({
                    type: 'divergencia_corrigida',
                    date: detalhesCategoria.dataContagem || new Date().toISOString().split('T')[0],
                    qtdAnterior: qtdAnterior,
                    qtdCorrigida: qtdReal,
                    responsavel: detalhesCategoria.responsavel,
                    boletimCode: codigo
                });
                syncWithBackend('inventory', inventory);
                showToast('✅ Estoque do item "' + (itemToUpdate.name || 'item') + '" atualizado automaticamente de ' + qtdAnterior + ' para ' + qtdReal + ' unidades.', 'success');
            }
        }
    } else if (cat === 'reparo') {`;

let found = false;
if (c.includes(emptyDivergencia)) {
    c = c.replace(emptyDivergencia, filledDivergencia.replace(/\r\n/g, '\r\n'));
    found = true;
} else if (c.includes(emptyDivergenciaLF)) {
    c = c.replace(emptyDivergenciaLF, filledDivergencia.replace(/\r\n/g, '\n'));
    found = true;
}

if (!found) {
    // Try finding the block differently
    const idx = c.indexOf("} else if (cat === 'divergencia') {");
    console.log('divergencia block at index:', idx);
    if (idx !== -1) {
        // Check what comes after
        console.log('After:', JSON.stringify(c.substring(idx, idx + 80)));
    }
    process.exit(1);
}
console.log('PATCH 1 OK - divergencia block filled');

// ==============================================================
// PATCH 2: Popular select de produtos do inventário em autoFillBoletimFormFields
// ==============================================================
const afterCategorySelect = `        // Opção genérica "Outro" ao final
        const outroOpt = document.createElement('option');
        outroOpt.value = 'Outro';
        outroOpt.textContent = 'Outro';
        tipoSelect.appendChild(outroOpt);
        // Restaurar valor anterior se ainda existir
        if (prevVal) tipoSelect.value = prevVal;
    }
}`;

const afterCategorySelectNew = `        // Opção genérica "Outro" ao final
        const outroOpt = document.createElement('option');
        outroOpt.value = 'Outro';
        outroOpt.textContent = 'Outro';
        tipoSelect.appendChild(outroOpt);
        // Restaurar valor anterior se ainda existir
        if (prevVal) tipoSelect.value = prevVal;
    }

    // === POPULAR SELECT DE PRODUTOS DO INVENTÁRIO NO BOLETIM ===
    const matSelect = document.getElementById('boletim-material-select');
    if (matSelect && typeof inventory !== 'undefined') {
        const prevMatVal = matSelect.value;
        matSelect.innerHTML = '<option value="">-- Selecione o produto --</option>';
        const userSchoolCode = userSchool || (window.getUserSchoolCode ? window.getUserSchoolCode() : '');
        const filteredItems = inventory.filter(item => {
            if (item.statusItem === 'INATIVO') return false;
            if (userSchoolCode && item.escolaCode && !isSameSchool(item.escolaCode, userSchoolCode)) return false;
            return true;
        });
        filteredItems.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.codigoItem || String(item.id);
            opt.setAttribute('data-item-id', String(item.id));
            opt.setAttribute('data-item-qty', String(item.quantity || 0));
            const code = item.codigoItem ? item.codigoItem + ' — ' : '';
            opt.textContent = code + (item.name || 'Item sem nome') + ' (Estoque: ' + (item.quantity || 0) + ')';
            matSelect.appendChild(opt);
        });
        if (prevMatVal) matSelect.value = prevMatVal;

        // Ao selecionar um produto na divergência, preencher quantidade prevista automaticamente
        matSelect.onchange = function() {
            const selOpt = this.options[this.selectedIndex];
            const qty = selOpt ? selOpt.getAttribute('data-item-qty') : '';
            const prevista = document.getElementById('boletim-divergencia-prevista');
            if (prevista && qty) {
                prevista.value = qty;
                // Recalcular diferença
                const realEl = document.getElementById('boletim-divergencia-real');
                const difEl = document.getElementById('boletim-divergencia-diferenca');
                if (realEl && difEl && realEl.value) {
                    difEl.value = parseFloat(realEl.value) - parseFloat(qty);
                }
            }
            // Atualizar o campo oculto de nome do material (retrocompatibilidade)
            const nomeLegacy = document.getElementById('boletim-material-nome');
            if (nomeLegacy && selOpt && selOpt.value) {
                nomeLegacy.value = selOpt.textContent.split(' — ').slice(1).join(' — ').replace(/ \\(Estoque:.*\\)$/, '').trim() || selOpt.textContent;
            }
        };
    }
}`;

const usesAfter = c.includes(afterCategorySelect.replace(/\r\n/g, '\r\n'));
const usesAfterLF = c.includes(afterCategorySelect.replace(/\r\n/g, '\n'));

if (usesAfter) {
    c = c.replace(afterCategorySelect.replace(/\r\n/g, '\r\n'), afterCategorySelectNew.replace(/\r\n/g, '\r\n'));
    console.log('PATCH 2 OK - CRLF');
} else if (usesAfterLF) {
    c = c.replace(afterCategorySelect.replace(/\r\n/g, '\n'), afterCategorySelectNew.replace(/\r\n/g, '\n'));
    console.log('PATCH 2 OK - LF');
} else {
    console.log('PATCH 2 - trying to find the marker...');
    const idx = c.indexOf('Restaurar valor anterior se ainda existir');
    console.log('Found "Restaurar" at:', idx, JSON.stringify(c.substring(idx, idx + 120)));
    process.exit(1);
}

// ==============================================================
// PATCH 3: Gerar codigoItem ao cadastrar novo item no inventário
// ==============================================================
const itemCreation = `    const newItem = {\r\n        criticidade,\r\n        id: newId,`;
const itemCreationLF = `    const newItem = {\n        criticidade,\n        id: newId,`;

const newItemCreation = `    // Gerar código único do item (formato: ALM-ANO-SEQ)
    const currentYear = new Date().getFullYear();
    const totalItems = inventory.length;
    const seqNum = String(totalItems + 1).padStart(3, '0');
    const codigoItem = 'ALM-' + currentYear + '-' + seqNum;

    const newItem = {
        criticidade,
        id: newId,
        codigoItem,`;

if (c.includes(itemCreation)) {
    c = c.replace(itemCreation, newItemCreation.replace(/\n/g, '\r\n'));
    console.log('PATCH 3 OK - CRLF');
} else if (c.includes(itemCreationLF)) {
    c = c.replace(itemCreationLF, newItemCreation);
    console.log('PATCH 3 OK - LF');
} else {
    console.log('PATCH 3 NOT FOUND');
    const idx = c.indexOf('const newItem = {');
    console.log('newItem at:', idx, JSON.stringify(c.substring(idx, idx + 80)));
}

fs.writeFileSync('app.js', c);
console.log('All patches applied to app.js');
