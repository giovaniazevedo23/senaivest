const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app_v2.js');
let code = fs.readFileSync(file, 'utf8');

const imgFunc = `
    function getCategoryFallbackImage(cat) {
        const map = {
            'ferramentas': 'assets/cat_ferramentas.png',
            'maquinas': 'assets/cat_ferramentas.png',
            'logistica': 'assets/cat_moldes.png',
            '5s': 'assets/inspire_1.png',
            'conservacao': 'assets/inspire_2.png',
            'residuos': 'assets/inspire_3.png'
        };
        return map[cat] || 'assets/cat_tecidos.png';
    }
`;

if (!code.includes('getCategoryFallbackImage')) {
    code = code.replace(
        'function getCategoryColor(cat) {',
        imgFunc + '\n    function getCategoryColor(cat) {'
    );
}

// 1. Dashboard: remove slice(0, 3) and filter by latest date, and use fallback image
const renderDashRegex = /window\.renderDashboardRecentArticles\s*=\s*function\(\)\s*\{[\s\S]*?const recent =[^;]+;([\s\S]*?)container\.innerHTML = recent\.map\(r => \{[\s\S]*?const safeImg =[^;]+;([\s\S]*?)(onerror="this\.src='assets\/cat_tecidos\.png'")([\s\S]*?)\]\}\)\.join\(''\);\s*\};/g;

code = code.replace(renderDashRegex, (match, p1, p2, p3, p4) => {
    // We recreate the function exactly
    return `window.renderDashboardRecentArticles = function() {
        const container = document.getElementById('dashboard-recent-articles');
        if (!container) return;
        
        let recent = [];
        if (typeof orgPosts !== 'undefined' && Array.isArray(orgPosts) && orgPosts.length > 0) {
            const latestDate = orgPosts[0].date;
            recent = orgPosts.filter(p => p.date === latestDate);
        }
        
        if (recent.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 20px;">Nenhum artigo publicado ainda.</div>';
            return;
        }
        
        container.innerHTML = recent.map(r => {
            const fallback = typeof getCategoryFallbackImage === 'function' ? getCategoryFallbackImage(r.category) : 'assets/cat_tecidos.png';
            const safeImg = r.image || fallback;
            const catLabel = typeof getCategoryLabel === 'function' ? getCategoryLabel(r.category) : r.category;
            const authorName = typeof r.author === 'string' ? r.author.split(' ')[0] : 'Prof.';
            return \`
            <div onclick="window.switchTab('blog'); setTimeout(() => { if(window.openArticleDetail) window.openArticleDetail(\${r.id}); }, 200)" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; transition:0.2s; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" onmouseover="this.style.borderColor='var(--primary-beige)';" onmouseout="this.style.borderColor='var(--border-color)';">
                <div style="position:relative; height:150px;">
                    <img src="\${safeImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='\${fallback}'">
                    <span style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.6rem; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">\${catLabel}</span>
                </div>
                <div style="padding:15px; flex-grow:1; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <h4 style="color:#fff; font-size:1rem; margin:0 0 8px 0; line-height:1.4; font-weight:700;">\${r.title}</h4>
                        <p style="color: rgba(255,255,255,0.65); font-size: 0.85rem; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">\${r.content}</p>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; margin-top: 15px;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Prof. \${authorName}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">\${r.date || ''}</span>
                    </div>
                </div>
            </div>
        \`}).join('');
    };`;
});

// 2. openArticleDetail cover image
const articleRegex = /const coverHtml = post\.image\s*\?\s*\`<div style="width:100%; max-height:380px; border-radius:12px; overflow:hidden; margin-bottom:30px; border:1px solid var\(--border-color\);"><img src="\$\{post\.image\}" style="width:100%; height:100%; object-fit:cover;" alt="Imagem do artigo" onerror="this\.parentElement\.style\.display='none'"><\/div>\`\s*:\s*'';/;

code = code.replace(articleRegex, `
        const fallback = typeof getCategoryFallbackImage === 'function' ? getCategoryFallbackImage(post.category) : 'assets/cat_tecidos.png';
        const coverHtml = \`<div style="width:100%; max-height:380px; border-radius:12px; overflow:hidden; margin-bottom:30px; border:1px solid var(--border-color);"><img src="\${post.image || fallback}" style="width:100%; height:100%; object-fit:cover;" alt="Imagem do artigo" onerror="this.src='\${fallback}'"></div>\`;
`);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched dashboard articles and fallback images.');
