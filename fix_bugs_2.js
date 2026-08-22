const fs = require('fs');

function fixIndexHtml() {
    let content = fs.readFileSync('index.html', 'utf8');
    const target = `<button type="button" onclick="document.getElementById('prod-foto-file').click()" class="btn-card-transfer" style="background: #3b82f6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer;">
                                📁 Escolher Foto
                            </button>
                            <input type="file" id="prod-foto-file" accept="image/*" style="display: none;" onchange="handleProductPhotoUpload(event)">
                            
                            <button type="button" onclick="openCameraModal()" class="btn-card-transfer" style="background: #8b5cf6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer;">
                                📷 Tirar com Câmera
                            </button>`;
    
    const replacement = `<button type="button" onclick="document.getElementById('prod-foto-file').click()" class="btn-card-transfer" style="background: #3b82f6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer; color: white;">
                                Escolher Foto
                            </button>
                            <input type="file" id="prod-foto-file" accept="image/*" style="display: none;" onchange="handleProductPhotoUpload(event)">
                            
                            <button type="button" onclick="openCameraModal()" class="btn-card-transfer" style="background: #8b5cf6 !important; flex: 1; padding: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 700; cursor: pointer; color: white;">
                                Tirar com Câmera
                            </button>`;
                            
    content = content.replace(target, replacement);
    fs.writeFileSync('index.html', content, 'utf8');
}

function fixAppJs(filepath) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');
    
    // 1. Add renderLegend and call it in initAgenda
    if (!content.includes('function renderLegend()')) {
        content = content.replace(/function initAgenda\(\) \{/, 
`function renderLegend() {
    const legendContainer = document.querySelector('.calendar-legend');
    if (!legendContainer) return;
    legendContainer.innerHTML = '';
    eventCategories.forEach(cat => {
        legendContainer.innerHTML += \`<div style="display: flex; align-items: center; gap: 6px;"><div style="width: 10px; height: 10px; border-radius: 50%; background: \${cat.color};"></div> \${cat.name}</div>\`;
    });
}

function initAgenda() {`);
        
        content = content.replace(/renderCalendar\(\);/, 'renderCalendar();\n    renderLegend();');
    }
    
    // 2. Fix checarIndiceNegativoAluno to only count non-resolved
    const checkFnStart = 'window.checarIndiceNegativoAluno = function (aluno) {';
    if (content.includes(checkFnStart) && !content.includes(`if (b.aluno && (!b.status || String(b.status).toLowerCase() !== 'resolvido'))`)) {
        content = content.replace(/if \(b\.aluno\) \{/, `if (b.aluno && (!b.status || String(b.status).toLowerCase() !== 'resolvido')) {`);
        content = content.replace(/incs\.forEach\(i => \{[\s\S]*?if \(\(nomeClean && text\.includes\(nomeClean\)\) \|\| \(matClean && text\.includes\(matClean\)\)\) \{/, 
        `incs.forEach(i => {
        if (String(i.status).toLowerCase() === 'resolvido') return;
        const text = JSON.stringify(i).toLowerCase();
        if ((nomeClean && text.includes(nomeClean)) || (matClean && text.includes(matClean))) {`);
    }

    // 3. Fix limparInfracoesAluno to also resolve associated boletins and incidents
    if (content.includes('window.limparInfracoesAluno = function') && !content.includes('registeredBoletins.forEach(b =>')) {
        content = content.replace(/aluno\.infracoes = \[\];/g, 
`aluno.infracoes = [];
    const nomeClean = String(aluno.nome || '').trim().toLowerCase();
    const matClean = String(aluno.matricula || '').trim().toLowerCase();

    if (typeof registeredBoletins !== 'undefined') {
        let mudouBol = false;
        registeredBoletins.forEach(b => {
            if (b.aluno) {
                const resp = String(b.aluno).toLowerCase();
                if ((nomeClean && resp.includes(nomeClean)) || (matClean && resp.includes(matClean))) {
                    b.status = 'Resolvido';
                    mudouBol = true;
                }
            }
        });
        if (mudouBol) {
            try { window.syncWithBackend('boletins', registeredBoletins); } catch(e) { localStorage.setItem('registeredBoletins', JSON.stringify(registeredBoletins)); }
        }
    }

    if (typeof incidents !== 'undefined') {
        let mudouInc = false;
        incidents.forEach(i => {
            const text = JSON.stringify(i).toLowerCase();
            if ((nomeClean && text.includes(nomeClean)) || (matClean && text.includes(matClean))) {
                i.status = 'Resolvido';
                mudouInc = true;
            }
        });
        if (mudouInc) {
            try { window.syncWithBackend('incidents', incidents); } catch(e) { localStorage.setItem('senaivest_incidents_v2', JSON.stringify(incidents)); }
        }
    }`);
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
}

fixIndexHtml();
fixAppJs('app.js');
fixAppJs('app_v2.js');
