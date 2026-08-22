const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app_v2.js');
let code = fs.readFileSync(file, 'utf8');

const targetStr = `    window.salvarNovoArtigo = function(e) {
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
        
        if (typeof renderOrgPosts === 'function') renderOrgPosts();
    };`;

const replacementStr = `    window.salvarNovoArtigo = function(e) {
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
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    finalizePost(imageBase64);
                };
                img.onerror = function() {
                    finalizePost(null);
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
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
            
            try {
                localStorage.setItem('posts', JSON.stringify(orgPosts));
            } catch (e) {
                console.error("Failed to save to localStorage", e);
                showToast("Artigo criado, mas a memória está cheia.", "error", 6000);
            }
            
            if (typeof syncWithBackend === 'function') {
                try {
                    syncWithBackend('posts', orgPosts);
                } catch(e) {}
            }

            const timeStr = new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            showToast(\`📢 <strong style="color:var(--primary-beige);">Artigo Publicado!</strong><br><span style="font-size:0.9rem;">Tema: \${title}<br>Prof: \${newPost.author}<br>Horário: \${timeStr}</span>\`, 'success', 8000);
            
            if (typeof window.fecharModalNovoArtigo === 'function') window.fecharModalNovoArtigo();
            if (typeof window.renderArtigosBlog === 'function') window.renderArtigosBlog();
            if (typeof window.renderDashboardRecentArticles === 'function') window.renderDashboardRecentArticles();
            if (typeof window.openArticleDetail === 'function') window.openArticleDetail(newPost.id);
            if (typeof renderOrgPosts === 'function') renderOrgPosts();
        }
    };`;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let t1 = escapeRegExp(targetStr).replace(/\r?\n/g, '\\s*');

code = code.replace(new RegExp(t1), replacementStr);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched app_v2.js using write_to_file script.');
