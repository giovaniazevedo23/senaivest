const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
const jsFile = path.join(__dirname, 'live_app_v2.js');

let html = fs.readFileSync(indexFile, 'utf8');
let js = fs.readFileSync(jsFile, 'utf8');

let indexChanged = false;
let jsChanged = false;

// 1. Inserir Registro de Atividades abaixo do SENAI slogan
const sloganRegex = /(<div class="slogan-bar">[\s\S]*?<div class="slogan-text">O FUTURO DA INDÚSTRIA COMEÇA AQUI<\/div>\s*<\/div>)/;
if (sloganRegex.test(html) && !html.includes('id="activity-log-container"')) {
    html = html.replace(sloganRegex, `$1\n
                    <!-- Registro de Atividades (Novo Feed) -->
                    <h2 class="section-title" style="margin-top: 40px;">Registro de Atividades</h2>
                    <div id="activity-log-container" style="background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); padding: 20px; box-shadow: var(--shadow-premium); margin-bottom: 40px;">
                        <div style="color: var(--text-muted); font-size: 0.95rem;">
                            Carregando últimas atividades...
                        </div>
                    </div>
    `);
    indexChanged = true;
    console.log("Inserido Registro de Atividades.");
}

// 2. Remover Artigos Recentes
const artigosRecentesRegex = /[\t ]*<!-- Artigos Recentes \(Novidade\) -->\r?\n[\t ]*<h2 class="section-title"[^>]*>Artigos Recentes<\/h2>\r?\n[\t ]*<div id="dashboard-recent-articles"[\s\S]*?<\/div>\r?\n/;
if (artigosRecentesRegex.test(html)) {
    html = html.replace(artigosRecentesRegex, '');
    indexChanged = true;
    console.log("Removido Artigos Recentes.");
}

// 3. Remover ou ocultar Professores Online
const profOnlineRegex = /(<span[^>]*>Professores Online:<\/span>\s*<div id="online-users-list"[^>]*>[\s\S]*?<\/div>)/;
if (profOnlineRegex.test(html)) {
    html = html.replace(profOnlineRegex, '<!-- Ocultado a pedido: Professores Online $1 -->');
    indexChanged = true;
    console.log("Ocultado Professores Online (Dashboard).");
}

// 4. Adicionar Gestão de Risco na aba Relatórios
const relatoriosRegex = /(<h2 class="section-title">Relatórios<\/h2>)/;
if (relatoriosRegex.test(html) && !html.includes('id="risk-management-section"')) {
    html = html.replace(relatoriosRegex, `$1
                    
                    <!-- NOVO: Gestão de Risco / Contingência -->
                    <div id="risk-management-section" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.2); border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                        <h3 style="color: var(--accent-green); margin-top: 0; font-size: 1.3rem; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.5rem;">🤖</span> Planos de Gestão de Risco / Contingência
                        </h3>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px;">
                            Descreva os problemas recentes enfrentados no laboratório ou almoxarifado (ex: falta de material, atrasos). A assistente Estela processará esses dados e o histórico da plataforma para gerar um mapeamento estratégico de mitigação de riscos.
                        </p>
                        
                        <textarea id="risk-observations" placeholder="Suas observações sobre os problemas enfrentados..." style="width: 100%; height: 100px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; color: #fff; padding: 15px; font-size: 1rem; margin-bottom: 15px; resize: vertical; box-sizing: border-box; outline: none;"></textarea>
                        
                        <button onclick="window.generateRiskPlan()" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 14px 25px; border-radius: 8px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(16,185,129,0.4); display: flex; align-items: center; justify-content: center; width: 100%;" onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)';" onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
                            <span id="risk-btn-text">⚙️ Gerar Plano Estratégico com Estela</span>
                            <div id="risk-spinner" style="display:none; width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; margin-left: 10px; animation: spin 1s linear infinite;"></div>
                        </button>
                        
                        <div id="risk-plan-output" style="margin-top: 25px; display: none;">
                            <!-- O plano gerado aparecerá aqui -->
                        </div>
                    </div>
    `);
    indexChanged = true;
    console.log("Inserido Gestão de Risco em Relatórios.");
}

// 5. Atualizar live_app_v2.js com a lógica nova
const newJSCode = `
// ==========================================
// REGISTRO DE ATIVIDADES & GESTÃO DE RISCO (PATCH)
// ==========================================

window.renderActivityLog = function() {
    const container = document.getElementById('activity-log-container');
    if (!container) return;

    let activities = [];

    // Pegar atividades de boletins
    if (window.boletinsData && Array.isArray(window.boletinsData)) {
        window.boletinsData.forEach(b => {
            activities.push({
                type: 'boletim',
                icon: '📄',
                user: b.professor || 'Desconhecido',
                desc: 'Registrou um novo boletim de aula',
                details: \`Local: \${b.lab || 'N/A'}\`,
                date: new Date(b.dataOriginal || b.data || Date.now())
            });
        });
    }

    // Pegar atividades de planos
    if (window.plansData && Array.isArray(window.plansData)) {
        window.plansData.forEach(p => {
            activities.push({
                type: 'plano',
                icon: '📅',
                user: p.professor || 'Desconhecido',
                desc: 'Adicionou um novo plano de aula',
                details: \`Turma: \${p.turma || 'N/A'}\`,
                date: new Date(p.data_original || p.data || Date.now())
            });
        });
    }

    // Ordenar por data mais recente
    activities.sort((a, b) => b.date - a.date);
    
    // Limitar a 15 mais recentes
    activities = activities.slice(0, 15);

    if (activities.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-style: italic;">Nenhuma atividade recente registrada no sistema.</div>';
        return;
    }

    let html = '<div class="activity-feed" style="display: flex; flex-direction: column; gap: 15px;">';
    
    const now = new Date();
    
    activities.forEach(act => {
        let diffMs = now - act.date;
        let diffMins = Math.floor(diffMs / 60000);
        let diffHours = Math.floor(diffMins / 60);
        let diffDays = Math.floor(diffHours / 24);
        
        let timeStr = "Agora mesmo";
        if (diffDays > 0) timeStr = \`Há \${diffDays} dia(s)\`;
        else if (diffHours > 0) timeStr = \`Há \${diffHours} hora(s)\`;
        else if (diffMins > 0) timeStr = \`Há \${diffMins} min\`;

        html += \`
            <div style="display: flex; align-items: flex-start; gap: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="background: rgba(16,185,129,0.1); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid rgba(16,185,129,0.3);">
                    \${act.icon}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">\${act.user}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">\${timeStr}</span>
                    </div>
                    <div style="color: var(--text-color); font-size: 0.85rem; margin-bottom: 4px;">
                        \${act.desc}
                    </div>
                    <div style="color: var(--primary-beige); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        \${act.details}
                    </div>
                </div>
            </div>
        \`;
    });
    html += '</div>';

    container.innerHTML = html;
};

// Modifica a função updateDashboard para chamar o renderActivityLog
if (typeof window.originalUpdateDashboardForActivities === 'undefined' && typeof window.updateDashboard === 'function') {
    window.originalUpdateDashboardForActivities = window.updateDashboard;
    window.updateDashboard = function(forceRender) {
        window.originalUpdateDashboardForActivities(forceRender);
        setTimeout(window.renderActivityLog, 500); // Roda um pouco depois pra garantir q os dados carregaram
    }
}

window.generateRiskPlan = function() {
    const textObs = document.getElementById('risk-observations').value.trim();
    if (!textObs) {
        if (typeof showToast === 'function') showToast('Por favor, descreva as observações ou problemas enfrentados antes de gerar o plano.', 'warning');
        else alert('Por favor, descreva as observações ou problemas enfrentados antes de gerar o plano.');
        return;
    }

    const btnText = document.getElementById('risk-btn-text');
    const spinner = document.getElementById('risk-spinner');
    const output = document.getElementById('risk-plan-output');
    
    if(btnText) btnText.style.display = 'none';
    if(spinner) spinner.style.display = 'block';
    
    if (typeof showToast === 'function') showToast('Estela está analisando os dados e gerando o planejamento...', 'info');

    // Simulate backend AI processing delay (2.5 seconds)
    setTimeout(() => {
        if(btnText) btnText.style.display = 'inline';
        if(spinner) spinner.style.display = 'none';
        
        let lowStockCount = 0;
        if (window.inventoryData) {
            lowStockCount = window.inventoryData.filter(i => (parseFloat(i.quantidade)||0) <= (parseFloat(i.estoque_minimo)||5)).length;
        }

        const dateStr = new Date().toLocaleDateString('pt-BR');

        // Simulate an AI response based on the text
        const mockResponse = \`
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 20px; color: #fff;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    <img src="assets/estela_avatar.jpg" style="width:30px; height:30px; border-radius:50%; object-fit:cover; border:2px solid #10b981;">
                    <strong style="color: #10b981; font-size: 1.1rem;">Plano de Ação Estratégico gerado por Estela</strong>
                </div>
                
                <p style="font-size: 0.9rem; color: #ccc; line-height: 1.5; margin-bottom: 20px;">
                    Com base nas suas observações sobre "\<em>\${textObs.substring(0,50)}\${textObs.length>50?'...':''}\</em>" e no mapeamento da nossa base de dados (atualmente com <strong>\${lowStockCount} itens na zona crítica de estoque (Curva ABC - A)</strong>), trago o seguinte plano de mitigação e contingência:
                </p>

                <h4 style="color: var(--primary-beige); margin-bottom: 10px; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px;">1. Ações Imediatas (0-48h)</h4>
                <ul style="margin: 0 0 20px 20px; color: #e0e0e0; font-size: 0.9rem; line-height: 1.6;">
                    <li><strong>Alerta de Reposição:</strong> Emitir ordem de compra emergencial para insumos críticos bloqueando o progresso das aulas.</li>
                    <li><strong>Comunicação Interna:</strong> Disparar notificação na plataforma orientando o corpo docente a substituir dinâmicas que exigem materiais zerados.</li>
                </ul>

                <h4 style="color: var(--primary-beige); margin-bottom: 10px; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px;">2. Ações Preventivas (Médio Prazo)</h4>
                <ul style="margin: 0 0 20px 20px; color: #e0e0e0; font-size: 0.9rem; line-height: 1.6;">
                    <li><strong>Auditoria de Boletins:</strong> Reforçar obrigatoriedade do preenchimento diário de boletins para rastrear desperdícios e consumo real vs. planejado.</li>
                    <li><strong>Revisão Curva ABC:</strong> Ajustar o Estoque Mínimo (Lead Time) dos itens relatados como problemáticos para evitar rupturas futuras.</li>
                </ul>
                
                <div style="background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; padding: 12px; font-size: 0.85rem; color: #fca5a5;">
                    <strong>⚠️ Nível de Risco Identificado:</strong> MODERADO. Recomenda-se aprovação imediata do plano pelo coordenador logístico.
                </div>
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button style="background: #10b981; color:#fff; border:none; padding: 8px 15px; border-radius:4px; cursor:pointer; font-weight:bold; font-size: 0.8rem;" onclick="this.innerHTML='✓ Plano Aprovado'; this.style.background='#059669'; this.disabled=true;">✓ Aprovar Plano</button>
                    <button style="background: rgba(255,255,255,0.1); color:#fff; border:none; padding: 8px 15px; border-radius:4px; cursor:pointer; font-size: 0.8rem;">Imprimir PDF</button>
                </div>
            </div>
        \`;
        
        output.innerHTML = mockResponse;
        output.style.display = 'block';
        
    }, 2500);
};

// ==========================================
`;

if (!js.includes('window.renderActivityLog = function()')) {
    js += newJSCode;
    jsChanged = true;
    console.log("Inserido JS para Registro de Atividade e Gestão de Risco.");
}

if (indexChanged) fs.writeFileSync(indexFile, html);
if (jsChanged) fs.writeFileSync(jsFile, js);

console.log("Concluído!");
