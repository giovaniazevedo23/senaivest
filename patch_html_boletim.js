const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// Replace boletim-material-nome input with select + hidden input
const oldMaterialField = `                        <div class="boletim-section-title">1. Identificação do Material</div>\r\n                        <div class="form-row">\r\n                            <div class="form-group-boletim">\r\n                                <label for="boletim-material-nome">Nome do material:</label>\r\n                                <input type="text" id="boletim-material-nome" placeholder="Nome do item ocorrido">\r\n                            </div>\r\n                        </div>`;

const newMaterialField = `                        <div class="boletim-section-title">1. Identificação do Material</div>\r\n                        <div class="form-row">\r\n                            <div class="form-group-boletim">\r\n                                <label for="boletim-material-select">Produto do Almoxarifado: <span style="color: var(--accent-red);">*</span></label>\r\n                                <select id="boletim-material-select" class="form-control"\r\n                                    style="background: var(--bg-dark); color: #fff; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 4px; width: 100%;">\r\n                                    <option value="">-- Selecione o produto --</option>\r\n                                    <!-- Populado dinamicamente via autoFillBoletimFormFields() -->\r\n                                </select>\r\n                                <!-- Campo oculto legado para retrocompatibilidade com handleBoletimSubmit -->\r\n                                <input type="hidden" id="boletim-material-nome" value="">\r\n                            </div>\r\n                        </div>`;

if (c.includes(oldMaterialField)) {
    c = c.replace(oldMaterialField, newMaterialField);
    console.log('Material field replaced OK (CRLF)');
} else {
    // Try LF
    const oldLF = oldMaterialField.replace(/\r\n/g, '\n');
    const newLF = newMaterialField.replace(/\r\n/g, '\n');
    if (c.includes(oldLF)) {
        c = c.replace(oldLF, newLF);
        console.log('Material field replaced OK (LF)');
    } else {
        console.log('NOT FOUND');
        const idx = c.indexOf('Nome do material:');
        console.log('idx:', idx, JSON.stringify(c.substring(idx - 200, idx + 200)));
        process.exit(1);
    }
}

fs.writeFileSync('index.html', c);
console.log('HTML patched successfully');
