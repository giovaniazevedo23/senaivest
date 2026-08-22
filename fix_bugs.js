const fs = require('fs');

function patchFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Fix add lesson plan date validation
    if (!content.includes('// Verificação de data no passado')) {
        const targetStr = `const horarioFim = horarioFimEl ? horarioFimEl.value : '22:00';`;
        const replacementStr = `const horarioFim = horarioFimEl ? horarioFimEl.value : '22:00';

    // Verificação de data no passado
    if (date && horarioInicio) {
        const selectedDateTime = new Date(\`\${date}T\${horarioInicio}:00\`);
        const now = new Date();
        if (selectedDateTime < now) {
            showToast('Não é possível agendar um plano de aula com data ou horário no passado.', 'error');
            return;
        }
    }`;
        content = content.replace(targetStr, replacementStr);
    }

    // Fix Matriz de Risco Operacional 15% bug
    if (content.includes('percentualRisco = 15;')) {
        // Find the block
        content = content.replace(
            /let riscoLevel, corBarra, percentualRisco;[\s\S]*?percentualRisco = 15;\s*\}/,
            `let riscoLevel, corBarra, percentualRisco, percentualReal;
        if (totalProblemas >= 3 || ocorrenciasAtivas >= 2) {
            riscoLevel = 'ALTO RISCO';
            corBarra = '#e74c3c'; // Vermelho
            percentualRisco = Math.min(100, 60 + totalProblemas * 12);
            percentualReal = percentualRisco;
        } else if (totalProblemas >= 1) {
            riscoLevel = 'ATENÇÃO';
            corBarra = '#d4ac0d'; // Amarelo ouro
            percentualRisco = 45;
            percentualReal = percentualRisco;
        } else {
            riscoLevel = 'SAUDÁVEL';
            corBarra = '#556b2f'; // Verde oliva
            percentualRisco = 15;
            percentualReal = 0;
        }`
        );
        
        // In app.js it renders ${percentualRisco}% at the top of the bar
        content = content.replace(/>\$\{percentualRisco\}%<\/div>/g, '>${percentualReal}%</div>');
    }
    
    // Fix floating point issue in OcupacaoChart
    // we have: const horasProdEfetivas = Math.min(capSemanal, horasProduzindo);
    if (content.includes('const horasProdEfetivas = Math.min(capSemanal, horasProduzindo);')) {
        content = content.replace(
            'const horasProdEfetivas = Math.min(capSemanal, horasProduzindo);',
            'const horasProdEfetivas = Math.round(Math.min(capSemanal, horasProduzindo) * 10) / 10;'
        );
    }

    fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('app.js');
patchFile('app_v2.js');
