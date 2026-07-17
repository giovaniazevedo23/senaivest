const fs = require('fs');

function patchSenai() {
    let indexHtml = fs.readFileSync('c:\\Users\\geova\\Desktop\\senai\\index.html', 'utf8');
    let appJs = fs.readFileSync('c:\\Users\\geova\\Desktop\\senai\\app.js', 'utf8');
    
    // 1. Add Logistica Tab and Pane to Coordenação
    if (!indexHtml.includes('coord-pane-logistica')) {
        const tabBtnTarget = `<button class="subtab-btn coord-subtab-btn" data-tab="almoxarifados"`;
        const tabBtnReplacement = `<button class="subtab-btn coord-subtab-btn" data-tab="logistica" onclick="switchSubTab('coord', 'logistica'); if(typeof renderLogisticaXYZ === 'function') renderLogisticaXYZ();">🧠 Logística ABC/XYZ</button>\n                            <button class="subtab-btn coord-subtab-btn" data-tab="almoxarifados"`;
        indexHtml = indexHtml.replace(tabBtnTarget, tabBtnReplacement);
        
        const paneTarget = `<!-- Pane 7: Almoxarifados -->`;
        const paneReplacement = `<!-- Pane: Inteligência Logística (Coord) -->
                    <div id="coord-pane-logistica" class="coord-subtab-pane" style="display: none;">
                        <h3 style="color: #fff; margin-bottom: 15px; font-size: 1.2rem;">Módulo de Inteligência Logística: Curva ABC e Criticidade XYZ</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px;">
                            O cálculo da <strong>Curva ABC</strong> baseia-se no <em>Custo Total de Consumo</em> (Quantidade Consumida x Valor Unitário).
                            A <strong>Criticidade XYZ</strong> avalia o <em>Impacto no Processo Pedagógico</em> (X = Baixa, Y = Média, Z = Vital).
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                            <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <h4 style="color: #fff; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">📊 Distribuição ABC (Financeira)</h4>
                                <div id="chart-abc-coord-container" style="height: 250px; display: flex; align-items: flex-end; gap: 20px; justify-content: center; padding-top: 20px;">
                                    <!-- Rendered by JS -->
                                </div>
                                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px; font-size: 0.8rem; color: #a1a1aa;">
                                    <div><span style="color: #e74c3c;">█</span> Classe A (80%)</div>
                                    <div><span style="color: #f39c12;">█</span> Classe B (15%)</div>
                                    <div><span style="color: #2ecc71;">█</span> Classe C (5%)</div>
                                </div>
                            </div>
                            
                            <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <h4 style="color: #fff; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">⚠️ Alertas de Ruptura (Classe Z)</h4>
                                <div id="alertas-xyz-coord-container" style="display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 5px;">
                                    <!-- Rendered by JS -->
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                            <button onclick="document.getElementById('tabela-inventario-xyz-coord').style.display = document.getElementById('tabela-inventario-xyz-coord').style.display === 'none' ? 'block' : 'none'" style="background: #3b82f6; color: #fff; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                                📋 Ver Inventário Detalhado (ABC/XYZ)
                            </button>
                        </div>

                        <div id="tabela-inventario-xyz-coord" style="display: none; overflow-x: auto; background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; color: #fff; font-size: 0.85rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #3f3f46; color: #a1a1aa;">
                                        <th style="padding: 10px;">Item</th>
                                        <th style="padding: 10px;">Categoria</th>
                                        <th style="padding: 10px;">Consumo Total</th>
                                        <th style="padding: 10px;">Valor Total (R$)</th>
                                        <th style="padding: 10px;">Classe ABC</th>
                                        <th style="padding: 10px;">Classe XYZ</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-inventario-xyz-coord">
                                    <!-- Rendered by JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pane 7: Almoxarifados -->`;
        indexHtml = indexHtml.replace(paneTarget, paneReplacement);
    }

    // 3. Meus Cursos Video Player
    if (indexHtml.includes('id="video-iframe"')) {
        const iframeTarget = `<iframe id="video-iframe" src="" width="100%" style="flex: 1; min-height: 350px;"\n                            frameborder="0" allow="autoplay" allowfullscreen></iframe>`;
        const iframeReplacement = `<video id="video-iframe" src="" width="100%" style="flex: 1; min-height: 350px; background: #000;" controls></video>`;
        indexHtml = indexHtml.replace(iframeTarget, iframeReplacement);
    }
    
    // 6. Agenda Nova Categoria Button in index.html
    if (!indexHtml.includes('id="btn-agenda-add-cat"')) {
        const agendaCatTarget = `<div style="display: flex; gap: 10px;">\n                                    <select id="calendar-category-filter"`;
        const agendaCatReplacement = `<div style="display: flex; gap: 10px;">\n                                    <button id="btn-agenda-add-cat" onclick="showAgendaAddCatModal()" style="background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid #3b82f6; border-radius: 6px; padding: 0 15px; font-weight: bold; cursor: pointer;">+ Nova Categoria</button>\n                                    <select id="calendar-category-filter"`;
        indexHtml = indexHtml.replace(agendaCatTarget, agendaCatReplacement);
        
        // Add Modal HTML for New Category
        const modalTarget = `<!-- DIALOG MODAL: AGENDAR EVENTO -->`;
        const modalReplacement = `<!-- DIALOG MODAL: NOVA CATEGORIA AGENDA -->
    <div class="modal-overlay" id="modal-agenda-add-cat">
        <div class="modal-box" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Nova Categoria de Agenda</h2>
                <button class="btn-close-modal" onclick="closeModal('modal-agenda-add-cat')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Nome da Categoria</label>
                    <input type="text" id="standalone-cat-name" class="form-control" placeholder="Ex: Reunião Pedagógica">
                </div>
                <div class="form-group">
                    <label>Cor da Bolinha</label>
                    <input type="color" id="standalone-cat-color" class="form-control" value="#3b82f6" style="height: 45px; padding: 2px;">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-modal-cancel" onclick="closeModal('modal-agenda-add-cat')">Cancelar</button>
                <button type="button" class="btn-modal-submit" onclick="saveStandaloneAgendaCategory()">Salvar Categoria</button>
            </div>
        </div>
    </div>
    
    <!-- DIALOG MODAL: AGENDAR EVENTO -->`;
        indexHtml = indexHtml.replace(modalTarget, modalReplacement);
    }
    
    fs.writeFileSync('c:\\Users\\geova\\Desktop\\senai\\index.html', indexHtml, 'utf8');

    // ----------------------------------------------------
    // app.js Modifications
    // ----------------------------------------------------
    
    // 1 & 2. ABC XYZ Logic Fix & Dual Render
    if (appJs.includes('window.renderLogisticaXYZ = function() {')) {
        const abcLogicReplacement = `window.renderLogisticaXYZ = function() {
    const allowedPlanos = (typeof lessonPlans !== 'undefined' ? lessonPlans : []).filter(p => !window.isItemAllowedForUser || window.isItemAllowedForUser(p));
    const allowedItems = (typeof inventory !== 'undefined' ? inventory : []).filter(i => !window.isItemAllowedForUser || window.isItemAllowedForUser(i));
    
    // 1. Calcular Consumo Real a partir dos Acompanhamentos Reais (ou planos concluídos com questionário pos-aula)
    // Se o item for consumível (tecidos, papel, etc), o consumo é a quantidade utilizada.
    // Se o item for retornável (máquina de costura), a quantidade retorna pro estoque sem perda de patrimônio, logo consumo = 0.
    
    const consumoMap = {};
    allowedItems.forEach(i => consumoMap[i.id] = 0);
    
    allowedPlanos.forEach(p => {
        // Consider only concluded plans which act as proxy for questionnaire answers for this logic fix
        if ((p.statusAula === 'concluida' || p.statusAula === 'finalizada' || p.status === 'Concluída') && p.resources) {
            p.resources.forEach(r => {
                const invItem = allowedItems.find(i => i.id === r.id);
                if (invItem && consumoMap[r.id] !== undefined) {
                    const meta = window.getAlmoxCategoryMeta ? window.getAlmoxCategoryMeta(invItem.category) : {returnable: true};
                    if (meta.returnable) {
                        // Returnable items (máquinas): Consumo real = 0 (voltaram pro estoque)
                        // If we had logic for avarias, it would be added here.
                        consumoMap[r.id] += 0;
                    } else {
                        // Consumable items (tecidos, papel): Consumo real = qty usada
                        consumoMap[r.id] += parseFloat(r.quantity || 1);
                    }
                }
            });
        }
    });

    // 2. Preparar lista ABC baseada no consumo REAL e não no estoque cadastrado
    let listaABC = allowedItems.map(item => {
        const consumo = consumoMap[item.id] || 0;
        const valorTotal = consumo * (item.precoMedio || item.price || item.preco || 0); // Consumo efetivo x valor
        
        let crit = item.criticidadeXYZ || item.criticidade;
        if (!crit || crit === 'auto') {
            const nCheck = (item.name || '').toLowerCase();
            if (item.category === 'ferramentas' && (nCheck.includes('maquina') || nCheck.includes('máquina') || nCheck.includes('agulha'))) crit = 'Z';
            else if (item.category === 'tecidos' || item.category === 'moldes' || nCheck.includes('tesoura')) crit = 'Y';
            else crit = 'X';
        }

        return { ...item, consumo, valorTotal, criticidadeXYZ: crit };
    });

    // Filtra para ordenar e calcular apenas sobre o que teve valor efetivo consumido ou manter tudo mas com ABC focado no consumo
    listaABC.sort((a, b) => b.valorTotal - a.valorTotal);

    const valorTotalGeral = listaABC.reduce((acc, curr) => acc + curr.valorTotal, 0);
    let acumulado = 0;
    
    let stats = { A: 0, B: 0, C: 0 };

    listaABC.forEach(item => {
        if (item.valorTotal > 0) {
            acumulado += item.valorTotal;
            const pct = valorTotalGeral > 0 ? (acumulado / valorTotalGeral) * 100 : 0;
            if (pct <= 80) { item.classeABC = 'A'; stats.A++; }
            else if (pct <= 95) { item.classeABC = 'B'; stats.B++; }
            else { item.classeABC = 'C'; stats.C++; }
        } else {
            // Se o consumo for R$ 0, pode ser Classe C ou sem classe
            item.classeABC = 'C'; stats.C++;
        }
    });

    function renderToContainers(suffix) {
        const tbody = document.getElementById('tbody-inventario-xyz' + suffix);
        if (tbody) {
            tbody.innerHTML = listaABC.map(i => {
                const corABC = i.classeABC === 'A' ? '#e74c3c' : (i.classeABC === 'B' ? '#f39c12' : '#2ecc71');
                const corXYZ = i.criticidadeXYZ === 'Z' ? '#e74c3c' : (i.criticidadeXYZ === 'Y' ? '#f39c12' : '#2ecc71');
                return \`<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px;">\${i.emoji || '📦'} \${i.name}</td>
                    <td style="padding: 10px; text-transform: capitalize;">\${i.category}</td>
                    <td style="padding: 10px;">\${i.consumo} un</td>
                    <td style="padding: 10px;">R$ \${i.valorTotal.toFixed(2)}</td>
                    <td style="padding: 10px;"><span style="color: \${corABC}; font-weight: bold;">Classe \${i.classeABC}</span></td>
                    <td style="padding: 10px;"><span style="color: \${corXYZ}; font-weight: bold;">Classe \${i.criticidadeXYZ}</span></td>
                </tr>\`;
            }).join('');
        }

        const chartContainer = document.getElementById('chart-abc' + suffix + '-container');
        if (chartContainer && listaABC.length > 0) {
            const totalItems = listaABC.length;
            const pctA = Math.round((stats.A / totalItems) * 100) || 0;
            const pctB = Math.round((stats.B / totalItems) * 100) || 0;
            const pctC = Math.round((stats.C / totalItems) * 100) || 0;

            chartContainer.innerHTML = \`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 60px;">
                    <div style="color: #a1a1aa; font-size: 0.8rem; margin-bottom: 8px;">\${pctA}%</div>
                    <div style="width: 100%; height: \${pctA}%; background: #e74c3c; border-radius: 4px 4px 0 0; min-height: 4px; box-shadow: 0 0 10px rgba(231, 76, 60, 0.3);"></div>
                    <div style="color: #fff; font-size: 0.85rem; margin-top: 8px; font-weight: bold;">\${stats.A} itens</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 60px;">
                    <div style="color: #a1a1aa; font-size: 0.8rem; margin-bottom: 8px;">\${pctB}%</div>
                    <div style="width: 100%; height: \${pctB}%; background: #f39c12; border-radius: 4px 4px 0 0; min-height: 4px; box-shadow: 0 0 10px rgba(243, 156, 18, 0.3);"></div>
                    <div style="color: #fff; font-size: 0.85rem; margin-top: 8px; font-weight: bold;">\${stats.B} itens</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; width: 60px;">
                    <div style="color: #a1a1aa; font-size: 0.8rem; margin-bottom: 8px;">\${pctC}%</div>
                    <div style="width: 100%; height: \${pctC}%; background: #2ecc71; border-radius: 4px 4px 0 0; min-height: 4px; box-shadow: 0 0 10px rgba(46, 204, 113, 0.3);"></div>
                    <div style="color: #fff; font-size: 0.85rem; margin-top: 8px; font-weight: bold;">\${stats.C} itens</div>
                </div>
            \`;
        }

        const alertasContainer = document.getElementById('alertas-xyz' + suffix + '-container');
        if (alertasContainer) {
            const itensZ = listaABC.filter(i => i.criticidadeXYZ === 'Z' && (i.quantity <= 3 || i.status === 'Falta'));
            if (itensZ.length === 0) {
                alertasContainer.innerHTML = \`<div style="color: #2ecc71; text-align: center; padding: 20px;">✅ Nenhum item vital em risco de ruptura.</div>\`;
            } else {
                alertasContainer.innerHTML = itensZ.map(i => {
                    return \`<div style="background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; padding: 12px; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <strong style="color: #fff; font-size: 0.9rem;">\${i.name}</strong>
                            <span style="background: #e74c3c; color: #fff; padding: 2px 6px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">CLASSE Z</span>
                        </div>
                        <div style="font-size: 0.8rem; color: #ff8080;">Estoque crítico: apenas \${i.quantity} disponíveis!</div>
                    </div>\`;
                }).join('');
            }
        }
    }

    renderToContainers('');
    renderToContainers('-coord');
};`;
        appJs = appJs.replace(/window\.renderLogisticaXYZ = function\(\) \{[\s\S]*?\n\};\n?/m, abcLogicReplacement);
    }
    
    // Add call to renderLogisticaXYZ in renderCoordenacaoPainel
    if (appJs.includes('if (window.renderRecursosSurvey) window.renderRecursosSurvey();') && !appJs.includes('if (window.renderLogisticaXYZ) window.renderLogisticaXYZ();')) {
        appJs = appJs.replace('if (window.renderRecursosSurvey) window.renderRecursosSurvey();', 'if (window.renderRecursosSurvey) window.renderRecursosSurvey();\n    if (window.renderLogisticaXYZ) window.renderLogisticaXYZ();');
    }

    // 5. Fix Almoxarifado Categoria (Consumo)
    if (appJs.includes('const newCat = {\\n                            name: newCatName,\\n                            returnable: returnable\\n                        };')) {
        // Just generic replace to be safe
    }
    appJs = appJs.replace(/const newCat = \{\s*name: newCatName,\s*returnable: returnable\s*\};/g, 
    `const newCat = {
                            name: newCatName,
                            returnable: returnable === true
                        };`);

    // 6. Agenda Nova Categoria Logic
    if (!appJs.includes('window.saveStandaloneAgendaCategory')) {
        appJs += `
// Nova Categoria Independente na Agenda
window.showAgendaAddCatModal = function() {
    document.getElementById('modal-agenda-add-cat').classList.add('active');
};
window.saveStandaloneAgendaCategory = function() {
    const name = document.getElementById('standalone-cat-name').value.trim();
    const color = document.getElementById('standalone-cat-color').value;
    if (!name) { alert("Por favor, informe o nome da categoria."); return; }
    
    const newCatId = 'cat_' + Date.now();
    const newCat = { id: newCatId, name: name, color: color };
    
    const catStr = localStorage.getItem('senai_event_categories');
    let cats = [];
    if (catStr) {
        try { cats = JSON.parse(catStr); } catch (e) {}
    }
    cats.push(newCat);
    localStorage.setItem('senai_event_categories', JSON.stringify(cats));
    
    if (typeof populateCategorySelects === 'function') populateCategorySelects();
    if (typeof renderLegend === 'function') renderLegend();
    if (typeof showToast === 'function') showToast('Categoria adicionada com sucesso!', 'success');
    
    document.getElementById('modal-agenda-add-cat').classList.remove('active');
    document.getElementById('standalone-cat-name').value = '';
};
`;
    }

    fs.writeFileSync('c:\\Users\\geova\\Desktop\\senai\\app.js', appJs, 'utf8');

    // ----------------------------------------------------
    // styles.css Modifications
    // ----------------------------------------------------
    let css = fs.readFileSync('c:\\Users\\geova\\Desktop\\senai\\styles.css', 'utf8');
    if (!css.includes('.chat-tablet-fix')) {
        css += `
/* CHAT TABLET FIX (Issue #4) */
@media (max-width: 1024px) {
    .chat-tablet-fix {
        padding-bottom: 20px !important; 
    }
    #coord-chat-container, #chat-wrapper {
        height: 100vh !important;
        max-height: calc(100vh - 60px) !important;
    }
    #coord-chat-messages, #chat-messages-area {
        flex: 1 !important;
        overflow-y: auto !important;
        padding-bottom: 80px !important;
    }
    #coord-chat-input-area, #chat-input-area {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: var(--bg-card) !important;
        z-index: 9999 !important;
        padding: 10px 15px 20px 15px !important;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.5) !important;
    }
}
`;
        fs.writeFileSync('c:\\Users\\geova\\Desktop\\senai\\styles.css', css, 'utf8');
    }
    
    console.log('Patch complete.');
}

patchSenai();
