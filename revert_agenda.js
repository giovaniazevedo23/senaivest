const fs = require('fs');

function removeButtonAndModal() {
    let html = fs.readFileSync('index.html', 'utf8');

    // Remove the button
    const btnRegex = /<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">\s*<h4 style="color: #fff; margin: 0; font-size: 1rem;">Adicionar Evento<\/h4>\s*<button type="button" class="btn-external-agenda-category"[\s\S]*?<\/button>\s*<\/div>/;
    if (btnRegex.test(html)) {
        html = html.replace(btnRegex, '<h4 style="color: #fff; margin-bottom: 15px; font-size: 1rem;">Adicionar Evento</h4>');
        console.log("Removed external button from index.html");
    }

    // Remove the modal
    const modalRegex = /<!-- Modal Adicionar Categoria Agenda -->\s*<div id="modal-add-agenda-category"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
    if (modalRegex.test(html)) {
        html = html.replace(modalRegex, '');
        console.log("Removed modal from index.html");
    }

    fs.writeFileSync('index.html', html, 'utf8');
}

function removeLogic(filepath) {
    if (!fs.existsSync(filepath)) return;
    let js = fs.readFileSync(filepath, 'utf8');

    // Remove global salvarNovaCategoriaAgenda function
    const globalFuncRegex = /\/\/ =====================================\s*\/\/ NOVA LOGICA DE CATEGORIA EXTERNA AGENDA\s*\/\/ =====================================\s*window\.salvarNovaCategoriaAgenda = function\(\) \{[\s\S]*?\};\s*/;
    if (globalFuncRegex.test(js)) {
        js = js.replace(globalFuncRegex, '');
        console.log(`Removed salvarNovaCategoriaAgenda from ${filepath}`);
    }

    fs.writeFileSync(filepath, js, 'utf8');
}

try {
    removeButtonAndModal();
    removeLogic('app.js');
    removeLogic('app_v2.js');
} catch (e) {
    console.error(e);
}
