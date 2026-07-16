const fs = require('fs');

function fixIndexHtml() {
    let html = fs.readFileSync('index.html', 'utf8');

    // Remove 📁 and 📷 icons
    html = html.replace('📁 Escolher Foto', 'Escolher Foto');
    html = html.replace('📷 Tirar com Câmera', 'Tirar com Câmera');

    // Remove AI message block
    const aiMessageStart = '<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">';
    const aiMessageText = 'Se você não anexar ou tirar uma foto, o sistema usará automaticamente a <strong>Inteligência Artificial</strong> para criar a imagem ideal com base no nome do produto!';
    if (html.includes(aiMessageText)) {
        // Regex to remove the whole div
        const aiMessageRegex = /<div style="font-size: 0\.75rem; color: var\(--text-muted\); margin-top: 8px;">\s*💡 Se você não anexar ou tirar uma foto, o sistema usará automaticamente a <strong>Inteligência Artificial<\/strong> para criar a imagem ideal com base no nome do produto!\s*<\/div>/g;
        html = html.replace(aiMessageRegex, '');
    }

    fs.writeFileSync('index.html', html, 'utf8');
}

function updateAppJs(filepath) {
    if (!fs.existsSync(filepath)) return;
    let appJs = fs.readFileSync(filepath, 'utf8');

    // 1. InviarQuestionarioAula: Save exact consumed qty
    // Let's find: let transformacoesLog = [];
    // Replace with: let transformacoesLog = [];\n    let consumosLog = [];
    if (appJs.includes('let transformacoesLog = [];') && !appJs.includes('let consumosLog = [];')) {
        appJs = appJs.replace('let transformacoesLog = [];', 'let transformacoesLog = [];\n    let consumosLog = [];');
        
        // Find: transformacoesLog.push(`${itemName}: ${qtyTransformada} un. ➔ ${transformadoEm}`);
        // Replace with: transformacoesLog.push(`${itemName}: ${qtyTransformada} un. ➔ ${transformadoEm}`);\n            consumosLog.push({ id: itemId, qty: qtyTransformada, name: itemName });
        appJs = appJs.replace(/transformacoesLog\.push\(`\$\{itemName\}: \$\{qtyTransformada\} un\. ➔ \$\{transformadoEm\}`\);/g,
            `transformacoesLog.push(\`\${itemName}: \${qtyTransformada} un. ➔ \${transformadoEm}\`);\n            consumosLog.push({ id: itemId, qty: qtyTransformada, name: itemName });`);

        // Update plano.questionarioDados
        const qdRegex = /plano\.questionarioDados = \{\s*respondidoEm: Date\.now\(\),\s*observacoes: obs,\s*transformacoes: transformacoesLog\s*\};/g;
        appJs = appJs.replace(qdRegex, 
`plano.questionarioDados = {
        respondidoEm: Date.now(),
        observacoes: obs,
        transformacoes: transformacoesLog,
        consumos: consumosLog
    };`);
    }

    // 2. renderLogisticaXYZ: Use consumosLog for calculation
    const xyzRenderRegex = /allowedPlanos\.forEach\(p => \{\s*if \(\(p\.statusAula === 'concluida' \|\| p\.statusAula === 'finalizada' \|\| p\.status === 'Concluída'\) && p\.resources\) \{\s*p\.resources\.forEach\(r => \{\s*if \(consumoMap\[r\.id\] !== undefined\) \{\s*consumoMap\[r\.id\] \+= parseFloat\(r\.quantity \|\| 1\);\s*\}\s*\}\);\s*\}\s*\}\);/g;
    
    appJs = appJs.replace(xyzRenderRegex,
`allowedPlanos.forEach(p => {
        if (p.questionarioRespondido && p.questionarioDados && Array.isArray(p.questionarioDados.consumos)) {
            p.questionarioDados.consumos.forEach(c => {
                if (consumoMap[c.id] !== undefined) {
                    consumoMap[c.id] += parseFloat(c.qty || 0);
                }
            });
        }
    });`);

    fs.writeFileSync(filepath, appJs, 'utf8');
}

fixIndexHtml();
updateAppJs('app.js');
updateAppJs('app_v2.js');
