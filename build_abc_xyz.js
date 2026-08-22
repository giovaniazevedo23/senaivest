const fs = require('fs');

function buildAbcXyz() {
    let indexHtml = fs.readFileSync('index.html', 'utf8');
    
    // 1. Add Sub-Tab Button
    const tabBtnTarget = `<button class="subtab-btn geral-subtab-btn" data-tab="previsoes"
                            onclick="switchSubTab('geral', 'previsoes')">🔮 Previsões Inteligentes</button>`;
    const tabBtnReplacement = `<button class="subtab-btn geral-subtab-btn" data-tab="previsoes"
                            onclick="switchSubTab('geral', 'previsoes')">🔮 Previsões Inteligentes</button>
                        <button class="subtab-btn geral-subtab-btn" data-tab="logistica"
                            onclick="switchSubTab('geral', 'logistica'); if(typeof renderLogisticaXYZ === 'function') renderLogisticaXYZ();">🧠 Logística ABC/XYZ</button>`;
    if (!indexHtml.includes('data-tab="logistica"')) {
        indexHtml = indexHtml.replace(tabBtnTarget, tabBtnReplacement);
    }

    // 2. Add Pane HTML
    const paneTarget = `<!-- Pane 2: Levantamento de Recursos -->`;
    const paneReplacement = `<!-- Pane: Inteligência Logística -->
                    <div id="geral-pane-logistica" class="geral-subtab-pane" style="display: none;">
                        <h3 style="color: #fff; margin-bottom: 15px; font-size: 1.2rem;">Módulo de Inteligência Logística: Curva ABC e Criticidade XYZ</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 20px;">
                            O cálculo da <strong>Curva ABC</strong> baseia-se no <em>Custo Total de Consumo</em> (Quantidade Consumida x Valor Unitário).
                            A <strong>Criticidade XYZ</strong> avalia o <em>Impacto no Processo Pedagógico</em> (X = Baixa, Y = Média, Z = Vital).
                            O foco é evitar o tempo ocioso (aulas paradas) e controlar o capital imobilizado.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                            <div style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
                                <h4 style="color: #fff; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">📊 Distribuição ABC (Financeira)</h4>
                                <div id="chart-abc-container" style="height: 250px; display: flex; align-items: flex-end; gap: 20px; justify-content: center; padding-top: 20px;">
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
                                <div id="alertas-xyz-container" style="display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 5px;">
                                    <!-- Rendered by JS -->
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                            <button onclick="document.getElementById('tabela-inventario-xyz').style.display = document.getElementById('tabela-inventario-xyz').style.display === 'none' ? 'block' : 'none'" style="background: #3b82f6; color: #fff; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                                📋 Ver Inventário Detalhado (ABC/XYZ)
                            </button>
                        </div>

                        <div id="tabela-inventario-xyz" style="display: none; overflow-x: auto; background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color);">
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
                                <tbody id="tbody-inventario-xyz">
                                    <!-- Rendered by JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pane 2: Levantamento de Recursos -->`;
    if (!indexHtml.includes('id="geral-pane-logistica"')) {
        indexHtml = indexHtml.replace(paneTarget, paneReplacement);
    }

    // 3. Add Dropdown to Add Product Form
    const addProdTarget = `<div class="form-group"
                        style="background: rgba(46,204,113,0.08); border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;">`;
    const addProdReplacement = `<div class="form-group">
                        <label for="prod-xyz">Criticidade XYZ (Impacto Pedagógico) — Opcional</label>
                        <select id="prod-xyz" class="form-control">
                            <option value="auto">Automático (Baseado na Categoria)</option>
                            <option value="X">Classe X (Baixa - Adaptação possível)</option>
                            <option value="Y">Classe Y (Média - Compromete cronograma)</option>
                            <option value="Z">Classe Z (Vital - Aula não acontece)</option>
                        </select>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Usado no módulo de Inteligência Logística para emitir alertas de ruptura.</div>
                    </div>
                    
                    <div class="form-group"
                        style="background: rgba(46,204,113,0.08); border: 1px solid rgba(46,204,113,0.3); border-radius: 8px; padding: 12px 16px; margin-bottom: 15px;">`;
    if (!indexHtml.includes('id="prod-xyz"')) {
        indexHtml = indexHtml.replace(addProdTarget, addProdReplacement);
    }

    fs.writeFileSync('index.html', indexHtml, 'utf8');
}

function updateAppJs(filepath) {
    if (!fs.existsSync(filepath)) return;
    let appJs = fs.readFileSync(filepath, 'utf8');

    // 1. Add reading of prod-xyz to handleAddProductSubmit
    if (appJs.includes('function handleAddProductSubmit') && !appJs.includes('const xyzValue =')) {
        appJs = appJs.replace(/const location = document\.getElementById\('prod-localizacao'\)\.value\.trim\(\);/, 
        `const location = document.getElementById('prod-localizacao').value.trim();\n    const xyzValue = document.getElementById('prod-xyz') ? document.getElementById('prod-xyz').value : 'auto';`);
        
        appJs = appJs.replace(/const newItem = \{/, 
        `// Logic for XYZ
    let criticidade = xyzValue;
    if (criticidade === 'auto') {
        const nCheck = name.toLowerCase();
        if (category === 'ferramentas' && (nCheck.includes('maquina') || nCheck.includes('máquina') || nCheck.includes('agulha'))) criticidade = 'Z';
        else if (category === 'tecidos' || category === 'moldes' || nCheck.includes('tesoura')) criticidade = 'Y';
        else criticidade = 'X';
    }

    const newItem = {
        criticidade,`);
    }

    // 2. Add renderLogisticaXYZ function
    if (!appJs.includes('function renderLogisticaXYZ')) {
        appJs += `
// ==========================================
// 🧠 MÓDULO DE INTELIGÊNCIA LOGÍSTICA (ABC/XYZ)
// ==========================================
window.renderLogisticaXYZ = function() {
    const allowedPlanos = (typeof lessonPlans !== 'undefined' ? lessonPlans : []).filter(p => !window.isItemAllowedForUser || window.isItemAllowedForUser(p));
    const allowedItems = (typeof inventory !== 'undefined' ? inventory : []).filter(i => !window.isItemAllowedForUser || window.isItemAllowedForUser(i));
    
    // 1. Calcular Consumo Real
    const consumoMap = {};
    allowedItems.forEach(i => consumoMap[i.id] = 0);
    
    allowedPlanos.forEach(p => {
        if ((p.statusAula === 'concluida' || p.statusAula === 'finalizada' || p.status === 'Concluída') && p.resources) {
            p.resources.forEach(r => {
                if (consumoMap[r.id] !== undefined) {
                    consumoMap[r.id] += parseFloat(r.quantity || 1);
                }
            });
        }
    });

    // 2. Preparar lista ABC
    let listaABC = allowedItems.map(item => {
        const consumo = consumoMap[item.id] || 0;
        const valorTotal = consumo * (item.precoMedio || 0);
        
        let crit = item.criticidade;
        if (!crit) {
            const nCheck = (item.name || '').toLowerCase();
            if (item.category === 'ferramentas' && (nCheck.includes('maquina') || nCheck.includes('máquina') || nCheck.includes('agulha'))) crit = 'Z';
            else if (item.category === 'tecidos' || item.category === 'moldes' || nCheck.includes('tesoura')) crit = 'Y';
            else crit = 'X';
        }

        return { ...item, consumo, valorTotal, criticidadeXYZ: crit };
    });

    // Remover itens sem valor consumido? Não, exibir todos para o inventário, mas ordenar por valor
    listaABC.sort((a, b) => b.valorTotal - a.valorTotal);

    const valorTotalGeral = listaABC.reduce((acc, curr) => acc + curr.valorTotal, 0);
    let acumulado = 0;
    
    let stats = { A: 0, B: 0, C: 0 };

    listaABC.forEach(item => {
        acumulado += item.valorTotal;
        const pct = valorTotalGeral > 0 ? (acumulado / valorTotalGeral) * 100 : 0;
        
        if (pct <= 80 || item.valorTotal === 0 && stats.A === 0) { item.classeABC = 'A'; stats.A++; }
        else if (pct <= 95) { item.classeABC = 'B'; stats.B++; }
        else { item.classeABC = 'C'; stats.C++; }
    });

    // Render Dashboard
    const tbody = document.getElementById('tbody-inventario-xyz');
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

    const chartContainer = document.getElementById('chart-abc-container');
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

    const alertasContainer = document.getElementById('alertas-xyz-container');
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
};
`;
    }

    fs.writeFileSync(filepath, appJs, 'utf8');
}

buildAbcXyz();
updateAppJs('app.js');
updateAppJs('app_v2.js');
