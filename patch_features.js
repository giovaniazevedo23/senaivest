const fs = require('fs');

// PATCH INDEX.HTML
let indexHtml = fs.readFileSync('index.html', 'utf8');

// 1. Fix Baixar Aplicativo button
if (indexHtml.includes('<button id="btn-pwa-install"')) {
    indexHtml = indexHtml.replace(
        /<button id="btn-pwa-install"([\s\S]*?)<\/button>/,
        `<a href="#" target="_blank" id="btn-pwa-install"$1</a>`
    );
}

// 2. Add "Perfis Online por Escola" section inside Acompanhamento Real
const acompanhamentoRealTarget = `<section id="acompanhamento-real" class="view-section" style="padding-bottom: 80px;">`;
if (indexHtml.includes(acompanhamentoRealTarget) && !indexHtml.includes('id="team-status-container"')) {
    const newSection = `
                <div style="margin: 30px 0 20px 0; padding: 20px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
                    <h3 style="color: #fff; font-size: 1.2rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: var(--primary-beige);"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        Equipe da sua Escola (<span id="team-school-name" style="color:var(--primary-beige);">...</span>)
                    </h3>
                    <div id="team-status-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">
                        <div style="color: #94a3b8; font-size: 0.9rem;">Carregando perfis...</div>
                    </div>
                </div>`;
    
    // Find the header inside acompanhamento-real and insert after it
    const headerEndIdx = indexHtml.indexOf('</div>', indexHtml.indexOf('Visão em Tempo Real')) + 6;
    if (headerEndIdx > 6) {
        // Just insert it at the top of acompanhamento-real content
        indexHtml = indexHtml.replace(
            /(<section id="acompanhamento-real"[^>]*>[\s\S]*?<div style="display: flex;[^>]*>[\s\S]*?<\/div>\s*<\/div>)/,
            `$1\n${newSection}`
        );
    }
}

// 3. Make the school dropdowns dynamically loaded
// We'll replace the static selects with the same, but they will be populated by app.js.
// Since they are already selects, we don't need to change index.html for this, we just populate them in app.js.

fs.writeFileSync('index.html', indexHtml, 'utf8');

// PATCH APP.JS
let appJs = fs.readFileSync('app.js', 'utf8');

// A. Populate schools in dropdowns
if (!appJs.includes('function populateSchoolsDropdown')) {
    const populateSchoolsFunc = `
// ==========================================
// 🏫 POPULAR DROPDOWNS DE ESCOLA
// ==========================================
window.populateSchoolsDropdown = function() {
    const schools = typeof registeredSchools !== 'undefined' ? registeredSchools : [];
    const selects = [document.getElementById('first-reg-instituicao'), document.getElementById('profile-instituicao')];
    
    selects.forEach(select => {
        if (!select) return;
        
        // Preserve selected value
        const currentVal = select.value;
        
        // Clear options except first
        const firstOption = select.options[0];
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);
        else select.innerHTML = '<option value="" disabled selected>Selecione a Escola</option>';
        
        schools.forEach(s => {
            if (s.name) {
                const opt = document.createElement('option');
                opt.value = s.name;
                opt.textContent = s.name + (s.cidade ? \` (\${s.cidade})\` : '');
                select.appendChild(opt);
            }
        });
        
        if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
            select.value = currentVal;
        }
    });
};
`;
    appJs += `\n${populateSchoolsFunc}`;
}

// Ensure populateSchoolsDropdown is called when data is loaded
if (appJs.includes('const fetchBackendData = async () => {')) {
    if (!appJs.includes('if (window.populateSchoolsDropdown) window.populateSchoolsDropdown();')) {
        appJs = appJs.replace(
            /window\.registeredSchools = data\.schools \|\| \[\];/g,
            `window.registeredSchools = data.schools || [];\n            if (window.populateSchoolsDropdown) window.populateSchoolsDropdown();`
        );
    }
}

// B. Render Team Status function
if (!appJs.includes('function renderTeamStatus')) {
    const renderTeamStatusFunc = `
// ==========================================
// 👥 STATUS DA EQUIPE DA ESCOLA
// ==========================================
window.renderTeamStatus = async function() {
    const container = document.getElementById('team-status-container');
    const schoolLabel = document.getElementById('team-school-name');
    if (!container || !schoolLabel) return;

    try {
        const loggedUser = JSON.parse(localStorage.getItem('registeredUser') || '{}');
        const userSchool = (loggedUser.instituicao || loggedUser.escola || '').trim();
        
        if (!userSchool) {
            container.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem;">Nenhuma escola associada ao seu perfil.</div>';
            schoolLabel.textContent = 'Nenhuma';
            return;
        }
        
        schoolLabel.textContent = userSchool;
        
        // Fetch all users
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        
        // Fetch presence
        const presenceRes = await fetch('/api/presence');
        const presence = await presenceRes.json();
        
        const myTeam = users.filter(u => (u.instituicao || u.escola || '').trim() === userSchool);
        
        if (myTeam.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem;">Nenhum colega encontrado na sua escola.</div>';
            return;
        }
        
        let html = '';
        myTeam.forEach(member => {
            // Check presence
            const pData = presence.find(p => p.email === member.email || p.email === member.id);
            let status = 'Offline';
            let color = '#94a3b8'; // gray
            let icon = '🔴';
            
            if (pData) {
                if (pData.statusAula === 'em_andamento') {
                    status = 'Em Sala';
                    color = '#f59e0b'; // amber
                    icon = '🟡';
                } else {
                    status = 'Online';
                    color = '#10b981'; // green
                    icon = '🟢';
                }
            }
            
            html += \`
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; display:flex; align-items:center; gap:10px;">
                    <div style="width: 36px; height: 36px; border-radius: 50%; background: #2d3139; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                        \${member.avatarType === 'emoji' ? (member.avatarData || '👤') : '👤'}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="color: #fff; font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${member.name || 'Sem Nome'}</div>
                        <div style="color: \${color}; font-size: 0.8rem; font-weight: 500; display:flex; align-items:center; gap:4px;">
                            \${icon} \${status}
                        </div>
                    </div>
                </div>
            \`;
        });
        
        container.innerHTML = html;
        
    } catch(e) {
        console.error('Error rendering team status:', e);
        container.innerHTML = '<div style="color:#ef4444; font-size:0.9rem;">Erro ao carregar perfis.</div>';
    }
};

// Call renderTeamStatus periodically or when tab changes
setInterval(() => {
    if (document.getElementById('acompanhamento-real') && document.getElementById('acompanhamento-real').classList.contains('active')) {
        renderTeamStatus();
    }
}, 30000); // refresh every 30s
`;
    appJs += `\n${renderTeamStatusFunc}`;
}

// Hook it into switchView for acompanhamento-real
if (appJs.includes('if (tabId === "acompanhamento-real") {') && !appJs.includes('if (window.renderTeamStatus) window.renderTeamStatus();')) {
    appJs = appJs.replace(
        /(if \(tabId === "acompanhamento-real"\) {)/,
        `$1\n    if (window.renderTeamStatus) window.renderTeamStatus();`
    );
} else if (!appJs.includes('window.renderTeamStatus()')) {
    // Just inject it globally in switchView
    appJs = appJs.replace(
        /(if \(targetSection\) \{\s*targetSection\.classList\.add\("active"\);\s*\})/,
        `$1\n  if (tabId === "acompanhamento-real" && window.renderTeamStatus) { window.renderTeamStatus(); }`
    );
}

fs.writeFileSync('app.js', appJs, 'utf8');
console.log("Patched successfully!");
