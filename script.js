// =========================================================================
// SISTEMA ELEGANTE DE NOTIFICAÇÕES TOAST (SUBSTITUI OS ALERTS DO NAVEGADOR)
// =========================================================================
window.mostrarToast = function(titulo, mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log(`[${tipo.toUpperCase()}] ${titulo}: ${mensagem}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${tipo}`;

    const iconMap = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning_amber',
        info: 'info'
    };
    const icon = iconMap[tipo] || 'notifications';

    toast.innerHTML = `
        <div class="toast-icon">
            <span class="material-icons-outlined">${icon}</span>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-desc">${mensagem}</div>
        </div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()" title="Fechar">
            <span class="material-icons-outlined" style="font-size:18px;">close</span>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 350);
    }, 4500);
};

// =========================================================================
// FUNÇÕES AUXILIARES DE DATA E HORA LOCAL (Evita bug de fuso horário UTC)
// =========================================================================
window.getHojeFormatadoLocal = function() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

window.getHoraMinutoLocal = function() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

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

// Carregamento persistente de salas adicionadas
try {
    const salvosSalas = localStorage.getItem('senaivest_salas');
    if (salvosSalas) {
        const parsedSalas = JSON.parse(salvosSalas);
        if (Array.isArray(parsedSalas) && parsedSalas.length > 0) {
            mockSalas.length = 0;
            parsedSalas.forEach(s => mockSalas.push(s));
        }
    }
} catch(e) {}

window.salvarNovaSala = function(e) {
    if (e) e.preventDefault();
    const nomeInput = document.getElementById('nova-sala-nome');
    const tipoInput = document.getElementById('nova-sala-tipo');
    if (!nomeInput) return;
    const nome = nomeInput.value.trim();
    const tipo = tipoInput ? tipoInput.value : 'Modelagem & Costura de Vestuário';
    if (!nome) return;

    const nova = {
        id: mockSalas.length + 1,
        nome: nome,
        tipo: tipo,
        qtd: 0
    };
    mockSalas.push(nova);
    try {
        localStorage.setItem('senaivest_salas', JSON.stringify(mockSalas));
    } catch(err) {}

    if (typeof renderSalas === 'function') renderSalas();
    if (typeof renderMonitoramento === 'function') renderMonitoramento();
    
    closeModal('nova-sala-modal');
    nomeInput.value = '';

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Sala Cadastrada', `A sala "${nome}" foi registrada e adicionada ao almoxarifado e monitoramento.`, 'success');
    } else {
        alert(`Sala "${nome}" cadastrada com sucesso!`);
    }
};


const defaultMateriais = [
    { cod: 'MAT-001', nome: 'Tecido Algodão Cru', tipo: 'Insumo', qtd: 50, preco: 'R$ 15,90', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira A1', horarioEntrada: '16:22', responsavel: 'Giovani Azevedo', imagem: 'tecido_algodao.jpg' },
    { cod: 'MAT-002', nome: 'Tesoura Alfaiate', tipo: 'Ferramenta', qtd: 6, preco: 'R$ 45,00', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Gaveta 2', horarioEntrada: '14:10', responsavel: 'Giovani Azevedo', imagem: 'tesoura_alfaiate.jpg' },
    { cod: 'MAT-003', nome: 'Agulha Industrial Reta 14', tipo: 'Insumo', qtd: 150, preco: 'R$ 1,20', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 02 - Costura', local: 'Gaveta 1' },
    { cod: 'MAT-004', nome: 'Fio de Overlock 100% Poliéster', tipo: 'Insumo', qtd: 24, preco: 'R$ 18,50', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 02 - Costura', local: 'Prateleira B3' },
    { cod: 'MAT-005', nome: 'Fita Métrica 150cm Profissional', tipo: 'Ferramenta', qtd: 20, preco: 'R$ 8,00', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Armário A' },
    { cod: 'MAT-006', nome: 'Régua de Alfaiate Curva Francesa', tipo: 'Ferramenta', qtd: 12, preco: 'R$ 22,00', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Suporte Réguas' },
    { cod: 'MAT-007', nome: 'Carretilha de Marcação', tipo: 'Ferramenta', qtd: 15, preco: 'R$ 14,00', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Gaveta 2' },
    { cod: 'MAT-008', nome: 'Bobina de Metal para Reta Industrial', tipo: 'Ferramenta', qtd: 40, preco: 'R$ 3,50', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 02 - Costura', local: 'Caixa Gaveta' },
    { cod: 'MAT-009', nome: 'Desmanchador de Costura', tipo: 'Ferramenta', qtd: 18, preco: 'R$ 6,00', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 02 - Costura', local: 'Gaveta 1' },
    { cod: 'MAT-010', nome: 'Giz de Alfaiate Especial', tipo: 'Insumo', qtd: 30, preco: 'R$ 4,50', almoxOrigem: 'Estoque Central', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira A2' }
];

let mockMateriais = [...defaultMateriais];
try {
    const salvosMats = localStorage.getItem('senaivest_materiais');
    if (salvosMats) {
        const parsedMats = JSON.parse(salvosMats);
        if (Array.isArray(parsedMats) && parsedMats.length > 0) {
            mockMateriais = parsedMats;
        }
    }
} catch(e) {}

window.mockMateriais = mockMateriais;

// Enriquecer dados dos materiais carregados do storage com imagens e metadados oficiais
if (Array.isArray(mockMateriais)) {
    mockMateriais.forEach(m => {
        if (!m.horarioEntrada) m.horarioEntrada = '16:22';
        if (!m.responsavel) m.responsavel = 'Giovani Azevedo';
        const cod = m.cod || m.codigo || '';
        const nLower = (m.nome || '').toLowerCase();
        if (!m.imagem || m.imagem === 'inventory_2') {
            if (cod === 'MAT-001' || nLower.includes('tecido') || nLower.includes('algodão')) {
                m.imagem = 'tecido_algodao.jpg';
            } else if (cod === 'MAT-002' || nLower.includes('tesoura')) {
                m.imagem = 'tesoura_alfaiate.jpg';
            }
        }
    });
}

function salvarMateriaisStorage() {
    try {
        localStorage.setItem('senaivest_materiais', JSON.stringify(mockMateriais));
        window.mockMateriais = mockMateriais;
    } catch(e) {}
}

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
                        searchDropdown.innerHTML = '<div style="padding:16px; color:var(--text-secondary); text-align:center;">Nenhum item encontrado para esta busca.</div>';
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
                    searchDropdown.innerHTML = '<div style="padding:16px; color:var(--danger-color); text-align:center;">Erro ao realizar a busca.</div>';
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
    document.getElementById('form-plano').addEventListener('submit', async (e) => {
        e.preventDefault();
        const idEdit = document.getElementById('p-id') ? document.getElementById('p-id').value : '';
        const tema = document.getElementById('p-tema').value.trim();
        const inicio = document.getElementById('p-inicio').value;
        const termino = document.getElementById('p-termino').value;
        const dia = document.getElementById('p-dia').value;
        const local = document.getElementById('p-local').value;
        const tempoPreparo = document.getElementById('p-tempo').value || '15';
        const turma = document.getElementById('p-turma') ? document.getElementById('p-turma').value : 'Vestuário e Estilismo - Manhã';
        
        const matSelect = document.getElementById('p-mat');
        let mats = [];
        let needsTransfer = [];
        let matsBloqueados = [];
        
        const chavesMats = Object.keys(window.selectedMateriaisPlano || {});
        if (chavesMats.length > 0) {
            chavesMats.forEach(codOpt => {
                const item = window.selectedMateriaisPlano[codOpt];
                if (typeof window.verificarStatusReservaMaterial === 'function') {
                    const reserva = window.verificarStatusReservaMaterial(codOpt, item.nome, idEdit);
                    if (reserva.reservado) {
                        matsBloqueados.push(`"${item.nome}" (em uso por ${reserva.professor} na ${reserva.sala})`);
                    }
                }
                mats.push(`${item.nome} (${item.qtd} un.)`);
                if (item.sala && local && item.sala !== local) {
                    needsTransfer.push(`${item.nome} (${item.qtd} un. de ${item.sala})`);
                }
            });
        } else if (matSelect) {
            Array.from(matSelect.selectedOptions).forEach(opt => {
                const codOpt = opt.value;
                const nomeOpt = opt.text.split(' - ')[1] ? opt.text.split(' - ')[1].split(' (')[0] : opt.text;
                if (typeof window.verificarStatusReservaMaterial === 'function') {
                    const reserva = window.verificarStatusReservaMaterial(codOpt, nomeOpt, idEdit);
                    if (reserva.reservado) {
                        matsBloqueados.push(`"${nomeOpt}" (em uso por ${reserva.professor} na ${reserva.sala})`);
                    }
                }
                mats.push(opt.text.replace('🟢 ', '').replace('⛔ ', ''));
                const matSala = opt.getAttribute('data-sala');
                if (matSala && local && matSala !== local) {
                    needsTransfer.push(nomeOpt);
                }
            });
        }
        
        if (matsBloqueados.length > 0) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('Material Indisponível', `O(s) seguinte(s) material(is) já estão em uso em outra aula ativa: ${matsBloqueados.join(', ')}. Aguarde a devolução ao estoque!`, 'error');
            } else {
                alert(`Atenção: O(s) material(is) abaixo estão em uso:\n${matsBloqueados.join('\n')}\nAguarde a devolução física ao estoque.`);
            }
            return;
        }

        if (needsTransfer.length > 0) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('Transferência de Materiais', `Os seguintes materiais não estão na sala selecionada (${local}): ${needsTransfer.join(', ')}`, 'info');
            }
        }
        
        let matsStr = mats.join(', ');
        if(!matsStr) matsStr = 'Nenhum material';
        
        const now = new Date();
        const currentHora = (typeof window.getHoraMinutoLocal === 'function') ? window.getHoraMinutoLocal() : (String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'));
        const todayStr = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const isHoje = (dia === todayStr);
        const isEmAndamento = isHoje && (inicio <= currentHora && termino >= currentHora);
        const isAtrasado = isHoje && (currentHora > termino);

        let statusSala = 'Disponível';
        if (isEmAndamento) {
            statusSala = 'Ocupada';
        } else if (isHoje && inicio > currentHora) {
            statusSala = 'Agendada';
        }
        
        const profNomeDigitado = document.getElementById('p-professor') ? document.getElementById('p-professor').value.trim() : '';
        const profIdDigitado = document.getElementById('p-professor-id') ? document.getElementById('p-professor-id').value.trim() : '';
        const profFinal = (profNomeDigitado && typeof window.obterNomeLimpoUsuario === 'function') 
            ? window.obterNomeLimpoUsuario(profNomeDigitado, profIdDigitado || currentUser.id, 'Professor') 
            : (profNomeDigitado || currentUser.nome || 'Prof. Giovani Azevedo');
        const profIdFinal = profIdDigitado || currentUser.id || 'PROF-1234567';

        const horario = `${inicio} às ${termino}`;
        const planoId = idEdit || ('PLAN-' + (new Date().getFullYear()) + '-' + Math.floor(1000 + Math.random()*9000));
        
        const planoObj = {
            id: planoId,
            plano: tema,
            tema: tema,
            horario: horario,
            inicio: inicio,
            termino: termino,
            dia: dia,
            sala: local,
            local: local,
            materiais: matsStr,
            salaRetirada: local,
            tempoPreparo: tempoPreparo,
            professor: profFinal,
            professorId: profIdFinal,
            turma: turma,
            timestamp: Date.now(),
            status: isEmAndamento ? 'Em Andamento' : (isAtrasado ? 'Finalizada' : 'Agendado'),
            liberado: true,
            isAvulso: false
        };

        // Salvar no LocalStorage (senaivest_planos_aula)
        let planos = [];
        try {
            const salvos = localStorage.getItem('senaivest_planos_aula');
            if (salvos) planos = JSON.parse(salvos);
        } catch(err) {}

        const idxExistente = planos.findIndex(p => p.id === planoId);
        if (idxExistente >= 0) {
            planos[idxExistente] = { ...planos[idxExistente], ...planoObj };
        } else {
            planos.unshift(planoObj);
        }
        localStorage.setItem('senaivest_planos_aula', JSON.stringify(planos));

        // Atualizar window.mockPlanos
        if (!window.mockPlanos) window.mockPlanos = [];
        const mIdx = window.mockPlanos.findIndex(p => p.id === planoId);
        if (mIdx >= 0) {
            window.mockPlanos[mIdx] = { ...window.mockPlanos[mIdx], ...planoObj };
        } else {
            window.mockPlanos.unshift(planoObj);
        }

        // Atualizar controle de atrasos (window.planosAulasControle)
        if (!window.planosAulasControle) window.planosAulasControle = [];
        const ctrlIdx = window.planosAulasControle.findIndex(p => p.id === planoId);
        const ctrlObj = {
            id: planoId,
            tema: tema,
            turma: turma,
            professorId: profIdFinal,
            professorNome: profFinal,
            salaUso: local,
            salaOrigem: local,
            localizacaoOrigem: local,
            materiaisTexto: matsStr,
            horarioRetirada: `${dia} às ${inicio}`,
            horarioLimite: `${dia} às ${termino}`,
            timestampRetirada: Date.now(),
            timestampLimite: new Date(`${dia}T${termino}:00`).getTime() || (Date.now() + 2 * 3600 * 1000),
            status: isAtrasado ? 'atrasado' : (isEmAndamento ? 'em_aula' : 'agendado'),
            devolucao: null
        };
        if (ctrlIdx >= 0) {
            window.planosAulasControle[ctrlIdx] = { ...window.planosAulasControle[ctrlIdx], ...ctrlObj };
        } else {
            window.planosAulasControle.unshift(ctrlObj);
        }
        if (typeof salvarPlanosAulasStorage === 'function') salvarPlanosAulasStorage();

        // Integrando com o Cloud Firestore se conectado
        if (db) {
            try {
                await db.collection('planos_aula').doc(planoId).set(planoObj, { merge: true });
            } catch(fsErr) {}
        }

        // Geração do Sub-banco de Dados Google Drive: Documento Oficial Redundante
        const dataFormatadaDoc = dia || (new Date().toISOString().split('T')[0]);
        const horarioSanitizado = (horario || `${inicio}_${termino}`).replace(/[\s:]+/g, '-');
        const profNomeSanitizado = (profFinal || 'Professor').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileNameDrive = `Plano_${profNomeSanitizado}_${dataFormatadaDoc}_${horarioSanitizado}.json`;

        const planoDocumentoCompleto = {
            tipoDocumento: "Plano de Aula Oficial - SENAI",
            versao: "2.0",
            codigoPlano: planoId,
            titulo: tema,
            professor: {
                nome: profFinal,
                id: profIdFinal
            },
            agendamento: {
                data: dia,
                horarioCompleto: horario,
                horaInicio: inicio,
                horaTermino: termino,
                tempoPreparoMinutos: tempoPreparo
            },
            localizacao: {
                salaLaboratorio: local,
                salaRetirada: local
            },
            turmaVinculada: turma,
            materiaisRequisitados: matsStr,
            statusExecucao: isEmAndamento ? 'Em Andamento' : (isAtrasado ? 'Finalizada' : 'Agendado'),
            metadados: {
                criadoEm: new Date().toISOString(),
                pastaDriveDestino: '1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj',
                pastaDriveUrl: 'https://drive.google.com/drive/folders/1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj?usp=sharing',
                nomeArquivoDrive: fileNameDrive,
                origem: 'Senaivest 2.0 Web Platform'
            }
        };

        // Salvar no Sub-banco local de documentos (Garante redundância permanente)
        try {
            let subBanco = [];
            const sbSalvo = localStorage.getItem('senaivest_planos_sub_banco');
            if (sbSalvo) subBanco = JSON.parse(sbSalvo);
            const sbIdx = subBanco.findIndex(item => item.id === planoId);
            const subItem = {
                id: planoId,
                arquivo: fileNameDrive,
                dataHora: new Date().toISOString(),
                documento: planoDocumentoCompleto
            };
            if (sbIdx >= 0) {
                subBanco[sbIdx] = subItem;
            } else {
                subBanco.unshift(subItem);
            }
            localStorage.setItem('senaivest_planos_sub_banco', JSON.stringify(subBanco));
        } catch(sbErr) {
            console.warn("Erro ao salvar no sub-banco local:", sbErr);
        }

        window.ultimoPlanoDocumentoSalvo = {
            id: planoId,
            nomeArquivo: fileNameDrive,
            documento: planoDocumentoCompleto
        };

        // Integrando com o Google Sheets & Sub-banco Google Drive
        try {
            enviarParaPlanilhaGoogle({
                action: 'savePlanDrive',
                folderId: '1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj',
                fileName: fileNameDrive,
                documentoCompleto: planoDocumentoCompleto,
                tipoCadastro: 'Plano de Aula',
                professor: profFinal,
                codigoPlano: planoId,
                horario: dia + ' ' + horario,
                sala: local,
                produtoUsado: matsStr,
                turma: turma
            });
        } catch(gsErr) {}

        if (typeof renderPlan === 'function') {
            renderPlan(tema, horario, profFinal, true, matsStr, 'Diversas', dia, local, tempoPreparo, turma);
        }
        if (typeof renderPlanosProfessor === 'function') renderPlanosProfessor();
        if (typeof populateDiarioPlanos === 'function') populateDiarioPlanos();

        closeModal('plano-modal');
        document.getElementById('form-plano').reset();
        if (document.getElementById('p-id')) document.getElementById('p-id').value = '';

        // Exibir confirmação moderna no modal dedicado (Zero popups nativos)
        const detalhesEl = document.getElementById('modal-plano-sucesso-detalhes');
        if (detalhesEl) {
            detalhesEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px dashed var(--border-color); padding-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Código do Plano:</span>
                    <strong style="color:var(--primary-color); font-family:monospace; font-size:14px;">${planoId}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Tema da Aula:</span>
                    <strong style="color:var(--text-primary);">${tema || 'Aula Prática'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Turma:</span>
                    <span style="font-weight:600;">${turma}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Data & Horário:</span>
                    <span>${dia} (${horario})</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Local / Laboratório:</span>
                    <strong>${local}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:var(--text-secondary); font-weight:600;">Status:</span>
                    <span>${statusSala === 'Ocupada' ? '<strong style="color:#ef4444; background:rgba(239,68,68,0.1); padding:2px 8px; border-radius:6px;">● Ocupada Agora (Em Aula)</strong>' : '<strong style="color:#f59e0b; background:rgba(245,158,11,0.1); padding:2px 8px; border-radius:6px;">● Agendada no Sistema</strong>'}</span>
                </div>
                <div style="margin-top:10px; padding-top:8px; border-top:1px dashed var(--border-color); font-size:12px; color:var(--text-secondary);">
                    <strong>Materiais Agendados:</strong> ${matsStr}
                </div>
                <div style="margin-top:14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:12px;">
                    <div style="display:flex; align-items:center; gap:8px; color:#065f46; font-weight:700; font-size:12.5px; margin-bottom:4px;">
                        <span class="material-icons-outlined" style="font-size:18px; color:#10b981;">cloud_done</span>
                        Sub-banco de Dados Google Drive Ativo
                    </div>
                    <div style="font-size:11.5px; color:#047857; line-height:1.4;">
                        Documento oficial estruturado gerado como redundância:
                        <code style="background:rgba(255,255,255,0.7); padding:2px 6px; border-radius:4px; font-weight:700; word-break:break-all; display:block; margin-top:4px;">${fileNameDrive}</code>
                    </div>
                </div>
            `;
            if (typeof openModal === 'function') openModal('modal-plano-sucesso');
        }

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(`Plano "${tema}" Salvo!`, `Turma: ${turma} &bull; Sala: ${local} (${horario})`, 'success');
        }

        if (typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
        if (typeof renderMonitoramento === 'function') renderMonitoramento();
        if (typeof renderProfessoresGrid === 'function') renderProfessoresGrid();
        if (typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
        if (typeof renderPainelAtrasosCoord === 'function') renderPainelAtrasosCoord();
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
    
    const novoItemProd = {
        cod: cod || `MAT-00${mockMateriais.length + 1}`,
        nome: nome,
        tipo: tipo,
        qtd: parseInt(qtd),
        preco: preco || 'R$ 0,00',
        almoxOrigem: almox,
        almoxAtual: almox,
        local: local
    };
    mockMateriais.push(novoItemProd);
    salvarMateriaisStorage();

    if (typeof window.populateNovoMatEstoqueSelect === 'function') window.populateNovoMatEstoqueSelect();
    if (typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
    if (typeof renderSalas === 'function') renderSalas();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Produto Cadastrado', `${nome} (${novoItemProd.cod}) adicionado ao estoque do almoxarifado!`, 'success');
    } else {
        alert('Produto Cadastrado com Sucesso!');
    }
    
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
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aquisicao', this)"><span class="material-icons-outlined">shopping_cart</span> <span class="nav-text">Aquisição</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-cadastro-prof', this)"><span class="material-icons-outlined">person_add</span> <span class="nav-text">Professores</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-planos', this); if(typeof renderPlanosGeral === 'function') renderPlanosGeral();"><span class="material-icons-outlined">menu_book</span> <span class="nav-text">Todos os Planos</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-monitoramento', this)"><span class="material-icons-outlined">meeting_room</span> <span class="nav-text">Monitoramento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-acompanhamento', this)"><span class="material-icons-outlined">people</span> <span class="nav-text">Acompanhamento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-notificacoes', this)"><span class="material-icons-outlined">campaign</span> <span class="nav-text">Avisos</span></li>`;
            nav('view-dashboard-coord', menu.firstElementChild);
            if (typeof renderCoordDashboard === 'function') renderCoordDashboard();
        } else if (currentUser.role === 'Aluno') {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-aluno-bancada', this); if(typeof renderAlunoBancada === 'function') renderAlunoBancada();"><span class="material-icons-outlined">precision_manufacturing</span> <span class="nav-text">Minha Bancada</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aluno-retalhos', this); if(typeof renderCatalogoRetalhos === 'function') renderCatalogoRetalhos();"><span class="material-icons-outlined">recycling</span> <span class="nav-text">Estoque Circular (Retalhos)</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aluno-ranking', this); if(typeof renderRankingEficiencia === 'function') renderRankingEficiencia();"><span class="material-icons-outlined">emoji_events</span> <span class="nav-text">Ranking de Eficiência</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-notificacoes', this)"><span class="material-icons-outlined">campaign</span> <span class="nav-text">Avisos</span></li>`;
            nav('view-aluno-bancada', menu.firstElementChild);
        } else {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-dashboard-prof', this)"><span class="material-icons-outlined">dashboard</span> <span class="nav-text">Painel do Professor</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-salas', this)"><span class="material-icons-outlined">category</span> <span class="nav-text">Salas Virtuais</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-diario-classe', this)"><span class="material-icons-outlined">fact_check</span> <span class="nav-text">Diário & Bancadas</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-planos', this)"><span class="material-icons-outlined">menu_book</span> <span class="nav-text">Planos de Aula</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-monitoramento', this)"><span class="material-icons-outlined">meeting_room</span> <span class="nav-text">Monitoramento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-boletins-novo', this)"><span class="material-icons-outlined">report_problem</span> <span class="nav-text">Novo Boletim</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-processos', this)"><span class="material-icons-outlined">sync_alt</span> <span class="nav-text">Meus Boletins</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-acompanhamento', this)"><span class="material-icons-outlined">people</span> <span class="nav-text">Acompanhamento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-notificacoes', this)"><span class="material-icons-outlined">campaign</span> <span class="nav-text">Avisos</span></li>`;
            nav('view-dashboard-prof', menu.firstElementChild);
            if (typeof renderProfDashboard === 'function') renderProfDashboard();
        }
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
    try { if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf(); } catch(e){ console.error(e); }
    try { if (typeof renderPainelAvisos === 'function') renderPainelAvisos(); } catch(e){ console.error(e); }
    if (document.getElementById('plans-grid')) document.getElementById('plans-grid').innerHTML = '';
    try {
        if (typeof renderPlan === 'function') {
            renderPlan('Modelagem Básica', '08:00 às 10:00', (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo', false, 'MAT-001 - Tecido Algodão', 'Sala 01 - Modelagem', '2026-10-01', 'Lab Modelagem');
        }
    } catch(e) { console.error(e); }
}

window.nav = function(viewId, element) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    if(viewId === 'view-dashboard-prof') {
        if(typeof renderProfDashboard === 'function') renderProfDashboard();
    }
    if(viewId === 'view-diario-classe') {
        if(typeof populateDiarioPlanos === 'function') populateDiarioPlanos();
        const sel = document.getElementById('diario-plano-select');
        if(sel && !sel.value) {
            if(typeof window.renderDiarioHistoricoAulas === 'function') window.renderDiarioHistoricoAulas();
        } else {
            if(typeof window.renderDiarioAlunos === 'function') window.renderDiarioAlunos();
            if(typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();
        }
    }
    if(viewId === 'view-dashboard-coord' && typeof renderPainelAtrasosCoord === 'function') {
        renderPainelAtrasosCoord();
    }
    if(viewId === 'view-planos') {
        if(typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
        if(typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
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
    if(viewId === 'view-checkin-bancada') {
        if(typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
        if(typeof window.populateNovoMatEstoqueSelect === 'function') window.populateNovoMatEstoqueSelect();
    }
    if(viewId === 'view-monitoramento') {
        if(typeof renderMonitoramento === 'function') renderMonitoramento();
    }
    if(viewId === 'view-notificacoes') {
        if(typeof renderPainelAvisos === 'function') {
            renderPainelAvisos();
        }
        if(typeof renderAlertasAutomaticosEstoque === 'function') {
            renderAlertasAutomaticosEstoque();
        }
        if(currentUser.role === 'Aluno' && typeof renderNotificacoesAluno === 'function') {
            renderNotificacoesAluno();
        }
    }
    if(viewId === 'view-acompanhamento') {
        if(typeof renderAcompanhamento === 'function') renderAcompanhamento();
        if(typeof renderAcompanhamentoProfessores === 'function') renderAcompanhamentoProfessores();
    }

    
    if(element) {
        document.querySelectorAll('.nav-item').forEach(v => v.classList.remove('active'));
        element.classList.add('active');
    }
}

function renderSalas() {
    const grid = document.getElementById('salas-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];

    mockSalas.forEach(s => {
        // Matemática verdadeira: conta os materiais reais cadastrados neste almoxarifado/sala
        const matsDaSala = mats.filter(m => (m.almoxAtual || m.salaOrigem || '') === s.nome);
        const totalItens = matsDaSala.length;
        const totalUnidades = matsDaSala.reduce((acc, m) => acc + (parseFloat(m.qtd) || 0), 0);
        const temItens = totalItens > 0;
        const badgeTexto = temItens ? `${totalItens} ${totalItens === 1 ? 'Item' : 'Itens'} (${totalUnidades} un)` : '0 Itens';
        const badgeClass = temItens ? 'sala-badge com-itens' : 'sala-badge sem-itens';

        grid.innerHTML += `
            <div class="sala-card" onclick="abrirSala('${s.nome}')">
                <div class="sala-card-bg"></div>
                <div class="sala-content-top">
                    <div class="sala-icon"><span class="material-icons-outlined">meeting_room</span></div>
                    <div class="${badgeClass}">${badgeTexto}</div>
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

window.salaAbertaAtual = '';
window.categoriaFiltroAtual = 'todos';

function abrirSala(nome) {
    window.salaAbertaAtual = nome;
    window.categoriaFiltroAtual = 'todos';
    
    const tituloEl = document.getElementById('sala-detalhe-titulo');
    if (tituloEl) tituloEl.innerText = nome;
    
    const grid = document.getElementById('sala-materiais-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const produtosSala = mats.filter(m => (m.almoxAtual || m.salaOrigem || '') === nome);

    // Atualizar Abas de Categoria Dinâmicas no topo
    const filterContainer = document.getElementById('materiais-category-filters');
    const totalItensBadge = document.getElementById('sala-total-itens');
    const destaqueTitulo = document.getElementById('sala-categoria-destaque');

    if (totalItensBadge) {
        totalItensBadge.innerText = `${produtosSala.length} ${produtosSala.length === 1 ? 'item listado' : 'itens listados'}`;
    }
    if (destaqueTitulo) {
        destaqueTitulo.innerText = 'ITENS DO ALMOXARIFADO';
    }

    if (filterContainer) {
        const categoriasUnicas = Array.from(new Set(produtosSala.map(p => p.tipo || 'Insumo')));
        filterContainer.innerHTML = `
            <span style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-right:4px;">Filtrar Categoria:</span>
            <button type="button" class="cat-filter-btn active" onclick="filtrarMateriaisCategoria('todos', this)">Todos os Itens (${produtosSala.length})</button>
        `;
        categoriasUnicas.forEach(cat => {
            const count = produtosSala.filter(p => (p.tipo || 'Insumo') === cat).length;
            filterContainer.innerHTML += `
                <button type="button" class="cat-filter-btn" onclick="filtrarMateriaisCategoria('${cat}', this)">${cat} (${count})</button>
            `;
        });
    }

    produtosSala.forEach(m => {
        const isBorrowed = m.almoxOrigem && m.almoxAtual && (m.almoxOrigem !== m.almoxAtual);
        const cod = m.cod || m.codigo || '';
        const nomeMat = m.nome || '';
        const tipo = m.tipo || 'Insumo';
        const qtd = m.qtd !== undefined ? m.qtd : 0;
        const local = m.local || 'Prateleira A1';
        const preco = m.preco || 'R$ 0,00';
        const entrada = m.horarioEntrada || '16:22';
        const responsavel = m.responsavel || 'Giovani Azevedo';

        let imgSrc = m.imagem;
        if (!imgSrc) {
            const nLower = nomeMat.toLowerCase();
            if (nLower.includes('tecido') || cod === 'MAT-001') {
                imgSrc = 'tecido_algodao.jpg';
            } else if (nLower.includes('tesoura') || cod === 'MAT-002') {
                imgSrc = 'tesoura_alfaiate.jpg';
            } else {
                imgSrc = 'tecido_algodao.jpg';
            }
        }

        // Dica de sustentabilidade contextual
        let sustTip = "Utilize retalhos e sobras laboratoriais antes de abrir novos pacotes fechados.";
        const nLow = nomeMat.toLowerCase();
        if (cod === 'MAT-001' || nLow.includes('tecido') || nLow.includes('algodão')) {
            sustTip = "Não abra um rolo novo! Existem 4 retalhos de algodão na <strong>Bancada 02</strong>.";
        } else if (cod === 'MAT-002' || nLow.includes('tesoura')) {
            sustTip = "Mantenha a tesoura afiada e lubrificada. Afiação rápida disponível na bancada de manutenção.";
        } else if (nLow.includes('agulha') || nLow.includes('linha')) {
            sustTip = "Descarte agulhas rombudas no coletor de pérfuro-cortantes para segurança coletiva.";
        } else if (nLow.includes('fita') || nLow.includes('régua')) {
            sustTip = "Guarde no suporte adequado após a aula para evitar desgastes e perda de escala.";
        }

        grid.innerHTML += `
            <div class="material-hub-card" data-cod="${cod}" data-categoria="${tipo}">
                <!-- Imagem do Material com Badges e Botão da Câmera -->
                <div class="mat-card-image-wrap">
                    <img src="${imgSrc}" alt="${nomeMat}" class="mat-card-img" id="img-${cod}" onerror="this.src='tecido_algodao.jpg'">
                    ${isBorrowed ? `
                        <div class="mat-badge-borrowed">
                            <span class="material-icons-outlined" style="font-size:13px;">sync_alt</span> Emprestado
                        </div>
                    ` : ''}
                    <div class="mat-badge-type">${tipo}</div>
                    <button type="button" class="mat-camera-btn" onclick="triggerMaterialPhotoUpload('${cod}', event)" title="Alterar Foto">
                        <span class="material-icons-outlined" style="font-size:16px;">photo_camera</span>
                    </button>
                    <input type="file" id="file-${cod}" accept="image/*" style="display:none;" onchange="handleMaterialPhotoUploaded('${cod}', event)">
                </div>

                <!-- Corpo do Card -->
                <div class="mat-card-body">
                    <div class="mat-card-header-row">
                        <h4 class="mat-card-title">${nomeMat}</h4>
                        <span class="mat-card-sku">${cod}</span>
                    </div>

                    <!-- Caixa 2x2 com Dados do Almoxarifado -->
                    <div class="mat-card-grid-box">
                        <div class="mat-grid-item">
                            <span class="mat-grid-label">ALMOXARIFADO</span>
                            <span class="mat-grid-val">${m.almoxAtual || nome}</span>
                        </div>
                        <div class="mat-grid-item">
                            <span class="mat-grid-label">LOCALIZAÇÃO</span>
                            <span class="mat-grid-val">${local}</span>
                        </div>
                        <div class="mat-grid-item">
                            <span class="mat-grid-label">DISPONÍVEL EM ESTOQUE</span>
                            <span class="mat-grid-val highlight">${qtd} un.</span>
                        </div>
                        <div class="mat-grid-item">
                            <span class="mat-grid-label">PREÇO MÉDIO</span>
                            <span class="mat-grid-val">${preco}</span>
                        </div>
                    </div>

                    <!-- Linha de Metadados: Entrada & Responsável -->
                    <div class="mat-card-meta-row">
                        <span>Entrada: <strong>${entrada}</strong></span>
                        <span>Responsável: <strong>${responsavel}</strong></span>
                    </div>

                    <!-- Alerta de Origem (se emprestado de outro almoxarifado) -->
                    ${isBorrowed ? `
                        <div class="mat-card-origin-notice">
                            <span class="material-icons-outlined" style="font-size:16px;">info</span>
                            <span>Origem deste material: <strong>${m.almoxOrigem}</strong></span>
                        </div>
                    ` : ''}

                    <!-- Dica de Sustentabilidade -->
                    <div class="mat-card-sustainability">
                        <div class="sustainability-title">
                            <span class="material-icons-outlined" style="font-size:15px;">recycling</span> Dica de Sustentabilidade
                        </div>
                        <p class="sustainability-desc">${sustTip}</p>
                    </div>

                    <!-- Botões de Ação na Base -->
                    <div class="mat-card-actions">
                        <button type="button" class="mat-btn outline" onclick="openTransferirModal('${cod}')">Transferir</button>
                        <button type="button" class="mat-btn navy" onclick="solicitarReposicaoMaterial('${cod}', '${nomeMat.replace(/'/g, "\'")}')">Reposição</button>
                        <button type="button" class="mat-btn danger" onclick="excluirMaterial('${cod}')">
                            <span class="material-icons-outlined" style="font-size:15px;">delete</span> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    if(produtosSala.length === 0) {
        grid.innerHTML = `<div style="padding: 40px; color: var(--text-secondary); width: 100%; text-align: center; grid-column: 1 / -1; background:#ffffff; border-radius:12px; border:1px dashed var(--border-color);">Nenhum produto cadastrado ou transferido para este almoxarifado.</div>`;
    }

    nav('view-sala-detalhe', null);
}

window.filtrarMateriaisCategoria = function(categoria, btn) {
    window.categoriaFiltroAtual = categoria;
    
    // Atualizar botões
    const container = document.getElementById('materiais-category-filters');
    if (container) {
        container.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');

    const destaqueTitulo = document.getElementById('sala-categoria-destaque');
    if (destaqueTitulo) {
        destaqueTitulo.innerText = (categoria === 'todos') ? 'ITENS DO ALMOXARIFADO' : `ITENS: ${categoria.toUpperCase()}`;
    }

    const cards = document.querySelectorAll('#sala-materiais-grid .material-hub-card');
    let visiveis = 0;
    cards.forEach(card => {
        const cat = card.getAttribute('data-categoria');
        if (categoria === 'todos' || cat === categoria) {
            card.style.display = 'flex';
            visiveis++;
        } else {
            card.style.display = 'none';
        }
    });

    const totalBadge = document.getElementById('sala-total-itens');
    if (totalBadge) {
        totalBadge.innerText = `${visiveis} ${visiveis === 1 ? 'item listado' : 'itens listados'}`;
    }
};

window.triggerMaterialPhotoUpload = function(cod, event) {
    if (event) event.stopPropagation();
    const fileInput = document.getElementById('file-' + cod);
    if (fileInput) fileInput.click();
};

window.handleMaterialPhotoUploaded = function(cod, event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const mat = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
        if (mat) {
            mat.imagem = dataUrl;
            salvarMateriaisStorage();
            const img = document.getElementById('img-' + cod);
            if (img) img.src = dataUrl;
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('Foto Atualizada', `A imagem de "${mat.nome}" foi salva com sucesso!`, 'success');
            } else {
                alert(`Foto de "${mat.nome}" atualizada!`);
            }
        }
    };
    reader.readAsDataURL(file);
};

window.solicitarReposicaoMaterial = function(cod, nome) {
    if (typeof abrirFormularioBoletim === 'function') {
        abrirFormularioBoletim('reposicao', `Reposição de ${nome} (${cod})`);
    } else {
        openModal('novo-produto-modal');
    }
};

window.excluirMaterial = function(cod) {
    const mat = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    if (!mat) return;
    const nome = mat.nome || cod;
    
    if (confirm(`Deseja realmente excluir o material "${nome}" (${cod}) deste almoxarifado?`)) {
        window.mockMateriais = (window.mockMateriais || []).filter(m => (m.cod || m.codigo) !== cod);
        salvarMateriaisStorage();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Material Excluído', `O material "${nome}" foi removido do inventário.`, 'success');
        } else {
            alert(`Material "${nome}" removido com sucesso.`);
        }
        if (window.salaAbertaAtual) {
            abrirSala(window.salaAbertaAtual);
        }
    }
};

function renderCoordDashboard() {
    const tbody = document.getElementById('coord-boletins-tbody');
    if(tbody) {
        tbody.innerHTML = `
            <tr><td>BOL-101</td><td>Usuário PROF-123</td><td>Tesoura</td><td>10:00</td><td><span class="status atrasado">Atrasado</span></td></tr>
            <tr><td>BOL-102</td><td>Usuário PROF-456</td><td>Tecido Algodão</td><td>14:00</td><td><span class="status ok">Em Uso</span></td></tr>
        `;
    }
}

// Obter lista consolidada de aulas práticas agendadas
window.getAulasAgendadasList = function() {
    let agendadas = [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) {
            const parsed = JSON.parse(salvos);
            if (Array.isArray(parsed) && parsed.length > 0) agendadas = [...parsed];
        }
    } catch(e) {}

    // Completar com planos base padrão de alta fidelidade pedagógica se lista estiver vazia
    if (agendadas.length === 0) {
        agendadas = [
            {
                id: 'PLAN-201',
                plano: 'Impressão 3D e Corte a Laser de Acessórios',
                professor: 'Prof. Roberto Silva',
                professorId: 'PROF-101',
                sala: 'Laboratório Maker',
                turma: 'Vestuário e Estilismo - Manhã',
                horario: 'Hoje • 14:00 às 16:00 (2h)',
                inicio: '14:00',
                termino: '16:00',
                duracaoMs: 7200000,
                materiais: 'Filamento PLA 1.75mm, Óculos de Proteção UV, Paquímetro Digital'
            },
            {
                id: 'PLAN-202',
                plano: 'Modelagem Computacional & Encaixe Audaces CAD',
                professor: 'Carlos Alberto',
                professorId: 'PROF-103',
                sala: 'Oficina de Encaixe & Plotter CAD',
                turma: 'Modelagem e Costura Industrial - Tarde',
                horario: 'Amanhã • 13:30 às 17:30 (4h)',
                inicio: '13:30',
                termino: '17:30',
                duracaoMs: 14400000,
                materiais: 'Papel Kraft Plotter 120g, Fita Adesiva Crepe, Mesa Digitalizadora'
            },
            {
                id: 'PLAN-203',
                plano: 'Estamparia Têxtil Manual e Sublimação',
                professor: 'Profª. Clara Mendes',
                professorId: 'PROF-102',
                sala: 'Laboratório de Criação e Estamparia',
                turma: 'Tecelagem e Acabamentos - Noite',
                horario: 'Hoje • 19:00 às 22:00 (3h)',
                inicio: '19:00',
                termino: '22:00',
                duracaoMs: 10800000,
                materiais: 'Tintas Serigráficas Têxteis, Telas 77 Fios, Rodos de Poliuretano'
            },
            {
                id: 'PLAN-204',
                plano: 'Costura de Peças em Alfaiataria Fina',
                professor: 'Giovani Azevedo',
                professorId: 'PROF-999',
                sala: 'Sala 02 - Costura',
                turma: 'Modelagem e Costura Industrial - Tarde',
                horario: 'Quarta-feira • 08:00 às 12:00 (4h)',
                inicio: '08:00',
                termino: '12:00',
                duracaoMs: 14400000,
                materiais: 'Linhas de Pesponto 100% Poliéster, Entretelas Termocolantes, Tesouras Alfaiate'
            }
        ];
    }
    return agendadas;
};

window.filtrarAulasAgendadas = function(salaFiltro) {
    window.renderMonitoramento(salaFiltro);
};


function renderMonitoramento(salaFiltro = null) {
    const grid = document.getElementById('monitoramento-grid');
    const dash = document.getElementById('mon-dash');
    const coordTabs = document.getElementById('mon-coord-tabs-container');
    const agendadasContainer = document.getElementById('monitoramento-agendadas-list');
    if (!grid || !dash) return;

    // Se for Coordenação, habilita as abas divididas (Laboratórios vs Fluxo de Materiais)
    if (currentUser && currentUser.role === 'Coordenação') {
        if (coordTabs) coordTabs.style.display = 'block';
    } else {
        if (coordTabs) coordTabs.style.display = 'none';
    }
    
    grid.innerHTML = '';
    dash.innerHTML = '';

    // Laboratórios sincronizados estritamente com os Almoxarifados reais
    const labs = window.getLaboratoriosSincronizados ? window.getLaboratoriosSincronizados() : [
        { id: 'sala-01', nome: 'Sala 01 - Modelagem', tipo: 'Modelagem & Encaixe' },
        { id: 'sala-02', nome: 'Sala 02 - Costura', tipo: 'Costura Industrial' }
    ];

    // Atualiza o select de filtro dinamicamente
    const filtroSelect = document.getElementById('filtro-sala-agendadas');
    if (filtroSelect) {
        const valAtual = filtroSelect.value;
        filtroSelect.innerHTML = '<option value="todas">Todos os Laboratórios de Vestuário</option>';
        labs.forEach(l => {
            filtroSelect.innerHTML += `<option value="${l.nome}">${l.nome}</option>`;
        });
        if (valAtual) filtroSelect.value = valAtual;
    }

    const ocupadas = window.getSalasOcupadasInfo ? window.getSalasOcupadasInfo() : {};
    const todasAgendadas = window.getAulasAgendadasList ? window.getAulasAgendadasList() : [];

    let countOcupadas = 0;
    let countDisponiveis = 0;
    const now = Date.now();

    // 1. Renderizar os Cards Físicos dos Laboratórios (Apenas Ocupada vs Disponível)
    labs.forEach(lab => {
        const canonical = window.normalizarNomeSala ? window.normalizarNomeSala(lab.nome) : lab.nome;
        const ocup = ocupadas[canonical];

        if (ocup) {
            countOcupadas++;
            const statusColor = '#ef4444';
            const restanteMs = Math.max(0, (ocup.fimTimer || (now + 3600000)) - now);
            const horas = String(Math.floor(restanteMs / 3600000)).padStart(2, '0');
            const minutos = String(Math.floor((restanteMs % 3600000) / 60000)).padStart(2, '0');
            const segundos = String(Math.floor((restanteMs % 60000) / 1000)).padStart(2, '0');
            const timerStr = restanteMs > 0 ? `${horas}:${minutos}:${segundos}` : '00:00:00 (Concluído)';

            grid.innerHTML += `
                <div class="monitoramento-card" style="border-left-color: ${statusColor}; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.06); border-radius:14px; padding:22px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div class="mon-icon-box" style="background:#fef2f2; color:#ef4444;"><span class="material-icons-outlined">meeting_room</span></div>
                            <div>
                                <h3 style="font-size:17px; color:var(--text-primary); font-weight:800; margin:0;">${lab.nome}</h3>
                                <span style="font-size:12px; color:var(--text-secondary);">${lab.tipo || 'Laboratório Prático'}</span>
                            </div>
                        </div>
                        <span style="background:#fef2f2; color:#ef4444; border:1px solid #fecdd3; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                            <span style="width:7px; height:7px; border-radius:50%; background:#ef4444;"></span> OCUPADA
                        </span>
                    </div>

                    <div style="margin-top:16px; padding:12px; background:#f8fafc; border-radius:10px; border:1px solid #e2e8f0; font-size:13px; color:var(--text-primary); line-height:1.6;">
                        <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:#0b2341;">
                            <span class="material-icons-outlined" style="font-size:16px; color:#0284c7;">person</span> ${ocup.profNome}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
                            <span class="material-icons-outlined" style="font-size:16px; color:#b49454;">menu_book</span> ${ocup.aula}
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:3px; font-size:12px; color:var(--text-secondary);">
                            <span class="material-icons-outlined" style="font-size:15px;">groups</span> ${ocup.turma}
                        </div>
                    </div>

                    <div style="margin-top:14px; background:#0b2341; color:white; border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:12px; font-weight:600; display:flex; align-items:center; gap:5px; color:#38bdf8;">
                            <span class="material-icons-outlined" style="font-size:16px;">timer</span> Tempo Restante:
                        </div>
                        <div class="mon-room-timer" id="mon-timer-${lab.id}" data-end="${ocup.fimTimer}" data-total="${ocup.duracaoTotalMs}" style="font-family:monospace; font-size:15px; font-weight:800; color:#ffffff;">
                            ${timerStr}
                        </div>
                    </div>
                </div>
            `;
        } else {
            countDisponiveis++;
            const statusColor = '#10b981';
            grid.innerHTML += `
                <div class="monitoramento-card" style="border-left-color: ${statusColor}; background:#ffffff; box-shadow:0 4px 14px rgba(0,0,0,0.06); border-radius:14px; padding:22px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div class="mon-icon-box" style="background:#f0fdf4; color:#10b981;"><span class="material-icons-outlined">meeting_room</span></div>
                            <div>
                                <h3 style="font-size:17px; color:var(--text-primary); font-weight:800; margin:0;">${lab.nome}</h3>
                                <span style="font-size:12px; color:var(--text-secondary);">${lab.tipo || 'Laboratório Prático'}</span>
                            </div>
                        </div>
                        <span style="background:#f0fdf4; color:#10b981; border:1px solid #bbf7d0; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">
                            <span style="width:7px; height:7px; border-radius:50%; background:#10b981;"></span> DISPONÍVEL
                        </span>
                    </div>

                    <div style="margin-top:16px; padding:16px; background:#f0fdf4; border-radius:10px; border:1px dashed #bbf7d0; font-size:13px; color:#166534; line-height:1.5;">
                        <div style="display:flex; align-items:center; gap:6px; font-weight:700;">
                            <span class="material-icons-outlined" style="font-size:18px;">check_circle</span> Nenhuma aula prática no momento.
                        </div>
                        <p style="margin:4px 0 0 24px; font-size:12px; color:#15803d;">Laboratório desocupado, limpo e disponível para agendamento ou início de aula.</p>
                    </div>

                    <div style="margin-top:16px;">
                        <button type="button" class="primary-btn" onclick="openPlanoModal()" style="width:100%; justify-content:center; display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; background:#0b2341; padding:10px; border-radius:8px;">
                            <span class="material-icons-outlined" style="font-size:16px;">play_arrow</span> Iniciar Aula nesta Sala
                        </button>
                    </div>
                </div>
            `;
        }
    });

    // 2. Dashboards KPI Topo
    const totalAgendadasCount = todasAgendadas.length;
    dash.innerHTML = `
        <div class="mon-stat-card">
            <div class="mon-icon-box" style="background:#fee2e2; color:#ef4444;"><span class="material-icons-outlined">meeting_room</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">Laboratórios Ocupados</div>
                <div class="mon-stat-num" style="color:#ef4444;">${countOcupadas}</div>
            </div>
        </div>
        <div class="mon-stat-card">
            <div class="mon-icon-box" style="background:#dcfce7; color:#10b981;"><span class="material-icons-outlined">meeting_room</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">Laboratórios Disponíveis</div>
                <div class="mon-stat-num" style="color:#10b981;">${countDisponiveis}</div>
            </div>
        </div>
        <div class="mon-stat-card">
            <div class="mon-icon-box" style="background:#fef3c7; color:#d97706;"><span class="material-icons-outlined">calendar_today</span></div>
            <div>
                <div style="font-size:12px; color:var(--text-secondary); font-weight:700;">Aulas Agendadas</div>
                <div class="mon-stat-num" style="color:#d97706;">${totalAgendadasCount}</div>
            </div>
        </div>
    `;

    // 3. Renderizar Cronograma de Aulas Agendadas
    if (agendadasContainer) {
        agendadasContainer.innerHTML = '';
        const agendadasFiltradas = todasAgendadas.filter(a => {
            if (!salaFiltro || salaFiltro === 'todas') return true;
            return a.sala === salaFiltro;
        });

        if (agendadasFiltradas.length === 0) {
            agendadasContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:32px; color:var(--text-secondary); font-size:13.5px;">
                    <span class="material-icons-outlined" style="font-size:32px; opacity:0.5; display:block; margin-bottom:8px;">event_busy</span>
                    Nenhuma aula prática agendada para os critérios selecionados.
                </div>
            `;
        } else {
            agendadasFiltradas.forEach(a => {
                agendadasContainer.innerHTML += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:11.5px; font-weight:800; background:#e0f2fe; color:#0284c7; padding:3px 8px; border-radius:6px;">${a.sala}</span>
                            <span style="font-size:12px; font-weight:700; color:var(--text-secondary);">${a.data || 'Hoje'}</span>
                        </div>
                        <h4 style="margin:0 0 6px 0; font-size:15px; color:#0b2341;">${a.aula}</h4>
                        <div style="font-size:12.5px; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px;">
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#0284c7;">person</span> Prof. ${a.profNome}</div>
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#f59e0b;">schedule</span> ${a.horario}</div>
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:var(--primary-color);">groups</span> ${a.turma}</div>
                        </div>
                    </div>
                `;
            });
        }
    }
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
    if (!content) return;

    // Parse list of materials
    const matsList = (materiais || 'Nenhum material agendado')
        .split(/[,;\n]+/)
        .map(m => m.trim())
        .filter(Boolean);

    const matsHtml = matsList.map(item => `
        <div class="plano-mat-row">
            <div class="plano-mat-chip-name">
                <span class="material-icons-outlined" style="font-size:18px; color:#b49454;">inventory_2</span>
                <span>${item}</span>
            </div>
            <span style="font-size:11px; font-weight:700; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px;">Separado / Alocado</span>
        </div>
    `).join('');

    const autorEscaped = (autor || 'Docente').replace(/'/g, "\\'");

    content.innerHTML = `
        <!-- Cabeçalho do Plano com Cores SENAI -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:18px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                <h4 style="color:#0b2341; font-size:19px; font-weight:800; margin:0; line-height:1.2;">${tema}</h4>
                <span style="background:rgba(16, 185, 129, 0.12); color:#059669; border:1px solid rgba(16, 185, 129, 0.3); font-weight:700; font-size:11.5px; padding:3px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:5px;">
                    <span style="width:7px; height:7px; border-radius:50%; background:#10b981;"></span> Plano Aprovado
                </span>
            </div>
            <p style="margin:0; font-size:12.5px; color:#64748b;">Ficha pedagógica validada para execução no campus SENAI com alocação antecipada de almoxarifado.</p>
        </div>

        <!-- Grade de Metadados -->
        <div class="plano-detail-grid">
            <div class="plano-detail-item">
                <div class="plano-detail-item-icon"><span class="material-icons-outlined">person</span></div>
                <div>
                    <div class="plano-detail-item-label">Professor</div>
                    <div class="plano-detail-item-val">${autor || 'Docente Responsável'}</div>
                </div>
            </div>

            <div class="plano-detail-item">
                <div class="plano-detail-item-icon" style="background:#fef3c7; color:#b45309;"><span class="material-icons-outlined">groups</span></div>
                <div>
                    <div class="plano-detail-item-label">Turma Vinculada</div>
                    <div class="plano-detail-item-val">${turma && turma !== 'N/A' ? turma : 'Vestuário e Modelagem'}</div>
                </div>
            </div>

            <div class="plano-detail-item">
                <div class="plano-detail-item-icon" style="background:#e0f2fe; color:#0284c7;"><span class="material-icons-outlined">calendar_today</span></div>
                <div>
                    <div class="plano-detail-item-label">Data da Aula</div>
                    <div class="plano-detail-item-val">${dia && dia !== 'N/A' ? dia : new Date().toLocaleDateString('pt-BR')}</div>
                </div>
            </div>

            <div class="plano-detail-item">
                <div class="plano-detail-item-icon" style="background:#f3e8ff; color:#7e22ce;"><span class="material-icons-outlined">schedule</span></div>
                <div>
                    <div class="plano-detail-item-label">Horário</div>
                    <div class="plano-detail-item-val">${horario || '08:00 às 10:00'}</div>
                </div>
            </div>

            <div class="plano-detail-item">
                <div class="plano-detail-item-icon" style="background:#dcfce7; color:#15803d;"><span class="material-icons-outlined">meeting_room</span></div>
                <div>
                    <div class="plano-detail-item-label">Local / Laboratório</div>
                    <div class="plano-detail-item-val">${local && local !== 'N/A' ? local : 'Lab de Modelagem'}</div>
                </div>
            </div>

            <div class="plano-detail-item">
                <div class="plano-detail-item-icon" style="background:#ffedd5; color:#c2410c;"><span class="material-icons-outlined">timer</span></div>
                <div>
                    <div class="plano-detail-item-label">Tempo de Preparo</div>
                    <div class="plano-detail-item-val">${tempoPreparo || '15'} minutos</div>
                </div>
            </div>
        </div>

        <!-- Seção de Materiais Agendados -->
        <div class="plano-detail-box">
            <div class="plano-detail-box-header">
                <div class="plano-detail-box-title">
                    <span class="material-icons-outlined" style="color:#b49454;">inventory</span>
                    Materiais & Insumos Agendados
                </div>
                <div style="font-size:11.5px; font-weight:700; color:#0b2341; background:#f1f5f9; padding:3px 10px; border-radius:6px;">
                    Retirada: <strong>${salaRetirada || 'Sala 01 - Modelagem'}</strong>
                </div>
            </div>
            <div class="plano-mat-list">
                ${matsHtml}
            </div>
        </div>

        <!-- Rodapé de Ações do Modal -->
        <div class="plano-modal-footer">
            <button class="action-btn outline" onclick="closeModal('detalhe-plano-modal'); abrirChatInstitucional('${autorEscaped}')" style="display:inline-flex; align-items:center; gap:6px; font-weight:700; color:#0b2341; border-color:#cbd5e1; cursor:pointer;">
                <span class="material-icons-outlined" style="font-size:16px; color:#0284c7;">chat</span> Conversar no Chat
            </button>
            <button class="primary-btn" onclick="closeModal('detalhe-plano-modal')" style="background:#0b2341; color:#ffffff; font-weight:700; padding:10px 20px; cursor:pointer;">
                Concluir Visualização
            </button>
        </div>
    `;
    openModal('detalhe-plano-modal');
};

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

// ==========================================
// MÓDULO DE ACOMPANHAMENTO DE PROFESSORES EM TEMPO REAL & BLOQUEIO DE CONFLITO DE SALAS
// ==========================================
window.timerAcompanhamentoInterval = null;

// Catálogo Oficial dos 5 Laboratórios do SENAI
window.LABORATORIOS_SENAI = window.getLaboratoriosSincronizados ? window.getLaboratoriosSincronizados() : [
    { id: 'sala-01', nome: 'Sala 01 - Modelagem', tipo: 'Modelagem & Encaixe', capacidade: 30, icon: 'straighten' },
    { id: 'sala-02', nome: 'Sala 02 - Costura', tipo: 'Costura Industrial & Overlock', capacidade: 25, icon: 'precision_manufacturing' }
];

// Normalizador de nomes de sala para validação 100% precisa
window.normalizarNomeSala = function(sala) {
    if (!sala) return 'Sala 01 - Modelagem';
    const s = String(sala).toLowerCase();
    if (s.includes('modelagem') && (s.includes('01') || s.includes('1') || s.includes('lab'))) return 'Sala 01 - Modelagem';
    if (s.includes('costura') && (s.includes('02') || s.includes('2') || s.includes('lab'))) return 'Sala 02 - Costura';
    if (s.includes('maker') || s.includes('impressão') || s.includes('3d') || s.includes('laser')) return 'Laboratório Maker';
    if (s.includes('estamparia') || s.includes('criação') || s.includes('serigrafia')) return 'Laboratório de Criação e Estamparia';
    if (s.includes('cad') || s.includes('plotter') || s.includes('encaixe digital') || s.includes('audaces')) return 'Oficina de Encaixe & Plotter CAD';
    return sala;
};

window.getProfessoresStatusState = function() {
    let state = {};
    try {
        const saved = localStorage.getItem('senaivest_prof_live_status');
        if (saved) state = JSON.parse(saved);
    } catch(e) {}
    return state;
};

window.salvarProfessoresStatusState = function(state) {
    try {
        localStorage.setItem('senaivest_prof_live_status', JSON.stringify(state));
    } catch(e) {}
};

// Mapeia todas as salas atualmente ocupadas por professores em aula
window.getSalasOcupadasInfo = function() {
    const liveStatus = window.getProfessoresStatusState();
    const ocupadas = {};

    const localUsers = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const todosUsuarios = { ...DEFAULT_SYSTEM_USERS, ...localUsers };

    for (const [profId, st] of Object.entries(liveStatus)) {
        if (st && st.status === 'em_aula' && st.sala) {
            const canonical = window.normalizarNomeSala(st.sala);
            let profNome = 'Prof. ' + profId;
            if (profId === 'PROF-101') profNome = 'Prof. Roberto Silva';
            else if (profId === 'PROF-102') profNome = 'Profª. Clara Mendes';
            else if (todosUsuarios[profId] && todosUsuarios[profId].nome) profNome = todosUsuarios[profId].nome;
            else if (st.profNome) profNome = st.profNome;

            ocupadas[canonical] = {
                profId: profId,
                profNome: profNome,
                aula: st.aula || 'Aula Prática',
                turma: st.turma || 'Turma Regular',
                sala: canonical,
                materiais: st.materiais || 'Kit Padrão',
                fimTimer: st.fimTimer || (Date.now() + 3600000),
                duracaoTotalMs: st.duracaoTotalMs || 7200000
            };
        }
    }
    return ocupadas;
};

// Verifica se uma sala específica está ocupada
window.isSalaOcupada = function(sala, excludeProfId = null) {
    const canonical = window.normalizarNomeSala(sala);
    const ocupadas = window.getSalasOcupadasInfo();
    const info = ocupadas[canonical];
    if (info) {
        if (excludeProfId && String(info.profId).toLowerCase() === String(excludeProfId).toLowerCase()) {
            return { ocupada: false, info: null };
        }
        return { ocupada: true, info: info };
    }
    return { ocupada: false, info: null };
};

// ABERTURA DO MODAL DEDICADO DE INÍCIO DE AULA (SUBSTITUI PROMPT NATIVO DO NAVEGADOR)
window.abrirModalIniciarAulaProf = function(profId, profNome, preselected = {}) {
    const modal = document.getElementById('modal-iniciar-aula-prof');
    if (!modal) {
        alert('Modal de início de aula não encontrado no documento.');
        return;
    }

    // 1. Identificação do Docente
    document.getElementById('init-aula-prof-id').value = profId || '';
    const nomeEl = document.getElementById('init-aula-prof-nome');
    if (nomeEl) nomeEl.innerText = profNome || 'Docente SENAI';
    const emailEl = document.getElementById('init-aula-prof-email');
    if (emailEl) emailEl.innerText = `${(profNome || 'docente').toLowerCase().replace(/\s+/g, '.')}@senai.br`;
    const avatarEl = document.getElementById('init-aula-avatar');
    if (avatarEl) avatarEl.innerText = (profNome || 'P').charAt(0).toUpperCase();

    // 2. Carregar Planos Cadastrados
    let planos = Array.isArray(window.mockPlanos) ? [...window.mockPlanos] : [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) {
            const parsed = JSON.parse(salvos);
            if (Array.isArray(parsed) && parsed.length > 0) planos = parsed;
        }
    } catch(e) {}

    const planoSelect = document.getElementById('init-aula-plano-select');
    planoSelect.innerHTML = '<option value="custom">-- Selecionar Plano Cadastrado ou Digitar Tema --</option>';
    planos.forEach(p => {
        const pId = p.id || 'PLAN-000';
        const pTema = p.plano || p.tema || 'Aula Prática';
        const pDuracao = p.horario || `${p.inicio || '08:00'} às ${p.termino || '10:00'}`;
        const isSelected = (preselected.planoId === pId || preselected.tema === pTema) ? 'selected' : '';
        planoSelect.innerHTML += `
            <option value="${pId}" ${isSelected} data-tema="${pTema.replace(/"/g, '&quot;')}" data-sala="${p.sala || p.local || ''}" data-turma="${p.turma || ''}" data-materiais="${(p.materiais || '').replace(/"/g, '&quot;')}" data-inicio="${p.inicio || ''}" data-termino="${p.termino || ''}">
                [${pId}] ${pTema} (${pDuracao})
            </option>
        `;
    });

    // 3. Montar Seletor de Salas com Bloqueio de Conflito em Tempo Real
    const salaSelect = document.getElementById('init-aula-sala-select');
    salaSelect.innerHTML = '';
    const ocupadas = window.getSalasOcupadasInfo();

    let primeiraSalaLivre = null;
    let totalSalasLivres = 0;

    window.LABORATORIOS_SENAI.forEach(lab => {
        const canonical = window.normalizarNomeSala(lab.nome);
        const ocup = ocupadas[canonical];

        if (ocup && ocup.profId !== profId) {
            salaSelect.innerHTML += `
                <option value="${lab.nome}" disabled style="color:#ef4444; background:#fff1f2; font-weight:700;">
                    🚫 ${lab.nome} (Ocupada por ${ocup.profNome})
                </option>
            `;
        } else {
            totalSalasLivres++;
            if (!primeiraSalaLivre) primeiraSalaLivre = lab.nome;
            salaSelect.innerHTML += `
                <option value="${lab.nome}" style="color:#059669; font-weight:700;">
                    🟢 ${lab.nome} (Disponível)
                </option>
            `;
        }
    });

    // 4. Tratar Pré-seleção de Sala e Campos
    const preSala = preselected.sala ? window.normalizarNomeSala(preselected.sala) : null;
    if (preSala && !ocupadas[preSala]) {
        salaSelect.value = preSala;
    } else if (primeiraSalaLivre) {
        salaSelect.value = primeiraSalaLivre;
    }

    const temaInput = document.getElementById('init-aula-tema-input');
    temaInput.value = preselected.tema || 'Modelagem & Costura Industrial';

    const turmaSelect = document.getElementById('init-aula-turma-select');
    if (turmaSelect) turmaSelect.value = preselected.turma || 'Vestuário e Estilismo - Manhã';

    const duracaoSelect = document.getElementById('init-aula-duracao-select');
    if (duracaoSelect) {
        duracaoSelect.value = preselected.duracaoMs ? String(preselected.duracaoMs) : '7200000'; // 2h padrão
    }

    const matsInput = document.getElementById('init-aula-materiais-input');
    if (matsInput) matsInput.value = preselected.materiais || 'Kit Básico de Modelagem e Costura';

    // 5. Alerta Geral caso todas as salas estejam ocupadas
    const alertaGeral = document.getElementById('init-aula-alerta-geral');
    const btnSubmit = document.getElementById('btn-confirmar-iniciar-aula');

    if (totalSalasLivres === 0) {
        if (alertaGeral) {
            alertaGeral.style.display = 'flex';
            document.getElementById('init-aula-alerta-geral-msg').innerText = '⚠️ Todos os 5 laboratórios do campus estão ocupados no momento. Aguarde a finalização de uma aula para liberar espaço.';
        }
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        if (alertaGeral) alertaGeral.style.display = 'none';
        if (btnSubmit) btnSubmit.disabled = false;
    }

    // Feedback visual imediato da sala
    window.verificarConflitoSalaModal(salaSelect.value);

    // Abrir Modal
    openModal('modal-iniciar-aula-prof');
};

// Ao trocar o plano de aula no select do modal
window.aoMudarPlanoIniciarAula = function(planoId) {
    if (!planoId || planoId === 'custom') return;
    const planoSelect = document.getElementById('init-aula-plano-select');
    const opt = planoSelect.selectedOptions[0];
    if (!opt) return;

    const tema = opt.getAttribute('data-tema');
    const sala = opt.getAttribute('data-sala');
    const turma = opt.getAttribute('data-turma');
    const materiais = opt.getAttribute('data-materiais');
    const inicio = opt.getAttribute('data-inicio');
    const termino = opt.getAttribute('data-termino');

    if (tema) document.getElementById('init-aula-tema-input').value = tema;
    if (turma) {
        const turmaSel = document.getElementById('init-aula-turma-select');
        for (let i = 0; i < turmaSel.options.length; i++) {
            if (turmaSel.options[i].value.toLowerCase().includes(turma.toLowerCase()) || turma.toLowerCase().includes(turmaSel.options[i].value.toLowerCase())) {
                turmaSel.selectedIndex = i;
                break;
            }
        }
    }
    if (materiais) document.getElementById('init-aula-materiais-input').value = materiais;

    // Calcular duração real baseada no horário do plano (ex: 08:00 às 10:00 -> 2h, 08:00 às 12:00 -> 4h)
    if (inicio && termino) {
        const [hI, mI] = inicio.split(':').map(Number);
        const [hT, mT] = termino.split(':').map(Number);
        let diffHoras = (hT + (mI ? mI/60 : 0)) - (hI + (mT ? mT/60 : 0));
        if (diffHoras > 0) {
            const duracaoMsCalculada = Math.round(diffHoras * 3600 * 1000);
            const durSelect = document.getElementById('init-aula-duracao-select');
            let matched = false;
            for (let i = 0; i < durSelect.options.length; i++) {
                if (parseInt(durSelect.options[i].value, 10) === duracaoMsCalculada) {
                    durSelect.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const novaOpt = document.createElement('option');
                novaOpt.value = duracaoMsCalculada;
                novaOpt.text = `${diffHoras} Horas (${diffHoras * 60} minutos) [Do Plano]`;
                durSelect.add(novaOpt);
                durSelect.value = duracaoMsCalculada;
            }
        }
    }

    // Tentar selecionar a sala sugerida se ela estiver livre
    if (sala) {
        const canonical = window.normalizarNomeSala(sala);
        const profId = document.getElementById('init-aula-prof-id').value;
        const check = window.isSalaOcupada(canonical, profId);
        const salaSelect = document.getElementById('init-aula-sala-select');
        if (!check.ocupada) {
            salaSelect.value = canonical;
        }
    }

    window.verificarConflitoSalaModal(document.getElementById('init-aula-sala-select').value);
};

// Validação visual e ativa de conflito na sala escolhida
window.verificarConflitoSalaModal = function(salaNome) {
    const profId = document.getElementById('init-aula-prof-id').value;
    const feedback = document.getElementById('init-aula-sala-status-feedback');
    const btnSubmit = document.getElementById('btn-confirmar-iniciar-aula');
    if (!feedback || !salaNome) return;

    const check = window.isSalaOcupada(salaNome, profId);
    if (check.ocupada) {
        feedback.innerHTML = `
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:10px 12px; color:#be123c; font-weight:600; display:flex; align-items:center; gap:8px;">
                <span class="material-icons-outlined" style="font-size:18px;">highlight_off</span>
                <span><strong>CONFLITO DETECTADO:</strong> Laboratório ocupado por <strong>${check.info.profNome}</strong> (${check.info.aula}). Escolha outra sala livre.</span>
            </div>
        `;
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        feedback.innerHTML = `
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:8px 12px; color:#065f46; font-weight:600; display:flex; align-items:center; gap:8px;">
                <span class="material-icons-outlined" style="font-size:18px; color:#10b981;">check_circle</span>
                <span><strong>Sala Livre:</strong> Laboratório liberado, sem conflitos e pronto para início imediato.</span>
            </div>
        `;
        if (btnSubmit) btnSubmit.disabled = false;
    }
};

// Confirmação final da abertura da aula prática
window.confirmarIniciarAulaProfModal = function() {
    const profId = document.getElementById('init-aula-prof-id').value;
    const profNome = (document.getElementById('init-aula-prof-nome').innerText || 'Docente SENAI').trim();
    const tema = (document.getElementById('init-aula-tema-input').value || '').trim();
    const sala = document.getElementById('init-aula-sala-select').value;
    const turma = document.getElementById('init-aula-turma-select').value;
    const duracaoMs = parseInt(document.getElementById('init-aula-duracao-select').value, 10) || 7200000;
    const materiais = document.getElementById('init-aula-materiais-input').value || 'Kit de Laboratório SENAI';

    if (!tema) {
        alert('Por favor, digite o tema da aula prática.');
        document.getElementById('init-aula-tema-input').focus();
        return;
    }

    // BLOQUEIO RIGOROSO DE CONFLITO DE SALA
    const conflito = window.isSalaOcupada(sala, profId);
    if (conflito.ocupada) {
        alert(`❌ BLOQUEIO ANTI-CONFLITO:\nA sala "${sala}" já está em uso por ${conflito.info.profNome} na aula "${conflito.info.aula}"!\n\nDois professores não podem ministrar atividades na mesma sala ao mesmo tempo.\nPor favor, escolha outro laboratório disponível.`);
        return;
    }

    const liveStatus = window.getProfessoresStatusState();
    const now = Date.now();

    liveStatus[profId] = {
        status: 'em_aula',
        aula: tema,
        turma: turma,
        sala: sala,
        materiais: materiais,
        fimTimer: now + duracaoMs,
        duracaoTotalMs: duracaoMs,
        horaInicioStr: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    window.salvarProfessoresStatusState(liveStatus);

    closeModal('modal-iniciar-aula-prof');

    // Sincronizar todas as telas em tempo real
    window.renderAcompanhamentoProfessores();
    if (typeof window.renderMonitoramento === 'function') window.renderMonitoramento();
    if (typeof window.renderAlertasAutomaticosEstoque === 'function') window.renderAlertasAutomaticosEstoque();

    const horasFormat = Math.round(duracaoMs / 3600000);
    if (typeof mostrarToast === 'function') {
        mostrarToast('Aula Prática Iniciada!', `${profNome} está em aula na ${sala} com cronômetro de ${horasFormat}h ativo. Sala bloqueada com sucesso!`, 'success');
    } else {
        alert(`Aula prática iniciada com sucesso para ${profNome} na ${sala}!`);
    }
};

// Ponto de entrada chamado pelos botões "Iniciar Aula" (abre o modal em vez de prompt)
window.iniciarAulaProf = function(profId, profNome) {
    window.abrirModalIniciarAulaProf(profId, profNome);
};

window.renderAcompanhamentoProfessores = function() {
    const emAulaGrid = document.getElementById('professores-em-aula-grid');
    const foraAulaGrid = document.getElementById('professores-fora-aula-grid');
    const countEmAulaEl = document.getElementById('acomp-count-em-aula');
    const countForaAulaEl = document.getElementById('acomp-count-fora-aula');

    if (!emAulaGrid || !foraAulaGrid) return;

    emAulaGrid.innerHTML = '';
    foraAulaGrid.innerHTML = '';

    // 1. Coletar todos os usuários com papel Professor (incluindo padrões e cadastrados)
    const localUsers = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const todosUsuarios = { ...DEFAULT_SYSTEM_USERS, ...localUsers };

    const professoresMap = new Map();
    // Docentes base
    professoresMap.set('PROF-101', {
        id: 'PROF-101',
        nome: 'Prof. Roberto Silva',
        email: 'roberto.silva@senai.br',
        role: 'Professor'
    });
    professoresMap.set('PROF-102', {
        id: 'PROF-102',
        nome: 'Profª. Clara Mendes',
        email: 'clara.mendes@senai.br',
        role: 'Professor'
    });

    for (const [id, u] of Object.entries(todosUsuarios)) {
        const role = (u.role || '').toLowerCase();
        if (role === 'professor') {
            professoresMap.set(id, {
                id: id,
                nome: u.nome || ('Prof. ' + id),
                email: u.email || '',
                role: 'Professor'
            });
        }
    }

    const liveStatus = window.getProfessoresStatusState();
    const now = Date.now();

    // Configuração inicial padrão de demonstração garantindo salas separadas sem conflito
    if (!liveStatus['PROF-101']) {
        liveStatus['PROF-101'] = {
            status: 'em_aula',
            aula: 'Modelagem Avançada & Encaixe Digital',
            turma: 'Vestuário - Manhã',
            sala: 'Sala 01 - Modelagem',
            materiais: 'MAT-001 (Tecido Algodão), Tesoura Alfaiate',
            fimTimer: now + (1 * 3600 + 32 * 60) * 1000,
            duracaoTotalMs: 4 * 3600 * 1000
        };
    }
    if (!liveStatus['PROF-102']) {
        liveStatus['PROF-102'] = {
            status: 'em_aula',
            aula: 'Costura Industrial & Ponto Overlock',
            turma: 'Costura - Manhã',
            sala: 'Sala 02 - Costura',
            materiais: 'MAT-003 (Agulha Industrial), MAT-004 (Fio Overlock)',
            fimTimer: now + (1 * 3600 + 7 * 60) * 1000,
            duracaoTotalMs: 3 * 3600 * 1000
        };
    }

    let countEmAula = 0;
    let countForaAula = 0;

    professoresMap.forEach((prof, profId) => {
        const st = liveStatus[profId] || { status: 'fora_aula' };
        const initial = (prof.nome || 'P').charAt(0).toUpperCase();

        if (st.status === 'em_aula') {
            countEmAula++;
            const fimTimer = st.fimTimer || (now + 3600000);
            const totalDuracao = st.duracaoTotalMs || 7200000;
            const restanteMs = Math.max(0, fimTimer - now);
            const decorridoPct = Math.min(100, Math.max(5, Math.round(((totalDuracao - restanteMs) / totalDuracao) * 100)));

            const horas = String(Math.floor(restanteMs / 3600000)).padStart(2, '0');
            const minutos = String(Math.floor((restanteMs % 3600000) / 60000)).padStart(2, '0');
            const segundos = String(Math.floor((restanteMs % 60000) / 1000)).padStart(2, '0');
            const timerStr = restanteMs > 0 ? `${horas}:${minutos}:${segundos}` : '00:00:00 (Concluído)';

            emAulaGrid.innerHTML += `
                <div class="prof-monitor-card em-aula">
                    <div class="prof-monitor-header">
                        <div class="prof-monitor-user">
                            <div class="prof-monitor-avatar active-class">${initial}</div>
                            <div>
                                <div class="prof-monitor-name">${prof.nome}</div>
                                <div class="prof-monitor-subject">${st.aula || 'Aula Prática em Andamento'}</div>
                            </div>
                        </div>
                        <span class="prof-live-badge"><span class="pulse-live-dot"></span> EM AULA</span>
                    </div>

                    <div class="prof-meta-chips">
                        <span class="prof-chip"><span class="material-icons-outlined" style="font-size:15px; color:#0b2341;">meeting_room</span> <strong>${st.sala || 'Sala Prática'}</strong></span>
                        <span class="prof-chip"><span class="material-icons-outlined" style="font-size:15px; color:#b49454;">groups</span> ${st.turma || 'Turma Ativa'}</span>
                        <span class="prof-chip"><span class="material-icons-outlined" style="font-size:15px; color:#0284c7;">inventory_2</span> ${st.materiais || 'Materiais em Uso'}</span>
                    </div>

                    <div>
                        <div class="prof-timer-box">
                            <div class="prof-timer-label">
                                <span class="material-icons-outlined" style="font-size:17px; color:#38bdf8;">timer</span>
                                <span>Tempo Restante:</span>
                            </div>
                            <div class="prof-timer-digits" id="timer-prof-${prof.id}" data-end="${fimTimer}" data-total="${totalDuracao}">${timerStr}</div>
                        </div>
                        <div class="prof-timer-progress">
                            <div class="prof-timer-bar" id="bar-prof-${prof.id}" style="width:${decorridoPct}%;"></div>
                        </div>
                    </div>

                    <div class="prof-monitor-actions">
                        <button class="action-btn outline" onclick="abrirOcorrenciaCoordenacao('${prof.nome.replace(/'/g, "\'")}')" style="flex:1; justify-content:center; display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#0b2341; border-color:#cbd5e1; cursor:pointer;">
                            <span class="material-icons-outlined" style="font-size:15px; color:#0284c7;">send</span> Mensagem Coordenação
                        </button>
                        <button class="action-btn outline" onclick="visualizarPlano('${(st.aula || 'Aula Prática').replace(/'/g, "\'")}', '${prof.nome.replace(/'/g, "\'")}', 'Em Andamento', 'Hoje', '${(st.sala || 'Laboratório').replace(/'/g, "\'")}', '${(st.materiais || 'Insumos').replace(/'/g, "\'")}', '${(st.sala || 'Sala 01').replace(/'/g, "\'")}', '15', '${(st.turma || 'Geral').replace(/'/g, "\'")}')" style="flex:1; justify-content:center; display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; cursor:pointer;">
                            <span class="material-icons-outlined" style="font-size:15px;">visibility</span> Ver Ficha
                        </button>
                    </div>
                </div>
            `;
        } else {
            countForaAula++;
            const localCampus = st.local || 'Sala dos Professores / Coordenação';
            const proxAula = st.proximaAula || '13:30 • Corte & Enfesto';

            foraAulaGrid.innerHTML += `
                <div class="prof-monitor-card fora-aula">
                    <div class="prof-monitor-header">
                        <div class="prof-monitor-user">
                            <div class="prof-monitor-avatar idle">${initial}</div>
                            <div>
                                <div class="prof-monitor-name">${prof.nome}</div>
                                <div class="prof-monitor-subject">Docente de Moda e Vestuário</div>
                            </div>
                        </div>
                        <span class="prof-idle-badge"><span style="width:7px; height:7px; border-radius:50%; background:#10b981;"></span> Disponível</span>
                    </div>

                    <div style="font-size:12.5px; color:#475569; display:flex; flex-direction:column; gap:4px;">
                        <div><span class="material-icons-outlined" style="font-size:15px; vertical-align:middle; color:#64748b;">place</span> Local: <strong>${localCampus}</strong></div>
                        <div><span class="material-icons-outlined" style="font-size:15px; vertical-align:middle; color:#b49454;">schedule</span> Próxima aula: <strong>${proxAula}</strong></div>
                    </div>

                    <div class="prof-monitor-actions">
                        <button class="action-btn outline" onclick="abrirOcorrenciaCoordenacao('${prof.nome.replace(/'/g, "\'")}')" style="flex:1; justify-content:center; display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:#0b2341; border-color:#cbd5e1; cursor:pointer;">
                            <span class="material-icons-outlined" style="font-size:15px; color:#0284c7;">send</span> Mensagem Coordenação
                        </button>
                        <span style="font-size:12px; font-weight:700; color:#059669; background:#dcfce7; padding:6px 14px; border-radius:8px; display:inline-flex; align-items:center; gap:5px;">
                            <span class="material-icons-outlined" style="font-size:16px;">schedule</span> Ativação Automática
                        </span>
                    </div>
                </div>
            `;
        }
    });

    if (countEmAulaEl) countEmAulaEl.innerText = countEmAula;
    if (countForaAulaEl) countForaAulaEl.innerText = countForaAula;

    if (countEmAula === 0) {
        emAulaGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:24px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b;">
                <span class="material-icons-outlined" style="font-size:32px; opacity:0.6; display:block; margin-bottom:6px;">info</span>
                Nenhum professor ministrando aula prática no momento.<br>As aulas práticas iniciam e concluem automaticamente pelo cronograma agendado.
            </div>
        `;
    }

    if (countForaAula === 0) {
        foraAulaGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:20px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b;">
                Todos os docentes cadastrados estão em aula no momento.
            </div>
        `;
    }

    // Salvar estado atualizado
    window.salvarProfessoresStatusState(liveStatus);

    // Iniciar ou manter cronômetro ativo
    iniciarTickCronometroProfessores();
};

window.iniciarTickCronometroProfessores = function() {
    if (window.timerAcompanhamentoInterval) {
        clearInterval(window.timerAcompanhamentoInterval);
    }

    window.timerAcompanhamentoInterval = setInterval(() => {
        const timers = document.querySelectorAll('.prof-timer-digits[data-end], .mon-room-timer[data-end]');
        if (timers.length === 0) return;

        const now = Date.now();
        timers.forEach(t => {
            const fimTimer = parseInt(t.getAttribute('data-end'), 10);
            const totalDuracao = parseInt(t.getAttribute('data-total'), 10) || 7200000;
            const restanteMs = fimTimer - now;

            if (restanteMs <= 0) {
                t.innerText = '00:00:00 (Concluído)';
                t.style.color = '#f59e0b';
                const profId = t.id.replace('timer-prof-', '').replace('mon-timer-', '');
                const bar = document.getElementById('bar-prof-' + profId);
                if (bar) bar.style.width = '100%';
            } else {
                const horas = String(Math.floor(restanteMs / 3600000)).padStart(2, '0');
                const minutos = String(Math.floor((restanteMs % 3600000) / 60000)).padStart(2, '0');
                const segundos = String(Math.floor((restanteMs % 60000) / 1000)).padStart(2, '0');
                t.innerText = `${horas}:${minutos}:${segundos}`;

                const decorridoPct = Math.min(100, Math.max(5, Math.round(((totalDuracao - restanteMs) / totalDuracao) * 100)));
                const profId = t.id.replace('timer-prof-', '').replace('mon-timer-', '');
                const bar = document.getElementById('bar-prof-' + profId);
                if (bar) bar.style.width = `${decorridoPct}%`;
            }
        });
    }, 1000);
};

window.finalizarAulaProf = function(profId, profNome) {
    if (!confirm(`Deseja finalizar a aula prática de ${profNome}?\nA sala será imediatamente liberada no monitoramento e disponibilizada para outros docentes.`)) return;

    const liveStatus = window.getProfessoresStatusState();
    const salaLiberada = liveStatus[profId] ? liveStatus[profId].sala : 'Laboratório';

    liveStatus[profId] = {
        status: 'fora_aula',
        local: 'Sala dos Professores / Bloco Pedagógico',
        proximaAula: 'Aguardando próximo agendamento'
    };

    window.salvarProfessoresStatusState(liveStatus);
    window.renderAcompanhamentoProfessores();
    if (typeof window.renderMonitoramento === 'function') window.renderMonitoramento();
    if (typeof window.renderAlertasAutomaticosEstoque === 'function') window.renderAlertasAutomaticosEstoque();

    if (typeof mostrarToast === 'function') {
        mostrarToast('Aula Prática Finalizada!', `${salaLiberada} foi liberada com sucesso e ${profNome} está disponível no campus.`, 'info');
    } else {
        alert(`Aula finalizada! ${salaLiberada} liberada.`);
    }
};

window.renderProfessoresGrid = function() {
    window.renderAcompanhamentoProfessores();
};

window.toggleAcompanhamentoView = function(view) {
    if (view === 'turmas') {
        document.getElementById('acompanhamento-turmas-view').style.display = 'block';
        document.getElementById('acompanhamento-professores-view').style.display = 'none';
    } else {
        document.getElementById('acompanhamento-turmas-view').style.display = 'none';
        document.getElementById('acompanhamento-professores-view').style.display = 'block';
        window.renderAcompanhamentoProfessores();
    }
};

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
    window.selectedMateriaisPlano = {};
    const searchInp = document.getElementById('p-mat-search');
    if (searchInp) searchInp.value = '';
    const filterTipo = document.getElementById('p-mat-filtro-tipo');
    if (filterTipo) filterTipo.value = 'todos';
    const pLocal = document.getElementById('p-local');
    if(pLocal) {
        pLocal.innerHTML = '<option value="">Selecione a sala...</option>';
        mockSalas.forEach(s => {
            pLocal.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    }
    const pDia = document.getElementById('p-dia');
    if(pDia) {
        pDia.value = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : new Date().toISOString().split('T')[0];
    }
    if (typeof window.populatePlanosMateriaisSelect === 'function') {
        window.populatePlanosMateriaisSelect(null);
    }
    openModal('plano-modal');
};

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
    if (typeof window.renderAcompanhamentoProfessores === 'function') {
        window.renderAcompanhamentoProfessores();
    }
}





// --- DIÁRIO DE CLASSE & CONTROLE DE PRESENÇA ---
window.mockAlunosDiario = [
    { id: 'ALU-001', nome: 'João Silva', turma: 'Vestuário e Estilismo - Manhã', presente: true },
    { id: 'ALU-002', nome: 'Maria Souza', turma: 'Modelagem e Costura Industrial - Tarde', presente: false },
    { id: 'ALU-003', nome: 'Carlos Pereira', turma: 'Vestuário e Estilismo - Manhã', presente: false },
    { id: 'ALU-004', nome: 'Ana Beatriz', turma: 'Vestuário e Estilismo - Manhã', presente: true },
    { id: 'ALU-005', nome: 'Lucas Mendes', turma: 'Vestuário e Estilismo - Manhã', presente: true },
    { id: 'ALU-006', nome: 'Beatriz Lima', turma: 'Modelagem e Costura Industrial - Tarde', presente: true },
    { id: 'ALU-007', nome: 'Gabriel Santos', turma: 'Modelagem e Costura Industrial - Tarde', presente: false },
    { id: 'ALU-008', nome: 'Juliana Costa', turma: 'Tecelagem e Acabamentos - Noite', presente: true },
    { id: 'ALU-009', nome: 'Rafael Oliveira', turma: 'Tecelagem e Acabamentos - Noite', presente: false },
    { id: 'ALU-010', nome: 'Camila Fernandes', turma: 'Tecelagem e Acabamentos - Noite', presente: true }
];

// Sincroniza planos armazenados no sub-banco redundante (garante que planos apareçam mesmo sem planilha)
window.sincronizarPlanosComSubBanco = function() {
    let subBanco = [];
    try {
        const sbSalvo = localStorage.getItem('senaivest_planos_sub_banco');
        if (sbSalvo) subBanco = JSON.parse(sbSalvo);
    } catch(e) {}

    let planosAula = [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) planosAula = JSON.parse(salvos);
    } catch(e) {}

    let alterado = false;
    subBanco.forEach(item => {
        if (item && item.documento) {
            const doc = item.documento;
            const pId = doc.codigoPlano || item.id;
            const jaExiste = planosAula.some(p => p.id === pId);
            if (!jaExiste) {
                planosAula.unshift({
                    id: pId,
                    plano: doc.titulo,
                    tema: doc.titulo,
                    horario: doc.agendamento ? doc.agendamento.horarioCompleto : '',
                    inicio: doc.agendamento ? doc.agendamento.horaInicio : '',
                    termino: doc.agendamento ? doc.agendamento.horaTermino : '',
                    dia: doc.agendamento ? doc.agendamento.data : '',
                    sala: doc.localizacao ? doc.localizacao.salaLaboratorio : '',
                    local: doc.localizacao ? doc.localizacao.salaLaboratorio : '',
                    materiais: doc.materiaisRequisitados || '',
                    professor: doc.professor ? doc.professor.nome : '',
                    professorId: doc.professor ? doc.professor.id : '',
                    turma: doc.turmaVinculada || 'Vestuário e Estilismo - Manhã',
                    liberado: true,
                    status: doc.statusExecucao || 'Agendado'
                });
                alterado = true;
            }
        }
    });

    if (alterado) {
        localStorage.setItem('senaivest_planos_aula', JSON.stringify(planosAula));
        if (window.mockPlanos) {
            planosAula.forEach(p => {
                if (!window.mockPlanos.some(mp => mp.id === p.id)) {
                    window.mockPlanos.unshift(p);
                }
            });
        }
    }
};

window.populateDiarioPlanos = function() {
    const select = document.getElementById('diario-plano-select');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione o Plano de Aula...</option>';

    // Executa sincronização com o sub-banco Google Drive redundante
    if (typeof window.sincronizarPlanosComSubBanco === 'function') {
        window.sincronizarPlanosComSubBanco();
    }
    
    // Obter planos de todas as fontes disponíveis
    let todosPlanos = [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) todosPlanos = JSON.parse(salvos);
    } catch(err) {}

    if (Array.isArray(window.mockPlanos)) {
        window.mockPlanos.forEach(mp => {
            if (!todosPlanos.some(p => p.id === mp.id || (p.tema && p.tema === mp.plano))) {
                todosPlanos.push(mp);
            }
        });
    }

    if (todosPlanos.length === 0) {
        todosPlanos = [
            { id: 'PLAN-101', plano: 'Modelagem e Graduação Industrial', tema: 'Modelagem e Graduação Industrial', professor: 'Giovani Azevedo', horario: '08:00 - 12:00', turma: 'Vestuário e Estilismo - Manhã', sala: 'Sala 01 - Modelagem' },
            { id: 'PLAN-102', plano: 'Costura e Acabamentos em Reta Industrial', tema: 'Costura e Acabamentos em Reta Industrial', professor: 'Giovani Azevedo', horario: '13:30 - 17:30', turma: 'Modelagem e Costura Industrial - Tarde', sala: 'Sala 02 - Costura' },
            { id: 'PLAN-103', plano: 'Tecelagem e Estrutura Têxtil', tema: 'Tecelagem e Estrutura Têxtil', professor: 'Giovani Azevedo', horario: '18:30 - 22:30', turma: 'Tecelagem e Acabamentos - Noite', sala: 'Sala 01 - Modelagem' }
        ];
    }

    const userNome = (currentUser && currentUser.nome) ? currentUser.nome.toLowerCase() : '';
    const userId = (currentUser && currentUser.id) ? String(currentUser.id).toLowerCase() : '';
    const isMaster = currentUser && (currentUser.role === 'admin' || currentUser.cargo === 'administrador' || currentUser.tipo === 'coordenador' || currentUser.isCoordenador);

    let professorPlanos = todosPlanos.filter(p => {
        if (isMaster) return true;
        if (!userNome && !userId) return true;
        const pProf = (p.professor || p.professorNome || '').toLowerCase();
        const pId = String(p.professorId || '').toLowerCase();
        if (!pProf && !pId) return true;
        return (userNome && (pProf.includes(userNome) || userNome.includes(pProf))) ||
               (userId && (pId === userId || pProf === userId));
    });

    // Se o filtro for muito restrito e não encontrar nenhum, exibe todos os planos cadastrados para não travar o professor
    if (professorPlanos.length === 0) {
        professorPlanos = todosPlanos;
    }
    
    professorPlanos.forEach(p => {
        const idVal = p.id || p.plano || p.tema;
        const titulo = p.plano || p.tema || 'Plano de Aula Regular';
        const hora = p.horario || (p.inicio ? `${p.inicio} às ${p.termino}` : 'Horário Regular');
        select.innerHTML += `<option value="${idVal}">${p.id ? p.id + ' - ' : ''}${titulo} (${hora})</option>`;
    });
};


window.selecionarPlanoDiario = function(planoId) {
    const histContainer = document.getElementById('diario-historico-container');
    const alunosContainer = document.getElementById('diario-alunos-container');

    if (!planoId) {
        if (histContainer) histContainer.style.display = 'block';
        if (alunosContainer) alunosContainer.style.display = 'none';
        window.renderDiarioHistoricoAulas();
        return;
    }

    if (histContainer) histContainer.style.display = 'none';
    if (alunosContainer) alunosContainer.style.display = 'block';

    // Busca o plano selecionado para vincular turma automaticamente
    let todosPlanos = [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) todosPlanos = JSON.parse(salvos);
    } catch(err) {}
    if (Array.isArray(window.mockPlanos)) {
        todosPlanos = [...todosPlanos, ...window.mockPlanos];
    }

    const plano = todosPlanos.find(p => p.id === planoId || p.plano === planoId || p.tema === planoId);
    if (plano && plano.turma) {
        const turmaSelect = document.getElementById('diario-turma-select');
        if (turmaSelect) {
            for (let i = 0; i < turmaSelect.options.length; i++) {
                const optVal = turmaSelect.options[i].value.toLowerCase();
                const pTurma = plano.turma.toLowerCase();
                if (optVal.includes(pTurma) || pTurma.includes(optVal) ||
                   (pTurma.includes('manhã') && optVal.includes('manhã')) ||
                   (pTurma.includes('tarde') && optVal.includes('tarde')) ||
                   (pTurma.includes('noite') && optVal.includes('noite'))) {
                    turmaSelect.selectedIndex = i;
                    break;
                }
            }
        }
    }

    window.renderDiarioAlunos();
    window.renderDiarioBancadasAlocacao();
};


window.renderDiarioAlunos = function() {
    const planoSelect = document.getElementById('diario-plano-select');
    const planoName = planoSelect ? planoSelect.value : '';
    const container = document.getElementById('diario-alunos-container');
    const grid = document.getElementById('diario-alunos-grid');
    const totalSpan = document.getElementById('diario-total-alunos');
    const turmaSelect = document.getElementById('diario-turma-select');
    const turmaEscolhida = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo - Manhã';
    
    if (!planoName) {
        if (container) container.style.display = 'none';
        return;
    }
    
    if (container) container.style.display = 'block';
    if (!grid) return;
    grid.innerHTML = '';
    
    const alunosTurma = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tT = turmaEscolhida.toLowerCase();
        return aT.includes(tT) || tT.includes(aT) || 
               (tT.includes('manhã') && aT.includes('manhã')) ||
               (tT.includes('tarde') && aT.includes('tarde')) ||
               (tT.includes('noite') && aT.includes('noite'));
    });
    
    if (totalSpan) totalSpan.innerText = alunosTurma.length;
    
    if(alunosTurma.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); padding: 16px; text-align:center;">Nenhum aluno credenciado encontrado para esta turma.</p>';
        return;
    }
    
    alunosTurma.forEach(aluno => {
        const isChecked = aluno.presente ? 'checked' : '';
        grid.innerHTML += `
            <div class="aluno-card" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:10px; padding:12px 16px; margin-bottom:8px; box-shadow:var(--shadow-sm);">
                <div class="aluno-info">
                    <h4 style="margin:0 0 4px 0; font-size:14px; font-weight:700;">${aluno.nome}</h4>
                    <p style="margin:0; font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                        <span class="material-icons-outlined" style="font-size:14px; color:var(--primary-color);">badge</span> Matrícula: <strong>${aluno.id}</strong> &bull; ${aluno.turma}
                    </p>
                </div>
                <div class="checkin-toggle" style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:12px; font-weight:700; color:${aluno.presente ? '#10b981' : 'var(--text-secondary)'};">
                        ${aluno.presente ? 'Presente' : 'Ausente'}
                    </span>
                    <label class="switch">
                        <input type="checkbox" onchange="togglePresenca('${aluno.id}', this.checked)" ${isChecked}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    });
};

window.marcarTodosDiario = function(presente) {
    const turmaSelect = document.getElementById('diario-turma-select');
    const turmaEscolhida = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo - Manhã';
    
    (window.mockAlunosDiario || []).forEach(aluno => {
        const aT = (aluno.turma || '').toLowerCase();
        const tT = turmaEscolhida.toLowerCase();
        if (aT.includes(tT) || tT.includes(aT) ||
           (tT.includes('manhã') && aT.includes('manhã')) ||
           (tT.includes('tarde') && aT.includes('tarde')) ||
           (tT.includes('noite') && aT.includes('noite'))) {
            aluno.presente = !!presente;
        }
    });

    window.renderDiarioAlunos();
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            presente ? 'Todos Presentes' : 'Todos Desmarcados',
            `Frequência da turma ${turmaEscolhida} atualizada.`,
            'info'
        );
    }
};

window.togglePresenca = function(alunoId, isPresente) {
    const aluno = (window.mockAlunosDiario || []).find(a => a.id === alunoId);
    if(aluno) {
        aluno.presente = isPresente;
        window.renderDiarioAlunos();
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
    
    const titleEl = document.getElementById('planos-title');
    if(titleEl) titleEl.innerText = "Planos de Aula";
    const btnNovaFicha = document.getElementById('btn-nova-ficha');
    if(btnNovaFicha) btnNovaFicha.style.display = 'inline-flex';
    
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
// ==========================================
// MÓDULO DE CHAT INSTITUCIONAL (SINCRONIZAÇÃO BIDIRECIONAL & MULTI-DOCENTES)
// ==========================================
let contatoChatAtivo = null;
let boletimChatVinculado = null;

function isEntidadeCoordenacao(roleOuNome) {
    if (!roleOuNome) return false;
    const s = String(roleOuNome).toLowerCase().trim();
    return s.includes('coordena') || s.includes('coord') || s.includes('coordenador');
}

function matchDocente(idA, nomeA, idB, nomeB) {
    if (idA && idB && String(idA).trim() === String(idB).trim()) return true;
    const limpa = (n) => String(n || '')
        .toLowerCase()
        .replace(/prof(a|\.|ª|\.ª)?\s*/gi, '')
        .replace(/professor(a)?\s*/gi, '')
        .replace(/usuário\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    const cleanA = limpa(nomeA);
    const cleanB = limpa(nomeB);
    if (!cleanA || !cleanB) return false;
    return cleanA.includes(cleanB) || cleanB.includes(cleanA);
}

// Mensagens padrão de demonstração
let chatMensagens = JSON.parse(localStorage.getItem('senaivest_chat_mensagens') || '[]');
if (chatMensagens.length === 0) {
    chatMensagens = [
        {
            id: 1,
            remetenteId: '45678',
            remetente: 'Coordenação Pedagógica',
            remetenteRole: 'Coordenação',
            destinatarioId: 'PROF-101',
            destinatario: 'Prof. Roberto Silva',
            destinatarioRole: 'Professor',
            profId: 'PROF-101',
            profNome: 'Prof. Roberto Silva',
            texto: 'Olá Professor Roberto! Recebemos o boletim sobre a avaria da máquina reta.',
            data: 'Hoje, 09:30',
            boletimRef: 'PROC-101',
            lida: true,
            criadoEm: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 2,
            remetenteId: 'PROF-101',
            remetente: 'Prof. Roberto Silva',
            remetenteRole: 'Professor',
            destinatarioId: '45678',
            destinatario: 'Coordenação Pedagógica',
            destinatarioRole: 'Coordenação',
            profId: 'PROF-101',
            profNome: 'Prof. Roberto Silva',
            texto: 'Bom dia! A correia soltou durante a modelagem da turma da manhã. A máquina está isolada para manutenção.',
            data: 'Hoje, 09:35',
            boletimRef: 'PROC-101',
            lida: true,
            criadoEm: new Date(Date.now() - 3300000).toISOString()
        }
    ];
    localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
}

// Obter lista unificada de professores para o chat
window.getDocentesChatList = function() {
    const localUsers = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    const todos = { ...DEFAULT_SYSTEM_USERS, ...localUsers };
    const map = new Map();

    // Base fixa
    map.set('PROF-101', { id: 'PROF-101', nome: 'Prof. Roberto Silva', role: 'Professor', escola: 'SENAI Vestuário' });
    map.set('PROF-102', { id: 'PROF-102', nome: 'Profª. Clara Mendes', role: 'Professor', escola: 'SENAI Vestuário' });

    for (const [id, u] of Object.entries(todos)) {
        const role = (u.role || '').toLowerCase();
        if (role === 'professor') {
            map.set(id, {
                id: id,
                nome: u.nome || ('Prof. ' + id),
                role: 'Professor',
                escola: u.escola || 'SENAI Vestuário',
                foto: u.foto || ''
            });
        }
    }
    return Array.from(map.values());
};

window.abrirChatInstitucional = function(contatoNomeOuId, refBoletimId) {
    const listContainer = document.getElementById('chat-contacts-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const isUserCoord = isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome);
    const contatos = [];

    if (isUserCoord) {
        // Se for Coordenação: listar todos os professores cadastrados
        const docentes = window.getDocentesChatList();
        docentes.forEach(d => contatos.push(d));
    } else {
        // Se for Professor ou Aluno: listar a Coordenação e Almoxarifado
        contatos.push({ id: 'COORD-01', nome: 'Coordenação Pedagógica', role: 'Coordenação', escola: 'SENAI Vestuário' });
        contatos.push({ id: 'ALMOX-01', nome: 'Almoxarifado Central', role: 'Almoxarife', escola: 'SENAI Vestuário' });
    }

    // Renderizar contatos com contagem de não lidas e última mensagem
    contatos.forEach((c) => {
        const initial = (c.nome || 'P').charAt(0).toUpperCase();

        // Calcular não lidas deste contato específico
        let unreadCount = 0;
        let lastMsgSnippet = 'Iniciar conversa...';

        if (Array.isArray(chatMensagens)) {
            const msgsContato = chatMensagens.filter(m => {
                if (isUserCoord) {
                    return matchDocente(m.remetenteId, m.remetente, c.id, c.nome) ||
                           matchDocente(m.destinatarioId, m.destinatario, c.id, c.nome) ||
                           matchDocente(m.profId, m.profNome, c.id, c.nome);
                } else {
                    return (m.destinatarioId === currentUser.id || matchDocente(m.destinatarioId, m.destinatario, currentUser.id, currentUser.nome)) &&
                           (isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente));
                }
            });

            msgsContato.forEach(m => {
                if (!m.lida) {
                    if (isUserCoord && !isEntidadeCoordenacao(m.remetenteRole) && !isEntidadeCoordenacao(m.remetente)) {
                        unreadCount++;
                    } else if (!isUserCoord && (isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente))) {
                        unreadCount++;
                    }
                }
            });

            if (msgsContato.length > 0) {
                const last = msgsContato[msgsContato.length - 1];
                lastMsgSnippet = last.texto || (last.audio ? '🎤 Áudio de voz' : '📎 Anexo enviado');
            }
        }

        const unreadBadgeHtml = unreadCount > 0 ? `<span class="chat-contact-unread-badge">${unreadCount}</span>` : '';

        listContainer.innerHTML += `
            <div class="chat-contact-item" id="chat-item-${c.id}" onclick="selecionarContatoChat('${c.id}', '${c.nome.replace(/'/g, "\\'")}', '${c.role}')">
                <div class="chat-contact-avatar">${initial}</div>
                <div class="chat-contact-info" style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="chat-contact-name">${c.nome}</div>
                        ${unreadBadgeHtml}
                    </div>
                    <div class="chat-contact-role">${c.role} • ${c.escola || 'SENAI'}</div>
                    <div class="chat-last-snippet">${lastMsgSnippet}</div>
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
        const found = contatos.find(c =>
            c.id === contatoNomeOuId ||
            c.nome === contatoNomeOuId ||
            matchDocente(c.id, c.nome, contatoNomeOuId, contatoNomeOuId)
        );
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
    if (item) {
        item.classList.add('active');
        const badge = item.querySelector('.chat-contact-unread-badge');
        if (badge) badge.remove();
    }

    const nameEl = document.getElementById('chat-active-name');
    const roleEl = document.getElementById('chat-active-role');
    const avatarEl = document.getElementById('chat-active-avatar');

    if (nameEl) nameEl.innerText = nome;
    if (roleEl) roleEl.innerText = `${role} • SENAI Vestuário`;
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

    const isUserCoord = isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome);

    // Filtrar com precisão a thread desta conversa
    const thread = chatMensagens.filter(m => {
        if (isUserCoord) {
            // Coordenação conversando com contatoChatAtivo (docente selecionado)
            const msgPertenceDocente = matchDocente(m.profId, m.profNome, contatoChatAtivo.id, contatoChatAtivo.nome) ||
                                      matchDocente(m.remetenteId, m.remetente, contatoChatAtivo.id, contatoChatAtivo.nome) ||
                                      matchDocente(m.destinatarioId, m.destinatario, contatoChatAtivo.id, contatoChatAtivo.nome);

            if (!msgPertenceDocente) return false;

            const outroLadoCoord = isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente) ||
                                  isEntidadeCoordenacao(m.destinatarioRole) || isEntidadeCoordenacao(m.destinatario);
            return outroLadoCoord;
        } else {
            // Usuário é Professor (ou Aluno)
            if (isEntidadeCoordenacao(contatoChatAtivo.role) || isEntidadeCoordenacao(contatoChatAtivo.nome)) {
                const souEu = matchDocente(m.profId, m.profNome, currentUser.id, currentUser.nome) ||
                              matchDocente(m.remetenteId, m.remetente, currentUser.id, currentUser.nome) ||
                              matchDocente(m.destinatarioId, m.destinatario, currentUser.id, currentUser.nome);

                const comCoord = isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente) ||
                                 isEntidadeCoordenacao(m.destinatarioRole) || isEntidadeCoordenacao(m.destinatario);
                return souEu && comCoord;
            } else {
                return (m.remetenteId === currentUser.id && m.destinatarioId === contatoChatAtivo.id) ||
                       (m.remetenteId === contatoChatAtivo.id && m.destinatarioId === currentUser.id) ||
                       (m.remetente === currentUser.nome && m.destinatario === contatoChatAtivo.nome);
            }
        }
    });

    // Marcar as mensagens recebidas nesta conversa como lidas
    let houveLeitura = false;
    thread.forEach(m => {
        if (!m.lida) {
            if (isUserCoord && !isEntidadeCoordenacao(m.remetenteRole) && !isEntidadeCoordenacao(m.remetente)) {
                m.lida = true;
                houveLeitura = true;
            } else if (!isUserCoord && (isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente))) {
                m.lida = true;
                houveLeitura = true;
            }
        }
    });
    if (houveLeitura) {
        localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
        if (typeof atualizarNotificacoesChat === 'function') atualizarNotificacoesChat();
    }

    if (thread.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 20px; color:var(--text-secondary); font-size:13px;">
                <span class="material-icons-outlined" style="font-size:42px; display:block; margin-bottom:10px; color:#cbd5e1;">forum</span>
                <strong style="color:#0b2341; font-size:14px; display:block; margin-bottom:4px;">Nenhuma mensagem nesta conversa ainda</strong>
                Envie uma mensagem em texto, áudio ou anexo para falar com ${contatoChatAtivo.nome}.
            </div>
        `;
        return;
    }

    thread.forEach(m => {
        let isMine = false;
        if (isUserCoord) {
            isMine = isEntidadeCoordenacao(m.remetenteRole) || isEntidadeCoordenacao(m.remetente);
        } else {
            isMine = matchDocente(m.remetenteId, m.remetente, currentUser.id, currentUser.nome);
        }

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
                <div class="chat-msg-time">${m.data} ${isMine ? '✓✓' : ''}</div>
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

    const isUserCoord = isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome);
    const docenteVinculado = isUserCoord ? contatoChatAtivo : currentUser;

    const novaMsg = {
        id: Date.now(),
        remetenteId: currentUser.id || (isUserCoord ? '45678' : 'PROF-00'),
        remetente: currentUser.nome || (isUserCoord ? 'Coordenação Pedagógica' : 'Professor'),
        remetenteRole: isUserCoord ? 'Coordenação' : (currentUser.role || 'Professor'),
        destinatarioId: contatoChatAtivo.id,
        destinatario: contatoChatAtivo.nome,
        destinatarioRole: contatoChatAtivo.role || (isUserCoord ? 'Professor' : 'Coordenação'),
        profId: docenteVinculado.id,
        profNome: docenteVinculado.nome,
        texto: texto,
        data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boletimRef: boletimChatVinculado,
        criadoEm: new Date().toISOString(),
        lida: false
    };

    chatMensagens.push(novaMsg);
    localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));

    // Salvar no Cloud Firestore se conectado
    if (db) {
        db.collection('chat_mensagens').add(novaMsg).catch(console.warn);
    }

    input.value = '';
    renderizarMensagensChat();
    if (typeof atualizarNotificacoesChat === 'function') atualizarNotificacoesChat();

    // Atualizar snippet do contato na lista
    const item = document.getElementById(`chat-item-${contatoChatAtivo.id}`);
    if (item) {
        const snip = item.querySelector('.chat-last-snippet');
        if (snip) snip.innerText = texto;
    }
};

window.anexarArquivoChat = function(event) {
    const file = event.target.files[0];
    if (!file || !contatoChatAtivo) return;

    const isUserCoord = isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome);
    const docenteVinculado = isUserCoord ? contatoChatAtivo : currentUser;

    const reader = new FileReader();
    reader.onload = function(e) {
        const novaMsg = {
            id: Date.now(),
            remetenteId: currentUser.id || (isUserCoord ? '45678' : 'PROF-00'),
            remetente: currentUser.nome || (isUserCoord ? 'Coordenação Pedagógica' : 'Professor'),
            remetenteRole: isUserCoord ? 'Coordenação' : (currentUser.role || 'Professor'),
            destinatarioId: contatoChatAtivo.id,
            destinatario: contatoChatAtivo.nome,
            destinatarioRole: contatoChatAtivo.role || (isUserCoord ? 'Professor' : 'Coordenação'),
            profId: docenteVinculado.id,
            profNome: docenteVinculado.nome,
            texto: `📎 Anexo: ${file.name}`,
            anexo: e.target.result,
            anexoNome: file.name,
            data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            boletimRef: boletimChatVinculado,
            criadoEm: new Date().toISOString(),
            lida: false
        };

        chatMensagens.push(novaMsg);
        localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
        if (db) db.collection('chat_mensagens').add(novaMsg).catch(console.warn);

        renderizarMensagensChat();
        if (typeof atualizarNotificacoesChat === 'function') atualizarNotificacoesChat();
    };
    reader.readAsDataURL(file);
};

window.gravarAudioChat = function() {
    if (!contatoChatAtivo) return;

    const isUserCoord = isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome);
    const docenteVinculado = isUserCoord ? contatoChatAtivo : currentUser;

    // Simulação ou gravação via microfone
    const audioMsg = prompt("Enviar gravação de áudio institucional:\nDigite o recado de voz para gravar:", "Olá! Informo sobre o andamento dos materiais da aula.");
    if (!audioMsg) return;

    const novaMsg = {
        id: Date.now(),
        remetenteId: currentUser.id || (isUserCoord ? '45678' : 'PROF-00'),
        remetente: currentUser.nome || (isUserCoord ? 'Coordenação Pedagógica' : 'Professor'),
        remetenteRole: isUserCoord ? 'Coordenação' : (currentUser.role || 'Professor'),
        destinatarioId: contatoChatAtivo.id,
        destinatario: contatoChatAtivo.nome,
        destinatarioRole: contatoChatAtivo.role || (isUserCoord ? 'Professor' : 'Coordenação'),
        profId: docenteVinculado.id,
        profNome: docenteVinculado.nome,
        texto: `🎤 Áudio Institucional: "${audioMsg}"`,
        data: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boletimRef: boletimChatVinculado,
        criadoEm: new Date().toISOString(),
        lida: false
    };

    chatMensagens.push(novaMsg);
    localStorage.setItem('senaivest_chat_mensagens', JSON.stringify(chatMensagens));
    if (db) db.collection('chat_mensagens').add(novaMsg).catch(console.warn);

    renderizarMensagensChat();
    if (typeof atualizarNotificacoesChat === 'function') atualizarNotificacoesChat();
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
                            <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#475569; background:#f1f5f9; padding:3px 8px; border-radius:6px; letter-spacing:0.3px; text-transform:uppercase;"><span class="material-icons-outlined" style="font-size:14px; color:#f59e0b;">schedule</span> Pendência de Retorno ao Estoque</span>
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
            <div style="display:flex; align-items:flex-start; gap:16px;">
                <div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap;">
                        <span style="background: rgba(225, 29, 72, 0.2); color: #fb7185; border: 1px solid rgba(225, 29, 72, 0.4); padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Atraso Identificado</span>
                        <div style="font-weight:800; font-size:15px; letter-spacing:0.3px; color:#ffffff;">
                            AULA FINALIZADA &amp; PENDÊNCIA DE DEVOLUÇÃO AO ESTOQUE
                        </div>
                    </div>
                    <div style="font-size:13px; color:#cbd5e1; margin-top:2px; line-height: 1.5;">
                        A aula <strong>"${p.tema}"</strong> (${p.turma}) encerrou o horário limite. Os materiais precisam retornar para <strong>${p.salaOrigem}</strong>.
                        Atraso atual: <strong id="prof-banner-timer-${p.id}" style="color:#fb7185; font-weight:800;">+${tempoAtraso}</strong>.
                    </div>
                </div>
            </div>
            <div>
                <button type="button" onclick="abrirModalDevolucao('${p.id}')">
                    <span class="material-icons-outlined" style="font-size:18px; vertical-align:middle; margin-right:6px; color:#0284c7;">photo_camera</span> Registro do material guardado
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
    // Liberar reserva de materiais no controle e atualizar selects
    if (typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
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



// =========================================================================
// MÓDULO PROFESSOR: CHECK-IN DE BANCADAS, AUDITORIA & AVISOS PARA TURMAS
// =========================================================================

// Estado inicial das Bancadas do Professor
window.bancadasCheckinMock = [
    {
        numero: 'Bancada 01',
        tipo: 'Máquina Reta Industrial (Zoje A6000)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'Pedro Santos',
        alunoMatricula: 'ALU-001',
        status: 'confirmado',
        horario: '08:02',
        auditoria: 'ok',
        materiais: '1x Tesoura de Arremate Mundial, 2x Linha 120, 1x Fita Métrica 150cm, 4.0m Algodão Cru',
        divergenciaTexto: '',
        observacao: 'Check-in realizado no horário. Equipamento calibrado e limpo.'
    },
    {
        numero: 'Bancada 02',
        tipo: 'Máquina Overlock Industrial (Siruba 747)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'João Silva',
        alunoMatricula: 'ALU-002',
        status: 'divergencia',
        horario: '08:05',
        auditoria: 'divergencia',
        materiais: '3x Cones Fio Overlock, 1x Pinça Curva de Enfiamento',
        divergenciaTexto: 'Tesoura de Arremate não encontrada na gaveta no início da aula.',
        observacao: 'Aguardando professor autorizar reposição ou orientar a turma.'
    },
    {
        numero: 'Bancada 03',
        tipo: 'Máquina Galoneira Plana (Jack W4)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'Carlos Eduardo',
        alunoMatricula: 'ALU-003',
        status: 'confirmado',
        horario: '08:08',
        auditoria: 'ok',
        materiais: '1x Pinça de Enfiamento, 3x Cones Fio Helanca, 1x Tesoura Arremate',
        divergenciaTexto: '',
        observacao: 'Fiação e tensão de ponto testadas em retalho.'
    },
    {
        numero: 'Bancada 04',
        tipo: 'Máquina Reta Industrial (Juki DDL-8700)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'Mariana Souza',
        alunoMatricula: 'ALU-004',
        status: 'confirmado',
        horario: '08:00',
        auditoria: 'ok',
        materiais: '1x Tesoura Mundial, 2x Bobinas Linha, 1x Fita Métrica, 5.0m Algodão Cru',
        divergenciaTexto: '',
        observacao: 'Auditoria inicial 100% precisa (+50 pts). Doou 1 retalho ao estoque circular.'
    },
    {
        numero: 'Bancada 05',
        tipo: 'Máquina Pespontadeira Dupla (Lanmax)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'Ana Clara Lima',
        alunoMatricula: 'ALU-005',
        status: 'pendente',
        horario: '--:--',
        auditoria: 'pendente',
        materiais: '2x Bobinas Linha Pesada, 1x Guia Magnético, 1x Tesoura Arremate',
        divergenciaTexto: 'Aluno ainda não confirmou presença na bancada física.',
        observacao: 'Bancada aguardando início das atividades práticas.'
    },
    {
        numero: 'Bancada 06',
        tipo: 'Máquina Reta Eletrônica (Brother S-7200C)',
        turma: 'Vestuário e Estilismo - Manhã',
        alunoNome: 'Lucas Ferreira',
        alunoMatricula: 'ALU-006',
        status: 'confirmado',
        horario: '08:12',
        auditoria: 'ok',
        materiais: '1x Tesoura Arremate, 1x Bobina Linha, 1x Fita Métrica, 2.5m Seda/Crepe',
        divergenciaTexto: '',
        observacao: 'Painel eletrônico configurado para corte automático de linha.'
    }
];

// Restaurar avisos persistidos do localStorage se existirem
try {
    const savedAvisos = localStorage.getItem('senaivest_avisos_turma');
    if (savedAvisos) {
        window.avisosTurmaProfessor = JSON.parse(savedAvisos);
    }
} catch(e) {
    console.warn('Erro ao carregar avisos salvos:', e);
}

// 1. RENDERIZAR O PAINEL DE CHECK-IN DE BANCADAS DO PROFESSOR
window.renderCheckinBancadaProf = function() {
    const grid = document.getElementById('prof-checkin-bancadas-grid');
    if (!grid) return;

    const turmaSelect = document.getElementById('prof-checkin-turma-select');
    const turmaFiltro = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo - Manhã';

    // Atualizar contadores KPI
    const total = window.bancadasCheckinMock.length;
    const confirmados = window.bancadasCheckinMock.filter(b => b.status === 'confirmado').length;
    const auditoriasOk = window.bancadasCheckinMock.filter(b => b.auditoria === 'ok').length;
    const divergencias = window.bancadasCheckinMock.filter(b => b.status === 'divergencia').length;

    const elTotal = document.getElementById('prof-stat-total-bancadas');
    if (elTotal) elTotal.innerText = total;
    const elConf = document.getElementById('prof-stat-checkins-ok');
    if (elConf) elConf.innerText = `${confirmados}/${total}`;
    const elAudit = document.getElementById('prof-stat-auditorias-ok');
    if (elAudit) elAudit.innerText = auditoriasOk;
    const elDiv = document.getElementById('prof-stat-divergencias');
    if (elDiv) elDiv.innerText = divergencias;

    // Renderizar cards das bancadas
    grid.innerHTML = '';
    window.bancadasCheckinMock.forEach(b => {
        let badgeStatus = '';
        let statusClass = `status-${b.status}`;
        
        if (b.status === 'confirmado') {
            badgeStatus = `<span style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">verified</span> Check-in OK (${b.horario})
            </span>`;
        } else if (b.status === 'divergencia') {
            badgeStatus = `<span style="background:rgba(245,158,11,0.15); color:#d97706; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">warning</span> Divergência (${b.horario})
            </span>`;
        } else {
            badgeStatus = `<span style="background:rgba(148,163,184,0.15); color:#64748b; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Aguardando Check-in
            </span>`;
        }

        const initialLetter = b.alunoNome.charAt(0);

        grid.innerHTML += `
            <div class="checkin-card ${statusClass}">
                <div>
                    <div class="checkin-card-header">
                        <div>
                            <div class="checkin-bancada-title">
                                <span class="material-icons-outlined" style="font-size:20px;">precision_manufacturing</span>
                                ${b.numero}
                            </div>
                            <div class="checkin-machine-type">${b.tipo}</div>
                        </div>
                        <div>${badgeStatus}</div>
                    </div>

                    <!-- Aluno Ocupante -->
                    <div class="checkin-aluno-box">
                        <div class="checkin-aluno-avatar">${initialLetter}</div>
                        <div class="checkin-aluno-info">
                            <h4>${b.alunoNome}</h4>
                            <p>Matrícula: <strong>${b.alunoMatricula}</strong> &bull; ${b.turma}</p>
                        </div>
                    </div>

                    <!-- Materiais e Auditoria Rotativa -->
                    <div class="checkin-materiais-box">
                        <div style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:4px;">
                            Inventário Rotativo / Materiais Físicos
                        </div>
                        <div>${b.materiais}</div>
                    </div>

                    ${b.divergenciaTexto ? `
                        <div class="checkin-divergencia-alerta">
                            <span class="material-icons-outlined" style="font-size:18px; flex-shrink:0;">error_outline</span>
                            <div>
                                <strong>Divergência Reportada:</strong><br>
                                ${b.divergenciaTexto}
                            </div>
                        </div>
                    ` : ''}

                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; font-style:italic;">
                        📝 ${b.observacao}
                    </div>
                </div>

                <!-- Ações do Professor -->
                <div class="checkin-card-actions">
                    <button type="button" class="checkin-action-btn" onclick="abrirModalEditarBancadaProf('${b.numero}')" style="background:var(--bg-body); border:1px solid var(--border-color); color:var(--text-primary); font-weight:700;">
                        <span class="material-icons-outlined" style="font-size:16px; color:var(--primary-color);">edit</span> Editar Bancada & Insumos
                    </button>

                    ${b.status === 'divergencia' ? `
                        <button type="button" class="checkin-action-btn btn-resolver" onclick="resolverDivergenciaBancadaProf('${b.numero}')">
                            <span class="material-icons-outlined" style="font-size:16px;">handyman</span> Resolver Divergência
                        </button>
                    ` : `
                        <button type="button" class="checkin-action-btn btn-validar" onclick="validarCheckinBancadaProf('${b.numero}')">
                            <span class="material-icons-outlined" style="font-size:16px;">check_circle</span> Validar Auditoria
                        </button>
                    `}
                    
                    <button type="button" class="checkin-action-btn btn-notify" onclick="abrirModalNovoAvisoProfessor('${b.numero}', '${b.turma}', '${b.alunoNome}')">
                        <span class="material-icons-outlined" style="font-size:16px;">campaign</span> Notificar Aluno
                    </button>
                </div>
            </div>
        `;
    });
};

// Validar Check-in de Bancada pelo Professor
window.validarCheckinBancadaProf = function(numeroBancada) {
    const item = window.bancadasCheckinMock.find(b => b.numero === numeroBancada);
    if (!item) return;

    item.status = 'confirmado';
    item.auditoria = 'ok';
    if (!item.horario || item.horario === '--:--') {
        item.horario = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    item.observacao = 'Auditoria e presença validadas pelo professor com sucesso.';
    renderCheckinBancadaProf();
    alert(`✅ Check-in e auditoria da ${numeroBancada} validados com sucesso!`);
};

// Resolver Divergência de Bancada pelo Professor
window.resolverDivergenciaBancadaProf = function(numeroBancada) {
    const item = window.bancadasCheckinMock.find(b => b.numero === numeroBancada);
    if (!item) return;

    const solucao = prompt(`Resolução de divergência na ${numeroBancada} (${item.alunoNome}):
Informe a providência tomada:`, 'Item reposto pelo almoxarifado do laboratório e regularizado.');
    if (solucao) {
        item.status = 'confirmado';
        item.auditoria = 'ok';
        item.observacao = `Divergência resolvida: ${solucao}`;
        item.divergenciaTexto = '';
        renderCheckinBancadaProf();
        alert(`🔧 Divergência na ${numeroBancada} marcada como resolvida!`);
    }
};

// 2. MODAL E SISTEMA DE EMISSÃO DE AVISOS PARA TURMAS
window.abrirModalNovoAvisoProfessor = function(bancadaPre, turmaPre, alunoPre) {
    const selTurma = document.getElementById('aviso-turma-destino');
    if (selTurma && turmaPre) selTurma.value = turmaPre;

    const selBancada = document.getElementById('aviso-bancada-destino');
    if (selBancada) {
        selBancada.value = bancadaPre || 'Geral (Toda a Turma)';
    }

    const inputTitulo = document.getElementById('aviso-titulo');
    const inputMsg = document.getElementById('aviso-mensagem');
    const selCat = document.getElementById('aviso-categoria');

    if (bancadaPre && alunoPre) {
        if (selCat) selCat.value = '📋 Check-in & Inventário de Bancada';
        if (inputTitulo) inputTitulo.value = `Atenção ao Check-in e Materiais - ${bancadaPre} (${alunoPre})`;
        if (inputMsg) inputMsg.value = `Olá ${alunoPre}! Por favor, verifique com atenção a gaveta e os materiais da sua bancada antes de iniciar a costura. Caso falte algum insumo, informe imediatamente.`;
    } else {
        if (inputTitulo) inputTitulo.value = '';
        if (inputMsg) inputMsg.value = '';
    }

    openModal('modal-novo-aviso-professor');
};

// Salvar Novo Aviso emitido pelo Professor
window.salvarNovoAvisoProfessor = function(e) {
    e.preventDefault();
    const turma = document.getElementById('aviso-turma-destino').value;
    const bancada = document.getElementById('aviso-bancada-destino').value;
    const categoria = document.getElementById('aviso-categoria').value;
    const prioridade = document.getElementById('aviso-prioridade').value;
    const titulo = document.getElementById('aviso-titulo').value.trim();
    const mensagem = document.getElementById('aviso-mensagem').value.trim();

    const novoAviso = {
        id: Date.now(),
        autor: currentUser.nome || 'Prof. Roberto Silva',
        cargo: currentUser.role === 'Coordenação' ? 'Coordenação Pedagógica' : 'Professor Responsável',
        turma: turma,
        bancada: bancada,
        categoria: categoria,
        prioridade: prioridade,
        titulo: titulo,
        texto: mensagem,
        data: 'Hoje às ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipo: 'aviso-turma'
    };

    if (!Array.isArray(window.avisosTurmaProfessor)) {
        window.avisosTurmaProfessor = [];
    }

    window.avisosTurmaProfessor.unshift(novoAviso);

    // Persistir no localStorage
    try {
        localStorage.setItem('senaivest_avisos_turma', JSON.stringify(window.avisosTurmaProfessor));
    } catch(err) {
        console.warn('Erro ao salvar aviso no localStorage:', err);
    }

    closeModal('modal-novo-aviso-professor');
    renderPainelAvisos();
    alert(`📢 Aviso "${titulo}" publicado com sucesso para a turma "${turma}"!`);
};

// Excluir Aviso do Mural
window.excluirAvisoProfessor = function(id) {
    if (confirm('Deseja realmente remover este comunicado do mural?')) {
        window.avisosTurmaProfessor = window.avisosTurmaProfessor.filter(a => a.id !== id);
        try {
            localStorage.setItem('senaivest_avisos_turma', JSON.stringify(window.avisosTurmaProfessor));
        } catch(e) {}
        renderPainelAvisos();
    }
};

// Alternar entre Sub-Abas do Painel de Avisos (Mural Pedagógico vs Alertas Automáticos de Estoque)

window.switchAvisosSubTab = function(tab) {
    const btnMural = document.getElementById('tab-btn-mural');
    const btnEstoque = document.getElementById('tab-btn-estoque');
    const painelMural = document.getElementById('painel-avisos-mural');
    const painelEstoque = document.getElementById('painel-avisos-estoque');

    // Se for Aluno, esconde a aba de Alertas Automáticos de Estoque e força Mural Pedagógico
    if (currentUser && currentUser.role === 'Aluno') {
        if (btnEstoque) btnEstoque.style.display = 'none';
        if (painelEstoque) painelEstoque.style.display = 'none';
        tab = 'mural';
    } else {
        if (btnEstoque) btnEstoque.style.display = 'inline-flex';
    }

    if (tab === 'mural') {
        if (btnMural) btnMural.classList.add('active');
        if (btnEstoque) btnEstoque.classList.remove('active');
        if (painelMural) painelMural.style.display = 'block';
        if (painelEstoque) painelEstoque.style.display = 'none';
        window.renderPainelAvisos();
    } else {
        if (btnMural) btnMural.classList.remove('active');
        if (btnEstoque) btnEstoque.classList.add('active');
        if (painelMural) painelMural.style.display = 'none';
        if (painelEstoque) painelEstoque.style.display = 'block';
        window.renderAlertasAutomaticosEstoque();
    }
};


// Renderizar Alertas Automáticos do Sistema (Controle de Estoque & Devolução de Materiais)
window.renderAlertasAutomaticosEstoque = function() {
    const container = document.getElementById('estoque-alertas-list');
    const badgeTotal = document.getElementById('badge-total-alertas-estoque');
    const statCritico = document.getElementById('stat-alertas-estoque-critico');
    const statAtraso = document.getElementById('stat-alertas-devolucoes-atraso');
    const statAtivas = document.getElementById('stat-alertas-aulas-ativas');

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const planosCtrl = Array.isArray(window.planosAulasControle) ? window.planosAulasControle : [];
    const liveStatus = window.getProfessoresStatusState ? window.getProfessoresStatusState() : {};

    // 1. Itens com Estoque Baixo ou Crítico (<= 15 un)
    const itensRepor = mats.filter(m => {
        const q = parseFloat(m.qtd);
        return !isNaN(q) && q <= 15;
    });

    // 2. Devoluções pendentes / em atraso
    const agora = Date.now();
    const pendentes = planosCtrl.filter(p => {
        if (p.status === 'atrasado') return true;
        if (p.status === 'em_aula' && p.timestampLimite && p.timestampLimite < agora && !p.devolucao) return true;
        return false;
    });

    // 3. Aulas práticas em andamento
    let aulasAtivasCount = 0;
    for (const [profId, st] of Object.entries(liveStatus)) {
        if (st && st.status === 'em_aula') aulasAtivasCount++;
    }

    const totalAlertas = itensRepor.length + pendentes.length;
    if (badgeTotal) badgeTotal.innerText = `${totalAlertas} ${totalAlertas === 1 ? 'Alerta' : 'Alertas'}`;
    if (statCritico) statCritico.innerText = `${itensRepor.length} itens`;
    if (statAtraso) statAtraso.innerText = `${pendentes.length} aulas`;
    if (statAtivas) statAtivas.innerText = `${aulasAtivasCount} ativas`;

    if (!container) return;
    container.innerHTML = '';

    if (totalAlertas === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:36px 20px; background:#f0fdf4; border:1px dashed #bbf7d0; border-radius:12px; color:#166534;">
                <span class="material-icons-outlined" style="font-size:42px; color:#10b981; display:block; margin-bottom:8px;">verified</span>
                <h4 style="margin:0 0 4px; font-size:16px; font-weight:800;">Estoque e Devoluções 100% em Conformidade!</h4>
                <p style="margin:0; font-size:13px; color:#15803d;">Não há produtos abaixo do nível de segurança nem devoluções em atraso no momento.</p>
            </div>
        `;
        return;
    }

    // Renderizar Alertas de Devolução / Atraso de Materiais (prioridade)
    pendentes.forEach(p => {
        const prof = p.professorNome || 'Docente Responsável';
        const sala = p.salaUso || p.salaOrigem || 'Laboratório';
        const turma = p.turma || 'Turma Regular';
        const matsTxt = p.materiaisTexto || 'Ferramentas e insumos práticos';
        const id = p.id || 'PLAN-000';

        container.innerHTML += `
            <div class="alerta-estoque-card atraso">
                <div style="display:flex; align-items:flex-start; gap:14px; flex:1;">
                    <div style="width:42px; height:42px; border-radius:10px; background:#fee2e2; color:#dc2626; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-icons-outlined" style="font-size:24px;">schedule_send</span>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                            <span style="background:#dc2626; color:white; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">PENDENTE DE DEVOLUÇÃO</span>
                            <span style="font-size:12px; font-weight:700; color:#0b2341;">${id}</span>
                            <span style="font-size:11.5px; color:#b91c1c; font-weight:600;">Sessão finalizada sem confirmação de retorno</span>
                        </div>
                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0b2341;">${p.tema || 'Aula Prática'}</h4>
                        <div style="font-size:12.5px; color:#475569; line-height:1.5;">
                            <strong>Docente:</strong> ${prof} &bull; <strong>Local:</strong> ${sala} &bull; <strong>Turma:</strong> ${turma}
                        </div>
                        <div style="margin-top:6px; font-size:12px; color:#7f1d1d; background:rgba(220, 38, 38, 0.06); padding:6px 10px; border-radius:6px;">
                            <strong>Materiais aguardando retorno ao almoxarifado:</strong> ${matsTxt}
                        </div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;">
                    <button type="button" class="primary-btn" onclick="abrirChatInstitucional('${prof.replace(/'/g, "\\'")}')" style="font-size:12px; padding:7px 12px; background:#0b2341; justify-content:center;">
                        <span class="material-icons-outlined" style="font-size:15px; margin-right:4px;">chat</span> Notificar Docente
                    </button>
                    <button type="button" class="secondary-btn" onclick="if(typeof abrirModalDevolucaoFoto === 'function') abrirModalDevolucaoFoto('${id}'); else alert('Registrar baixa física no estoque.');" style="font-size:11.5px; padding:6px 10px; justify-content:center; border-color:#fca5a5; color:#b91c1c;">
                        <span class="material-icons-outlined" style="font-size:14px; margin-right:4px;">assignment_returned</span> Dar Baixa
                    </button>
                </div>
            </div>
        `;
    });

    // Renderizar Alertas de Reposição de Estoque
    itensRepor.forEach(m => {
        const q = parseFloat(m.qtd) || 0;
        const isCritico = q <= 6;
        const cardClass = isCritico ? 'critico' : 'atencao';
        const badgeColor = isCritico ? '#e11d48' : '#d97706';
        const badgeBg = isCritico ? '#ffe4e6' : '#fef3c7';
        const badgeTxt = isCritico ? 'ESTOQUE CRÍTICO' : 'REPOSIÇÃO NECESSÁRIA';
        const local = m.almoxAtual || m.almoxOrigem || 'Sala 01 - Modelagem';
        const cod = m.cod || m.codigo || 'MAT-000';

        container.innerHTML += `
            <div class="alerta-estoque-card ${cardClass}">
                <div style="display:flex; align-items:flex-start; gap:14px; flex:1;">
                    <div style="width:42px; height:42px; border-radius:10px; background:${badgeBg}; color:${badgeColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-icons-outlined" style="font-size:24px;">inventory_2</span>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                            <span style="background:${badgeColor}; color:white; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">${badgeTxt}</span>
                            <span style="font-size:12px; font-weight:700; color:#0b2341;">${cod}</span>
                            <span style="font-size:12px; color:var(--text-secondary);">&bull; ${m.tipo || 'Insumo'}</span>
                        </div>
                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0b2341;">${m.nome}</h4>
                        <div style="font-size:12.5px; color:#475569; display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                            <span><strong>Localização:</strong> ${local} ${m.local ? `(${m.local})` : ''}</span>
                            <span style="color:${badgeColor}; font-weight:800;">Saldo Disponível: ${q} un</span>
                            <span style="color:#64748b;">(Mínimo de Segurança: 20 un)</span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:8px; flex-shrink:0;">
                    <button type="button" class="primary-btn" onclick="abrirFormularioBoletim('reposicao', 'Reposição de ${m.nome.replace(/'/g, "\\'")}')" style="font-size:12px; padding:7px 14px; background:${badgeColor}; border-color:${badgeColor}; justify-content:center;">
                        <span class="material-icons-outlined" style="font-size:15px; margin-right:4px;">add_shopping_cart</span> Repor Item
                    </button>
                    <button type="button" class="secondary-btn" onclick="nav('view-almoxarifado')" style="font-size:11.5px; padding:6px 10px; justify-content:center;">
                        Ver no Estoque
                    </button>
                </div>
            </div>
        `;
    });
};

// Filtrar Avisos por Turma no Mural
window.filtrarAvisosPorTurma = function(turma) {
    renderPainelAvisos(turma);
};

// 3. RENDERIZAR O MURAL DE AVISOS E COMUNICADOS (UNIFICADO E RESPONSIVO)
window.renderPainelAvisos = function(turmaFiltro) {
    if (typeof window.renderAlertasAutomaticosEstoque === 'function') {
        window.renderAlertasAutomaticosEstoque();
    }
    const list = document.getElementById('notif-list');
    if (!list) return;

    const filtroSelect = document.getElementById('filtro-turma-avisos');
    const filtro = turmaFiltro || (filtroSelect ? filtroSelect.value : 'todas');

    // Controlar visibilidade do botão de criar aviso: apenas Professor ou Coordenação
    const btnNovo = document.getElementById('btn-novo-aviso-mural');
    if (btnNovo) {
        btnNovo.style.display = (currentUser.role === 'Aluno') ? 'none' : 'inline-flex';
    }

    let avisosExibir = [...(window.avisosTurmaProfessor || [])];

    // Se o usuário logado for ALUNO: mostrar apenas avisos destinados à turma dele ou a "Todas as Turmas"
    if (currentUser.role === 'Aluno') {
        const turmaAluno = currentUser.turma || 'Vestuário e Estilismo - Manhã';
        avisosExibir = avisosExibir.filter(a => {
            return !a.turma || a.turma === 'Todas as Turmas' || a.turma === 'todas' || a.turma === turmaAluno;
        });
    } else if (filtro && filtro !== 'todas') {
        avisosExibir = avisosExibir.filter(a => a.turma === filtro || a.turma === 'Todas as Turmas');
    }

    if (avisosExibir.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:48px 24px; color:var(--text-secondary);">
                <span class="material-icons-outlined" style="font-size:48px; color:var(--border-color); margin-bottom:12px;">notifications_off</span>
                <h3 style="font-size:16px; margin-bottom:4px; color:var(--text-primary);">Nenhum comunicado no mural</h3>
                <p style="font-size:13px; max-width:400px; margin:0 auto;">Não há avisos registrados para a seleção atual. Novos comunicados emitidos pelos professores aparecerão aqui.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    avisosExibir.forEach(aviso => {
        let badgePrioridade = '';
        if (aviso.prioridade === 'Urgente') {
            badgePrioridade = `<span style="background:rgba(230,57,70,0.1); color:var(--danger-color); padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">URGENTE</span>`;
        } else if (aviso.prioridade === 'Importante') {
            badgePrioridade = `<span style="background:rgba(245,158,11,0.15); color:#d97706; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:700;">IMPORTANTE</span>`;
        }

        const isAluno = (currentUser.role === 'Aluno');

        list.innerHTML += `
            <div class="aviso-turma-card" style="border-left: 5px solid ${aviso.prioridade === 'Urgente' ? 'var(--danger-color)' : 'var(--primary-color)'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <span class="aviso-tag-turma">
                            <span class="material-icons-outlined" style="font-size:15px;">groups</span>
                            ${aviso.turma || 'Todas as Turmas'}
                        </span>

                        ${aviso.bancada && aviso.bancada !== 'Geral (Toda a Turma)' ? `
                            <span class="aviso-tag-bancada">
                                <span class="material-icons-outlined" style="font-size:15px;">precision_manufacturing</span>
                                ${aviso.bancada}
                            </span>
                        ` : ''}

                        ${aviso.categoria ? `
                            <span style="font-size:11.5px; color:var(--text-secondary); font-weight:600;">
                                ${aviso.categoria}
                            </span>
                        ` : ''}

                        ${badgePrioridade}
                    </div>

                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:12px; color:var(--text-secondary);">${aviso.data}</span>
                        ${!isAluno ? `
                            <button class="icon-btn" onclick="excluirAvisoProfessor(${aviso.id})" title="Remover Aviso" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; padding:2px;">
                                <span class="material-icons-outlined" style="font-size:18px;">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <h3 style="margin:0 0 8px; font-size:16px; color:var(--text-primary); font-weight:800;">
                    ${aviso.titulo}
                </h3>

                <p style="margin:0 0 12px; font-size:13.5px; line-height:1.6; color:var(--text-primary);">
                    ${aviso.texto}
                </p>

                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid #f1f5f9; font-size:12px;">
                    <span style="color:var(--primary-color); font-weight:700; display:flex; align-items:center; gap:4px;">
                        <span class="material-icons-outlined" style="font-size:16px;">school</span>
                        Por: ${aviso.autor} ${aviso.cargo ? `(${aviso.cargo})` : ''}
                    </span>
                    ${isAluno ? `
                        <span style="color:var(--success-color); font-weight:700; display:flex; align-items:center; gap:4px;">
                            <span class="material-icons-outlined" style="font-size:16px;">done_all</span> Notificação Ativa
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    });
};


// =========================================================================
// MÓDULO SENAIVEST 2.0: CONTROLE DE BANCADAS, ESTOQUE E RESERVA DE MATERIAIS
// =========================================================================

// --- 1. POPULAR SELECT DE MATERIAIS CADASTRADOS NO ESTOQUE (ZERO DIGITAÇÃO NA BANCADA) ---
window.populateNovoMatEstoqueSelect = function() {
    const sel = document.getElementById('novo-mat-estoque-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">📦 Escolha um Material Cadastrado no Estoque...</option>';

    let mats = [];
    if (Array.isArray(window.mockMateriais) && window.mockMateriais.length > 0) {
        mats = window.mockMateriais;
    } else if (typeof mockMateriais !== 'undefined' && Array.isArray(mockMateriais)) {
        mats = mockMateriais;
    } else {
        try {
            const salvos = localStorage.getItem('senaivest_materiais');
            if (salvos) mats = JSON.parse(salvos);
        } catch(e) {}
    }
    window.mockMateriais = mats;

    mats.forEach(m => {
        const cod = m.cod || m.codigo || '';
        const nome = m.nome || '';
        const qtd = m.qtd !== undefined ? m.qtd : (m.quantidade || 0);
        const almox = m.almoxAtual || m.salaOrigem || m.local || 'Estoque';
        const opt = document.createElement('option');
        opt.value = cod;
        opt.textContent = `[${cod}] ${nome} — Disp: ${qtd} un (${almox})`;
        sel.appendChild(opt);
    });
};

// Alternar exibição do modo manual de insumo fora de catálogo
window.toggleModoInsumoManual = function() {
    const modoManual = document.getElementById('modo-insumo-manual');
    const btn = document.getElementById('btn-toggle-modo-insumo');
    if (!modoManual) return;

    if (modoManual.style.display === 'none' || modoManual.style.display === '') {
        modoManual.style.display = 'block';
        if (btn) btn.innerText = '- Ocultar Insumo Manual';
    } else {
        modoManual.style.display = 'none';
        if (btn) btn.innerText = '+ Digitar Insumo Avulso Manual (Fora de Catálogo)';
    }
};

// Adicionar material diretamente do catálogo do estoque à bancada
window.adicionarMaterialEstoqueDireto = function() {
    const sel = document.getElementById('novo-mat-estoque-select');
    if (!sel || !sel.value) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Selecione um Material', 'Escolha um item do estoque cadastrado no dropdown antes de adicionar.', 'warning');
        } else {
            alert('Escolha um item do estoque cadastrado no dropdown.');
        }
        return;
    }

    const cod = sel.value;
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const mat = mats.find(m => (m.cod || m.codigo) === cod);
    if (!mat) return;

    const qtdInput = document.getElementById('novo-mat-qtd-estoque');
    const qtd = parseFloat(qtdInput ? qtdInput.value : 1) || 1;

    let unid = 'un';
    const nLower = (mat.nome || '').toLowerCase();
    if (nLower.includes('tecido') || nLower.includes('papel') || nLower.includes('fita')) unid = 'm';
    else if (nLower.includes('cone') || nLower.includes('fio') || nLower.includes('linha')) unid = 'cones';
    else if (nLower.includes('cartela') || nLower.includes('botão')) unid = 'cartela';
    else if (nLower.includes('rolo')) unid = 'rolo';

    if (!Array.isArray(window.materiaisModalEdicao)) window.materiaisModalEdicao = [];

    const existente = window.materiaisModalEdicao.find(m => (m.codigo || m.cod) === cod);
    if (existente) {
        existente.qtdEsperada += qtd;
        existente.qtdConferida = existente.qtdEsperada;
    } else {
        window.materiaisModalEdicao.push({
            id: 'mat-' + Date.now(),
            nome: mat.nome,
            codigo: cod,
            qtdEsperada: qtd,
            qtdConferida: qtd,
            unidade: unid,
            condicao: 'Em bom estado',
            status: 'OK',
            checked: true
        });
    }

    sel.value = '';
    if (qtdInput) qtdInput.value = '1';
    window.renderMateriaisModalTbody();
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Material Adicionado', `${mat.nome} (${qtd} ${unid}) inserido no kit da bancada!`, 'success');
    }
};

// Adicionar insumo avulso manual e SALVAR AUTOMATICAMENTE NO CATÁLOGO DO ESTOQUE
window.adicionarMaterialModal = function() {
    const inputNome = document.getElementById('novo-mat-nome');
    const inputCod = document.getElementById('novo-mat-cod');
    const inputQtd = document.getElementById('novo-mat-qtd');
    const inputUnid = document.getElementById('novo-mat-unid');
    const nome = inputNome ? inputNome.value.trim() : '';
    const cod = (inputCod && inputCod.value.trim()) ? inputCod.value.trim() : ('INS-' + Math.floor(100 + Math.random() * 900));
    const qtd = parseFloat(inputQtd ? inputQtd.value : 1) || 1;
    const unid = inputUnid ? inputUnid.value : 'un';

    if (!nome) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Nome Obrigatório', 'Informe o nome do insumo a ser adicionado!', 'warning');
        } else {
            alert('Informe o nome do insumo a ser adicionado!');
        }
        return;
    }

    if (!Array.isArray(window.materiaisModalEdicao)) window.materiaisModalEdicao = [];

    window.materiaisModalEdicao.push({
        id: 'mat-' + Date.now(),
        nome: nome,
        codigo: cod,
        qtdEsperada: qtd,
        qtdConferida: qtd,
        unidade: unid,
        condicao: 'Em bom estado',
        status: 'OK',
        checked: true
    });

    // Salvar item avulso no catálogo do estoque (senaivest_materiais)
    const novoItemCatalogo = {
        cod: cod,
        nome: nome,
        tipo: 'Insumo',
        qtd: qtd,
        preco: 'R$ 0,00',
        almoxOrigem: 'Estoque Central',
        almoxAtual: 'Estoque Central',
        local: 'Prateleira Geral',
        horarioEntrada: (typeof window.getHoraMinutoLocal === 'function') ? window.getHoraMinutoLocal() : '12:00',
        responsavel: (currentUser && currentUser.nome) ? currentUser.nome : 'Professor'
    };
    
    if (Array.isArray(window.mockMateriais)) {
        if (!window.mockMateriais.some(m => (m.cod || m.codigo) === cod)) {
            window.mockMateriais.push(novoItemCatalogo);
            if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
            if (typeof window.populateNovoMatEstoqueSelect === 'function') window.populateNovoMatEstoqueSelect();
            if (typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
        }
    }

    if (inputNome) inputNome.value = '';
    if (inputCod) inputCod.value = '';
    if (inputQtd) inputQtd.value = '1';

    window.renderMateriaisModalTbody();
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Insumo Inserido & Cadastrado', `"${nome}" (${cod}) inserido na bancada e adicionado ao catálogo geral!`, 'success');
    }
};

// Renderizar tbody de materiais no modal de bancada
window.materiaisModalEdicao = [];

window.renderMateriaisModalTbody = function() {
    const tbody = document.getElementById('gerenciar-bancada-materiais-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!Array.isArray(window.materiaisModalEdicao) || window.materiaisModalEdicao.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding:16px;">Nenhum material adicionado a esta bancada ainda. Selecione um item acima.</td></tr>';
        return;
    }

    window.materiaisModalEdicao.forEach((m, idx) => {
        tbody.innerHTML += `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 10px; font-weight:600; color:var(--text-primary);">${m.nome}</td>
                <td style="padding:8px 10px;"><code style="background:var(--bg-body); padding:2px 6px; border-radius:4px; font-weight:700; color:var(--primary-color);">${m.codigo || m.cod}</code></td>
                <td style="padding:8px 10px; font-weight:700; color:var(--text-primary);">${m.qtdEsperada}</td>
                <td style="padding:8px 10px; color:var(--text-secondary);">${m.unidade || 'un'}</td>
                <td style="padding:8px 10px; text-align:right;">
                    <button type="button" onclick="window.removerMaterialModalEdicao(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Remover item">
                        <span class="material-icons-outlined" style="font-size:18px;">delete</span>
                    </button>
                </td>
            </tr>
        `;
    });
};

window.removerMaterialModalEdicao = function(idx) {
    if (Array.isArray(window.materiaisModalEdicao)) {
        window.materiaisModalEdicao.splice(idx, 1);
        window.renderMateriaisModalTbody();
    }
};

// Kits Rápidos para a Bancada
window.aplicarKitPresetModal = function(tipo) {
    if (!Array.isArray(window.materiaisModalEdicao)) window.materiaisModalEdicao = [];

    const presets = {
        reta: [
            { id: 'mat-r1', nome: 'Tesoura de Arremate Mundial', codigo: 'MAT-002', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-r2', nome: 'Linha 120 Poliéster', codigo: 'INS-101', qtdEsperada: 2, qtdConferida: 2, unidade: 'cones', status: 'OK', checked: true },
            { id: 'mat-r3', nome: 'Fita Métrica 150cm', codigo: 'MAT-005', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-r4', nome: 'Bobina de Metal Reta', codigo: 'MAT-008', qtdEsperada: 2, qtdConferida: 2, unidade: 'un', status: 'OK', checked: true }
        ],
        overlock: [
            { id: 'mat-o1', nome: 'Fio de Overlock 100% Poliéster', codigo: 'MAT-004', qtdEsperada: 3, qtdConferida: 3, unidade: 'cones', status: 'OK', checked: true },
            { id: 'mat-o2', nome: 'Pinça Curva de Enfiamento', codigo: 'FER-012', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-o3', nome: 'Tesoura de Arremate', codigo: 'MAT-002', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true }
        ],
        galoneira: [
            { id: 'mat-g1', nome: 'Pinça de Enfiamento', codigo: 'FER-012', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-g2', nome: 'Cones Fio Helanca Texturizado', codigo: 'INS-105', qtdEsperada: 3, qtdConferida: 3, unidade: 'cones', status: 'OK', checked: true },
            { id: 'mat-g3', nome: 'Tesoura de Arremate', codigo: 'MAT-002', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true }
        ],
        modelagem: [
            { id: 'mat-m1', nome: 'Tesoura Alfaiate Profissional 10"', codigo: 'MAT-002', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-m2', nome: 'Régua de Alfaiate Curva Francesa', codigo: 'MAT-006', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-m3', nome: 'Carretilha de Marcação', codigo: 'MAT-007', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-m4', nome: 'Giz de Alfaiate', codigo: 'MAT-010', qtdEsperada: 2, qtdConferida: 2, unidade: 'un', status: 'OK', checked: true },
            { id: 'mat-m5', nome: 'Fita Métrica 150cm', codigo: 'MAT-005', qtdEsperada: 1, qtdConferida: 1, unidade: 'un', status: 'OK', checked: true }
        ]
    };

    const itens = presets[tipo] || [];
    itens.forEach(it => {
        if (!window.materiaisModalEdicao.some(ex => ex.codigo === it.codigo)) {
            window.materiaisModalEdicao.push({ ...it });
        }
    });

    window.renderMateriaisModalTbody();
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Kit Aplicado', `Preset do kit "${tipo.toUpperCase()}" inserido na bancada!`, 'info');
    }
};

// Carregar alunos da turma selecionada como checkboxes
window.carregarAlunosTurmaModal = function(turmaNome, alunosSelecionados = []) {
    const container = document.getElementById('gerenciar-bancada-alunos-lista');
    if (!container) return;
    container.innerHTML = '';

    let alunos = [];
    if (Array.isArray(window.mockAlunosDiario)) {
        alunos = window.mockAlunosDiario.filter(a => {
            if (!turmaNome) return true;
            return (a.turma && a.turma.toLowerCase().includes(turmaNome.toLowerCase())) ||
                   (turmaNome.toLowerCase().includes(a.turma.toLowerCase()));
        });
    }

    if (alunos.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:12px; grid-column:1/-1;">Nenhum aluno cadastrado nesta turma ainda. Use o botão "+ Aluno Rápido" ao lado.</div>';
        return;
    }

    alunos.forEach(al => {
        const checked = alunosSelecionados.some(s => s.matricula === al.id || s.nome === al.nome) ? 'checked' : '';
        container.innerHTML += `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:white; border:1px solid var(--border-color); border-radius:6px; font-size:12.5px; cursor:pointer;">
                <input type="checkbox" name="bancada-aluno-check" value="${al.id}" data-nome="${al.nome}" ${checked}>
                <span><strong>${al.nome}</strong> <span style="font-size:11px; color:var(--text-secondary);">(${al.id})</span></span>
            </label>
        `;
    });
};

window.adicionarNovoAlunoRapidoModal = function() {
    const nome = prompt('Nome completo do aluno:');
    if (!nome) return;
    const turma = document.getElementById('gerenciar-bancada-turma').value;
    const matricula = 'ALU-' + Math.floor(100 + Math.random() * 900);

    if (!Array.isArray(window.mockAlunosDiario)) window.mockAlunosDiario = [];
    window.mockAlunosDiario.push({ id: matricula, nome: nome, turma: turma, presente: true });

    window.carregarAlunosTurmaModal(turma, [{ matricula: matricula, nome: nome }]);
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Aluno Adicionado', `${nome} (${matricula}) credenciado na turma!`, 'success');
    }
};

window.selecionarTipoMaquinaModal = function(val) {
    const custom = document.getElementById('gerenciar-bancada-tipo-custom');
    if (!custom) return;
    if (val === 'OUTRO') {
        custom.style.display = 'block';
        custom.required = true;
    } else {
        custom.style.display = 'none';
        custom.required = false;
    }
};

// Abrir Modal para Nova Bancada
window.abrirModalNovaBancadaProf = function() {
    const form = document.getElementById('form-gerenciar-bancada-prof');
    if (form) form.reset();
    document.getElementById('gerenciar-bancada-edit-orig-numero').value = '';
    document.getElementById('modal-gerenciar-bancada-titulo').innerText = 'Adicionar Nova Bancada à Turma';
    document.getElementById('modal-gerenciar-bancada-sub').innerText = 'Defina o equipamento, aloque os alunos e configure o kit de materiais.';

    // Sugerir próximo número de bancada
    const count = Array.isArray(window.bancadasCheckinMock) ? window.bancadasCheckinMock.length + 1 : 1;
    document.getElementById('gerenciar-bancada-numero').value = 'Bancada ' + String(count).padStart(2, '0');

    window.materiaisModalEdicao = [];
    window.renderMateriaisModalTbody();
    window.populateNovoMatEstoqueSelect();

    const turmaAtual = document.getElementById('prof-checkin-turma-select') ? document.getElementById('prof-checkin-turma-select').value : 'Vestuário e Estilismo - Manhã';
    const selTurmaModal = document.getElementById('gerenciar-bancada-turma');
    if (selTurmaModal) selTurmaModal.value = turmaAtual;

    window.carregarAlunosTurmaModal(turmaAtual, []);
    openModal('modal-gerenciar-bancada-prof');
};

// Abrir Modal para Editar Bancada Existente
window.abrirModalEditarBancadaProf = function(numeroBancada) {
    if (!Array.isArray(window.bancadasCheckinMock)) return;
    const b = window.bancadasCheckinMock.find(it => it.numero === numeroBancada);
    if (!b) return;

    document.getElementById('gerenciar-bancada-edit-orig-numero').value = b.numero;
    document.getElementById('gerenciar-bancada-numero').value = b.numero;
    document.getElementById('modal-gerenciar-bancada-titulo').innerText = `Configurar ${b.numero}`;
    document.getElementById('modal-gerenciar-bancada-sub').innerText = 'Ajuste os equipamentos, alunos compartilhados e materiais do inventário.';

    const selTurma = document.getElementById('gerenciar-bancada-turma');
    if (selTurma && b.turma) selTurma.value = b.turma;

    const selTipo = document.getElementById('gerenciar-bancada-tipo-select');
    if (selTipo) {
        let matched = false;
        Array.from(selTipo.options).forEach(opt => {
            if (opt.value === b.tipo) { selTipo.value = b.tipo; matched = true; }
        });
        if (!matched) {
            selTipo.value = 'OUTRO';
            const custom = document.getElementById('gerenciar-bancada-tipo-custom');
            if (custom) { custom.style.display = 'block'; custom.value = b.tipo; }
        }
    }

    const obsEl = document.getElementById('gerenciar-bancada-obs');
    if (obsEl) obsEl.value = b.observacao || '';

    // Reconstruir lista de materiais para edição
    window.materiaisModalEdicao = [];
    if (b.materiais) {
        const partes = b.materiais.split(', ');
        partes.forEach((pt, pIdx) => {
            const pTrim = pt.trim();
            if (!pTrim) return;
            let qtd = 1;
            let nome = pTrim;
            const matchQtd = pTrim.match(/^([0-9.]+)[x|m]?s+(.*)/i);
            if (matchQtd) {
                qtd = parseFloat(matchQtd[1]) || 1;
                nome = matchQtd[2];
            }
            window.materiaisModalEdicao.push({
                id: 'mat-edit-' + pIdx,
                nome: nome,
                codigo: 'MAT-' + String(pIdx + 1).padStart(3, '0'),
                qtdEsperada: qtd,
                qtdConferida: qtd,
                unidade: pTrim.includes('.0m') ? 'm' : 'un',
                status: 'OK',
                checked: true
            });
        });
    }

    window.renderMateriaisModalTbody();
    window.populateNovoMatEstoqueSelect();

    const alunosPre = [];
    if (b.alunoNome) {
        alunosPre.push({ matricula: b.alunoMatricula, nome: b.alunoNome });
    }
    window.carregarAlunosTurmaModal(b.turma, alunosPre);

    openModal('modal-gerenciar-bancada-prof');
};

// Salvar Bancada (Criar ou Atualizar)
window.salvarBancadaProf = function(e) {
    if (e) e.preventDefault();

    const origNumero = document.getElementById('gerenciar-bancada-edit-orig-numero').value;
    const numero = document.getElementById('gerenciar-bancada-numero').value.trim();
    const turma = document.getElementById('gerenciar-bancada-turma').value;
    const tipoSelect = document.getElementById('gerenciar-bancada-tipo-select').value;
    const tipoCustom = document.getElementById('gerenciar-bancada-tipo-custom').value.trim();
    const tipoFinal = tipoSelect === 'OUTRO' ? (tipoCustom || 'Equipamento Prático') : tipoSelect;
    const obs = document.getElementById('gerenciar-bancada-obs').value.trim() || 'Equipamento e insumos validados pelo professor.';

    // Coletar alunos marcados
    const checkedBoxes = Array.from(document.querySelectorAll('input[name="bancada-aluno-check"]:checked'));
    let alunoNome = 'Bancada Compartilhada';
    let alunoMatricula = 'DIV-00';
    if (checkedBoxes.length === 1) {
        alunoNome = checkedBoxes[0].getAttribute('data-nome');
        alunoMatricula = checkedBoxes[0].value;
    } else if (checkedBoxes.length > 1) {
        const nomes = checkedBoxes.map(c => c.getAttribute('data-nome').split(' ')[0]);
        alunoNome = nomes.join(' & ');
        alunoMatricula = checkedBoxes.map(c => c.value).join(', ');
    } else {
        alunoNome = 'Aguardando Alocação';
        alunoMatricula = 'PENDENTE';
    }

    // Coletar materiais em texto
    let matsTexto = (window.materiaisModalEdicao || []).map(m => `${m.qtdEsperada}x ${m.nome}`).join(', ');
    if (!matsTexto) matsTexto = 'Kit Básico de Costura & Insumos';

    if (!Array.isArray(window.bancadasCheckinMock)) window.bancadasCheckinMock = [];

    const existingIdx = origNumero ? window.bancadasCheckinMock.findIndex(b => b.numero === origNumero) : -1;
    const bancadaObj = {
        numero: numero,
        tipo: tipoFinal,
        turma: turma,
        alunoNome: alunoNome,
        alunoMatricula: alunoMatricula,
        status: checkedBoxes.length > 0 ? 'confirmado' : 'pendente',
        horario: checkedBoxes.length > 0 ? (typeof window.getHoraMinutoLocal === 'function' ? window.getHoraMinutoLocal() : '08:00') : '--:--',
        auditoria: 'ok',
        materiais: matsTexto,
        divergenciaTexto: '',
        observacao: obs
    };

    if (existingIdx >= 0) {
        window.bancadasCheckinMock[existingIdx] = bancadaObj;
    } else {
        window.bancadasCheckinMock.push(bancadaObj);
    }

    try {
        localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
    } catch(err) {}

    closeModal('modal-gerenciar-bancada-prof');
    if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Bancada Salva com Sucesso!', `${numero} configurada com ${(window.materiaisModalEdicao || []).length} materiais e alocada para ${alunoNome}.`, 'success');
    }
};

// Carregar bancadas persistidas se existirem
try {
    const salvosBancadas = localStorage.getItem('senaivest_bancadas_prof');
    if (salvosBancadas) {
        const parsed = JSON.parse(salvosBancadas);
        if (Array.isArray(parsed) && parsed.length > 0) {
            window.bancadasCheckinMock = parsed;
        }
    }
} catch(e) {}


// --- 2. SISTEMA DE RESERVAS & INDISPONIBILIDADE DE MATERIAIS NO PLANO DE AULA ---

// Verifica se um material está bloqueado/reservado por outra aula ativa ou pendente de devolução
window.verificarStatusReservaMaterial = function(cod, nome, planoIdAtual = null) {
    if (!window.planosAulasControle) window.planosAulasControle = [];
    
    // Todos os planos que NÃO foram devolvidos ao estoque
    const planosAtivos = window.planosAulasControle.filter(p => p.status !== 'devolvido');
    
    const codLower = (cod || '').toLowerCase().trim();
    const nomeLower = (nome || '').toLowerCase().trim();

    for (const p of planosAtivos) {
        if (planoIdAtual && p.id === planoIdAtual) continue;

        const matsTexto = (p.materiaisTexto || p.materiais || '').toLowerCase();
        const temCod = codLower && matsTexto.includes(codLower);
        const temNome = nomeLower && matsTexto.includes(nomeLower);

        if (temCod || temNome) {
            return {
                reservado: true,
                planoId: p.id,
                tema: p.tema || p.plano || 'Aula Prática',
                turma: p.turma || 'Turma Agendada',
                professor: p.professorNome || p.professor || 'Outro Docente',
                sala: p.salaUso || p.salaOrigem || p.sala || 'Sala Laboratório',
                horario: p.horarioLimite || p.horarioRetirada || p.horario || 'Em uso',
                status: p.status === 'atrasado' ? 'Atraso de Devolução' : (p.status === 'em_aula' ? 'Em Aula Prática' : 'Agendado')
            };
        }
    }
    return { reservado: false };
};

// --- 2. SISTEMA INTERATIVO DE CATÁLOGO & RESERVA DE MATERIAIS NO PLANO DE AULA ---
window.selectedMateriaisPlano = {};

window.populatePlanosMateriaisSelect = function(planoIdAtual = null) {
    const container = document.getElementById('p-mat-catalog-container');
    const selectSync = document.getElementById('p-mat');
    if (!container) return;

    container.innerHTML = '';
    if (selectSync) selectSync.innerHTML = '';

    let mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    if (mats.length === 0) {
        try {
            const s = localStorage.getItem('senaivest_materiais');
            if (s) mats = JSON.parse(s);
        } catch(e) {}
    }
    window.mockMateriais = mats;

    const salaEscolhida = document.getElementById('p-local') ? document.getElementById('p-local').value : '';

    mats.forEach(m => {
        const cod = m.cod || m.codigo || '';
        const nome = m.nome || '';
        const qtdDisponivel = m.qtd !== undefined ? m.qtd : 0;
        const localSala = m.almoxAtual || m.salaOrigem || m.local || 'Sala Geral';
        const tipo = m.tipo || 'Insumo';

        const reserva = (typeof window.verificarStatusReservaMaterial === 'function')
            ? window.verificarStatusReservaMaterial(cod, nome, planoIdAtual)
            : { reservado: false };

        const isIndisponivel = reserva.reservado;
        const isSelected = !!window.selectedMateriaisPlano[cod];
        const qtdEscolhida = isSelected ? (window.selectedMateriaisPlano[cod].qtd || 1) : 1;

        // Se a sala do material for diferente da sala da aula, precisa de transferência
        const needsTransfer = salaEscolhida && localSala && (localSala !== salaEscolhida);

        const card = document.createElement('div');
        card.className = `plano-mat-item ${isIndisponivel ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`;
        card.setAttribute('data-cod', cod);
        card.setAttribute('data-nome', nome.toLowerCase());
        card.setAttribute('data-sala', localSala.toLowerCase());
        card.setAttribute('data-disponivel', isIndisponivel ? 'false' : 'true');

        if (isIndisponivel) {
            card.innerHTML = `
                <div class="plano-mat-item-info">
                    <div class="plano-mat-name-row">
                        <span class="plano-mat-sku">${cod}</span>
                        <span class="plano-mat-name">${nome}</span>
                        <span class="plano-mat-type">(${tipo})</span>
                    </div>
                    <div class="plano-mat-status-tag indisponivel">
                        <span class="material-icons-outlined" style="font-size:14px;">block</span>
                        INDISPONÍVEL: em uso por ${reserva.professor} na ${reserva.sala}
                    </div>
                </div>
                <div style="font-size:11px; font-weight:700; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:6px; white-space:nowrap;">
                    Bloqueado
                </div>
            `;
        } else {
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <input type="checkbox" id="chk-mat-${cod}" ${isSelected ? 'checked' : ''} onchange="toggleSelecaoMaterialPlano('${cod}', this.checked)" style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary-color);">
                    <div class="plano-mat-item-info">
                        <div class="plano-mat-name-row">
                            <span class="plano-mat-sku">${cod}</span>
                            <span class="plano-mat-name" style="cursor:pointer;" onclick="const c = document.getElementById('chk-mat-${cod}'); c.checked = !c.checked; toggleSelecaoMaterialPlano('${cod}', c.checked);">${nome}</span>
                            <span class="plano-mat-type">(${tipo})</span>
                        </div>
                        <div class="plano-mat-status-tag disponivel">
                            <span class="material-icons-outlined" style="font-size:14px;">check_circle</span>
                            DISPONÍVEL: <strong>${qtdDisponivel} un.</strong> &nbsp;|&nbsp; Local: ${localSala}
                        </div>
                        ${needsTransfer ? `
                            <div class="plano-mat-status-tag transf">
                                <span class="material-icons-outlined" style="font-size:13px;">swap_horiz</span>
                                Necessita Transferência de <strong>${localSala}</strong> para <strong>${salaEscolhida}</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="plano-mat-qty-wrap" id="qty-wrap-${cod}" style="${isSelected ? 'display:flex;' : 'display:none;'}">
                    <span style="font-size:11px; font-weight:700; color:#475569;">Qtd p/ aula:</span>
                    <button type="button" onclick="alterarQtdMaterialPlano('${cod}', -1)">-</button>
                    <input type="number" id="mat-qty-${cod}" min="1" max="${qtdDisponivel}" value="${qtdEscolhida}" oninput="atualizarQtdMaterialPlano('${cod}', this.value)" class="plano-mat-qty-input">
                    <button type="button" onclick="alterarQtdMaterialPlano('${cod}', 1)">+</button>
                    <span style="font-size:11px; font-weight:600; color:#64748b;">un.</span>
                </div>
            `;
        }

        container.appendChild(card);
    });

    sincronizarResumoMateriaisPlano();
};

window.toggleSelecaoMaterialPlano = function(cod, isChecked) {
    const mat = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    if (!mat) return;

    const qtyWrap = document.getElementById('qty-wrap-' + cod);
    const itemEl = document.querySelector(`.plano-mat-item[data-cod="${cod}"]`);

    if (isChecked) {
        const inputQty = document.getElementById('mat-qty-' + cod);
        const qtdVal = parseInt(inputQty ? inputQty.value : 1) || 1;
        window.selectedMateriaisPlano[cod] = {
            cod: cod,
            nome: mat.nome,
            qtd: Math.min(qtdVal, mat.qtd || 1),
            qtdDisponivel: mat.qtd || 0,
            sala: mat.almoxAtual || 'Sala Geral',
            tipo: mat.tipo || 'Insumo'
        };
        if (qtyWrap) qtyWrap.style.display = 'flex';
        if (itemEl) itemEl.classList.add('selected');
    } else {
        delete window.selectedMateriaisPlano[cod];
        if (qtyWrap) qtyWrap.style.display = 'none';
        if (itemEl) itemEl.classList.remove('selected');
    }

    sincronizarResumoMateriaisPlano();
};

window.alterarQtdMaterialPlano = function(cod, delta) {
    const mat = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    if (!mat) return;
    const input = document.getElementById('mat-qty-' + cod);
    if (!input) return;

    let cur = parseInt(input.value) || 1;
    let next = cur + delta;
    if (next < 1) next = 1;
    if (next > mat.qtd) next = mat.qtd;

    input.value = next;
    if (window.selectedMateriaisPlano[cod]) {
        window.selectedMateriaisPlano[cod].qtd = next;
    }
    sincronizarResumoMateriaisPlano();
};

window.atualizarQtdMaterialPlano = function(cod, valStr) {
    const mat = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    if (!mat) return;
    let num = parseInt(valStr) || 1;
    if (num < 1) num = 1;
    if (num > mat.qtd) num = mat.qtd;

    const input = document.getElementById('mat-qty-' + cod);
    if (input) input.value = num;

    if (window.selectedMateriaisPlano[cod]) {
        window.selectedMateriaisPlano[cod].qtd = num;
    }
    sincronizarResumoMateriaisPlano();
};

window.removerMaterialPlanoSelecionado = function(cod) {
    const chk = document.getElementById('chk-mat-' + cod);
    if (chk) chk.checked = false;
    window.toggleSelecaoMaterialPlano(cod, false);
};

window.sincronizarResumoMateriaisPlano = function() {
    const resumoBox = document.getElementById('p-mat-resumo-box');
    const resumoChips = document.getElementById('p-mat-resumo-chips');
    const badgeCount = document.getElementById('p-mat-selected-count');
    const selectSync = document.getElementById('p-mat');

    const chaves = Object.keys(window.selectedMateriaisPlano);

    if (badgeCount) {
        badgeCount.innerText = `${chaves.length} item(ns) selecionado(s)`;
    }

    if (selectSync) {
        selectSync.innerHTML = '';
        chaves.forEach(cod => {
            const item = window.selectedMateriaisPlano[cod];
            const opt = document.createElement('option');
            opt.value = cod;
            opt.selected = true;
            opt.setAttribute('data-sala', item.sala || '');
            opt.setAttribute('data-qtd-reservada', item.qtd);
            opt.text = `${item.nome} (${item.qtd} un.)`;
            selectSync.appendChild(opt);
        });
    }

    if (resumoBox && resumoChips) {
        if (chaves.length === 0) {
            resumoBox.style.display = 'none';
            resumoChips.innerHTML = '';
        } else {
            resumoBox.style.display = 'block';
            resumoChips.innerHTML = '';
            chaves.forEach(cod => {
                const item = window.selectedMateriaisPlano[cod];
                resumoChips.innerHTML += `
                    <div class="plano-mat-chip">
                        <span><strong>${item.nome}</strong>: ${item.qtd} un.</span>
                        <span class="plano-mat-chip-remove" onclick="removerMaterialPlanoSelecionado('${cod}')" title="Remover item">&times;</span>
                    </div>
                `;
            });
        }
    }
};

window.filtrarCatalogoPlanosMateriais = function(query = '') {
    const q = (query || document.getElementById('p-mat-search')?.value || '').toLowerCase().trim();
    const tipoFiltro = document.getElementById('p-mat-filtro-tipo')?.value || 'todos';
    const salaEscolhida = (document.getElementById('p-local')?.value || '').toLowerCase().trim();

    const items = document.querySelectorAll('#p-mat-catalog-container .plano-mat-item');
    items.forEach(el => {
        const nome = el.getAttribute('data-nome') || '';
        const cod = (el.getAttribute('data-cod') || '').toLowerCase();
        const sala = el.getAttribute('data-sala') || '';
        const isDisp = el.getAttribute('data-disponivel') === 'true';

        let matchesSearch = !q || nome.includes(q) || cod.includes(q) || sala.includes(q);
        let matchesFilter = true;

        if (tipoFiltro === 'disponiveis') {
            matchesFilter = isDisp;
        } else if (tipoFiltro === 'sala') {
            matchesFilter = salaEscolhida && sala.includes(salaEscolhida);
        }

        if (matchesSearch && matchesFilter) {
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });
};

// ==============================================================
// 3. PAINEL DO PROFESSOR: AÇÕES RÁPIDAS & CONSULTA DE ESTOQUE
// ==============================================================
window.salaEstoqueRapidoFiltro = 'todos';

window.renderProfDashboard = function() {
    renderProfStockWidget();
    renderProfAulasHoje();
};

window.renderProfStockWidget = function() {
    const tabsContainer = document.getElementById('prof-stock-rooms-tabs');
    const itemsContainer = document.getElementById('prof-stock-items-container');
    if (!tabsContainer || !itemsContainer) return;

    const salas = mockSalas || [
        { nome: 'Sala 01 - Modelagem' },
        { nome: 'Sala 02 - Costura' },
        { nome: 'Estoque Central' }
    ];

    tabsContainer.innerHTML = `
        <button type="button" class="prof-stock-tab ${window.salaEstoqueRapidoFiltro === 'todos' ? 'active' : ''}" onclick="setSalaEstoqueRapido('todos', this)">
            Todos os Almoxarifados
        </button>
    `;
    salas.forEach(s => {
        const isActive = window.salaEstoqueRapidoFiltro === s.nome;
        tabsContainer.innerHTML += `
            <button type="button" class="prof-stock-tab ${isActive ? 'active' : ''}" onclick="setSalaEstoqueRapido('${s.nome}', this)">
                ${s.nome}
            </button>
        `;
    });

    filtrarEstoqueRapidoProfessor();
};

window.setSalaEstoqueRapido = function(salaNome, btn) {
    window.salaEstoqueRapidoFiltro = salaNome;
    const tabsContainer = document.getElementById('prof-stock-rooms-tabs');
    if (tabsContainer) {
        tabsContainer.querySelectorAll('.prof-stock-tab').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    filtrarEstoqueRapidoProfessor();
};

window.filtrarEstoqueRapidoProfessor = function(query = '') {
    const container = document.getElementById('prof-stock-items-container');
    if (!container) return;

    const q = (query || document.getElementById('prof-stock-search-input')?.value || '').toLowerCase().trim();
    const salaFiltro = window.salaEstoqueRapidoFiltro;

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    let filtrados = mats.filter(m => {
        const matchesSala = (salaFiltro === 'todos') || ((m.almoxAtual || m.salaOrigem || '') === salaFiltro);
        const matchesQuery = !q || (m.nome || '').toLowerCase().includes(q) || (m.cod || '').toLowerCase().includes(q) || (m.local || '').toLowerCase().includes(q);
        return matchesSala && matchesQuery;
    });

    if (filtrados.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary); font-size: 13px;">Nenhum material encontrado com os filtros atuais.</div>`;
        return;
    }

    container.innerHTML = '';
    filtrados.forEach(m => {
        const isBorrowed = m.almoxOrigem && m.almoxAtual && (m.almoxOrigem !== m.almoxAtual);
        const cod = m.cod || m.codigo || '';
        container.innerHTML += `
            <div class="prof-stock-mini-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div>
                        <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">${cod} &bull; ${m.tipo || 'Insumo'}</div>
                        <h4 style="margin:2px 0 0; font-size:14px; font-weight:800; color:#0b2341;">${m.nome}</h4>
                    </div>
                    <span style="font-size:14px; font-weight:800; background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; white-space:nowrap;">
                        ${m.qtd} un.
                    </span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between; align-items:center;">
                    <span><span class="material-icons-outlined" style="font-size:13px; vertical-align:middle;">meeting_room</span> ${m.almoxAtual}</span>
                    <span style="font-weight:600; color:#475569;">${m.local || 'Prateleira'}</span>
                </div>
                ${isBorrowed ? `
                    <div style="font-size:11px; color:#c2410c; background:#fff7ed; padding:3px 8px; border-radius:4px; display:flex; align-items:center; gap:4px;">
                        <span class="material-icons-outlined" style="font-size:12px;">info</span> Emprestado de ${m.almoxOrigem}
                    </div>
                ` : ''}
                <div style="display:flex; gap:6px; margin-top:4px;">
                    <button type="button" class="secondary-btn" onclick="abrirSala('${m.almoxAtual}')" style="flex:1; font-size:11.5px; padding:6px; justify-content:center;">
                        Ver na Sala ➔
                    </button>
                    <button type="button" class="primary-btn" onclick="openTransferirModal('${cod}')" style="font-size:11.5px; padding:6px 10px; justify-content:center;">
                        Transferir
                    </button>
                </div>
            </div>
        `;
    });
};

window.renderProfAulasHoje = function() {
    const container = document.getElementById('prof-aulas-hoje-container');
    if (!container) return;

    let planos = Array.isArray(window.mockPlanos) ? window.mockPlanos : [];
    try {
        const salvos = localStorage.getItem('senaivest_planos_aula');
        if (salvos) planos = JSON.parse(salvos);
    } catch(e) {}

    const profNome = (currentUser && currentUser.nome) ? currentUser.nome.toLowerCase() : '';
    const profId = (currentUser && currentUser.id) ? currentUser.id.toLowerCase() : '';

    let minhasAulas = planos.filter(p => {
        if (!p.professor && !p.professorId) return true;
        const pNome = (p.professor || '').toLowerCase();
        const pId = (p.professorId || '').toLowerCase();
        return pNome.includes(profNome) || pId.includes(profId) || profNome.includes('azevedo') || profNome.includes('giovani');
    });

    if (minhasAulas.length === 0) {
        minhasAulas = planos.slice(0, 3);
    }

    if (minhasAulas.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:var(--text-secondary); font-size:13px;">
                <span class="material-icons-outlined" style="font-size:36px; color:#cbd5e1; display:block; margin-bottom:8px;">event_busy</span>
                Nenhuma aula agendada para hoje. Clique no botão <strong>+ Novo Plano de Aula</strong> acima para cadastrar.
            </div>
        `;
        return;
    }

    container.innerHTML = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;"></div>';
    const grid = container.firstElementChild;

    minhasAulas.forEach(p => {
        const pId = p.id || 'PLAN-001';
        const tema = p.plano || p.tema || 'Aula Prática';
        const sala = p.sala || p.local || 'Sala 01 - Modelagem';
        const horario = p.horario || `${p.inicio || '08:00'} às ${p.termino || '10:00'}`;
        const mats = p.materiais || 'Nenhum material reservado';
        const turma = p.turma || 'Turma Regular';

        grid.innerHTML += `
            <div style="background:#ffffff; border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; gap:10px; box-shadow:var(--shadow-sm);">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                        <span style="font-size:11px; font-weight:700; color:var(--primary-color); background:rgba(67, 97, 238, 0.08); padding:2px 8px; border-radius:6px;">${pId}</span>
                        <span style="font-size:11.5px; font-weight:700; color:#10b981; display:flex; align-items:center; gap:3px;">
                            <span class="material-icons-outlined" style="font-size:13px;">schedule</span> ${horario}
                        </span>
                    </div>
                    <h4 style="margin:0 0 4px 0; font-size:15px; font-weight:800; color:#0b2341;">${tema}</h4>
                    <div style="font-size:12px; color:var(--text-secondary); margin-bottom:6px;">
                        <strong>Local:</strong> ${sala} &bull; <strong>Turma:</strong> ${turma}
                    </div>
                    <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:8px 10px; font-size:11.5px; color:#334155;">
                        <strong style="color:#0b2341;"><span class="material-icons-outlined" style="font-size:13px; vertical-align:middle;">inventory_2</span> Insumos Reservados:</strong><br>
                        ${mats}
                    </div>
                </div>

                <div style="display:flex; gap:8px; margin-top:4px;">
                    <button type="button" class="primary-btn" onclick="if(typeof abrirModalDevolucaoFoto === 'function') abrirModalDevolucaoFoto('${pId}'); else alert('Devolução registrada com sucesso!');" style="flex:1; font-size:12px; padding:8px 12px; justify-content:center;">
                        <span class="material-icons-outlined" style="font-size:15px;">assignment_returned</span> Devolver ao Estoque
                    </button>
                    <button type="button" class="secondary-btn" onclick="nav('view-planos')" style="font-size:12px; padding:8px 12px; justify-content:center;">
                        Detalhes
                    </button>
                </div>
            </div>
        `;
    });
};

// --- 3. EXPORTAÇÃO OFICIAL DO DIÁRIO DE CLASSE (PDF / IMPRESSÃO) ---
window.exportarDiarioClassePresenca = function() {
    const turmaSelect = document.getElementById('diario-turma-select');
    const planoSelect = document.getElementById('diario-plano-select');
    const turmaNome = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo - Manhã';
    const planoNome = planoSelect && planoSelect.selectedOptions && planoSelect.selectedOptions[0] && planoSelect.selectedOptions[0].value 
        ? planoSelect.selectedOptions[0].text 
        : 'Plano de Aula Regular';

    const alunos = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tT = turmaNome.toLowerCase();
        return aT.includes(tT) || tT.includes(aT) || 
               (tT.includes('manhã') && aT.includes('manhã')) ||
               (tT.includes('tarde') && aT.includes('tarde')) ||
               (tT.includes('noite') && aT.includes('noite'));
    });

    if (alunos.length === 0) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Diário Vazio', 'Nenhum discente credenciado nesta turma para exportação.', 'warning');
        } else {
            alert('Nenhum aluno cadastrado nesta turma para exportação.');
        }
        return;
    }

    const total = alunos.length;
    const presentes = alunos.filter(a => a.presente).length;
    const ausentes = total - presentes;
    const taxaPresenca = total > 0 ? Math.round((presentes / total) * 100) : 0;

    const dataHoje = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : new Date().toLocaleDateString('pt-BR');
    const horaAgora = (typeof window.getHoraMinutoLocal === 'function') ? window.getHoraMinutoLocal() : '12:00';
    const profNome = (currentUser && currentUser.nome && !currentUser.nome.startsWith('Usuário ')) ? currentUser.nome : 'Prof. Giovani Azevedo';

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Pop-up Bloqueado', 'Autorize pop-ups no seu navegador para imprimir ou salvar o Diário em PDF.', 'warning');
        } else {
            alert('Por favor, autorize a abertura de pop-ups para gerar a ficha de presença.');
        }
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Diário de Classe & Frequência - SENAI</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 28px; color: #0f172a; background: #fff; margin:0; }
                .header { border-bottom: 3px solid #00569d; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
                .logo-title h1 { margin:0; font-size: 20px; color: #00569d; font-weight: 800; letter-spacing: 0.5px; }
                .logo-title p { margin: 3px 0 0; font-size: 12.5px; color: #64748b; }
                .badges { display: flex; gap: 12px; margin-bottom: 18px; }
                .badge-card { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
                .badge-card .num { font-size: 20px; font-weight: 800; }
                .badge-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; background: #f1f5f9; padding: 12px 18px; border-radius: 8px; margin-bottom: 18px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12.5px; }
                th { background: #00569d; color: white; text-align: left; padding: 9px 12px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; }
                td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) { background: #f8fafc; }
                .status-tag { display: inline-block; padding: 3px 9px; border-radius: 12px; font-weight: 700; font-size: 11px; }
                .status-presente { background: #dcfce7; color: #15803d; }
                .status-ausente { background: #fee2e2; color: #b91c1c; }
                .signatures { margin-top: 45px; display: flex; justify-content: space-between; gap: 40px; page-break-inside: avoid; }
                .sig-box { flex: 1; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 12px; color: #334155; }
                .print-bar { background: #0b2341; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 8px; margin-bottom: 20px; }
                .print-btn { background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; }
                @media print {
                    .print-bar { display: none !important; }
                    body { padding: 12px; }
                }
            </style>
        </head>
        <body>
            <div class="print-bar">
                <span>📄 Documento Oficial de Frequência & Check-in Pedagógico (SENAI)</span>
                <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
            </div>
            <div class="header">
                <div class="logo-title">
                    <h1>SENAI &bull; CENTRO DE FORMAÇÃO PROFISSIONAL CÂNDIDO ATHAYDE</h1>
                    <p>Senaivest 2.0 &bull; Registro e Homologação de Frequência de Aulas Práticas</p>
                </div>
                <div style="text-align: right; font-size: 12px; color: #64748b; line-height: 1.5;">
                    Data de Emissão: <strong>${dataHoje} às ${horaAgora}</strong><br>
                    Protocolo: <strong>SENAI-FREQ-${Date.now().toString().slice(-6)}</strong>
                </div>
            </div>

            <div class="info-grid">
                <div><strong>Turma:</strong> ${turmaNome}</div>
                <div><strong>Docente Responsável:</strong> ${profNome}</div>
                <div><strong>Plano Vinculado:</strong> ${planoNome}</div>
                <div><strong>Data de Execução:</strong> ${dataHoje}</div>
            </div>

            <div class="badges">
                <div class="badge-card">
                    <div class="num" style="color:#00569d;">${total}</div>
                    <div class="label">Total de Discentes</div>
                </div>
                <div class="badge-card">
                    <div class="num" style="color:#15803d;">${presentes} (${taxaPresenca}%)</div>
                    <div class="label">Presentes no Check-in</div>
                </div>
                <div class="badge-card">
                    <div class="num" style="color:#b91c1c;">${ausentes} (${100 - taxaPresenca}%)</div>
                    <div class="label">Ausências</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">Nº</th>
                        <th style="width: 140px;">Matrícula</th>
                        <th>Nome Completo do Aluno</th>
                        <th style="width: 130px; text-align: center;">Frequência</th>
                        <th style="width: 200px;">Validação Digital</th>
                    </tr>
                </thead>
                <tbody>
                    ${alunos.map((a, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong style="font-family:monospace;">${a.id}</strong></td>
                            <td>${a.nome}</td>
                            <td style="text-align: center;">
                                <span class="status-tag ${a.presente ? 'status-presente' : 'status-ausente'}">
                                    ${a.presente ? '✔ PRESENTE' : '✖ AUSENTE'}
                                </span>
                            </td>
                            <td style="border-bottom: 1px dotted #cbd5e1; font-size: 11px; color: #64748b;">
                                ${a.presente ? 'Check-in de Bancada Validado' : 'Falta Registrada'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="signatures">
                <div class="sig-box">
                    <strong>${profNome}</strong><br>
                    Professor(a) de Vestuário e Estilismo
                </div>
                <div class="sig-box">
                    <strong>Coordenação Pedagógica SENAI</strong><br>
                    Visto e Registro Institucional
                </div>
            </div>
        </body>
        </html>
    `);
    printWin.document.close();
};

// --- 4. CADASTRO DE TURMAS COM IMPORTAÇÃO EM LOTE (PLANILHA / CSV) ---
window.alunosImportadosTemp = [];

window.abrirModalRegistrarTurma = function() {
    window.alunosImportadosTemp = [];
    const form = document.getElementById('form-registrar-turma');
    if (form) form.reset();
    const tabela = document.getElementById('turma-preview-tbody');
    if (tabela) tabela.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:16px;">Nenhum aluno carregado ainda. Faça upload ou cole a lista acima.</td></tr>';
    const countEl = document.getElementById('turma-preview-count');
    if (countEl) countEl.innerText = '0 Alunos';
    const previewContainer = document.getElementById('turma-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    if (typeof openModal === 'function') openModal('modal-registrar-turma');
};

window.baixarModeloPlanilhaTurma = function() {
    const csvContent = "data:text/csv;charset=utf-8," + 
        "Nome Completo,Matricula\n" + 
        "Ana Clara Oliveira,ALU-101\n" + 
        "Bruno Santos Ferreira,ALU-102\n" + 
        "Carla Mendes Lima,ALU-103\n" + 
        "Daniel Souza Rocha,ALU-104\n" + 
        "Eduarda Costa Silva,ALU-105\n";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_alunos_turma_senai.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Download Concluído', 'Modelo de planilha CSV baixado com sucesso!', 'info');
    }
};

window.processarArquivoTurma = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        window.parsearLinhasAlunos(text);
    };
    reader.readAsText(file, 'UTF-8');
};

window.processarTextoManualAlunos = function() {
    const textarea = document.getElementById('turma-alunos-texto');
    if (!textarea || !textarea.value.trim()) return;
    window.parsearLinhasAlunos(textarea.value);
};

window.parsearLinhasAlunos = function(texto) {
    const linhas = texto.split(/\r?\n/);
    window.alunosImportadosTemp = [];

    linhas.forEach((linha, idx) => {
        const limpa = linha.trim();
        if (!limpa) return;
        
        if (idx === 0 && (limpa.toLowerCase().includes('nome') || limpa.toLowerCase().includes('aluno'))) return;

        let partes = [];
        if (limpa.includes(';')) partes = limpa.split(';');
        else if (limpa.includes(',')) partes = limpa.split(',');
        else if (limpa.includes('\t')) partes = limpa.split('\t');
        else partes = [limpa];

        const nome = (partes[0] || '').trim();
        let matricula = (partes[1] || '').trim();

        if (nome) {
            if (!matricula) {
                matricula = 'ALU-' + Math.floor(100 + Math.random() * 900);
            }
            window.alunosImportadosTemp.push({ nome: nome, matricula: matricula });
        }
    });

    window.renderizarPreviewAlunosTurma();
};

window.renderizarPreviewAlunosTurma = function() {
    const container = document.getElementById('turma-preview-container');
    const tbody = document.getElementById('turma-preview-tbody');
    const countEl = document.getElementById('turma-preview-count');
    if (!container || !tbody) return;

    tbody.innerHTML = '';
    countEl.innerText = `${window.alunosImportadosTemp.length} Alunos Identificados`;

    if (window.alunosImportadosTemp.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    window.alunosImportadosTemp.forEach((al, idx) => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:700; color:var(--text-secondary);">${idx + 1}</td>
                <td><strong>${al.nome}</strong></td>
                <td><code style="background:var(--bg-body); padding:2px 6px; border-radius:4px; font-weight:700; color:var(--primary-color);">${al.matricula}</code></td>
                <td><span style="color:#10b981; font-weight:700; font-size:11px;">● Válido</span></td>
            </tr>
        `;
    });

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Alunos Carregados', `${window.alunosImportadosTemp.length} alunos identificados na planilha!`, 'success');
    }
};

window.salvarNovaTurmaComPlanilha = function(event) {
    if (event) event.preventDefault();

    const nomeTurmaInput = document.getElementById('turma-novo-nome');
    const turnoSelect = document.getElementById('turma-novo-turno');
    const salaSelect = document.getElementById('turma-novo-lab');

    const nomeBase = nomeTurmaInput ? nomeTurmaInput.value.trim() : '';
    if (!nomeBase) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Nome Obrigatório', 'Por favor, digite o nome da turma.', 'warning');
        } else {
            alert('Digite o nome da turma.');
        }
        return;
    }

    const turno = turnoSelect ? turnoSelect.value : 'Manhã';
    const sala = salaSelect ? salaSelect.value : 'Sala 01 - Modelagem';
    const nomeTurma = `${nomeBase} - ${turno}`;

    // 1. Salvar lista de turmas no localStorage
    let turmas = [];
    try {
        const salvas = localStorage.getItem('senaivest_turmas');
        if (salvas) turmas = JSON.parse(salvas);
    } catch(e) {}
    if (!turmas.includes(nomeTurma)) {
        turmas.push(nomeTurma);
        localStorage.setItem('senaivest_turmas', JSON.stringify(turmas));
    }

    // 2. Cadastrar cada aluno da planilha no mockAlunosDiario e no senaivest_users
    let users = {};
    try {
        users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
    } catch(e) {}

    window.alunosImportadosTemp.forEach(al => {
        if (Array.isArray(window.mockAlunosDiario)) {
            const exIdx = window.mockAlunosDiario.findIndex(a => a.id === al.matricula);
            if (exIdx >= 0) {
                window.mockAlunosDiario[exIdx].turma = nomeTurma;
                window.mockAlunosDiario[exIdx].nome = al.nome;
            } else {
                window.mockAlunosDiario.push({
                    id: al.matricula,
                    nome: al.nome,
                    turma: nomeTurma,
                    presente: true
                });
            }
        }

        // Criar login oficial do aluno
        users[al.matricula] = {
            id: al.matricula,
            matricula: al.matricula,
            nome: al.nome,
            role: 'Aluno',
            turma: nomeTurma,
            senha: al.matricula,
            escola: 'SENAI Centro de Formação Cândido Atahyde',
            criadoEm: new Date().toISOString()
        };
    });

    try {
        localStorage.setItem('senaivest_users', JSON.stringify(users));
    } catch(e) {}

    // 3. Atualizar selects de turmas no sistema
    ['p-turma', 'diario-turma-select', 'gerenciar-bancada-turma', 'prof-checkin-turma-select'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            const existe = Array.from(sel.options).some(o => o.value === nomeTurma);
            if (!existe) {
                const opt = document.createElement('option');
                opt.value = nomeTurma;
                opt.textContent = nomeTurma;
                sel.appendChild(opt);
            }
            sel.value = nomeTurma;
        }
    });

    closeModal('modal-registrar-turma');
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Turma Registrada com Sucesso!', `Turma "${nomeTurma}" cadastrada com ${window.alunosImportadosTemp.length} alunos credenciados!`, 'success');
    }
    if (typeof renderDiarioAlunos === 'function') renderDiarioAlunos();
};

// --- 5. CHAT INSTITUCIONAL E SINCRONIZAÇÃO BIDIRECIONAL ---
window.atualizarNotificacoesChat = function() {
    const badgeTopo = document.getElementById('chat-unread-badge');
    if (!badgeTopo) return;

    let totalNaoLidas = 0;
    const isCoord = currentUser && (typeof isEntidadeCoordenacao === 'function' ? (isEntidadeCoordenacao(currentUser.role) || isEntidadeCoordenacao(currentUser.nome)) : (currentUser.role === 'Coordenação'));

    if (typeof chatMensagens !== 'undefined' && Array.isArray(chatMensagens)) {
        chatMensagens.forEach(m => {
            if (!m.lida) {
                if (isCoord) {
                    const destCoord = typeof isEntidadeCoordenacao === 'function' ? (isEntidadeCoordenacao(m.destinatarioRole) || isEntidadeCoordenacao(m.destinatario)) : (m.destinatarioRole === 'Coordenação' || (m.destinatario && m.destinatario.includes('Coordenação')));
                    if (destCoord) {
                        totalNaoLidas++;
                    }
                } else {
                    const souDest = (currentUser && m.destinatarioId === currentUser.id) ||
                                    (currentUser && typeof matchDocente === 'function' ? matchDocente(m.destinatarioId, m.destinatario, currentUser.id, currentUser.nome) : (m.destinatario === (currentUser && currentUser.nome)));
                    if (souDest) {
                        totalNaoLidas++;
                    }
                }
            }
        });
    }

    if (totalNaoLidas > 0) {
        badgeTopo.style.display = 'inline-flex';
        badgeTopo.innerText = totalNaoLidas;
    } else {
        badgeTopo.style.display = 'none';
    }
};

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'senaivest_chat_mensagens') {
            try {
                if (typeof chatMensagens !== 'undefined') {
                    chatMensagens = JSON.parse(e.newValue || '[]');
                }
                if (typeof atualizarNotificacoesChat === 'function') atualizarNotificacoesChat();
                const modal = document.getElementById('institutional-chat-modal');
                if (modal && modal.classList.contains('active') && typeof renderizarMensagensChat === 'function') {
                    renderizarMensagensChat();
                }
            } catch(err) {}
        }
    });
}

// =========================================================================
// SUB-BANCO DE DADOS GOOGLE DRIVE & EXPORTAÇÃO OFICIAL DE PLANOS DE AULA
// =========================================================================
window.ultimoPlanoDocumentoSalvo = null;

window.baixarUltimoPlanoDocumento = function() {
    if (!window.ultimoPlanoDocumentoSalvo || !window.ultimoPlanoDocumentoSalvo.documento) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Aviso', 'Nenhum plano recente salvo para download imediato.', 'warning');
        } else {
            alert('Nenhum documento disponível para download.');
        }
        return;
    }
    const { nomeArquivo, documento } = window.ultimoPlanoDocumentoSalvo;
    const blob = new Blob([JSON.stringify(documento, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Download Concluído', `Arquivo ${nomeArquivo} salvo no seu computador.`, 'success');
    }
};

window.imprimirUltimoPlanoDocumento = function() {
    if (!window.ultimoPlanoDocumentoSalvo || !window.ultimoPlanoDocumentoSalvo.documento) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Aviso', 'Nenhum plano recente disponível para impressão.', 'warning');
        } else {
            alert('Nenhum documento disponível para impressão.');
        }
        return;
    }
    const doc = window.ultimoPlanoDocumentoSalvo.documento;
    const printWin = window.open('', '_blank', 'width=850,height=700');
    if (!printWin) {
        alert('Por favor, autorize pop-ups para imprimir a ficha.');
        return;
    }
    printWin.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Plano de Aula Oficial - ${doc.codigoPlano}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
                .header { border-bottom: 2px solid #0056b3; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
                .header h1 { margin: 0; font-size: 20px; color: #0056b3; }
                .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 13px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                .field { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
                .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
                .val { font-size: 14px; font-weight: 600; color: #0f172a; }
                .box { background: #f1f5f9; border-left: 4px solid #0056b3; padding: 14px; border-radius: 4px; margin-bottom: 20px; }
                .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>SENAI VEST - FICHA OFICIAL DE PLANO DE AULA</h1>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">Documento de Registro & Redundância Operacional</div>
                </div>
                <div class="badge">${doc.codigoPlano}</div>
            </div>
            <div class="grid">
                <div class="field"><div class="label">Professor Responsável</div><div class="val">${doc.professor.nome}</div></div>
                <div class="field"><div class="label">Turma Vinculada</div><div class="val">${doc.turmaVinculada}</div></div>
                <div class="field"><div class="label">Data da Prática</div><div class="val">${doc.agendamento.data}</div></div>
                <div class="field"><div class="label">Horário</div><div class="val">${doc.agendamento.horarioCompleto}</div></div>
                <div class="field"><div class="label">Sala / Laboratório</div><div class="val">${doc.localizacao.salaLaboratorio}</div></div>
                <div class="field"><div class="label">Status Operacional</div><div class="val">${doc.statusExecucao}</div></div>
            </div>
            <div class="box">
                <div class="label">Tema / Conteúdo Programático</div>
                <div style="font-size:15px; font-weight:700; margin-top:4px;">${doc.titulo}</div>
            </div>
            <div class="box" style="border-left-color: #10b981;">
                <div class="label">Materiais e Ferramentas Solicitadas ao Estoque</div>
                <div style="font-size:13.5px; margin-top:4px; line-height:1.6;">${doc.materiaisRequisitados}</div>
            </div>
            <div style="margin-top:20px; font-size:12px; color:#64748b;">
                <strong>Destino Google Drive:</strong> Sub-banco pasta <code>1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj</code> &bull; Arquivo: <code>${doc.metadados.nomeArquivoDrive}</code>
            </div>
            <div class="footer">
                Documento gerado automaticamente pelo Sistema SenaiVest 2.0 &bull; ${new Date().toLocaleString('pt-BR')}
            </div>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `);
    printWin.document.close();
};


window.openHistoriaModal = function() {
    if (typeof openModal === 'function') {
        openModal('historia-modal');
    } else {
        const m = document.getElementById('historia-modal');
        if (m) m.classList.add('active');
    }
};


window.getLaboratoriosSincronizados = function() {
    const salas = (window.mockSalas || mockSalas || []).filter(s => {
        const n = (s.nome || '').toLowerCase();
        return !n.includes('estoque central');
    });
    return salas.map((s, idx) => {
        const n = s.nome;
        let tipo = 'Modelagem & Costura Industrial de Vestuário';
        let icon = 'straighten';
        if (n.toLowerCase().includes('modelagem')) { tipo = 'Modelagem & Encaixe'; icon = 'straighten'; }
        else if (n.toLowerCase().includes('costura')) { tipo = 'Costura Industrial & Overlock'; icon = 'precision_manufacturing'; }
        return {
            id: 'sala-' + (s.id || idx + 1),
            nome: s.nome,
            tipo: s.tipo || tipo,
            capacidade: s.capacidade || 30,
            icon: icon
        };
    });
};


window.switchMonitoramentoSubTab = function(subTab) {
    const btnLabs = document.getElementById('tab-btn-mon-labs');
    const btnFluxo = document.getElementById('tab-btn-mon-fluxo');
    const dash = document.getElementById('mon-dash');
    const grid = document.getElementById('monitoramento-grid');
    const agendadas = document.querySelector('.monitoramento-agendadas-container');
    const fluxoContainer = document.getElementById('mon-fluxo-materiais-container');

    if (subTab === 'fluxo') {
        if (btnLabs) btnLabs.classList.remove('active');
        if (btnFluxo) btnFluxo.classList.add('active');
        if (dash) dash.style.display = 'none';
        if (grid) grid.style.display = 'none';
        if (agendadas) agendadas.style.display = 'none';
        if (fluxoContainer) {
            fluxoContainer.style.display = 'block';
            window.renderFluxoMateriaisCoord();
        }
    } else {
        if (btnLabs) btnLabs.classList.add('active');
        if (btnFluxo) btnFluxo.classList.remove('active');
        if (dash) dash.style.display = 'grid';
        if (grid) grid.style.display = 'grid';
        if (agendadas) agendadas.style.display = 'block';
        if (fluxoContainer) fluxoContainer.style.display = 'none';
        window.renderMonitoramento();
    }
};

window.renderFluxoMateriaisCoord = function(filtro = '') {
    const container = document.getElementById('mon-fluxo-materiais-container');
    if (!container) return;

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const filtroLower = (filtro || '').toLowerCase();

    const matsFiltrados = mats.filter(m => {
        if (!filtroLower) return true;
        const cod = (m.cod || m.codigo || '').toLowerCase();
        const nome = (m.nome || '').toLowerCase();
        const salaOrigem = (m.almoxOrigem || '').toLowerCase();
        const salaAtual = (m.almoxAtual || '').toLowerCase();
        const resp = (m.responsavel || '').toLowerCase();
        return cod.includes(filtroLower) || nome.includes(filtroLower) || salaOrigem.includes(filtroLower) || salaAtual.includes(filtroLower) || resp.includes(filtroLower);
    });

    // Cálculos de KPI para a Coordenação
    const totalItens = mats.length;
    let totalEstoqueQtd = 0;
    let emUsoLaboratorios = 0;
    let itensBaixoEstoque = 0;

    mats.forEach(m => {
        const q = parseFloat(m.qtd) || 0;
        totalEstoqueQtd += q;
        if (m.almoxAtual && !m.almoxAtual.toLowerCase().includes('estoque central')) {
            emUsoLaboratorios++;
        }
        if (q <= 15) itensBaixoEstoque++;
    });

    let rowsHtml = '';
    matsFiltrados.forEach(m => {
        const cod = m.cod || m.codigo || 'MAT-000';
        const nome = m.nome || 'Material Têxtil';
        const tipo = m.tipo || 'Insumo';
        const qtd = m.qtd || 0;
        const origem = m.almoxOrigem || 'Estoque Central';
        const atual = m.almoxAtual || 'Sala 01 - Modelagem';
        const resp = m.responsavel || 'Prof. Giovani Azevedo';
        const horario = m.horarioEntrada || '14:00';
        
        const emUso = !atual.toLowerCase().includes('estoque central');
        const statusBadge = emUso 
            ? `<span style="background:rgba(2,132,199,0.12); color:#0284c7; padding:4px 10px; border-radius:12px; font-weight:700; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; border-radius:50%; background:#0284c7;"></span> Em Uso em Laboratório</span>`
            : `<span style="background:rgba(16,185,129,0.12); color:#059669; padding:4px 10px; border-radius:12px; font-weight:700; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;"><span style="width:6px; height:6px; border-radius:50%; background:#10b981;"></span> Guardado no Estoque</span>`;

        rowsHtml += `
            <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:12px 14px; font-weight:700; font-family:monospace; color:#0b2341; font-size:13px;">${cod}</td>
                <td style="padding:12px 14px; font-weight:600; color:var(--text-primary); font-size:13.5px;">${nome}</td>
                <td style="padding:12px 14px; font-size:12.5px; color:var(--text-secondary);"><span style="background:#f1f5f9; padding:2px 8px; border-radius:6px; font-weight:600;">${tipo}</span></td>
                <td style="padding:12px 14px; font-weight:700; font-size:13px; color:${qtd <= 15 ? '#ef4444' : '#0b2341'};">${qtd} un</td>
                <td style="padding:12px 14px; font-size:12.5px; color:var(--text-secondary);">${origem}</td>
                <td style="padding:12px 14px; font-size:13px; font-weight:600; color:#0b2341;">${atual}</td>
                <td style="padding:12px 14px;">${statusBadge}</td>
                <td style="padding:12px 14px; font-size:12.5px; color:var(--text-secondary);">${resp}</td>
                <td style="padding:12px 14px; font-size:12px; font-family:monospace; color:var(--text-secondary);">${horario}</td>
            </tr>
        `;
    });

    if (matsFiltrados.length === 0) {
        rowsHtml = `<tr><td colspan="9" style="text-align:center; padding:32px; color:var(--text-secondary); font-size:13.5px;">Nenhum material encontrado para o filtro pesquisado.</td></tr>`;
    }

    container.innerHTML = `
        <div style="background:white; border:1px solid var(--border-color); border-radius:16px; padding:24px; box-shadow:var(--shadow-sm);">
            <!-- KPI Summary Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Total de Insumos</span>
                    <div style="font-size:24px; font-weight:800; color:#0b2341; margin-top:4px;">${totalItens} itens</div>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Volume Físico Total</span>
                    <div style="font-size:24px; font-weight:800; color:#0b2341; margin-top:4px;">${totalEstoqueQtd} un</div>
                </div>
                <div style="background:rgba(2,132,199,0.06); border:1px solid rgba(2,132,199,0.2); border-radius:12px; padding:16px;">
                    <span style="font-size:12px; font-weight:700; color:#0284c7; text-transform:uppercase;">Em Uso em Laboratórios</span>
                    <div style="font-size:24px; font-weight:800; color:#0284c7; margin-top:4px;">${emUsoLaboratorios} movimentados</div>
                </div>
                <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:16px;">
                    <span style="font-size:12px; font-weight:700; color:#dc2626; text-transform:uppercase;">Reposição Necessária</span>
                    <div style="font-size:24px; font-weight:800; color:#dc2626; margin-top:4px;">${itensBaixoEstoque} itens</div>
                </div>
            </div>

            <!-- Header & Search Toolbar -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:16px;">
                <div>
                    <h3 style="margin:0; font-size:17px; color:#0b2341; display:flex; align-items:center; gap:8px;">
                        <span class="material-icons-outlined" style="color:#0284c7;">table_chart</span>
                        Planilha Executiva de Rastreabilidade em Tempo Real
                    </h3>
                    <p style="margin:2px 0 0; font-size:12.5px; color:var(--text-secondary);">Levantamento contínuo de materiais, transferências entre almoxarifados e salas de aula</p>
                </div>
                <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <div class="search-bar" style="width:260px; margin:0; padding:6px 12px;">
                        <span class="material-icons-outlined" style="font-size:18px;">search</span>
                        <input type="text" placeholder="Filtrar por código, material ou sala..." onkeyup="window.renderFluxoMateriaisCoord(this.value)" style="font-size:12.5px;">
                    </div>
                    <button type="button" class="secondary-btn" onclick="exportarPlanilhaFluxoMateriais()" style="font-size:12.5px; padding:8px 14px; display:inline-flex; align-items:center; gap:6px;">
                        <span class="material-icons-outlined" style="font-size:16px; color:#10b981;">file_download</span> Exportar CSV
                    </button>
                </div>
            </div>

            <!-- Tabela Executiva de Dados -->
            <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px;">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:12px; text-transform:uppercase; color:var(--text-secondary); letter-spacing:0.5px;">
                        <tr>
                            <th style="padding:12px 14px;">Código</th>
                            <th style="padding:12px 14px;">Material / Insumo</th>
                            <th style="padding:12px 14px;">Tipo</th>
                            <th style="padding:12px 14px;">Qtd</th>
                            <th style="padding:12px 14px;">Almoxarifado Origem</th>
                            <th style="padding:12px 14px;">Localização Atual</th>
                            <th style="padding:12px 14px;">Status Rastreio</th>
                            <th style="padding:12px 14px;">Responsável</th>
                            <th style="padding:12px 14px;">Horário</th>
                        </tr>
                    </thead>
                    <tbody style="font-size:13px; color:var(--text-primary); background:white;">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.exportarPlanilhaFluxoMateriais = function() {
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    let csv = 'Codigo,Material,Tipo,Quantidade,Origem,LocalizacaoAtual,Responsavel,Horario\n';
    mats.forEach(m => {
        csv += `"${m.cod || ''}","${m.nome || ''}","${m.tipo || ''}","${m.qtd || 0}","${m.almoxOrigem || ''}","${m.almoxAtual || ''}","${m.responsavel || ''}","${m.horarioEntrada || ''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `senaivest_fluxo_materiais_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
};


// ==========================================
// MÓDULO UNIFICADO: DIÁRIO DE CLASSE & CHECK-IN DE BANCADAS (OPERACIONAL SENAIVEST)
// ==========================================

// Base histórica de aulas práticas concluídas (organizadas por Ano e Mês)
window.mockAulasHistorico = [
    {
        id: 'HIST-2026-001',
        ano: '2026',
        mes: 'Fevereiro',
        data: '2026-02-18',
        horario: '08:00 às 12:00',
        tema: 'Modelagem Plana Feminina: Saia Reta & Godê',
        turma: 'Vestuário e Estilismo - Manhã',
        sala: 'Sala 01 - Modelagem',
        professor: 'Prof. Giovani Azevedo',
        presentes: 22,
        total: 25,
        bancadasUtilizadas: 11,
        materiais: 'Papel Kraft 80g, Carretilhas, Réguas Curvas'
    },
    {
        id: 'HIST-2026-002',
        ano: '2026',
        mes: 'Fevereiro',
        data: '2026-02-20',
        horario: '13:30 às 17:30',
        tema: 'Montagem de Peça Piloto em Pespontadeira',
        turma: 'Modelagem e Costura Industrial - Tarde',
        sala: 'Sala 02 - Costura',
        professor: 'Profª. Clara Mendes',
        presentes: 19,
        total: 20,
        bancadasUtilizadas: 10,
        materiais: 'Tecido Tricoline 100% Algodão, Bobinas de Metal'
    },
    {
        id: 'HIST-2026-003',
        ano: '2026',
        mes: 'Janeiro',
        data: '2026-01-26',
        horario: '08:00 às 12:00',
        tema: 'Segurança e Regulagem de Máquinas Industriais',
        turma: 'Vestuário e Estilismo - Manhã',
        sala: 'Sala 02 - Costura',
        professor: 'Prof. Giovani Azevedo',
        presentes: 24,
        total: 25,
        bancadasUtilizadas: 12,
        materiais: 'Chaves de Fenda de Precisão, Óleo Lubrificante Singer'
    },
    {
        id: 'HIST-2026-004',
        ano: '2026',
        mes: 'Janeiro',
        data: '2026-01-29',
        horario: '18:30 às 22:30',
        tema: 'Enfesto Manual e Corte com Tesoura de Alfaiate',
        turma: 'Tecelagem e Acabamentos - Noite',
        sala: 'Sala 01 - Modelagem',
        professor: 'Prof. Ricardo Santos',
        presentes: 18,
        total: 18,
        bancadasUtilizadas: 9,
        materiais: 'Tesouras Alfaiate 10 Pol, Grampos Fixadores'
    }
];

window.renderDiarioHistoricoAulas = function() {
    const container = document.getElementById('diario-historico-container');
    if (!container) return;

    const anoFiltro = document.getElementById('filtro-diario-ano') ? document.getElementById('filtro-diario-ano').value : 'todos';
    const mesFiltro = document.getElementById('filtro-diario-mes') ? document.getElementById('filtro-diario-mes').value : 'todos';

    let lista = [...window.mockAulasHistorico];
    if (anoFiltro !== 'todos') lista = lista.filter(a => a.ano === anoFiltro);
    if (mesFiltro !== 'todos') lista = lista.filter(a => a.mes.toLowerCase() === mesFiltro.toLowerCase());

    // Agrupar por Ano e depois Mês
    const grupos = {};
    lista.forEach(a => {
        const chave = `${a.ano} - ${a.mes}`;
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(a);
    });

    if (Object.keys(grupos).length === 0) {
        container.innerHTML = `
            <div style="background:white; border:1px solid var(--border-color); border-radius:14px; padding:32px; text-align:center; box-shadow:var(--shadow-sm); color:var(--text-secondary);">
                <span class="material-icons-outlined" style="font-size:36px; opacity:0.5; display:block; margin-bottom:8px;">event_busy</span>
                Nenhuma aula realizada encontrada para os filtros de Ano e Mês selecionados.
            </div>
        `;
        return;
    }

    let html = '';
    for (const [chave, aulas] of Object.entries(grupos)) {
        html += `
            <div style="background:white; border:1px solid var(--border-color); border-radius:14px; padding:20px; margin-bottom:20px; box-shadow:var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f1f5f9; padding-bottom:12px; margin-bottom:16px;">
                    <h3 style="margin:0; font-size:16px; color:#0b2341; display:flex; align-items:center; gap:8px;">
                        <span class="material-icons-outlined" style="color:var(--primary-color);">calendar_month</span>
                        ${chave}
                    </h3>
                    <span style="background:rgba(11,35,65,0.08); color:#0b2341; font-weight:700; font-size:12px; padding:4px 10px; border-radius:12px;">
                        ${aulas.length} ${aulas.length === 1 ? 'Aula Concluída' : 'Aulas Concluídas'}
                    </span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px;">
        `;

        aulas.forEach(a => {
            const freqPct = Math.round((a.presentes / a.total) * 100);
            html += `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-size:11.5px; font-weight:800; color:#0284c7; background:#e0f2fe; padding:3px 8px; border-radius:6px;">${a.sala}</span>
                            <span style="font-size:12px; font-weight:600; color:var(--text-secondary);">${a.data}</span>
                        </div>
                        <h4 style="margin:0 0 6px 0; font-size:15px; color:#0b2341;">${a.tema}</h4>
                        <div style="font-size:12.5px; color:var(--text-secondary); display:flex; flex-direction:column; gap:4px; margin-bottom:12px;">
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#0284c7;">person</span> ${a.professor}</div>
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#f59e0b;">schedule</span> ${a.horario}</div>
                            <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:var(--primary-color);">groups</span> ${a.turma}</div>
                        </div>
                        <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:10px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span style="color:var(--text-secondary);">Frequência:</span>
                                <strong style="color:#059669; margin-left:4px;">${a.presentes}/${a.total} (${freqPct}%)</strong>
                            </div>
                            <div>
                                <span style="color:var(--text-secondary);">Bancadas:</span>
                                <strong style="color:#0b2341; margin-left:4px;">${a.bancadasUtilizadas} ativas</strong>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:14px; display:flex; gap:8px;">
                        <button type="button" class="secondary-btn" onclick="alert('Visualizando diário detalhado da aula ${a.tema}:\n- Data: ${a.data}\n- Presença: ${a.presentes}/${a.total} alunos\n- Insumos utilizados: ${a.materiais}')" style="flex:1; font-size:12px; padding:6px 10px; justify-content:center;">
                            <span class="material-icons-outlined" style="font-size:15px; margin-right:4px;">visibility</span> Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
};

window.renderDiarioBancadasAlocacao = function() {
    const grid = document.getElementById('diario-bancadas-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const turmaSelect = document.getElementById('diario-turma-select');
    const turmaEscolhida = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo - Manhã';

    // Obter alunos presentes na turma
    const alunosPresentes = (window.mockAlunosDiario || []).filter(a => {
        if (!a.presente) return false;
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tT = turmaEscolhida.toLowerCase();
        return aT.includes(tT) || tT.includes(aT) || 
               (tT.includes('manhã') && aT.includes('manhã')) ||
               (tT.includes('tarde') && aT.includes('tarde')) ||
               (tT.includes('noite') && aT.includes('noite'));
    });

    // 12 Bancadas operacionais inteligentes do laboratório
    const bancadas = window.bancadasCheckinMock || [
        { numero: 'Bancada 01', tipo: 'Reta Industrial Sun Special', status: 'confirmado', materiais: 'Bobinas, Agulhas nº 14, Tesoura Arremate' },
        { numero: 'Bancada 02', tipo: 'Reta Industrial Brother', status: 'confirmado', materiais: 'Bobinas, Fita Métrica, Chave Agulha' },
        { numero: 'Bancada 03', tipo: 'Overlock Industrial 3 Fios', status: 'confirmado', materiais: 'Pinça de Passar Fio, Fio Poliéster' },
        { numero: 'Bancada 04', tipo: 'Galoneira Base Plana', status: 'confirmado', materiais: 'Agulhas B27, Calcador Guia' },
        { numero: 'Bancada 05', tipo: 'Mesa de Modelagem & Encaixe', status: 'confirmado', materiais: 'Carretilha, Régua Alfaiate, Papel Kraft' },
        { numero: 'Bancada 06', tipo: 'Reta Eletrônica Jack A4', status: 'confirmado', materiais: 'Bobinas, Óleo de silicone' },
        { numero: 'Bancada 07', tipo: 'Interlock 5 Fios Industrial', status: 'confirmado', materiais: 'Pinça, Desmanchador de Costura' },
        { numero: 'Bancada 08', tipo: 'Pespontadeira 2 Agulhas', status: 'confirmado', materiais: 'Bobinas Duplas, Guia Magnético' },
        { numero: 'Bancada 09', tipo: 'Mesa de Encaixe & Modelagem', status: 'confirmado', materiais: 'Giz de Alfaiate, Fita Métrica' },
        { numero: 'Bancada 10', tipo: 'Reta Industrial Siruba', status: 'confirmado', materiais: 'Bobinas, Tesoura Alfaiate' },
        { numero: 'Bancada 11', tipo: 'Overlock Industrial 4 Fios', status: 'confirmado', materiais: 'Fio Overlock, Agulhas DCx27' },
        { numero: 'Bancada 12', tipo: 'Prensa Térmica & Termocolante', status: 'confirmado', materiais: 'Papel Teflona, Termocolante Fita' }
    ];

    bancadas.forEach((b, idx) => {
        const alunoAlocado = alunosPresentes[idx] || null;
        const nomeAluno = alunoAlocado ? alunoAlocado.nome : 'Bancada Disponível';
        const matAluno = alunoAlocado ? alunoAlocado.id : 'N/A';
        const isOcupada = !!alunoAlocado;

        grid.innerHTML += `
            <div style="background:#ffffff; border:1px solid ${isOcupada ? '#bbf7d0' : '#e2e8f0'}; border-radius:12px; padding:14px; box-shadow:var(--shadow-sm); border-left:4px solid ${isOcupada ? '#10b981' : '#cbd5e1'};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-weight:800; font-size:14px; color:#0b2341; display:flex; align-items:center; gap:6px;">
                        <span class="material-icons-outlined" style="font-size:18px; color:${isOcupada ? '#10b981' : '#64748b'};">precision_manufacturing</span>
                        ${b.numero}
                    </div>
                    <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; background:${isOcupada ? '#dcfce7' : '#f1f5f9'}; color:${isOcupada ? '#15803d' : '#64748b'};">
                        ${isOcupada ? '● Check-in Ativo' : '○ Livre'}
                    </span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">${b.tipo}</div>
                
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:12.5px; margin-bottom:8px;">
                    <div style="font-weight:700; color:#0b2341;">${nomeAluno}</div>
                    ${alunoAlocado ? `<div style="font-size:11.5px; color:var(--text-secondary);">Matrícula: <strong>${matAluno}</strong></div>` : `<div style="font-size:11.5px; color:#94a3b8;">Aguardando alocação de aluno presente</div>`}
                </div>

                <div style="font-size:11.5px; color:var(--text-secondary);">
                    <strong>Kit de Materiais:</strong> ${b.materiais}
                </div>
            </div>
        `;
    });
};

window.exportarDiarioClassePresenca = function() {
    const planoSelect = document.getElementById('diario-plano-select');
    const planoNome = planoSelect ? planoSelect.options[planoSelect.selectedIndex].text : 'Plano de Aula';
    const turmaSelect = document.getElementById('diario-turma-select');
    const turmaNome = turmaSelect ? turmaSelect.value : 'Vestuário e Estilismo';
    
    const alunos = (window.mockAlunosDiario || []);
    let presentes = 0;
    let ausentes = 0;
    let listaStr = '';
    
    alunos.forEach(a => {
        if (a.presente) {
            presentes++;
            listaStr += `[X] ${a.id} - ${a.nome} (PRESENTE)\n`;
        } else {
            ausentes++;
            listaStr += `[ ] ${a.id} - ${a.nome} (AUSENTE)\n`;
        }
    });

    alert(
        `SENAI CENTRO DE FORMAÇÃO PROFISSIONAL CÂNDIDO ATHAYDE\n` +
        `DIÁRIO DE FREQUÊNCIA & CREDENCIAMENTO DE BANCADAS\n\n` +
        `Plano: ${planoNome}\n` +
        `Turma: ${turmaNome}\n` +
        `Data: ${new Date().toLocaleDateString('pt-BR')}\n` +
        `Docente Responsável: ${(currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo'}\n\n` +
        `Resumo: ${presentes} Presentes | ${ausentes} Ausentes (Total: ${alunos.length})\n\n` +
        `Relação de Alunos:\n${listaStr}\n` +
        `Documento de controle de laboratório gerado com sucesso para impressão/PDF!`
    );
};


window.abrirOcorrenciaCoordenacao = function(profNome) {
    const msg = prompt(`[Comunicação Oficial com a Coordenação Pedagógica]\nDigite o comunicado ou ocorrência a respeito do(a) ${profNome}:`);
    if (msg && msg.trim()) {
        if (typeof window.notificacoes !== 'undefined' && Array.isArray(window.notificacoes)) {
            window.notificacoes.unshift({
                id: Date.now(),
                title: 'Ocorrência Pedagógica / Comunicado',
                desc: `Docente ${profNome}: ${msg.trim()}`,
                type: 'info',
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            });
            if (typeof renderNotificacoes === 'function') renderNotificacoes();
        }
        alert('Mensagem transmitida diretamente para o Painel da Coordenação com sucesso!');
    }
};
