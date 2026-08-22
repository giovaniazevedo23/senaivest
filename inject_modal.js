const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const modalHtml = `
    <!-- Modal Adicionar Categoria Agenda -->
    <div id="modal-add-agenda-category" class="modal-overlay">
        <div class="modal-box" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Criar Categoria (Agenda)</h2>
                <button class="btn-close-modal" onclick="closeModal('modal-add-agenda-category')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Nome da Categoria:</label>
                    <input type="text" id="ext-category-name" class="form-control" placeholder="Ex: Feriado, Prova..." style="background: rgba(0,0,0,0.1);">
                </div>
                <div class="form-group" style="margin-bottom: 25px;">
                    <label>Cor da Categoria:</label>
                    <input type="color" id="ext-category-color" value="#f59e0b" style="width: 100%; height: 40px; padding: 0; border: none; border-radius: 4px; cursor: pointer;">
                </div>
                <button type="button" class="btn-primary" onclick="salvarNovaCategoriaAgenda()" style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 8px;">Salvar Categoria</button>
            </div>
        </div>
    </div>
</body>`;

// Check if the modal <div> actually exists, not just the string
if (!html.includes('<div id="modal-add-agenda-category"')) {
    html = html.replace(/<\/body>/i, modalHtml);
    console.log("Added modal-add-agenda-category to index.html");
    fs.writeFileSync('index.html', html, 'utf8');
} else {
    console.log("Modal already exists in index.html");
}
