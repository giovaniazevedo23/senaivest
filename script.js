// ==========================================
// CONFIGURAÇÃO E INTEGRAÇÃO FIREBASE CLOUD
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDubhivaLY_fvSudXS7PDeQ7fTG8AC7Af4",
  authDomain: "senaivest.firebaseapp.com",
  projectId: "senaivest",
  storageBucket: "senaivest.firebasestorage.app",
  messagingSenderId: "911402447273",
  appId: "1:911402447273:web:a7a8edebab5bf1e9e254b8",
  measurementId: "G-FZ5LY0G403"
};

let auth = null;
let db = null;
let firebaseStatus = 'offline';
let currentUser = { id: '', nome: '', role: '', email: '', escola: '', foto: '' };

// Atualiza o indicador visual de conexão na interface
function updateFirebaseStatusBadge(status, message) {
    firebaseStatus = status;
    const badge = document.getElementById('firebase-status-badge');
    const loginBadge = document.getElementById('firebase-login-badge');
    
    const configMap = {
        connected: { text: message || 'Firebase Conectado', class: 'connected', dot: '#10b981' },
        syncing: { text: message || 'Sincronizando...', class: 'syncing', dot: '#f59e0b' },
        offline: { text: message || 'Modo Offline / Local', class: 'offline', dot: '#94a3b8' },
        error: { text: message || 'Firebase: Regras Bloqueadas', class: 'error', dot: '#ef4444' }
    };
    
    const current = configMap[status] || configMap.offline;
    
    [badge, loginBadge].forEach(el => {
        if (!el) return;
        el.className = 'firebase-badge ' + current.class;
        el.innerHTML = `<span class="status-dot"></span> <span class="status-text">${current.text}</span>`;
        if (status === 'error') {
            el.title = 'Aviso: Permissão negada no Firestore. É necessário liberar leitura/escrita nas Regras do Firebase Console.';
        } else if (status === 'connected') {
            el.title = 'Conectado ao Cloud Firestore com sucesso!';
        }
    });
}

// Inicialização segura do Firebase
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();

            // Configurar persistência offline se suportada
            try {
                db.enablePersistence({ synchronizeTabs: true }).catch(err => {
                    console.info('Persistência offline do Firestore:', err.code);
                });
            } catch(e) {}

            console.log("🔥 Firebase inicializado com sucesso!");
            updateFirebaseStatusBadge('syncing', 'Conectando ao Firestore...');
            startUsuariosSync();

            // Ouvinte de autenticação
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log("Firebase Auth ativo:", user.email || user.uid);
                }
            });
        } else {
            console.warn("SDK do Firebase não detectado.");
            updateFirebaseStatusBadge('offline', 'Modo Offline (SDK ausente)');
        }
    } catch (error) {
        console.warn("Firebase operando em modo local:", error);
        updateFirebaseStatusBadge('offline', 'Modo Local');
    }
}

// Contas padrão de demonstração para caso o banco de dados esteja limpo
const DEFAULT_SYSTEM_USERS = {
    '45678': {
        id: '45678',
        nome: 'Coordenação Pedagógica',
        role: 'Coordenação',
        email: 'coordenacao@senai.br',
        matricula: '45678',
        senha: 'admin',
        escola: 'SENAI Centro de Formação Cândido Atahyde',
        criadoEm: new Date().toISOString()
    },
    'PROF-101': {
        id: 'PROF-101',
        nome: 'Prof. Roberto Silva',
        role: 'Professor',
        email: 'roberto.silva@senai.br',
        matricula: '101',
        senha: '101',
        escola: 'SENAI Centro de Formação Cândido Atahyde',
        criadoEm: new Date().toISOString()
    },
    'PROF-102': {
        id: 'PROF-102',
        nome: 'Profª. Clara Mendes',
        role: 'Professor',
        email: 'clara.mendes@senai.br',
        matricula: '102',
        senha: '102',
        escola: 'SENAI Centro de Formação Cândido Atahyde',
        criadoEm: new Date().toISOString()
    },
    'ALU-001': {
        id: 'ALU-001',
        nome: 'João Silva',
        role: 'Aluno',
        email: 'aluno@senai.br',
        matricula: 'ALU-001',
        turma: 'Vestuário e Estilismo - Manhã',
        idade: '19',
        sexo: 'Masculino',
        raca: 'Parda',
        senha: '1234',
        escola: 'SENAI Centro de Formação Cândido Atahyde',
        criadoEm: new Date().toISOString()
    }
};

let unsubscribeUsuarios = null;

// Sincronização em tempo real de usuários com o Firestore
function startUsuariosSync() {
    if (!db) return;
    try {
        unsubscribeUsuarios = db.collection('usuarios').onSnapshot(
            (snapshot) => {
                const localUsers = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
                let count = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const docId = doc.id;
                    localUsers[docId] = {
                        id: docId,
                        nome: data.nome || ('Usuário ' + docId),
                        role: data.role || 'Aluno',
                        senha: data.senha || '',
                        escola: data.escola || 'SENAI Centro de Formação Cândido Atahyde',
                        matricula: data.matricula || docId,
                        foto: data.foto || (localUsers[docId] && localUsers[docId].foto) || '',
                        email: data.email || ''
                    };
                    count++;
                });

                if (snapshot.empty) {
                    console.log("Coleção 'usuarios' vazia no Firestore. Semeando contas padrão...");
                    seedInitialUsers();
                }

                localStorage.setItem('senaivest_users', JSON.stringify(localUsers));
                updateFirebaseStatusBadge('connected', 'Firebase Conectado');

                if (typeof renderListaProfessores === 'function') renderListaProfessores();
                if (typeof renderProfessoresGrid === 'function') renderProfessoresGrid();
            },
            (error) => {
                console.warn("Aviso do Firestore:", error.message);
                if (error.code === 'permission-denied') {
                    updateFirebaseStatusBadge('error', 'Permissão Firestore');
                } else {
                    updateFirebaseStatusBadge('offline', 'Modo Offline');
                }
            }
        );
    } catch(err) {
        console.warn("Erro ao registrar snapshot de usuários:", err);
        updateFirebaseStatusBadge('offline', 'Modo Offline');
    }
}

// Semeia usuários padrão no Firestore
async function seedInitialUsers() {
    if (!db) return;
    try {
        const batch = db.batch();
        for (const [id, user] of Object.entries(DEFAULT_SYSTEM_USERS)) {
            const ref = db.collection('usuarios').doc(id);
            batch.set(ref, user, { merge: true });
        }
        await batch.commit();
        console.log("Contas padrão sincronizadas no Firestore com sucesso!");
    } catch (e) {
        console.warn("Não foi possível semear usuários no Firestore:", e);
    }
}

// Restaura a sessão do usuário se ele já tiver feito login antes de recarregar a página
function restoreSession() {
    try {
        const sessionStr = sessionStorage.getItem('senaivest_session');
        if (sessionStr) {
            const saved = JSON.parse(sessionStr);
            if (saved && saved.id) {
                currentUser = saved;
                document.getElementById('login-screen')?.classList.remove('active');
                document.getElementById('cadastro-screen')?.classList.remove('active');
                document.getElementById('app-container')?.classList.add('active');
                initApp();
            }
        }
    } catch(e) {
        console.warn("Erro ao restaurar sessão:", e);
    }
}

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJ6OrwFJ_geF_UdiQO2_II1yuyq4Q6p6D8894wnc6MKLD0aaIallnqPWF7n4K8Qz8Vmw/exec';

async function enviarParaPlanilhaGoogle(dados) {
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });
        console.log("Enviado para a planilha com sucesso (modo no-cors).");
    } catch (e) {
        console.error("Erro ao enviar para planilha", e);
    }
}

window.mockPlanos = [
    { id: 'PLAN-001', plano: 'Modelagem Básica', materiais: 'Tecido Algodão (3m)', transfers: 'Nenhuma', liberado: true },
    { id: 'PLAN-002', plano: 'Costura Avançada', materiais: 'Linha e Agulha', transfers: 'Tesouras (4 un. da Sala 02)', liberado: false }
];

const mockSalas = [
    { id: 1, nome: 'Sala 01 - Modelagem', qtd: 450 },
    { id: 2, nome: 'Sala 02 - Costura', qtd: 120 },
    { id: 3, nome: 'Estoque Central', qtd: 2000 }
];

const mockMateriais = [
    { cod: 'MAT-001', nome: 'Tecido Algodão', tipo: 'Insumo', qtd: 50, preco: 'R$ 15,90', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira A1' },
    { cod: 'MAT-002', nome: 'Tesoura Alfaiate', tipo: 'Ferramenta', qtd: 5, preco: 'R$ 45,00', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Gaveta 2' }
];

const notificacoes = [
    { id: 1, title: 'Material Atrasado', desc: 'Tesoura não devolvida.', type: 'alert' },
    { id: 2, title: 'Novo Plano', desc: 'Prof. Clara adicionou um plano.', type: 'info' }
];

const mockProcessos = [
    { id: 'PROC-101', autor: 'Prof. Roberto', tipo: 'Avaria', material: 'Máquina Reta', qtd: 1, detalhe: 'Agulha quebrou e a correia soltou.', status: 'Em Análise', data: 'Hoje, 09:15' }
];

const mockMonitoramento = [
    { sala: 'Sala 01 - Modelagem', status: 'Ocupada', professor: 'Prof. Clara', aula: 'Modelagem Avançada', horario: '08:00 - 12:00' },
    { sala: 'Sala 02 - Costura', status: 'Disponível', professor: '', aula: '', horario: '' },
    { sala: 'Laboratório Maker', status: 'Agendada', professor: 'Prof. Roberto', aula: 'Impressão 3D', horario: '14:00 - 16:00' }
];

const mockAcompanhamento = [
    { turma: 'Vestuário - Manhãã', aluno: 'João Silva', plano: 'PLAN-102 (Costura)', iÍndice: 'Excelente (98%)', statusClass: 'ok', ocorrencia: '' },
    { turma: 'Modelagem - Tarde', aluno: 'Maria Souza', plano: 'PLAN-105 (Moldes)', iÍndice: 'Atenção (60%)', statusClass: 'atrasado', ocorrencia: 'Avaria Registrada (Máquina Reta)' },
    { turma: 'Design - Noite', aluno: 'Pedro Alves', plano: 'PLAN-108 (Estamparia)', iÍndice: 'Crítico (40%)', statusClass: 'atrasado', ocorrencia: 'Roubo Registrado (Tesoura)' }
];

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização da conexão Firebase e restauração de sessão
    initFirebase();
    restoreSession();
    // Cookie Banner Logic
    const cookieBanner = document.getElementById('cookie-banner');
    if (!localStorage.getItem('senaivest_cookies_accepted') && cookieBanner) {
        setTimeout(() => {
            cookieBanner.classList.add('show');
        }, 1000);
    }
    
    window.acceptCookies = function(type) {
        localStorage.setItem('senaivest_cookies_accepted', type);
        document.getElementById('cookie-banner').classList.remove('show');
    }

    // Lógica da Barra de Pesquisa Integrada com a Planilha
    const searchInput = document.getElementById('search-input');
    const searchDropdown = document.getElementById('search-results-dropdown');
    
    if(searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.trim();
            if(termo.length < 2) {
                searchDropdown.style.display = 'none';
                return;
            }
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                searchDropdown.style.display = 'block';
                searchDropdown.innerHTML = '<div style="padding:16px; color:var(--text-secondary); text-align:center;">Buscando na planilha... <span class="material-icons-outlined" style="animation: spin 1s linear infinite; vertical-align:middle;">sync</span></div>';
                
                try {
                    const response = await fetch(`${GOOGLE_SCRIPT_URL}?busca=${encodeURIComponent(termo)}`);
                    const resultados = await response.json();
                    
                    if(resultados.length === 0) {
                        searchDropdown.innerHTML = '<div style="padding:16px; color:var(--text-secondary); text-align:center;">Nenhum item encontrado na planilha para esta busca.</div>';
                        return;
                    }
                    
                    let html = '';
                    resultados.forEach(item => {
                        html += `
                            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="alert('Este item é do tipo: ${item.tipo}. Detalhes: ${item.detalhes}')">
                                <div style="font-weight: 600; color: var(--text-primary); display: flex; justify-content: space-between;">
                                    <span>${item.nomeItem}</span>
                                    <span style="font-size:11px; background: rgba(67, 97, 238, 0.1); color: var(--primary-color); padding: 2px 6px; border-radius: 4px;">${item.tipo}</span>
                                </div>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                                    <span class="material-icons-outlined" style="font-size:14px; vertical-align:middle;">place</span> Local: ${item.localizacao}
                                </div>
                            </div>
                        `;
                    });
                    searchDropdown.innerHTML = html;
                } catch(error) {
                    searchDropdown.innerHTML = '<div style="padding:16px; color:var(--danger-color); text-align:center;">Erro ao buscar na planilha.</div>';
                    console.error("Erro na busca:", error);
                }
            }, 800);
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if(!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.style.display = 'none';
            }
        });
    }

    window.selectLoginProfile = function(role) {
        document.getElementById('login-step-1').style.display = 'none';
        document.getElementById('login-step-2').style.display = 'block';
        
        const iconContainer = document.getElementById('selected-profile-icon-container');
        const iconSpan = document.getElementById('selected-profile-icon');
        const nameHeading = document.getElementById('selected-profile-name');
        const btnEntrar = document.getElementById('btn-entrar');
        
        nameHeading.innerText = role;
        document.getElementById('login-role').value = role;

        if(role === 'Professor') {
            document.getElementById('lbl-id').innerText = 'ID DE ACESSO DO PROFESSOR';
            document.getElementById('login-id').placeholder = 'EX: PROF-1234';
            iconContainer.style.background = 'rgba(67, 97, 238, 0.1)';
            iconContainer.style.color = 'var(--primary-color)';
            iconSpan.innerText = 'school';
            btnEntrar.style.background = 'var(--primary-color)';
        } else if(role === 'Coordenação') {
            document.getElementById('lbl-id').innerText = 'ID DE ACESSO DA COORDENAÇÃO';
            document.getElementById('login-id').placeholder = 'EX: 45678';
            iconContainer.style.background = 'rgba(114, 9, 183, 0.1)';
            iconContainer.style.color = 'var(--coord-color)';
            iconSpan.innerText = 'manage_accounts';
            btnEntrar.style.background = 'var(--coord-color)';
        } else if(role === 'Aluno') {
            document.getElementById('lbl-id').innerText = 'ID DE ACESSO DO ALUNO (MATRÍCULA)';
            document.getElementById('login-id').placeholder = 'EX: ALUNO-1234';
            iconContainer.style.background = 'rgba(247, 37, 133, 0.1)';
            iconContainer.style.color = 'var(--accent-color)';
            iconSpan.innerText = 'face';
            btnEntrar.style.background = 'var(--accent-color)';
        }
    }

    window.backToProfileSelection = function() {
        document.getElementById('login-step-2').style.display = 'none';
        document.getElementById('login-step-1').style.display = 'block';
        document.getElementById('login-id').value = '';
        document.getElementById('login-senha').value = '';
    }

    // Login Submit Integrado ao Firebase Cloud
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-entrar');
        const originalText = submitBtn ? submitBtn.innerText : 'Entrar no Sistema';
        if (submitBtn) {
            submitBtn.innerText = 'Validando no Firebase...';
            submitBtn.disabled = true;
        }

        const role = document.getElementById('login-role').value;
        const idStr = document.getElementById('login-id').value.toUpperCase().trim();
        const senhaStr = document.getElementById('login-senha').value;
        
        try {
            let userFound = null;

            // 1. Tentar buscar em tempo real no Firestore
            if (db) {
                try {
                    const docSnap = await db.collection('usuarios').doc(idStr).get();
                    if (docSnap.exists) {
                        userFound = docSnap.data();
                        userFound.id = docSnap.id;
                        console.log("Usuário autenticado via Firestore:", idStr);
                    }
                } catch (fsErr) {
                    console.warn("Consulta Firestore indisponível, usando cache local:", fsErr.message);
                }
            }

            // 2. Fallback para cache local / localStorage
            if (!userFound) {
                const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
                if (users[idStr]) {
                    userFound = users[idStr];
                    userFound.id = idStr;
                }
            }

            // 3. Suporte inicial para Coordenação (ex: 45678) se for primeiro acesso
            if (!userFound && role === 'Coordenação') {
                userFound = {
                    id: idStr,
                    role: 'Coordenação',
                    nome: 'Coordenador(a) Geral',
                    senha: senhaStr,
                    escola: 'SENAI Centro de Formação Cândido Atahyde',
                    criadoEm: new Date().toISOString()
                };
                if (db) {
                    db.collection('usuarios').doc(idStr).set(userFound, { merge: true }).catch(console.warn);
                }
                const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
                users[idStr] = userFound;
                localStorage.setItem('senaivest_users', JSON.stringify(users));
            }

            // 4. Validação de senha e login
            if (userFound) {
                if (userFound.senha && String(userFound.senha) !== senhaStr) {
                    alert('Senha incorreta! Por favor, verifique e tente novamente.');
                    if (submitBtn) { submitBtn.innerText = originalText; submitBtn.disabled = false; }
                    return;
                }

                currentUser.id = idStr;
                currentUser.role = userFound.role || role;
                currentUser.nome = userFound.nome || ('Usuário ' + idStr);
                currentUser.escola = userFound.escola || 'SENAI Centro de Formação Cândido Atahyde';
                currentUser.email = userFound.email || '';
                currentUser.foto = userFound.foto || '';

                // Atualizar último acesso no Firestore
                if (db) {
                    db.collection('usuarios').doc(idStr).set({
                        ultimoAcesso: new Date().toISOString()
                    }, { merge: true }).catch(console.warn);
                }

                // Salvar sessão para persistência
                sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));

                document.getElementById('login-screen')?.classList.remove('active');
                document.getElementById('cadastro-screen')?.classList.remove('active');
                document.getElementById('app-container')?.classList.add('active');

                try {
                    initApp();
                } catch(err) {
                    console.error("Erro no initApp:", err);
                }
            } else {
                if (role === 'Professor' || role === 'Coordenação') {
                    alert('Acesso negado! O ID (' + idStr + ') não foi encontrado no Firebase nem no sistema. Por favor, solicite o cadastro para a Coordenação.');
                } else {
                    // Fallback para novo aluno
                    currentUser.id = idStr;
                    currentUser.role = role;
                    currentUser.nome = 'Aluno ' + idStr;
                    sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));

                    document.getElementById('login-screen')?.classList.remove('active');
                    document.getElementById('cadastro-screen')?.classList.remove('active');
                    document.getElementById('app-container')?.classList.add('active');

                    try {
                        initApp();
                    } catch(err) {
                        console.error("Erro no initApp:", err);
                    }
                }
            }
        } catch(error) {
            console.error("Erro durante o processo de login:", error);
            alert("Ocorreu um erro no login. Tente novamente.");
        } finally {
            if (submitBtn) {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    window.showCadastro = function() {
        document.getElementById('login-screen')?.classList.remove('active');
        document.getElementById('cadastro-screen')?.classList.add('active');
    }
    window.showLogin = function() {
        document.getElementById('cadastro-screen')?.classList.remove('active');
        document.getElementById('login-screen')?.classList.add('active');
    }

    // Cadastro Submit Integrado ao Firebase Cloud
    document.getElementById('cadastro-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerText : 'Cadastrar';
        if (submitBtn) {
            submitBtn.innerText = 'Salvando no Firebase...';
            submitBtn.disabled = true;
        }

        const role = document.getElementById('cad-role').value;
        const nome = document.getElementById('cad-nome').value.trim();
        const emailStr = document.getElementById('cad-email')?.value.trim() || '';
        const matricula = document.getElementById('cad-matricula').value.toUpperCase().trim();
        const senhaStr = document.getElementById('cad-senha').value;
        const escola = 'SENAI Centro de Formação Cândido Atahyde';

        const novoUsuario = {
            id: matricula,
            matricula: matricula,
            nome: nome,
            email: emailStr,
            role: role,
            senha: senhaStr,
            escola: escola,
            criadoEm: new Date().toISOString(),
            ultimoAcesso: new Date().toISOString()
        };

        // 1. Salvar no Cloud Firestore
        let salvoNoFirebase = false;
        if (db) {
            try {
                await db.collection('usuarios').doc(matricula).set(novoUsuario, { merge: true });
                salvoNoFirebase = true;
                console.log('Novo usuário salvo no Firestore:', matricula);
            } catch(fsErr) {
                console.warn('Aviso ao salvar no Firestore (mantendo local):', fsErr.message);
            }
        }

        // 2. Salvar no LocalStorage
        const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        users[matricula] = novoUsuario;
        localStorage.setItem('senaivest_users', JSON.stringify(users));

        // 3. Enviar para a Planilha Google
        enviarParaPlanilhaGoogle({
            tipoCadastro: 'Usuario',
            role: role,
            nome: nome,
            senha: senhaStr,
            escola: escola,
            matricula: matricula,
            id: matricula
        });

        const statusMsg = salvoNoFirebase ? ' (Sincronizado no Firebase Cloud)' : '';
        alert(`${role} ${nome} cadastrado com sucesso${statusMsg}!\n\nSeu ID de acesso é: ${matricula}`);

        currentUser.id = matricula;
        currentUser.role = role;
        currentUser.nome = nome;
        currentUser.escola = escola;
        sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));

        document.getElementById('cadastro-screen')?.classList.remove('active');
        document.getElementById('login-screen')?.classList.remove('active');
        document.getElementById('app-container')?.classList.add('active');

        try {
            initApp();
        } catch(err) {
            console.error('Erro no initApp:', err);
        } finally {
            if (submitBtn) {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        }
    });


    // Preenchimento com Google Auth
    document.getElementById('btn-cad-google')?.addEventListener('click', () => {
        if (!auth) {
            alert("A autenticação do Google requer conexão com o Firebase.");
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then((result) => {
            const user = result.user;
            const cadNome = document.getElementById('cad-nome');
            if (cadNome) cadNome.value = user.displayName || '';
            const cadEmail = document.getElementById('cad-email');
            if (cadEmail) cadEmail.value = user.email || '';
            alert('Nome e E-mail preenchidos com sua Conta Google (' + (user.email || '') + ')! Agora crie sua identificação e senha para finalizar.');
        }).catch((error) => {
            if (error.code === 'auth/operation-not-supported-in-this-environment') {
                alert("Atenção: O Login com Google precisa rodar através de um servidor local (ex: http://localhost) e não diretamente via arquivo file://.");
            } else {
                alert("Erro ao conectar com Google: " + error.message);
            }
        });
    });

    // Login com Google Integrado ao Firestore
    document.getElementById('btn-google')?.addEventListener('click', async () => {
        if (!auth) {
            alert("A autenticação do Google requer conexão com o Firebase.");
            return;
        }
        const role = document.getElementById('login-role').value;
        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;
            
            let perfilUsuario = {
                id: user.uid,
                nome: user.displayName || 'Usuário Google',
                email: user.email || '',
                role: role,
                escola: 'SENAI Centro de Formação Cândido Atahyde',
                foto: user.photoURL || '',
                ultimoAcesso: new Date().toISOString()
            };

            // Verificar se o usuário já tem perfil salvo no Firestore
            if (db) {
                try {
                    const docSnap = await db.collection('usuarios').doc(user.uid).get();
                    if (docSnap.exists) {
                        const dados = docSnap.data();
                        perfilUsuario = { ...perfilUsuario, ...dados };
                    } else {
                        perfilUsuario.criadoEm = new Date().toISOString();
                        await db.collection('usuarios').doc(user.uid).set(perfilUsuario, { merge: true });
                    }
                } catch(fsErr) {
                    console.warn("Aviso ao sincronizar perfil Google no Firestore:", fsErr.message);
                }
            }

            const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
            users[user.uid] = perfilUsuario;
            localStorage.setItem('senaivest_users', JSON.stringify(users));

            currentUser.id = perfilUsuario.id;
            currentUser.nome = perfilUsuario.nome;
            currentUser.email = perfilUsuario.email;
            currentUser.role = perfilUsuario.role;
            currentUser.escola = perfilUsuario.escola;
            currentUser.foto = perfilUsuario.foto;
            sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));

            document.getElementById('login-screen')?.classList.remove('active');
            document.getElementById('cadastro-screen')?.classList.remove('active');
            document.getElementById('app-container')?.classList.add('active');
            initApp();
        } catch(error) {
            if (error.code === 'auth/operation-not-supported-in-this-environment') {
                alert("Atenção: O Login com Google precisa rodar através de um servidor local (ex: http://localhost) e não diretamente pelo arquivo file://.");
            } else {
                alert("Erro ao logar com Google: " + error.message);
            }
            console.error(error);
        }
    });

    // Planos form
    document.getElementById('form-plano').addEventListener('submit', (e) => {
        e.preventDefault();
        const tema = document.getElementById('p-tema').value;
        const inicio = document.getElementById('p-inicio').value;
        const termino = document.getElementById('p-termino').value;
        const dia = document.getElementById('p-dia').value;
        const local = document.getElementById('p-local').value;
        const tempoPreparo = document.getElementById('p-tempo').value;
        
        const matSelect = document.getElementById('p-mat');
        let mats = [];
        let needsTransfer = [];
        
        Array.from(matSelect.selectedOptions).forEach(opt => {
            mats.push(opt.text.split(' (')[0]); 
            const matSala = opt.getAttribute('data-sala');
            if (matSala !== local) {
                const name = opt.text.split(' - ')[1] ? opt.text.split(' - ')[1].split(' (')[0] : opt.text;
                needsTransfer.push(name);
            }
        });
        
        if (needsTransfer.length > 0) {
            alert(`Aviso ao Professor:\nOs seguintes materiais não estão na sala selecionada (${local}) e precisarão ser solicitados para transferência:\n\n- ${needsTransfer.join('\n- ')}`);
        }
        
        let matsStr = mats.join(', ');
        if(!matsStr) matsStr = 'Nenhum material';
        
        const now = new Date();
        const currentHora = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        const todayStr = now.toISOString().split('T')[0];
        
        let statusSala = 'Agendada';
        if (dia === todayStr && inicio <= currentHora && termino >= currentHora) {
            statusSala = 'Ocupada';
        }
        
        const salaMon = mockMonitoramento.find(s => s.sala === local);
        if(salaMon) {
            salaMon.status = statusSala;
            salaMon.professor = currentUser.nome;
            salaMon.aula = tema;
            salaMon.horario = `${inicio} - ${termino}`;
        } else {
            mockMonitoramento.push({
                sala: local,
                status: statusSala,
                professor: currentUser.nome,
                aula: tema,
                horario: `${inicio} - ${termino}`
            });
        }
        renderMonitoramento();

        const horario = `${inicio} às ${termino}`;
        const turma = document.getElementById('p-turma') ? document.getElementById('p-turma').value : 'Vestuário - Manhã';
        
        const novoPlanoId = 'PLAN-' + Math.floor(1000 + Math.random()*9000);
        window.mockPlanos.push({
            id: novoPlanoId,
            plano: tema,
            horario: horario,
            dia: dia,
            sala: local,
            materiais: matsStr,
            professor: currentUser.id || currentUser.nome,
            turma: turma,
            timestamp: Date.now(),
            isAvulso: false
        });
        
        // Integrando com o Google Sheets - Planilha de Planos de Aula
        enviarParaPlanilhaGoogle({
            tipoCadastro: 'Plano de Aula',
            professor: currentUser.nome,
            codigoPlano: 'PLAN-' + Math.floor(1000 + Math.random()*9000),
            horario: dia + ' ' + inicio + ' às ' + termino,
            sala: local,
            produtoUsado: matsStr
        });

        renderPlan(tema, horario, currentUser.nome, true, matsStr, 'Diversas', dia, local, tempoPreparo, turma);
        closeModal('plano-modal');
        document.getElementById('form-plano').reset();
    });

window.checkNewCategory = function(select) {
    const input = document.getElementById('prod-tipo-new');
    if(select.value === 'new') {
        input.style.display = 'block';
        input.required = true;
    } else {
        input.style.display = 'none';
        input.required = false;
    }
}

// Formulário Produto
document.getElementById('form-produto')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('prod-nome').value;
    const cod = document.getElementById('prod-cod').value;
    const qtd = document.getElementById('prod-qtd').value;
    const preco = document.getElementById('prod-preco').value;
    
    let tipo = document.getElementById('prod-tipo').value;
    if(tipo === 'new') tipo = document.getElementById('prod-tipo-new').value;
    
    const almox = document.getElementById('prod-almox').value;
    const local = document.getElementById('prod-local').value;
    
    mockMateriais.push({
        cod: cod || `MAT-00${mockMateriais.length + 1}`,
        nome: nome,
        tipo: tipo,
        qtd: parseInt(qtd),
        preco: preco || 'R$ 0,00',
        almoxOrigem: almox,
        almoxAtual: almox,
        local: local
    });
    
    alert('Produto Cadastrado com Sucesso!');
    
    // Integrando com o Google Sheets - Planilha de Almoxarifado
    enviarParaPlanilhaGoogle({
        tipoCadastro: 'Produto',
        cod: cod || `MAT-00${mockMateriais.length}`,
        produto: nome,
        quant: qtd,
        valorUnitario: preco || 'R$ 0,00',
        usuario: currentUser.nome,
        horario: new Date().toLocaleString('pt-BR'),
        entrada: qtd,
        saida: '',
        vinculo: '',
        sala: almox,
        localizacao: local
    });

    closeModal('novo-produto-modal');
    document.getElementById('form-produto').reset();
    document.getElementById('prod-tipo-new').style.display = 'none';
    
    // Atualiza se estiver na sala vendo os itens
    const viewDetalhe = document.getElementById('view-sala-detalhe');
    if(viewDetalhe && viewDetalhe.classList.contains('active')) {
        abrirSala(document.getElementById('sala-detalhe-titulo').innerText);
    }
});

    // Formulário Boletim Tela Cheia
    document.getElementById('form-boletim-full')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-salvar-boletim');
        const originalText = submitBtn ? submitBtn.innerHTML : 'Registrar e Enviar Boletim';
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="material-icons-outlined spin" style="font-size:18px; vertical-align:middle;">sync</span> Gravando no Firebase...';
            submitBtn.disabled = true;
        }

        const idBoletim = document.getElementById('bf-codigo').value || `BOL-2026-${Math.floor(1000 + Math.random()*9000)}`;
        const categoria = document.getElementById('bf-categoria').value || 'Ocorrência Geral';
        const dataOcorrencia = document.getElementById('bf-data').value || new Date().toISOString();
        const escola = document.getElementById('bf-escola').value;
        const autor = document.getElementById('bf-autor').value || currentUser.nome || 'Coordenação';
        const turma = document.getElementById('bf-turma').value;
        const material = document.getElementById('bf-material-search').value;
        const materialCod = document.getElementById('bf-material-cod').value || 'N/A';
        const qtd = document.getElementById('bf-qtd').value || 1;
        const plano = document.getElementById('bf-plano').value || 'Nenhum / Ocorrência Avulsa';
        const almoxarifado = document.getElementById('bf-almoxarifado').value || 'Almoxarifado Central';
        const descSucinta = document.getElementById('bf-desc-sucinta').value;
        const obs = document.getElementById('bf-obs').value;

        // Coletar campos específicos da categoria
        const specificFields = {};
        const dynContainer = document.getElementById('bf-dynamic-fields');
        if (dynContainer) {
            dynContainer.querySelectorAll('input, select, textarea').forEach(input => {
                const label = input.previousElementSibling ? input.previousElementSibling.innerText : (input.placeholder || 'Campo');
                if (input.value) specificFields[label] = input.value;
            });
        }

        const novoBoletim = {
            id: idBoletim,
            codigo: idBoletim,
            tipo: categoria,
            categoria: categoria,
            data: new Date(dataOcorrencia).toLocaleString('pt-BR'),
            dataIso: dataOcorrencia,
            escola: escola,
            autor: autor,
            turma: turma,
            material: material,
            materialCod: materialCod,
            qtd: qtd,
            planoOrigem: plano,
            almoxarifado: almoxarifado,
            detalhe: descSucinta,
            descricaoSucinta: descSucinta,
            camposEspecificos: specificFields,
            obs: obs,
            status: 'Pendente',
            criadoEm: new Date().toISOString()
        };

        mockProcessos.unshift(novoBoletim);

        // Salvar no Cloud Firestore (coleção 'boletins')
        if (db) {
            try {
                await db.collection('boletins').doc(idBoletim).set(novoBoletim, { merge: true });
                console.log("Boletim gravado no Firestore:", idBoletim);
            } catch(fsErr) {
                console.warn("Aviso ao salvar boletim no Firestore:", fsErr.message);
            }
        }

        // Salvar localmente
        localStorage.setItem('senaivest_processos', JSON.stringify(mockProcessos));

        // Enviar para Planilha Google
        enviarParaPlanilhaGoogle({
            tipoCadastro: 'Boletim',
            codigo: idBoletim,
            autor: autor,
            hora: new Date().toLocaleString('pt-BR'),
            status: 'Pendente',
            tema: categoria,
            detalhes: `Material: ${material} (${materialCod}) | Qtd: ${qtd} | Turma: ${turma} | Sala: ${almoxarifado} | Relato: ${descSucinta}`
        });

        alert(`Boletim ${idBoletim} registrado com sucesso!\n\nMaterial: ${material}\nStatus: Pendente para análise da Coordenação.`);

        document.getElementById('form-boletim-full').reset();
        nav('view-processos');
        renderProcessos();

        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    document.getElementById('form-solicitar-acesso')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const motivo = document.getElementById('sa-motivo').value;
        const materiais = document.getElementById('sa-materiais').value;
        const transfer = document.getElementById('sa-transfer').value;
        
        const novoAcesso = {
            id: `PLAN-${Math.floor(1000 + Math.random()*9000)}`,
            plano: motivo,
            materiais: materiais || 'Nenhum',
            transfers: transfer || 'Nenhuma',
            timestamp: Date.now(),
            isAvulso: true
        };
        
        if (!window.mockPlanos) window.mockPlanos = [];
        window.mockPlanos.unshift(novoAcesso);
        
        if (typeof enviarParaPlanilhaGoogle === 'function') {
            enviarParaPlanilhaGoogle({
                tipoCadastro: 'Solicitacao_Acesso_QR',
                codigo: novoAcesso.id,
                autor: currentUser ? currentUser.nome : 'Desconhecido',
                hora: new Date().toLocaleString('pt-BR'),
                status: 'Pendente',
                tema: motivo,
                detalhes: `Materiais: ${materiais} | Transferências: ${transfer}`
            });
        }
        
        alert('Solicitação de acesso enviada para a coordenação!');
        closeModal('solicitar-acesso-modal');
        document.getElementById('form-solicitar-acesso').reset();
        
        if (typeof renderMeusQRCodes === 'function') renderMeusQRCodes();
    });
});

window.gerarIdProfessor = async function() {
    const nome = document.getElementById('novo-prof-nome').value.trim();
    const matricula = document.getElementById('novo-prof-matricula').value.trim();
    const escola = document.getElementById('novo-prof-escola').value;
    
    if(!nome || !matricula) {
        alert("Por favor, preencha o Nome e a Matrícula!");
        return;
    }

    const idGerado = 'PROF-' + matricula;
    const senhaGerada = matricula; // Senha padrão é a matrícula

    const profData = {
        id: idGerado,
        matricula: matricula,
        nome: nome,
        role: 'Professor',
        senha: senhaGerada,
        escola: escola,
        criadoEm: new Date().toISOString()
    };

    // 1. Salvar no Firestore
    let salvoNoFirebase = false;
    if (db) {
        try {
            await db.collection('usuarios').doc(idGerado).set(profData, { merge: true });
            salvoNoFirebase = true;
            console.log("Professor salvo no Firestore com sucesso:", idGerado);
        } catch(fsErr) {
            console.warn("Aviso ao salvar professor no Firestore:", fsErr.message);
        }
    }

    // 2. Salvar no LocalStorage
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    users[idGerado] = profData;
    localStorage.setItem('senaivest_users', JSON.stringify(users));

    // Mostrar na tela os dados gerados
    document.getElementById('novo-prof-id').innerText = idGerado;
    document.getElementById('novo-prof-senha').innerText = senhaGerada;

    const statusMsg = salvoNoFirebase ? " (Salvo no Firebase Cloud)" : "";
    alert(`Professor ${nome} cadastrado com sucesso${statusMsg}!\n\nID: ${idGerado}\nSenha: ${senhaGerada}`);
    
    // Integrar com a planilha
    enviarParaPlanilhaGoogle({
        tipoCadastro: 'Professor',
        nome: nome,
        id: idGerado,
        escola: escola,
        matricula: matricula,
        senha: senhaGerada,
        situacao: 'Ativo'
    });

    // Limpar o form
    document.getElementById('novo-prof-nome').value = '';
    document.getElementById('novo-prof-matricula').value = '';
    const nascEl = document.getElementById('novo-prof-nascimento');
    if (nascEl) nascEl.value = '';
    
    if (typeof renderListaProfessores === 'function') {
        renderListaProfessores();
    }
};

window.renderListaProfessores = function() {
    const container = document.getElementById('lista-professores');
    if(!container) return;
    container.innerHTML = '';
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    let hasProfs = false;
    for(let id in users) {
        if(users[id].role === 'Professor' || users[id].role === 'professor') {
            hasProfs = true;
            container.innerHTML += `
                <div style="background:var(--bg-surface); padding:16px; border-radius:12px; border:1px solid var(--border-color); display:flex; align-items:center; gap:16px;">
                    <div style="width:48px; height:48px; border-radius:50%; background:rgba(67, 97, 238, 0.1); color:var(--primary-color); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;">
                        ${users[id].nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight:700; color:var(--text-primary); font-size:15px;">${users[id].nome}</div>
                        <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">ID de Acesso: <span style="color:var(--primary-color); font-weight:600;">${id}</span></div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;"><span class="material-icons-outlined" style="font-size:12px; vertical-align:middle;">school</span> ${users[id].escola}</div>
                    </div>
                </div>
            `;
        }
    }
    if(!hasProfs) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:14px; grid-column:1/-1; padding: 24px; text-align:center; border: 1px dashed var(--border-color); border-radius: 12px;">Nenhum professor cadastrado ainda.</div>';
    }
};

async function syncUsersFromSheets() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL + '?action=getUsers');
        const data = await response.json();
        const localUsers = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        let updated = false;
        data.forEach(u => {
            if (u.id) {
                localUsers[u.id] = {
                    role: u.role,
                    nome: u.nome,
                    senha: u.senha,
                    escola: u.escola
                };
                updated = true;
            }
        });
        if (updated) {
            localStorage.setItem('senaivest_users', JSON.stringify(localUsers));
            if (typeof renderListaProfessores === 'function') renderListaProfessores();
        }
    } catch (e) {
        console.log("Offline ou erro ao sincronizar: " + e);
    }
}

// Sincroniza ao abrir a página
syncUsersFromSheets();

function initApp() {
    let initial = (currentUser.nome || 'U').replace('Usuário ', '').charAt(0).toUpperCase() || 'U';

    const sbName = document.getElementById('sidebar-name');
    if (sbName) sbName.innerText = currentUser.nome || 'Usuário';
    const sbRole = document.getElementById('sidebar-role');
    if (sbRole) sbRole.innerText = currentUser.role || 'Perfil';
    
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const sbAvatar = document.getElementById('sidebar-avatar');
    const profAvatar = document.getElementById('profile-avatar-large');
    if (users[currentUser.id] && users[currentUser.id].foto) {
        const foto = users[currentUser.id].foto;
        if (sbAvatar) sbAvatar.innerHTML = `<img src="${foto}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        if (profAvatar) profAvatar.innerHTML = `<img src="${foto}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
    } else {
        if (sbAvatar) sbAvatar.innerHTML = initial;
        if (profAvatar) profAvatar.innerHTML = initial;
    }

    const menu = document.getElementById('sidebar-menu');
    if (menu) {
        menu.innerHTML = '';

        if (currentUser.role === 'Coordenação') {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-dashboard-coord', this)"><span class="material-icons-outlined">dashboard</span> <span class="nav-text">Painel Principal</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-salas', this)"><span class="material-icons-outlined">category</span> <span class="nav-text">Almoxarifados</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aquisicao', this)"><span class="material-icons-outlined">shopping_cart</span> <span class="nav-text">Aquisição</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-cadastro-prof', this)"><span class="material-icons-outlined">person_add</span> <span class="nav-text">Professores</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-planos', this); if(typeof renderPlanosGeral === 'function') renderPlanosGeral();"><span class="material-icons-outlined">menu_book</span> <span class="nav-text">Todos os Planos</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-monitoramento', this)"><span class="material-icons-outlined">meeting_room</span> <span class="nav-text">Monitoramento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-boletins-novo', this)"><span class="material-icons-outlined">report_problem</span> <span class="nav-text">Novo Boletim</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-processos', this)"><span class="material-icons-outlined">sync_alt</span> <span class="nav-text">Processos</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-acompanhamento', this)"><span class="material-icons-outlined">people</span> <span class="nav-text">Acompanhamento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-relatorios', this)"><span class="material-icons-outlined">bar_chart</span> <span class="nav-text">Relatórios</span></li>`;
            nav('view-dashboard-coord', menu.firstElementChild);
            if (typeof renderCoordDashboard === 'function') renderCoordDashboard();
        } else if (currentUser.role === 'Aluno') {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-aluno-bancada', this); if(typeof renderAlunoBancada === 'function') renderAlunoBancada();"><span class="material-icons-outlined">precision_manufacturing</span> <span class="nav-text">Minha Bancada</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aluno-retalhos', this); if(typeof renderCatalogoRetalhos === 'function') renderCatalogoRetalhos();"><span class="material-icons-outlined">recycling</span> <span class="nav-text">Estoque Circular (Retalhos)</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aluno-ranking', this); if(typeof renderRankingEficiencia === 'function') renderRankingEficiencia();"><span class="material-icons-outlined">emoji_events</span> <span class="nav-text">Ranking de Eficiência</span></li>`;
            nav('view-aluno-bancada', menu.firstElementChild);
        } else {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-salas', this)"><span class="material-icons-outlined">category</span> <span class="nav-text">Salas Virtuais</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-diario-classe', this)"><span class="material-icons-outlined">fact_check</span> <span class="nav-text">Diário de Classe</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-planos', this)"><span class="material-icons-outlined">menu_book</span> <span class="nav-text">Planos de Aula</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-checkin-bancada', this)"><span class="material-icons-outlined">fact_check</span> <span class="nav-text">Check-in de Bancadas</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-monitoramento', this)"><span class="material-icons-outlined">meeting_room</span> <span class="nav-text">Monitoramento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-boletins-novo', this)"><span class="material-icons-outlined">report_problem</span> <span class="nav-text">Novo Boletim</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-processos', this)"><span class="material-icons-outlined">sync_alt</span> <span class="nav-text">Meus Boletins</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-acompanhamento', this)"><span class="material-icons-outlined">people</span> <span class="nav-text">Acompanhamento</span></li>`;
            nav('view-salas', menu.firstElementChild);
        }
        
        menu.innerHTML += `<li class="nav-item" onclick="nav('view-historia', this)"><span class="material-icons-outlined">history_edu</span> <span class="nav-text">Nossa História</span></li>`;
        menu.innerHTML += `<li class="nav-item" onclick="nav('view-notificacoes', this)"><span class="material-icons-outlined">campaign</span> <span class="nav-text">Avisos</span></li>`;
        menu.innerHTML += `<li class="nav-item" onclick="nav('view-perfil', this)"><span class="material-icons-outlined">account_circle</span> <span class="nav-text">Perfil</span></li>`;
    }
    
    // Atualiza também os dados na View de Perfil
    const profName = document.getElementById('profile-name');
    if (profName) profName.innerText = currentUser.nome || '';
    const profRole = document.getElementById('profile-role');
    if (profRole) profRole.innerText = (currentUser.role || '') + ' | SenaiVest';
    const profId = document.getElementById('profile-id');
    if (profId) profId.innerText = currentUser.id || 'N/A';
    
    const profSchool = document.getElementById('profile-school');
    if (profSchool) {
        if (users[currentUser.id] && users[currentUser.id].escola) {
            profSchool.innerHTML = `<span class="material-icons-outlined" style="font-size:18px; vertical-align:middle; color: var(--primary-color); margin-right:4px;">school</span> ${users[currentUser.id].escola}`;
        } else {
            profSchool.innerHTML = `<span class="material-icons-outlined" style="font-size:18px; vertical-align:middle; color: var(--primary-color); margin-right:4px;">school</span> SENAI Centro de Formação Cândido Atahyde`;
        }
    }

    try { if (typeof renderSalas === 'function') renderSalas(); } catch(e){ console.error(e); }
    try { if (typeof renderNotificacoes === 'function') renderNotificacoes(); } catch(e){ console.error(e); }
    try { if (typeof renderProcessos === 'function') renderProcessos(); } catch(e){ console.error(e); }
    try { if (typeof renderMonitoramento === 'function') renderMonitoramento(); } catch(e){ console.error(e); }
    try { if (typeof renderBoletimCategories === 'function') renderBoletimCategories(); } catch(e){ console.error(e); }
    try { if (typeof renderAcompanhamento === 'function') renderAcompanhamento(); } catch(e){ console.error(e); }
    try { if (typeof renderMeusQRCodes === 'function') renderMeusQRCodes(); } catch(e){ console.error(e); }
    try { if (typeof renderListaProfessores === 'function') renderListaProfessores(); } catch(e){ console.error(e); }
    if (document.getElementById('plans-grid')) document.getElementById('plans-grid').innerHTML = '';
    try {
        if (typeof renderPlan === 'function') {
            renderPlan('Modelagem Básica', '08:00 às 10:00', 'Usuário PROF-999', false, 'MAT-001 - Tecido Algodão', 'Sala 01 - Modelagem', '2026-10-01', 'Lab Modelagem');
        }
    } catch(e) { console.error(e); }
}

window.nav = function(viewId, element) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    if(viewId === 'view-diario-classe') {
        if(typeof populateDiarioPlanos === 'function') populateDiarioPlanos();
    }
    if(viewId === 'view-dashboard-coord' && typeof renderPainelAtrasosCoord === 'function') {
        renderPainelAtrasosCoord();
    }
    if(viewId === 'view-planos' && typeof renderBannerAtrasosProf === 'function') {
        renderBannerAtrasosProf();
    }
    if(viewId === 'view-aluno-bancada' && typeof renderAlunoBancada === 'function') {
        renderAlunoBancada();
    }
    if(viewId === 'view-aluno-retalhos' && typeof renderCatalogoRetalhos === 'function') {
        renderCatalogoRetalhos();
    }
    if(viewId === 'view-aluno-ranking' && typeof renderRankingEficiencia === 'function') {
        renderRankingEficiencia();
    }
    if(viewId === 'view-notificacoes' && currentUser.role === 'Aluno' && typeof renderNotificacoesAluno === 'function') {
        renderNotificacoesAluno();
    }

    
    if(element) {
        document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
        element.classList.add('active');
    }
}

function renderSalas() {
    const grid = document.getElementById('salas-grid');
    grid.innerHTML = '';
    mockSalas.forEach(s => {
        grid.innerHTML += `
            <div class="sala-card" onclick="abrirSala('${s.nome}')">
                <div class="sala-card-bg"></div>
                <div class="sala-content-top">
                    <div class="sala-icon"><span class="material-icons-outlined">meeting_room</span></div>
                    <div class="sala-badge">${s.qtd} Itens</div>
                </div>
                <h3 class="sala-title">${s.nome}</h3>
                <div class="sala-footer">
                    <span>Acessar Almoxarifado</span>
                    <span class="material-icons-outlined">arrow_forward</span>
                </div>
            </div>
        `;
    });
}

function abrirSala(nome) {
    document.getElementById('sala-detalhe-titulo').innerText = nome;
    
    const grid = document.getElementById('sala-materiais-grid');
    grid.innerHTML = '';
    
    const produtosSala = mockMateriais.filter(m => m.almoxAtual === nome);
    
    produtosSala.forEach(m => {
        const isBorrowed = m.almoxOrigem !== m.almoxAtual;
        const originBadge = isBorrowed ? `<div class="product-origin-badge"><span class="material-icons-outlined" style="font-size:14px;">info</span> NáƒO PERTENCE AQUI: Origem é ${m.almoxOrigem}</div>` : '';
        
        let mockInstallment = '';
        if (m.preco && m.preco !== 'R$ 0,00') {
            const numStr = m.preco.replace('R$ ', '').replace(/\./g, '').replace(',', '.');
            const num = parseFloat(numStr);
            if(!isNaN(num) && num > 0) {
                mockInstallment = `em 10x de R$ ${(num/10).toFixed(2).replace('.',',')} sem juros`;
            }
        }
        
        let retalhoSuggestion = '';
        if (m.cod === 'MAT-001') {
            retalhoSuggestion = `
                <div style="margin-top: 12px; background: rgba(76, 201, 240, 0.1); border: 1px dashed var(--success-color); padding: 8px; border-radius: 8px;">
                    <span style="font-size:12px; font-weight:700; color:#0077b6; display:flex; align-items:center; gap:4px;"><span class="material-icons-outlined" style="font-size:14px;">recycling</span> DICA DE SUSTENTABILIDADE</span>
                    <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">No abra um rolo novo! Existem 4 retalhos de algodão na <strong>Bancada 02</strong>.</p>
                </div>
            `;
        }

        grid.innerHTML += `
            <div class="store-card" onclick="openSolicitarModal('${m.cod}')" style="cursor:pointer;">
                <div class="store-card-image">
                    <span class="material-icons-outlined" style="font-size: 64px; color: #e2e8f0;">inventory_2</span>
                </div>
                <div class="store-card-content">
                    <div class="store-card-sku">SKU: ${m.cod} | Local: ${m.local}</div>
                    <div class="store-card-title">${m.nome}</div>
                    <div class="store-card-rating">
                        â˜…â˜…â˜…â˜…â˜… <span>(Categoria: ${m.tipo})</span>
                    </div>
                    
                    ${originBadge}
                    ${retalhoSuggestion}
                </div>
            </div>
        `;
    });
    
    if(produtosSala.length === 0) {
        grid.innerHTML = `<div style="padding: 40px; color: var(--text-secondary); width: 100%; text-align: center; grid-column: 1 / -1;">Nenhum produto cadastrado ou transferido para esta sala.</div>`;
    }
    
    nav('view-sala-detalhe', null);
}

function renderCoordDashboard() {
    const tbody = document.getElementById('coord-boletins-tbody');
    if(tbody) {
        tbody.innerHTML = `
            <tr><td>BOL-101</td><td>Usuário PROF-123</td><td>Tesoura</td><td>10:00</td><td><span class="status atrasado">Atrasado</span></td></tr>
            <tr><td>BOL-102</td><td>Usuário PROF-456</td><td>Tecido Algodão</td><td>14:00</td><td><span class="status ok">Em Uso</span></td></tr>
        `;
    }
}

function renderMonitoramento() {
    const grid = document.getElementById('monitoramento-grid');
    const dash = document.getElementById('mon-dash');
    if (!grid || !dash) return;
    
    grid.innerHTML = '';
    dash.innerHTML = '';

    let ocupadas = 0, disponiveis = 0, agendadas = 0;

    mockMonitoramento.forEach(s => {
        let statusColor = '#8d99ae';
        
        if(s.status === 'Ocupada') {
            statusColor = '#ef4444'; ocupadas++;
        }
        if(s.status === 'Agendada') {
            statusColor = '#f59e0b'; agendadas++;
        }
        if(s.status === 'Disponível') {
            statusColor = '#06b6d4'; disponiveis++;
        }

        grid.innerHTML += `
            <div class="monitoramento-card" style="border-left-color: ${statusColor};">
                <div style="display:flex; align-items:center; gap:16px;">
                    <div class="mon-icon-box"><span class="material-icons-outlined">meeting_room</span></div>
                    <h3 style="font-size:18px; color:var(--text-primary); font-weight:700;">${s.sala}</h3>
                </div>
                <div class="mon-status-text" style="color:${statusColor}">${s.status}</div>
                <div style="font-size: 14px; color: var(--text-secondary); line-height:1.6;">
                    ${s.professor ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">person</span> ${s.professor}</div>` : ''}
                    ${s.aula ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">menu_book</span> ${s.aula}</div>` : ''}
                    ${s.horario ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">schedule</span> ${s.horario}</div>` : ''}
                    ${!s.professor ? 'Nenhuma aula no momento.' : ''}
                </div>
            </div>
        `;
    });

    dash.innerHTML = `
        <div class="mon-dash-item">
            <div class="mon-dash-icon" style="background:#fef2f2; color:#ef4444;"><span class="material-icons-outlined">meeting_room</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary);">Ocupadas</div>
                <div style="font-size:24px; color:#ef4444;">${ocupadas}</div>
            </div>
        </div>
        <div class="mon-dash-item">
            <div class="mon-dash-icon" style="background:#ecfeff; color:#06b6d4;"><span class="material-icons-outlined">door_front</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary);">Disponíveis</div>
                <div style="font-size:24px; color:#06b6d4;">${disponiveis}</div>
            </div>
        </div>
        <div class="mon-dash-item">
            <div class="mon-dash-icon" style="background:#fffbeb; color:#f59e0b;"><span class="material-icons-outlined">schedule</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary);">Agendadas</div>
                <div style="font-size:24px; color:#f59e0b;">${agendadas}</div>
            </div>
        </div>
    `;
}

function renderProcessos() {
    const grid = document.getElementById('processos-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Sincronizar com localStorage se existir
    const salvos = localStorage.getItem('senaivest_processos');
    if (salvos) {
        try {
            const parsed = JSON.parse(salvos);
            if (Array.isArray(parsed) && parsed.length > 0) {
                mockProcessos = parsed;
            }
        } catch(e) {}
    }

    if (mockProcessos.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-secondary); text-align:center; padding:32px; grid-column:1/-1;">Nenhum boletim registrado até o momento.</div>';
        return;
    }

    mockProcessos.forEach(p => {
        let statusColor = p.status === 'Concluído' ? '#10b981' : (p.status === 'Em Análise' ? '#f59e0b' : (p.status === 'Encaminhado para Reparo' ? '#0284c7' : '#e63946'));
        let typeColor = '#e63946';
        if (p.tipo === 'Reposição de Produtos' || p.tipo === 'Reparo / Manutenção') typeColor = '#3b82f6';
        if (p.tipo === 'Divergência de Estoque') typeColor = '#f59e0b';

        grid.innerHTML += `
            <div class="store-card" style="padding: 24px; border-left: 6px solid ${typeColor}; display: block; cursor:pointer;" onclick="abrirDetalhesBoletim('${p.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
                    <div>
                        <div style="font-size: 11.5px; color: var(--text-secondary); font-weight: 700; margin-bottom: 4px; display:flex; align-items:center; gap:6px;">
                            <span class="material-icons-outlined" style="font-size:15px; color:var(--primary-color);">receipt_long</span> ${p.id}
                        </div>
                        <h3 style="font-size: 19px; color: var(--text-primary); font-weight: 700; margin-bottom:2px;">${p.material || 'Material'}</h3>
                        <div style="font-size:12px; color:var(--text-secondary);">${p.almoxarifado || p.planoOrigem || 'Almoxarifado Central'}</div>
                    </div>
                    <span style="background: ${typeColor}; color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${p.tipo}</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                    <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary);">
                        <span class="material-icons-outlined" style="font-size:16px;">person</span> ${p.autor}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary);">
                        <span class="material-icons-outlined" style="font-size:16px;">schedule</span> ${p.data}
                    </div>
                </div>

                <div style="background: #f8f9fa; border-radius: 10px; padding: 14px; margin-bottom: 16px; border: 1px solid #f0f0f0;">
                    <div style="font-size: 13.5px; color: var(--text-primary); line-height: 1.5; font-weight: 500;">
                        <strong>Relato:</strong> ${p.detalhe || p.descricaoSucinta || 'Sem descrição'}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid var(--border-color);" onclick="event.stopPropagation()">
                    <div>
                        <span style="font-size: 11px; color: var(--text-secondary); display:block; margin-bottom:2px; font-weight:600;">Status</span>
                        <strong style="color: ${statusColor}; font-size: 13px; background: ${statusColor}15; padding: 4px 10px; border-radius: 6px;">${p.status}</strong>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="abrirChatInstitucional('${p.autor}', '${p.id}')" title="Conversar no Chat com o Autor" style="background: rgba(2, 132, 199, 0.1); border: 1px solid rgba(2, 132, 199, 0.3); color: #0284c7; padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display:flex; align-items:center; gap:4px;">
                            <span class="material-icons-outlined" style="font-size:16px;">chat</span> Chat
                        </button>
                        <button onclick="abrirDetalhesBoletim('${p.id}')" style="background: var(--primary-color); color: white; border: none; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

window.atualizarBoletim = function(id, status) {
    const p = mockProcessos.find(x => x.id === id);
    if(p) {
        p.status = status;
        renderProcessos();
        
        if (status === 'Concluído') {
            notificacoes.unshift({ id: Date.now(), title: 'Processo Concluído', desc: `O processo ${id} foi concluído. PDF salvo na Biblioteca.`, type: 'info' });
            renderNotificacoes();
            adicionarBiblioteca(`Boletim ${id} - ${p.material}`, 'Boletins de Processo');
        }
    }
}

window.adicionarBiblioteca = function(nomeDocumento, categoria) {
    const list = document.getElementById('biblioteca-list');
    if(!list) return;
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><span class="material-icons-outlined" style="vertical-align: middle; color:var(--danger-color);">picture_as_pdf</span> ${nomeDocumento}</td>
        <td>${categoria}</td>
        <td>${dataAtual}</td>
        <td><button class="action-btn" onclick="alert('Download iniciado')">Baixar PDF</button></td>
    `;
    list.appendChild(tr);
}

window.importarNF = function() {
    // Simula a abertura do explorador de arquivos e upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml, .pdf';
    input.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        
        // Simular processamento
        setTimeout(() => {
            alert(`A importação do arquivo "${file.name}" atualizou o estoque instantaneamente e os lotes foram vinculados!`);
            notificacoes.unshift({ id: Date.now(), title: 'Nota Fiscal Importada', desc: `O arquivo ${file.name} foi processado e adicionado à biblioteca.`, type: 'info' });
            renderNotificacoes();
            adicionarBiblioteca(file.name, 'Nota Fiscal (XML/PDF)');
        }, 800);
    };
    input.click();
}

function renderNotificacoes() {
    const list = document.getElementById('notif-list');
    list.innerHTML = '';
    notificacoes.forEach(n => {
        list.innerHTML += `
            <div class="notification-item" id="notif-${n.id}">
                <div class="notif-icon" style="${n.type=='alert'?'color:var(--danger-color); background:rgba(230,57,70,0.1);':''}"><span class="material-icons-outlined">info</span></div>
                <div class="notif-content">
                    <h4>${n.title}</h4>
                    <p>${n.desc}</p>
                </div>
                <button class="mark-read-btn" onclick="marcarLido(${n.id})" title="Marcar como lido">
                    <span class="material-icons-outlined">check_circle</span>
                </button>
            </div>
        `;
    });
}

window.marcarLido = function(id) {
    document.getElementById(`notif-${id}`).style.display = 'none';
}

function renderPlan(tema, horarioStr, autor, isMine, materiais = '', salaRetirada = '', dia = '', local = '', tempoPreparo = '15', turma = '') {
    const grid = document.getElementById('plans-grid');
    if(!grid) return;
    
    // Convert arrays or undefined strings safely
    const matsStr = materiais || 'Nenhum';
    const salaRetiradaStr = salaRetirada || 'N/A';
    const turmaStr = turma || 'N/A';
    
    const editBtn = isMine ? `<button class="action-btn outline" style="flex:1;">Editar Ficha</button> <button class="action-btn outline" style="flex:1; border-color:var(--danger-color); color:var(--danger-color);" onclick="finalizarAula('${matsStr}', '${salaRetiradaStr}')">Finalizar Aula</button>` : `<button class="action-btn outline" style="width:100%;" onclick="visualizarPlano('${tema}', '${autor}', '${horarioStr}', '${dia}', '${local}', '${matsStr}', '${salaRetiradaStr}', '${tempoPreparo}', '${turmaStr}')">Visualizar Detalhes</button>`;
    
    let matInfo = materiais ? `<div style="font-size:13px; margin-top:16px; color:var(--text-secondary); line-height:1.6;"><strong>Materiais:</strong> ${materiais}<br><strong>Retirar de:</strong> ${salaRetirada}<br><strong>Tempo de Preparo:</strong> ${tempoPreparo} min</div>` : '';

    grid.innerHTML = `
        <div class="plan-card">
            <div class="plan-status-pill">Agendado</div>
            <h3 style="font-size:20px; color:var(--text-primary); margin-bottom:12px; margin-right:80px;">${tema}</h3>
            
            <div style="font-size:14px; color:var(--text-secondary); display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">person</span> ${autor}</div>
                ${dia ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">calendar_today</span> ${dia}</div>` : ''}
                ${local ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">place</span> ${local}</div>` : ''}
                ${turma ? `<div style="display:flex; align-items:center; gap:6px; color: var(--primary-color); font-weight:600;"><span class="material-icons-outlined" style="font-size:16px;">groups</span> ${turma}</div>` : ''}
            </div>
            
            ${matInfo}
            
            <div class="plan-time-box">
                <span class="material-icons-outlined">schedule</span> ${horarioStr}
            </div>
            
            <div class="plan-actions" style="display:flex; gap:12px;">
                ${editBtn}
            </div>
        </div>
    ` + grid.innerHTML;
}

window.finalizarAula = function(materiais, sala) {
    if(confirm('Deseja finalizar esta aula?')) {
        alert(`Aula finalizada! Lembre-se de retornar os materiais: ${materiais} para a origem: ${sala}.`);
        notificacoes.unshift({ id: Date.now(), title: 'Retorno de Material', desc: `Devolva os materiais para: ${sala}.`, type: 'alert' });
        renderNotificacoes();
    }
}

window.visualizarPlano = function(tema, autor, horario, dia, local, materiais, salaRetirada, tempoPreparo, turma) {
    const content = document.getElementById('detalhe-plano-content');
    content.innerHTML = `
        <h4 style="color: var(--primary-color); font-size: 18px; margin-bottom: 12px;">${tema}</h4>
        <p><strong>Professor:</strong> ${autor}</p>
        <p><strong>Turma:</strong> ${turma || 'N/A'}</p>
        <p><strong>Data:</strong> ${dia || 'N/A'}</p>
        <p><strong>Horário:</strong> ${horario}</p>
        <p><strong>Local (Sala):</strong> ${local || 'N/A'}</p>
        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 16px 0;">
        <p><strong>Materiais Agendados:</strong><br> ${materiais}</p>
        <p><strong>Sala de Retirada Inicial:</strong> ${salaRetirada}</p>
        <p><strong>Tempo Previsto de Preparo:</strong> ${tempoPreparo} minutos</p>
    `;
    openModal('detalhe-plano-modal');
}

window.baixarPdfBoletim = function(id, tipo, material, autor, data) {
    const pdfContent = `
        <html>
        <head>
            <title>Boletim \${id}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                h1 { color: #4361ee; }
                .info { margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>Boletim de Ocorrência - SenaiVest</h1>
            <hr>
            <div class="info"><strong>ID do Boletim:</strong> ${id}</div>
            <div class="info"><strong>Tipo:</strong> ${tipo}</div>
            <div class="info"><strong>Material Envolvido:</strong> ${material}</div>
            <div class="info"><strong>Autor do Registro:</strong> ${autor}</div>
            <div class="info"><strong>Data do Registro:</strong> ${data}</div>
            <br>
            <p>Este é um documento gerado automaticamente pelo sistema SenaiVest.</p>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

window.renderAcompanhamento = function() {
    const tbody = document.getElementById('acompanhamento-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    mockAcompanhamento.forEach(a => {
        let actionBtn = `<button class="secondary-btn" style="padding: 4px 12px;" onclick="alert('Registrar observação pedagógica')">Observação</button>`;
        
        if (a.ocorrencia) {
            actionBtn = `<button style="background: var(--danger-color); color: white; border: none; border-radius: 8px; padding: 6px 12px; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;" onclick="alert('Visualizar detalhes do Boletim: ${a.ocorrencia}')"><span class="material-icons-outlined" style="font-size:14px;">gavel</span> ${a.ocorrencia}</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${a.turma}</td>
                <td><strong>${a.aluno}</strong></td>
                <td>${a.plano}</td>
                <td><span class="status ${a.statusClass}">${a.iÍndice}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

window.registrarTurma = function() {
    const nomeTurma = prompt('Digite o nome da nova Turma (ex: Vestuário - Manhã):');
    if (!nomeTurma) return;
    
    const professorResponsavel = prompt('Digite o nome do Professor responsável:');
    if (!professorResponsavel) return;

    // Enviar para o Google
    enviarParaPlanilhaGoogle({
        tipoCadastro: 'Turma',
        nomeTurma: nomeTurma,
        professor: professorResponsavel
    });

    alert('Turma "' + nomeTurma + '" enviada para a planilha na aba TURMAS com sucesso!');
}

window.renderProfessoresGrid = function() {
    const grid = document.getElementById('professores-grid-container');
    if (!grid) return;
    grid.innerHTML = '';
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    
    grid.innerHTML += `<div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);"><div class="mon-dash-icon" style="background:#e0f2fe; color:#0284c7;"><span class="material-icons-outlined">person</span></div> <div>Prof. Roberto<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Em Aula (Laboratório Maker)</span></div></div>`;
    grid.innerHTML += `<div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);"><div class="mon-dash-icon" style="background:#fef08a; color:#ca8a04;"><span class="material-icons-outlined">person</span></div> <div>Prof. Clara<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Em Aula (Sala 01 - Modelagem)</span></div></div>`;

    for (const [id, user] of Object.entries(users)) {
        if (user.role === 'Professor' || user.role === 'professor') {
            grid.innerHTML += `
            <div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);">
                <div class="mon-dash-icon" style="background:#f3f4f6; color:#9ca3af;">
                    <span class="material-icons-outlined">person</span>
                </div>
                <div>${user.nome}<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Fora de Aula</span></div>
            </div>`;
        }
    }
}

window.toggleAcompanhamentoView = function(view) {
    if (view === 'turmas') {
        document.getElementById('acompanhamento-turmas-view').style.display = 'block';
        document.getElementById('acompanhamento-professores-view').style.display = 'none';
    } else {
        document.getElementById('acompanhamento-turmas-view').style.display = 'none';
        document.getElementById('acompanhamento-professores-view').style.display = 'block';
    }
}

window.openSolicitarModal = function(preselectCod = null) {
    const prodSelect = document.getElementById('transfer-produto');
    prodSelect.innerHTML = '';
    mockMateriais.forEach(m => {
        prodSelect.innerHTML += `<option value="${m.cod}" data-preco="${m.preco}" data-qtd="${m.qtd}" data-almox="${m.almoxAtual}">${m.cod} - ${m.nome}</option>`;
    });
    if(preselectCod) {
        prodSelect.value = preselectCod;
    }
    
    // Atualizar as infos visuais
    updateTransferInfo();
    
    document.getElementById('transfer-tipo').value = 'simples';
    toggleTransferTipo();
    openModal('transferir-modal');
}

window.updateTransferInfo = function() {
    const prodSelect = document.getElementById('transfer-produto');
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    if(selectedOpt) {
        const qtd = selectedOpt.getAttribute('data-qtd');
        const almox = selectedOpt.getAttribute('data-almox');
        document.getElementById('transfer-info-qtd').innerText = `${qtd} UN (Local: ${almox})`;
        document.getElementById('transfer-info-preco').innerText = selectedOpt.getAttribute('data-preco');
    }
}

window.confirmarTransferencia = function() {
    const prodSelect = document.getElementById('transfer-produto');
    const cod = prodSelect.value;
    const qtdStr = document.getElementById('transfer-qtd').value;
    const destino = document.getElementById('transfer-destino').value;
    
    if(!qtdStr || parseInt(qtdStr) <= 0) {
        alert("Insira uma quantidade válida.");
        return;
    }
    
    const qtdReq = parseInt(qtdStr);
    const material = mockMateriais.find(m => m.cod === cod);
    
    if(material) {
        if(qtdReq > material.qtd) {
            alert("Quantidade solicitada excede o estoque disponível!");
            return;
        }
        
        material.qtd -= qtdReq;
        
        // Simular a criação do novo item na sala de destino (ou atualizar existente se já houver)
        let existente = mockMateriais.find(m => m.cod === cod && m.almoxAtual === destino);
        if(existente && existente !== material) {
            existente.qtd += qtdReq;
        } else {
            mockMateriais.push({
                ...material,
                qtd: qtdReq,
                almoxAtual: destino
            });
        }
        
        alert("Transferência realizada com sucesso!");
        closeModal('transferir-modal');
    }
}

window.toggleTransferTipo = function() {
    const tipo = document.getElementById('transfer-tipo').value;
    if (tipo === 'plano') {
        document.getElementById('transfer-simples-fields').style.display = 'none';
        document.getElementById('transfer-plano-fields').style.display = 'block';
    } else {
        document.getElementById('transfer-simples-fields').style.display = 'block';
        document.getElementById('transfer-plano-fields').style.display = 'none';
    }
}

window.confirmarSolicitacao = function() {
    const tipo = document.getElementById('transfer-tipo').value;
    const prodSelect = document.getElementById('transfer-produto');
    const prodNome = prodSelect.options[prodSelect.selectedIndex].text;
    const prodCod = prodSelect.value;
    const qtdStr = document.getElementById('transfer-qtd').value;
    const qtdTransf = parseInt(qtdStr, 10);
    
    // Achar o material na base mockada
    const matIndex = mockMateriais.findIndex(m => m.cod === prodCod);
    if(matIndex !== -1) {
        if(qtdTransf > mockMateriais[matIndex].qtd) {
            alert('Quantidade insuficiente em estoque!');
            return;
        }
    }
    
    if (tipo === 'plano') {
        const planoSelect = document.getElementById('transfer-plano-select');
        const planoNome = planoSelect.options[planoSelect.selectedIndex].text;
        
        if(matIndex !== -1) {
            mockMateriais[matIndex].qtd -= qtdTransf;
        }
        
        alert(`O material "${prodNome}" (Qtd: ${qtdTransf}) foi vinculado automaticamente ao plano de aula:\n${planoNome}\n\nEstoque atualizado.`);
    } else {
        const destino = document.getElementById('transfer-destino').value;
        
        if(matIndex !== -1) {
            mockMateriais[matIndex].qtd -= qtdTransf;
            
            // Adicionar para a sala de destino
            let matOrig = mockMateriais[matIndex];
            let matDest = mockMateriais.find(m => m.cod === prodCod && m.almoxAtual === destino);
            if(matDest && matDest !== matOrig) {
                matDest.qtd += qtdTransf;
            } else {
                mockMateriais.push({
                    ...matOrig,
                    qtd: qtdTransf,
                    almoxAtual: destino
                });
            }
        }
        
        alert(`Transferência simples efetuada!\nMaterial: "${prodNome}"\nQuantidade: ${qtdTransf}\nDestino: ${destino}`);
    }
    
    // Atualizar a renderização da sala atual se ela estiver visível
    const nomeSala = document.getElementById('detalhe-nome').innerText;
    if(nomeSala) {
        renderMateriaisSala(nomeSala);
    }
    
    closeModal('transferir-modal');
}

// ---- Inteligência Artificial Senaivest ----
window.toggleAIChat = function() {
    document.getElementById('ai-chat-window').classList.toggle('active');
}

window.handleAIKey = function(e) {
    if(e.key === 'Enter') sendAIMessage();
}

window.sendAIMessage = function() {
    const input = document.getElementById('ai-input');
    const text = input.value.trim();
    if(!text) return;
    
    const chatBody = document.getElementById('ai-chat-messages');
    chatBody.innerHTML += `<div class="ai-msg ai-msg-user">${text}</div>`;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    
    // Simula atraso da IA pensando
    setTimeout(() => {
        let reply = "Ainda estou aprendendo! Mas posso te ajudar a usar a plataforma. Tente perguntar sobre 'como cadastrar um boletim', 'salas', 'planos de aula' ou 'onde ver os relatórios'.";
        let lower = text.toLowerCase();
        
        if(lower.includes('produto') || lower.includes('cadastrar') || lower.includes('novo material')) {
            reply = "Para cadastrar um novo produto, acesse a aba 'Almoxarifados' (se for Coordenação) e clique no botão roxo 'Cadastrar Produto'.";
        } else if(lower.includes('boletim') || lower.includes('processo') || lower.includes('ocorrência') || lower.includes('avaria') || lower.includes('roubo')) {
            reply = "Para registrar uma ocorrência (Avaria, Roubo, Perda, Reposição), clique no botão azul flutuante '+' no canto inferior direito e escolha 'Novo Boletim'. Lá você selecionará a temática nos novos cards visuais.";
        } else if(lower.includes('sala') || lower.includes('monitoramento') || lower.includes('ocupada')) {
            reply = "Acesse a aba 'Monitoramento' no menu lateral para visualizar nosso novo dashboard numérico em tempo real de quais salas estão Ocupadas, Disponíveis ou Agendadas.";
        } else if(lower.includes('plano') || lower.includes('aula') || lower.includes('agendar')) {
            reply = "Você pode registrar novos Planos de Aula clicando no botão azul flutuante '+'. No esqueça: ao finalizar sua aula na aba Planos de Aula, clique em 'Finalizar Aula' para notificar o sistema sobre a devolução dos materiais físicos.";
        } else if(lower.includes('pdf') || lower.includes('baixar')) {
            reply = "Nossa plataforma já permite baixar os Boletins em PDF! Vá na aba 'Meus Boletins' (ou Processos) e clique no botão branco 'Baixar PDF' dentro do card do seu processo.";
        }
        
        chatBody.innerHTML += `<div class="ai-msg ai-msg-bot">${reply}</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 800);
}

window.openModal = function(modalId) {
    document.getElementById(modalId).classList.add('active');
}

window.openPlanoModal = function() {
    const pLocal = document.getElementById('p-local');
    if(pLocal) {
        pLocal.innerHTML = '<option value="">Selecione a sala...</option>';
        mockSalas.forEach(s => {
            pLocal.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    }
    const pMat = document.getElementById('p-mat');
    if(pMat) {
        pMat.innerHTML = '';
        mockMateriais.forEach(m => {
            pMat.innerHTML += `<option value="${m.cod}" data-sala="${m.almoxAtual}">${m.cod} - ${m.nome} (Local: ${m.almoxAtual})</option>`;
        });
    }
    openModal('plano-modal');
}

window.updateProfilePic = function(event) {
    const file = event.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const dataUrl = e.target.result;
            document.getElementById('profile-avatar-large').innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            document.getElementById('sidebar-avatar').innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            
            const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
            if(users[currentUser.id]) {
                users[currentUser.id].foto = dataUrl;
            } else {
                users[currentUser.id] = { id: currentUser.id, foto: dataUrl };
            }
            localStorage.setItem('senaivest_users', JSON.stringify(users));

            // Salvar foto no Cloud Firestore
            if (db && currentUser.id) {
                try {
                    await db.collection('usuarios').doc(currentUser.id).set({ foto: dataUrl }, { merge: true });
                    console.log("Foto de perfil sincronizada no Firestore!");
                } catch(fsErr) {
                    console.warn("Aviso ao salvar foto no Firestore:", fsErr.message);
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

// Modal de Edição de Dados do Perfil
window.openEditarPerfilModal = function() {
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const u = users[currentUser.id] || currentUser;
    document.getElementById('edit-perfil-nome').value = u.nome || currentUser.nome || '';
    document.getElementById('edit-perfil-escola').value = u.escola || currentUser.escola || 'SENAI Centro de Formação Cândido Atahyde';
    document.getElementById('edit-perfil-email').value = u.email || currentUser.email || '';
    const tInput = document.getElementById('edit-perfil-turma');
    if (tInput) tInput.value = u.turma || currentUser.turma || 'Vestuário e Estilismo - Manhã';
    const idInput = document.getElementById('edit-perfil-idade');
    if (idInput) idInput.value = u.idade || currentUser.idade || '19';
    const sInput = document.getElementById('edit-perfil-sexo');
    if (sInput) sInput.value = u.sexo || currentUser.sexo || 'Masculino';
    const rInput = document.getElementById('edit-perfil-raca');
    if (rInput) rInput.value = u.raca || currentUser.raca || 'Parda';
    document.getElementById('edit-perfil-senha').value = '';
    openModal('editar-perfil-modal');
};

window.salvarEdicaoPerfil = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-perfil');
    const originalText = btn ? btn.innerText : 'Salvar Alterações no Firebase';
    if (btn) { btn.innerText = 'Salvando no Firebase...'; btn.disabled = true; }

    const nome = document.getElementById('edit-perfil-nome').value.trim();
    const escola = document.getElementById('edit-perfil-escola').value.trim();
    const email = document.getElementById('edit-perfil-email').value.trim();
    const novaSenha = document.getElementById('edit-perfil-senha').value;

    const updates = {
        nome: nome,
        escola: escola,
        email: email
    };
    if (novaSenha) updates.senha = novaSenha;

    // Atualizar no Firestore
    let salvoNoFirebase = false;
    if (db && currentUser.id) {
        try {
            await db.collection('usuarios').doc(currentUser.id).set(updates, { merge: true });
            salvoNoFirebase = true;
        } catch(err) {
            console.warn("Aviso ao atualizar perfil no Firestore:", err.message);
        }
    }

    // Atualizar no localStorage
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    if (users[currentUser.id]) {
        users[currentUser.id] = { ...users[currentUser.id], ...updates };
    } else {
        users[currentUser.id] = { id: currentUser.id, role: currentUser.role, ...updates };
    }
    localStorage.setItem('senaivest_users', JSON.stringify(users));

    currentUser.nome = nome;
    currentUser.escola = escola;
    currentUser.email = email;
    sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));

    initApp();
    closeModal('editar-perfil-modal');
    alert(salvoNoFirebase ? 'Perfil atualizado e sincronizado no Firebase com sucesso!' : 'Perfil atualizado com sucesso!');
    if (btn) { btn.innerText = originalText; btn.disabled = false; }
};

window.closeModal = function(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
};

// ==========================================
// RECUPERAÇÃO DE CONTA (ID E SENHA) COM FIREBASE
// ==========================================
window.openRecuperarIdModal = function() {
    const activeRole = document.getElementById('login-role')?.value || 'Professor';
    const inputTermo = document.getElementById('rec-termo-id');
    if (inputTermo) inputTermo.value = '';

    const badgeText = document.getElementById('rec-id-role-text');
    if (badgeText) badgeText.innerText = activeRole;
    const badgeDesc = document.getElementById('rec-id-role-desc');
    if (badgeDesc) badgeDesc.innerText = activeRole;

    const badgeBox = document.getElementById('rec-id-role-badge');
    if (badgeBox) {
        if (activeRole === 'Coordenação') {
            badgeBox.style.background = 'rgba(114, 9, 183, 0.1)';
            badgeBox.style.color = 'var(--coord-color)';
        } else if (activeRole === 'Aluno') {
            badgeBox.style.background = 'rgba(247, 37, 133, 0.1)';
            badgeBox.style.color = 'var(--accent-color)';
        } else {
            badgeBox.style.background = 'rgba(67, 97, 238, 0.1)';
            badgeBox.style.color = 'var(--primary-color)';
        }
    }

    const res = document.getElementById('resultado-recuperar-id');
    if (res) { res.style.display = 'none'; res.innerHTML = ''; }
    openModal('recuperar-id-modal');
};

window.openRecuperarSenhaModal = function() {
    const activeRole = document.getElementById('login-role')?.value || 'Professor';
    const loginId = document.getElementById('login-id');
    const recId = document.getElementById('rec-id-senha');
    if (recId) recId.value = (loginId && loginId.value) ? loginId.value : '';
    const recNova = document.getElementById('rec-nova-senha');
    if (recNova) recNova.value = '';

    const badgeText = document.getElementById('rec-senha-role-text');
    if (badgeText) badgeText.innerText = activeRole;
    const badgeDesc = document.getElementById('rec-senha-role-desc');
    if (badgeDesc) badgeDesc.innerText = activeRole;

    const badgeBox = document.getElementById('rec-senha-role-badge');
    if (badgeBox) {
        if (activeRole === 'Coordenação') {
            badgeBox.style.background = 'rgba(114, 9, 183, 0.1)';
            badgeBox.style.color = 'var(--coord-color)';
        } else if (activeRole === 'Aluno') {
            badgeBox.style.background = 'rgba(247, 37, 133, 0.1)';
            badgeBox.style.color = 'var(--accent-color)';
        } else {
            badgeBox.style.background = 'rgba(67, 97, 238, 0.1)';
            badgeBox.style.color = 'var(--primary-color)';
        }
    }

    openModal('recuperar-senha-modal');
};

window.buscarIdUsuario = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-buscar-id');
    const originalText = btn ? btn.innerText : 'Consultar no Firebase';
    if (btn) { btn.innerText = 'Consultando no Firebase...'; btn.disabled = true; }

    const termo = document.getElementById('rec-termo-id').value.trim().toLowerCase();
    const resDiv = document.getElementById('resultado-recuperar-id');
    const activeRole = document.getElementById('login-role')?.value || 'Professor';

    try {
        let achados = [];
        let contaDeOutroPerfil = null;

        // Função de correspondência estrita e segura por E-mail ou Matrícula
        const verificarMatchUsuario = (u, docId) => {
            if (!u) return;
            const email = (u.email || '').toLowerCase().trim();
            const matricula = (u.matricula || '').toLowerCase().trim();
            const id = (docId || u.id || '').toLowerCase().trim();
            const role = (u.role || '').trim();

            // O termo precisa bater exatamente com o e-mail OU com a matrícula (ou ID único)
            const bateEmail = email && (email === termo);
            const bateMatricula = matricula && (matricula === termo);
            const bateId = id && (id === termo);

            if (bateEmail || bateMatricula || bateId) {
                // Validação estrita do Perfil Selecionado
                if (role.toLowerCase() === activeRole.toLowerCase()) {
                    achados.push({ id: docId || u.id, ...u });
                } else {
                    contaDeOutroPerfil = { role: u.role, nome: u.nome };
                }
            }
        };

        // 1. Consultar no Firestore Cloud
        if (db) {
            try {
                const snapshot = await db.collection('usuarios').get();
                snapshot.forEach(doc => {
                    verificarMatchUsuario(doc.data(), doc.id);
                });
            } catch(fsErr) {
                console.warn("Consulta no Firestore:", fsErr.message);
            }
        }

        // 2. Fallback / Complemento do cache local e contas padrão
        const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        for (const [id, u] of Object.entries(users)) {
            if (!achados.some(a => a.id === id)) {
                verificarMatchUsuario(u, id);
            }
        }
        for (const [id, u] of Object.entries(DEFAULT_SYSTEM_USERS)) {
            if (!achados.some(a => a.id === id)) {
                verificarMatchUsuario(u, id);
            }
        }

        resDiv.style.display = 'block';

        if (achados.length > 0) {
            const u = achados[0];
            resDiv.style.background = 'rgba(16, 185, 129, 0.08)';
            resDiv.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            resDiv.innerHTML = `
                <div style="font-size:13px; color:#059669; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <span class="material-icons-outlined" style="font-size:16px;">verified</span> Conta de ${activeRole} Autenticada!
                </div>
                <div style="font-size:14px; font-weight:700; color:var(--text-primary);">${u.nome || 'Usuário'}</div>
                <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
                    Perfil: <strong style="color:var(--primary-color);">${u.role}</strong> &bull; Matrícula: <strong>${u.matricula || u.id}</strong>
                </div>
                <div style="margin-top:12px; padding:12px; background:white; border-radius:8px; border:1px solid rgba(16, 185, 129, 0.3); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:11px; color:var(--text-secondary); display:block; font-weight:600;">SEU ID DE ACESSO:</span>
                        <strong style="font-size:18px; color:var(--primary-color); letter-spacing:1px;">${u.id}</strong>
                    </div>
                    <button type="button" class="primary-btn" onclick="usarIdRecuperado('${u.id}', '${u.role || ''}')" style="padding:8px 16px; font-size:12.5px; border-radius:6px; font-weight:700;">
                        Usar e Entrar
                    </button>
                </div>
            `;
        } else if (contaDeOutroPerfil) {
            // Tentativa de consulta de ID pertencente a outro perfil (ex: professor buscando coordenador ou vice-versa)
            resDiv.style.background = 'rgba(239, 68, 68, 0.08)';
            resDiv.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            resDiv.innerHTML = `
                <div style="font-size:13px; color:#dc2626; font-weight:700; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <span class="material-icons-outlined" style="font-size:18px;">lock_clock</span> Restrição de Segurança: Perfil Incompatível
                </div>
                <p style="font-size:12.5px; color:#b91c1c; margin:0; line-height:1.5;">
                    O e-mail ou matrícula informado pertence a uma conta de <strong>${contaDeOutroPerfil.role}</strong> e não pode ser consultado a partir do perfil de <strong>${activeRole}</strong>.
                </p>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:8px; line-height:1.4;">
                    👉 <em>Para acessar essa conta, feche esta janela, volte à tela inicial de login e selecione o perfil <strong>${contaDeOutroPerfil.role}</strong>.</em>
                </p>
            `;
        } else {
            resDiv.style.background = 'rgba(239, 68, 68, 0.08)';
            resDiv.style.border = '1px solid rgba(239, 68, 68, 0.25)';
            resDiv.innerHTML = `
                <div style="font-size:13px; color:#dc2626; font-weight:600; display:flex; align-items:center; gap:6px;">
                    <span class="material-icons-outlined" style="font-size:16px;">error_outline</span> Nenhum ${activeRole} localizado.
                </div>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px; line-height:1.4;">
                    Nenhum cadastro do perfil <strong>${activeRole}</strong> foi encontrado com o e-mail ou matrícula <em>"${termo}"</em>. Verifique se digitou o e-mail cadastrado ou o número de matrícula correto.
                </p>
            `;
        }
    } catch (err) {
        console.error("Erro na busca de ID:", err);
        resDiv.style.display = 'block';
        resDiv.style.background = 'rgba(239, 68, 68, 0.08)';
        resDiv.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        resDiv.innerHTML = '<div style="font-size:13px; color:#dc2626;">Erro temporário ao consultar. Tente novamente em instantes.</div>';
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
};

window.redefinirSenhaUsuario = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-redefinir-senha');
    const originalText = btn ? btn.innerText : 'Atualizar Senha no Firebase';
    if (btn) { btn.innerText = 'Atualizando no Firebase...'; btn.disabled = true; }

    const idStr = document.getElementById('rec-id-senha').value.toUpperCase().trim();
    const novaSenha = document.getElementById('rec-nova-senha').value;
    const activeRole = document.getElementById('login-role')?.value || 'Professor';

    try {
        let encontrado = false;
        let roleIncompativel = false;

        // 1. Atualizar no Cloud Firestore
        if (db) {
            try {
                const docRef = db.collection('usuarios').doc(idStr);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const uData = docSnap.data();
                    if ((uData.role || '').toLowerCase() === activeRole.toLowerCase()) {
                        await docRef.set({ 
                            senha: novaSenha,
                            atualizadoEm: new Date().toISOString()
                        }, { merge: true });
                        encontrado = true;
                        console.log("Senha atualizada no Firestore para:", idStr);
                    } else {
                        roleIncompativel = uData.role;
                    }
                }
            } catch(fsErr) {
                console.warn("Aviso ao atualizar senha no Firestore:", fsErr.message);
            }
        }

        // 2. Atualizar no cache Local se não bloqueado
        if (!roleIncompativel) {
            const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
            if (users[idStr]) {
                if ((users[idStr].role || '').toLowerCase() === activeRole.toLowerCase()) {
                    users[idStr].senha = novaSenha;
                    localStorage.setItem('senaivest_users', JSON.stringify(users));
                    encontrado = true;
                } else {
                    roleIncompativel = users[idStr].role;
                }
            }
        }

        if (roleIncompativel) {
            alert(`⚠️ Operação Bloqueada por Segurança:

O ID "${idStr}" pertence ao perfil "${roleIncompativel}" e não pode ser redefinido a partir da área de "${activeRole}". Volte à tela inicial e selecione o perfil correto.`);
            return;
        }

        if (encontrado) {
            alert(`🎉 Senha atualizada com sucesso no Firebase para o usuário ${idStr} (${activeRole})!

Agora você já pode fazer login normalmente com sua nova senha.`);
            closeModal('recuperar-senha-modal');
            const passInput = document.getElementById('login-senha');
            if (passInput) passInput.value = novaSenha;
        } else {
            alert(`Não localizamos nenhum usuário do perfil "${activeRole}" com o ID "${idStr}". Verifique se o ID está correto ou utilize a opção "Esqueceu o ID?" informando seu e-mail ou matrícula.`);
        }
    } catch(err) {
        console.error("Erro ao redefinir senha:", err);
        alert("Erro ao conectar com o Firebase. Tente novamente.");
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
};

window.usarIdRecuperado = function(id, role) {
    closeModal('recuperar-id-modal');
    if (typeof selectLoginProfile === 'function' && role) {
        selectLoginProfile(role);
    }
    const inputId = document.getElementById('login-id');
    if (inputId) {
        inputId.value = id;
        const senhaInput = document.getElementById('login-senha');
        if (senhaInput) senhaInput.focus();
    }
};

window.redefinirSenhaUsuario = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-redefinir-senha');
    const originalText = btn ? btn.innerText : 'Atualizar Senha no Firebase';
    if (btn) { btn.innerText = 'Atualizando no Firebase...'; btn.disabled = true; }

    const idStr = document.getElementById('rec-id-senha').value.toUpperCase().trim();
    const novaSenha = document.getElementById('rec-nova-senha').value;

    try {
        let encontrado = false;

        // 1. Atualizar no Cloud Firestore
        if (db) {
            try {
                const docRef = db.collection('usuarios').doc(idStr);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    await docRef.set({ 
                        senha: novaSenha,
                        atualizadoEm: new Date().toISOString()
                    }, { merge: true });
                    encontrado = true;
                    console.log("Senha atualizada no Firestore para:", idStr);
                }
            } catch(fsErr) {
                console.warn("Aviso ao atualizar senha no Firestore:", fsErr.message);
            }
        }

        // 2. Atualizar no LocalStorage
        const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        if (users[idStr]) {
            users[idStr].senha = novaSenha;
            localStorage.setItem('senaivest_users', JSON.stringify(users));
            encontrado = true;
        }

        if (encontrado) {
            alert(`Senha do ID (${idStr}) atualizada com sucesso no Firebase!\n\nVocê já pode entrar utilizando sua nova senha.`);
            closeModal('recuperar-senha-modal');
            const senhaInput = document.getElementById('login-senha');
            if (senhaInput) senhaInput.value = novaSenha;
            const idInput = document.getElementById('login-id');
            if (idInput) idInput.value = idStr;
        } else {
            alert(`O ID (${idStr}) não foi encontrado.\n\nUtilize a opção 'Esqueceu o ID?' para localizar seu identificador ou procure a Coordenação.`);
        }
    } catch(err) {
        console.error("Erro ao redefinir senha:", err);
        alert("Ocorreu um erro ao redefinir a senha. Tente novamente.");
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
};

window.logout = function() {
    sessionStorage.removeItem('senaivest_session');
    if (auth) {
        auth.signOut().catch(() => {}).finally(() => {
            document.getElementById('app-container')?.classList.remove('active');
            document.getElementById('login-screen')?.classList.add('active');
            document.getElementById('login-form')?.reset();
        });
    } else {
        document.getElementById('app-container')?.classList.remove('active');
        document.getElementById('login-screen')?.classList.add('active');
        document.getElementById('login-form')?.reset();
    }
};

// Categorias de Boletins e Formulário Dinâmico
const boletimCategories = [
    { id: 'roubo', title: 'Roubo', icon: 'gavel', desc: 'Material subtraído mediante ameaça/violência' },
    { id: 'furto', title: 'Furto', icon: 'search_off', desc: 'Material desaparecido sem violência' },
    { id: 'avaria', title: 'Avaria', icon: 'broken_image', desc: 'Material danificado/quebrado' },
    { id: 'reparo', title: 'Reparo / Manutenção', icon: 'build', desc: 'Solicitação de conserto de equipamento' },
    { id: 'reposicao', title: 'Reposição de Produtos', icon: 'inventory_2', desc: 'Solicitação de novos materiais' },
    { id: 'extravio', title: 'Extravio', icon: 'not_listed_location', desc: 'Material perdido ou não localizado' },
    { id: 'nao_devolvido', title: 'Produto No Devolvido', icon: 'assignment_late', desc: 'Material retirado e não retornado no prazo' },
    { id: 'divergencia', title: 'Divergência de Estoque', icon: 'compare_arrows', desc: 'Diferença entre sistema e contagem física' },
    { id: 'outros', title: 'Outros', icon: 'more_horiz', desc: 'Ocorrências gerais não categorizadas' }
];

function renderBoletimCategories() {
    const grid = document.getElementById('boletins-categories-grid');
    if(!grid) return;
    grid.innerHTML = '';
    boletimCategories.forEach(cat => {
        grid.innerHTML += `
            <div class="boletim-cat-card" onclick="abrirFormularioBoletim('${cat.id}', '${cat.title}')">
                <div class="boletim-cat-icon">
                    <span class="material-icons-outlined">${cat.icon}</span>
                </div>
                <h3>${cat.title}</h3>
                <p>${cat.desc}</p>
            </div>
        `;
    });
}

window.abrirFormularioBoletim = function(catId, catTitle) {
    document.getElementById('boletim-form-title').innerText = 'Preencher Boletim - ' + catTitle;
    document.getElementById('bf-categoria').value = catTitle;
    
    const dynamicFields = document.getElementById('bf-dynamic-fields');
    let fieldsHtml = '';
    
    switch(catId) {
        case 'roubo':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group"><label>Horário aproximado do ocorrido</label><input type="time" required></div>
                    <div class="form-group"><label>Local específico da ocorrência</label><input type="text" placeholder="Ex: Armário do Lab 1" required></div>
                </div>
                <div class="form-group">
                    <label>Houve arrombamento ou violência física?</label>
                    <select required>
                        <option value="">Selecione...</option>
                        <option value="No">No</option>
                        <option value="Sim - arrombamento">Sim - arrombamento</option>
                        <option value="Sim - ameaça ou violência">Sim - ameaça ou violência</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Boletim de Ocorrência Policial registrado?</label>
                    <select required>
                        <option value="">Selecione...</option>
                        <option value="No">No</option>
                        <option value="Sim">Sim</option>
                        <option value="Em andamento">Em andamento</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Especificação de materiais e quantidades subtraídas</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
                <div class="form-group">
                    <label>Suspeitos ou envolvidos identificados</label>
                    <input type="text" placeholder="Deixe em branco se desconhecido">
                </div>
            `;
            break;
        case 'furto':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group"><label>Período/Data aproximada do desaparecimento</label><input type="text" placeholder="Ex: Entre manhã e noite de 14/06" required></div>
                    <div class="form-group"><label>ášltimo local visto</label><input type="text" placeholder="Ex: Prateleira 2" required></div>
                </div>
                <div class="form-group">
                    <label>Indícios de violação?</label>
                    <select required>
                        <option value="">Selecione...</option>
                        <option value="No, armários abertos">No, armários abertos</option>
                        <option value="Sim, gaveta ou porta forçada">Sim, gaveta ou porta forçada</option>
                        <option value="No aplicável">No aplicável</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Especificação de materiais e quantidades furtadas</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
            `;
            break;
        case 'avaria':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo de Avaria</label>
                        <select required>
                            <option value="">Selecione...</option>
                            <option value="Quebra física">Quebra física</option>
                            <option value="Rasgo/mancha">Rasgo/mancha</option>
                            <option value="Falha mecânica">Falha mecânica</option>
                            <option value="Dano químico">Dano químico</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Gravidade da avaria</label>
                        <select required>
                            <option value="">Selecione...</option>
                            <option value="Parcial/Consertável">Parcial/Consertável</option>
                            <option value="Total/Inutilizável">Total/Inutilizável</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Material ainda pode ser utilizado?</label>
                    <select required>
                        <option value="">Selecione...</option>
                        <option value="No">No</option>
                        <option value="Sim, com restrições">Sim, com restrições</option>
                        <option value="Sim, normalmente">Sim, normalmente</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nome do responsável pelo dano</label>
                    <select>
                        <option value="">Desconhecido / No se aplica</option>
                        <option value="João Silva">João Silva</option>
                        <option value="Maria Souza">Maria Souza</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Causa provável ou descrição da avaria</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
            `;
            break;
        case 'reparo':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group"><label>Material / Equipamento</label><input type="text" placeholder="Ex: Máquina reta modelo X" required></div>
                    <div class="form-group"><label>Prazo desejado para reparo</label><input type="text" placeholder="Ex: 5 dias úteis" required></div>
                </div>
                <div class="form-group">
                    <label>Descrição do problema / falha</label>
                    <textarea rows="3" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required placeholder="Sinais, contexto e defeito apresentado"></textarea>
                </div>
            `;
            break;
        case 'reposicao':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group"><label>Material para reposição</label><input type="text" placeholder="Ex: Linha de costura" required></div>
                    <div class="form-group"><label>Quantidade solicitada</label><input type="number" min="1" required></div>
                </div>
                <div class="form-group">
                    <label>Justificativa para reposição</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
            `;
            break;
        case 'extravio':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group"><label>Data em que foi sentida a falta</label><input type="date" required></div>
                    <div class="form-group"><label>Local provável de perda</label><input type="text" placeholder="Ex: Sala de modelagem" required></div>
                </div>
                <div class="form-group">
                    <label>Esforços de busca já realizados</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required placeholder="Quais armários, salas ou gavetas já foram inspecionadas"></textarea>
                </div>
                <div class="form-group">
                    <label>Especificação de materiais e quantidades perdidas</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
            `;
            break;
        case 'nao_devolvido':
            fieldsHtml = `
                <div class="form-group">
                    <label>Responsável pela retirada</label>
                    <select required>
                        <option value="">Selecione o aluno...</option>
                        <option value="João Silva">João Silva</option>
                        <option value="Maria Souza">Maria Souza</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Data de retirada</label><input type="date" required></div>
                    <div class="form-group"><label>Prazo de devolução original</label><input type="date" required></div>
                </div>
                <div class="form-group">
                    <label>Justificativa apresentada pelo responsável</label>
                    <input type="text" placeholder="Ex: Esqueceu em casa">
                </div>
                <div class="form-group">
                    <label>Materiais e quantidades pendentes de devolução</label>
                    <textarea rows="2" style="width:100%; padding:12px; border:1px solid var(--border-color); border-radius:8px;" required></textarea>
                </div>
            `;
            break;
        case 'divergencia':
            fieldsHtml = `
                <div class="form-row">
                    <div class="form-group">
                        <label>Quantidade Prevista no Sistema</label>
                        <input type="number" id="bf-qtd-prev" value="100" readonly style="background:#f4f4f4;">
                    </div>
                    <div class="form-group">
                        <label>Quantidade Física Real Encontrada</label>
                        <input type="number" id="bf-qtd-real" required oninput="document.getElementById('bf-dif').value = this.value - document.getElementById('bf-qtd-prev').value">
                    </div>
                    <div class="form-group">
                        <label>Diferença Identificada</label>
                        <input type="number" id="bf-dif" readonly style="background:#f4f4f4;">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Responsável pela contagem física</label>
                        <input type="text" value="${currentUser.nome}" readonly style="background:#f4f4f4;">
                    </div>
                    <div class="form-group">
                        <label>Data da contagem física</label>
                        <input type="date" required>
                    </div>
                </div>
                <p style="font-size:12px; color:var(--text-secondary);"><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle;">info</span> Ao enviar, o estoque será atualizado para refletir a contagem real.</p>
            `;
            break;
        case 'outros':
        default:
            break;
    }
    
    dynamicFields.innerHTML = fieldsHtml;
    nav('view-boletim-form');
};

function renderProfessoresGrid() {
    const grid = document.getElementById('professores-grid-container');
    if (!grid) return;
    grid.innerHTML = '';
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    
    // Add default mocked ones first
    grid.innerHTML += `<div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);"><div class="mon-dash-icon" style="background:#e0f2fe; color:#0284c7;"><span class="material-icons-outlined">person</span></div> <div>Prof. Roberto<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Em Aula (Laboratório Maker)</span></div></div>`;
    grid.innerHTML += `<div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);"><div class="mon-dash-icon" style="background:#fef08a; color:#ca8a04;"><span class="material-icons-outlined">person</span></div> <div>Prof. Clara<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Em Aula (Sala 01 - Modelagem)</span></div></div>`;

    // Loop local storage users
    for (const [id, user] of Object.entries(users)) {
        if (user.role === 'professor' || user.role === 'Professor') {
            grid.innerHTML += `
            <div class="mon-dash-item" style="flex: 1 1 calc(50% - 16px);">
                <div class="mon-dash-icon" style="background:#f3f4f6; color:#9ca3af;">
                    <span class="material-icons-outlined">person</span>
                </div>
                <div>${user.nome}<br><span style="font-size:12px; font-weight:normal; color:var(--text-secondary);">Fora de Aula</span></div>
            </div>`;
        }
    }
}





// --- DIÁRIO DE CLASSE ---
window.mockAlunosDiario = [
    { id: 'ALU-001', nome: 'João Silva', turma: 'Vestuário - Manhã', presente: false },
    { id: 'ALU-002', nome: 'Maria Souza', turma: 'Modelagem - Tarde', presente: false },
    { id: 'ALU-003', nome: 'Carlos Pereira', turma: 'Vestuário - Manhã', presente: false },
    { id: 'ALU-004', nome: 'Ana Beatriz', turma: 'Vestuário - Manhã', presente: false }
];

window.populateDiarioPlanos = function() {
    if(!window.mockPlanos) window.mockPlanos = [];
    const select = document.getElementById('diario-plano-select');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione...</option>';
    
    // Filter plans that belong to the current professor
    const professorPlanos = mockPlanos.filter(p => p.professor === currentUser.id);
    
    professorPlanos.forEach(p => {
        select.innerHTML += `<option value="${p.plano}">${p.plano} - ${p.horario}</option>`;
    });
};

window.renderDiarioAlunos = function() {
    const planoName = document.getElementById('diario-plano-select').value;
    const container = document.getElementById('diario-alunos-container');
    const grid = document.getElementById('diario-alunos-grid');
    
    if (!planoName) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    grid.innerHTML = '';
    
    let turmaAlvo = 'Vestuário - Manhã';
    if(planoName.includes('PLAN-105')) turmaAlvo = 'Modelagem - Tarde';
    
    const alunosTurma = window.mockAlunosDiario.filter(a => a.turma === turmaAlvo);
    
    if(alunosTurma.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary);">Nenhum aluno credenciado encontrado para esta turma.</p>';
        return;
    }
    
    alunosTurma.forEach(aluno => {
        const isChecked = aluno.presente ? 'checked' : '';
        grid.innerHTML += `
            <div class="aluno-card">
                <div class="aluno-info">
                    <h4>${aluno.nome}</h4>
                    <p>Matrícula: ${aluno.id}</p>
                </div>
                <div class="checkin-toggle">
                    <label class="switch">
                        <input type="checkbox" onchange="togglePresenca('${aluno.id}', this.checked)" ${isChecked}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    });
};

window.togglePresenca = function(alunoId, isPresente) {
    const aluno = window.mockAlunosDiario.find(a => a.id === alunoId);
    if(aluno) {
        aluno.presente = isPresente;
        console.log(`Presença do aluno ${aluno.nome} salva: ${isPresente}`);
    }
};

window.renderMeusQRCodes = function() {
    const grid = document.getElementById('meus-qrcodes-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if (window.mockPlanos) {
        window.mockPlanos.forEach(p => {
            const isLiberado = p.liberado !== false;
            const qrData = {
                id: p.id,
                tema: p.plano,
                mats: p.materiais || 'Nenhum',
                transfers: p.transfers || 'Nenhuma'
            };
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrData))}`;
            
            grid.innerHTML += `
                <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; text-align: center; box-shadow: var(--shadow-sm);">
                    <h3 style="margin-bottom: 8px; color: var(--text-primary); font-size: 18px;">${p.plano}</h3>
                    <div style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: rgba(11, 35, 65, 0.1); color: var(--primary-color); font-size: 12px; font-weight: 700; margin-bottom: 20px;">
                        Apresente na Catraca
                    </div>
                    
                    <div style="background: #ffffff; padding: 16px; border-radius: 8px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                        <img src="${qrUrl}" alt="QR Code ${p.plano}" style="width: 160px; height: 160px; display: block; margin: 0 auto;">
                    </div>
                    
                    <div style="text-align: left; background: var(--bg-body); padding: 16px; border-radius: 8px; font-size: 13px; border: 1px solid var(--border-color);">
                        <p style="margin-bottom: 6px; color: var(--text-secondary);"><strong>Materiais:</strong> ${p.materiais || 'Nenhum'}</p>
                        <p style="color: var(--text-secondary);"><strong>Transferências:</strong> ${p.transfers || 'Nenhuma'}</p>
                    </div>
                    
                    ${!isLiberado ? `<div style="margin-top: 12px; color: var(--danger-color); font-size: 11px; font-weight: 600;"><span class="material-icons-outlined" style="font-size: 14px; vertical-align: text-bottom;">warning</span> ATENÇÃO: Catraca não irá liberar</div>` : ''}
                </div>
            `;
        });
    }
};

window.renderPlanosGeral = function() {
    const grid = document.getElementById('plans-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    document.getElementById('planos-title').innerText = "Liberação de Planos e Acessos";
    const btnNovaFicha = document.getElementById('btn-nova-ficha');
    if(btnNovaFicha) btnNovaFicha.style.display = 'none';
    
    if (window.mockPlanos) {
        window.mockPlanos.forEach(p => {
            grid.innerHTML += `
                <div class="plan-card" style="border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; background: var(--bg-surface);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="font-size:12px; font-weight:bold; color:var(--text-secondary);">${p.id}</span>
                        <span style="font-size:12px; font-weight:bold; color:var(--primary-color);">GERADO</span>
                    </div>
                    <h3 style="margin-bottom:8px; color:var(--text-primary); font-size:16px;">${p.plano}</h3>
                    <p style="margin-bottom:4px; font-size:13px; color:var(--text-secondary);"><strong>Materiais:</strong> ${p.materiais || 'Nenhum'}</p>
                    <p style="margin-bottom:16px; font-size:13px; color:var(--text-secondary);"><strong>Transferências:</strong> ${p.transfers || 'Nenhuma'}</p>
                    <p style="font-size:12px; color:var(--text-secondary);"><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle;">info</span> Avaliação automática pela Catraca.</p>
                </div>
            `;
        });
    } else {
        grid.innerHTML = '<p>Nenhum plano cadastrado no sistema.</p>';
    }
};

window.toggleLiberarPlano = function(planoId, status) {
    if(!window.mockPlanos) return;
    const p = window.mockPlanos.find(x => x.id === planoId);
    if(p) {
        p.liberado = status;
        renderPlanosGeral();
        if (typeof renderMeusQRCodes === 'function') renderMeusQRCodes();
    }
};

let html5QrcodeScanner = null;

window.startScanner = function() {
    if(html5QrcodeScanner) return;
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
    
    html5QrcodeScanner.render((decodedText, decodedResult) => {
        try {
            const data = JSON.parse(decodedText);
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            
            const resultDiv = document.getElementById('scanner-result');
            resultDiv.style.display = 'block';
            
            const planoDb = window.mockPlanos ? window.mockPlanos.find(p => p.id === data.id) : null;
            
            if(!planoDb) {
                resultDiv.style.background = 'rgba(247, 37, 133, 0.1)';
                resultDiv.style.border = '1px solid var(--accent-color)';
                resultDiv.innerHTML = `<h3 style="color: var(--accent-color); margin-bottom:8px;"><span class="material-icons-outlined" style="vertical-align:middle;">error</span> ACESSO NEGADO</h3><p style="color: var(--text-primary); font-size:14px;">O QR Code lido não existe ou é inválido no sistema atual.</p>`;
                return;
            } 
            
            // Validação de dados faltando
            if (!planoDb.materiais || planoDb.materiais.trim() === '' || planoDb.materiais === 'Nenhum' && !planoDb.isAvulso) {
                resultDiv.style.background = 'rgba(247, 37, 133, 0.1)';
                resultDiv.style.border = '1px solid var(--accent-color)';
                resultDiv.innerHTML = `<h3 style="color: var(--accent-color); margin-bottom:8px;"><span class="material-icons-outlined" style="vertical-align:middle;">error</span> ACESSO NEGADO</h3><p style="color: var(--text-primary); font-size:14px;">Faltam dados obrigatórios no plano (ex: Materiais). Atualize sua ficha.</p>`;
                return;
            }

            // Validação de conflito de agendamento (prioridade por ordem de chegada/horário)
            if (planoDb.sala && planoDb.horario && planoDb.dia) {
                const conflito = window.mockPlanos.find(p => 
                    p.id !== planoDb.id && 
                    p.sala === planoDb.sala && 
                    p.horario === planoDb.horario && 
                    p.dia === planoDb.dia && 
                    (p.timestamp < planoDb.timestamp || !planoDb.timestamp)
                );
                
                if (conflito) {
                    resultDiv.style.background = 'rgba(247, 37, 133, 0.1)';
                    resultDiv.style.border = '1px solid var(--accent-color)';
                    resultDiv.innerHTML = `<h3 style="color: var(--accent-color); margin-bottom:8px;"><span class="material-icons-outlined" style="vertical-align:middle;">block</span> ACESSO NEGADO (CONFLITO)</h3><p style="color: var(--text-primary); font-size:14px;">A sala <strong>${planoDb.sala}</strong> já foi agendada por outro professor neste horário com prioridade.</p>`;
                    return;
                }
            }
            
            // Se passou em todas as validações, Acesso Liberado
            resultDiv.style.background = 'rgba(56, 176, 0, 0.1)';
            resultDiv.style.border = '1px solid #38b000';
            resultDiv.innerHTML = `
                <h3 style="color: #38b000; margin-bottom: 16px;"><span class="material-icons-outlined" style="vertical-align:middle;">check_circle</span> ACESSO LIBERADO</h3>
                <div style="text-align:left; color: var(--text-primary); font-size:14px;">
                    <p style="margin-bottom:8px;"><strong>Plano de Aula:</strong> ${planoDb.plano}</p>
                    <p style="margin-bottom:8px;"><strong>Sala:</strong> ${planoDb.sala || 'Acesso Avulso'}</p>
                    <p style="margin-bottom:8px;"><strong>Materiais a serem usados:</strong> ${planoDb.materiais}</p>
                    <p style="margin-bottom:8px;"><strong>Transferências efetuadas:</strong> ${planoDb.transfers || 'Nenhuma'}</p>
                    <hr style="border:none; border-top:1px solid rgba(56,176,0,0.3); margin: 12px 0;">
                    <p style="margin-top:12px; font-size:13px; font-weight:bold; color:#38b000; text-align:center;">Catraca destravada com sucesso. Bem-vindo(a)!</p>
                </div>
            `;
        } catch(e) {
            const resultDiv = document.getElementById('scanner-result');
            resultDiv.style.display = 'block';
            resultDiv.style.background = 'rgba(247, 37, 133, 0.1)';
            resultDiv.innerHTML = `<h3 style="color: var(--accent-color);"><span class="material-icons-outlined" style="vertical-align:middle;">error</span> QR CODE INVÁLIDO</h3><p style="color: var(--text-primary); font-size:14px;">Formato de QR Code não reconhecido pelo sistema.</p>`;
        }
    }, (error) => {
        // Warning log
    });
};

// ==========================================
// FUNÇÕES AVANÇADAS DE BOLETIM DE OCORRÊNCIA
// ==========================================

// Gerador de código único oficial sequencial/temporal
function gerarCodigoBoletimUnico() {
    const ano = new Date().getFullYear();
    const count = (mockProcessos.length + 1).toString().padStart(4, '0');
    return `BOL-${ano}-${count}`;
}

// Abrir e inicializar formulário completo de boletim
window.abrirFormularioBoletim = function(catId, catTitle) {
    document.getElementById('boletim-form-title').innerText = 'Preencher Boletim - ' + catTitle;
    document.getElementById('bf-categoria').value = catTitle;

    // 1. Gerar Código Único Automático
    const codUnico = gerarCodigoBoletimUnico();
    const inputCod = document.getElementById('bf-codigo');
    const badgeCod = document.getElementById('bf-codigo-badge');
    if (inputCod) inputCod.value = codUnico;
    if (badgeCod) badgeCod.innerText = codUnico;

    // 2. Preencher Data e Hora Atual
    const inputData = document.getElementById('bf-data');
    if (inputData) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        inputData.value = now.toISOString().slice(0, 16);
    }

    // 3. Preencher Unidade e Autor
    const inputEscola = document.getElementById('bf-escola');
    if (inputEscola) inputEscola.value = currentUser.escola || 'SENAI Centro de Formação Cândido Atahyde';

    const inputAutor = document.getElementById('bf-autor');
    if (inputAutor) inputAutor.value = currentUser.nome || 'Coordenação Geral';

    // 4. Resetar campos de material e almoxarifado
    const matSearch = document.getElementById('bf-material-search');
    if (matSearch) matSearch.value = '';
    const matCod = document.getElementById('bf-material-cod');
    if (matCod) matCod.value = '';
    const matQtd = document.getElementById('bf-qtd');
    if (matQtd) matQtd.value = 1;
    const almox = document.getElementById('bf-almoxarifado');
    if (almox) almox.value = '';
    const descSucinta = document.getElementById('bf-desc-sucinta');
    if (descSucinta) descSucinta.value = '';
    const obs = document.getElementById('bf-obs');
    if (obs) obs.value = '';

    // 5. Popular Planos de Aula
    const selectPlano = document.getElementById('bf-plano');
    if (selectPlano) {
        selectPlano.innerHTML = '<option value="">Selecione o plano de aula...</option><option value="Nenhum / Ocorrência Avulsa">Nenhum / Ocorrência Avulsa</option>';
        if (window.mockPlanos && window.mockPlanos.length > 0) {
            window.mockPlanos.forEach(p => {
                selectPlano.innerHTML += `<option value="${p.plano}">${p.id} - ${p.plano}</option>`;
            });
        }
    }

    // 6. Campos Dinâmicos da Categoria
    const dynamicFields = document.getElementById('bf-dynamic-fields');
    let fieldsHtml = '';

    switch(catId) {
        case 'avaria':
            fieldsHtml = `
                <div style="background:white; border:1px solid var(--border-color); border-radius:12px; padding:18px;">
                    <span style="font-weight:700; color:var(--danger-color); font-size:14px; display:flex; align-items:center; gap:6px; margin-bottom:14px;">
                        <span class="material-icons-outlined" style="font-size:18px;">broken_image</span> Detalhamento Específico da Avaria
                    </span>
                    <div class="form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:14px;">
                        <div class="form-group">
                            <label>Tipo de Avaria *</label>
                            <select required class="login-input" style="padding:10px;">
                                <option value="">Selecione...</option>
                                <option value="Quebra Total">Quebra Total</option>
                                <option value="Quebra Parcial">Quebra Parcial</option>
                                <option value="Falha Mecânica / Correia">Falha Mecânica / Correia</option>
                                <option value="Quebra de Agulha / Lâmina">Quebra de Agulha / Lâmina</option>
                                <option value="Rasgo ou Mancha">Rasgo ou Mancha</option>
                                <option value="Dano Elétrico">Dano Elétrico</option>
                                <option value="Dano Químico">Dano Químico</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Gravidade da Avaria *</label>
                            <select required class="login-input" style="padding:10px;">
                                <option value="">Selecione...</option>
                                <option value="Leve (pequeno reparo)">Leve (pequeno reparo)</option>
                                <option value="Média (requer manutenção técnica)">Média (requer manutenção técnica)</option>
                                <option value="Grave / Crítica (inutilizado)">Grave / Crítica (inutilizado)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:14px;">
                        <div class="form-group">
                            <label>O material ainda pode ser utilizado em aula? *</label>
                            <select required class="login-input" style="padding:10px;">
                                <option value="">Selecione...</option>
                                <option value="Sim, normalmente">Sim, normalmente</option>
                                <option value="Sim, com restrições">Sim, com restrições</option>
                                <option value="Não, requer reparo imediato">Não, requer reparo imediato</option>
                                <option value="Não, sucata / descarte">Não, sucata / descarte</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Aluno Responsável pelo Dano (Opcional)</label>
                            <select class="login-input" style="padding:10px;">
                                <option value="Não identificado / Não se aplica">Não identificado / Não se aplica</option>
                                <option value="João Silva (ALU-001)">João Silva (ALU-001)</option>
                                <option value="Maria Souza (ALU-002)">Maria Souza (ALU-002)</option>
                                <option value="Carlos Pereira (ALU-003)">Carlos Pereira (ALU-003)</option>
                                <option value="Ana Beatriz (ALU-004)">Ana Beatriz (ALU-004)</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Causa Provável e Detalhes Técnicos da Falha</label>
                        <textarea rows="2" class="login-input" placeholder="Ex: Durante a costura em velocidade alta, a correia escapou e a barra da agulha desalinhou..."></textarea>
                    </div>
                </div>
            `;
            break;
        case 'roubo':
        case 'furto':
            fieldsHtml = `
                <div style="background:white; border:1px solid var(--border-color); border-radius:12px; padding:18px;">
                    <span style="font-weight:700; color:var(--danger-color); font-size:14px; display:flex; align-items:center; gap:6px; margin-bottom:14px;">
                        <span class="material-icons-outlined" style="font-size:18px;">search_off</span> Detalhamento do Desaparecimento
                    </span>
                    <div class="form-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:14px;">
                        <div class="form-group">
                            <label>Local Específico onde estava guardado</label>
                            <input type="text" class="login-input" placeholder="Ex: Gaveta 2 da Sala de Modelagem" required>
                        </div>
                        <div class="form-group">
                            <label>Houve indício de arrombamento?</label>
                            <select class="login-input" style="padding:10px;">
                                <option value="Não">Não</option>
                                <option value="Sim, armário forçado">Sim, armário forçado</option>
                                <option value="Sim, porta violada">Sim, porta violada</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            break;
        default:
            fieldsHtml = `
                <div style="background:white; border:1px solid var(--border-color); border-radius:12px; padding:18px;">
                    <div class="form-group">
                        <label>Especificações Adicionais do Ocorrido</label>
                        <textarea rows="3" class="login-input" placeholder="Descreva os fatores relevantes da ocorrência..."></textarea>
                    </div>
                </div>
            `;
            break;
    }

    if (dynamicFields) dynamicFields.innerHTML = fieldsHtml;
    nav('view-boletim-form');
};

// Autocomplete e Pesquisa de Materiais no Almoxarifado
window.pesquisarMaterialBoletim = function(termo) {
    const dropdown = document.getElementById('bf-material-dropdown');
    if (!dropdown) return;
    termo = (termo || '').trim().toLowerCase();
    if (!termo) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = mockMateriais.filter(m => 
        (m.nome && m.nome.toLowerCase().includes(termo)) || 
        (m.cod && m.cod.toLowerCase().includes(termo)) ||
        (m.tipo && m.tipo.toLowerCase().includes(termo))
    );

    if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding:10px 14px; font-size:12px; color:var(--text-secondary);">Nenhum material cadastrado com esse nome. Você pode continuar digitando o nome do material livremente.</div>`;
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = matches.map(m => `
        <div class="autocomplete-item" onclick="selecionarMaterialBoletim('${m.cod}', '${m.nome.replace(/'/g, "\\'")}', '${m.almoxAtual.replace(/'/g, "\\'")}')">
            <div>
                <strong>${m.nome}</strong> <span style="font-size:11px; color:var(--text-secondary);">(${m.cod})</span>
                <div style="font-size:11px; color:var(--text-secondary);">${m.tipo} • Almoxarifado: ${m.almoxAtual}</div>
            </div>
            <span style="font-size:12px; font-weight:700; color:var(--primary-color);">Estoque: ${m.qtd}</span>
        </div>
    `).join('');
    dropdown.style.display = 'block';
};

window.selecionarMaterialBoletim = function(cod, nome, almox) {
    const searchInput = document.getElementById('bf-material-search');
    const codInput = document.getElementById('bf-material-cod');
    const almoxInput = document.getElementById('bf-almoxarifado');
    const dropdown = document.getElementById('bf-material-dropdown');

    if (searchInput) searchInput.value = nome;
    if (codInput) codInput.value = cod;
    if (almoxInput && (!almoxInput.value || almoxInput.value === 'Almoxarifado Central')) {
        almoxInput.value = almox;
    }
    if (dropdown) dropdown.style.display = 'none';
};

// Vínculo inteligente de Plano de Aula com o Almoxarifado
window.vincularPlanoAoBoletim = function(planoNome) {
    const almoxInput = document.getElementById('bf-almoxarifado');
    if (!almoxInput || !planoNome) return;

    if (planoNome.includes('Modelagem')) {
        almoxInput.value = 'Sala 01 - Modelagem';
    } else if (planoNome.includes('Costura')) {
        almoxInput.value = 'Sala 02 - Costura';
    } else if (planoNome.includes('Maker') || planoNome.includes('Impressão')) {
        almoxInput.value = 'Laboratório Maker';
    } else {
        almoxInput.value = 'Estoque Central';
    }
};

// ==========================================
// MODAL DE DETALHAMENTO DO BOLETIM DE OCORRÊNCIA
// ==========================================
let boletimEmVisualizacao = null;

window.abrirDetalhesBoletim = function(id) {
    const b = mockProcessos.find(x => x.id === id);
    if (!b) return;
    boletimEmVisualizacao = b;

    document.getElementById('md-bol-titulo').innerText = `${b.tipo} - ${b.material || 'Material'}`;
    document.getElementById('md-bol-codigo').innerText = b.id;
    document.getElementById('md-bol-categoria').innerText = b.tipo;
    document.getElementById('md-bol-status-select').value = b.status || 'Pendente';

    document.getElementById('md-bol-data').innerText = b.data || 'Hoje';
    document.getElementById('md-bol-escola').innerText = b.escola || 'SENAI Centro de Formação Cândido Atahyde';
    document.getElementById('md-bol-autor').innerText = b.autor || 'Desconhecido';
    document.getElementById('md-bol-turma').innerText = b.turma || 'Geral';

    document.getElementById('md-bol-material').innerText = b.material || 'N/A';
    document.getElementById('md-bol-mat-cod').innerText = b.materialCod || 'N/A';
    document.getElementById('md-bol-qtd').innerText = b.qtd || '1';
    document.getElementById('md-bol-almoxarifado').innerText = b.almoxarifado || 'Almoxarifado Central';
    document.getElementById('md-bol-plano').innerText = b.planoOrigem || 'Nenhum / Ocorrência Avulsa';

    document.getElementById('md-bol-desc').innerText = b.detalhe || b.descricaoSucinta || 'Sem descrição informada.';
    document.getElementById('md-bol-obs').innerText = b.obs || 'Nenhuma observação registrada.';

    // Campos específicos dinâmicos
    const espContainer = document.getElementById('md-bol-campos-especificos');
    if (espContainer) {
        if (b.camposEspecificos && Object.keys(b.camposEspecificos).length > 0) {
            let html = '';
            for (const [k, v] of Object.entries(b.camposEspecificos)) {
                html += `<div style="margin-bottom:6px;"><strong>${k}:</strong> ${v}</div>`;
            }
            espContainer.innerHTML = html;
            espContainer.style.display = 'block';
        } else {
            espContainer.style.display = 'none';
        }
    }

    openModal('detalhe-boletim-modal');
};

window.alterarStatusBoletimModal = function(novoStatus) {
    if (!boletimEmVisualizacao) return;
    boletimEmVisualizacao.status = novoStatus;
    
    // Atualizar no Cloud Firestore
    if (db && boletimEmVisualizacao.id) {
        db.collection('boletins').doc(boletimEmVisualizacao.id).set({ status: novoStatus }, { merge: true }).catch(console.warn);
    }

    localStorage.setItem('senaivest_processos', JSON.stringify(mockProcessos));
    renderProcessos();
    alert(`Status do boletim ${boletimEmVisualizacao.id} atualizado para: ${novoStatus}`);
};

window.abrirChatDoBoletimAtual = function() {
    if (!boletimEmVisualizacao) return;
    const autor = boletimEmVisualizacao.autor;
    const bolId = boletimEmVisualizacao.id;
    closeModal('detalhe-boletim-modal');
    abrirChatInstitucional(autor, bolId);
};

window.baixarPdfBoletimModal = function() {
    if (!boletimEmVisualizacao) return;
    baixarPdfBoletim(boletimEmVisualizacao.id, boletimEmVisualizacao.tipo, boletimEmVisualizacao.material, boletimEmVisualizacao.autor, boletimEmVisualizacao.data);
};

// ==========================================
// MÓDULO DE CHAT INSTITUCIONAL
// ==========================================
let contatoChatAtivo = null;
let boletimChatVinculado = null;

// Mensagens padrão de demonstração
let chatMensagens = JSON.parse(localStorage.getItem('senaivest_chat_mensagens') || '[]');
if (chatMensagens.length === 0) {
    chatMensagens = [
        {
            id: 1,
            remetente: 'Coordenação Geral',
            destinatario: 'Prof. Roberto',
            texto: 'Olá Professor Roberto! Recebemos o boletim sobre a avaria da máquina reta.',
            data: 'Hoje, 09:30',
            boletimRef: 'PROC-101'
        },
        {
            id: 2,
            remetente: 'Prof. Roberto',
            destinatario: 'Coordenação Geral',
            texto: 'Bom dia! A correia soltou durante a modelagem da turma da manhã. A máquina está isolada para manutenção.',
            data: 'Hoje, 09:35',
            boletimRef: 'PROC-101'
        }
    ];
}

window.abrirChatInstitucional = function(contatoNomeOuId, refBoletimId) {
    const listContainer = document.getElementById('chat-contacts-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Obter lista de professores e coordenação
    const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const contatos = [];

    // Se for Coordenação: listar professores
    if (currentUser.role === 'Coordenação') {
        for (const [id, u] of Object.entries(users)) {
            if (u.role === 'Professor' || u.role === 'professor') {
                contatos.push({ id, nome: u.nome, role: 'Professor', escola: u.escola, foto: u.foto });
            }
        }
        // Se ainda não tiver na lista, adicionar os padrão
        if (!contatos.find(c => c.nome === 'Prof. Roberto')) {
            contatos.push({ id: 'PROF-101', nome: 'Prof. Roberto', role: 'Professor', escola: 'SENAI Vestuário' });
        }
        if (!contatos.find(c => c.nome === 'Profª Clara Mendes')) {
            contatos.push({ id: 'PROF-102', nome: 'Profª Clara Mendes', role: 'Professor', escola: 'SENAI Vestuário' });
        }
    } else {
        // Se for Professor ou Aluno: listar a Coordenação
        contatos.push({ id: 'COORD-01', nome: 'Coordenação Pedagógica', role: 'Coordenação', escola: 'SENAI Vestuário' });
        contatos.push({ id: 'ALMOX-01', nome: 'Almoxarifado Central', role: 'Almoxarife', escola: 'SENAI Vestuário' });
    }

    // Renderizar contatos
    contatos.forEach((c, idx) => {
        const initial = (c.nome || 'P').charAt(0).toUpperCase();
        listContainer.innerHTML += `
            <div class="chat-contact-item" id="chat-item-${c.id}" onclick="selecionarContatoChat('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${c.role}')">
                <div class="chat-contact-avatar">${initial}</div>
                <div class="chat-contact-info">
                    <div class="chat-contact-name">${c.nome}</div>
                    <div class="chat-contact-role">${c.role} • ${c.escola || 'SENAI'}</div>
                </div>
            </div>
        `;
    });

    // Se passou um boletim de referência
    if (refBoletimId) {
        boletimChatVinculado = refBoletimId;
        const bar = document.getElementById('chat-boletim-ref-bar');
        const text = document.getElementById('chat-boletim-ref-text');
        if (bar && text) {
            bar.style.display = 'flex';
            text.innerText = `📌 Ocorrência vinculada: ${refBoletimId}`;
        }
    } else {
        desvincularBoletimDoChat();
    }

    // Selecionar o contato inicial
    let contatoAlvo = contatos[0];
    if (contatoNomeOuId) {
        const found = contatos.find(c => c.nome === contatoNomeOuId || c.id === contatoNomeOuId || (c.nome && c.nome.includes(contatoNomeOuId)));
        if (found) contatoAlvo = found;
    }

    if (contatoAlvo) {
        selecionarContatoChat(contatoAlvo.id, contatoAlvo.nome, contatoAlvo.role);
    }

    openModal('institutional-chat-modal');
};

window.selecionarContatoChat = function(id, nome, role) {
    contatoChatAtivo = { id, nome, role };

    document.querySelectorAll('.chat-contact-item').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(`chat-item-${id}`);
    if (item) item.classList.add('active');

    const nameEl = document.getElementById('chat-active-name');
    const roleEl = document.getElementById('chat-active-role');
    const avatarEl = document.getElementById('chat-active-avatar');

    if (nameEl) nameEl.innerText = nome;
    if (roleEl) roleEl.innerText = `${role} • SenaiVest`;
    if (avatarEl) avatarEl.innerText = (nome || 'P').charAt(0).toUpperCase();

    renderizarMensagensChat();
};

window.desvincularBoletimDoChat = function() {
    boletimChatVinculado = null;
    const bar = document.getElementById('chat-boletim-ref-bar');
    if (bar) bar.style.display = 'none';
};

window.renderizarMensagensChat = function() {
    const container = document.getElementById('chat-messages-container');
    if (!container || !contatoChatAtivo) return;
    container.innerHTML = '';

    const usuarioAtualNome = currentUser.nome || 'Eu';

    // Filtrar mensagens entre os dois interlocutores
    const thread = chatMensagens.filter(m => 
        (m.remetente === usuarioAtualNome && m.destinatario === contatoChatAtivo.nome) ||
        (m.remetente === contatoChatAtivo.nome && m.destinatario === usuarioAtualNome) ||
        (m.remetente === 'Coordenação Geral' && currentUser.role === 'Coordenação') ||
        (m.destinatario === 'Coordenação Geral' && currentUser.role === 'Coordenação')
    );

    if (thread.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:32px; color:var(--text-secondary); font-size:13px;">
                <span class="material-icons-outlined" style="font-size:36px; display:block; margin-bottom:8px; opacity:0.5;">chat_bubble_outline</span>
                Nenhuma mensagem nesta conversa ainda.<br>Envie uma mensagem, áudio ou anexo para iniciar o atendimento.
            </div>
        `;
        return;
    }

    thread.forEach(m => {
        const isMine = m.remetente === usuarioAtualNome || (m.remetente === 'Coordenação Geral' && currentUser.role === 'Coordenação');
        const bubbleClass = isMine ? 'mine' : 'theirs';

        let contentHtml = '';
        if (m.boletimRef) {
            contentHtml += `<div style="font-size:11px; padding:4px 8px; border-radius:4px; background:rgba(0,0,0,0.08); margin-bottom:6px; font-weight:700;">📌 Referente ao Boletim: ${m.boletimRef}</div>`;
        }

        if (m.texto) {
            contentHtml += `<div>${m.texto}</div>`;
        }

        if (m.anexo) {
            contentHtml += `
                <div style="margin-top:8px;">
                    <a href="${m.anexo}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; background:rgba(0,0,0,0.06); padding:6px 12px; border-radius:6px; font-size:12px; color:inherit; text-decoration:none;">
                        <span class="material-icons-outlined" style="font-size:16px;">attachment</span> ${m.anexoNome || 'Ver Arquivo Anexo'}
                    </a>
                </div>
            `;
        }

        if (m.audio) {
            contentHtml += `
                <div class="chat-msg-audio">
                    <span class="material-icons-outlined" style="font-size:22px;">mic</span>
                    <audio controls src="${m.audio}" style="height:32px; max-width:200px;"></audio>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="chat-msg ${bubbleClass}">
                ${contentHtml}
                <div class="chat-msg-time">${m.data}</div>
            </div>
        `;
    });

    container.scrollTop = container.scrollHeight;
};

window.enviarMensagemChat = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('chat-text-input');
    if (!input || !contatoChatAtivo) return;

    const texto = input.value.trim();
    if (!texto) return;

    const novaMsg = {
        id: Date.now(),
        remetente: currentUser.nome || 'Coordenação Geral',
        destinatario: contatoChatAtivo.nome,
        texto: texto,
        data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boletimRef: boletimChatVinculado,
        criadoEm: new Date().toISOString()
    };

    chatMensagens.push(novaMsg);
    localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));

    // Salvar no Cloud Firestore se conectado
    if (db) {
        db.collection('chat_mensagens').add(novaMsg).catch(console.warn);
    }

    input.value = '';
    renderizarMensagensChat();
};

window.anexarArquivoChat = function(event) {
    const file = event.target.files[0];
    if (!file || !contatoChatAtivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const novaMsg = {
            id: Date.now(),
            remetente: currentUser.nome || 'Coordenação Geral',
            destinatario: contatoChatAtivo.nome,
            texto: `📎 Anexo: ${file.name}`,
            anexo: e.target.result,
            anexoNome: file.name,
            data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            boletimRef: boletimChatVinculado,
            criadoEm: new Date().toISOString()
        };

        chatMensagens.push(novaMsg);
        localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
        if (db) db.collection('chat_mensagens').add(novaMsg).catch(console.warn);

        renderizarMensagensChat();
    };
    reader.readAsDataURL(file);
};

window.gravarAudioChat = function() {
    if (!contatoChatAtivo) return;

    // Simulação ou gravação via microfone
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const audioMsg = prompt("Enviar gravação de áudio institucional:\nDigite um recado de voz para gerar a mensagem de áudio:", "Aviso da Coordenação sobre o material solicitado.");
        if (!audioMsg) return;

        const novaMsg = {
            id: Date.now(),
            remetente: currentUser.nome || 'Coordenação Geral',
            destinatario: contatoChatAtivo.nome,
            texto: `🎤 Áudio Institucional: "${audioMsg}"`,
            data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            boletimRef: boletimChatVinculado,
            criadoEm: new Date().toISOString()
        };

        chatMensagens.push(novaMsg);
        localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
        if (db) db.collection('chat_mensagens').add(novaMsg).catch(console.warn);

        renderizarMensagensChat();
    } else {
        alert("Microfone não suportado neste navegador.");
    }
};



// =========================================================================
// SISTEMA DE RASTREABILIDADE DE PLANOS DE AULA, ATRASOS AO VIVO & DEVOLUÇÃO COM FOTO
// =========================================================================

// Banco de dados em memória e sincronizado com LocalStorage e Firestore
window.planosAulasControle = [
    {
        id: 'PLAN-2026-01',
        tema: 'Modelagem e Corte de Alfaiataria',
        turma: 'Vestuário e Estilismo - Manhã (Turma 2026.1)',
        professorId: 'PROF-101',
        professorNome: 'Prof. Roberto Silva',
        salaUso: 'Lab de Modelagem 01 (Bancadas 1 a 6)',
        salaOrigem: 'Sala 01 - Modelagem',
        localizacaoOrigem: 'Armário B - Gaveta 2 (Prateleira A1)',
        materiaisTexto: '8x Tesouras Alfaiate Mundial 10", 5x Réguas de Modelagem, 12x Fitas Métricas',
        horarioRetirada: 'Hoje às 08:00',
        horarioLimite: 'Hoje às 10:00',
        timestampRetirada: Date.now() - (2 * 3600 * 1000 + 24 * 60 * 1000 + 15 * 1000),
        timestampLimite: Date.now() - (24 * 60 * 1000 + 15 * 1000), // Expirou há ~24 min para demonstrar atraso em tempo real!
        status: 'atrasado',
        devolucao: null
    },
    {
        id: 'PLAN-2026-02',
        tema: 'Costura e Fechamento de Peças em Malha',
        turma: 'Costura Industrial - Tarde (Turma B)',
        professorId: 'PROF-102',
        professorNome: 'Profª. Clara Menezes',
        salaUso: 'Sala 02 - Costura (Máquinas 1 a 10)',
        salaOrigem: 'Estoque Central',
        localizacaoOrigem: 'Prateleira C2 - Caixa Organizadora 04',
        materiaisTexto: '15x Linhas Poliéster 120, 20x Agulhas Ponta Bola, 10x Bobinas',
        horarioRetirada: 'Hoje às 13:30',
        horarioLimite: 'Hoje às 15:30',
        timestampRetirada: Date.now() - (5 * 3600 * 1000),
        timestampLimite: Date.now() - (3 * 3600 * 1000),
        status: 'devolvido',
        devolucao: {
            dataHora: '12/10/2026 às 15:25',
            fotoUrl: 'historia_lab.jpeg',
            fotoCarimbo: 'SENAIVEST | DEVOLUÇÃO FÍSICA | Estoque Central (Prat. C2) | 12/10/2026 15:25 | Profª. Clara Menezes',
            obs: 'Todos os 15 carretéis de linha e 20 agulhas conferidos e guardados na Caixa 04 conforme o padrão.',
            responsavel: 'Profª. Clara Menezes',
            conferido: true
        }
    }
];

// Carregar dados salvos no localStorage se existirem
try {
    const salvos = localStorage.getItem('senaivest_planos_controle');
    if (salvos) {
        const parsed = JSON.parse(salvos);
        if (Array.isArray(parsed) && parsed.length > 0) {
            window.planosAulasControle = parsed;
        }
    }
} catch(e) {
    console.warn('Erro ao carregar planos salvos:', e);
}

function salvarPlanosAulasStorage() {
    try {
        localStorage.setItem('senaivest_planos_controle', JSON.stringify(window.planosAulasControle));
    } catch(e) {}
}

let cameraStreamObj = null;
let fotoDevolucaoTemp = null;
let monitorAtrasoInterval = null;

// Formata o tempo de atraso dinâmico no formato: +01h 24m 15s
function formatarTempoAtraso(diffMs) {
    if (diffMs <= 0) return '00h 00m 00s';
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `+${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

// Inicia o cronômetro em tempo real que atualiza a cada 1 segundo (Horas, Minutos, Segundos)
function iniciarMonitorAtrasoTempoReal() {
    if (monitorAtrasoInterval) clearInterval(monitorAtrasoInterval);

    monitorAtrasoInterval = setInterval(() => {
        const now = Date.now();
        let temAtrasos = false;
        let countAtrasos = 0;

        window.planosAulasControle.forEach(p => {
            if (p.status !== 'devolvido') {
                if (now > p.timestampLimite) {
                    p.status = 'atrasado';
                    temAtrasos = true;
                    countAtrasos++;

                    // Atualiza o relógio no DOM instantaneamente
                    const timerEl = document.getElementById(`live-timer-${p.id}`);
                    if (timerEl) {
                        const diff = now - p.timestampLimite;
                        timerEl.innerText = formatarTempoAtraso(diff);
                    }
                    const bannerTimerEl = document.getElementById(`prof-banner-timer-${p.id}`);
                    if (bannerTimerEl) {
                        const diff = now - p.timestampLimite;
                        bannerTimerEl.innerText = formatarTempoAtraso(diff);
                    }
                }
            }
        });

        // Atualiza os badges de contagem na tela
        const countBadge = document.getElementById('coord-atrasos-count-badge');
        if (countBadge) {
            countBadge.innerText = `${countAtrasos} Pendente${countAtrasos === 1 ? '' : 's'}`;
            countBadge.style.background = countAtrasos > 0 ? '#ef4444' : '#10b981';
        }
    }, 1000);
}

// Renderiza a lista de atrasos e devoluções para a Coordenação
window.renderPainelAtrasosCoord = function() {
    const grid = document.getElementById('coord-atrasos-grid');
    if (!grid) return;

    const agora = Date.now();
    const pendentes = window.planosAulasControle.filter(p => p.status === 'atrasado');
    const devolvidos = window.planosAulasControle.filter(p => p.status === 'devolvido');

    if (pendentes.length === 0 && devolvidos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 28px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <span class="material-icons-outlined" style="font-size: 36px; color: #10b981; margin-bottom: 8px;">check_circle</span>
                <p style="font-weight: 600; color: var(--text-primary); margin:0;">Nenhum material pendente de devolução no momento!</p>
                <p style="font-size: 12.5px; color: var(--text-secondary); margin-top:4px;">Todos os materiais retirados foram conferidos e guardados em seus almoxarifados de origem.</p>
            </div>
        `;
        return;
    }

    let html = '';

    // Renderiza primeiro os pendentes/atrasados
    pendentes.forEach(p => {
        const diff = agora - p.timestampLimite;
        const tempoAtrasoFormatado = formatarTempoAtraso(diff);

        html += `
            <div class="atraso-card" style="border-left: 4px solid #ef4444;">
                <div>
                    <div class="atraso-card-header">
                        <div>
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ef4444; letter-spacing: 0.5px;">⚠️ ATRASO CRÍTICO DE DEVOLUÇÃO</span>
                            <h4 style="font-size: 15px; font-weight: 700; margin: 4px 0; color: var(--text-primary);">${p.tema}</h4>
                        </div>
                        <div class="live-timer-badge" title="Tempo excedido além do término da aula">
                            <span class="live-timer-dot"></span>
                            <span id="live-timer-${p.id}" class="live-timer-text">${tempoAtrasoFormatado}</span>
                        </div>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: var(--primary-color);">groups</span>
                        <span><strong>Turma:</strong> ${p.turma}</span>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: var(--primary-color);">person</span>
                        <span><strong>Professor Responsável:</strong> ${p.professorNome} (${p.professorId})</span>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: #f59e0b;">schedule</span>
                        <span><strong>Retirada:</strong> ${p.horarioRetirada} &bull; <strong>Prazo Limite:</strong> ${p.horarioLimite}</span>
                    </div>

                    <div class="atraso-rastreio-box">
                        <div style="font-weight:700; color: #b91c1c; margin-bottom: 4px; display:flex; align-items:center; gap:4px;">
                            <span class="material-icons-outlined" style="font-size:14px;">place</span> ÚLTIMO RASTREIO DE LOCALIZAÇÃO:
                        </div>
                        <div><strong>Local Utilizado:</strong> ${p.salaUso}</div>
                        <div><strong>Retorno Obrigatório:</strong> <span style="color:var(--primary-color); font-weight:700;">${p.salaOrigem}</span> (${p.localizacaoOrigem})</div>
                        <div style="margin-top:6px; padding-top:6px; border-top:1px dashed #cbd5e1;">
                            <strong>Materiais Não Devolvidos:</strong> ${p.materiaisTexto}
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="primary-btn" onclick="cobrarDevolucaoProfessor('${p.id}')" style="flex:1; justify-content:center; padding:9px 12px; font-size:12.5px; background:#ef4444;">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">campaign</span> Cobrar Devolução
                    </button>
                    <button class="secondary-btn" onclick="abrirModalDevolucao('${p.id}')" style="justify-content:center; padding:9px 12px; font-size:12.5px;" title="Registrar devolução presencialmente">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">assignment_return</span> Dar Baixa
                    </button>
                </div>
            </div>
        `;
    });

    // Renderiza também os materiais já devolvidos com comprovante fotográfico
    devolvidos.forEach(p => {
        html += `
            <div class="atraso-card" style="border-left: 4px solid #10b981; opacity: 0.95;">
                <div>
                    <div class="atraso-card-header">
                        <div>
                            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #10b981; letter-spacing: 0.5px;">✅ DEVOLUÇÃO CONCLUÍDA & FOTO ARQUIVADA</span>
                            <h4 style="font-size: 15px; font-weight: 700; margin: 4px 0; color: var(--text-primary);">${p.tema}</h4>
                        </div>
                        <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                            No Estoque
                        </span>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: #10b981;">groups</span>
                        <span><strong>Turma:</strong> ${p.turma}</span>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: #10b981;">person</span>
                        <span><strong>Devolvido por:</strong> ${p.devolucao.responsavel || p.professorNome}</span>
                    </div>

                    <div class="atraso-info-row">
                        <span class="material-icons-outlined" style="font-size: 16px; color: #10b981;">event_available</span>
                        <span><strong>Data e Hora:</strong> ${p.devolucao.dataHora}</span>
                    </div>

                    <div class="atraso-rastreio-box" style="background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2);">
                        <div><strong>Guardado em:</strong> ${p.salaOrigem} (${p.localizacaoOrigem})</div>
                        <div><strong>Materiais:</strong> ${p.materiaisTexto}</div>
                        ${p.devolucao.obs ? `<div style="margin-top:4px; font-style:italic; color:#475569;">"${p.devolucao.obs}"</div>` : ''}
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <button class="primary-btn" onclick="abrirFotoComprovanteDevolucao('${p.id}')" style="width:100%; justify-content:center; padding:9px 12px; font-size:12.5px; background:#0f172a;">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:6px;">photo_camera</span> Ver Foto da Guarda Física (Auditoria)
                    </button>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
};

// Renderiza o banner de aviso para o Professor
window.renderBannerAtrasosProf = function() {
    const container = document.getElementById('prof-atraso-banner-container');
    if (!container) return;

    const atrasados = window.planosAulasControle.filter(p => p.status === 'atrasado');

    if (atrasados.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Exibe o primeiro plano atrasado em destaque
    const p = atrasados[0];
    const diff = Date.now() - p.timestampLimite;
    const tempoAtraso = formatarTempoAtraso(diff);

    container.innerHTML = `
        <div class="banner-atraso-professor">
            <div style="display:flex; align-items:center; gap:12px;">
                <span class="material-icons-outlined" style="font-size:32px; animation: pulseWarning 1.5s infinite;">warning</span>
                <div>
                    <div style="font-weight:800; font-size:15px; letter-spacing:0.3px;">
                        ATENÇÃO: AULA FINALIZADA & PENDÊNCIA DE DEVOLUÇÃO AO ESTOQUE
                    </div>
                    <div style="font-size:13px; opacity:0.95; margin-top:2px;">
                        A aula <strong>"${p.tema}"</strong> (${p.turma}) encerrou o horário limite. Os materiais precisam retornar para <strong>${p.salaOrigem}</strong>.
                        Atraso atual: <strong id="prof-banner-timer-${p.id}">${tempoAtraso}</strong>.
                    </div>
                </div>
            </div>
            <div>
                <button type="button" onclick="abrirModalDevolucao('${p.id}')">
                    <span class="material-icons-outlined" style="font-size:16px; vertical-align:middle; margin-right:4px;">photo_camera</span> Devolver & Tirar Foto da Guarda
                </button>
            </div>
        </div>
    `;
};

// Ação da Coordenação para cobrar o Professor
window.cobrarDevolucaoProfessor = function(planoId) {
    const plano = window.planosAulasControle.find(p => p.id === planoId);
    if (!plano) return;

    const diff = Date.now() - plano.timestampLimite;
    const tempoAtraso = formatarTempoAtraso(diff);

    // 1. Adicionar notificação no sistema
    if (typeof notificacoes !== 'undefined') {
        notificacoes.unshift({
            id: Date.now(),
            title: `Cobrança de Devolução: ${plano.tema}`,
            desc: `Coordenação cobrou o retorno imediato dos materiais da turma ${plano.turma} para ${plano.salaOrigem}. Atraso: ${tempoAtraso}.`,
            type: 'alert'
        });
        if (typeof renderNotificacoes === 'function') renderNotificacoes();
    }

    // 2. Enviar mensagem no Chat Institucional automaticamente se existir
    if (typeof mensagensChat !== 'undefined') {
        mensagensChat.push({
            id: 'msg-' + Date.now(),
            autor: 'Coordenação Pedagógica',
            cargo: 'Coordenação',
            texto: `🚨 NOTIFICAÇÃO URGENTE DE ESTOQUE: Olá, ${plano.professorNome}! Os materiais retirados para a aula "${plano.tema}" (${plano.turma}) estão pendentes de devolução na sala "${plano.salaOrigem}". O tempo limite foi excedido em ${tempoAtraso}. Por favor, faça a conferência, dê baixa no sistema e anexe a foto da guarda física.`,
            horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            dataHora: new Date().toISOString(),
            anexo: null,
            boletimRef: null
        });
        if (typeof renderChatMensagens === 'function') renderChatMensagens();
    }

    alert(`📢 Cobrança enviada com sucesso!

Uma notificação de alerta prioritário e mensagem no Chat Institucional foram emitidas para o(a) ${plano.professorNome}.`);
};

// =========================================================================
// MÓDULO DA CÂMERA & DEVOLUÇÃO COM FOTO
// =========================================================================

window.abrirModalDevolucao = function(planoId) {
    const plano = window.planosAulasControle.find(p => p.id === planoId);
    if (!plano) return;

    document.getElementById('dev-plano-id').value = plano.id;
    document.getElementById('dev-turma').innerText = plano.turma;
    document.getElementById('dev-prof').innerText = plano.professorNome;
    document.getElementById('dev-sala-uso').innerText = plano.salaUso;
    document.getElementById('dev-sala-origem').innerText = `${plano.salaOrigem} (${plano.localizacaoOrigem})`;
    document.getElementById('dev-materiais-lista').innerText = plano.materiaisTexto;

    // Reset de fotos e campos
    resetarFotoDevolucao();
    document.getElementById('dev-obs').value = '';
    document.getElementById('dev-check-qtd').checked = true;
    document.getElementById('dev-check-avaria').checked = true;

    openModal('devolucao-foto-modal');
};

window.fecharModalDevolucao = function() {
    pararCamera();
    closeModal('devolucao-foto-modal');
};

// Iniciar stream de vídeo da câmera do celular / webcam
window.iniciarCameraDevolucao = async function() {
    const container = document.getElementById('camera-stream-container');
    const video = document.getElementById('dev-video-stream');
    const previewContainer = document.getElementById('dev-foto-preview-container');

    previewContainer.style.display = 'none';

    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Tenta câmera traseira no celular primeiro (environment)
            cameraStreamObj = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            video.srcObject = cameraStreamObj;
            container.style.display = 'block';
        } else {
            alert('Acesso à câmera não suportado neste navegador. Utilize o botão "Escolher Foto".');
        }
    } catch(err) {
        console.warn('Erro ao acessar câmera frontal/traseira:', err);
        // Fallback para qualquer câmera disponível
        try {
            cameraStreamObj = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = cameraStreamObj;
            container.style.display = 'block';
        } catch(fallbackErr) {
            alert('Não foi possível abrir a câmera automaticamente (permissão negada ou ausente). Você pode selecionar uma foto usando o botão "Escolher Foto".');
        }
    }
};

window.pararCamera = function() {
    if (cameraStreamObj) {
        cameraStreamObj.getTracks().forEach(track => track.stop());
        cameraStreamObj = null;
    }
    const container = document.getElementById('camera-stream-container');
    if (container) container.style.display = 'none';
};

// Captura a foto da câmera e estampa o carimbo institucional
window.capturarFotoCamera = function() {
    const video = document.getElementById('dev-video-stream');
    const canvas = document.getElementById('dev-canvas-carimbo');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Desenha o quadro capturado
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Adiciona o carimbo institucional
    estamparCarimboNoCanvas(ctx, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    aplicarFotoDevolucao(dataUrl);
    pararCamera();
};

// Carrega foto via input de arquivo
window.carregarFotoArquivo = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('dev-canvas-carimbo');
            canvas.width = img.width > 1280 ? 1280 : img.width;
            canvas.height = (img.height / img.width) * canvas.width;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            estamparCarimboNoCanvas(ctx, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            aplicarFotoDevolucao(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

// Estampa dados oficiais de data, hora e almoxarifado direto na foto
function estamparCarimboNoCanvas(ctx, width, height) {
    const planoId = document.getElementById('dev-plano-id').value;
    const plano = window.planosAulasControle.find(p => p.id === planoId);
    const local = plano ? plano.salaOrigem : 'Almoxarifado SENAI';
    const prof = currentUser.nome || (plano ? plano.professorNome : 'Professor');
    const dataHoraStr = new Date().toLocaleString('pt-BR');

    // Faixa escura no rodapé da imagem
    const bannerHeight = Math.max(50, Math.floor(height * 0.12));
    ctx.fillStyle = 'rgba(11, 35, 65, 0.85)';
    ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

    // Linha azul de destaque
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, height - bannerHeight, width, 4);

    // Textos do carimbo
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(12, Math.floor(bannerHeight * 0.28))}px sans-serif`;
    ctx.fillText(`SENAIVEST | AUDITORIA DE GUARDA FÍSICA NO ESTOQUE`, 16, height - bannerHeight + Math.floor(bannerHeight * 0.42));

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${Math.max(10, Math.floor(bannerHeight * 0.22))}px sans-serif`;
    ctx.fillText(`Local: ${local} | Data/Hora: ${dataHoraStr} | Responsável: ${prof}`, 16, height - bannerHeight + Math.floor(bannerHeight * 0.78));
}

function aplicarFotoDevolucao(dataUrl) {
    fotoDevolucaoTemp = dataUrl;
    const previewContainer = document.getElementById('dev-foto-preview-container');
    const previewImg = document.getElementById('dev-foto-preview-img');
    const carimboText = document.getElementById('dev-carimbo-dados');

    const planoId = document.getElementById('dev-plano-id').value;
    const plano = window.planosAulasControle.find(p => p.id === planoId);

    previewImg.src = dataUrl;
    if (carimboText) {
        carimboText.innerText = `SENAIVEST | COMPROVADO EM: ${new Date().toLocaleString('pt-BR')} | ${plano ? plano.salaOrigem : ''}`;
    }
    previewContainer.style.display = 'block';
}

window.resetarFotoDevolucao = function() {
    fotoDevolucaoTemp = null;
    pararCamera();
    const previewContainer = document.getElementById('dev-foto-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const fileInput = document.getElementById('dev-input-foto-arquivo');
    if (fileInput) fileInput.value = '';
};

// Confirmar Devolução e Dar Baixa no Estoque
window.confirmarDevolucaoComFoto = function() {
    const planoId = document.getElementById('dev-plano-id').value;
    const plano = window.planosAulasControle.find(p => p.id === planoId);
    if (!plano) return;

    if (!fotoDevolucaoTemp) {
        alert('⚠️ ATENÇÃO: É obrigatório tirar ou anexar uma foto comprovando o local onde o material foi guardado fisicamente antes de dar baixa!');
        return;
    }

    const checkQtd = document.getElementById('dev-check-qtd').checked;
    if (!checkQtd) {
        alert('Por favor, confirme a contagem de todos os itens antes de finalizar a devolução.');
        return;
    }

    const obs = document.getElementById('dev-obs').value || 'Materiais conferidos e guardados no padrão laboratorial.';
    const dataHoraFormatada = new Date().toLocaleString('pt-BR');

    // Atualiza o plano
    plano.status = 'devolvido';
    plano.devolucao = {
        dataHora: dataHoraFormatada,
        fotoUrl: fotoDevolucaoTemp,
        obs: obs,
        responsavel: currentUser.nome || plano.professorNome,
        conferido: true
    };

    // Salva no storage local
    salvarPlanosAulasStorage();

    // Sincroniza com Cloud Firestore se ativo
    if (db) {
        try {
            db.collection('devolucoes_aulas').doc(plano.id).set({
                ...plano,
                atualizadoEm: new Date().toISOString()
            }, { merge: true }).then(() => {
                console.log('✅ Devolução sincronizada no Firestore!');
            }).catch(e => console.warn('Erro ao salvar devolução no Firestore:', e));
        } catch(e) {}
    }

    // Notificação institucional
    if (typeof notificacoes !== 'undefined') {
        notificacoes.unshift({
            id: Date.now(),
            title: `Devolução Concluída: ${plano.tema}`,
            desc: `O material da turma ${plano.turma} retornou para ${plano.salaOrigem}. Foto de comprovação física arquivada.`,
            type: 'info'
        });
        if (typeof renderNotificacoes === 'function') renderNotificacoes();
    }

    // Fechar modal e atualizar telas
    fecharModalDevolucao();
    renderPainelAtrasosCoord();
    renderBannerAtrasosProf();

    alert(`🎉 Devolução registrada com sucesso!

Os materiais foram repostos no estoque da sala "${plano.salaOrigem}" e a foto de guarda física foi arquivada para consulta da Coordenação.`);
};

// Abrir foto grande com auditoria para a Coordenação
window.abrirFotoComprovanteDevolucao = function(planoId) {
    const plano = window.planosAulasControle.find(p => p.id === planoId);
    if (!plano || !plano.devolucao || !plano.devolucao.fotoUrl) {
        alert('Nenhum registro de foto encontrado para este plano.');
        return;
    }

    const img = document.getElementById('modal-foto-grande-img');
    const dados = document.getElementById('modal-foto-info-dados');

    img.src = plano.devolucao.fotoUrl;
    dados.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:8px;">
            <div><strong>Aula / Tema:</strong> ${plano.tema}</div>
            <div><strong>Turma:</strong> ${plano.turma}</div>
            <div><strong>Professor:</strong> ${plano.professorNome}</div>
            <div><strong>Data da Devolução:</strong> ${plano.devolucao.dataHora}</div>
            <div><strong>Local Físico de Guarda:</strong> <span style="color:var(--primary-color); font-weight:700;">${plano.salaOrigem}</span> (${plano.localizacaoOrigem})</div>
            <div><strong>Itens Conferidos:</strong> ${plano.materiaisTexto}</div>
        </div>
        <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #cbd5e1; font-style:italic; color:#475569;">
            <strong>Observações de Guarda:</strong> "${plano.devolucao.obs || 'Materiais em perfeito estado.'}"
        </div>
    `;

    openModal('visualizar-foto-devolucao-modal');
};

// Hook inicial para iniciar o monitor e renderizar telas
setTimeout(() => {
    iniciarMonitorAtrasoTempoReal();
    renderPainelAtrasosCoord();
    renderBannerAtrasosProf();
}, 500);


// =========================================================================
// SUÍTE DO ALUNO: INVENTÁRIO ROTATIVO, ESTOQUE CIRCULAR, TRANSFERÊNCIAS & RANKING
// =========================================================================

// Estado da Bancada e Pontuação
window.alunoBancadaAtual = {
    numero: 'Bancada 04',
    tipo: 'Máquina Reta Industrial',
    plano: 'PLAN-102 (Costura e Acabamentos)',
    professor: 'Prof. Roberto Silva',
    turma: 'Vestuário e Estilismo - Manhã',
    checkin: true,
    auditoriaFeita: true,
    pontos: 920,
    materiais: [
        { nome: 'Tesoura de Arremate Mundial (FER-004)', qtd: '1 un', condicao: 'Perfeita', status: 'OK' },
        { nome: 'Bobina de Linha Poliéster 120 (INS-012)', qtd: '2 un (Preta/Branca)', condicao: 'Novas', status: 'OK' },
        { nome: 'Fita Métrica 150cm (FER-008)', qtd: '1 un', condicao: 'Calibrada', status: 'OK' },
        { nome: 'Tecido Algodão Cru (MAT-001)', qtd: '5.0 metros', condicao: 'Rolo alocado', status: 'OK' }
    ]
};

// Catálogo de Retalhos & Sobras Reutilizáveis
window.catalogoRetalhos = [
    { id: 'RET-001', tipo: 'Algodão Cru', dimensoes: '35cm x 40cm', cor: 'Bege Natural', doador: 'Bancada 04 (Mariana)', uso: 'Ideal para teste de ponto em reta e bainha', status: 'Disponível', criadoEm: 'Hoje' },
    { id: 'RET-002', tipo: 'Malha Ribana', dimensoes: '20cm x 50cm', cor: 'Preto', doador: 'Bancada 01 (Pedro)', uso: 'Teste de elasticidade e overlock', status: 'Disponível', criadoEm: 'Hoje' },
    { id: 'RET-003', tipo: 'Tricoline Estampado', dimensoes: '25cm x 30cm', cor: 'Floral Azul', doador: 'Bancada 02 (João Silva)', uso: 'Pequenos bolsos e detalhes', status: 'Disponível', criadoEm: 'Ontem' },
    { id: 'RET-004', tipo: 'Jeans / Denim', dimensoes: '30cm x 30cm', cor: 'Azul Escuro 10oz', doador: 'Bancada 03 (Carlos)', uso: 'Teste de pesponto e linha pesada', status: 'Disponível', criadoEm: 'Hoje' },
    { id: 'RET-005', tipo: 'Algodão Cru', dimensoes: '15cm x 60cm', cor: 'Bege Cru', doador: 'Bancada 05 (Ana)', uso: 'Tiras para viés ou passantes', status: 'Disponível', criadoEm: 'Hoje' },
    { id: 'RET-006', tipo: 'Seda / Crepe', dimensoes: '20cm x 25cm', cor: 'Verde Esmeralda', doador: 'Bancada 06 (Lucas)', uso: 'Amostra de costura francesa', status: 'Disponível', criadoEm: 'Ontem' }
];

// Avisos Pedagógicos emitidos pelo Professor para a Turma
window.avisosTurmaProfessor = [
    {
        id: 1,
        autor: 'Prof. Roberto Silva',
        cargo: 'Professor de Modelagem e Costura',
        titulo: '📢 Aula Prática no Laboratório 02',
        texto: 'Turma de Vestuário: Nossa aula prática de hoje será no Lab de Modelagem 02. Desloquem-se às 08:15 levando suas tesouras de arremate e fita métrica.',
        data: 'Hoje às 08:00',
        tipo: 'aviso'
    },
    {
        id: 2,
        autor: 'Profª. Clara Mendes',
        cargo: 'Professora de Tecelagem e Acabamentos',
        titulo: '♻️ Uso Obrigatório do Catálogo de Retalhos',
        texto: 'Atenção alunos: antes de solicitar corte de tecido novo para testes de tensão de ponto nas máquinas industriais, utilizem os retalhos disponíveis no Estoque Circular!',
        data: 'Hoje às 09:30',
        tipo: 'sustentabilidade'
    },
    {
        id: 3,
        autor: 'Coordenação Pedagógica',
        cargo: 'Coordenação SENAI',
        titulo: '🔧 Manutenção Técnica das Máquinas Galoneiras',
        texto: 'Informamos que nesta sexta-feira teremos calibração e lubrificação técnica das máquinas galoneiras e overlocks do bloco têxtil.',
        data: 'Ontem às 16:00',
        tipo: 'info'
    }
];

// Renderizar informações da Bancada do Aluno
window.renderAlunoBancada = function() {
    const displayNum = document.getElementById('bancada-numero-display');
    if (displayNum) displayNum.innerText = `${window.alunoBancadaAtual.numero} - ${window.alunoBancadaAtual.tipo}`;
    const planoDisplay = document.getElementById('bancada-plano-nome');
    if (planoDisplay) planoDisplay.innerText = window.alunoBancadaAtual.plano;
};

// Trocar de Bancada
window.trocarBancadaAluno = function(novaBancada) {
    window.alunoBancadaAtual.numero = novaBancada;
    renderAlunoBancada();
    alert(`Bancada alterada para ${novaBancada}. Inventário sincronizado com o sistema.`);
};

// Fazer Check-in Presencial
window.fazerCheckinBancada = function() {
    window.alunoBancadaAtual.checkin = true;
    const btn = document.getElementById('btn-checkin-text');
    if (btn) btn.innerText = 'Check-in Realizado';
    alert('📍 Check-in presencial confirmado com sucesso na bancada!');
};

// Confirmar Auditoria Inicial 100% OK
window.confirmarAuditoriaBancadaOK = function() {
    window.alunoBancadaAtual.auditoriaFeita = true;
    window.alunoBancadaAtual.pontos += 50;
    const badge = document.getElementById('badge-auditoria-status');
    if (badge) {
        badge.innerHTML = '✅ Saldo Físico 100% OK (+50 pts no Ranking)';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
    }
    const pontosTotal = document.getElementById('aluno-pontos-total');
    if (pontosTotal) pontosTotal.innerText = `${window.alunoBancadaAtual.pontos} pts`;

    alert(`🎉 Auditoria Inicial Confirmada!\n\nSeu inventário rotativo físico confere perfeitamente com o saldo virtual do sistema.\nVocê ganhou +50 pontos no Ranking de Eficiência!`);
};

// Modais da Bancada
window.abrirModalDivergenciaBancada = function() {
    openModal('modal-divergencia-bancada');
};

window.salvarDivergenciaBancada = function(e) {
    e.preventDefault();
    const item = document.getElementById('div-item-nome').value;
    const tipo = document.getElementById('div-tipo').value;
    const detalhes = document.getElementById('div-detalhes').value;

    closeModal('modal-divergencia-bancada');
    alert(`⚠️ Divergência Registrada no Início da Aula!

Item: ${item}
Tipo: ${tipo}
Detalhes: "${detalhes}"

A ocorrência foi salva na nuvem. Você está isento de responsabilidade no fechamento do dia.`);
};

window.abrirModalTransferenciaBancada = function() {
    openModal('modal-transferencia-bancada');
};

window.salvarTransferenciaBancada = function(e) {
    e.preventDefault();
    const insumo = document.getElementById('transf-insumo').value;
    const destino = document.getElementById('transf-destino').value;
    const qtd = document.getElementById('transf-qtd').value;

    closeModal('modal-transferencia-bancada');
    alert(`🔄 Transferência Realizada com Sucesso!

${qtd}x ${insumo} transferido da sua bancada para a ${destino}.
Saldo atualizado no sistema sem sobrecarregar o professor.`);
};

window.abrirModalSolicitarReposicao = function() {
    openModal('modal-reposicao-bancada');
};

window.salvarSolicitacaoReposicao = function(e) {
    e.preventDefault();
    const insumo = document.getElementById('rep-insumo').value;
    const urgencia = document.getElementById('rep-urgencia').value;

    closeModal('modal-reposicao-bancada');
    alert(`📦 Alerta de Reposição Enviado!

Insumo: "${insumo}" (${urgencia}).
O professor e a equipe de logística foram notificados para separar o material.`);
};

// Fechamento de Aula com envio de retalhos ao catálogo circular
window.registrarFechamentoAulaAluno = function() {
    const qtdBoa = parseFloat(document.getElementById('aluno-qtd-boa')?.value || 0);
    const qtdRetalho = parseFloat(document.getElementById('aluno-qtd-retalho')?.value || 0);
    const qtdRefugo = parseFloat(document.getElementById('aluno-qtd-refugo')?.value || 0);

    const total = qtdBoa + qtdRetalho + qtdRefugo;
    const aproveitamento = total > 0 ? Math.round(((qtdBoa + qtdRetalho) / total) * 100) : 90;

    // Se houver retalhos sobrando, adiciona ao estoque circular automaticamente!
    if (qtdRetalho > 0) {
        window.catalogoRetalhos.unshift({
            id: 'RET-' + Math.floor(100 + Math.random()*900),
            tipo: 'Tecido Algodão Cru',
            dimensoes: `${Math.round(qtdRetalho * 50)}cm x 40cm`,
            cor: 'Bege Natural',
            doador: `${window.alunoBancadaAtual.numero} (Você)`,
            uso: 'Sobra reaproveitável do fechamento da aula',
            status: 'Disponível',
            criadoEm: 'Agora'
        });
        window.alunoBancadaAtual.pontos += 40;
    }

    alert(`🏆 Fechamento de Aula Concluído!

Eficiência Sustentável: ${aproveitamento}%
Sua sobra de ${qtdRetalho}m de retalho foi enviada automaticamente para o Estoque Circular da turma!
Você ganhou +40 pontos no Ranking de Cultura Logística.`);
};

// Renderizar Catálogo de Retalhos & Estoque Circular
window.renderCatalogoRetalhos = function(filtro = 'todos') {
    const grid = document.getElementById('catalogo-retalhos-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const itens = filtro === 'todos' 
        ? window.catalogoRetalhos 
        : window.catalogoRetalhos.filter(r => r.tipo.toLowerCase().includes(filtro.toLowerCase()));

    itens.forEach(ret => {
        grid.innerHTML += `
            <div class="product-card" style="border-top: 4px solid var(--success-color);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <span class="badge" style="background:rgba(16, 185, 129, 0.1); color:#10b981; font-weight:700; font-size:11px;">
                        ♻️ ${ret.tipo}
                    </span>
                    <span style="font-size:11px; color:var(--text-secondary);">${ret.criadoEm}</span>
                </div>
                <h4 style="font-size:15px; font-weight:700; margin:4px 0; color:var(--text-primary);">${ret.dimensoes}</h4>
                <p style="font-size:12px; color:var(--text-secondary); margin:2px 0 6px;">Cor: <strong>${ret.cor}</strong> &bull; Doador: <strong>${ret.doador}</strong></p>
                <div style="font-size:12px; font-style:italic; color:#475569; background:#f8fafc; padding:6px 10px; border-radius:6px; margin-bottom:12px;">
                    "${ret.uso}"
                </div>
                <button type="button" class="primary-btn" onclick="requisitarRetalhoCircular('${ret.id}')" style="width:100%; justify-content:center; padding:9px; font-size:12.5px; background:var(--success-color);">
                    <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">recycling</span> Requisitar para Teste (+20 pts)
                </button>
            </div>
        `;
    });
};

window.filtrarRetalhos = function(categoria) {
    renderCatalogoRetalhos(categoria);
};

window.requisitarRetalhoCircular = function(retId) {
    const item = window.catalogoRetalhos.find(r => r.id === retId);
    if (!item) return;

    window.alunoBancadaAtual.pontos += 20;
    const pontosTotal = document.getElementById('aluno-pontos-total');
    if (pontosTotal) pontosTotal.innerText = `${window.alunoBancadaAtual.pontos} pts`;

    alert(`✨ Retalho Requisitado com Sucesso!

Você requisitou "${item.dimensoes} de ${item.tipo}" doado por ${item.doador}.
Parabéns por evitar o corte de tecido novo para teste! +20 pontos de sustentabilidade creditados.`);
};

window.abrirModalDoarRetalho = function() {
    openModal('modal-doar-retalho');
};

window.salvarDoacaoRetalho = function(e) {
    e.preventDefault();
    const tipo = document.getElementById('ret-tipo').value;
    const dimensoes = document.getElementById('ret-dimensoes').value;
    const cor = document.getElementById('ret-cor').value || 'Padrão';
    const uso = document.getElementById('ret-uso').value || 'Amostras e testes';

    window.catalogoRetalhos.unshift({
        id: 'RET-' + Math.floor(100 + Math.random()*900),
        tipo: tipo,
        dimensoes: dimensoes,
        cor: cor,
        doador: `${window.alunoBancadaAtual.numero} (Você)`,
        uso: uso,
        status: 'Disponível',
        criadoEm: 'Agora'
    });

    window.alunoBancadaAtual.pontos += 30;
    const pontosTotal = document.getElementById('aluno-pontos-total');
    if (pontosTotal) pontosTotal.innerText = `${window.alunoBancadaAtual.pontos} pts`;

    closeModal('modal-doar-retalho');
    renderCatalogoRetalhos();
    alert(`🎉 Retalho Cadastrado no Estoque Circular!

Dimensões: ${dimensoes} (${tipo}).
Todos os alunos da turma agora podem reaproveitar essa sobra. Você ganhou +30 pontos!`);
};

// Renderizar Ranking de Eficiência
window.renderRankingEficiencia = function() {
    const pontosTotal = document.getElementById('aluno-pontos-total');
    if (pontosTotal) pontosTotal.innerText = `${window.alunoBancadaAtual.pontos} pts`;
};

// Renderizar Avisos da Turma / Notificações do Aluno
window.renderNotificacoesAluno = function() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    list.innerHTML = '';
    window.avisosTurmaProfessor.forEach(aviso => {
        list.innerHTML += `
            <div class="notification-item" style="border-left: 4px solid var(--primary-color);">
                <div class="notif-icon" style="color:var(--primary-color); background:rgba(67, 97, 238, 0.1);">
                    <span class="material-icons-outlined">campaign</span>
                </div>
                <div class="notif-content">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; font-size:15px;">${aviso.titulo}</h4>
                        <span style="font-size:11px; color:var(--text-secondary);">${aviso.data}</span>
                    </div>
                    <p style="margin:4px 0 0; font-size:13px; line-height:1.5;">${aviso.texto}</p>
                    <span style="display:inline-block; margin-top:6px; font-size:11px; color:var(--primary-color); font-weight:700;">
                        Por: ${aviso.autor} (${aviso.cargo})
                    </span>
                </div>
            </div>
        `;
    });
};

// Atualização do Perfil com Dados Demográficos
window.salvarEdicaoPerfil = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-perfil');
    if (btn) btn.innerText = 'Salvando no Firebase...';

    const novoNome = document.getElementById('edit-perfil-nome').value.trim();
    const novaEscola = document.getElementById('edit-perfil-escola').value.trim();
    const novoEmail = document.getElementById('edit-perfil-email').value.trim();
    const novaTurma = document.getElementById('edit-perfil-turma')?.value.trim() || 'Vestuário e Estilismo - Manhã';
    const novaIdade = document.getElementById('edit-perfil-idade')?.value.trim() || '19';
    const novoSexo = document.getElementById('edit-perfil-sexo')?.value || 'Masculino';
    const novaRaca = document.getElementById('edit-perfil-raca')?.value || 'Parda';
    const novaSenha = document.getElementById('edit-perfil-senha')?.value.trim();

    currentUser.nome = novoNome;
    currentUser.escola = novaEscola;
    currentUser.email = novoEmail;
    currentUser.turma = novaTurma;
    currentUser.idade = novaIdade;
    currentUser.sexo = novoSexo;
    currentUser.raca = novaRaca;

    // Atualiza telas
    document.getElementById('profile-name').innerText = novoNome;
    document.getElementById('profile-school').innerHTML = `<span class="material-icons-outlined" style="font-size:18px; vertical-align:middle; color: var(--primary-color); margin-right:4px;">school</span> ${novaEscola}`;
    const pTurma = document.getElementById('profile-turma');
    if (pTurma) pTurma.innerText = novaTurma;
    const pIdade = document.getElementById('profile-idade');
    if (pIdade) pIdade.innerText = `${novaIdade} anos`;
    const pSexo = document.getElementById('profile-sexo');
    if (pSexo) pSexo.innerText = novoSexo;
    const pRaca = document.getElementById('profile-raca');
    if (pRaca) pRaca.innerText = novaRaca;

    // Salva no Firestore
    if (db && currentUser.id) {
        try {
            await db.collection('usuarios').doc(currentUser.id).set({
                ...currentUser,
                atualizadoEm: new Date().toISOString()
            }, { merge: true });
            console.log('✅ Perfil atualizado no Firestore!');
        } catch(err) {
            console.warn('Erro ao atualizar no Firestore:', err);
        }
    }

    sessionStorage.setItem('senaivest_session', JSON.stringify(currentUser));
    closeModal('editar-perfil-modal');
    if (btn) btn.innerText = 'Salvar Alterações no Firebase';
    alert('🎉 Perfil e dados demográficos atualizados com sucesso no sistema!');
};

