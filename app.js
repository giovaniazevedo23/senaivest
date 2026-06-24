// State Management
let currentTab = 'inicio';
let currentLab = null;

// ── Auth Utilities (global scope for onclick handlers) ────────────────────
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    btn.classList.toggle('active', isHidden);
    // Update icon: open eye when showing, crossed eye when hidden
    const svgOpen = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    const svgClosed = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    btn.querySelector('svg').innerHTML = isHidden ? svgClosed : svgOpen;
}

function clearLoginErrors() {
    ['login-email-error', 'login-senha-error', 'login-general-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    if (emailInput) emailInput.classList.remove('input-error');
    if (senhaInput) senhaInput.classList.remove('input-error');
}


// Mock Data for Almoxarifados (Labs 1, 2, and 3)
let inventory = [
    // --- LAB 1 ---
    // Ferramentas
    {
        id: 1,
        lab: 1,
        category: 'ferramentas',
        name: 'Réguas de 60cm',
        quantity: '30x',
        location: 'Prateleira 1A',
        meta: 'Horario de entrada: 08:35 AM | Responsável: Prof. Carlos',
        status: 'Não Pertencente',
        emoji: '📏',
        bgGradient: 'linear-gradient(135deg, #74ebd5, #9face6)'
    },
    {
        id: 2,
        lab: 1,
        category: 'ferramentas',
        name: 'Rolos de Linha',
        quantity: '18x',
        location: 'Prateleira 1A',
        meta: 'Horario de saída: 07:30 AM | Responsável: Prof(a). Emanuela | Registro: Almox-Lab2 às 7:40AM',
        status: 'Não apresenta no estoque',
        emoji: '🧵',
        bgGradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)'
    },
    {
        id: 3,
        lab: 1,
        category: 'ferramentas',
        name: 'Tesoura de Costura 17,8cm',
        quantity: '25x',
        location: 'Prateleira 1A',
        meta: 'Entrada padrão',
        status: 'Pertencente',
        emoji: '✂️',
        bgGradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)'
    },
    // Tecidos
    {
        id: 4,
        lab: 1,
        category: 'tecidos',
        name: 'Tecido de Malha Twill Azul',
        quantity: '5x rolos',
        location: 'Prateleira 2A',
        meta: 'Lote importado',
        status: 'Pertencente',
        emoji: '👕',
        bgGradient: 'linear-gradient(135deg, #2575fc, #6a11cb)'
    },
    {
        id: 5,
        lab: 1,
        category: 'tecidos',
        name: 'Tecido Jeans Pesado 100% Algodão',
        quantity: '8x rolos',
        location: 'Prateleira 2A',
        meta: 'Gramatura reforçada',
        status: 'Pertencente',
        emoji: '👖',
        bgGradient: 'linear-gradient(135deg, #2c3e50, #3498db)'
    },
    {
        id: 6,
        lab: 1,
        category: 'tecidos',
        name: 'Tecido Crepe Duna (Air Flow)',
        quantity: '8x rolos',
        location: 'Prateleira 2A',
        meta: 'Diversas cores',
        status: 'Pertencente',
        emoji: '👗',
        bgGradient: 'linear-gradient(135deg, #ff758c, #ff7eb3)'
    },
    // Moldes
    {
        id: 7,
        lab: 1,
        category: 'moldes',
        name: 'Rolo de Papel Kraft',
        quantity: '15x rolos',
        location: 'Armário 1',
        meta: 'Largura 120cm',
        status: 'Pertencente',
        emoji: '📜',
        bgGradient: 'linear-gradient(135deg, #f39c12, #f1c40f)'
    },
    {
        id: 8,
        lab: 1,
        category: 'moldes',
        name: 'Rolo de Papel Manteiga',
        quantity: '15x rolos',
        location: 'Armário 1',
        meta: 'Largura 80cm',
        status: 'Pertencente',
        emoji: '🗞️',
        bgGradient: 'linear-gradient(135deg, #bdc3c7, #2c3e50)'
    },
    {
        id: 9,
        lab: 1,
        category: 'moldes',
        name: 'Carretilha de Madeira P/ Corte',
        quantity: '25x un',
        location: 'Prateleira 1B',
        meta: 'Cabo anatômico',
        status: 'Pertencente',
        emoji: '⚙️',
        bgGradient: 'linear-gradient(135deg, #e67e22, #d35400)'
    },
    {
        id: 10,
        lab: 1,
        category: 'moldes',
        name: 'Carretilha Para Marcar Tecido Círculo',
        quantity: '10x un',
        location: 'Prateleira 1B',
        meta: 'Marcação dupla',
        status: 'Pertencente',
        emoji: '🔄',
        bgGradient: 'linear-gradient(135deg, #16a085, #2ecc71)'
    },

    // --- LAB 2 ---
    {
        id: 11,
        lab: 2,
        category: 'ferramentas',
        name: 'Máquina Overlock Industrial',
        quantity: '4x un',
        location: 'Estação C3',
        meta: 'Manutenção realizada em Maio',
        status: 'Pertencente',
        emoji: '⚙️',
        bgGradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)'
    },
    {
        id: 12,
        lab: 2,
        category: 'tecidos',
        name: 'Tecido de Cetim Toque de Seda',
        quantity: '12x rolos',
        location: 'Prateleira A1',
        meta: 'Uso restrito formandos',
        status: 'Pertencente',
        emoji: '🎀',
        bgGradient: 'linear-gradient(135deg, #ff758c, #ff7eb3)'
    },

    // --- LAB 3 ---
    {
        id: 13,
        lab: 3,
        category: 'ferramentas',
        name: 'Ferros de Passar Industriais a Vapor',
        quantity: '6x un',
        location: 'Mesa de Passar 1',
        meta: 'Cuidado: Temperatura alta',
        status: 'Pertencente',
        emoji: '💨',
        bgGradient: 'linear-gradient(135deg, #bdc3c7, #2c3e50)'
    },
    {
        id: 14,
        lab: 3,
        category: 'moldes',
        name: 'Manequins de Costura Ajustáveis',
        quantity: '5x un',
        location: 'Estúdio Central',
        meta: 'Tamanhos 38 a 46',
        status: 'Pertencente',
        emoji: '🧍',
        bgGradient: 'linear-gradient(135deg, #f39c12, #f1c40f)'
    }
];

// Mock Data for Lesson Plans
let initialLessonPlans = [
    {
        id: 1,
        date: '2026-06-15',
        course: 'Costura e Modelagem Industrial A',
        topic: 'Traçado de Molde Base da Saia Reta',
        objectives: 'Capacitar o aluno a realizar as marcações antropométricas básicas e transferi-las para o papel kraft.',
        resources: [
            { id: 7, name: 'Rolo de Papel Kraft', lab: 1, quantity: '3 rolos' },
            { id: 1, name: 'Réguas de 60cm', lab: 1, quantity: '15x' },
            { id: 9, name: 'Carretilha de Madeira P/ Corte', lab: 1, quantity: '10x' }
        ]
    },
    {
        id: 2,
        date: '2026-06-17',
        course: 'Processos de Vestuário - Turma B',
        topic: 'Corte e Costura de Malhas Twill',
        objectives: 'Exercitar o manuseio de máquina overlock no fechamento de golas e bainhas de tecido elástico.',
        resources: [
            { id: 4, name: 'Tecido de Malha Twill Azul', lab: 1, quantity: '2 rolos' },
            { id: 2, name: 'Rolos de Linha', lab: 1, quantity: '8x' },
            { id: 3, name: 'Tesoura de Costura 17,8cm', lab: 1, quantity: '10x' }
        ]
    },
    {
        id: 3,
        date: '2026-06-20',
        course: 'Modelagem sob Medida Avançada',
        topic: 'Ajuste de Peça Piloto em Manequim',
        objectives: 'Demonstrar as técnicas de moulage em manequim e transferência de pences na saia drapeada.',
        resources: [
            { id: 14, name: 'Manequins de Costura Ajustáveis', lab: 3, quantity: '4x' },
            { id: 3, name: 'Tesoura de Costura 17,8cm', lab: 1, quantity: '5x' }
        ]
    }
];

let lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || initialLessonPlans;
if (!localStorage.getItem('lessonPlans')) {
    localStorage.setItem('lessonPlans', JSON.stringify(initialLessonPlans));
}

// Mock Data for Notifications
let notifications = [
    {
        id: 1,
        type: 'warning',
        title: 'Estoque Baixo: Réguas',
        message: 'A quantidade de Réguas de 60cm no Almoxarifado Lab 1 está abaixo do limite de segurança.',
        time: 'há 10 min',
        read: false
    },
    {
        id: 2,
        type: 'warning',
        title: 'Material Ausente: Rolos de Linha',
        message: '18x Rolos de Linha não localizados no estoque do Almoxarifado Lab 1. Material retirado por Prof(a). Emanuela às 07:30 AM para a aula cód. PLAN-102 (Lab 2). Registro correspondente de transferência no outro laboratório: Almox-Lab2 às 07:40 AM.',
        time: 'há 2 horas',
        read: false
    },
    {
        id: 3,
        type: 'success',
        title: 'Boletim Enviado',
        message: 'O boletim de ocorrência DOC-2026-004 foi submetido com sucesso para a coordenação.',
        time: 'há 4 horas',
        read: false
    },
    {
        id: 4,
        type: 'info',
        title: 'Plano de Aula Aprovado',
        message: 'Seu plano de aula "Traçado de Molde Base da Saia Reta" foi revisado e aprovado.',
        time: 'há 1 dia',
        read: true
    }
];

let registeredSchools = JSON.parse(localStorage.getItem('schools')) || [];
let registeredLabs = JSON.parse(localStorage.getItem('labs')) || [
    { id: 1, name: 'Almoxarifado Lab 1', sigla: 'LAB-1', responsavel: 'Prof. Carlos' },
    { id: 2, name: 'Almoxarifado Lab 2', sigla: 'LAB-2', responsavel: 'Prof(a). Emanuela' },
    { id: 3, name: 'Almoxarifado Lab 3', sigla: 'LAB-3', responsavel: 'Prof(a). Carol' }
];
let orgPosts = JSON.parse(localStorage.getItem('posts')) || [
    {
        id: 1,
        title: 'Descarte Correto de Moldes',
        content: 'Lembre-se de separar os retalhos de papel kraft dos tecidos. O papel kraft deve ir para o cesto de recicláveis secos, enquanto retalhos de algodão podem ser doados para oficinas de artesanato.',
        image: 'assets/post_kraft.png',
        author: 'Prof(a). Carol',
        date: '12/06/2026',
        likes: 5,
        likedBy: [],
        comments: [
            { author: 'Prof. Carlos', text: 'Ótima iniciativa! Já estamos separando os retalhos no Lab 1.' }
        ]
    }
];

if (!localStorage.getItem('inventory')) {
    localStorage.setItem('inventory', JSON.stringify(inventory));
} else {
    inventory = JSON.parse(localStorage.getItem('inventory'));
}

if (!localStorage.getItem('notifications')) {
    localStorage.setItem('notifications', JSON.stringify(notifications));
} else {
    notifications = JSON.parse(localStorage.getItem('notifications'));
}

function syncWithBackend(type, dataArray) {
    localStorage.setItem(type, JSON.stringify(dataArray));
    fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data: dataArray })
    })
    .then(res => {
        if (!res.ok) console.warn(`Failed to sync ${type} to backend`);
    })
    .catch(err => {
        console.warn(`Backend sync error for ${type}:`, err);
    });
}

async function loadBackendData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            if (data.inventory !== null) { inventory = data.inventory; localStorage.setItem('inventory', JSON.stringify(inventory)); }
            if (data.plans !== null) { lessonPlans = data.plans; localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans)); }
            if (data.boletins !== null) { registeredBoletins = data.boletins; localStorage.setItem('registeredBoletins', JSON.stringify(registeredBoletins)); }
            if (data.notifications !== null) { notifications = data.notifications; localStorage.setItem('notifications', JSON.stringify(notifications)); }
            if (data.schools !== null) { registeredSchools = data.schools; localStorage.setItem('schools', JSON.stringify(registeredSchools)); }
            if (data.labs !== null) { registeredLabs = data.labs; localStorage.setItem('labs', JSON.stringify(registeredLabs)); }
            if (data.posts !== null) { orgPosts = data.posts; localStorage.setItem('posts', JSON.stringify(orgPosts)); }
            
            renderLessonPlans();
            renderNotifications();
            updateDashboardStats();
            renderRegisteredBoletins();
            renderSchools();
            renderLabButtons();
            renderOrgPosts();
            populatePlanoLocalDropdown();
            populatePlanoEscolaDropdown();
            if (currentLab) renderInventory();
        }
    } catch (err) {
        console.warn('Could not sync databases with backend (offline mode):', err);
    }
}

// DOMContentLoaded Initializations
document.addEventListener('DOMContentLoaded', () => {
    // Setup Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Sidebar Toggle Event Listeners
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('menu-toggle-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Check registration state
    const regOverlay = document.getElementById('register-fullscreen-overlay');
    let registeredUser = localStorage.getItem('registeredUser');
    const signupCard = document.getElementById('auth-cadastro-card');
    const loginCard = document.getElementById('auth-login-card');

    if (!registeredUser) {
        // NEW DEVICE or first time: show LOGIN form by default
        // User may already have an account on another device
        regOverlay.style.display = 'flex';
        loginCard.style.display = 'flex';
        signupCard.style.display = 'none';
    } else {
        // SAME DEVICE with saved session — auto-login instantly
        const user = JSON.parse(registeredUser);
        localStorage.setItem('isLoggedIn', 'true');
        regOverlay.style.display = 'none';
        updateUserUI(user);
        
        // Sync account to backend in background (non-blocking)
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        }).catch(() => {});
    }

    // Toggle buttons between signup and login cards inside overlay
    const goToLoginBtn = document.getElementById('go-to-login-btn');
    if (goToLoginBtn) {
        goToLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signupCard.style.display = 'none';
            loginCard.style.display = 'flex';
        });
    }

    const goToSignupBtn = document.getElementById('go-to-signup-btn');
    if (goToSignupBtn) {
        goToSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginCard.style.display = 'none';
            signupCard.style.display = 'flex';
        });
    }

    // Handle Forced Registration Form (Cadastro)
    const firstRegForm = document.getElementById('first-register-form');
    if (firstRegForm) {
        firstRegForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('first-reg-nome').value.trim();
            const email = document.getElementById('first-reg-email').value.trim();
            const telefone = document.getElementById('first-reg-telefone').value.trim();
            const nascimento = document.getElementById('first-reg-nascimento').value;
            const instituicao = document.getElementById('first-reg-instituicao').value.trim();
            const cargo = document.getElementById('first-reg-cargo').value.trim();
            const senha = document.getElementById('first-reg-senha').value;

            // Password validation
            const hasMinLength = senha.length >= 8;
            const hasUpper = /[A-Z]/.test(senha);
            const hasLower = /[a-z]/.test(senha);
            const hasNumber = /[0-9]/.test(senha);

            if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
                showToast('Senha inválida! Mínimo de 8 caracteres, contendo maiúsculas, minúsculas e número.', 'error');
                return;
            }

            const newUser = {
                name: nome,
                email: email,
                password: senha,
                phone: telefone,
                nascimento: nascimento,
                role: cargo,
                instituicao: instituicao,
                address: '',
                responsibleClass: '',
                avatarType: 'default',
                avatarData: ''
            };

            // Call API
            fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            })
            .then(async response => {
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('registeredUser', JSON.stringify(newUser));
                    localStorage.setItem('isLoggedIn', 'true'); // Auto-login!
                    updateUserUI(newUser);
                    
                    regOverlay.style.transition = 'opacity 0.5s ease-out';
                    regOverlay.style.opacity = '0';
                    setTimeout(() => {
                        regOverlay.style.display = 'none';
                        regOverlay.style.opacity = '1';
                    }, 500);

                    showToast('Cadastro e login realizados com sucesso!', 'success');
                    switchTab('inicio');
                } else {
                    showToast(data.error || 'Erro no cadastro.', 'error');
                }
            })
            .catch(err => {
                console.warn('Backend offline, salvando localmente:', err);
                localStorage.setItem('registeredUser', JSON.stringify(newUser));
                localStorage.setItem('isLoggedIn', 'true'); // Auto-login!
                updateUserUI(newUser);
                
                regOverlay.style.transition = 'opacity 0.5s ease-out';
                regOverlay.style.opacity = '0';
                setTimeout(() => {
                    regOverlay.style.display = 'none';
                    regOverlay.style.opacity = '1';
                }, 500);

                showToast('Cadastro e login realizados (Modo Local)!', 'success');
                switchTab('inicio');
            });
        });
    }

    // Handle Login Form — with specific error messages per field
    const firstLoginForm = document.getElementById('first-login-form');
    if (firstLoginForm) {
        firstLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('login-email');
            const senhaInput = document.getElementById('login-senha');
            const emailError = document.getElementById('login-email-error');
            const senhaError = document.getElementById('login-senha-error');
            const generalError = document.getElementById('login-general-error');
            const btnText = document.getElementById('btn-entrar-text');
            const btnLoading = document.getElementById('btn-entrar-loading');
            const submitBtn = document.getElementById('btn-entrar-sistema');
            
            const email = emailInput.value.trim();
            const senha = senhaInput.value;
            
            // Reset errors
            [emailError, senhaError, generalError].forEach(el => { if(el) { el.style.display = 'none'; el.textContent = ''; } });
            emailInput.classList.remove('input-error');
            senhaInput.classList.remove('input-error');
            
            // Basic validation
            if (!email) {
                emailError.textContent = '⚠️ Digite seu e-mail.';
                emailError.style.display = 'block';
                emailInput.classList.add('input-error');
                emailInput.focus();
                return;
            }
            if (!senha) {
                senhaError.textContent = '⚠️ Digite sua senha.';
                senhaError.style.display = 'block';
                senhaInput.classList.add('input-error');
                senhaInput.focus();
                return;
            }
            
            // Show loading state
            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
            if (submitBtn) submitBtn.disabled = true;
            
            const resetBtn = () => {
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                if (submitBtn) submitBtn.disabled = false;
            };
            
            const doLogin = (user) => {
                localStorage.setItem('registeredUser', JSON.stringify(user));
                localStorage.setItem('isLoggedIn', 'true');
                updateUserUI(user);
                
                regOverlay.style.transition = 'opacity 0.5s ease-out';
                regOverlay.style.opacity = '0';
                setTimeout(() => {
                    regOverlay.style.display = 'none';
                    regOverlay.style.opacity = '1';
                }, 500);
                showToast('Login realizado com sucesso!', 'success');
                switchTab('inicio');
            };
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password: senha })
                });
                
                const data = await response.json();
                resetBtn();
                
                if (response.ok) {
                    // Success!
                    doLogin(data.user);
                    
                } else if (data.error === 'EMAIL_NOT_FOUND') {
                    // Email not registered in the system
                    emailInput.classList.add('input-error');
                    emailError.innerHTML = '❌ E-mail não encontrado. <a href="#" onclick="document.getElementById(\'go-to-signup-btn\').click()" style="color:var(--primary-beige); text-decoration:underline;">Criar uma conta?</a>';
                    emailError.style.display = 'block';
                    emailInput.focus();
                    
                } else if (data.error === 'WRONG_PASSWORD') {
                    // Email found but password incorrect
                    senhaInput.classList.add('input-error');
                    senhaError.textContent = '🔒 Senha incorreta. Verifique e tente novamente.';
                    senhaError.style.display = 'block';
                    senhaInput.value = '';
                    senhaInput.focus();
                    
                } else {
                    // Other server error — try local fallback
                    const storedUserStr = localStorage.getItem('registeredUser');
                    if (storedUserStr) {
                        const storedUser = JSON.parse(storedUserStr);
                        if (storedUser.email.toLowerCase() === email.toLowerCase() && storedUser.password === senha) {
                            doLogin(storedUser);
                            return;
                        }
                    }
                    if (generalError) {
                        generalError.textContent = data.message || 'Erro ao fazer login. Tente novamente.';
                        generalError.style.display = 'block';
                    }
                }
                
            } catch (networkErr) {
                // Server offline — try local storage as fallback
                resetBtn();
                console.warn('Servidor offline, tentando login local:', networkErr);
                const storedUserStr = localStorage.getItem('registeredUser');
                if (storedUserStr) {
                    const storedUser = JSON.parse(storedUserStr);
                    if (storedUser.email.toLowerCase() === email.toLowerCase() && storedUser.password === senha) {
                        doLogin(storedUser);
                        showToast('Login em modo offline.', 'info');
                        return;
                    }
                    senhaInput.classList.add('input-error');
                    senhaError.textContent = '🔒 Senha incorreta.';
                    senhaError.style.display = 'block';
                } else {
                    if (generalError) {
                        generalError.textContent = '⚠️ Servidor indisponível e nenhuma conta local encontrada.';
                        generalError.style.display = 'block';
                    }
                }
            }
        });
    }

    // Handle Logout Sidebar Action
    const logoutBtn = document.getElementById('btn-logout-sidebar');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirm('Deseja sair? Na próxima vez, faça login com seu e-mail e senha.')) return;
            
            // Clear local session (account still exists on server)
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('registeredUser');
            
            // Show LOGIN card (user may want to sign in again or use another account)
            loginCard.style.display = 'flex';
            signupCard.style.display = 'none';
            regOverlay.style.display = 'flex';
            
            // Reset login form errors
            ['login-email-error','login-senha-error','login-general-error'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.style.display = 'none'; el.textContent = ''; }
            });
            
            showToast('Você saiu do sistema.', 'info');
        });
    }

    // Toggle Profile View/Edit Modes
    const btnEditProfile = document.getElementById('btn-edit-profile');
    const btnCancelEditProfile = document.getElementById('btn-cancel-edit-profile');
    const profileViewModeDiv = document.getElementById('profile-view-mode');
    const profileEditModeDiv = document.getElementById('profile-edit-mode');

    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if (profileViewModeDiv) profileViewModeDiv.style.display = 'none';
            if (profileEditModeDiv) profileEditModeDiv.style.display = 'block';
        });
    }

    if (btnCancelEditProfile) {
        btnCancelEditProfile.addEventListener('click', () => {
            if (profileViewModeDiv) profileViewModeDiv.style.display = 'block';
            if (profileEditModeDiv) profileEditModeDiv.style.display = 'none';
        });
    }

    // Handle Profile Details Form Submission
    const profileDetailsForm = document.getElementById('profile-details-form');
    if (profileDetailsForm) {
        profileDetailsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const registeredUser = localStorage.getItem('registeredUser');
            if (registeredUser) {
                const user = JSON.parse(registeredUser);
                user.name = document.getElementById('profile-name').value.trim();
                user.phone = document.getElementById('profile-phone').value.trim();
                user.email = document.getElementById('profile-email').value.trim();
                user.nascimento = document.getElementById('profile-nascimento').value;
                
                const newSenha = document.getElementById('profile-senha').value;
                if (newSenha && newSenha !== user.password) {
                    const hasMinLength = newSenha.length >= 8;
                    const hasUpper = /[A-Z]/.test(newSenha);
                    const hasLower = /[a-z]/.test(newSenha);
                    const hasNumber = /[0-9]/.test(newSenha);

                    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber) {
                        showToast('Senha inválida! Mínimo de 8 caracteres, contendo maiúsculas, minúsculas e número.', 'error');
                        return;
                    }
                    user.password = newSenha;
                }

                user.address = document.getElementById('profile-address').value.trim();
                user.instituicao = document.getElementById('profile-instituicao').value.trim();
                user.role = document.getElementById('profile-role').value.trim();
                user.responsibleClass = document.getElementById('profile-class').value.trim();
                
                // Save Gemini Key
                const geminiKey = document.getElementById('profile-gemini-key').value.trim();
                if (geminiKey) {
                    localStorage.setItem('gemini_api_key', geminiKey);
                } else {
                    localStorage.removeItem('gemini_api_key');
                }
                
                const toggleBackToView = () => {
                    if (profileViewModeDiv) profileViewModeDiv.style.display = 'block';
                    if (profileEditModeDiv) profileEditModeDiv.style.display = 'none';
                };

                // Call API
                fetch('/api/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                })
                .then(async response => {
                    const data = await response.json();
                    if (response.ok) {
                        localStorage.setItem('registeredUser', JSON.stringify(data.user));
                        updateUserUI(data.user);
                        showToast('Informações do perfil atualizadas!', 'success');
                        toggleBackToView();
                    } else {
                        showToast(data.error || 'Erro ao atualizar dados.', 'error');
                    }
                })
                .catch(err => {
                    console.warn('Backend offline, salvando localmente:', err);
                    localStorage.setItem('registeredUser', JSON.stringify(user));
                    updateUserUI(user);
                    showToast('Informações do perfil atualizadas (Modo Local)!', 'success');
                    toggleBackToView();
                });
            }
        });
    }

    // File upload logic
    const fileInput = document.getElementById('avatar-file-input');
    const uploadArea = document.getElementById('avatar-upload-area');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleAvatarFile(file);
            }
        });
    }

    if (uploadArea) {
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file && file.type.startsWith('image/')) {
                handleAvatarFile(file);
            }
        });
    }

    function handleAvatarFile(file) {
        if (file.size > 1024 * 1024) {
            showToast('Arquivo muito grande! O limite é de 1MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result;
            const registeredUser = localStorage.getItem('registeredUser');
            if (registeredUser) {
                const user = JSON.parse(registeredUser);
                user.avatarType = 'uploaded';
                user.avatarData = base64Data;
                localStorage.setItem('registeredUser', JSON.stringify(user));
                
                updateUserUI(user);
                showToast('Foto da galeria carregada com sucesso!', 'success');
            }
        };
        reader.readAsDataURL(file);
    }

    // Reset avatar button
    const btnResetAvatar = document.getElementById('btn-reset-avatar');
    if (btnResetAvatar) {
        btnResetAvatar.addEventListener('click', () => {
            const registeredUser = localStorage.getItem('registeredUser');
            if (registeredUser) {
                const user = JSON.parse(registeredUser);
                user.avatarType = 'default';
                user.avatarData = '';
                localStorage.setItem('registeredUser', JSON.stringify(user));
                
                updateUserUI(user);
                showToast('Foto removida. Silhueta restaurada.', 'success');
            }
        });
    }

    // Populate Initial Renders
    renderLessonPlans();
    renderNotifications();
    updateDashboardStats();
    renderRegisteredBoletins();
    setupNextBoletimCode();
    
    // Custom registrations initial render
    renderSchools();
    renderLabButtons();
    renderOrgPosts();
    populatePlanoLocalDropdown();
    populatePlanoEscolaDropdown();
    
    // Load fresh data from the server
    loadBackendData();

    // Render initial analytics stats
    renderAnalyticsDashboard();

    // Periodically check for lesson plan expirations (every 5 seconds)
    setInterval(checkLessonPlanExpirations, 5000);

    // Auto-calculate difference in Boletim Form
    const inputPrevista = document.getElementById('boletim-qtd-prevista');
    const inputEncontrada = document.getElementById('boletim-qtd-encontrada');
    const inputDiferenca = document.getElementById('boletim-qtd-diferenca');

    const calculateDiff = () => {
        const prev = parseInt(inputPrevista.value) || 0;
        const enc = parseInt(inputEncontrada.value) || 0;
        inputDiferenca.value = Math.abs(prev - enc);
    };
    if (inputPrevista && inputEncontrada && inputDiferenca) {
        inputPrevista.addEventListener('input', calculateDiff);
        inputEncontrada.addEventListener('input', calculateDiff);
    }

    const inputPrevistaDiv = document.getElementById('boletim-divergencia-prevista');
    const inputRealDiv = document.getElementById('boletim-divergencia-real');
    const inputDiferencaDiv = document.getElementById('boletim-divergencia-diferenca');

    const calculateDiffDiv = () => {
        const prev = parseInt(inputPrevistaDiv.value) || 0;
        const real = parseInt(inputRealDiv.value) || 0;
        inputDiferencaDiv.value = Math.abs(prev - real);
    };
    if (inputPrevistaDiv && inputRealDiv && inputDiferencaDiv) {
        inputPrevistaDiv.addEventListener('input', calculateDiffDiv);
        inputRealDiv.addEventListener('input', calculateDiffDiv);
    }

    // Wire up forms
    document.getElementById('boletim-form').addEventListener('submit', handleBoletimSubmit);
    document.getElementById('form-add-product').addEventListener('submit', handleAddProductSubmit);
    document.getElementById('form-add-plano').addEventListener('submit', handleAddPlanoSubmit);
    document.getElementById('form-transfer-product').addEventListener('submit', handleTransferSubmit);
    
    const schoolForm = document.getElementById('school-registration-form');
    if (schoolForm) schoolForm.addEventListener('submit', handleSchoolRegistrationSubmit);
    
    const almoxForm = document.getElementById('form-add-almoxarifado');
    if (almoxForm) almoxForm.addEventListener('submit', handleAddAlmoxarifadoSubmit);
    
    const postForm = document.getElementById('org-post-form');
    if (postForm) postForm.addEventListener('submit', handleOrgPostSubmit);

    // Initial Date inputs default to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('boletim-data').value = today;
    document.getElementById('plano-data-input').value = today;

    // Initialize Estela Chatbot
    initEstelaChatbot();
});

// SPA Tab Switching Logic
function switchTab(tabId) {
    // Deactivate previous active menu
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    // Activate target menu
    const targetMenuItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    }

    // Toggle View Sections
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update Top Header Title
    const headerTitle = document.getElementById('page-current-title');
    const pageTitles = {
        'inicio': 'Início',
        'aba-geral': 'Visão Geral do Painel',
        'almoxarifado': 'Gestão de Almoxarifados',
        'boletim': 'Boletim de Denúncia',
        'perfil': 'Perfil do Usuário',
        'guia-organizacao': 'Guia de Organização 5S',
        'notificacao': 'Notificações do Sistema',
        'plano-aula': 'Planos de Aula'
    };
    headerTitle.textContent = pageTitles[tabId] || 'SENAIVEST';
    currentTab = tabId;

    // Close sidebar on navigation
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    // Reset Almoxarifado views if switching tabs
    if (tabId !== 'almoxarifado') {
        backToAlmoxSelector();
    }
}

// ALMOXARIFADO NAVIGATION LOGIC
function openLab(labId) {
    currentLab = labId;
    
    // Hide Lab selection layout, show Grid Inventory layout
    document.getElementById('almox-selector-view').style.display = 'none';
    const inventoryView = document.getElementById('almox-inventory-view');
    inventoryView.style.display = 'block';

    // Update Lab Title header
    document.getElementById('inventory-lab-title').textContent = `ALMOXARIFADO LAB ${labId}`;
    
    // Render the grid items
    renderInventory();
}

function backToAlmoxSelector() {
    currentLab = null;
    document.getElementById('almox-inventory-view').style.display = 'none';
    document.getElementById('almox-selector-view').style.display = 'flex';
}

// RENDER INVENTORY ITEMS
function renderInventory() {
    if (!currentLab) return;

    const categories = ['ferramentas', 'tecidos', 'moldes'];
    
    categories.forEach(cat => {
        const gridElement = document.getElementById(`grid-${cat}`);
        gridElement.innerHTML = ''; // clear grid

        // Filter inventory for this lab & category
        const items = inventory.filter(item => item.lab === currentLab && item.category === cat);
        
        items.forEach(item => {
            const card = document.createElement('div');
            let cardClass = 'item-card';
            if (item.inconformidade) {
                cardClass += ' inconformidade';
            }
            card.className = cardClass;
            
            // Status CSS class binding
            let statusClass = 'status-pertencente';
            if (item.status === 'Não Pertencente') statusClass = 'status-naopertencente';
            if (item.status === 'Não apresenta no estoque' || item.inconformidade) statusClass = 'status-falta';

            // Action buttons
            let actionButtons = '';
            
            // Transfer button (always shown)
            actionButtons += `<button class="btn-card-transfer" onclick="openTransferModal(${item.id})">Transferir</button>`;
            
            // Return button: shown when item is in a different lab than its origin OR has inconformidade
            if (item.originLab && (item.lab !== item.originLab || item.inconformidade)) {
                actionButtons += `<button class="btn-card-transfer" onclick="returnItemToOrigin(${item.id})" style="background: var(--accent-green) !important; margin-left: 5px; box-shadow: 0 0 5px rgba(46, 204, 113, 0.4);">Devolver</button>`;
            }
            
            // Delete button: only for items that originate from this lab (Pertencente)
            if (item.originLab === currentLab || (!item.originLab && item.lab === currentLab)) {
                actionButtons += `<button class="btn-card-transfer" onclick="deleteInventoryItem(${item.id})" style="background: linear-gradient(135deg, #c0392b, #922b21) !important; margin-left: 5px;" title="Excluir produto">🗑️ Excluir</button>`;
            }

            // Build status label
            let statusLabel = item.status;
            if (item.inconformidade) statusLabel = '⚠️ Inconformidade (Atraso)';

            card.innerHTML = `
                <div class="item-img-box">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem; background: ${item.bgGradient || '#f0f0f0'}; border-radius: 4px; color: #fff;">
                        ${item.emoji || '📦'}
                    </div>
                </div>
                <div class="item-info">
                    <h3 class="item-title">${item.quantity} ${item.name}</h3>
                    <div class="item-meta">Localização: ${item.location}</div>
                    <div class="item-meta">${item.meta}</div>
                    <div class="card-action-row">
                        <div class="item-status ${statusClass}">${statusLabel}</div>
                        <div style="display: flex; gap: 5px;">${actionButtons}</div>
                    </div>
                </div>
            `;
            gridElement.appendChild(card);
        });

        // Add special dashed button to ALL columns to register new item
        const addCard = document.createElement('div');
        addCard.className = 'btn-add-product-card';
        addCard.onclick = () => openNewProductModal(currentLab);
        addCard.innerHTML = `
            <div class="add-circle-icon">+</div>
            <span>Adicionar Novo Produto</span>
        `;
        gridElement.appendChild(addCard);
    });
}

// DELETE INVENTORY ITEM
function deleteInventoryItem(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(`Deseja excluir permanentemente "${item.name}" do almoxarifado?`)) return;
    
    inventory = inventory.filter(i => i.id !== itemId);
    syncWithBackend('inventory', inventory);
    renderInventory();
    updateDashboardStats();
    showToast(`"${item.name}" excluído do almoxarifado.`, 'info');
}

// MODAL CONTROLS
function openNewProductModal(labId) {
    document.getElementById('add-product-lab-id').value = labId;
    document.getElementById('modal-add-product-title').textContent = `Cadastrar Novo Item no Lab ${labId}`;
    
    // Clear previous inputs
    document.getElementById('prod-nome').value = '';
    document.getElementById('prod-quantidade').value = '';
    document.getElementById('prod-localizacao').value = '';
    document.getElementById('prod-responsavel').value = '';
    document.getElementById('prod-categoria').value = 'ferramentas';
    document.getElementById('prod-status').value = 'Pertencente';

    document.getElementById('modal-add-product').classList.add('active');
}

let tempPlanoMaterials = [];

function openNewPlanoModal() {
    document.getElementById('plano-curso-input').value = '';
    document.getElementById('plano-tema-input').value = '';
    document.getElementById('plano-objetivos-input').value = '';
    
    // Auto generate plano code
    setupNextPlanoCode();

    // Reset temporary list
    tempPlanoMaterials = [];
    populatePlanoMaterialSelect();
    renderTempMaterials();

    document.getElementById('modal-add-plano').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// OPEN TRANSFER MODAL
function openTransferModal(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('trans-product-id').value = item.id;
    document.getElementById('trans-product-nome').value = `${item.quantity} ${item.name}`;
    document.getElementById('trans-quantidade').value = item.quantity;
    
    // Setup destination dropdown to exclude current lab
    const selectDest = document.getElementById('trans-destino');
    selectDest.innerHTML = '';
    
    registeredLabs.forEach(lab => {
        if (lab.id !== item.lab) {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = lab.name;
            selectDest.appendChild(opt);
        }
    });

    document.getElementById('modal-transfer-product').classList.add('active');
}

// HANDLE TRANSFER SUBMISSION
function handleTransferSubmit(e) {
    e.preventDefault();
    
    const itemId = parseInt(document.getElementById('trans-product-id').value);
    const professor = document.getElementById('trans-professor').value;
    const destLab = parseInt(document.getElementById('trans-destino').value);
    const quantityText = document.getElementById('trans-quantidade').value.trim();
    
    const itemIndex = inventory.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    
    const item = inventory[itemIndex];
    const sourceLab = item.lab;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Save origin if first transfer
    if (!item.originLab) item.originLab = item.lab;
    
    // Transfer logic: move item to destination lab
    item.lab = destLab;
    item.status = 'Não Pertencente'; // CORRECTED: transferred items are "Não Pertencente" in the new lab
    item.meta = `Horário: ${nowTime} | Transferido do Lab ${sourceLab} | Responsável: ${professor}`;
    
    // Save transfer info for notifications
    item.transferInfo = { professor, time: nowTime, fromLab: sourceLab, toLab: destLab };

    // Add activity log to dashboard
    addActivityLog(`${professor} transferiu ${quantityText} ${item.name} para o Lab ${destLab}`);
    
    // Add warning/info notification with tracking info
    addNotification('info', `Transferência de Material`, `Material ${quantityText} ${item.name} transferido do Almoxarifado Lab ${sourceLab} para o Lab ${destLab} pelo(a) Prof(a). ${professor} às ${nowTime}.`);
    
    // Close modal, re-render, update stats and show toast
    closeModal('modal-transfer-product');
    syncWithBackend('inventory', inventory);
    renderInventory();
    updateDashboardStats();
    showToast('Material transferido com sucesso!', 'success');
}

// HANDLE PRODUCT SUBMISSION
function handleAddProductSubmit(e) {
    e.preventDefault();
    const labId = parseInt(document.getElementById('add-product-lab-id').value);
    const name = document.getElementById('prod-nome').value.trim();
    const category = document.getElementById('prod-categoria').value;
    const quantity = document.getElementById('prod-quantidade').value.trim();
    const location = document.getElementById('prod-localizacao').value.trim();
    const responsavel = document.getElementById('prod-responsavel').value.trim();

    // ★ STATUS AUTOMÁTICO: Todo produto cadastrado em seu almoxarifado é automaticamente "Pertencente"
    const status = 'Pertencente';

    // Determine category emoji and gradients
    let emoji = '📦';
    let bgGradient = 'linear-gradient(135deg, #74ebd5, #9face6)';
    if (category === 'tecidos') {
        emoji = '👕';
        bgGradient = 'linear-gradient(135deg, #2575fc, #6a11cb)';
    } else if (category === 'moldes') {
        emoji = '📜';
        bgGradient = 'linear-gradient(135deg, #f39c12, #f1c40f)';
    }

    const newItem = {
        id: inventory.length + 1,
        lab: labId,
        originLab: labId, // ★ Almoxarifado de origem = local de cadastro
        category,
        name,
        quantity,
        location,
        meta: `Horário de entrada: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Responsável: ${responsavel}`,
        status,
        emoji,
        bgGradient
    };

    inventory.push(newItem);
    
    // Add new activity log to dashboard
    addActivityLog(`${responsavel} adicionou ${quantity} ${name} no Lab ${labId}`);
    
    // Trigger notification
    addNotification('info', `Novo item adicionado`, `${quantity} ${name} cadastrado no Almoxarifado Lab ${labId}.`);

    syncWithBackend('inventory', inventory);
    renderInventory();
    updateDashboardStats();
    closeModal('modal-add-product');
    showToast('Produto cadastrado com sucesso!', 'success');
}

// HANDLE BOLETIM SUBMISSION
function handleBoletimSubmit(e) {
    e.preventDefault();
    const codigo = document.getElementById('boletim-codigo').value || 'DOC-UNNAMED';
    const data = document.getElementById('boletim-data').value;
    const curso = document.getElementById('boletim-curso').value;
    const prof = document.getElementById('boletim-professor').value || 'Docente';
    const material = document.getElementById('boletim-material-nome').value;
    const escolaCode = document.getElementById('boletim-escola').value;
    
    // Handle tipo radio
    const tipoRadio = document.querySelector('input[name="boletim-tipo"]:checked');
    let tipo = tipoRadio ? tipoRadio.value : 'Outro';
    if (tipo === 'Outro') {
        const outroTexto = document.getElementById('boletim-tipo-outro-texto').value.trim();
        if (outroTexto) tipo = outroTexto;
    }
    
    const planoCodigo = document.getElementById('boletim-plano-codigo').value;
    const origem = document.getElementById('boletim-origem').value;
    const obsGerais = document.getElementById('boletim-obs-gerais').value.trim();
    
    const cat = document.getElementById('boletim-categoria-selecionada').value || 'outros';
    const detalhesCategoria = {};
    
    let finalDescricao = '';
    let finalSituacao = '';
    let finalQtdPrevista = '0';
    let finalQtdEncontrada = '0';
    let finalQtdDiferenca = '0';
    let finalAluno = 'Não identificado';
    let finalMedidas = 'Nenhuma registrada';
    let finalObservacoes = obsGerais || 'Nenhuma';

    if (cat === 'roubo') {
        detalhesCategoria.hora = document.getElementById('boletim-roubo-hora').value;
        detalhesCategoria.local = document.getElementById('boletim-roubo-local').value.trim();
        detalhesCategoria.violencia = document.getElementById('boletim-roubo-violencia').value;
        detalhesCategoria.boletimPolicial = document.getElementById('boletim-roubo-boletim-policial').value;
        detalhesCategoria.materiais = document.getElementById('boletim-roubo-materiais').value.trim();
        detalhesCategoria.suspeitos = document.getElementById('boletim-roubo-suspeitos').value.trim();
        
        finalDescricao = `🚨 Roubo de material ocorrido aproximadamente às ${detalhesCategoria.hora} no local: ${detalhesCategoria.local}.\nHouve arrombamento/violência: ${detalhesCategoria.violencia}.\nItens subtraídos: ${detalhesCategoria.materiais}`;
        finalSituacao = 'Roubo / Ameaça / Violência';
        finalAluno = detalhesCategoria.suspeitos || 'Não identificado';
        finalObservacoes = `Boletim Policial: ${detalhesCategoria.boletimPolicial}` + (obsGerais ? ' | ' + obsGerais : '');
    } else if (cat === 'furto') {
        detalhesCategoria.dataHora = document.getElementById('boletim-furto-data-hora').value.trim();
        detalhesCategoria.ultimoLocal = document.getElementById('boletim-furto-ultimo-local').value.trim();
        detalhesCategoria.arrombamento = document.getElementById('boletim-furto-arrombamento').value;
        detalhesCategoria.materiais = document.getElementById('boletim-furto-materiais').value.trim();
        
        finalDescricao = `🕵️ Furto de material. Período estimado: ${detalhesCategoria.dataHora}. Último local visto: ${detalhesCategoria.ultimoLocal}.\nIndícios de arrombamento/violação: ${detalhesCategoria.arrombamento}.\nItens desaparecidos: ${detalhesCategoria.materiais}`;
        finalSituacao = 'Furto (desaparecimento sem violência)';
        finalObservacoes = `Indícios de violação: ${detalhesCategoria.arrombamento}` + (obsGerais ? ' | ' + obsGerais : '');
    } else if (cat === 'avaria') {
        detalhesCategoria.tipoAvaria = document.getElementById('boletim-avaria-tipo').value;
        detalhesCategoria.gravidade = document.getElementById('boletim-avaria-gravidade').value;
        detalhesCategoria.utilizavel = document.getElementById('boletim-avaria-utilizavel').value;
        detalhesCategoria.causa = document.getElementById('boletim-avaria-causa').value.trim();
        detalhesCategoria.responsavel = document.getElementById('boletim-avaria-responsavel').value.trim();
        
        finalDescricao = `⚠️ Avaria constatada: ${detalhesCategoria.tipoAvaria}.\nGravidade: ${detalhesCategoria.gravidade}.\nO material ainda está utilizável? ${detalhesCategoria.utilizavel}.\nDescrição do dano/causa: ${detalhesCategoria.causa}`;
        finalSituacao = 'Material danificado';
        finalAluno = detalhesCategoria.responsavel || 'Não identificado';
        finalObservacoes = `Tipo: ${detalhesCategoria.tipoAvaria} | Gravidade: ${detalhesCategoria.gravidade}` + (obsGerais ? ' | ' + obsGerais : '');
    } else if (cat === 'extravio') {
        detalhesCategoria.dataExtravio = document.getElementById('boletim-extravio-data').value;
        detalhesCategoria.localProvavel = document.getElementById('boletim-extravio-local-provavel').value.trim();
        detalhesCategoria.buscas = document.getElementById('boletim-extravio-buscas').value.trim();
        detalhesCategoria.materiais = document.getElementById('boletim-extravio-materiais').value.trim();
        
        finalDescricao = `🔍 Extravio constatado em ${detalhesCategoria.dataExtravio}. Local provável da perda: ${detalhesCategoria.localProvavel}.\nBuscas realizadas: ${detalhesCategoria.buscas}.\nItens perdidos: ${detalhesCategoria.materiais}`;
        finalSituacao = 'Material extraviado / Perdido';
        finalObservacoes = `Buscas realizadas: ${detalhesCategoria.buscas}` + (obsGerais ? ' | ' + obsGerais : '');
    } else if (cat === 'naodevolvido') {
        detalhesCategoria.responsavel = document.getElementById('boletim-naodevolvido-aluno').value.trim();
        detalhesCategoria.prazo = document.getElementById('boletim-naodevolvido-prazo').value.trim();
        detalhesCategoria.justificativa = document.getElementById('boletim-naodevolvido-justificativa').value.trim();
        detalhesCategoria.materiais = document.getElementById('boletim-naodevolvido-materiais').value.trim();
        
        finalDescricao = `⏳ Produto não devolvido por ${detalhesCategoria.responsavel}.\nPrazo/Retirada: ${detalhesCategoria.prazo}.\nJustificativa: ${detalhesCategoria.justificativa}.\nItens pendentes: ${detalhesCategoria.materiais}`;
        finalSituacao = 'Não devolvido no prazo';
        finalAluno = detalhesCategoria.responsavel || 'Não identificado';
        finalObservacoes = `Justificativa: ${detalhesCategoria.justificativa}` + (obsGerais ? ' | ' + obsGerais : '');
    } else if (cat === 'divergencia') {
        detalhesCategoria.qtdPrevista = document.getElementById('boletim-divergencia-prevista').value;
        detalhesCategoria.qtdReal = document.getElementById('boletim-divergencia-real').value;
        detalhesCategoria.qtdDiferenca = document.getElementById('boletim-divergencia-diferenca').value;
        detalhesCategoria.responsavel = document.getElementById('boletim-divergencia-responsavel').value.trim();
        detalhesCategoria.dataContagem = document.getElementById('boletim-divergencia-data-contagem').value;
        
        finalDescricao = `📊 Divergência quantitativa de estoque identificada na contagem de ${detalhesCategoria.dataContagem} por ${detalhesCategoria.responsavel}.\nQuantidade esperada: ${detalhesCategoria.qtdPrevista} | Quantidade real: ${detalhesCategoria.qtdReal} | Diferença: ${detalhesCategoria.qtdDiferenca}`;
        finalSituacao = 'Divergência de estoque';
        finalQtdPrevista = detalhesCategoria.qtdPrevista || '0';
        finalQtdEncontrada = detalhesCategoria.qtdReal || '0';
        finalQtdDiferenca = detalhesCategoria.qtdDiferenca || '0';
        finalAluno = detalhesCategoria.responsavel || 'Não identificado';
        finalObservacoes = `Contagem em ${detalhesCategoria.dataContagem}` + (obsGerais ? ' | ' + obsGerais : '');
    } else {
        // Fallback or "outros"
        finalDescricao = document.getElementById('boletim-descricao').value;
        
        const situacoesChecked = [];
        document.querySelectorAll('input[name="boletim-situacao"]:checked').forEach(cb => {
            if (cb.value === 'Outro') {
                const outroTexto = document.getElementById('boletim-situacao-outro').value.trim();
                situacoesChecked.push(outroTexto || 'Outro');
            } else {
                situacoesChecked.push(cb.value);
            }
        });
        finalSituacao = situacoesChecked.join(', ') || 'Nenhuma especificada';
        
        finalQtdPrevista = document.getElementById('boletim-qtd-prevista').value || '0';
        finalQtdEncontrada = document.getElementById('boletim-qtd-encontrada').value || '0';
        finalQtdDiferenca = document.getElementById('boletim-qtd-diferenca').value || '0';
        finalAluno = document.getElementById('boletim-aluno').value || 'Não identificado';
        
        const obsResponsavel = document.getElementById('boletim-obs').value.trim();
        finalObservacoes = obsResponsavel ? (obsResponsavel + (obsGerais ? ' | ' + obsGerais : '')) : (obsGerais || 'Nenhuma');
        
        const medidasChecked = [];
        document.querySelectorAll('input[name="boletim-medidas"]:checked').forEach(cb => {
            if (cb.value === 'Outro') {
                const outroTexto = document.getElementById('boletim-medida-outro').value.trim();
                medidasChecked.push(outroTexto || 'Outro');
            } else {
                medidasChecked.push(cb.value);
            }
        });
        finalMedidas = medidasChecked.join(', ') || 'Nenhuma registrada';
    }

    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = 'geovana@senai.br';
    if (registeredUserStr) {
        const user = JSON.parse(registeredUserStr);
        currentUserEmail = user.email || 'geovana@senai.br';
    }

    const newBoletim = {
        id: registeredBoletins.length + 1,
        code: codigo,
        date: data,
        timeOfDay: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        curso: curso,
        professor: prof,
        material: material,
        tipo: tipo,
        planoCodigo: planoCodigo,
        origem: origem,
        descricao: finalDescricao,
        situacao: finalSituacao,
        qtdPrevista: finalQtdPrevista,
        qtdEncontrada: finalQtdEncontrada,
        qtdDiferenca: finalQtdDiferenca,
        aluno: finalAluno,
        observacoes: finalObservacoes,
        medidas: finalMedidas,
        status: 'Registrado',
        createdBy: currentUserEmail,
        categoria: cat,
        escolaCode: escolaCode,
        detalhesCategoria: detalhesCategoria
    };

    registeredBoletins.push(newBoletim);
    syncWithBackend('boletins', registeredBoletins);

    // Add activity log to dashboard
    addActivityLog(`Boletim de Ocorrência ${codigo} enviado por ${prof}`);
    
    // Trigger warning notification in system
    addNotification('warning', `Alerta de Ocorrência: ${material}`, `Boletim ${codigo} registrado para o material "${material}".`);

    // Mensagem de sucesso na tela
    showToast('Boletim de ocorrência registrado com sucesso!', 'success');
    
    // Render the updated list
    renderRegisteredBoletins();

    // Reset form fields
    document.getElementById('boletim-form').reset();
    document.getElementById('boletim-data').value = new Date().toISOString().split('T')[0];
    
    // Auto generate next code
    setupNextBoletimCode();
    
    updateDashboardStats();

    // Gerar PDF automaticamente e tentar enviar por e-mail
    const boletimId = newBoletim.id;
    setTimeout(() => {
        generateBoletimPDF(boletimId);
        sendBoletimByEmail(newBoletim);
    }, 500);

    // Trigger Estela Virtual Assistant chat messages
    setTimeout(() => {
        const chatWindow = document.getElementById('assistant-chat-window');
        if (chatWindow && !chatWindow.classList.contains('active')) {
            chatWindow.classList.add('active');
        }
        
        const schoolObj = registeredSchools.find(s => s.code === escolaCode);
        const schoolName = schoolObj ? schoolObj.name : 'escola selecionada';
        const coordinatorEmail = schoolObj ? schoolObj.coordinatorEmail : 'e-mail cadastrado';
        
        if (window.appendEstelaMessage) {
            window.appendEstelaMessage("Seu boletim foi registrado com sucesso. O documento foi encaminhado para análise da coordenação responsável. Você será notificado sobre futuras atualizações.", false);
            if (window.speakEstelaText) {
                window.speakEstelaText("Seu boletim foi registrado com sucesso. O documento foi encaminhado para análise da coordenação responsável.");
            }
            
            setTimeout(() => {
                const followUpMsg = `O boletim está sendo encaminhado automaticamente para o e-mail da coordenação cadastrada da instituição (${schoolName}) em <strong>${coordinatorEmail}</strong>.`;
                window.appendEstelaMessage(followUpMsg, false);
                if (window.speakEstelaText) {
                    window.speakEstelaText(`O boletim está sendo encaminhado automaticamente para o e-mail da coordenação cadastrada da instituição, ${schoolName}.`);
                }
            }, 3000);
        }
    }, 1200);
    
    // Redirect to personal reports tab
    setTimeout(() => {
        switchTab('ocorrencias');
        switchOcorrenciasTab('minhas');
    }, 5000);
}

// HANDLE LESSON PLAN SUBMISSION
function handleAddPlanoSubmit(e) {
    e.preventDefault();
    
    const code = document.getElementById('plano-codigo-input').value;
    const date = document.getElementById('plano-data-input').value;
    const course = document.getElementById('plano-curso-input').value.trim();
    const topic = document.getElementById('plano-tema-input').value.trim();
    const objectives = document.getElementById('plano-objetivos-input').value.trim();
    const duracao = parseFloat(document.getElementById('plano-duracao-input').value) || 2;
    const local = parseInt(document.getElementById('plano-local-input').value) || 1;
    const escola = document.getElementById('plano-escola-input').value;
    
    // Get current logged-in user as professor responsible
    const registeredUserStr = localStorage.getItem('registeredUser');
    const professor = registeredUserStr ? JSON.parse(registeredUserStr).name : 'Não informado';
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (tempPlanoMaterials.length === 0) {
        showToast('Adicione pelo menos um material à Ficha de Controle!', 'error');
        return;
    }

    const newPlano = {
        id: lessonPlans.length + 1,
        code,
        date,
        course,
        topic,
        objectives,
        duracao,
        local,
        escola,
        professor,
        createdAt: Date.now(),
        resources: [...tempPlanoMaterials] // clone array
    };

    // Auto-transfer materials to target lab and flag them
    tempPlanoMaterials.forEach(m => {
        const item = inventory.find(i => i.id === m.id);
        if (item) {
            if (!item.originLab) {
                item.originLab = item.lab;
            }
            const sourceLab = item.lab;
            item.lab = local;
            item.status = local !== sourceLab ? 'Não Pertencente' : item.status;
            item.meta = `Horário: ${nowTime} | Alocado na aula ${code} no Lab ${local} | Responsável: ${professor}`;
            // Save transfer info for later notification
            item.transferInfo = { professor, time: nowTime, fromLab: sourceLab, toLab: local };
        }
    });

    lessonPlans.push(newPlano);
    syncWithBackend('plans', lessonPlans);
    syncWithBackend('inventory', inventory);
    
    addActivityLog(`Novo plano cadastrado para a turma: ${course} por ${professor}`);
    renderLessonPlans();
    updateDashboardStats();
    closeModal('modal-add-plano');
    showToast('Plano de aula cadastrado e materiais transferidos!', 'success');
}

function renderLessonPlans() {
    const tableBody = document.getElementById('plano-aula-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    // Get current logged-in user profile to find their school/institution name or code
    const registeredUserStr = localStorage.getItem('registeredUser');
    let userSchoolName = '';
    let userSchoolCode = '';
    
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            // In profile, school is saved under 'instituicao'
            userSchoolName = (user.instituicao || '').trim().toLowerCase();
            
            // Try to find if user's school matches one of the registered schools
            const schoolMatch = registeredSchools.find(s => 
                s.name.trim().toLowerCase() === userSchoolName ||
                s.code.trim().toLowerCase() === userSchoolName
            );
            if (schoolMatch) {
                userSchoolCode = schoolMatch.code;
                userSchoolName = schoolMatch.name.trim().toLowerCase();
            }
        } catch (e) {}
    }

    lessonPlans.forEach(plano => {
        // Find School Details for the plan
        const schoolObj = registeredSchools.find(s => s.code === plano.escola);
        const planSchoolName = schoolObj ? schoolObj.name.trim().toLowerCase() : (plano.escola || '').trim().toLowerCase();
        const planSchoolCode = schoolObj ? schoolObj.code.trim().toLowerCase() : '';

        // If the user has a school set, only show plans that match their school code or school name
        if (userSchoolName) {
            const matchesCode = userSchoolCode && planSchoolCode === userSchoolCode.toLowerCase();
            const matchesName = planSchoolName.includes(userSchoolName) || userSchoolName.includes(planSchoolName);
            if (!matchesCode && !matchesName) {
                return; // Skip plans from other schools
            }
        }

        // Format Date
        let dateObj = new Date(plano.date);
        let formattedDate = plano.date;
        if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }

        // Format resources summary badges
        let resourcesHtml = '';
        if (Array.isArray(plano.resources)) {
            resourcesHtml = plano.resources.map(r => 
                `<span style="display:inline-block; background:#222; border: 1px solid var(--border-color); padding:3px 8px; border-radius:12px; font-size:0.75rem; margin:2px; color:#f5efe6;">
                    ${r.name} <strong style="color:var(--primary-beige);">(Lab ${r.lab})</strong>
                </span>`
            ).join('');
        }

        const planCode = plano.code || `PLAN-${500 + plano.id}`;
        const row = document.createElement('tr');
        
        // Find School Code
        const schoolName = schoolObj ? schoolObj.name : (plano.escola || 'SENAI Central');
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${plano.professor || 'Não informado'}</strong></td>
            <td>
                <span style="font-size:0.75rem; background:#1f1f1f; padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--primary-beige); margin-bottom:4px; display:inline-block;">${planCode}</span><br>
                <strong>${plano.course}</strong>
            </td>
            <td>${plano.topic}</td>
            <td><strong>${plano.duracao || 2}h</strong> no Lab ${plano.local || 1}</td>
            <td><strong>${schoolName}</strong></td>
            <td>${plano.objectives}</td>
            <td><div style="max-width:320px; display:flex; flex-wrap:wrap;">${resourcesHtml}</div></td>
            <td class="plano-actions">
                <button class="btn-table-action" onclick="openPlanoDetailsModal(${plano.id})" title="Ver Ficha de Controle" style="margin-right:8px;">👁️</button>
                <button class="btn-table-action delete" onclick="deleteLessonPlan(${plano.id})" title="Excluir">🗑️</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function deleteLessonPlan(id) {
    if (confirm('Tem certeza que deseja excluir este plano de aula?')) {
        lessonPlans = lessonPlans.filter(p => p.id !== id);
        syncWithBackend('plans', lessonPlans);
        renderLessonPlans();
        updateDashboardStats();
        showToast('Plano de aula removido.', 'success');
    }
}

// PLANO MATERIALS FORM HELPERS
function populatePlanoMaterialSelect() {
    const select = document.getElementById('plano-material-select');
    if (!select) return;
    select.innerHTML = '';
    
    // Sort items by lab then name
    const sorted = [...inventory].sort((a,b) => a.lab - b.lab || a.name.localeCompare(b.name));
    
    sorted.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.name} (Almoxarifado Lab ${item.lab})`;
        select.appendChild(opt);
    });
}

function addMaterialToPlanoForm() {
    const select = document.getElementById('plano-material-select');
    if (!select) return;
    
    const itemId = parseInt(select.value);
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    // Check if already in list
    if (tempPlanoMaterials.some(m => m.id === itemId)) {
        showToast('Este material já foi adicionado!', 'error');
        return;
    }

    tempPlanoMaterials.push({
        id: item.id,
        name: item.name,
        lab: item.lab,
        quantity: '1' // default
    });

    renderTempMaterials();
}

function removeTempMaterial(itemId) {
    tempPlanoMaterials = tempPlanoMaterials.filter(m => m.id !== itemId);
    renderTempMaterials();
}

function renderTempMaterials() {
    const tbody = document.getElementById('plano-form-recursos-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tempPlanoMaterials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:15px;">Nenhum material adicionado ainda.</td></tr>';
        return;
    }

    tempPlanoMaterials.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${m.name}</td>
            <td><strong>Lab ${m.lab}</strong></td>
            <td>
                <input type="text" value="${m.quantity}" 
                       onchange="updateTempQty(${m.id}, this.value)" 
                       style="width: 60px; text-align: center; border: 1px solid var(--border-color); background: var(--bg-dark); color:#fff; border-radius:4px; padding:2px;">
            </td>
            <td>
                <button type="button" class="btn-table-action delete" onclick="removeTempMaterial(${m.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTempQty(itemId, val) {
    const mat = tempPlanoMaterials.find(m => m.id === itemId);
    if (mat) {
        mat.quantity = val.trim();
    }
}

// VIEW PLAN DETAILS & CONTROL SHEET
function openPlanoDetailsModal(planoId) {
    const plano = lessonPlans.find(p => p.id === planoId);
    if (!plano) return;

    // Format Date
    let dateObj = new Date(plano.date);
    let formattedDate = plano.date;
    if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    document.getElementById('view-plano-curso').textContent = plano.course;
    document.getElementById('view-plano-tema').textContent = plano.topic;
    document.getElementById('view-plano-data').textContent = formattedDate;
    document.getElementById('view-plano-objetivos').textContent = plano.objectives;

    // Render materials table
    const tbody = document.getElementById('view-plano-recursos-body');
    tbody.innerHTML = '';

    if (!Array.isArray(plano.resources) || plano.resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:#888;">Nenhum recurso associado.</td></tr>';
    } else {
        plano.resources.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.name}</td>
                <td><strong style="color:var(--primary-beige);">Almoxarifado Lab ${r.lab}</strong></td>
                <td>${r.quantity}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('modal-view-plano-detalhes').classList.add('active');
}

// RENDER & FILTER NOTIFICATIONS
let notifFilter = 'all';

function filterNotifications(filter) {
    notifFilter = filter;
    document.querySelectorAll('.notif-filters .btn-filter').forEach(btn => btn.classList.remove('active'));
    
    // Find active element
    let targetIndex = 0;
    if (filter === 'unread') targetIndex = 1;
    if (filter === 'read') targetIndex = 2;
    document.querySelectorAll('.notif-filters .btn-filter')[targetIndex].classList.add('active');

    renderNotifications();
}

function renderNotifications() {
    const notifContainer = document.getElementById('notifications-list-container');
    notifContainer.innerHTML = '';

    let filtered = notifications;
    if (notifFilter === 'unread') filtered = notifications.filter(n => !n.read);
    if (notifFilter === 'read') filtered = notifications.filter(n => n.read);

    if (filtered.length === 0) {
        notifContainer.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">Nenhuma notificação encontrada.</div>';
        return;
    }

    filtered.forEach(n => {
        const item = document.createElement('div');
        item.className = `notif-item ${n.type} ${!n.read ? 'unread' : ''}`;
        
        let emoji = '🔔';
        if (n.type === 'warning') emoji = '⚠️';
        if (n.type === 'success') emoji = '✅';
        if (n.type === 'info') emoji = 'ℹ️';

        item.innerHTML = `
            <div class="notif-icon-box">${emoji}</div>
            <div class="notif-body">
                <div class="notif-title">${n.title}</div>
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${n.time}</div>
            </div>
            <div class="notif-actions">
                ${!n.read ? `<button class="btn-notif-action" onclick="markNotificationRead(${n.id})" title="Marcar como lida">👁️</button>` : ''}
                <button class="btn-notif-action" onclick="deleteNotification(${n.id})" title="Excluir">🗑️</button>
            </div>
        `;
        notifContainer.appendChild(item);
    });
}

function markNotificationRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        syncWithBackend('notifications', notifications);
        renderNotifications();
        updateDashboardStats();
    }
}

function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    syncWithBackend('notifications', notifications);
    renderNotifications();
    updateDashboardStats();
    showToast('Notificação excluída.', 'success');
}

function addNotification(type, title, message) {
    const newNotif = {
        id: notifications.length + 1,
        type,
        title,
        message,
        time: 'Agora',
        read: false
    };
    notifications.unshift(newNotif);
    syncWithBackend('notifications', notifications);
    renderNotifications();
    updateDashboardStats();
}

// DASHBOARD STATS CALCULATOR
function updateDashboardStats() {
    // Total items across all labs
    document.getElementById('stats-total-items').textContent = inventory.length;

    // Unread notification count
    const unreadCount = notifications.filter(n => !n.read).length;
    document.getElementById('stats-total-alerts').textContent = unreadCount;
    
    // Add visual badge counter next to Bell menu icon on sidebar
    const notifLink = document.getElementById('nav-notif-link');
    const existingBadge = notifLink.querySelector('.notif-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    if (unreadCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge';
        badge.style.cssText = 'background:#c0392b; color:#fff; border-radius:50%; font-size:0.75rem; padding:2px 6px; font-weight:700; margin-left:auto;';
        badge.textContent = unreadCount;
        notifLink.appendChild(badge);
    }

    // Total lesson plans count
    document.getElementById('stats-total-planos').textContent = lessonPlans.length;

    // Total reports count
    document.getElementById('stats-total-boletins').textContent = registeredBoletins.length;

    // Render Analytics Dashboard (Teachers registers and Platform usage)
    renderAnalyticsDashboard();
}

async function renderAnalyticsDashboard() {
    const tableBody = document.getElementById('dashboard-teachers-stats-body');
    if (!tableBody) return;

    let serverUsers = [];
    try {
        const res = await fetch('/api/users');
        if (res.ok) {
            serverUsers = await res.json();
        }
    } catch (e) {
        console.warn('Falha ao buscar usuários do servidor, usando fallback local:', e);
    }

    // 1. Gather all unique teachers from registered user database + plans + default teachers
    const teacherSet = new Set(['Prof(a). Carol', 'Prof. Carlos', 'Prof(a). Emanuela']);
    
    // Add all users registered on the server/DB
    serverUsers.forEach(u => {
        if (u.name) teacherSet.add(u.name);
    });

    // Add teachers who registered plans
    lessonPlans.forEach(p => {
        if (p.professor) teacherSet.add(p.professor);
    });

    // Add current local user if exists
    const currentUserStr = localStorage.getItem('registeredUser');
    if (currentUserStr) {
        try {
            const user = JSON.parse(currentUserStr);
            if (user.name) teacherSet.add(user.name);
        } catch(e){}
    }

    const teachersList = Array.from(teacherSet);
    
    // 2. Count plans per teacher
    const plansCount = {};
    teachersList.forEach(t => plansCount[t] = 0);
    lessonPlans.forEach(p => {
        if (p.professor && plansCount[p.professor] !== undefined) {
            plansCount[p.professor]++;
        } else if (p.professor) {
            plansCount[p.professor] = 1;
        }
    });

    // 3. Render table rows
    tableBody.innerHTML = '';
    let activeCount = 0;
    let inactiveCount = 0;

    teachersList.forEach(t => {
        const count = plansCount[t] || 0;
        const isActive = count > 0;
        if (isActive) activeCount++;
        else inactiveCount++;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 10px; font-weight: 500;">${t}</td>
            <td style="padding: 10px; text-align: center; font-weight: 700; color: var(--primary-beige);">${count}</td>
            <td style="padding: 10px; text-align: right;">
                <span style="font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; ${isActive ? 'color: var(--accent-green); background: rgba(46,204,113,0.1);' : 'color: var(--accent-red); background: rgba(192,57,43,0.1);'}">
                    ${isActive ? 'ATIVO' : 'INATIVO'}
                </span>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // 4. Update metrics counters
    const totalCount = teachersList.length;
    const usagePercentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    document.getElementById('active-teachers-count').textContent = activeCount;
    document.getElementById('inactive-teachers-count').textContent = inactiveCount;
    document.getElementById('total-teachers-count').textContent = totalCount;
    document.getElementById('platform-usage-pct').textContent = `${usagePercentage}%`;

    // Update conic gradient of radial progress
    const radial = document.getElementById('platform-usage-radial');
    if (radial) {
        radial.style.background = `radial-gradient(circle, var(--bg-card) 60%, transparent 61%), conic-gradient(var(--primary-beige) 0% ${usagePercentage}%, var(--border-color) ${usagePercentage}% 100%)`;
    }
}

// DASHBOARD LOG GENERATOR
function addActivityLog(text) {
    const list = document.getElementById('dashboard-activity-list');
    const logItem = document.createElement('li');
    logItem.className = 'activity-item';
    logItem.innerHTML = `
        <span class="activity-text">${text}</span>
        <span class="activity-time">Agora</span>
    `;
    list.insertBefore(logItem, list.firstChild);
    
    // Cap log list at 5 items
    if (list.children.length > 5) {
        list.removeChild(list.lastChild);
    }
}

// TOAST NOTIFICATIONS
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let emoji = '✅';
    if (type === 'error') emoji = '❌';
    if (type === 'info') emoji = 'ℹ️';

    toast.innerHTML = `
        <div style="font-size: 1.2rem;">${emoji}</div>
        <div class="toast-message">${message}</div>
    `;
    container.appendChild(toast);

    // Fade away animation and garbage collector
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

// --- USER SESSION AND PROFILE BEHAVIORS ---

// Generate default silhouette SVG string for avatar
function generateDefaultAvatarSVG() {
    return `
        <svg class="profile-img" viewBox="0 0 100 100" style="background:#2c3e50; display:block; width:100%; height:100%;">
            <circle cx="50" cy="35" r="20" fill="#ecf0f1"/>
            <path d="M20 80c0-20 15-30 30-30s30 10 30 30H20z" fill="#ecf0f1"/>
        </svg>
    `;
}

// Update avatar in all containers
function updateUserAvatar(user) {
    const sidebarAvatarContainer = document.getElementById('sidebar-profile-img-container');
    const headerAvatarContainer = document.getElementById('header-user-avatar-container');
    const profileAvatarContainer = document.getElementById('profile-preview-avatar-container');
    
    let avatarHtml = '';
    if (user.avatarType === 'uploaded' && user.avatarData) {
        avatarHtml = `<img src="${user.avatarData}" class="profile-img" alt="Avatar">`;
    } else {
        avatarHtml = generateDefaultAvatarSVG();
    }

    if (sidebarAvatarContainer) sidebarAvatarContainer.innerHTML = avatarHtml;
    if (headerAvatarContainer) {
        headerAvatarContainer.innerHTML = avatarHtml;
        const imgEl = headerAvatarContainer.querySelector('img, svg');
        if (imgEl) {
            imgEl.className = 'header-user-avatar';
        }
    }
    if (profileAvatarContainer) profileAvatarContainer.innerHTML = avatarHtml;
}

// Update text details, displays, forms and avatar
function updateUserUI(user) {
    const sideName = document.getElementById('sidebar-profile-name');
    const headName = document.getElementById('header-user-name');
    const sideRole = document.getElementById('sidebar-profile-role');
    
    const profileNameDisplay = document.getElementById('profile-user-name-display');
    const profileEmailDisplay = document.getElementById('profile-user-email-display');
    const profileBadgeDisplay = document.getElementById('profile-user-badge-display');

    // Display elements
    const displayPhone = document.getElementById('display-user-phone');
    const displayAddress = document.getElementById('display-user-address');
    const displayInstituicao = document.getElementById('display-user-instituicao');
    const displayRole = document.getElementById('display-user-role');
    const displayClass = document.getElementById('display-user-class');
    const displayEmailField = document.getElementById('display-user-email-field');
    const displaySenha = document.getElementById('display-user-senha');
    const displayNascimento = document.getElementById('display-user-nascimento');

    // Visual Mode elements
    const viewName = document.getElementById('view-profile-name');
    const viewEmail = document.getElementById('view-profile-email');
    const viewPhone = document.getElementById('view-profile-phone');
    const viewInstituicao = document.getElementById('view-profile-instituicao');
    const viewRole = document.getElementById('view-profile-role');
    const viewNascimento = document.getElementById('view-profile-nascimento');
    const viewAddress = document.getElementById('view-profile-address');
    const viewClass = document.getElementById('view-profile-class');

    // Form inputs
    const inputName = document.getElementById('profile-name');
    const inputPhone = document.getElementById('profile-phone');
    const inputEmail = document.getElementById('profile-email');
    const inputAddress = document.getElementById('profile-address');
    const inputInstituicao = document.getElementById('profile-instituicao');
    const inputRole = document.getElementById('profile-role');
    const inputClass = document.getElementById('profile-class');
    const inputNascimento = document.getElementById('profile-nascimento');
    const inputSenha = document.getElementById('profile-senha');
    const inputGeminiKey = document.getElementById('profile-gemini-key');

    // Set Text Contents
    if (sideName) sideName.textContent = user.name || 'Usuário';
    if (headName) headName.textContent = user.name ? user.name.split(' ')[0] : 'Usuário';
    if (sideRole) sideRole.textContent = user.role || 'Docente';
    
    if (profileNameDisplay) profileNameDisplay.textContent = user.name || 'Nome do Usuário';
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email || 'usuario@senai.br';
    if (profileBadgeDisplay) profileBadgeDisplay.textContent = user.role || 'Docente';

    if (displayPhone) displayPhone.textContent = user.phone || 'Não informado';
    if (displayAddress) displayAddress.textContent = user.address || 'Não informado';
    if (displayInstituicao) displayInstituicao.textContent = user.instituicao || 'Não informado';
    if (displayRole) displayRole.textContent = user.role || 'Não informado';
    if (displayClass) displayClass.textContent = user.responsibleClass || 'Nenhuma';
    if (displayEmailField) displayEmailField.textContent = user.email || 'Não informado';
    if (displaySenha) displaySenha.textContent = user.password || 'Não informado';

    let formattedNascimento = 'Não informado';
    if (user.nascimento) {
        let dateObj = new Date(user.nascimento);
        if (!isNaN(dateObj.getTime())) {
            formattedNascimento = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } else {
            formattedNascimento = user.nascimento;
        }
    }
    if (displayNascimento) displayNascimento.textContent = formattedNascimento;

    // Set Visual Mode elements
    if (viewName) viewName.textContent = user.name || '-';
    if (viewEmail) viewEmail.textContent = user.email || '-';
    if (viewPhone) viewPhone.textContent = user.phone || '-';
    if (viewInstituicao) viewInstituicao.textContent = user.instituicao || '-';
    if (viewRole) viewRole.textContent = user.role || '-';
    if (viewNascimento) viewNascimento.textContent = formattedNascimento;
    if (viewAddress) viewAddress.textContent = user.address || '-';
    if (viewClass) viewClass.textContent = user.responsibleClass || '-';

    // Set Form Values
    if (inputName) inputName.value = user.name || '';
    if (inputPhone) inputPhone.value = user.phone || '';
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputAddress) inputAddress.value = user.address || '';
    if (inputInstituicao) inputInstituicao.value = user.instituicao || '';
    if (inputRole) inputRole.value = user.role || '';
    if (inputClass) inputClass.value = user.responsibleClass || '';
    if (inputNascimento) inputNascimento.value = user.nascimento || '';
    if (inputSenha) inputSenha.value = user.password || '';
    if (inputGeminiKey) inputGeminiKey.value = localStorage.getItem('gemini_api_key') || '';

    const btnResetAvatar = document.getElementById('btn-reset-avatar');
    if (btnResetAvatar) {
        btnResetAvatar.style.display = user.avatarType === 'uploaded' ? 'block' : 'none';
    }

    updateUserAvatar(user);
}

// --- ESTELA VIRTUAL ASSISTANT LOGIC ---

function getEstelaResponse(query) {
    const q = query.toLowerCase();
    
    if (q.includes('olá') || q.includes('oi') || q.includes('estela') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite') || q.includes('hello')) {
        return "Olá, querido(a) colega! Com a linha e agulha prontas, estou aqui para alinhavar qualquer dúvida que você tenha sobre a plataforma <strong>SENAIVEST</strong>. Pode perguntar!";
    }
    
    if (q.includes('almoxarifado') || q.includes('estoque') || q.includes('material') || q.includes('categoria') || q.includes('lab') || q.includes('ferramenta') || q.includes('tecido') || q.includes('molde')) {
        return "Nossos materiais estão divididos em 3 almoxarifados (Lab 1, Lab 2 e Lab 3). Acesse a aba <strong>Almoxarifado</strong>, selecione o laboratório e veja o catálogo separado por Ferramentas, Tecidos e Moldes. Você também pode transferir itens entre laboratórios clicando em <em>Transferir</em>!";
    }
    
    if (q.includes('boletim') || q.includes('ocorrência') || q.includes('denúncia') || q.includes('avaria') || q.includes('quebro') || q.includes('perda') || q.includes('registro') || q.includes('pasta') || q.includes('registrado')) {
        return "Para relatar agulhas quebradas, tecidos faltantes ou avarias, use a aba <strong>Boletim</strong>. O código do documento (`DOC-2026-XXX`) é gerado automaticamente! Ao enviar, o relatório será arquivado na pasta de <strong>Boletins Registrados</strong>, que você pode consultar a qualquer momento.";
    }
    
    if (q.includes('plano') || q.includes('aula') || q.includes('turma') || q.includes('ficha') || q.includes('gerenciador')) {
        return "No menu <strong>Plano de Aula</strong>, você pode criar planejamentos e associar insumos do estoque. O sistema gera um código de plano automático (`PLAN-XXX`) e cria uma Ficha de Controle de Materiais. Assim, tudo estará devidamente separado antes de iniciar as aulas!";
    }
    
    if (q.includes('avatar') || q.includes('perfil') || q.includes('foto') || q.includes('personalizar') || q.includes('imagem') || q.includes('galeria') || q.includes('dados') || q.includes('telefone') || q.includes('cargo')) {
        return "Para carregar sua foto da galeria ou atualizar seus dados essenciais (nome, telefone, e-mail, endereço, cargo e turma de responsabilidade), vá no menu <strong>Perfil</strong>. Lá você também pode configurar sua API Key do Google Gemini para ativar minhas respostas com inteligência artificial!";
    }
    
    if (q.includes('reciclar') || q.includes('meio ambiente') || q.includes('sustentabilidade') || q.includes('retalho') || q.includes('limpeza') || q.includes('organização') || q.includes('5s') || q.includes('lixo') || q.includes('coleta')) {
        return "O laboratório sustentável é o nosso forte! Na aba <strong>Guia de Organização</strong>, além das regras 5S para agulhas e máquinas, temos regras de reciclagem de tecidos (separar fibras naturais de sintéticas), descarte correto de moldes de papel kraft, encaixe inteligente e economia de energia nas máquinas industriais.";
    }
    
    return "Hm, essa dúvida ficou um pouco desalinhada nas minhas agulhas! Mas fique tranquilo(a): para mexer no estoque use a aba <strong>Almoxarifado</strong>; para denunciar danos use a aba <strong>Boletim</strong>; e para atualizar seus dados ou configurar a IA use a aba <strong>Perfil</strong>. Se precisar, use um dos botões de sugestões rápidas!";
}

// Google Gemini API integration
async function getEstelaAIResponse(query) {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        const fallback = getEstelaResponse(query);
        return `<strong>[Estela Offline]</strong> ${fallback}<br><br><span style="font-size:0.8rem; color:var(--text-muted); display:block; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px; margin-top:8px;">💡 Dica: Habilite a inteligência do Google Gemini inserindo sua API Key na aba <strong>Perfil</strong>!</span>`;
    }

    try {
        const systemPrompt = `Você é a Estela, a assistente virtual e Especialista Têxtil da plataforma SENAIVEST (Sistema de Controle de Almoxarifado para laboratórios de moda e vestuário do SENAI).
Seu objetivo é ajudar os professores e administradores a usarem a plataforma e tirarem dúvidas gerais de forma simpática, prestativa e profissional. Fale em português.

Informações sobre a plataforma SENAIVEST:
1. Menu/Abas:
   - Início: Tela principal com banners de inspiração, atalhos rápidos e categorias.
   - Aba Geral: Estatísticas do sistema (total de itens, boletins enviados, planos de aula, notificações) e gráficos de empréstimos semanais.
   - Almoxarifado: Controle de estoque de 3 laboratórios (Lab 1, Lab 2, Lab 3). Cada um contém Ferramentas (tesouras, agulhas, réguas), Tecidos (jeans, malha, viscose) e Moldes. Permite transferir itens de um laboratório para outro.
   - Boletim: Formulário completo para relatar avarias, perdas, materiais quebrados (gera código DOC-2026-XXX).
   - Boletins Registrados: Pasta com todos os relatórios de ocorrências enviados.
   - Perfil: Exibe os dados da professora (nome, e-mail, telefone, endereço, cargo, turma responsável) e permite carregar uma foto. Também permite configurar a API Key do Google Gemini para alimentar esta assistente.
   - Guia de Organização: Regras do 5S e diretrizes ecológicas/sustentabilidade (descarte de resíduos têxteis, retalhos, etc.).
   - Plano de Aula: Cadastro de aulas e fichas de controle de insumos.

Responda de forma clara, amigável e objetiva. Use formatação HTML básica se necessário (como <strong> para negrito, listagens, etc.) para que fique fácil de ler no balão de chat.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${systemPrompt}\n\nPergunta do Usuário: ${query}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP Error status: ${response.status}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
            let replyText = data.candidates[0].content.parts[0].text;
            // Clean markdown syntax to raw HTML if needed
            replyText = replyText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            replyText = replyText.replace(/\*(.*?)\*/g, '<em>$1</em>');
            replyText = replyText.replace(/`([^`]+)`/g, '<code>$1</code>');
            replyText = replyText.replace(/\n/g, '<br>');
            return replyText;
        } else {
            throw new Error("Invalid response schema from Gemini API");
        }
    } catch (err) {
        console.error("Gemini API call failed:", err);
        const fallback = getEstelaResponse(query);
        return `<strong>[Estela Offline - Erro de Conexão com Google AI]</strong> ${fallback}`;
    }
}

function initEstelaChatbot() {
    const toggleBtn = document.getElementById('assistant-toggle-btn');
    const chatWindow = document.getElementById('assistant-chat-window');
    const closeBtn = document.getElementById('assistant-chat-close');
    const chatForm = document.getElementById('assistant-chat-form');
    const chatInput = document.getElementById('assistant-chat-input');
    const chatMessages = document.getElementById('assistant-chat-messages');
    const suggestionsContainer = document.getElementById('assistant-suggestions');
    const micBtn = document.getElementById('assistant-mic-btn');
    const audioToggleBtn = document.getElementById('assistant-audio-toggle');

    if (!toggleBtn || !chatWindow) return;

    // Audio status state
    let isAudioActive = localStorage.getItem('estela_audio_active') === 'true';

    // Initialize audio button UI state
    if (audioToggleBtn) {
        if (isAudioActive) {
            audioToggleBtn.classList.add('active');
            audioToggleBtn.textContent = '🔊';
        } else {
            audioToggleBtn.classList.remove('active');
            audioToggleBtn.textContent = '🔇';
        }

        audioToggleBtn.addEventListener('click', () => {
            isAudioActive = !isAudioActive;
            localStorage.setItem('estela_audio_active', isAudioActive);
            if (isAudioActive) {
                audioToggleBtn.classList.add('active');
                audioToggleBtn.textContent = '🔊';
                showToast('Leitura por voz ativada!', 'success');
            } else {
                audioToggleBtn.classList.remove('active');
                audioToggleBtn.textContent = '🔇';
                window.speechSynthesis.cancel();
                showToast('Leitura por voz desativada.', 'info');
            }
        });
    }

    function speakText(text) {
        if (!isAudioActive) return;
        window.speechSynthesis.cancel(); // stop previous speech

        // Strip HTML tags for speaking
        const cleanText = text.replace(/<[^>]*>/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';

        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.includes('pt-BR') || v.lang.includes('pt_BR'));
        if (ptVoice) {
            utterance.voice = ptVoice;
        }

        window.speechSynthesis.speak(utterance);
    }

    // Voice Dictation (Speech to Text)
    let recognition = null;
    let isRecording = false;

    if (micBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'pt-BR';
            recognition.interimResults = false;

            recognition.onstart = () => {
                isRecording = true;
                micBtn.classList.add('recording');
                micBtn.textContent = '🛑';
                showToast('Estela ouvindo... Pode falar!', 'info');
            };

            recognition.onend = () => {
                isRecording = false;
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎙️';
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                isRecording = false;
                micBtn.classList.remove('recording');
                micBtn.textContent = '🎙️';
                showToast(`Erro na gravação: ${event.error}`, 'error');
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (chatInput) {
                    chatInput.value = transcript;
                    chatInput.focus();
                }
            };

            micBtn.addEventListener('click', () => {
                if (isRecording) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            });
        } else {
            micBtn.style.display = 'none'; // hide if not supported
        }
    }

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            chatWindow.classList.remove('active');
        });
    }

    function appendMessage(text, isUser = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        msgDiv.innerHTML = `
            <div class="msg-bubble">
                ${text}
            </div>
        `;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing-indicator';
        typingDiv.id = 'chat-typing-indicator';
        typingDiv.innerHTML = `
            <div class="msg-bubble" style="display:flex; align-items:center; gap:5px; padding: 10px 15px;">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;

            appendMessage(text, true);
            chatInput.value = '';

            showTypingIndicator();
            const reply = await getEstelaAIResponse(text);
            removeTypingIndicator();

            appendMessage(reply, false);
            speakText(reply);
        });
    }

    if (suggestionsContainer) {
        suggestionsContainer.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-suggestion');
            if (btn) {
                const question = btn.getAttribute('data-question');
                appendMessage(question, true);

                showTypingIndicator();
                const reply = await getEstelaAIResponse(question);
                removeTypingIndicator();

                appendMessage(reply, false);
                speakText(reply);
            }
        });
    }

    // Expose helpers globally for system-wide notifications
    window.appendEstelaMessage = appendMessage;
    window.speakEstelaText = speakText;
}

// --- BOLETINS DE OCORRÊNCIA REGISTRADOS & CODE AUTO-GENERATORS ---

let initialBoletins = [
    {
        id: 1,
        code: 'DOC-2026-001',
        date: '2026-06-10',
        categoria: 'avaria',
        curso: 'Costura Industrial A',
        professor: 'Prof. Carlos',
        material: 'Réguas de 60cm',
        tipo: 'Ferramenta',
        planoCodigo: 'PLAN-501',
        origem: 'Lab 1',
        descricao: 'Durante o traçado do molde base, duas réguas foram encontradas com trincas severas na escala centimétrica, inviabilizando medições precisas.',
        situacao: 'Material danificado',
        qtdPrevista: '30',
        qtdEncontrada: '28',
        qtdDiferenca: '2',
        aluno: 'Grupo de modelagem da noite',
        observacoes: 'Material substituído temporariamente por réguas sobressalentes do Lab 2.',
        medidas: 'Orientação aos alunos, Registro em controle',
        status: 'Registrado',
        createdBy: 'geovana@senai.br'
    }
];

let registeredBoletins = JSON.parse(localStorage.getItem('registeredBoletins')) || initialBoletins;
if (!localStorage.getItem('registeredBoletins')) {
    localStorage.setItem('registeredBoletins', JSON.stringify(initialBoletins));
}

// Generate next DOC-2026-XXX code
function setupNextBoletimCode() {
    const inputCode = document.getElementById('boletim-codigo');
    if (inputCode) {
        const nextNum = registeredBoletins.length + 1;
        inputCode.value = `DOC-2026-${String(nextNum).padStart(3, '0')}`;
    }
}

// Generate next PLAN-XXX code
function setupNextPlanoCode() {
    const inputCode = document.getElementById('plano-codigo-input');
    if (inputCode) {
        const nextNum = 500 + lessonPlans.length + 1;
        inputCode.value = `PLAN-${nextNum}`;
    }
}

// Render the grid of registered reports
function renderRegisteredBoletins() {
    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = '';
    if (registeredUserStr) {
        const user = JSON.parse(registeredUserStr);
        currentUserEmail = user.email || '';
    }

    // Render "Minhas Denúncias"
    const minhasContainer = document.getElementById('minhas-denuncias-grid-container');
    if (minhasContainer) {
        minhasContainer.innerHTML = '';
        const minhasDenuncias = registeredBoletins.filter(b => b.createdBy === currentUserEmail);
        if (minhasDenuncias.length === 0) {
            minhasContainer.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding:40px; color:var(--text-muted);">Nenhuma denúncia registrada por você.</div>`;
        } else {
            const sorted = [...minhasDenuncias].reverse();
            sorted.forEach(b => {
                minhasContainer.appendChild(createBoletimCard(b));
            });
        }
    }

    // Render "Denúncias Gerais"
    const geraisContainer = document.getElementById('denuncias-gerais-grid-container');
    if (geraisContainer) {
        geraisContainer.innerHTML = '';
        if (registeredBoletins.length === 0) {
            geraisContainer.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding:40px; color:var(--text-muted);">Nenhum boletim registrado encontrado.</div>`;
        } else {
            const sorted = [...registeredBoletins].reverse();
            sorted.forEach(b => {
                geraisContainer.appendChild(createBoletimCard(b));
            });
        }
    }
}

function createBoletimCard(b) {
    const card = document.createElement('div');
    card.className = 'boletim-card-file';
    
    // Categorias visual mapping
    const catMap = {
        'roubo':        { label: 'Roubo', color: 'var(--accent-red)', icon: '🚨', bg: 'rgba(192, 57, 43, 0.15)' },
        'furto':        { label: 'Furto', color: 'var(--accent-orange)', icon: '🕵️', bg: 'rgba(230, 126, 34, 0.15)' },
        'avaria':       { label: 'Avaria', color: '#f1c40f', icon: '⚠️', bg: 'rgba(241, 196, 15, 0.15)' },
        'extravio':     { label: 'Extravio', color: 'var(--accent-blue-light)', icon: '🔍', bg: 'rgba(58, 142, 230, 0.15)' },
        'naodevolvido': { label: 'Não Devolvido', color: '#9b59b6', icon: '⏳', bg: 'rgba(155, 89, 182, 0.15)' },
        'divergencia':  { label: 'Divergência', color: '#1abc9c', icon: '📊', bg: 'rgba(26, 188, 156, 0.15)' },
        'outros':       { label: 'Outros', color: 'var(--primary-beige)', icon: '📝', bg: 'rgba(211, 188, 162, 0.15)' }
    };
    
    const catInfo = catMap[b.categoria] || catMap['outros'];
    const timeText = b.timeOfDay ? ` às ${b.timeOfDay}` : '';

    // Set border top color dynamically
    card.style.borderTop = `5px solid ${catInfo.color}`;

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
            <h3 class="boletim-card-title" style="margin-bottom: 0;">${b.code}</h3>
            <span style="font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; color: ${catInfo.color}; background: ${catInfo.bg}; display: flex; align-items: center; gap: 4px;">
                <span>${catInfo.icon}</span> <span>${catInfo.label}</span>
            </span>
        </div>
        <div class="boletim-card-meta">Data/Hora: <strong>${b.date}${timeText}</strong></div>
        <div class="boletim-card-meta">Professor: <strong>${b.professor}</strong></div>
        <div class="boletim-card-meta">Curso/Turma: <strong>${b.curso}</strong></div>
        <div class="boletim-card-meta">Material: <strong>${b.material} (Qtd: ${b.qtdDiferenca})</strong></div>
        <div class="boletim-card-status">
            <span class="status-tag">${b.status}</span>
            <button class="btn-view-boletim" onclick="openBoletimDetailsModal(${b.id})">Visualizar</button>
        </div>
    `;
    return card;
}

// ★ Variável global para armazenar o ID do boletim em visualização (usada pelo botão PDF)
let currentViewBoletimId = null;

// Open registered reports details modal
function openBoletimDetailsModal(id) {
    const b = registeredBoletins.find(item => item.id === id);
    if (!b) return;

    currentViewBoletimId = id; // ★ Salvar ID para uso no botão PDF

    document.getElementById('view-boletim-doc-code').textContent = `BOLETIM DE OCORRÊNCIA – COD: ${b.code}`;
    document.getElementById('view-boletim-data').textContent = b.date + (b.timeOfDay ? ` às ${b.timeOfDay}` : '');
    document.getElementById('view-boletim-origem').textContent = b.origem;
    document.getElementById('view-boletim-curso').textContent = b.curso;
    document.getElementById('view-boletim-professor').textContent = b.professor;
    document.getElementById('view-boletim-material').textContent = b.material;
    document.getElementById('view-boletim-tipo').textContent = b.tipo;
    document.getElementById('view-boletim-plano-cód').textContent = b.planoCodigo;
    document.getElementById('view-boletim-descricao').textContent = b.descricao;
    document.getElementById('view-boletim-situacao').textContent = b.situacao;
    document.getElementById('view-boletim-prevista').textContent = b.qtdPrevista;
    document.getElementById('view-boletim-encontrada').textContent = b.qtdEncontrada;
    document.getElementById('view-boletim-diferenca').textContent = b.qtdDiferenca;
    document.getElementById('view-boletim-aluno').textContent = b.aluno;
    document.getElementById('view-boletim-observacoes').textContent = b.observacoes;
    document.getElementById('view-boletim-medidas').textContent = b.medidas;

    document.getElementById('modal-view-boletim').classList.add('active');
}

// ==========================================
// CUSTOMIZED FUNCTIONS FOR NEW FEATURES
// ==========================================

function returnItemToOrigin(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const originLab = item.originLab || item.lab;
    
    item.lab = originLab;
    item.inconformidade = false;
    item.status = 'Pertencente'; // Restored to origin: Pertencente again
    item.transferInfo = null;    // Clear transfer info
    item.meta = `Horário: ${nowTime} | Devolvido ao laboratório de origem (Lab ${originLab})`;
    
    syncWithBackend('inventory', inventory);
    renderInventory();
    updateDashboardStats();
    showToast(`Item devolvido ao laboratório de origem com sucesso!`, 'success');
}

function renderSchools() {
    const container = document.getElementById('escolas-lista-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (registeredSchools.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma escola cadastrada ainda.</div>`;
        return;
    }
    
    registeredSchools.forEach(school => {
        const div = document.createElement('div');
        div.className = 'school-card-item';
        div.innerHTML = `
            <div class="school-card-info">
                <span class="school-card-name">${school.name}</span>
                <span class="school-card-meta">Sigla: ${school.code} | Cidade: ${school.city}</span>
                ${school.coordinatorEmail ? `<span class="school-card-meta" style="color: var(--accent-green);">📧 ${school.coordinatorEmail}</span>` : '<span class="school-card-meta" style="color: var(--accent-red);">⚠️ Sem e-mail da coordenação</span>'}
            </div>
            <button class="btn-delete-school" onclick="deleteSchool(${school.id})" title="Excluir Escola">🗑️</button>
        `;
        container.appendChild(div);
    });
}

function handleSchoolRegistrationSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('school-name').value.trim();
    const code = document.getElementById('school-code').value.trim().toUpperCase();
    const city = document.getElementById('school-city').value.trim();
    const coordinatorEmail = document.getElementById('school-coordinator-email').value.trim();
    const senha = document.getElementById('school-senha').value;
    
    if (!coordinatorEmail || !senha) {
        showToast('O e-mail e a senha da coordenação são obrigatórios!', 'error');
        return;
    }
    
    if (registeredSchools.some(s => s.code === code)) {
        showToast('Já existe uma escola cadastrada com este código!', 'error');
        return;
    }
    
    const newUser = {
        name: name + ' (Coordenação)',
        email: coordinatorEmail,
        password: senha,
        phone: '',
        nascimento: '',
        role: 'Coordenação Escolar',
        instituicao: name,
        address: city,
        responsibleClass: '',
        avatarType: 'default',
        avatarData: ''
    };

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
    })
    .then(async response => {
        const data = await response.json();
        if (response.ok) {
            const newSchool = {
                id: registeredSchools.length > 0 ? Math.max(...registeredSchools.map(s => s.id)) + 1 : 1,
                name,
                code,
                city,
                coordinatorEmail
            };
            
            registeredSchools.push(newSchool);
            syncWithBackend('schools', registeredSchools);
            renderSchools();
            populatePlanoEscolaDropdown();
            
            document.getElementById('school-registration-form').reset();
            showToast('Escola e conta de coordenação cadastradas com sucesso!', 'success');
        } else {
            // Se houver conflito de email (status 409), exibe o erro
            showToast(data.error || 'Erro ao cadastrar a escola.', 'error');
        }
    })
    .catch(err => {
        console.warn('Backend error', err);
        showToast('Servidor offline. Não foi possível verificar e registrar a escola.', 'error');
    });
}

function deleteSchool(id) {
    if (confirm('Deseja realmente excluir esta escola?')) {
        registeredSchools = registeredSchools.filter(s => s.id !== id);
        syncWithBackend('schools', registeredSchools);
        renderSchools();
        populatePlanoEscolaDropdown();
        showToast('Escola removida.', 'success');
    }
}

function renderLabButtons() {
    const container = document.getElementById('almox-buttons-group-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Get selected school filter
    const filterSelect = document.getElementById('almox-filter-escola');
    const selectedSchoolId = filterSelect ? filterSelect.value : '';
    
    // Update filter select options from registered schools
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Todas as Escolas</option>';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.id || school.name;
            opt.textContent = school.name;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = currentVal; // restore selection
    }
    
    // Also populate almox-escola-vinculo in the add almox modal
    const vinculoSelect = document.getElementById('almox-escola-vinculo');
    if (vinculoSelect) {
        const vinculoVal = vinculoSelect.value;
        vinculoSelect.innerHTML = '<option value="">Nenhuma escola específica</option>';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.id || school.name;
            opt.textContent = school.name;
            vinculoSelect.appendChild(opt);
        });
        vinculoSelect.value = vinculoVal;
    }
    
    // Filter labs by school if one is selected
    const labsToShow = selectedSchoolId
        ? registeredLabs.filter(l => l.schoolId === selectedSchoolId || l.schoolId === ''  || !l.schoolId)
        : registeredLabs;
    
    // If filtering and no results, show message
    if (selectedSchoolId && labsToShow.filter(l => l.schoolId === selectedSchoolId).length === 0) {
        const noResultMsg = document.createElement('div');
        noResultMsg.style.cssText = 'color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px; grid-column: 1/-1;';
        noResultMsg.textContent = 'Nenhum almoxarifado vinculado a esta escola. Cadastre um novo abaixo.';
        container.appendChild(noResultMsg);
    }
    
    const filteredLabs = selectedSchoolId 
        ? registeredLabs.filter(l => String(l.schoolId) === String(selectedSchoolId))
        : registeredLabs;
    
    filteredLabs.forEach(lab => {
        const btn = document.createElement('button');
        btn.className = 'almox-button';
        btn.onclick = () => openLab(lab.id);
        const schoolLabel = lab.schoolId 
            ? (registeredSchools.find(s => String(s.id || s.name) === String(lab.schoolId))?.name || '')
            : '';
        btn.innerHTML = `ALMOXARIFADO ${lab.name.toUpperCase()}${schoolLabel ? `<br><span style="font-size:0.7rem; opacity:0.75; font-weight:400;">🏫 ${schoolLabel}</span>` : ''}`;
        container.appendChild(btn);
    });
    
    // Add the "+ CADASTRAR ALMOXARIFADO" button
    const plusBtn = document.createElement('button');
    plusBtn.className = 'almox-button';
    plusBtn.onclick = openAddAlmoxarifadoModal;
    plusBtn.style.cssText = 'background-color: rgba(211, 188, 162, 0.05); border: 2.5px dashed var(--primary-beige); color: var(--primary-beige); text-shadow: none;';
    plusBtn.textContent = '+ CADASTRAR ALMOXARIFADO';
    container.appendChild(plusBtn);
}

function openAddAlmoxarifadoModal() {
    document.getElementById('almox-name').value = '';
    document.getElementById('almox-responsavel').value = '';
    document.getElementById('almox-sigla').value = '';
    
    // Populate school select
    const vinculoSelect = document.getElementById('almox-escola-vinculo');
    if (vinculoSelect) {
        vinculoSelect.innerHTML = '<option value="">Nenhuma escola específica</option>';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.id || school.name;
            opt.textContent = school.name;
            vinculoSelect.appendChild(opt);
        });
    }
    
    document.getElementById('modal-add-almoxarifado').classList.add('active');
}

function handleAddAlmoxarifadoSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('almox-name').value.trim();
    const responsavel = document.getElementById('almox-responsavel').value.trim();
    const sigla = document.getElementById('almox-sigla').value.trim().toUpperCase();
    const schoolId = document.getElementById('almox-escola-vinculo')?.value || '';
    
    const newId = registeredLabs.length > 0 ? Math.max(...registeredLabs.map(l => l.id)) + 1 : 1;
    
    const newLab = {
        id: newId,
        name,
        responsavel,
        sigla,
        schoolId
    };
    
    registeredLabs.push(newLab);
    syncWithBackend('labs', registeredLabs);
    renderLabButtons();
    populatePlanoLocalDropdown();
    
    closeModal('modal-add-almoxarifado');
    showToast('Almoxarifado cadastrado com sucesso!', 'success');
}

function populatePlanoLocalDropdown() {
    const select = document.getElementById('plano-local-input');
    if (!select) return;
    select.innerHTML = '';
    
    registeredLabs.forEach(lab => {
        const opt = document.createElement('option');
        opt.value = lab.id;
        opt.textContent = lab.name;
        select.appendChild(opt);
    });
}

function populatePlanoEscolaDropdown() {
    const select = document.getElementById('plano-escola-input');
    if (!select) return;
    select.innerHTML = '';
    
    if (registeredSchools.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhuma escola cadastrada';
        select.appendChild(opt);
        return;
    }
    
    registeredSchools.forEach(school => {
        const opt = document.createElement('option');
        opt.value = school.code;
        opt.textContent = school.name;
        select.appendChild(opt);
    });
}

let currentViewerCategory = '';
function openNetworkCategoryViewer(category) {
    currentViewerCategory = category;
    const modal = document.getElementById('modal-network-viewer');
    const title = document.getElementById('modal-network-viewer-title');
    
    const catTitles = {
        'ferramentas': 'Ferramentas na Rede',
        'tecidos': 'Tecidos na Rede',
        'moldes': 'Moldes na Rede',
        'linhas': 'Linhas na Rede'
    };
    
    title.textContent = catTitles[category] || 'Produtos na Rede';
    renderNetworkCategoryItems();
    
    // Bind search
    const searchInput = document.getElementById('network-viewer-search');
    searchInput.value = '';
    searchInput.oninput = renderNetworkCategoryItems;
    
    // Bind quick add product button
    const quickAddBtn = document.getElementById('btn-network-viewer-add-prod');
    quickAddBtn.onclick = () => {
        closeModal('modal-network-viewer');
        openNewProductModal(currentLab || 1);
        // Preset category dropdown
        const catSelect = document.getElementById('prod-categoria');
        if (category === 'linhas') {
            catSelect.value = 'ferramentas';
        } else {
            catSelect.value = category;
        }
    };
    
    modal.classList.add('active');
}

function renderNetworkCategoryItems() {
    const tbody = document.getElementById('network-viewer-table-body');
    const searchVal = document.getElementById('network-viewer-search').value.toLowerCase();
    tbody.innerHTML = '';
    
    let filtered = inventory.filter(item => {
        if (currentViewerCategory === 'linhas') {
            return (item.category === 'linhas' || item.name.toLowerCase().includes('linha'));
        }
        return item.category === currentViewerCategory;
    });
    
    if (searchVal) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchVal) ||
            item.location.toLowerCase().includes(searchVal)
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum produto encontrado.</td></tr>`;
        return;
    }
    
    filtered.forEach(item => {
        const tr = document.createElement('tr');
        const labObj = registeredLabs.find(l => l.id === item.lab);
        const labName = labObj ? labObj.name : `Lab ${item.lab}`;
        
        let statusClass = 'status-pertencente';
        if (item.status === 'Não Pertencente') statusClass = 'status-naopertencente';
        if (item.status === 'Não apresenta no estoque' || item.inconformidade) statusClass = 'status-falta';
        
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.quantity}</td>
            <td>${labName}</td>
            <td>${item.location}</td>
            <td><span class="item-status ${statusClass}">${item.inconformidade ? 'Inconformidade' : item.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function switchOcorrenciasTab(tab) {
    const btnMinhas = document.getElementById('btn-subtab-minhas');
    const btnGerais = document.getElementById('btn-subtab-gerais');
    const contentMinhas = document.getElementById('subtab-content-minhas');
    const contentGerais = document.getElementById('subtab-content-gerais');
    
    if (tab === 'minhas') {
        btnMinhas.classList.add('active');
        btnMinhas.style.color = 'var(--primary-beige)';
        btnMinhas.style.borderBottom = '2px solid var(--primary-beige)';
        
        btnGerais.classList.remove('active');
        btnGerais.style.color = 'var(--text-muted)';
        btnGerais.style.borderBottom = 'none';
        
        contentMinhas.style.display = 'block';
        contentGerais.style.display = 'none';
    } else {
        btnGerais.classList.add('active');
        btnGerais.style.color = 'var(--primary-beige)';
        btnGerais.style.borderBottom = '2px solid var(--primary-beige)';
        
        btnMinhas.classList.remove('active');
        btnMinhas.style.color = 'var(--text-muted)';
        btnMinhas.style.borderBottom = 'none';
        
        contentGerais.style.display = 'block';
        contentMinhas.style.display = 'none';
    }
}

function renderOrgPosts() {
    const container = document.getElementById('feed-posts-container');
    if (!container) return;
    container.innerHTML = '';
    
    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = '';
    if (registeredUserStr) {
        const user = JSON.parse(registeredUserStr);
        currentUserEmail = user.email || '';
    }
    
    const sortedPosts = [...orgPosts].reverse();
    
    sortedPosts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'perfil-card feed-post-card';
        card.style.cssText = 'padding: 25px; margin-bottom: 5px;';
        
        const liked = post.likedBy && post.likedBy.includes(currentUserEmail);
        
        card.innerHTML = `
            <div class="feed-post-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="feed-post-avatar" style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: #34495e;">
                        <svg viewBox="0 0 100 100" style="background:#2c3e50; width:100%; height:100%;">
                            <circle cx="50" cy="35" r="20" fill="#ecf0f1"/>
                            <path d="M20 80c0-20 15-30 30-30s30 10 30 30H20z" fill="#ecf0f1"/>
                        </svg>
                    </div>
                    <div>
                        <strong style="color: var(--text-light); font-size: 0.95rem;">${post.author}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${post.date}</div>
                    </div>
                </div>
                <h4 style="color: var(--primary-beige); font-family: var(--font-heading); margin: 0; font-size: 1rem;">${post.title}</h4>
            </div>
            
            <p style="color: var(--text-light); font-size: 0.9rem; line-height: 1.6; margin-bottom: 15px;">${post.content}</p>
            
            ${post.image ? `<img src="${post.image}" style="width: 100%; max-height: 350px; object-fit: cover; border-radius: 6px; margin-bottom: 15px; border: 1px solid var(--border-color);">` : ''}
            
            <div class="feed-post-actions" style="display: flex; gap: 20px; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); padding: 10px 0; margin-bottom: 15px;">
                <button onclick="likeOrgPost(${post.id})" style="background: none; border: none; color: ${liked ? 'var(--primary-beige)' : 'var(--text-muted)'}; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 0.85rem; outline:none;">
                    👍 ${post.likes || 0} Curtidas
                </button>
                <button onclick="toggleCommentBox(${post.id})" style="background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: 600; font-size: 0.85rem; outline:none;">
                    💬 ${(post.comments ? post.comments.length : 0)} Comentários
                </button>
            </div>
            
            <div class="feed-comments-section" id="comments-box-${post.id}" style="display: none;">
                <div class="feed-comments-list" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; padding-right: 5px;">
                    ${post.comments && post.comments.length > 0 ? post.comments.map(c => `
                        <div style="background: var(--bg-dark); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 3px;">
                                <strong style="color: var(--primary-beige);">${c.author}</strong>
                            </div>
                            <p style="color: var(--text-light); font-size: 0.82rem; margin: 0; line-height: 1.4;">${c.text}</p>
                        </div>
                    `).join('') : '<div style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:10px;">Nenhum comentário. Seja o primeiro!</div>'}
                </div>
                
                <form onsubmit="event.preventDefault(); submitComment(${post.id});" style="display: flex; gap: 10px; margin-top:10px;">
                    <input type="text" id="comment-input-${post.id}" class="form-control-reg" style="margin-bottom: 0; padding: 8px 12px; font-size: 0.85rem;" placeholder="Escreva um comentário..." required>
                    <button type="submit" class="btn-save-avatar" style="margin-top: 0; padding: 8px 15px; font-size: 0.85rem; white-space: nowrap;">Comentar</button>
                </form>
            </div>
        `;
        container.appendChild(card);
    });
}

let tempPostImgData = '';
function handleOrgPostSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    
    const registeredUserStr = localStorage.getItem('registeredUser');
    let authorName = 'Professora';
    if (registeredUserStr) {
        authorName = JSON.parse(registeredUserStr).name || 'Professora';
    }
    
    const newPost = {
        id: orgPosts.length > 0 ? Math.max(...orgPosts.map(p => p.id)) + 1 : 1,
        title,
        content,
        image: tempPostImgData || '',
        author: authorName,
        date: new Date().toLocaleDateString('pt-BR'),
        likes: 0,
        likedBy: [],
        comments: []
    };
    
    orgPosts.push(newPost);
    syncWithBackend('posts', orgPosts);
    renderOrgPosts();
    
    document.getElementById('org-post-form').reset();
    tempPostImgData = '';
    const imgPreview = document.getElementById('post-img-preview-name');
    if (imgPreview) {
        imgPreview.style.display = 'none';
        imgPreview.textContent = '';
    }
    showToast('Post publicado no mural!', 'success');
}

function likeOrgPost(postId) {
    const post = orgPosts.find(p => p.id === postId);
    if (!post) return;
    
    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = '';
    if (registeredUserStr) {
        currentUserEmail = JSON.parse(registeredUserStr).email || '';
    }
    
    if (!post.likedBy) {
        post.likedBy = [];
    }
    
    const index = post.likedBy.indexOf(currentUserEmail);
    if (index === -1) {
        post.likedBy.push(currentUserEmail);
        post.likes = (post.likes || 0) + 1;
    } else {
        post.likedBy.splice(index, 1);
        post.likes = Math.max(0, (post.likes || 0) - 1);
    }
    
    syncWithBackend('posts', orgPosts);
    renderOrgPosts();
}

function toggleCommentBox(postId) {
    const box = document.getElementById(`comments-box-${postId}`);
    if (box) {
        if (box.style.display === 'none') {
            box.style.display = 'block';
        } else {
            box.style.display = 'none';
        }
    }
}

function submitComment(postId) {
    const post = orgPosts.find(p => p.id === postId);
    if (!post) return;
    
    const input = document.getElementById(`comment-input-${postId}`);
    const commentText = input.value.trim();
    if (!commentText) return;
    
    const registeredUserStr = localStorage.getItem('registeredUser');
    let authorName = 'Professora';
    if (registeredUserStr) {
        authorName = JSON.parse(registeredUserStr).name || 'Professora';
    }
    
    if (!post.comments) {
        post.comments = [];
    }
    
    post.comments.push({
        author: authorName,
        text: commentText
    });
    
    syncWithBackend('posts', orgPosts);
    renderOrgPosts();
    
    input.value = '';
    showToast('Comentário enviado!', 'success');
}

function checkLessonPlanExpirations() {
    let changed = false;
    const now = Date.now();
    
    lessonPlans.forEach(plan => {
        // Convert real plan duration (hours) to actual milliseconds (1 hour = 3600000 ms)
        const durationMs = (plan.duracao || 2) * 60 * 60 * 1000;
        const planStart = plan.createdAt || Date.now();
        const planEnd = planStart + durationMs;
        
        if (now >= planEnd && !plan.expired) {
            plan.expired = true;
            changed = true;
            
            const planCode = plan.code || `PLAN-${500 + plan.id}`;
            const professor = plan.professor || 'Não informado';
            
            // Collect resource names and quantities to return
            const materialsList = plan.resources.map(res => `• ${res.name} (Qtd: ${res.quantity || 'Retirada'})`).join('\n');
            const materialsSpeech = plan.resources.map(res => `${res.name}`).join(', ');
            
            // Build Estela assistant messages
            const alertMsg = `🚨 <strong>Prazo Excedido — ${planCode}</strong><br>` +
                             `O plano de aula registrado pelo(a) <strong>${professor}</strong> encerrou.<br>` +
                             `Os seguintes materiais devem ser devolvidos imediatamente ao almoxarifado:<br>` +
                             materialsList.replace(/\n/g, '<br>');
            
            if (window.appendEstelaMessage) {
                window.appendEstelaMessage(alertMsg, false);
            }
            if (window.speakEstelaText) {
                window.speakEstelaText(`Atenção: O prazo do plano de aula ${planCode} foi excedido. O material deve ser devolvido imediatamente pelo professor ${professor}. Pendente: ${materialsSpeech}.`);
            }
            
            plan.resources.forEach(res => {
                const item = inventory.find(i => i.id === res.id);
                if (item) {
                    // ★ CLASSIFICAÇÃO AUTOMÁTICA DE PERTENCIMENTO
                    const originLab = item.originLab || item.lab;
                    const transferTime = item.transferInfo?.time || new Date(planStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const transferDate = new Date(planStart).toLocaleDateString('pt-BR');
                    const originLabObj = registeredLabs.find(l => l.id === originLab);
                    const originLabName = originLabObj ? originLabObj.name : `Lab ${originLab}`;
                    const currentLabObj = registeredLabs.find(l => l.id === item.lab);
                    const currentLabName = currentLabObj ? currentLabObj.name : `Lab ${item.lab}`;
                    
                    // Calcular tempo excedido
                    const tempoExcedidoMs = now - planEnd;
                    const tempoExcedidoMin = Math.floor(tempoExcedidoMs / 60000);
                    let tempoExcedidoStr = '';
                    if (tempoExcedidoMin < 60) {
                        tempoExcedidoStr = `${tempoExcedidoMin} minuto(s)`;
                    } else {
                        const horas = Math.floor(tempoExcedidoMin / 60);
                        const mins = tempoExcedidoMin % 60;
                        tempoExcedidoStr = `${horas}h${mins > 0 ? mins + 'min' : ''}`;
                    }
                    
                    if (item.lab !== originLab) {
                        // ★ CASO 1: Produto em almoxarifado diferente do de origem → "Não Pertencente" + inconformidade
                        item.inconformidade = true;
                        item.status = 'Não Pertencente';
                        
                        addNotification(
                            'warning', 
                            `⚠️ Produto não devolvido — ${planCode}`, 
                            `O produto "${item.name}" (Cód: ${item.id}) não retornou ao seu local de origem (${originLabName}) dentro do prazo previsto.\n` +
                            `• Responsável pela retirada: ${professor}\n` +
                            `• Código do plano de aula: ${planCode}\n` +
                            `• Almoxarifado de origem: ${originLabName}\n` +
                            `• Almoxarifado atual: ${currentLabName}\n` +
                            `• Data da movimentação: ${transferDate}\n` +
                            `• Horário da movimentação: ${transferTime}\n` +
                            `• Tempo excedido: ${tempoExcedidoStr}\n` +
                            `• Situação: Não Pertencente (produto localizado em almoxarifado diferente do de origem)`
                        );
                        
                        showToast(`⚠️ Atraso na devolução: ${item.name} (${tempoExcedidoStr} excedido)`, 'error');
                    } else {
                        // ★ CASO 2: Produto deveria estar aqui mas verificação indica que não está em nenhum local registrado
                        // (Este cenário ocorre se o item foi removido do inventário ou não encontrado)
                        const itemExists = inventory.some(i => i.id === res.id);
                        if (!itemExists) {
                            addNotification(
                                'warning',
                                `🔴 Produto não apresentado em estoque — ${planCode}`,
                                `O produto "${res.name}" (Cód: ${res.id}) não foi localizado em nenhum almoxarifado registrado após o encerramento da atividade.\n` +
                                `• Responsável pela retirada: ${professor}\n` +
                                `• Código do plano de aula: ${planCode}\n` +
                                `• Data da movimentação: ${transferDate}\n` +
                                `• Horário da movimentação: ${transferTime}\n` +
                                `• Tempo excedido: ${tempoExcedidoStr}\n` +
                                `• Situação: Não Apresentado em Estoque`
                            );
                            
                            showToast(`🔴 Produto não localizado: ${res.name}`, 'error');
                        }
                    }
                }
            });
        }
    });
    
    if (changed) {
        syncWithBackend('plans', lessonPlans);
        syncWithBackend('inventory', inventory);
        if (currentLab) renderInventory();
        updateDashboardStats();
    }
}

// Bind post-file-input change listener
document.addEventListener('DOMContentLoaded', () => {
    const postFileInput = document.getElementById('post-file-input');
    if (postFileInput) {
        postFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    tempPostImgData = event.target.result;
                    const previewDiv = document.getElementById('post-img-preview-name');
                    if (previewDiv) {
                        previewDiv.textContent = `Imagem: ${file.name}`;
                        previewDiv.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ======================================================
// ★ BOLETIM CATEGORY SELECTION FUNCTIONS
// ======================================================

const CATEGORY_MAP = {
    'roubo':        { icon: '🚨', label: 'Roubo' },
    'furto':        { icon: '🕵️', label: 'Furto' },
    'avaria':       { icon: '⚠️', label: 'Avaria' },
    'extravio':     { icon: '🔍', label: 'Extravio' },
    'naodevolvido': { icon: '⏳', label: 'Produto não devolvido' },
    'divergencia':  { icon: '📊', label: 'Divergência de estoque' },
    'outros':       { icon: '📝', label: 'Outros' }
};

function populateBoletimEscolaDropdown() {
    const select = document.getElementById('boletim-escola');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Selecione a escola...</option>';
    registeredSchools.forEach(school => {
        const opt = document.createElement('option');
        opt.value = school.code;
        opt.textContent = school.name;
        select.appendChild(opt);
    });
}

function selectBoletimCategoria(cardEl) {
    const cat = cardEl.getAttribute('data-cat');
    const catInfo = CATEGORY_MAP[cat] || { icon: '📝', label: 'Outros' };
    
    // Save selected category
    document.getElementById('boletim-categoria-selecionada').value = cat;
    
    // Update badge in form header
    document.getElementById('boletim-badge-icon').textContent = catInfo.icon;
    document.getElementById('boletim-badge-label').textContent = catInfo.label;
    
    // Populate school select dropdown
    populateBoletimEscolaDropdown();
    
    // Hide all specific category blocks
    document.querySelectorAll('.category-fields-block').forEach(block => {
        block.style.display = 'none';
    });
    
    // Hide generic fields block
    document.getElementById('boletim-campos-genericos').style.display = 'none';
    
    // Show specific category block
    const specificBlock = document.getElementById('boletim-campos-' + cat);
    if (specificBlock) {
        specificBlock.style.display = 'block';
    }
    
    // If "outros", show the generic fields container
    if (cat === 'outros') {
        document.getElementById('boletim-campos-genericos').style.display = 'block';
    }
    
    // Hide category selector, show form
    document.getElementById('boletim-categoria-selector').style.display = 'none';
    document.getElementById('boletim-form').style.display = 'block';
    
    // Scroll to top of form
    document.getElementById('boletim-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function voltarCategoriaBoletim() {
    // Show category selector, hide form
    document.getElementById('boletim-categoria-selector').style.display = '';
    document.getElementById('boletim-form').style.display = 'none';
    document.getElementById('boletim-categoria-selecionada').value = '';
    
    // Hide all dynamic blocks
    document.querySelectorAll('.category-fields-block').forEach(block => {
        block.style.display = 'none';
    });
    document.getElementById('boletim-campos-genericos').style.display = 'none';
}

// ======================================================
// ★ PDF GENERATION (jsPDF) — Boletim de Ocorrência
// ======================================================

function generateBoletimPDF(boletimId) {
    const b = registeredBoletins.find(item => item.id === boletimId);
    if (!b) {
        showToast('Boletim não encontrado para gerar PDF.', 'error');
        return null;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let y = 20;
        
        // ─── HEADER ───
        doc.setFillColor(44, 62, 80);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(211, 188, 162);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('SENAIVEST', margin, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('Sistema de Controle de Almoxarifado - Laboratórios de Vestuário SENAI', margin, 23);
        
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, margin, 30);
        
        y = 45;
        
        // ─── DOCUMENT TITLE ───
        doc.setTextColor(44, 62, 80);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`BOLETIM DE OCORRÊNCIA — ${b.code}`, margin, y);
        y += 8;
        
        // ─── CATEGORY BADGE ───
        const catInfo = CATEGORY_MAP[b.categoria] || { icon: '📝', label: b.categoria || 'Outros' };
        doc.setFillColor(211, 188, 162);
        doc.roundedRect(margin, y, 65, 8, 2, 2, 'F');
        doc.setTextColor(44, 62, 80);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Categoria: ${catInfo.label}`, margin + 3, y + 5.5);
        y += 15;
        
        // ─── SEPARATOR ───
        doc.setDrawColor(211, 188, 162);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
        
        // ─── HELPER: Add a labeled row ───
        function addRow(label, value, bold = false) {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(label, margin, y);
            
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(10);
            
            const lines = doc.splitTextToSize(String(value || 'N/A'), contentWidth - 55);
            doc.text(lines, margin + 55, y);
            y += Math.max(7, lines.length * 5);
        }
        
        // ─── DATA FIELDS ───
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('DADOS DA OCORRÊNCIA', margin, y);
        y += 8;
        
        addRow('Código:', b.code, true);
        addRow('Data:', b.date + (b.timeOfDay ? ` às ${b.timeOfDay}` : ''));
        addRow('Curso/Turma:', b.curso);
        addRow('Professor:', b.professor);
        
        const schoolObj = registeredSchools.find(s => s.code === b.escolaCode);
        const schoolName = schoolObj ? schoolObj.name : 'N/A';
        addRow('Escola/Unidade:', schoolName);
        y += 3;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('IDENTIFICAÇÃO DO MATERIAL', margin, y);
        y += 8;
        
        addRow('Material:', b.material, true);
        addRow('Tipo:', b.tipo);
        addRow('Cód. Plano:', b.planoCodigo || 'N/A');
        addRow('Lab. Origem:', b.origem);
        y += 3;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('DESCRIÇÃO', margin, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(44, 62, 80);
        const descLines = doc.splitTextToSize(b.descricao || 'Sem descrição', contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 4.5 + 5;
        
        // ─── CATEGORY-SPECIFIC DETAILS (IF ANY) ───
        if (b.detalhesCategoria && Object.keys(b.detalhesCategoria).length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(211, 188, 162);
            doc.text('PERGUNTAS ESPECÍFICAS DA CATEGORIA', margin, y);
            y += 8;
            
            const det = b.detalhesCategoria;
            if (b.categoria === 'roubo') {
                addRow('Horário Roubo:', det.hora);
                addRow('Local Ocorrência:', det.local);
                addRow('Violência/Arrombamento:', det.violencia);
                addRow('Boletim Policial:', det.boletimPolicial);
                addRow('Materiais Subtraídos:', det.materiais);
                addRow('Suspeitos:', det.suspeitos);
            } else if (b.categoria === 'furto') {
                addRow('Período aproximado:', det.dataHora);
                addRow('Último local visto:', det.ultimoLocal);
                addRow('Sinais violação:', det.arrombamento);
                addRow('Materiais Furtados:', det.materiais);
            } else if (b.categoria === 'avaria') {
                addRow('Tipo de avaria:', det.tipoAvaria);
                addRow('Gravidade:', det.gravidade);
                addRow('Utilizável?', det.utilizavel);
                addRow('Causa provável:', det.causa);
                addRow('Responsável:', det.responsavel);
            } else if (b.categoria === 'extravio') {
                addRow('Data extravio:', det.dataExtravio);
                addRow('Local provável:', det.localProvavel);
                addRow('Buscas efetuadas:', det.buscas);
                addRow('Materiais perdidos:', det.materiais);
            } else if (b.categoria === 'naodevolvido') {
                addRow('Responsável:', det.responsavel);
                addRow('Prazo:', det.prazo);
                addRow('Justificativa:', det.justificativa);
                addRow('Materiais pendentes:', det.materiais);
            } else if (b.categoria === 'divergencia') {
                addRow('Qtd Prevista:', det.qtdPrevista);
                addRow('Qtd Real física:', det.qtdReal);
                addRow('Diferença:', det.qtdDiferenca, true);
                addRow('Responsável contagem:', det.responsavel);
                addRow('Data contagem:', det.dataContagem);
            }
            y += 5;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('QUANTIDADES & DETALHES', margin, y);
        y += 8;
        
        addRow('Qtd. Prevista:', b.qtdPrevista);
        addRow('Qtd. Encontrada:', b.qtdEncontrada);
        addRow('Diferença:', b.qtdDiferenca, true);
        y += 3;
        
        addRow('Situação:', b.situacao);
        addRow('Aluno/Grupo:', b.aluno);
        addRow('Observações:', b.observacoes);
        addRow('Medidas:', b.medidas);
        y += 5;
        
        // ─── RESPONSABLE INFO ───
        const registeredUserStr = localStorage.getItem('registeredUser');
        if (registeredUserStr) {
            const user = JSON.parse(registeredUserStr);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(211, 188, 162);
            doc.text('RESPONSÁVEL PELO REGISTRO', margin, y);
            y += 8;
            addRow('Nome:', user.name || 'N/A');
            addRow('E-mail:', user.email || 'N/A');
            addRow('Telefone:', user.phone || 'N/A');
        }
        
        // ─── VERIFICATION SEAL ───
        const footerY = doc.internal.pageSize.getHeight() - 15;
        const sealX = pageWidth - 40;
        const sealY = footerY - 25;
        
        doc.setDrawColor(211, 188, 162); // Gold color
        doc.setFillColor(255, 255, 255);
        doc.setLineWidth(1);
        doc.circle(sealX, sealY, 15, 'FD'); // Outer circle
        
        doc.setDrawColor(44, 62, 80); // Dark Blue
        doc.setLineWidth(0.5);
        doc.circle(sealX, sealY, 13, 'S'); // Inner circle
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(44, 62, 80);
        doc.text('SELO DE', sealX, sealY - 2, { align: 'center' });
        doc.text('VERIFICAÇÃO', sealX, sealY + 2, { align: 'center' });
        
        const hashStr = "DOC-" + String(b.id).padStart(4, '0') + "-" + new Date().getFullYear();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100);
        doc.text('AUTÊNTICO', sealX, sealY + 6, { align: 'center' });
        doc.text(hashStr, sealX, sealY + 10, { align: 'center' });
        
        // ─── FOOTER ───
        doc.setDrawColor(211, 188, 162);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('© 2026 SENAIVEST — Sistema de Controle de Almoxarifado - Laboratórios de Vestuário SENAI', margin, footerY);
        doc.text('Documento gerado automaticamente pelo sistema. Válido sem assinatura.', margin, footerY + 4);
        
        // ─── SAVE/DOWNLOAD ───
        doc.save(`${b.code}_Boletim_Ocorrencia.pdf`);
        showToast(`📄 PDF do boletim ${b.code} gerado com sucesso!`, 'success');
        
        // Return base64 for email sending
        return doc.output('datauristring');
    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        showToast('Erro ao gerar PDF. Verifique se a biblioteca jsPDF foi carregada.', 'error');
        return null;
    }
}

// ======================================================
// ★ EMAIL SENDING — Boletim para coordenação da escola
// ======================================================

async function sendBoletimByEmail(boletim) {
    // Find the school associated with the boletim
    let targetSchool = null;
    
    // Prioritize selected school from dropdown
    if (boletim.escolaCode) {
        targetSchool = registeredSchools.find(s => s.code === boletim.escolaCode);
    }
    
    // Fallback 1: Try to find by plano code
    if (!targetSchool && boletim.planoCodigo) {
        const plan = lessonPlans.find(p => p.code === boletim.planoCodigo);
        if (plan && plan.escola) {
            targetSchool = registeredSchools.find(s => s.code === plan.escola);
        }
    }
    
    // Fallback 2: use first school with coordinator email
    if (!targetSchool) {
        targetSchool = registeredSchools.find(s => s.coordinatorEmail);
    }
    
    if (!targetSchool || !targetSchool.coordinatorEmail) {
        console.warn('Nenhuma escola com e-mail de coordenação encontrada para envio do boletim.');
        addNotification('info', 'Envio de e-mail pendente', 
            `O boletim ${boletim.code} foi registrado, mas não foi possível enviar por e-mail pois nenhuma escola possui e-mail de coordenação cadastrado.`);
        return;
    }
    
    try {
        const response = await fetch('/api/send-boletim-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                boletim,
                schoolEmail: targetSchool.coordinatorEmail,
                schoolName: targetSchool.name
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            addNotification('success', `📧 Boletim enviado por e-mail`, 
                `O boletim ${boletim.code} foi encaminhado com sucesso para ${targetSchool.coordinatorEmail} (${targetSchool.name}).`);
            showToast(`📧 Boletim enviado para ${targetSchool.coordinatorEmail}`, 'success');
        } else {
            console.warn('Erro ao enviar e-mail:', data);
            addNotification('info', 'Envio de e-mail (modo offline)', 
                `O boletim ${boletim.code} foi registrado localmente. O envio para ${targetSchool.coordinatorEmail} será feito quando o servidor SMTP estiver configurado.`);
        }
    } catch (err) {
        console.warn('Servidor offline para envio de e-mail:', err);
        addNotification('info', 'Envio de e-mail (modo offline)', 
            `O boletim ${boletim.code} foi registrado. O envio por e-mail para a coordenação será realizado quando o servidor estiver disponível.`);
    }
}

// ======================================================
// MULTI-USER SYNC: Polling a cada 15 segundos
// Garante que todos os usuários vejam as últimas modificações
// ======================================================
setInterval(async () => {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) return;
        const data = await response.json();
        
        let needsRender = false;
        
        if (data.inventory !== null) {
            const newHash = JSON.stringify(data.inventory);
            const oldHash = JSON.stringify(inventory);
            if (newHash !== oldHash) {
                inventory = data.inventory;
                localStorage.setItem('inventory', JSON.stringify(inventory));
                needsRender = true;
            }
        }
        if (data.plans !== null) {
            const newHash = JSON.stringify(data.plans);
            const oldHash = JSON.stringify(lessonPlans);
            if (newHash !== oldHash) {
                lessonPlans = data.plans;
                localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans));
                renderLessonPlans();
            }
        }
        if (data.notifications !== null) {
            const newHash = JSON.stringify(data.notifications);
            const oldHash = JSON.stringify(notifications);
            if (newHash !== oldHash) {
                notifications = data.notifications;
                localStorage.setItem('notifications', JSON.stringify(notifications));
                renderNotifications();
            }
        }
        if (data.labs !== null) {
            const newHash = JSON.stringify(data.labs);
            const oldHash = JSON.stringify(registeredLabs);
            if (newHash !== oldHash) {
                registeredLabs = data.labs;
                localStorage.setItem('labs', JSON.stringify(registeredLabs));
                renderLabButtons();
            }
        }
        if (data.schools !== null) {
            const newHash = JSON.stringify(data.schools);
            const oldHash = JSON.stringify(registeredSchools);
            if (newHash !== oldHash) {
                registeredSchools = data.schools;
                localStorage.setItem('schools', JSON.stringify(registeredSchools));
                renderSchools();
                renderLabButtons(); // update school filter
            }
        }
        if (needsRender && currentLab) {
            renderInventory();
            updateDashboardStats();
        }
    } catch (e) {
        // offline, ignore
    }
}, 15000);
