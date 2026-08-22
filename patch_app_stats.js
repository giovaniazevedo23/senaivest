const fs = require('fs');
const path = require('path');

function patchServer() {
    const serverPath = path.join(__dirname, 'server.js');
    let code = fs.readFileSync(serverPath, 'utf8');

    // Add appStats to /api/data
    if (!code.includes("appStats: readDB('appStats')")) {
        code = code.replace(
            "deletedCategories: readDB('deletedCategories'),",
            "deletedCategories: readDB('deletedCategories'),\n      appStats: readDB('appStats'),"
        );
    }
    
    // Add appStats to allowed list
    if (!code.includes("'appStats'")) {
        code = code.replace(
            "const allowed = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','users','presence'];",
            "const allowed = ['inventory','plans','boletins','notifications','schools','labs','posts','agenda','news','diario','categories','deletedCategories','users','presence','appStats'];"
        );
    }

    fs.writeFileSync(serverPath, code);
    console.log('server.js patched');
}

function patchInstall() {
    const installPath = path.join(__dirname, 'install.html');
    let code = fs.readFileSync(installPath, 'utf8');

    // Replace the static localStorage logic with dynamic logic
    const backendLogic = `
        // Detect if app is already installed natively
        // E adiciona verificação na inicialização
        let isInstalled = false;
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            isInstalled = true;
        }

        window.addEventListener('appinstalled', (evt) => {
            console.log('App foi instalado com sucesso');
            installBtn.textContent = 'Instalado';
            installBtn.disabled = true;
            incrementDownloadCount();
        });

        // ==========================================
        // Lógica de Downloads e Avaliações Dinâmicas (Backend Sync)
        // ==========================================
        
        let appStats = { downloads: 0, reviews: [] };
        const downloadDisplay = document.getElementById('download-count-display');
        
        // Fetch stats from backend
        function fetchAppStats() {
            fetch('/api/data')
                .then(r => r.json())
                .then(data => {
                    if (data.appStats) {
                        appStats = data.appStats;
                        if (!appStats.downloads) appStats.downloads = 0;
                        if (!appStats.reviews) appStats.reviews = [];
                        
                        updateDownloadDisplay();
                        savedReviews = appStats.reviews;
                        renderReviews();
                    }
                })
                .catch(e => console.warn('Erro ao carregar appStats', e));
        }

        function saveAppStats() {
            fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'appStats', data: appStats })
            }).catch(e => console.warn('Erro ao salvar appStats', e));
        }
        
        function updateDownloadDisplay() {
            if (downloadDisplay) {
                downloadDisplay.textContent = appStats.downloads.toLocaleString('pt-BR');
            }
        }
        
        function incrementDownloadCount() {
            appStats.downloads++;
            updateDownloadDisplay();
            saveAppStats();
        }
        
        // Se clicar em instalar
        installBtn.addEventListener('click', () => {
            if (!isInstalled) {
                incrementDownloadCount();
                isInstalled = true; // previne multiplos cliques
                installBtn.textContent = 'Instalado';
                installBtn.disabled = true;
            }
        });
        
        // Avaliações
        const stars = document.querySelectorAll('#interactive-stars svg');
        const reviewTextArea = document.getElementById('review-text-area');
        const btnSubmitReview = document.getElementById('btn-submit-review');
        const commentInput = document.getElementById('review-comment');
        const reviewsList = document.getElementById('reviews-list');
        
        let selectedRating = 0;
        let savedReviews = appStats.reviews;

        function updateRatingsUI() {
            const total = savedReviews.length;
            document.getElementById('total-reviews-display').textContent = total + (total === 1 ? ' avaliação' : ' avaliações');
            document.getElementById('big-total-reviews').textContent = total + (total === 1 ? ' avaliação' : ' avaliações');
            
            if (total === 0) {
                document.getElementById('avg-rating-display').textContent = '0';
                document.getElementById('big-avg-rating').textContent = '0';
                document.getElementById('big-stars-container').innerHTML = renderStars(0);
                for(let i=1; i<=5; i++) {
                    document.getElementById('bar-' + i).style.width = '0%';
                }
                return;
            }
            
            let sum = 0;
            let counts = {1:0, 2:0, 3:0, 4:0, 5:0};
            savedReviews.forEach(r => {
                sum += r.rating;
                counts[r.rating]++;
            });
            let avg = (sum / total).toFixed(1).replace('.', ',');
            
            document.getElementById('avg-rating-display').textContent = avg;
            document.getElementById('big-avg-rating').textContent = avg;
            document.getElementById('big-stars-container').innerHTML = renderStars(Math.round(sum/total));
            
            for(let i=1; i<=5; i++) {
                let pct = (counts[i] / total) * 100;
                document.getElementById('bar-' + i).style.width = pct + '%';
            }
        }

        function renderStars(rating) {
            let svgStars = '';
            for(let i=1; i<=5; i++) {
                if(i <= rating) {
                    svgStars += '<svg viewBox="0 0 24 24" width="14" height="14" fill="var(--play-green)" stroke="var(--play-green)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                } else {
                    svgStars += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--play-text-secondary)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                }
            }
            return svgStars;
        }

        function renderReviews() {
            updateRatingsUI();
            reviewsList.innerHTML = '';
            const reversed = [...savedReviews].reverse();
            reversed.forEach(rev => {
                const initial = rev.name.charAt(0).toUpperCase();
                const html = \`
                    <div class="review-item">
                        <div class="review-item-header">
                            <div class="review-avatar">\${initial}</div>
                            <div>
                                <div class="review-name">\${rev.name}</div>
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <div style="display:flex; gap:2px;">\${renderStars(rev.rating)}</div>
                                    <span class="review-date">\${rev.date}</span>
                                </div>
                            </div>
                        </div>
                        \${rev.text ? \`<div class="review-text">\${rev.text}</div>\` : ''}
                    </div>
                \`;
                reviewsList.insertAdjacentHTML('beforeend', html);
            });
        }

        stars.forEach(star => {
            star.addEventListener('click', (e) => {
                selectedRating = parseInt(e.currentTarget.getAttribute('data-rating'));
                stars.forEach(s => {
                    if(parseInt(s.getAttribute('data-rating')) <= selectedRating) {
                        s.classList.add('active');
                        s.setAttribute('fill', 'var(--play-green)');
                        s.setAttribute('stroke', 'var(--play-green)');
                    } else {
                        s.classList.remove('active');
                        s.setAttribute('fill', 'none');
                        s.setAttribute('stroke', 'currentColor');
                    }
                });
                reviewTextArea.style.display = 'block';
            });
        });

        btnSubmitReview.addEventListener('click', () => {
            if(selectedRating === 0) return;
            const text = commentInput.value.trim();
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR');
            const newReview = {
                name: 'Professor (Você)', 
                date: dateStr,
                rating: selectedRating,
                text: text
            };
            appStats.reviews.push(newReview);
            saveAppStats();
            commentInput.value = '';
            selectedRating = 0;
            stars.forEach(s => {
                s.classList.remove('active');
                s.setAttribute('fill', 'none');
                s.setAttribute('stroke', 'currentColor');
            });
            reviewTextArea.style.display = 'none';
            renderReviews();
            alert('Sua avaliação foi publicada!');
        });
        
        // Fetch real data on load and start interval
        fetchAppStats();
        setInterval(fetchAppStats, 5000);

        // Define button state on load
        if (isInstalled) {
            installBtn.textContent = 'Instalado';
            installBtn.disabled = true;
        } else {
            // Also listen to display-mode change
            window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
                if (evt.matches) {
                    installBtn.textContent = 'Instalado';
                    installBtn.disabled = true;
                }
            });
        }
`;

    // Now let's carefully replace the logic block from:
    // `// Detect if app is already installed`
    // to:
    // `renderReviews();`
    const startIndex = code.indexOf('// Detect if app is already installed');
    const endIndexStr = 'renderReviews();\n    </script>';
    const endIndex = code.indexOf(endIndexStr) + 'renderReviews();'.length;
    
    if (startIndex > -1 && endIndex > -1) {
        code = code.substring(0, startIndex) + backendLogic.trim() + code.substring(endIndex);
        fs.writeFileSync(installPath, code);
        console.log('install.html patched');
    } else {
        console.log('Failed to patch install.html');
    }
}

patchServer();
patchInstall();
