
// ==========================================
// 🚨 ALERTA INTELIGENTE DE ESTOQUE (30%) E ANOMALIAS
// ==========================================
window.checkLowStockAndAnomalies = function () {
    const userSchool = window.getUserSchoolCode();
    if (!userSchool) return;

    let anomalieCount = 0;
    const itemsComRisco = [];

    // 1. Verificar Estoque (Abaixo de 30% ou Zerado)
    inventory.forEach(item => {
        if (!item.escolaCode || !window.isSameSchool(item.escolaCode, userSchool)) return;
        
        if (typeof item.initialQuantity === 'undefined') {
            item.initialQuantity = item.quantity;
            if (item.quantity === 0) item.initialQuantity = 1; 
        }

        const threshold = item.initialQuantity * 0.3;

        if (item.quantity <= threshold || item.quantity === 0) {
            const alreadyNotified = notifications.find(n => 
                n.title === 'Risco de Falta' && 
                n.message.includes(item.name) && 
                !n.read
            );

            if (!alreadyNotified) {
                const perc = item.initialQuantity > 0 ? ((item.quantity / item.initialQuantity) * 100).toFixed(1) : 0;
                addNotification('warning', 'Risco de Falta', 
                    "O produto '" + item.name + "' está com estoque crítico (" + item.quantity + " un. / " + perc + "% do inicial). Necessita de reposição imediata!",
                    userSchool);
                itemsComRisco.push(item.name);
                anomalieCount++;
            }
        }
    });

    // 2. Ocorrências (Boletins) - Extravios ou Roubos pendentes
    registeredBoletins.forEach(b => {
        if (b.status === 'Concluída' || b.status === 'Rejeitada') return;
        if (!b.escolaCode || !window.isSameSchool(b.escolaCode, userSchool)) return;

        const lowCaseTitle = (b.titulo || '').toLowerCase();
        const lowCaseCat = (b.categoria || '').toLowerCase();
        
        if (lowCaseTitle.includes('extravio') || lowCaseTitle.includes('roubo') || 
            lowCaseTitle.includes('falta') || lowCaseCat.includes('extravio')) {
            
            const alreadyNotified = notifications.find(n => 
                n.title === 'Aviso de Boletim - Falta de Material' && 
                n.message.includes('Boletim #' + b.id) && 
                !n.read
            );

            if (!alreadyNotified) {
                addNotification('warning', 'Aviso de Boletim - Falta de Material', 
                    "Há um boletim pendente (Boletim #" + b.id + ": " + b.titulo + ") relatando possível falta ou extravio de materiais no " + getLabDisplayName(b.laboratorio) + ". Verifique o estoque!",
                    userSchool);
                anomalieCount++;
            }
        }
    });

    if (anomalieCount > 0 && typeof showToast === 'function') {
        let msg = 'Atenção: Existem materiais com risco de falta ou ocorrências pendentes de extravio. Verifique a Central de Notificações!';
        if (itemsComRisco.length > 0) {
            msg = "Risco de falta em: " + itemsComRisco.slice(0, 3).join(', ') + (itemsComRisco.length > 3 ? ' e outros' : '') + ". Necessita reposição imediata!";
        }
        showToast(msg, 'error');
    }
};

