const fs = require('fs');
const path = require('path');

function appendToAppV2() {
    const file = path.join(__dirname, 'app_v2.js');
    let code = fs.readFileSync(file, 'utf8');

    const renderFn = `
window.renderDashboardRecentArticles = function() {
    const container = document.getElementById('dashboard-recent-articles');
    if (!container) return;
    
    // Sort logic relies on orgPosts already being sorted (newest first)
    const recent = (typeof orgPosts !== 'undefined' ? orgPosts : []).slice(0, 3);
    
    if (recent.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted);">Nenhum artigo publicado ainda.</div>';
        return;
    }
    
    container.innerHTML = recent.map(r => {
        const safeImg = r.image || 'assets/cat_tecidos.png';
        const catLabel = typeof getCategoryLabel === 'function' ? getCategoryLabel(r.category) : r.category;
        const authorFirstName = (r.author || 'Professor').split(' ')[0];
        
        return \`
        <div onclick="window.switchTab('blog'); setTimeout(() => { if(window.openArticleDetail) window.openArticleDetail(\${r.id}); }, 200)" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; transition:0.2s; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" onmouseover="this.style.borderColor='var(--primary-beige)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="position:relative; height:150px;">
                <img src="\${safeImg}" style="width:100%; height:100%; object-fit:cover;">
                <span style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.6rem; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">\${catLabel}</span>
            </div>
            <div style="padding:15px; flex-grow:1; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h4 style="color:#fff; font-size:1rem; margin:0 0 8px 0; line-height:1.4; font-weight:700;">\${r.title}</h4>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; margin-top: 15px;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Prof. \${authorFirstName}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">\${r.date || ''}</span>
                </div>
            </div>
        </div>
        \`;
    }).join('');
};

// Override checkAndInjectHomeArticles to also call renderDashboardRecentArticles
if (typeof window.checkAndInjectHomeArticles === 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof renderDashboardRecentArticles === 'function') renderDashboardRecentArticles();
        }, 1500);
    });
}
`;

    if (!code.includes("window.renderDashboardRecentArticles = function() {")) {
        code += "\n" + renderFn;
        fs.writeFileSync(file, code);
        console.log('Appended to app_v2.js');
    }
}

appendToAppV2();
