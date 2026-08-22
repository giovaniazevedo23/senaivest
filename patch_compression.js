const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app_v2.js');
let code = fs.readFileSync(file, 'utf8');

const targetStr = `        let imageBase64 = null;
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                imageBase64 = evt.target.result;
                finalizePost(imageBase64);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            finalizePost(null);
        }`;

const replacementStr = `        let imageBase64 = null;
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
        }`;

const targetStr2 = `            orgPosts.unshift(newPost);
            localStorage.setItem('posts', JSON.stringify(orgPosts));
            if (typeof syncWithBackend === 'function') syncWithBackend('posts', orgPosts);`;

const replacementStr2 = `            orgPosts.unshift(newPost);
            try {
                localStorage.setItem('posts', JSON.stringify(orgPosts));
            } catch (e) {
                console.error("QuotaExceededError", e);
                showToast("Erro: A imagem inserida é muito pesada e estourou a memória.", "error", 6000);
            }
            if (typeof syncWithBackend === 'function') {
                try {
                    syncWithBackend('posts', orgPosts);
                } catch(e) {}
            }`;

// Using RegExp to normalize newlines
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

let t1 = escapeRegExp(targetStr).replace(/\r?\n/g, '\\s*');
let t2 = escapeRegExp(targetStr2).replace(/\r?\n/g, '\\s*');

code = code.replace(new RegExp(t1), replacementStr);
code = code.replace(new RegExp(t2), replacementStr2);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched app_v2.js with image compression');
