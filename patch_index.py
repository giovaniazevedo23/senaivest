import sys

def patch_file():
    with open('index.html', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # 1. Almoxarifado Tab & Pane in Coordenação
    target_tab = '<button class="subtab-btn coord-subtab-btn" data-tab="almoxarifados"'
    if 'data-tab="logistica"' not in content:
        content = content.replace(target_tab, '<button class="subtab-btn coord-subtab-btn" data-tab="logistica" onclick="switchSubTab(\'coord\', \'logistica\'); if(typeof renderLogisticaXYZ === \'function\') renderLogisticaXYZ();">🧠 Logística ABC/XYZ</button>\n                            ' + target_tab)

    target_pane = '<!-- Pane: Gestão de Almoxarifados -->'
    replacement_pane = """<!-- Pane: Inteligência Logística (Coord) -->
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
                    
                    """ + target_pane

    if 'coord-pane-logistica' not in content:
        content = content.replace(target_pane, replacement_pane)

    # 2. Iframe Replacement
    iframe_target = '<iframe id="video-iframe"'
    if iframe_target in content:
        import re
        content = re.sub(r'<iframe id="video-iframe".*?</iframe>', '<video id="video-iframe" src="" width="100%" style="flex: 1; min-height: 350px; background: #000;" controls></video>', content, flags=re.DOTALL)
    
    # 3. Agenda Category Button
    agenda_target = '<select id="calendar-category-filter"'
    if 'id="btn-agenda-add-cat"' not in content:
        content = content.replace(agenda_target, '<button id="btn-agenda-add-cat" onclick="showAgendaAddCatModal()" style="background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid #3b82f6; border-radius: 6px; padding: 0 15px; font-weight: bold; cursor: pointer;">+ Nova Categoria</button>\n                                    ' + agenda_target)
        
        modal_target = '<!-- DIALOG MODAL: AGENDAR EVENTO -->'
        modal_replacement = """<!-- DIALOG MODAL: NOVA CATEGORIA AGENDA -->
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
    
    """ + modal_target
        content = content.replace(modal_target, modal_replacement)
        
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Index patched")

patch_file()
