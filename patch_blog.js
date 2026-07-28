const fs = require('fs');
const path = require('path');

function patchIndexHtml() {
    const indexPath = path.join(__dirname, 'index.html');
    let code = fs.readFileSync(indexPath, 'utf8');

    // 1. Replace URL input with File input in "Novo Artigo" modal
    const oldInput = `<label style="display: block; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">URL da Imagem (Opcional)</label>
                                <input type="url" id="artigo-imagem-input" class="form-control" placeholder="https://exemplo.com/imagem.jpg" style="background: rgba(0,0,0,0.2); color: #fff; width: 100%;">`;
    
    const newInput = `<label style="display: block; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Upload da Imagem (Opcional)</label>
                                <input type="file" id="artigo-imagem-input" accept="image/*" class="form-control" style="background: rgba(0,0,0,0.2); color: #fff; width: 100%; border: 1px dashed rgba(255,255,255,0.2); padding: 8px;">`;
    
    code = code.replace(oldInput, newInput);

    // 2. Add Recent Articles to Dashboard
    const sloganBarEnd = '</div>\r\n\r\n\r\n                    <!-- Closet Inspiration Section -->';
    const sloganBarEndUnix = '</div>\n\n\n                    <!-- Closet Inspiration Section -->';
    
    const recentArticlesWidget = `</div>

                    <!-- Artigos Recentes (Novidade) -->
                    <h2 class="section-title" style="margin-top: 30px;">Artigos Recentes</h2>
                    <div id="dashboard-recent-articles" style="margin-bottom: 40px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                        <div style="color: var(--text-muted);">Carregando artigos...</div>
                    </div>

                    <!-- Closet Inspiration Section -->`;
    
    if (code.includes(sloganBarEnd)) {
        code = code.replace(sloganBarEnd, recentArticlesWidget);
    } else if (code.includes(sloganBarEndUnix)) {
        code = code.replace(sloganBarEndUnix, recentArticlesWidget);
    }

    fs.writeFileSync(indexPath, code);
    console.log('index.html patched');
}

function patchAppJS() {
    const appJSPath = path.join(__dirname, 'app_v2.js');
    let code = fs.readFileSync(appJSPath, 'utf8');

    // 1. Modify salvarNovoArtigo to handle file upload and custom toast
    const oldSalvarNovoArtigo = `    window.salvarNovoArtigo = function(e) {
        e.preventDefault();
        const userStr = localStorage.getItem('registeredUser') || sessionStorage.getItem('coordSession');
        const isLogged = localStorage.getItem('isLoggedIn') === 'true' || userStr;
        if (!isLogged) return;
        const u = userStr ? JSON.parse(userStr) : { name: 'Coordenador(a)', escola: '' };

        const title = document.getElementById('artigo-titulo-input').value.trim();
        const category = document.getElementById('artigo-categoria-input').value;
        const image = document.getElementById('artigo-imagem-input').value.trim();
        const content = document.getElementById('artigo-conteudo-input').value.trim();

        if (!title || !content) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        const date = new Date().toLocaleDateString('pt-BR');
        const nextId = orgPosts.length > 0 ? Math.max(...orgPosts.map(p => p.id || 0)) + 1 : 1;

        const newPost = {
            id: nextId,
            title,
            category,
            content,
            image: image || null,
            author: u.name || 'Professor(a)',
            date,
            likes: 0,
            likedBy: [],
            comments: [],
            escolaCode: u.instituicao || u.escola || ''
        };

        orgPosts.unshift(newPost);
        localStorage.setItem('posts', JSON.stringify(orgPosts));
        if (typeof syncWithBackend === 'function') syncWithBackend('posts', orgPosts);

        showToast('Artigo publicado com sucesso!', 'success');
        window.fecharModalNovoArtigo();
        window.renderArtigosBlog();
        window.openArticleDetail(newPost.id);
        
    };`;

    const newSalvarNovoArtigo = `    window.salvarNovoArtigo = function(e) {
        e.preventDefault();
        const userStr = localStorage.getItem('registeredUser') || sessionStorage.getItem('coordSession');
        const isLogged = localStorage.getItem('isLoggedIn') === 'true' || userStr;
        if (!isLogged) return;
        const u = userStr ? JSON.parse(userStr) : { name: 'Coordenador(a)', escola: '' };

        const title = document.getElementById('artigo-titulo-input').value.trim();
        const category = document.getElementById('artigo-categoria-input').value;
        const content = document.getElementById('artigo-conteudo-input').value.trim();
        const fileInput = document.getElementById('artigo-imagem-input');

        if (!title || !content) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        let imageBase64 = null;
        if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                imageBase64 = evt.target.result;
                finalizePost(imageBase64);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            finalizePost(null);
        }

        function finalizePost(imageResult) {
            const date = new Date().toLocaleDateString('pt-BR');
            const nextId = orgPosts.length > 0 ? Math.max(...orgPosts.map(p => p.id || 0)) + 1 : 1;

            const newPost = {
                id: nextId,
                title,
                category,
                content,
                image: imageResult,
                author: u.name || 'Professor(a)',
                date,
                likes: 0,
                likedBy: [],
                comments: [],
                escolaCode: u.instituicao || u.escola || ''
            };

            orgPosts.unshift(newPost);
            localStorage.setItem('posts', JSON.stringify(orgPosts));
            if (typeof syncWithBackend === 'function') syncWithBackend('posts', orgPosts);

            const timeStr = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            showToast(\`📢 <strong style="color:var(--primary-beige);">Artigo Publicado!</strong><br><span style="font-size:0.9rem;">Tema: \${title}<br>Prof: \${newPost.author}<br>Horário: \${timeStr}</span>\`, 'success', 8000);
            
            window.fecharModalNovoArtigo();
            window.renderArtigosBlog();
            if (typeof window.renderDashboardRecentArticles === 'function') {
                window.renderDashboardRecentArticles();
            }
            window.openArticleDetail(newPost.id);
        }
    };`;

    if (code.includes("window.salvarNovoArtigo = function(e) {")) {
        code = code.replace(oldSalvarNovoArtigo, newSalvarNovoArtigo);
    }

    // 2. Add renderDashboardRecentArticles inside app_v2.js
    const renderRecentJS = `
    window.renderDashboardRecentArticles = function() {
        const container = document.getElementById('dashboard-recent-articles');
        if (!container) return;
        
        const recent = orgPosts.slice(0, 3);
        
        if (recent.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted);">Nenhum artigo publicado ainda.</div>';
            return;
        }
        
        container.innerHTML = recent.map(r => {
            const safeImg = r.image || 'assets/cat_tecidos.png';
            const catLabel = getCategoryLabel(r.category);
            return \`
            <div onclick="window.switchTab('blog'); setTimeout(() => window.openArticleDetail(\${r.id}), 100)" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; overflow:hidden; cursor:pointer; display:flex; flex-direction:column; transition:0.2s; height: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" onmouseover="this.style.borderColor='var(--primary-beige)';" onmouseout="this.style.borderColor='var(--border-color)';">
                <div style="position:relative; height:150px;">
                    <img src="\${safeImg}" style="width:100%; height:100%; object-fit:cover;">
                    <span style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.6rem; font-weight:bold; padding:2px 6px; border-radius:4px; text-transform:uppercase;">\${catLabel}</span>
                </div>
                <div style="padding:15px; flex-grow:1; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <h4 style="color:#fff; font-size:1rem; margin:0 0 8px 0; line-height:1.4; font-weight:700;">\${r.title}</h4>
                        <p style="color: rgba(255,255,255,0.65); font-size: 0.85rem; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">\${r.content}</p>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; margin-top: 15px;">
                        <span style="font-size:0.75rem; color:var(--text-muted);">Prof. \${r.author.split(' ')[0]}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">\${r.date}</span>
                    </div>
                </div>
            </div>
        \`}).join('');
    };
    `;

    if (!code.includes("window.renderDashboardRecentArticles = function")) {
        code += "\n\n" + renderRecentJS;
    }

    fs.writeFileSync(appJSPath, code);
    console.log('app_v2.js patched');
}

function patchAppFallback() {
    const appJSPath = path.join(__dirname, 'app.js');
    let code = fs.readFileSync(appJSPath, 'utf8');

    // Replace salvarNovoArtigo in app.js as well if it exists
    const oldSalvarRegex = /window\.salvarNovoArtigo\s*=\s*function\s*\(e\)\s*\{[\s\S]*?window\.openArticleDetail\(newPost\.id\);\s*\};/;
    
    const newSalvarNovoArtigo = `window.salvarNovoArtigo = function(e) {
        e.preventDefault();
        const userStr = localStorage.getItem('registeredUser') || sessionStorage.getItem('coordSession');
        const isLogged = localStorage.getItem('isLoggedIn') === 'true' || userStr;
        if (!isLogged) return;
        const u = userStr ? JSON.parse(userStr) : { name: 'Coordenador(a)', escola: '' };

        const title = document.getElementById('artigo-titulo-input').value.trim();
        const category = document.getElementById('artigo-categoria-input').value;
        const content = document.getElementById('artigo-conteudo-input').value.trim();
        const fileInput = document.getElementById('artigo-imagem-input');

        if (!title || !content) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        let imageBase64 = null;
        if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                imageBase64 = evt.target.result;
                finalizePost(imageBase64);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            finalizePost(null);
        }

        function finalizePost(imageResult) {
            const date = new Date().toLocaleDateString('pt-BR');
            const nextId = orgPosts.length > 0 ? Math.max(...orgPosts.map(p => p.id || 0)) + 1 : 1;

            const newPost = {
                id: nextId,
                title,
                category,
                content,
                image: imageResult,
                author: u.name || 'Professor(a)',
                date,
                likes: 0,
                likedBy: [],
                comments: [],
                escolaCode: u.instituicao || u.escola || ''
            };

            orgPosts.unshift(newPost);
            localStorage.setItem('posts', JSON.stringify(orgPosts));
            if (typeof syncWithBackend === 'function') syncWithBackend('posts', orgPosts);

            const timeStr = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            showToast(\`📢 <strong style="color:var(--primary-beige);">Artigo Publicado!</strong><br><span style="font-size:0.9rem;">Tema: \${title}<br>Prof: \${newPost.author}<br>Horário: \${timeStr}</span>\`, 'success', 8000);
            
            if (typeof window.fecharModalNovoArtigo === 'function') window.fecharModalNovoArtigo();
            if (typeof window.renderArtigosBlog === 'function') window.renderArtigosBlog();
            if (typeof window.renderDashboardRecentArticles === 'function') window.renderDashboardRecentArticles();
            if (typeof window.openArticleDetail === 'function') window.openArticleDetail(newPost.id);
        }
    };`;

    code = code.replace(oldSalvarRegex, newSalvarNovoArtigo);
    fs.writeFileSync(appJSPath, code);
    console.log('app.js patched');
}

patchIndexHtml();
patchAppJS();
patchAppFallback();
