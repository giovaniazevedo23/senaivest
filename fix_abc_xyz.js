const fs = require('fs');

function fixHtml() {
    let html = fs.readFileSync('index.html', 'utf8');

    // Add button after Previsões Inteligentes
    if (!html.includes('data-tab="logistica"')) {
        const regexBtn = /(<button class="subtab-btn geral-subtab-btn" data-tab="previsoes"[\s\S]*?>🔮 Previsões Inteligentes<\/button>)/;
        html = html.replace(regexBtn, `$1\n                        <button class="subtab-btn geral-subtab-btn" data-tab="logistica" onclick="switchSubTab('geral', 'logistica'); if(typeof renderLogisticaXYZ === 'function') renderLogisticaXYZ();">🧠 Logística ABC/XYZ</button>`);
    }

    // Add pane after KPIs & Gráficos or similar
    if (!html.includes('id="geral-pane-logistica"')) {
        const regexPane = /(<!-- Pane 2: Levantamento de Recursos -->)/;
        const newPane = `<!-- Pane: Inteligência Logística -->
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
                                </tbody>
                            </table>
                        </div>
                    </div>\n$1`;
        html = html.replace(regexPane, newPane);
    }

    // Add select in form-add-product
    if (!html.includes('id="prod-xyz"')) {
        const regexFormGroup = /(<div class="form-group"\s+style="background: rgba\(46,204,113,0\.08\))/;
        const newGroup = `<div class="form-group">
                        <label for="prod-xyz">Criticidade XYZ (Impacto Pedagógico) — Opcional</label>
                        <select id="prod-xyz" class="form-control">
                            <option value="auto">Automático (Baseado na Categoria)</option>
                            <option value="X">Classe X (Baixa - Adaptação possível)</option>
                            <option value="Y">Classe Y (Média - Compromete cronograma)</option>
                            <option value="Z">Classe Z (Vital - Aula não acontece)</option>
                        </select>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Usado no módulo de Inteligência Logística para emitir alertas de ruptura.</div>
                    </div>\n$1`;
        html = html.replace(regexFormGroup, newGroup);
    }

    fs.writeFileSync('index.html', html, 'utf8');
}

fixHtml();
