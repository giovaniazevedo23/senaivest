const fs = require('fs');

function patchHtml() {
    let html = fs.readFileSync('index.html', 'utf8');

    // 1. Remove new-category-group from index.html (Lines ~3328 to ~3338)
    const categoryGroupRegex = /\s*<div id="new-category-group" style="display: none;[\s\S]*?<\/div>\s*<\/div>/;
    if (categoryGroupRegex.test(html)) {
        html = html.replace(categoryGroupRegex, '');
        console.log("Removed new-category-group from index.html");
    }

    // 2. Add Button next to "Adicionar Evento"
    const headerRegex = /(<h4 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Adicionar Evento<\/h4>)/;
    if (headerRegex.test(html) && !html.includes('btn-external-agenda-category')) {
        const replacement = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">\n' +
                                    '<h4 style="color: #fff; margin: 0; font-size: 1rem;">Adicionar Evento</h4>\n' +
                                    '<button type="button" class="btn-external-agenda-category" onclick="openModal(\'modal-add-agenda-category\')" style="background: var(--accent-blue); color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(59,130,246,0.3);">+ Categoria</button>\n' +
                                '</div>';
        html = html.replace(headerRegex, replacement);
        console.log("Added external category button to index.html");
    }

    // 3. Add modal-add-agenda-category to the end of index.html (before </body>)
    const modalHtml = '\n' +
    '<!-- Modal Adicionar Categoria Agenda -->\n' +
    '<div id="modal-add-agenda-category" class="modal-overlay">\n' +
        '<div class="modal-box" style="max-width: 400px;">\n' +
            '<div class="modal-header">\n' +
                '<h2>Criar Categoria (Agenda)</h2>\n' +
                '<button class="btn-close-modal" onclick="closeModal(\'modal-add-agenda-category\')">&times;</button>\n' +
            '</div>\n' +
            '<div class="modal-body">\n' +
                '<div class="form-group" style="margin-bottom: 15px;">\n' +
                    '<label>Nome da Categoria:</label>\n' +
                    '<input type="text" id="ext-category-name" class="form-control" placeholder="Ex: Feriado, Prova..." style="background: rgba(0,0,0,0.1);">\n' +
                '</div>\n' +
                '<div class="form-group" style="margin-bottom: 25px;">\n' +
                    '<label>Cor da Categoria:</label>\n' +
                    '<input type="color" id="ext-category-color" value="#f59e0b" style="width: 100%; height: 40px; padding: 0; border: none; border-radius: 4px; cursor: pointer;">\n' +
                '</div>\n' +
                '<button type="button" class="btn-primary" onclick="salvarNovaCategoriaAgenda()" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px;">Salvar Categoria</button>\n' +
            '</div>\n' +
        '</div>\n' +
    '</div>\n' +
'</body>';
    if (!html.includes('modal-add-agenda-category')) {
        html = html.replace(/<\/body>/i, modalHtml);
        console.log("Added modal-add-agenda-category to index.html");
    }

    fs.writeFileSync('index.html', html, 'utf8');
}

function patchApp(filepath) {
    if (!fs.existsSync(filepath)) return;
    let js = fs.readFileSync(filepath, 'utf8');

    // 1. Remove the "add_new" option logic in populateCategorySelects
    const addNewOptionRegex = /html \+= `<option value="add_new">\+ Adicionar Categoria\.\.\.<\/option>`;/;
    if (addNewOptionRegex.test(js)) {
        js = js.replace(addNewOptionRegex, '');
        console.log("Removed add_new option from populateCategorySelects in " + filepath);
    }

    // 2. Remove the event listener for 'add_new' in event-type
    const listenerRegex = /if \(typeSelect && newCategoryGroup\) \{[\s\S]*?\}\s*\}/;
    if (listenerRegex.test(js)) {
        js = js.replace(/typeSelect\.addEventListener\('change', \(e\) => \{[\s\S]*?\}\);/, '');
        console.log("Removed typeSelect change listener in " + filepath);
    }

    // 3. Remove the new category logic inside add-event-form submission
    const formSubmitCatRegex = /\/\/ Lidar com nova categoria\s*if \(type === 'add_new'\) \{[\s\S]*?type = newCatId;\s*\}/;
    if (formSubmitCatRegex.test(js)) {
        js = js.replace(formSubmitCatRegex, '');
        console.log("Removed internal category creation from form submit in " + filepath);
    }

    // 4. Inject global function salvarNovaCategoriaAgenda() at the bottom of the file
    if (!js.includes('function salvarNovaCategoriaAgenda')) {
        const globalFunc = '\n' +
'// =====================================\n' +
'// NOVA LOGICA DE CATEGORIA EXTERNA AGENDA\n' +
'// =====================================\n' +
'window.salvarNovaCategoriaAgenda = function() {\n' +
    'const newCatName = document.getElementById(\'ext-category-name\').value.trim();\n' +
    'const newCatColor = document.getElementById(\'ext-category-color\').value;\n' +
'\n' +
    'if (!newCatName) {\n' +
        'if(typeof showToast === \'function\') showToast("Por favor, digite um nome para a nova categoria.", "warning");\n' +
        'else alert("Por favor, digite um nome.");\n' +
        'return;\n' +
    '}\n' +
'\n' +
    'const newCatId = \'cat_\' + Date.now();\n' +
    'const newCat = { id: newCatId, name: newCatName, color: newCatColor };\n' +
    '\n' +
    '// Assegurar que estamos usando a variável global correta para salvar\n' +
    'if (typeof eventCategories !== \'undefined\') {\n' +
        'eventCategories.push(newCat);\n' +
        'localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(eventCategories));\n' +
        '\n' +
        'if (typeof populateCategorySelects === \'function\') populateCategorySelects();\n' +
        'if (typeof renderLegend === \'function\') renderLegend();\n' +
        '\n' +
        'if(typeof showToast === \'function\') showToast("Categoria criada com sucesso!", "success");\n' +
        'if(typeof closeModal === \'function\') closeModal(\'modal-add-agenda-category\');\n' +
        '\n' +
        'document.getElementById(\'ext-category-name\').value = \'\';\n' +
    '} else {\n' +
        'alert("Erro: Variável eventCategories não encontrada no contexto.");\n' +
    '}\n' +
'};\n';
        js += globalFunc;
        console.log("Injected salvarNovaCategoriaAgenda in " + filepath);
    }

    fs.writeFileSync(filepath, js, 'utf8');
}

try {
    patchHtml();
    patchApp('app.js');
    patchApp('app_v2.js');
} catch (e) {
    console.error(e);
}
