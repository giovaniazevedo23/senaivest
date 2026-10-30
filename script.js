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
        nome: 'Pedro Santos',
        role: 'Aluno',
        email: 'aluno@senai.br',
        matricula: 'ALU-001',
        turma: 'Vestuário e Estilismo - Manhã',
        idade: '19',
        sexo: 'Masculino',
        raca: 'Parda',
        senha: 'ALU-001',
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
                        turma: data.turma || (localUsers[docId] && localUsers[docId].turma) || '',
                        bancadaPadrao: data.bancadaPadrao || (localUsers[docId] && localUsers[docId].bancadaPadrao) || '',
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
                if (typeof window.renderListaAlunosPreCadastradosCoord === 'function') window.renderListaAlunosPreCadastradosCoord();
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
        if (window.location.search && window.location.search.includes('qr_portal=aluno')) {
            return; // Será tratado pelo interceptador automático de QR Code do Portal do Aluno
        }
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
    { id: 1, nome: 'Sala 01 - Modelagem', tipo: 'Modelagem & Encaixe', qtd: 450 },
    { id: 2, nome: 'Sala 02 - Costura', tipo: 'Costura Industrial & Overlock', qtd: 120 },
    { id: 3, nome: 'Estoque Central', tipo: 'Almoxarifado & Logística Têxtil', qtd: 2000 }
];
window.mockSalas = mockSalas;

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
    { cod: 'MAT-001', nome: 'Tecido Algodão Cru', tipo: 'Insumo', qtd: 50, preco: 'R$ 15,90', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira A1', horarioEntrada: '16:22', responsavel: 'Giovani Azevedo', imagem: 'tecido_algodao.jpg' },
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
        if (Array.isArray(window.mockMateriais)) {
            mockMateriais = window.mockMateriais;
        }
        localStorage.setItem('senaivest_materiais', JSON.stringify(mockMateriais));
        window.mockMateriais = mockMateriais;
    } catch(e) {}
}
window.salvarMateriaisStorage = salvarMateriaisStorage;

const notificacoes = [
    { id: 1, title: 'Material Atrasado', desc: 'Tesoura não devolvida.', type: 'alert' },
    { id: 2, title: 'Novo Plano', desc: 'Prof. Clara adicionou um plano.', type: 'info' }
];

let mockProcessos = [
    { id: 'PROC-101', autor: 'Prof. Roberto', tipo: 'Avaria', material: 'Máquina Reta', qtd: 1, detalhe: 'Agulha quebrou e a correia soltou.', status: 'Em Análise', data: 'Hoje, 09:15' }
];

const mockMonitoramento = [
    { sala: 'Sala 01 - Modelagem', status: 'Ocupada', professor: 'Prof. Clara', aula: 'Modelagem Avançada', horario: '08:00 - 12:00' },
    { sala: 'Sala 02 - Costura', status: 'Disponível', professor: '', aula: '', horario: '' },
    { sala: 'Laboratório Maker', status: 'Agendada', professor: 'Prof. Roberto', aula: 'Impressão 3D', horario: '14:00 - 16:00' }
];

const mockAcompanhamento = [
    { turma: 'Vestuário - Manhã', aluno: 'João Silva', plano: 'PLAN-102 (Costura)', indice: 'Excelente (98%)', statusClass: 'ok', ocorrencia: '' },
    { turma: 'Modelagem - Tarde', aluno: 'Maria Souza', plano: 'PLAN-105 (Moldes)', indice: 'Atenção (60%)', statusClass: 'atrasado', ocorrencia: 'Avaria Registrada (Máquina Reta)' },
    { turma: 'Design - Noite', aluno: 'Pedro Alves', plano: 'PLAN-108 (Estamparia)', indice: 'Crítico (40%)', statusClass: 'atrasado', ocorrencia: 'Roubo Registrado (Tesoura)' }
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

            // 2. Fallback para cache local / localStorage e Base de Pré-Cadastro da Coordenação
            if (!userFound) {
                const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
                if (users[idStr]) {
                    userFound = users[idStr];
                    userFound.id = idStr;
                } else if (role === 'Aluno' && typeof window.buscarEstudantePreCadastradoLocal === 'function') {
                    userFound = window.buscarEstudantePreCadastradoLocal(idStr);
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

            // 4. Validação estrita de cadastro na plataforma e senha (para Aluno: ID = Matrícula e Senha = Matrícula)
            if (userFound) {
                const senhaEsperada = String(userFound.senha || userFound.matricula || idStr).trim();
                const senhaDigitada = String(senhaStr || '').trim();
                const isAlunoMesmaMatricula = (userFound.role === 'Aluno' || role === 'Aluno') &&
                    (senhaDigitada.toUpperCase() === idStr && (senhaEsperada.toUpperCase() === idStr || (idStr === 'ALU-001' && senhaEsperada === '1234'))) ||
                    (idStr === 'ALU-001' && senhaDigitada === '1234');

                if (senhaEsperada && senhaDigitada !== senhaEsperada && !isAlunoMesmaMatricula) {
                    alert(role === 'Aluno'
                        ? 'Senha incorreta! Para estudantes pré-cadastrados, o ID é a Matrícula e a Senha padrão também é a Matrícula.'
                        : 'Senha incorreta! Por favor, verifique e tente novamente.');
                    if (submitBtn) { submitBtn.innerText = originalText; submitBtn.disabled = false; }
                    return;
                }

                currentUser.id = idStr;
                currentUser.matricula = userFound.matricula || idStr;
                currentUser.role = userFound.role || role;
                currentUser.nome = userFound.nome || ('Usuário ' + idStr);
                currentUser.turma = userFound.turma || 'Vestuário e Estilismo - Manhã';
                currentUser.escola = userFound.escola || 'SENAI Centro de Formação Cândido Atahyde';
                currentUser.email = userFound.email || '';
                currentUser.foto = userFound.foto || '';

                if (currentUser.role === 'Aluno') {
                    try { localStorage.setItem('senaivest_aluno_qr_matricula', idStr); } catch(e) {}
                }

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
                    if (currentUser.role === 'Aluno' && window._qrContextoPendente && typeof window.aplicarContextoAvaliacaoQRAluno === 'function') {
                        window.aplicarContextoAvaliacaoQRAluno(window._qrContextoPendente);
                        window._qrContextoPendente = null;
                    }
                } catch(err) {
                    console.error("Erro no initApp:", err);
                }
            } else {
                alert(role === 'Aluno'
                    ? 'Acesso negado! A matrícula (' + idStr + ') não está cadastrada na plataforma. Solicite o cadastro prévio na Coordenação para entrar no Portal do Aluno.'
                    : 'Acesso negado! O ID (' + idStr + ') não foi encontrado no Firebase nem no sistema. Por favor, solicite o cadastro para a Coordenação.');
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

        if (!local) {
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('Selecione a Sala', 'Escolha o laboratório/sala onde ocorrerá a aula.', 'warning');
            } else {
                alert('Selecione a sala/laboratório onde ocorrerá a aula.');
            }
            return;
        }

        if (typeof window.verificarChoqueHorarioPlano === 'function') {
            const checkChoque = window.verificarChoqueHorarioPlano(local, dia, inicio, termino, idEdit);
            if (checkChoque.invalido) {
                if (typeof window.verificarChoqueHorarioPlanoModal === 'function') window.verificarChoqueHorarioPlanoModal();
                if (typeof window.mostrarToast === 'function') {
                    window.mostrarToast('Horário Inválido', checkChoque.mensagem, 'error');
                } else {
                    alert(checkChoque.mensagem);
                }
                return;
            }
            if (checkChoque.conflito) {
                if (typeof window.verificarChoqueHorarioPlanoModal === 'function') window.verificarChoqueHorarioPlanoModal();
                const alertBox = document.getElementById('p-conflito-horario-alert');
                if (alertBox && typeof alertBox.scrollIntoView === 'function') {
                    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                if (typeof window.mostrarToast === 'function') {
                    window.mostrarToast('Choque de Horário na Sala!', checkChoque.mensagem, 'error');
                } else {
                    alert(checkChoque.mensagem);
                }
                return;
            }
        }
        
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

        // Atualizar controle de devolução (window.planosAulasControle) SOMENTE se houver deslocamento de material entre salas
        if (!window.planosAulasControle) window.planosAulasControle = [];
        if (needsTransfer.length > 0) {
            let salaOrigDeslocada = 'Estoque Central';
            chavesMats.forEach(codOpt => {
                const it = window.selectedMateriaisPlano[codOpt];
                if (it && it.sala && it.sala !== local) {
                    salaOrigDeslocada = it.sala;
                    // Marca o material como deslocado para a sala de uso
                    const mRef = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === codOpt);
                    if (mRef) {
                        if (!mRef.almoxOrigem) mRef.almoxOrigem = it.sala;
                        mRef.almoxAtual = local;
                    }
                }
            });
            if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();

            const ctrlIdx = window.planosAulasControle.findIndex(p => p.id === planoId);
            const ctrlObj = {
                id: planoId,
                tema: tema,
                turma: turma,
                professorId: profIdFinal,
                professorNome: profFinal,
                salaUso: local,
                salaOrigem: salaOrigDeslocada,
                localizacaoOrigem: `${salaOrigDeslocada} (Material Deslocado)`,
                materiaisTexto: needsTransfer.join(', '),
                materialDeslocado: true,
                horarioRetirada: `${dia} às ${inicio}`,
                horarioLimite: `${dia} às ${termino}`,
                timestampRetirada: Date.now(),
                timestampLimite: new Date(`${dia}T${termino}:00`).getTime() || (Date.now() + 2 * 3600 * 1000),
                status: 'atrasado',
                devolucao: null
            };
            if (ctrlIdx >= 0) {
                window.planosAulasControle[ctrlIdx] = { ...window.planosAulasControle[ctrlIdx], ...ctrlObj };
            } else {
                window.planosAulasControle.unshift(ctrlObj);
            }
            if (typeof salvarPlanosAulasStorage === 'function') salvarPlanosAulasStorage();
        }
        if (typeof window.registrarMovimentacaoEstoque === 'function' && matsStr !== 'Nenhum material') {
            window.registrarMovimentacaoEstoque({
                tipo: needsTransfer.length > 0 ? 'Transferência' : 'Saída',
                cod: chavesMats[0] || 'PLAN-MAT',
                material: matsStr,
                qtd: chavesMats.length || 1,
                origem: needsTransfer.length > 0 ? 'Outro Almoxarifado' : local,
                destino: local,
                usuario: profFinal,
                cargo: 'Professor',
                vinculo: `Plano ${planoId} - ${tema} (${turma})`
            });
        }

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

        // Registrar saída / alocação diretamente nos Cards de Materiais com o nome do Professor responsável
        if (typeof window.registrarSaidaPlanoNosCardsMateriais === 'function') {
            window.registrarSaidaPlanoNosCardsMateriais({
                planoId: planoId,
                isEdit: !!idEdit,
                tema: tema,
                turma: turma,
                dia: dia,
                horario: horario,
                salaDestino: local,
                professorNome: profFinal,
                professorId: profIdFinal,
                selectedMap: window.selectedMateriaisPlano || {}
            });
        }

        // Sincronizar ocupação automática das salas imediatamente após salvar/editar o plano
        if (typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') {
            window.sincronizarOcupacaoAutomaticaPorPlanos(true);
        }

        if (currentUser && currentUser.role === 'Coordenação' && typeof window.renderPlanosGeral === 'function') {
            window.renderPlanosGeral();
        } else if (typeof window.renderPlanosGridCompleta === 'function') {
            window.renderPlanosGridCompleta();
        } else if (typeof renderPlan === 'function') {
            renderPlan(tema, horario, profFinal, true, matsStr, local, dia, local, tempoPreparo, turma);
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
        if (typeof window.switchBoletimTab === 'function') window.switchBoletimTab('lista');
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
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-aquisicao', this)"><span class="material-icons-outlined">shopping_bag</span> <span class="nav-text">Setor de Compras</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-salas', this)"><span class="material-icons-outlined">category</span> <span class="nav-text">Salas Virtuais</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-cadastro-prof', this)"><span class="material-icons-outlined">person_add</span> <span class="nav-text">Professores</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-cadastro-alunos', this)"><span class="material-icons-outlined">qr_code_2</span> <span class="nav-text">Alunos &amp; QR Codes</span></li>`;
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
            if (typeof renderAlunoBancada === 'function') renderAlunoBancada();
            if (typeof renderCatalogoRetalhos === 'function') renderCatalogoRetalhos();
            if (typeof renderRankingEficiencia === 'function') renderRankingEficiencia();
        } else {
            menu.innerHTML += `<li class="nav-item active" onclick="nav('view-dashboard-prof', this)"><span class="material-icons-outlined">dashboard</span> <span class="nav-text">Painel do Professor</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-salas', this)"><span class="material-icons-outlined">category</span> <span class="nav-text">Salas Virtuais</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-diario-classe', this)"><span class="material-icons-outlined">fact_check</span> <span class="nav-text">Diário & Bancadas</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-planos', this)"><span class="material-icons-outlined">menu_book</span> <span class="nav-text">Planos de Aula</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-monitoramento', this)"><span class="material-icons-outlined">meeting_room</span> <span class="nav-text">Monitoramento</span></li>`;
            menu.innerHTML += `<li class="nav-item" onclick="nav('view-processos', this); if(typeof switchBoletimTab === 'function') switchBoletimTab('lista');"><span class="material-icons-outlined">receipt_long</span> <span class="nav-text">Meus Boletins</span></li>`;
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
    try {
        if (typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') {
            window.sincronizarOcupacaoAutomaticaPorPlanos(false);
        }
        if (typeof window.renderPlanosGridCompleta === 'function') {
            window.renderPlanosGridCompleta();
        } else if (typeof renderPlan === 'function') {
            if (document.getElementById('plans-grid')) document.getElementById('plans-grid').innerHTML = '';
            renderPlan('Modelagem Básica', '08:00 às 10:00', (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo', false, 'MAT-001 - Tecido Algodão', 'Sala 01 - Modelagem', '2026-10-01', 'Sala 01 - Modelagem');
        }
        if (typeof renderMonitoramento === 'function') renderMonitoramento();
        if (typeof window.atualizarBadgesBibliotecaDiarios === 'function') window.atualizarBadgesBibliotecaDiarios();
    } catch(e) { console.error(e); }
}

window.nav = function(viewId, element) {
    if (viewId === 'view-boletins-novo') {
        viewId = 'view-processos';
        if (typeof window.switchBoletimTab === 'function') {
            window.switchBoletimTab('novo');
        }
    }
    if (viewId === 'view-checkin-bancada') {
        viewId = 'view-diario-classe';
    }
    if (viewId === 'view-acompanhamento' && (!currentUser || currentUser.role !== 'Coordenação')) {
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Acesso Restrito à Coordenação', 'O módulo de Acompanhamento é exclusivo do perfil da Coordenação.', 'warning');
        }
        return;
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    if (viewId === 'view-processos') {
        if (typeof renderProcessos === 'function') renderProcessos();
        if (typeof renderBoletimCategories === 'function') renderBoletimCategories();
    }
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
    if(viewId === 'view-aquisicao' && typeof window.renderSetorCompras === 'function') {
        window.renderSetorCompras();
    }
    if(viewId === 'view-salas' && typeof window.renderSalas === 'function') {
        window.renderSalas();
    }
    if(viewId === 'view-cadastro-alunos' && typeof window.renderListaAlunosPreCadastradosCoord === 'function') {
        window.renderListaAlunosPreCadastradosCoord();
    }
    if(viewId === 'view-planos') {
        if(typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') window.sincronizarOcupacaoAutomaticaPorPlanos(false);
        if(currentUser && currentUser.role === 'Coordenação' && typeof window.renderPlanosGeral === 'function') {
            window.renderPlanosGeral();
        } else if(typeof window.renderPlanosGridCompleta === 'function') {
            window.renderPlanosGridCompleta();
        }
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
        if(typeof window.switchAvisosSubTab === 'function') {
            window.switchAvisosSubTab('mural');
        } else if(typeof renderPainelAvisos === 'function') {
            renderPainelAvisos();
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

                    <!-- Alerta de Origem e Quem Colocou na Sala (se deslocado de outro almoxarifado) -->
                    ${isBorrowed ? `
                        <div class="mat-card-origin-notice" style="flex-direction:column; align-items:flex-start; gap:4px;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span class="material-icons-outlined" style="font-size:16px;">info</span>
                                <span>Origem deste material: <strong>${m.almoxOrigem}</strong></span>
                            </div>
                            <div style="font-size:11.5px; color:#92400e; padding-left:22px;">
                                Colocado/Registrado nesta sala por: <strong>${m.colocadoPorProfessor || responsavel}</strong>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Registro de Saída / Uso em Plano de Aula e Regularização por Foto -->
                    ${typeof window.gerarBlocoRegistrosSaidaCardHtml === 'function' ? window.gerarBlocoRegistrosSaidaCardHtml(m) : ''}

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
                        <p style="margin:4px 0 0 24px; font-size:12px; color:#15803d;">Laboratório disponível. A ocupação inicia e encerra de forma 100% automática conforme os horários dos Planos de Aula agendados.</p>
                        ${window.obterResumoProximaAulaSalaHtml ? window.obterResumoProximaAulaSalaHtml(lab.nome) : ''}
                    </div>
                </div>
            `;
        }
    });

    // 2. Dashboards KPI Topo com Tipografia Executiva e Design Refinado
    const totalAgendadasCount = todasAgendadas.length;
    dash.innerHTML = `
        <div class="mon-stat-card card-ocupados">
            <div class="mon-icon-box" style="background:#fee2e2; color:#ef4444;">
                <span class="material-icons-outlined">meeting_room</span>
            </div>
            <div class="mon-stat-info">
                <span class="mon-stat-label">Laboratórios Ocupados</span>
                <span class="mon-stat-num" style="color:#ef4444;">${countOcupadas}</span>
                <span class="mon-stat-sub">
                    <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#ef4444;"></span>
                    ${countOcupadas === 1 ? '1 sala em aula prática' : `${countOcupadas} salas em aula prática`}
                </span>
            </div>
        </div>
        <div class="mon-stat-card card-disponiveis">
            <div class="mon-icon-box" style="background:#dcfce7; color:#10b981;">
                <span class="material-icons-outlined">meeting_room</span>
            </div>
            <div class="mon-stat-info">
                <span class="mon-stat-label">Laboratórios Disponíveis</span>
                <span class="mon-stat-num" style="color:#10b981;">${countDisponiveis}</span>
                <span class="mon-stat-sub">
                    <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#10b981;"></span>
                    ${countDisponiveis === 1 ? '1 sala pronta para agendar' : `${countDisponiveis} salas prontas para agendar`}
                </span>
            </div>
        </div>
        <div class="mon-stat-card card-agendadas">
            <div class="mon-icon-box" style="background:#fef3c7; color:#d97706;">
                <span class="material-icons-outlined">calendar_today</span>
            </div>
            <div class="mon-stat-info">
                <span class="mon-stat-label">Aulas Agendadas</span>
                <span class="mon-stat-num" style="color:#d97706;">${totalAgendadasCount}</span>
                <span class="mon-stat-sub">
                    <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#d97706;"></span>
                    Grade de aulas práticas
                </span>
            </div>
        </div>
    `;

    // 3. Renderizar Cronograma Automático e Organizado de Aulas Práticas por Sala e Horário
    if (agendadasContainer) {
        if (typeof window.renderCronogramaOrganizadoMonitoramento === 'function') {
            window.renderCronogramaOrganizadoMonitoramento(agendadasContainer, todasAgendadas, salaFiltro);
        }
    }
}


// Estado e controle das abas integradas de Boletins
window.filtroBoletimStatusAtual = 'todos';
window.filtroBoletimBuscaAtual = '';

window.switchBoletimTab = function(tab) {
    const btnLista = document.getElementById('tab-btn-boletim-lista');
    const btnNovo = document.getElementById('tab-btn-boletim-novo');
    const panelLista = document.getElementById('boletim-panel-lista');
    const panelNovo = document.getElementById('boletim-panel-novo');

    if (tab === 'novo') {
        if (btnLista) btnLista.classList.remove('active');
        if (btnNovo) btnNovo.classList.add('active');
        if (panelLista) panelLista.style.display = 'none';
        if (panelNovo) panelNovo.style.display = 'block';
        if (typeof renderBoletimCategories === 'function') renderBoletimCategories();
    } else {
        if (btnNovo) btnNovo.classList.remove('active');
        if (btnLista) btnLista.classList.add('active');
        if (panelNovo) panelNovo.style.display = 'none';
        if (panelLista) panelLista.style.display = 'block';
        renderProcessos();
    }
};

window.filtrarProcessosStatus = function(status, el) {
    window.filtroBoletimStatusAtual = status;
    document.querySelectorAll('.btn-filtro-boletim').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderProcessos();
};

window.filtrarProcessosBusca = function(query) {
    window.filtroBoletimBuscaAtual = (query || '').toLowerCase().trim();
    renderProcessos();
};

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

    // Atualizar badge de contagem total
    const badge = document.getElementById('boletim-badge-count');
    if (badge) badge.innerText = mockProcessos.length;

    // Filtrar processos por status e por busca textual
    let listaFiltrada = mockProcessos.filter(p => {
        if (window.filtroBoletimStatusAtual && window.filtroBoletimStatusAtual !== 'todos') {
            if (p.status !== window.filtroBoletimStatusAtual) return false;
        }
        if (window.filtroBoletimBuscaAtual) {
            const query = window.filtroBoletimBuscaAtual;
            const mat = (p.material || '').toLowerCase();
            const id = (p.id || '').toLowerCase();
            const aut = (p.autor || '').toLowerCase();
            const tip = (p.tipo || '').toLowerCase();
            const det = (p.detalhe || p.descricaoSucinta || '').toLowerCase();
            if (!mat.includes(query) && !id.includes(query) && !aut.includes(query) && !tip.includes(query) && !det.includes(query)) {
                return false;
            }
        }
        return true;
    });

    if (listaFiltrada.length === 0) {
        grid.innerHTML = `
            <div style="color:var(--text-secondary); text-align:center; padding:48px 24px; grid-column:1/-1; background:white; border-radius:14px; border:1px dashed #cbd5e1;">
                <span class="material-icons-outlined" style="font-size:42px; opacity:0.4; display:block; margin-bottom:10px;">assignment_late</span>
                <strong style="font-size:15px; color:#0b2341; display:block; margin-bottom:4px;">Nenhum boletim encontrado com os filtros selecionados</strong>
                <p style="margin:0 0 16px; font-size:13px;">Você pode registrar um novo boletim de ocorrência ou limpar os filtros de busca.</p>
                <button type="button" class="primary-btn" onclick="switchBoletimTab('novo')" style="font-size:12.5px; padding:8px 16px;">
                    <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">add_circle</span> Registrar Novo Boletim Agora
                </button>
            </div>
        `;
        return;
    }

    listaFiltrada.forEach(p => {
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
                        <button onclick="baixarPdfBoletim('${p.id}', '${p.tipo}', '${p.material}', '${p.autor}', '${p.data}')" title="Baixar Boletim em PDF Oficial" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:7px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;">
                            <span class="material-icons-outlined" style="font-size:15px; color:#e11d48;">picture_as_pdf</span> PDF
                        </button>
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
                <td><span class="status ${a.statusClass}">${a.indice || a.iÍndice}</span></td>
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

    (window.getLaboratoriosSincronizados ? window.getLaboratoriosSincronizados() : window.LABORATORIOS_SENAI).forEach(lab => {
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
    const grids = document.querySelectorAll('.boletins-categories-grid, #boletins-categories-grid');
    if (!grids || grids.length === 0) return;
    let htmlCards = '';
    boletimCategories.forEach(cat => {
        htmlCards += `
            <div class="boletim-cat-card" onclick="abrirFormularioBoletim('${cat.id}', '${cat.title}')">
                <div class="boletim-cat-icon">
                    <span class="material-icons-outlined">${cat.icon}</span>
                </div>
                <h3>${cat.title}</h3>
                <p>${cat.desc}</p>
            </div>
        `;
    });
    grids.forEach(grid => {
        grid.innerHTML = htmlCards;
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
                    <div class="form-group"><label>Último local visto</label><input type="text" placeholder="Ex: Prateleira 2" required></div>
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
    const histContainer = document.getElementById('diario-historico-aulas-container') || document.getElementById('diario-historico-container');
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

// Renderizar informações da Bancada do Aluno (Sincronizada com Alocação do Professor)
window.renderAlunoBancada = function(matriculaFiltro = null) {
    const selectSim = document.getElementById('simular-aluno-bancada-select');
    const alunosLista = Array.isArray(window.mockAlunosDiario) && window.mockAlunosDiario.length > 0
        ? window.mockAlunosDiario
        : [
            { id: 'ALU-001', nome: 'Pedro Santos', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-002', nome: 'João Silva', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-003', nome: 'Carlos Eduardo', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-004', nome: 'Mariana Souza', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-005', nome: 'Ana Clara Lima', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-006', nome: 'Lucas Ferreira', turma: 'Vestuário e Estilismo - Manhã' }
        ];

    const matAlvo = matriculaFiltro || (window.alunoSimuladoId) || (currentUser && currentUser.role === 'Aluno' ? currentUser.id : 'ALU-004');
    window.alunoSimuladoId = matAlvo;

    if (selectSim) {
        selectSim.innerHTML = '';
        alunosLista.forEach(al => {
            const opt = document.createElement('option');
            opt.value = al.id;
            opt.textContent = `${al.nome} (${al.id})`;
            if (al.id === matAlvo || al.nome === (currentUser && currentUser.nome)) opt.selected = true;
            selectSim.appendChild(opt);
        });
    }

    const bancadas = Array.isArray(window.bancadasCheckinMock) ? window.bancadasCheckinMock : [];
    const alunoObj = alunosLista.find(a => a.id === matAlvo) || alunosLista[0];
    const bancadaEncontrada = bancadas.find(b =>
        (b.alunoMatricula && b.alunoMatricula.includes(matAlvo)) ||
        (alunoObj && b.alunoNome && b.alunoNome.toLowerCase().includes(alunoObj.nome.toLowerCase()))
    );

    if (bancadaEncontrada) {
        window.alunoBancadaAtual.numero = bancadaEncontrada.numero;
        window.alunoBancadaAtual.tipo = bancadaEncontrada.tipo;
        window.alunoBancadaAtual.turma = bancadaEncontrada.turma || 'Vestuário e Estilismo - Manhã';
        window.alunoBancadaAtual.checkin = (bancadaEncontrada.status === 'confirmado');
    }

    const displayNum = document.getElementById('bancada-numero-display');
    if (displayNum) displayNum.innerText = `${window.alunoBancadaAtual.numero} - ${window.alunoBancadaAtual.tipo}`;
    const planoDisplay = document.getElementById('bancada-plano-nome');
    if (planoDisplay) planoDisplay.innerText = window.alunoBancadaAtual.plano;

    const btnCheckinText = document.getElementById('btn-checkin-text');
    if (btnCheckinText) {
        btnCheckinText.innerText = window.alunoBancadaAtual.checkin ? 'Check-in Realizado' : 'Confirmar Presença na Bancada';
    }

    const voCardNome = document.getElementById('ranking-voce-card-nome');
    if (voCardNome && alunoObj) {
        voCardNome.innerHTML = `${alunoObj.nome} &bull; ${window.alunoBancadaAtual.pontos} pts`;
    }

    // Atualizar tabela de auditoria se a bancada tiver materiais específicos
    const tbody = document.getElementById('tabela-auditoria-bancada');
    if (tbody && bancadaEncontrada && bancadaEncontrada.materiais) {
        const partes = bancadaEncontrada.materiais.split(',').map(s => s.trim()).filter(Boolean);
        if (partes.length > 0) {
            tbody.innerHTML = partes.map((itemStr, idx) => {
                const match = itemStr.match(/^([0-9.]+x|[0-9.]+m)\s+(.*)$/i);
                const qtd = match ? match[1] : '1 un';
                const nome = match ? match[2] : itemStr;
                const cod = 'INS-0' + (idx + 1);
                return `
                    <tr>
                        <td><strong>${nome}</strong> (${cod})</td>
                        <td>${qtd}</td>
                        <td><span style="color:#10b981; font-weight:600;">${qtd} conferido(s)</span></td>
                        <td>Em perfeito estado</td>
                        <td style="text-align:center;"><span class="badge" style="background:#dcfce7; color:#15803d;">OK</span></td>
                    </tr>
                `;
            }).join('');
        }
    }
};

window.simularAlunoBancada = function(alunoId) {
    window.alunoSimuladoId = alunoId;
    window.renderAlunoBancada(alunoId);
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

    // Obter todos os alunos cadastrados nesta turma
    const alunosTurma = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tF = turmaFiltro.toLowerCase();
        return aT.includes(tF) || tF.includes(aT) ||
               (tF.includes('manhã') && aT.includes('manhã')) ||
               (tF.includes('tarde') && aT.includes('tarde')) ||
               (tF.includes('noite') && aT.includes('noite'));
    });

    // Filtrar bancadas pertencentes à turma selecionada
    let bancadasTurma = (window.bancadasCheckinMock || []).filter(b => {
        if (!b.turma || b.turma === 'Todas as Turmas') return true;
        const bT = b.turma.toLowerCase();
        const tF = turmaFiltro.toLowerCase();
        return bT.includes(tF) || tF.includes(bT) ||
               (tF.includes('manhã') && bT.includes('manhã')) ||
               (tF.includes('tarde') && bT.includes('tarde')) ||
               (tF.includes('noite') && bT.includes('noite'));
    });

    // Se a turma ainda não tiver bancadas cadastradas, gera o conjunto padrão inicial
    if (bancadasTurma.length === 0) {
        const padrao = [
            { numero: 'Bancada 01', tipo: 'Máquina Reta Industrial (Zoje A6000)', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: '1x Tesoura Arremate, 2x Linhas 120, 1x Fita Métrica', divergenciaTexto: '', observacao: 'Bancada pronta para prática.' },
            { numero: 'Bancada 02', tipo: 'Máquina Overlock Industrial (Siruba 747)', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: '3x Cones Fio Overlock, 1x Pinça Curva', divergenciaTexto: '', observacao: 'Bancada pronta para prática.' },
            { numero: 'Bancada 03', tipo: 'Máquina Galoneira Plana (Jack W4)', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: '1x Pinça, 3x Cones Helanca, 1x Tesoura Arremate', divergenciaTexto: '', observacao: 'Bancada pronta para prática.' },
            { numero: 'Bancada 04', tipo: 'Máquina Reta Industrial (Juki DDL-8700)', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: '1x Tesoura Mundial, 2x Bobinas, 1x Fita Métrica', divergenciaTexto: '', observacao: 'Bancada pronta para prática.' },
            { numero: 'Bancada 05', tipo: 'Máquina Pespontadeira Dupla (Lanmax)', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: '2x Bobinas Linha Pesada, 1x Guia Magnético', divergenciaTexto: '', observacao: 'Bancada pronta para prática.' },
            { numero: 'Bancada 06', tipo: 'Mesa de Modelagem & Encaixe', turma: turmaFiltro, alunoNome: 'Aguardando Alocação', alunoMatricula: 'LIVRE', status: 'pendente', horario: '--:--', auditoria: 'ok', materiais: 'Carretilha, Régua Alfaiate, Papel Kraft', divergenciaTexto: '', observacao: 'Bancada de corte e modelagem.' }
        ];
        padrao.forEach(p => window.bancadasCheckinMock.push(p));
        bancadasTurma = padrao;
        try { localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock)); } catch(e) {}
    }

    // Atualizar contadores KPI da turma selecionada
    const total = bancadasTurma.length;
    const confirmados = bancadasTurma.filter(b => b.status === 'confirmado' && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE').length;
    const auditoriasOk = bancadasTurma.filter(b => b.auditoria === 'ok').length;
    const divergencias = bancadasTurma.filter(b => b.status === 'divergencia').length;

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
    bancadasTurma.forEach(b => {
        let badgeStatus = '';
        let statusClass = `status-${b.status}`;
        
        if (b.status === 'confirmado' && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE') {
            badgeStatus = `<span style="background:rgba(16,185,129,0.1); color:#10b981; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">verified</span> Check-in OK (${b.horario || '08:00'})
            </span>`;
        } else if (b.status === 'divergencia') {
            badgeStatus = `<span style="background:rgba(245,158,11,0.15); color:#d97706; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">warning</span> Divergência (${b.horario || '08:00'})
            </span>`;
        } else {
            badgeStatus = `<span style="background:rgba(148,163,184,0.15); color:#64748b; font-weight:700; font-size:12px; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:4px;">
                <span class="material-icons-outlined" style="font-size:16px;">hourglass_empty</span> Aguardando Alocação
            </span>`;
        }

        const isOcupada = b.alunoMatricula && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE';
        const initialLetter = isOcupada ? b.alunoNome.charAt(0).toUpperCase() : '?';

        // Opções do select de alunos para esta bancada
        let optionsAlunos = `<option value="LIVRE" ${!isOcupada ? 'selected' : ''}>-- Ninguém Alocado (Bancada Livre) --</option>`;
        alunosTurma.forEach(al => {
            const isSel = (b.alunoMatricula === al.id || b.alunoNome === al.nome) ? 'selected' : '';
            optionsAlunos += `<option value="${al.id}" ${isSel}>${al.nome} (${al.id})${al.presente ? ' [Presente]' : ''}</option>`;
        });

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

                    <!-- Organização / Alocação do Aluno -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; display:flex; align-items:center; gap:4px; margin:0;">
                                <span class="material-icons-outlined" style="font-size:15px; color:var(--primary-color);">person</span> Aluno da Turma:
                            </label>
                            <span style="font-size:11px; font-weight:800; color:${isOcupada ? '#10b981' : '#94a3b8'};">
                                ${isOcupada ? '● Ocupada' : '○ Disponível'}
                            </span>
                        </div>
                        <select onchange="alocarAlunoBancadaDirect('${b.numero}', this.value, '${turmaFiltro}')" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); font-size:12.5px; font-weight:600; background:white; color:#0b2341; cursor:pointer;">
                            ${optionsAlunos}
                        </select>
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
                        <span class="material-icons-outlined" style="font-size:16px; color:var(--primary-color);">edit</span> Editar Insumos
                    </button>

                    ${b.status === 'divergencia' ? `
                        <button type="button" class="checkin-action-btn btn-resolver" onclick="resolverDivergenciaBancadaProf('${b.numero}')">
                            <span class="material-icons-outlined" style="font-size:16px;">handyman</span> Resolver
                        </button>
                    ` : `
                        <button type="button" class="checkin-action-btn btn-validar" onclick="validarCheckinBancadaProf('${b.numero}')">
                            <span class="material-icons-outlined" style="font-size:16px;">check_circle</span> Validar
                        </button>
                    `}
                    
                    <button type="button" class="checkin-action-btn btn-notify" onclick="abrirModalNovoAvisoProfessor('${b.numero}', '${b.turma}', '${b.alunoNome}')">
                        <span class="material-icons-outlined" style="font-size:16px;">campaign</span> Notificar
                    </button>

                    <button type="button" class="checkin-action-btn btn-delete" onclick="excluirBancadaProf('${b.numero}', '${turmaFiltro}')" title="Apagar e remover esta bancada do laboratório">
                        <span class="material-icons-outlined" style="font-size:16px;">delete</span> Apagar
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

// Adicionar Aluno Rápido
window.adicionarNovoAlunoRapidoModal = function() {
    const nome = prompt('Digite o nome completo do aluno:');
    if (!nome || !nome.trim()) return;
    const turma = document.getElementById('gerenciar-bancada-turma') ? document.getElementById('gerenciar-bancada-turma').value : 'Vestuário e Estilismo - Manhã';
    const novoId = 'ALU-' + Math.floor(1000 + Math.random() * 9000);
    if (!Array.isArray(window.mockAlunosDiario)) window.mockAlunosDiario = [];
    window.mockAlunosDiario.push({ id: novoId, nome: nome.trim(), turma: turma, presente: true });
    window.carregarAlunosTurmaModal(turma, [{ matricula: novoId, nome: nome.trim() }]);
    if (typeof window.mostrarToast === 'function') window.mostrarToast('Aluno Adicionado', `${nome.trim()} adicionado à turma.`, 'success');
};

// Selecionar Tipo Máquina Modal
window.selecionarTipoMaquinaModal = function(val) {
    const custom = document.getElementById('gerenciar-bancada-tipo-custom');
    if (custom) {
        custom.style.display = (val === 'OUTRO') ? 'block' : 'none';
        if (val !== 'OUTRO') custom.value = '';
    }
};

// Abrir Modal para Nova Bancada (Professor pode cadastrar quantas quiser)
window.abrirModalNovaBancadaProf = function() {
    const form = document.getElementById('form-gerenciar-bancada-prof');
    if (form) form.reset();
    document.getElementById('gerenciar-bancada-edit-orig-numero').value = '';
    document.getElementById('modal-gerenciar-bancada-titulo').innerText = 'Adicionar Nova Bancada à Turma';
    document.getElementById('modal-gerenciar-bancada-sub').innerText = 'Defina o equipamento, aloque os alunos e configure o kit de materiais.';

    // Ocultar botão de apagar no modal de criação
    const btnDel = document.getElementById('btn-excluir-bancada-modal');
    if (btnDel) btnDel.style.display = 'none';

    const turmaAtual = document.getElementById('prof-checkin-turma-select') ? document.getElementById('prof-checkin-turma-select').value : (document.getElementById('diario-turma-select') ? document.getElementById('diario-turma-select').value : 'Vestuário e Estilismo - Manhã');
    const selTurmaModal = document.getElementById('gerenciar-bancada-turma');
    if (selTurmaModal) selTurmaModal.value = turmaAtual;

    // Sugerir próximo número de bancada sequencial
    const bancadasTurma = (window.bancadasCheckinMock || []).filter(b => !b.turma || b.turma === turmaAtual);
    const count = bancadasTurma.length + 1;
    document.getElementById('gerenciar-bancada-numero').value = 'Bancada ' + String(count).padStart(2, '0');

    window.materiaisModalEdicao = [];
    window.renderMateriaisModalTbody();
    window.populateNovoMatEstoqueSelect();

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

    // Exibir botão de apagar no modal de edição
    const btnDel = document.getElementById('btn-excluir-bancada-modal');
    if (btnDel) btnDel.style.display = 'inline-flex';

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
            const matchQtd = pTrim.match(/^([0-9.]+)[x|m]?\s+(.*)/i);
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
    if (b.alunoNome && b.alunoMatricula && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE') {
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
    let alunoNome = 'Aguardando Alocação';
    let alunoMatricula = 'LIVRE';
    if (checkedBoxes.length === 1) {
        alunoNome = checkedBoxes[0].getAttribute('data-nome');
        alunoMatricula = checkedBoxes[0].value;
    } else if (checkedBoxes.length > 1) {
        const nomes = checkedBoxes.map(c => c.getAttribute('data-nome').split(' ')[0]);
        alunoNome = nomes.join(' & ');
        alunoMatricula = checkedBoxes.map(c => c.value).join(', ');
    }

    // Coletar materiais em texto
    let matsTexto = (window.materiaisModalEdicao || []).map(m => `${m.qtdEsperada}x ${m.nome}`).join(', ');
    if (!matsTexto) matsTexto = 'Kit Básico de Costura & Insumos';

    if (!Array.isArray(window.bancadasCheckinMock)) window.bancadasCheckinMock = [];

    const existingIdx = origNumero ? window.bancadasCheckinMock.findIndex(b => b.numero === origNumero && (!b.turma || b.turma === turma)) : -1;
    const isAlocado = alunoMatricula && alunoMatricula !== 'LIVRE' && alunoMatricula !== 'PENDENTE';
    const bancadaObj = {
        numero: numero,
        tipo: tipoFinal,
        turma: turma,
        alunoNome: alunoNome,
        alunoMatricula: alunoMatricula,
        status: isAlocado ? 'confirmado' : 'pendente',
        horario: isAlocado ? (typeof window.getHoraMinutoLocal === 'function' ? window.getHoraMinutoLocal() : '08:00') : '--:--',
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
    if (typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Bancada Salva com Sucesso!', `${numero} configurada com ${(window.materiaisModalEdicao || []).length} materiais e alocada para ${alunoNome}.`, 'success');
    }
};

// Excluir / Apagar Bancada pelo Professor
window.excluirBancadaProf = function(numeroBancada, turma) {
    if (!confirm(`Deseja realmente apagar a "${numeroBancada}"? Esta ação removerá a máquina e a alocação de alunos do laboratório.`)) return;

    if (!Array.isArray(window.bancadasCheckinMock)) return;
    const idx = window.bancadasCheckinMock.findIndex(b => b.numero === numeroBancada && (!turma || b.turma === turma));
    if (idx >= 0) {
        window.bancadasCheckinMock.splice(idx, 1);
        try {
            localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
        } catch(e) {}

        if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
        if (typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Bancada Apagada', `${numeroBancada} foi removida com sucesso.`, 'info');
        } else {
            alert(`Bancada ${numeroBancada} apagada com sucesso!`);
        }
    }
};

window.excluirBancadaModalProf = function() {
    const origNumero = document.getElementById('gerenciar-bancada-edit-orig-numero').value;
    const turma = document.getElementById('gerenciar-bancada-turma').value;
    if (!origNumero) return;
    closeModal('modal-gerenciar-bancada-prof');
    window.excluirBancadaProf(origNumero, turma);
};

// Alocação direta de um aluno para uma bancada específica
window.alocarAlunoBancadaDirect = function(numeroBancada, alunoMatricula, turma) {
    if (!Array.isArray(window.bancadasCheckinMock)) return;
    const b = window.bancadasCheckinMock.find(it => it.numero === numeroBancada && (!turma || it.turma === turma));
    if (!b) return;

    if (!alunoMatricula || alunoMatricula === 'LIVRE') {
        b.alunoNome = 'Aguardando Alocação';
        b.alunoMatricula = 'LIVRE';
        b.status = 'pendente';
        b.horario = '--:--';
        b.observacao = 'Bancada livre aguardando novo credenciamento.';
    } else {
        const aluno = (window.mockAlunosDiario || []).find(a => a.id === alunoMatricula);
        if (aluno) {
            // Desalocar este aluno de qualquer outra bancada desta mesma turma
            window.bancadasCheckinMock.forEach(other => {
                if (other.numero !== numeroBancada && (!turma || other.turma === turma) && other.alunoMatricula === alunoMatricula) {
                    other.alunoNome = 'Aguardando Alocação';
                    other.alunoMatricula = 'LIVRE';
                    other.status = 'pendente';
                    other.horario = '--:--';
                    other.observacao = 'Bancada liberada após remanejamento do aluno.';
                }
            });

            b.alunoNome = aluno.nome;
            b.alunoMatricula = aluno.id;
            b.status = aluno.presente ? 'confirmado' : 'pendente';
            b.horario = aluno.presente ? (typeof window.getHoraMinutoLocal === 'function' ? window.getHoraMinutoLocal() : '08:00') : '--:--';
            b.observacao = `Aluno ${aluno.nome} vinculado à bancada com sucesso.`;
        }
    }

    try {
        localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
    } catch(e) {}

    if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
    if (typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Organização Salva', `${b.numero}: ${b.alunoNome}`, 'success');
    }
};

// Organizar automaticamente os alunos matriculados da turma nas bancadas
window.autoDistribuirAlunosTurma = function(turma) {
    if (!turma) {
        const tSel = document.getElementById('prof-checkin-turma-select') || document.getElementById('diario-turma-select');
        turma = tSel ? tSel.value : 'Vestuário e Estilismo - Manhã';
    }

    const alunosTurma = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tF = turma.toLowerCase();
        return aT.includes(tF) || tF.includes(aT) ||
               (tF.includes('manhã') && aT.includes('manhã')) ||
               (tF.includes('tarde') && aT.includes('tarde')) ||
               (tF.includes('noite') && aT.includes('noite'));
    });

    const bancadas = (window.bancadasCheckinMock || []).filter(b => {
        if (!b.turma || b.turma === 'Todas as Turmas') return true;
        const bT = b.turma.toLowerCase();
        const tF = turma.toLowerCase();
        return bT.includes(tF) || tF.includes(bT) ||
               (tF.includes('manhã') && bT.includes('manhã')) ||
               (tF.includes('tarde') && bT.includes('tarde')) ||
               (tF.includes('noite') && bT.includes('noite'));
    });

    if (bancadas.length === 0) {
        alert('Nenhuma bancada cadastrada nesta turma ainda. Use o botão "+ Adicionar Bancada" para criar.');
        return;
    }

    bancadas.forEach((b, idx) => {
        if (idx < alunosTurma.length) {
            const al = alunosTurma[idx];
            b.alunoNome = al.nome;
            b.alunoMatricula = al.id;
            b.status = al.presente ? 'confirmado' : 'pendente';
            b.horario = al.presente ? '08:00' : '--:--';
            b.observacao = `Aluno ${al.nome} distribuído automaticamente pelo sistema.`;
        } else {
            b.alunoNome = 'Aguardando Alocação';
            b.alunoMatricula = 'LIVRE';
            b.status = 'pendente';
            b.horario = '--:--';
            b.observacao = 'Bancada livre aguardando aluno.';
        }
    });

    try {
        localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
    } catch(e) {}

    if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
    if (typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();

    const totalAlocados = Math.min(alunosTurma.length, bancadas.length);
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Alunos Organizados', `${totalAlocados} alunos organizados nas bancadas com sucesso!`, 'success');
    } else {
        alert(`${totalAlocados} alunos organizados nas bancadas com sucesso!`);
    }
};

// Desalocar todos os alunos das bancadas da turma
window.limparAlocacoesBancadas = function(turma) {
    if (!turma) {
        const tSel = document.getElementById('prof-checkin-turma-select') || document.getElementById('diario-turma-select');
        turma = tSel ? tSel.value : 'Vestuário e Estilismo - Manhã';
    }
    if (!confirm(`Deseja realmente desalocar todos os alunos das bancadas da turma "${turma}"? As bancadas ficarão livres para nova organização.`)) return;

    (window.bancadasCheckinMock || []).forEach(b => {
        if (!b.turma || b.turma === 'Todas as Turmas' || b.turma.toLowerCase().includes(turma.toLowerCase()) || turma.toLowerCase().includes(b.turma.toLowerCase())) {
            b.alunoNome = 'Aguardando Alocação';
            b.alunoMatricula = 'LIVRE';
            b.status = 'pendente';
            b.horario = '--:--';
            b.observacao = 'Bancada livre aguardando novo credenciamento.';
        }
    });

    try {
        localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
    } catch(e) {}

    if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
    if (typeof window.renderDiarioBancadasAlocacao === 'function') window.renderDiarioBancadasAlocacao();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Bancadas Liberadas', 'Todas as bancadas foram desocupadas e estão prontas para nova alocação.', 'info');
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
    const salas = (window.mockSalas || mockSalas || []);
    return salas.map((s, idx) => {
        const n = s.nome || ('Sala ' + (idx + 1));
        let tipo = s.tipo || 'Modelagem & Costura Industrial de Vestuário';
        let icon = 'meeting_room';
        if (n.toLowerCase().includes('modelagem')) { tipo = s.tipo || 'Modelagem & Encaixe'; icon = 'straighten'; }
        else if (n.toLowerCase().includes('costura')) { tipo = s.tipo || 'Costura Industrial & Overlock'; icon = 'precision_manufacturing'; }
        else if (n.toLowerCase().includes('estoque')) { tipo = s.tipo || 'Almoxarifado & Logística Têxtil'; icon = 'inventory_2'; }
        return {
            id: 'sala-' + (s.id || idx + 1),
            nome: n,
            tipo: tipo,
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

    // Obter todos os alunos cadastrados nesta turma
    const alunosTurma = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tT = turmaEscolhida.toLowerCase();
        return aT.includes(tT) || tT.includes(aT) || 
               (tT.includes('manhã') && aT.includes('manhã')) ||
               (tT.includes('tarde') && aT.includes('tarde')) ||
               (tT.includes('noite') && aT.includes('noite'));
    });

    // Obter bancadas cadastradas para esta turma
    let bancadas = (window.bancadasCheckinMock || []).filter(b => {
        if (!b.turma || b.turma === 'Todas as Turmas') return true;
        const bT = b.turma.toLowerCase();
        const tF = turmaEscolhida.toLowerCase();
        return bT.includes(tF) || tF.includes(bT) ||
               (tF.includes('manhã') && bT.includes('manhã')) ||
               (tF.includes('tarde') && bT.includes('tarde')) ||
               (tF.includes('noite') && bT.includes('noite'));
    });

    if (bancadas.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:35px 20px; background:white; border:2px dashed #cbd5e1; border-radius:12px;">
                <span class="material-icons-outlined" style="font-size:42px; color:#94a3b8; margin-bottom:8px;">precision_manufacturing</span>
                <h4 style="margin:0 0 6px; color:#0b2341; font-size:16px;">Nenhuma Bancada Cadastrada para esta Turma</h4>
                <p style="margin:0 0 16px; font-size:13px; color:var(--text-secondary);">Cadastre quantas bancadas e máquinas desejar para organizar os alunos desta turma.</p>
                <button type="button" class="btn btn-primary" onclick="abrirModalNovaBancadaProf()" style="display:inline-flex; align-items:center; gap:8px;">
                    <span class="material-icons-outlined" style="font-size:18px;">add</span> Cadastrar Nova Bancada
                </button>
            </div>
        `;
        return;
    }

    bancadas.forEach((b) => {
        const isOcupada = b.alunoMatricula && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE';
        
        // Montar opções de alunos da turma para alocação direta
        let optionsAlunos = `<option value="LIVRE" ${!isOcupada ? 'selected' : ''}>-- Bancada Livre / Desalocada --</option>`;
        alunosTurma.forEach(al => {
            const isSel = (b.alunoMatricula === al.id || b.alunoNome === al.nome) ? 'selected' : '';
            const statusPresenca = al.presente ? ' [Presente]' : ' [Ausente]';
            optionsAlunos += `<option value="${al.id}" ${isSel}>${al.nome} (${al.id})${statusPresenca}</option>`;
        });

        grid.innerHTML += `
            <div style="background:#ffffff; border:1px solid ${isOcupada ? '#bbf7d0' : '#e2e8f0'}; border-radius:12px; padding:16px; box-shadow:var(--shadow-sm); border-left:5px solid ${isOcupada ? '#10b981' : '#cbd5e1'}; display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                        <div>
                            <div style="font-weight:800; font-size:15px; color:#0b2341; display:flex; align-items:center; gap:6px;">
                                <span class="material-icons-outlined" style="font-size:20px; color:${isOcupada ? '#10b981' : '#64748b'};">precision_manufacturing</span>
                                ${b.numero}
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${b.tipo}</div>
                        </div>
                        <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px; background:${isOcupada ? '#dcfce7' : '#f1f5f9'}; color:${isOcupada ? '#15803d' : '#64748b'}; display:inline-flex; align-items:center; gap:4px;">
                            ${isOcupada ? '● Ocupada' : '○ Disponível'}
                        </span>
                    </div>

                    <!-- Seletor de Aluno Direto -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; margin-top:8px;">
                        <label style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                            <span class="material-icons-outlined" style="font-size:14px; color:var(--primary-color);">person</span> Aluno Alocado:
                        </label>
                        <select onchange="alocarAlunoBancadaDirect('${b.numero}', this.value, '${turmaEscolhida}')" style="width:100%; padding:6px 8px; border-radius:6px; border:1px solid var(--border-color); font-size:12px; font-weight:600; background:white; color:#0b2341; cursor:pointer;">
                            ${optionsAlunos}
                        </select>
                    </div>

                    <div style="font-size:11.5px; color:var(--text-secondary); margin-top:10px; line-height:1.4;">
                        <strong>Insumos:</strong> ${b.materiais || 'Kit Padrão'}
                    </div>
                </div>

                <!-- Ações Rápidas da Bancada -->
                <div style="display:flex; justify-content:space-between; align-items:center; pt-2; border-top:1px solid #f1f5f9; padding-top:8px;">
                    <button type="button" onclick="abrirModalEditarBancadaProf('${b.numero}')" style="background:transparent; border:1px solid #e2e8f0; border-radius:6px; padding:4px 8px; font-size:11.5px; font-weight:700; color:var(--text-primary); cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                        <span class="material-icons-outlined" style="font-size:14px; color:var(--primary-color);">edit</span> Editar
                    </button>
                    <button type="button" onclick="excluirBancadaProf('${b.numero}', '${turmaEscolhida}')" style="background:transparent; border:1px solid #fee2e2; border-radius:6px; padding:4px 8px; font-size:11.5px; font-weight:700; color:#ef4444; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
                        <span class="material-icons-outlined" style="font-size:14px;">delete</span> Apagar
                    </button>
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



// =========================================================================
// SENAIVEST 2.0 - ATUALIZAÇÃO INTEGRADA (9 CORREÇÕES E NOVOS MÓDULOS)
// =========================================================================

// -------------------------------------------------------------------------
// 1. CORREÇÃO DE BOLETINS: PREENCHIMENTO AUTOMÁTICO & LISTAGEM GARANTIDA
// -------------------------------------------------------------------------
(function() {
    const origAbrirFormBoletim = window.abrirFormularioBoletim;
    window.abrirFormularioBoletim = function(catId, catTitle) {
        if (typeof origAbrirFormBoletim === 'function') {
            origAbrirFormBoletim(catId, catTitle);
        }
        const codGerado = `BOL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const bfCodigo = document.getElementById('bf-codigo');
        if (bfCodigo) bfCodigo.value = codGerado;
        const bfBadge = document.getElementById('bf-codigo-badge');
        if (bfBadge) bfBadge.innerText = `Código: ${codGerado}`;

        const bfData = document.getElementById('bf-data');
        if (bfData) {
            const now = new Date();
            const tzOffset = now.getTimezoneOffset() * 60000;
            bfData.value = new Date(now - tzOffset).toISOString().slice(0, 16);
        }

        const bfAutor = document.getElementById('bf-autor');
        if (bfAutor) {
            bfAutor.value = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
        }

        const bfPlano = document.getElementById('bf-plano');
        if (bfPlano) {
            bfPlano.innerHTML = '<option value="Nenhum / Ocorrência Avulsa">Nenhum / Ocorrência Avulsa</option>';
            const planos = Array.isArray(window.mockPlanos) ? window.mockPlanos : [];
            planos.forEach(p => {
                const label = `${p.id || 'PLAN'} - ${p.plano || p.tema || 'Aula Prática'}`;
                bfPlano.innerHTML += `<option value="${label}">${label}</option>`;
            });
        }
    };
})();

// -------------------------------------------------------------------------
// 2. AVISO DE DEVOLUÇÃO SOMENTE QUANDO MATERIAL FOR DESLOCADO ENTRE SALAS
// -------------------------------------------------------------------------
window.sincronizarControleApenasDeslocados = function() {
    if (!Array.isArray(window.planosAulasControle)) window.planosAulasControle = [];
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];

    // Verificar quais materiais estão fisicamente deslocados do seu almoxarifado de origem
    const deslocados = mats.filter(m => m.almoxOrigem && m.almoxAtual && m.almoxOrigem !== m.almoxAtual);

    // Remover falsos atrasos estáticos (como PLAN-2026-01) que não correspondem a deslocamento real
    window.planosAulasControle = window.planosAulasControle.filter(p => {
        if (p.status === 'devolvido') return true;
        if (p.id === 'PLAN-2026-01' && !p.materialDeslocado) return false;
        if (p.materialDeslocado) return true;
        if (p.salaOrigem && p.salaUso && p.salaOrigem !== p.salaUso) return true;
        return false;
    });

    // Para cada material deslocado que ainda não tenha card ativo de devolução, criar o alerta de devolução
    deslocados.forEach(m => {
        const cod = m.cod || m.codigo || 'MAT';
        const jaExiste = window.planosAulasControle.some(p =>
            p.status !== 'devolvido' &&
            ((p.codMaterialDeslocado === cod) || (p.materiaisTexto && p.materiaisTexto.includes(m.nome)))
        );
        if (!jaExiste) {
            window.planosAulasControle.unshift({
                id: `DESL-${cod}`,
                codMaterialDeslocado: cod,
                materialDeslocado: true,
                tema: `Material Deslocado: ${m.nome}`,
                turma: 'Uso Laboratorial / Transferência entre Salas',
                professorId: (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567',
                professorNome: m.responsavel || ((currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo'),
                salaUso: m.almoxAtual,
                salaOrigem: m.almoxOrigem,
                localizacaoOrigem: `${m.almoxOrigem} (${m.local || 'Prateleira Principal'})`,
                materiaisTexto: `${m.qtd} un. de ${m.nome} (${cod}) — deslocado de ${m.almoxOrigem} para ${m.almoxAtual}`,
                horarioRetirada: `Hoje às ${m.horarioEntrada || '08:00'}`,
                horarioLimite: 'Devolução Pendente ao Almoxarifado de Origem',
                timestampRetirada: Date.now() - 3600000,
                timestampLimite: Date.now() - 60000,
                status: 'atrasado',
                devolucao: null
            });
        }
    });

    if (typeof salvarPlanosAulasStorage === 'function') salvarPlanosAulasStorage();
};

// Limpar dados mockados iniciais que geravam falso positivo de material atrasado
(function limparFalsosAtrasosIniciais() {
    try {
        const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
        // Se for apenas o estado default inicial onde MAT-001/003/004 vinham com almoxOrigem != almoxAtual sem transferência real
        const jaTeveTransferenciaReal = localStorage.getItem('senaivest_transferencia_real_ativa');
        if (!jaTeveTransferenciaReal) {
            mats.forEach(m => {
                if (m.almoxAtual) m.almoxOrigem = m.almoxAtual;
            });
            if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
        }
    } catch (e) {}
    window.sincronizarControleApenasDeslocados();
})();

// Sobrescrever confirmarDevolucaoComFoto para restaurar o material deslocado à sala de origem
const origConfirmarDevolucaoComFoto = window.confirmarDevolucaoComFoto;
window.confirmarDevolucaoComFoto = function() {
    const planoId = document.getElementById('dev-plano-id') ? document.getElementById('dev-plano-id').value : '';
    const plano = (window.planosAulasControle || []).find(p => p.id === planoId);
    if (plano && fotoDevolucaoTemp) {
        const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
        mats.forEach(m => {
            const cod = m.cod || m.codigo || '';
            if (plano.codMaterialDeslocado === cod || (plano.materiaisTexto && plano.materiaisTexto.includes(m.nome))) {
                if (m.almoxOrigem) {
                    m.almoxAtual = m.almoxOrigem;
                }
            }
        });
        if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();

        if (typeof window.registrarMovimentacaoEstoque === 'function') {
            window.registrarMovimentacaoEstoque({
                tipo: 'Entrada',
                cod: plano.codMaterialDeslocado || plano.id,
                material: plano.materiaisTexto,
                qtd: 1,
                origem: plano.salaUso,
                destino: plano.salaOrigem,
                usuario: (currentUser && currentUser.nome) ? currentUser.nome : plano.professorNome,
                cargo: (currentUser && currentUser.role) ? currentUser.role : 'Professor',
                vinculo: `Devolução com Foto (${plano.id})`,
                fotoComprovante: fotoDevolucaoTemp
            });
        }
    }
    if (typeof origConfirmarDevolucaoComFoto === 'function') {
        origConfirmarDevolucaoComFoto();
    }
    window.sincronizarControleApenasDeslocados();
    if (typeof renderSalas === 'function') renderSalas();
    if (typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
    if (typeof renderPainelAtrasosCoord === 'function') renderPainelAtrasosCoord();
    if (typeof renderAlertasAutomaticosEstoque === 'function') renderAlertasAutomaticosEstoque();
};

// -------------------------------------------------------------------------
// 3. PORTAL DO ALUNO: CONFERÊNCIA FÍSICA INTERATIVA, BANCADA EXCLUSIVA E CÁLCULO EXATO DE FECHAMENTO
// -------------------------------------------------------------------------
window.itensAuditoriaAlunoState = [];

window.renderAlunoBancada = function() {
    const alunosLista = Array.isArray(window.mockAlunosDiario) && window.mockAlunosDiario.length > 0
        ? window.mockAlunosDiario
        : [
            { id: 'ALU-001', nome: 'Pedro Santos', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-002', nome: 'João Silva', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-003', nome: 'Carlos Eduardo', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-004', nome: 'Mariana Souza', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-005', nome: 'Ana Clara Lima', turma: 'Vestuário e Estilismo - Manhã' },
            { id: 'ALU-006', nome: 'Lucas Ferreira', turma: 'Vestuário e Estilismo - Manhã' }
        ];

    // Vincular estritamente ao aluno logado (sem permitir acessar bancadas de terceiros)
    const matAlvo = (currentUser && currentUser.role === 'Aluno' && currentUser.id) ? currentUser.id : 'ALU-001';
    const nomeAlvo = (currentUser && currentUser.role === 'Aluno' && currentUser.nome) ? currentUser.nome : 'Pedro Santos';

    const bancadas = Array.isArray(window.bancadasCheckinMock) ? window.bancadasCheckinMock : [];
    const alunoObj = alunosLista.find(a => a.id === matAlvo || a.nome.toLowerCase() === nomeAlvo.toLowerCase()) || { id: matAlvo, nome: nomeAlvo, turma: 'Vestuário e Estilismo - Manhã' };

    const bancadaEncontrada = bancadas.find(b =>
        (b.alunoMatricula && b.alunoMatricula.toLowerCase().includes(matAlvo.toLowerCase())) ||
        (b.alunoNome && b.alunoNome.toLowerCase().includes(alunoObj.nome.toLowerCase()))
    ) || bancadas[0];

    if (bancadaEncontrada) {
        window.alunoBancadaAtual.numero = bancadaEncontrada.numero;
        window.alunoBancadaAtual.tipo = bancadaEncontrada.tipo;
        window.alunoBancadaAtual.turma = bancadaEncontrada.turma || 'Vestuário e Estilismo - Manhã';
        window.alunoBancadaAtual.checkin = (bancadaEncontrada.status === 'confirmado');
        window.alunoBancadaAtual.materiaisTextoBruto = bancadaEncontrada.materiais || '1x Tesoura de Arremate Mundial, 2x Linha 120, 1x Fita Métrica 150cm, 4.0m Algodão Cru';
    }

    const labelExclusiva = document.getElementById('aluno-logado-bancada-label');
    if (labelExclusiva) {
        labelExclusiva.innerText = `Aluno(a): ${alunoObj.nome} (${alunoObj.id}) • ${window.alunoBancadaAtual.numero}`;
    }

    const displayNum = document.getElementById('bancada-numero-display');
    if (displayNum) displayNum.innerText = `${window.alunoBancadaAtual.numero} - ${window.alunoBancadaAtual.tipo}`;
    const planoDisplay = document.getElementById('bancada-plano-nome');
    if (planoDisplay) planoDisplay.innerText = window.alunoBancadaAtual.plano;

    const btnCheckinText = document.getElementById('btn-checkin-text');
    if (btnCheckinText) {
        btnCheckinText.innerText = window.alunoBancadaAtual.checkin ? 'Check-in Realizado' : 'Confirmar Presença na Bancada';
    }

    // Construir lista interativa de itens para conferência física do aluno
    const bruto = window.alunoBancadaAtual.materiaisTextoBruto || '1x Tesoura de Arremate Mundial, 2x Linha 120, 1x Fita Métrica 150cm, 4.0m Algodão Cru';
    const partes = bruto.split(',').map(s => s.trim()).filter(Boolean);

    let tecidoPrincipalNome = 'Algodão Cru (INS-04)';
    let tecidoPrincipalQtd = 4.0;

    window.itensAuditoriaAlunoState = partes.map((itemStr, idx) => {
        const match = itemStr.match(/^([0-9.]+)\s*(x|m|un|metros|unidades)?\s+(.*)$/i);
        const qtdNum = match ? parseFloat(match[1]) : 1;
        const unidRaw = match && match[2] ? match[2].toLowerCase() : (itemStr.toLowerCase().includes('algodão') || itemStr.toLowerCase().includes('tecido') || itemStr.toLowerCase().includes('seda') ? 'm' : 'x');
        const unid = (unidRaw === 'metros' || unidRaw === 'm') ? 'm' : 'x';
        const nome = match ? match[3] : itemStr;
        const cod = 'INS-0' + (idx + 1);

        if (unid === 'm' || nome.toLowerCase().includes('algodão') || nome.toLowerCase().includes('tecido') || nome.toLowerCase().includes('seda') || nome.toLowerCase().includes('malha')) {
            tecidoPrincipalNome = `${nome} (${cod})`;
            tecidoPrincipalQtd = qtdNum;
        }

        return {
            idx: idx,
            cod: cod,
            nome: nome,
            qtdSistema: qtdNum,
            unidade: unid,
            qtdFisica: qtdNum,
            conferido: true,
            condicao: 'Em perfeito estado',
            status: 'OK'
        };
    });

    window.alunoBancadaAtual.nomeTecidoAtribuido = tecidoPrincipalNome;
    window.alunoBancadaAtual.qtdTecidoAtribuida = tecidoPrincipalQtd;

    window.renderTabelaAuditoriaInterativaAluno();
    window.inicializarCamposFechamentoBancadaAluno();
};

window.renderTabelaAuditoriaInterativaAluno = function() {
    const tbody = document.getElementById('tabela-auditoria-bancada');
    if (!tbody) return;

    tbody.innerHTML = window.itensAuditoriaAlunoState.map((it, i) => {
        const isOk = it.conferido && Number(it.qtdFisica) === Number(it.qtdSistema) && it.condicao === 'Em perfeito estado';
        it.status = isOk ? 'OK' : 'Divergência';

        const statusBadge = isOk
            ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700;">OK</span>`
            : `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Divergência</span>`;

        return `
            <tr style="background:${isOk ? 'transparent' : '#fff1f2'};">
                <td>
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;">
                        <input type="checkbox" ${it.conferido ? 'checked' : ''} onchange="window.atualizarConferenciaItemAluno(${i}, 'conferido', this.checked)" style="width:16px; height:16px; accent-color:#10b981; cursor:pointer;">
                        <span><strong>${it.nome}</strong> (${it.cod})</span>
                    </label>
                </td>
                <td style="font-weight:700; color:#334155;">${it.qtdSistema}${it.unidade}</td>
                <td>
                    <div style="display:inline-flex; align-items:center; gap:6px;">
                        <input type="number" step="${it.unidade === 'm' ? '0.1' : '1'}" min="0" value="${it.qtdFisica}"
                            oninput="window.atualizarConferenciaItemAluno(${i}, 'qtdFisica', this.value)"
                            style="width:74px; padding:5px 8px; border:1px solid ${isOk ? '#10b981' : '#ef4444'}; border-radius:6px; font-weight:700; color:${isOk ? '#059669' : '#b91c1c'}; background:white;">
                        <span style="font-size:12px; font-weight:600; color:#64748b;">${it.unidade} conferido(s)</span>
                    </div>
                </td>
                <td>
                    <select onchange="window.atualizarConferenciaItemAluno(${i}, 'condicao', this.value)"
                        style="padding:6px 10px; border-radius:6px; border:1px solid ${it.condicao === 'Em perfeito estado' ? '#cbd5e1' : '#ef4444'}; font-size:12.5px; font-weight:600; background:white; color:#0b2341; cursor:pointer;">
                        <option value="Em perfeito estado" ${it.condicao === 'Em perfeito estado' ? 'selected' : ''}>Em perfeito estado</option>
                        <option value="Faltando na bancada" ${it.condicao === 'Faltando na bancada' ? 'selected' : ''}>Faltando na bancada</option>
                        <option value="Com avaria / desgaste" ${it.condicao === 'Com avaria / desgaste' ? 'selected' : ''}>Com avaria / desgaste</option>
                        <option value="Quantidade divergente" ${it.condicao === 'Quantidade divergente' ? 'selected' : ''}>Quantidade divergente</option>
                    </select>
                </td>
                <td style="text-align:center;">${statusBadge}</td>
            </tr>
        `;
    }).join('');

    const temDivergencia = window.itensAuditoriaAlunoState.some(it => it.status !== 'OK');
    const badgeTopo = document.getElementById('badge-auditoria-status');
    if (badgeTopo) {
        if (temDivergencia) {
            badgeTopo.innerHTML = '⚠️ Divergência Detectada na Conferência (Clique em Confirmar ou Reportar)';
            badgeTopo.style.background = '#fee2e2';
            badgeTopo.style.color = '#b91c1c';
        } else {
            badgeTopo.innerHTML = '✅ Saldo Conferido (+50 pts no Ranking)';
            badgeTopo.style.background = 'rgba(16, 185, 129, 0.1)';
            badgeTopo.style.color = '#10b981';
        }
    }
};

window.atualizarConferenciaItemAluno = function(idx, campo, valor) {
    const item = window.itensAuditoriaAlunoState[idx];
    if (!item) return;
    if (campo === 'conferido') {
        item.conferido = !!valor;
        if (!item.conferido) item.condicao = 'Faltando na bancada';
        else if (item.condicao === 'Faltando na bancada') item.condicao = 'Em perfeito estado';
    } else if (campo === 'qtdFisica') {
        item.qtdFisica = parseFloat(valor) || 0;
        if (item.qtdFisica !== item.qtdSistema && item.condicao === 'Em perfeito estado') {
            item.condicao = 'Quantidade divergente';
        } else if (item.qtdFisica === item.qtdSistema && item.condicao === 'Quantidade divergente') {
            item.condicao = 'Em perfeito estado';
        }
    } else if (campo === 'condicao') {
        item.condicao = valor;
        if (valor === 'Faltando na bancada') {
            item.conferido = false;
            item.qtdFisica = 0;
        }
    }
    window.renderTabelaAuditoriaInterativaAluno();
};

// Confirmar Conferência Física (OK ou com Divergência automática para Professor e Coordenação)
window.confirmarAuditoriaBancadaOK = function() {
    const divergentes = (window.itensAuditoriaAlunoState || []).filter(it => it.status !== 'OK');
    if (divergentes.length > 0) {
        const resumoDiv = divergentes.map(d => `${d.nome} (Sistema: ${d.qtdSistema}${d.unidade} | Físico: ${d.qtdFisica}${d.unidade} - ${d.condicao})`).join('; ');
        window.notificarProfessorECoordenacaoAluno('Divergência na Conferência de Bancada', resumoDiv, 'Urgente');
        const boxDiv = document.getElementById('aluno-divergencia-ativa-box');
        const txtDiv = document.getElementById('aluno-divergencia-texto');
        if (boxDiv && txtDiv) {
            boxDiv.style.display = 'flex';
            txtDiv.innerHTML = `<strong>Conferência com Divergência Enviada:</strong> ${resumoDiv}. O Professor e a Coordenação foram notificados!`;
        }
        alert(`⚠️ Conferência Física Registrada com Divergência!\n\nItens apontados: ${resumoDiv}\n\nNotificação enviada imediatamente para o Portal do Professor e para a Coordenação.`);
        return;
    }

    window.alunoBancadaAtual.auditoriaFeita = true;
    window.alunoBancadaAtual.pontos += 50;
    const badge = document.getElementById('badge-auditoria-status');
    if (badge) {
        badge.innerHTML = '✅ Inventário Físico Conferido pelo Aluno (+50 pts no Ranking)';
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#059669';
    }
    const pontosTotal = document.getElementById('aluno-pontos-total');
    if (pontosTotal) pontosTotal.innerText = `${window.alunoBancadaAtual.pontos} pts`;

    alert(`🎉 Conferência Física 100% Confirmada!\n\nTodos os materiais da ${window.alunoBancadaAtual.numero} foram auditados com sucesso (+50 pts).`);
};

// Inicializar e calcular fechamento de aula com base no que foi atribuído na bancada do aluno
window.inicializarCamposFechamentoBancadaAluno = function() {
    const totalAtribuido = parseFloat(window.alunoBancadaAtual.qtdTecidoAtribuida) || 4.0;
    const nomeMat = window.alunoBancadaAtual.nomeTecidoAtribuido || 'Algodão Cru (INS-04)';

    const elNome = document.getElementById('aluno-fechamento-mat-nome');
    if (elNome) elNome.innerText = nomeMat;
    const elQtdAtrib = document.getElementById('aluno-fechamento-qtd-atribuida');
    if (elQtdAtrib) elQtdAtrib.innerText = `${totalAtribuido.toFixed(1)} m`;

    const inpBoa = document.getElementById('aluno-qtd-boa');
    const inpRet = document.getElementById('aluno-qtd-retalho');
    const inpRef = document.getElementById('aluno-qtd-refugo');

    if (inpBoa && inpRet && inpRef) {
        const boaPadrao = +(totalAtribuido * 0.75).toFixed(1);
        const retPadrao = +(totalAtribuido * 0.20).toFixed(1);
        const refPadrao = +(totalAtribuido - boaPadrao - retPadrao).toFixed(1);
        inpBoa.value = boaPadrao;
        inpRet.value = retPadrao;
        inpRef.value = refPadrao;
    }
    window.calcularEficienciaFechamentoAluno();
};

window.calcularEficienciaFechamentoAluno = function() {
    const totalAtribuido = parseFloat(window.alunoBancadaAtual.qtdTecidoAtribuida) || 4.0;
    const qtdBoa = parseFloat(document.getElementById('aluno-qtd-boa')?.value || 0);
    const qtdRetalho = parseFloat(document.getElementById('aluno-qtd-retalho')?.value || 0);
    const qtdRefugo = parseFloat(document.getElementById('aluno-qtd-refugo')?.value || 0);

    const soma = +(qtdBoa + qtdRetalho + qtdRefugo).toFixed(2);
    const elSoma = document.getElementById('aluno-fechamento-qtd-soma');
    if (elSoma) {
        elSoma.innerText = `${soma.toFixed(1)} m`;
        elSoma.style.color = Math.abs(soma - totalAtribuido) <= 0.05 ? '#10b981' : '#ef4444';
    }

    const resEl = document.getElementById('resultado-eficiencia-aluno');
    if (!resEl) return;

    // Eficiência real baseada no total estabelecido e atribuído na bancada
    const aproveitado = qtdBoa + qtdRetalho;
    const eficiencia = totalAtribuido > 0 ? Math.min(100, Math.round((aproveitado / totalAtribuido) * 100)) : 0;

    if (soma > totalAtribuido + 0.05) {
        resEl.style.color = '#ef4444';
        resEl.innerHTML = `⚠️ Atenção: A soma informada (${soma.toFixed(1)}m) ultrapassa o total atribuído na sua bancada (${totalAtribuido.toFixed(1)}m)! Ajuste os valores.`;
    } else if (soma < totalAtribuido - 0.05) {
        const faltam = +(totalAtribuido - soma).toFixed(1);
        resEl.style.color = '#d97706';
        resEl.innerHTML = `Eficiência Parcial: ${eficiencia}% (Faltam contabilizar ${faltam}m dos ${totalAtribuido.toFixed(1)}m atribuídos na bancada)`;
    } else {
        const classificacao = eficiencia >= 90 ? 'Excelente Aproveitamento!' : (eficiencia >= 75 ? 'Bom Aproveitamento' : 'Atenção ao Desperdício');
        resEl.style.color = eficiencia >= 75 ? 'var(--success-color)' : '#d97706';
        resEl.innerHTML = `Eficiência Calculada sobre ${totalAtribuido.toFixed(1)}m da Bancada: <strong>${eficiencia}%</strong> (${classificacao})`;
    }
};

window.registrarFechamentoAulaAluno = function() {
    const totalAtribuido = parseFloat(window.alunoBancadaAtual.qtdTecidoAtribuida) || 4.0;
    const qtdBoa = parseFloat(document.getElementById('aluno-qtd-boa')?.value || 0);
    const qtdRetalho = parseFloat(document.getElementById('aluno-qtd-retalho')?.value || 0);
    const qtdRefugo = parseFloat(document.getElementById('aluno-qtd-refugo')?.value || 0);
    const soma = +(qtdBoa + qtdRetalho + qtdRefugo).toFixed(2);

    if (soma > totalAtribuido + 0.05) {
        alert(`⚠️ Erro no Cálculo: A soma dos valores (${soma.toFixed(1)}m) não pode ser maior que o material atribuído na sua bancada (${totalAtribuido.toFixed(1)}m).`);
        return;
    }

    const eficiencia = totalAtribuido > 0 ? Math.min(100, Math.round(((qtdBoa + qtdRetalho) / totalAtribuido) * 100)) : 0;
    const nomeMat = window.alunoBancadaAtual.nomeTecidoAtribuido || 'Algodão Cru';

    if (qtdRetalho > 0) {
        window.catalogoRetalhos.unshift({
            id: 'RET-' + Math.floor(100 + Math.random() * 900),
            tipo: nomeMat,
            dimensoes: `${qtdRetalho.toFixed(1)}m reaproveitáveis (de ${totalAtribuido.toFixed(1)}m da bancada)`,
            cor: 'Padrão da Aula',
            doador: `${window.alunoBancadaAtual.numero} (${(currentUser && currentUser.nome) || 'Aluno'})`,
            uso: 'Sobra catalogada no fechamento da bancada',
            status: 'Disponível',
            criadoEm: 'Agora'
        });
        window.alunoBancadaAtual.pontos += 40;
    }

    if (typeof window.registrarMovimentacaoEstoque === 'function') {
        window.registrarMovimentacaoEstoque({
            tipo: 'Saída',
            cod: 'FECH-BANCADA',
            material: `${nomeMat} (Peça: ${qtdBoa}m | Retalho: ${qtdRetalho}m | Refugo: ${qtdRefugo}m)`,
            qtd: totalAtribuido,
            origem: window.alunoBancadaAtual.numero,
            destino: 'Estoque Circular / Fechamento de Aula',
            usuario: (currentUser && currentUser.nome) ? currentUser.nome : 'Aluno',
            cargo: 'Aluno',
            vinculo: `Eficiência Real: ${eficiencia}% sobre ${totalAtribuido.toFixed(1)}m atribuídos`
        });
    }

    alert(`🏆 Fechamento de Aula Concluído com Cálculo Exato!\n\n• Total Atribuído na Bancada: ${totalAtribuido.toFixed(1)}m\n• Utilizado na Peça: ${qtdBoa.toFixed(1)}m\n• Retalho Reutilizável: ${qtdRetalho.toFixed(1)}m\n• Refugo: ${qtdRefugo.toFixed(1)}m\n• Eficiência Final: ${eficiencia}%\n\nDados sincronizados com o Professor e Estoque Circular!`);
};

// -------------------------------------------------------------------------
// 4. NOTIFICAÇÕES DE REPOSIÇÃO E DIVERGÊNCIA DO ALUNO PARA PROFESSOR E COORDENAÇÃO
// -------------------------------------------------------------------------
window.alertasReposicaoAlunos = [];
try {
    const salvosRepAluno = localStorage.getItem('senaivest_alertas_reposicao_aluno');
    if (salvosRepAluno) window.alertasReposicaoAlunos = JSON.parse(salvosRepAluno);
} catch (e) {}

window.notificarProfessorECoordenacaoAluno = function(tipoEvento, descricao, urgencia = 'Urgente') {
    const alunoNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Pedro Santos';
    const alunoId = (currentUser && currentUser.id) ? currentUser.id : 'ALU-001';
    const bancadaNum = (window.alunoBancadaAtual && window.alunoBancadaAtual.numero) ? window.alunoBancadaAtual.numero : 'Bancada 01';
    const turmaAtual = (window.alunoBancadaAtual && window.alunoBancadaAtual.turma) ? window.alunoBancadaAtual.turma : 'Vestuário e Estilismo - Manhã';
    const horarioStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const alertaObj = {
        id: 'AL-REP-' + Date.now(),
        tipo: tipoEvento,
        alunoNome: alunoNome,
        alunoId: alunoId,
        bancada: bancadaNum,
        turma: turmaAtual,
        descricao: descricao,
        urgencia: urgencia,
        horario: `Hoje às ${horarioStr}`,
        status: 'Pendente'
    };

    if (!Array.isArray(window.alertasReposicaoAlunos)) window.alertasReposicaoAlunos = [];
    window.alertasReposicaoAlunos.unshift(alertaObj);
    try {
        localStorage.setItem('senaivest_alertas_reposicao_aluno', JSON.stringify(window.alertasReposicaoAlunos));
    } catch (e) {}

    // 1. Adicionar em Avisos / Mural do Professor e Coordenação
    if (!Array.isArray(window.avisosTurmaProfessor)) window.avisosTurmaProfessor = [];
    window.avisosTurmaProfessor.unshift({
        id: Date.now(),
        autor: `${alunoNome} (${alunoId})`,
        cargo: `Aluno • ${bancadaNum}`,
        turma: turmaAtual,
        bancada: bancadaNum,
        categoria: `🔔 ${tipoEvento}`,
        prioridade: 'Urgente',
        titulo: `🚨 ${tipoEvento} na ${bancadaNum} (${alunoNome})`,
        texto: `O aluno ${alunoNome} (${alunoId}) registrou na ${bancadaNum}: "${descricao}". Nível de urgência: ${urgencia}. Visível para Professor e Coordenação.`,
        data: `Hoje às ${horarioStr}`,
        tipo: 'alerta-aluno'
    });
    try {
        localStorage.setItem('senaivest_avisos_turma', JSON.stringify(window.avisosTurmaProfessor));
    } catch (e) {}

    // 2. Adicionar na lista de notificações gerais
    if (typeof notificacoes !== 'undefined' && Array.isArray(notificacoes)) {
        notificacoes.unshift({
            id: Date.now() + 1,
            title: `${tipoEvento} (${bancadaNum})`,
            desc: `${alunoNome}: ${descricao} (${urgencia})`,
            type: 'alert'
        });
    }

    // 3. Atualizar status da bancada do professor para exibir o alerta imediatamente em Diário & Bancadas
    if (Array.isArray(window.bancadasCheckinMock)) {
        const b = window.bancadasCheckinMock.find(x => x.numero === bancadaNum);
        if (b) {
            b.status = 'divergencia';
            b.auditoria = 'divergencia';
            b.divergenciaTexto = `${tipoEvento}: ${descricao} (${urgencia})`;
            try {
                localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock));
            } catch (e) {}
        }
    }

    // 4. Registrar também em Processos/Boletins para visibilidade na Coordenação e Professor
    if (typeof mockProcessos !== 'undefined' && Array.isArray(mockProcessos)) {
        const idProc = `BOL-ALU-${Math.floor(1000 + Math.random() * 9000)}`;
        mockProcessos.unshift({
            id: idProc,
            codigo: idProc,
            autor: `${alunoNome} (${bancadaNum})`,
            tipo: tipoEvento.includes('Reposição') ? 'Reposição de Produtos' : 'Divergência de Estoque',
            categoria: tipoEvento,
            material: descricao,
            qtd: 1,
            turma: turmaAtual,
            almoxarifado: bancadaNum,
            detalhe: `Solicitado pelo aluno ${alunoNome} na ${bancadaNum}: ${descricao} (${urgencia})`,
            status: 'Pendente',
            data: new Date().toLocaleString('pt-BR')
        });
        try {
            localStorage.setItem('senaivest_processos', JSON.stringify(mockProcessos));
        } catch (e) {}
    }

    if (typeof renderPainelAvisos === 'function') renderPainelAvisos();
    if (typeof renderAlertasAutomaticosEstoque === 'function') renderAlertasAutomaticosEstoque();
    if (typeof renderCheckinBancadaProf === 'function') renderCheckinBancadaProf();
    if (typeof renderProcessos === 'function') renderProcessos();
};

window.salvarSolicitacaoReposicao = function(e) {
    if (e) e.preventDefault();
    const insumo = document.getElementById('rep-insumo')?.value || 'Insumo de Costura';
    const urgencia = document.getElementById('rep-urgencia')?.value || 'Urgente';

    window.notificarProfessorECoordenacaoAluno('Solicitação de Reposição de Material', `Insumo: ${insumo}`, urgencia);

    const boxRep = document.getElementById('aluno-reposicao-ativa-box');
    const txtRep = document.getElementById('aluno-reposicao-texto');
    if (boxRep && txtRep) {
        boxRep.style.display = 'flex';
        txtRep.innerHTML = `<strong>Reposição Solicitada (${insumo}):</strong> Notificação enviada para o Professor e Coordenação (${urgencia}).`;
    }

    closeModal('modal-reposicao-bancada');
    alert(`📦 Solicitação de Reposição Enviada!\n\nInsumo: "${insumo}" (${urgencia}).\nAs notificações já estão visíveis no Portal do Professor e no Portal da Coordenação!`);
};

window.salvarDivergenciaBancada = function(e) {
    if (e) e.preventDefault();
    const item = document.getElementById('div-item-nome')?.value || 'Material da Bancada';
    const tipo = document.getElementById('div-tipo')?.value || 'Falta / Avaria';
    const detalhes = document.getElementById('div-detalhes')?.value || 'Reportado pelo aluno no início da aula';

    window.notificarProfessorECoordenacaoAluno('Divergência na Bancada', `${item} - ${tipo}: ${detalhes}`, 'Urgente');

    const boxDiv = document.getElementById('aluno-divergencia-ativa-box');
    const txtDiv = document.getElementById('aluno-divergencia-texto');
    if (boxDiv && txtDiv) {
        boxDiv.style.display = 'flex';
        txtDiv.innerHTML = `<strong>Divergência Registrada (${item}):</strong> Professor e Coordenação foram notificados.`;
    }

    closeModal('modal-divergencia-bancada');
    alert(`⚠️ Divergência Registrada e Notificada!\n\nItem: ${item}\nTipo: ${tipo}\nO Professor e a Coordenação receberam o alerta em tempo real.`);
};

// Incluir solicitações de reposição dos alunos nos Alertas Automáticos de Estoque (Professor & Coordenação)
const origRenderAlertasAuto = window.renderAlertasAutomaticosEstoque;
window.renderAlertasAutomaticosEstoque = function() {
    window.sincronizarControleApenasDeslocados();
    if (typeof origRenderAlertasAuto === 'function') {
        origRenderAlertasAuto();
    }
    const container = document.getElementById('estoque-alertas-list');
    if (!container) return;

    const alertasAlunos = Array.isArray(window.alertasReposicaoAlunos) ? window.alertasReposicaoAlunos.filter(a => a.status !== 'Resolvido') : [];
    if (alertasAlunos.length > 0) {
        // Se estava com mensagem de 100% em conformidade, limpa para mostrar os alertas dos alunos
        if (container.innerHTML.includes('Estoque e Devoluções 100% em Conformidade')) {
            container.innerHTML = '';
        }
        const cardsAlunosHtml = alertasAlunos.map(al => `
            <div class="alerta-estoque-card critico" style="border-left:5px solid #f59e0b; background:#fffbeb; margin-bottom:12px;">
                <div style="display:flex; align-items:flex-start; gap:14px; flex:1;">
                    <div style="width:42px; height:42px; border-radius:10px; background:#fef3c7; color:#d97706; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <span class="material-icons-outlined" style="font-size:24px;">front_hand</span>
                    </div>
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                            <span style="background:#d97706; color:white; font-size:11px; font-weight:800; padding:2px 8px; border-radius:8px;">SOLICITAÇÃO DO ALUNO NA BANCADA</span>
                            <span style="font-size:12px; font-weight:700; color:#0b2341;">${al.bancada}</span>
                            <span style="font-size:11.5px; color:#92400e; font-weight:600;">&bull; ${al.horario}</span>
                        </div>
                        <h4 style="margin:0 0 4px; font-size:15px; font-weight:800; color:#0b2341;">${al.tipo}: ${al.descricao}</h4>
                        <div style="font-size:12.5px; color:#475569;">
                            <strong>Aluno Solicitante:</strong> ${al.alunoNome} (${al.alunoId}) &bull; <strong>Turma:</strong> ${al.turma} &bull; <strong>Prioridade:</strong> <span style="color:#dc2626; font-weight:700;">${al.urgencia}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button type="button" class="primary-btn" onclick="window.atenderSolicitacaoReposicaoAluno('${al.id}')" style="font-size:12px; padding:7px 14px; background:#10b981; border-color:#10b981; justify-content:center;">
                        <span class="material-icons-outlined" style="font-size:15px; margin-right:4px;">check_circle</span> Atender / Repor na Bancada
                    </button>
                </div>
            </div>
        `).join('');
        container.innerHTML = cardsAlunosHtml + container.innerHTML;
    }
};

window.atenderSolicitacaoReposicaoAluno = function(alertaId) {
    const al = (window.alertasReposicaoAlunos || []).find(a => a.id === alertaId);
    if (!al) return;
    al.status = 'Resolvido';
    try {
        localStorage.setItem('senaivest_alertas_reposicao_aluno', JSON.stringify(window.alertasReposicaoAlunos));
    } catch (e) {}
    if (typeof renderAlertasAutomaticosEstoque === 'function') renderAlertasAutomaticosEstoque();
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Reposição Atendida', `A solicitação da ${al.bancada} (${al.alunoNome}) foi concluída!`, 'success');
    } else {
        alert(`Solicitação da ${al.bancada} atendida com sucesso!`);
    }
};

// -------------------------------------------------------------------------
// 5. MONITORAMENTO: LIBERAR SALA AUTOMATICAMENTE QUANDO CRONÔMETRO ZERAR OU FINALIZAR AULA
// -------------------------------------------------------------------------
window.verificarELiberarSalasExpiradas = function() {
    if (typeof window.getProfessoresStatusState !== 'function') return false;
    const liveStatus = window.getProfessoresStatusState();
    const now = Date.now();
    let mudou = false;

    for (const [profId, st] of Object.entries(liveStatus)) {
        if (st && st.status === 'em_aula' && st.fimTimer && st.fimTimer <= now) {
            liveStatus[profId] = {
                status: 'fora_aula',
                local: 'Sala dos Professores / Aula Concluída',
                proximaAula: 'Sala liberada automaticamente após término do tempo'
            };
            mudou = true;
        }
    }

    if (mudou) {
        if (typeof window.salvarProfessoresStatusState === 'function') {
            window.salvarProfessoresStatusState(liveStatus);
        }
        if (typeof window.renderMonitoramento === 'function') window.renderMonitoramento();
        if (typeof window.renderAcompanhamentoProfessores === 'function') window.renderAcompanhamentoProfessores();
    }
    return mudou;
};

// Verificar a cada segundo se algum cronômetro chegou a 00:00:00 para liberar a sala automaticamente
setInterval(() => {
    window.verificarELiberarSalasExpiradas();
}, 1000);

// Quando o professor clica em Finalizar Aula em Planos de Aula ou Monitoramento, libera a ocupação da sala imediatamente
window.finalizarAula = function(materiais, sala) {
    if (confirm('Deseja finalizar esta aula agora e liberar a ocupação da sala em Monitoramento?')) {
        if (typeof window.getProfessoresStatusState === 'function') {
            const liveStatus = window.getProfessoresStatusState();
            const profNomeLogado = (currentUser && currentUser.nome) ? currentUser.nome.toLowerCase() : '';
            for (const [profId, st] of Object.entries(liveStatus)) {
                if (st && st.status === 'em_aula') {
                    const mesmoLocal = sala && st.sala && window.normalizarNomeSala && window.normalizarNomeSala(st.sala) === window.normalizarNomeSala(sala);
                    if (mesmoLocal || profId === (currentUser && currentUser.id) || !sala || sala === 'N/A') {
                        liveStatus[profId] = {
                            status: 'fora_aula',
                            local: 'Sala dos Professores / Bloco Pedagógico',
                            proximaAula: 'Aula encerrada pelo docente'
                        };
                    }
                }
            }
            if (typeof window.salvarProfessoresStatusState === 'function') {
                window.salvarProfessoresStatusState(liveStatus);
            }
        }
        if (typeof window.renderMonitoramento === 'function') window.renderMonitoramento();
        if (typeof window.renderAcompanhamentoProfessores === 'function') window.renderAcompanhamentoProfessores();
        alert(`✅ Aula finalizada com sucesso!\n\nA sala foi liberada automaticamente em Monitoramento e passou para o status DISPONÍVEL.`);
    }
};

// -------------------------------------------------------------------------
// 6. HISTÓRICO DE MOVIMENTAÇÃO NAS SALAS VIRTUAIS (PROFESSOR) & RELATÓRIO DETALHADO EXCLUSIVO NA COORDENAÇÃO
// -------------------------------------------------------------------------
const defaultMovimentacoes = [
    {
        id: 'MOV-2026-001',
        dataHora: 'Hoje, 08:10',
        tipo: 'Entrada',
        cod: 'MAT-001',
        material: 'Tecido Algodão Cru',
        qtd: 50,
        origem: 'Fornecedor Têxtil SA (NF)',
        destino: 'Sala 01 - Modelagem',
        usuario: 'Giovani Azevedo',
        cargo: 'Professor',
        vinculo: 'Carga Inicial de Estoque do Laboratório',
        fotoComprovante: null
    },
    {
        id: 'MOV-2026-002',
        dataHora: 'Hoje, 09:25',
        tipo: 'Transferência',
        cod: 'MAT-002',
        material: 'Tesoura Alfaiate',
        qtd: 4,
        origem: 'Sala 01 - Modelagem',
        destino: 'Sala 02 - Costura',
        usuario: 'Prof. Roberto Silva',
        cargo: 'Professor',
        vinculo: 'Empréstimo entre Laboratórios (PLAN-102)',
        fotoComprovante: null
    },
    {
        id: 'MOV-2026-003',
        dataHora: 'Hoje, 10:40',
        tipo: 'Saída',
        cod: 'MAT-003',
        material: 'Agulha Industrial Reta 14',
        qtd: 12,
        origem: 'Sala 02 - Costura',
        destino: 'Bancadas 01 a 06 (Consumo Prático)',
        usuario: 'Profª. Clara Mendes',
        cargo: 'Professor',
        vinculo: 'Consumo em Aula de Costura Industrial',
        fotoComprovante: null
    }
];

window.historicoMovimentacoes = [...defaultMovimentacoes];
try {
    const salvasMov = localStorage.getItem('senaivest_movimentacoes');
    if (salvasMov) {
        const parsed = JSON.parse(salvasMov);
        if (Array.isArray(parsed) && parsed.length > 0) {
            window.historicoMovimentacoes = parsed;
        }
    }
} catch (e) {}

window.salvarMovimentacoesStorage = function() {
    try {
        localStorage.setItem('senaivest_movimentacoes', JSON.stringify(window.historicoMovimentacoes));
    } catch (e) {}
};

window.registrarMovimentacaoEstoque = function(dados) {
    if (!Array.isArray(window.historicoMovimentacoes)) window.historicoMovimentacoes = [];
    const nova = {
        id: 'MOV-' + Date.now().toString().slice(-6),
        dataHora: new Date().toLocaleString('pt-BR'),
        tipo: dados.tipo || 'Transferência',
        cod: dados.cod || 'MAT-000',
        material: dados.material || 'Material Laboratorial',
        qtd: dados.qtd !== undefined ? dados.qtd : 1,
        origem: dados.origem || 'Estoque Central',
        destino: dados.destino || 'Laboratório',
        usuario: dados.usuario || ((currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo'),
        usuarioId: dados.usuarioId || ((currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567'),
        cargo: dados.cargo || ((currentUser && currentUser.role) ? currentUser.role : 'Professor'),
        vinculo: dados.vinculo || 'Movimentação Operacional',
        fotoComprovante: dados.fotoComprovante || null
    };
    window.historicoMovimentacoes.unshift(nova);
    window.salvarMovimentacoesStorage();
    if (typeof window.renderHistoricoMovimentacoesProf === 'function') window.renderHistoricoMovimentacoesProf();
    if (typeof window.renderFluxoMateriaisCoord === 'function') window.renderFluxoMateriaisCoord();
    return nova;
};

// Sobrescrever confirmarTransferencia e confirmarSolicitacao para registrar deslocamento real + movimentação
window.confirmarTransferencia = function() {
    const prodSelect = document.getElementById('transfer-produto');
    const cod = prodSelect ? prodSelect.value : '';
    const qtdStr = document.getElementById('transfer-qtd')?.value || '1';
    const destino = document.getElementById('transfer-destino')?.value || 'Sala 02 - Costura';
    const qtdReq = parseInt(qtdStr, 10);

    if (!qtdReq || qtdReq <= 0) {
        alert('Insira uma quantidade válida.');
        return;
    }

    const material = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    if (!material) return;
    if (qtdReq > material.qtd) {
        alert('Quantidade solicitada excede o estoque disponível!');
        return;
    }

    const origemReal = material.almoxOrigem || material.almoxAtual || 'Sala 01 - Modelagem';
    material.qtd -= qtdReq;

    let existente = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod && m.almoxAtual === destino);
    if (existente && existente !== material) {
        existente.qtd += qtdReq;
        existente.almoxOrigem = origemReal;
    } else {
        window.mockMateriais.push({
            ...material,
            qtd: qtdReq,
            almoxOrigem: origemReal,
            almoxAtual: destino,
            responsavel: (currentUser && currentUser.nome) ? currentUser.nome : 'Professor',
            horarioEntrada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
    }

    localStorage.setItem('senaivest_transferencia_real_ativa', 'true');
    if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();

    window.registrarMovimentacaoEstoque({
        tipo: 'Transferência',
        cod: cod,
        material: material.nome,
        qtd: qtdReq,
        origem: origemReal,
        destino: destino,
        usuario: (currentUser && currentUser.nome) ? currentUser.nome : 'Professor',
        cargo: (currentUser && currentUser.role) ? currentUser.role : 'Professor',
        vinculo: `Deslocamento de ${origemReal} para ${destino}`
    });

    window.sincronizarControleApenasDeslocados();
    if (typeof renderSalas === 'function') renderSalas();
    if (typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
    if (typeof renderPainelAtrasosCoord === 'function') renderPainelAtrasosCoord();
    closeModal('transferir-modal');
    alert(`🔄 Transferência registrada com sucesso!\n\n${qtdReq} un. de "${material.nome}" deslocadas de ${origemReal} para ${destino}.\nO aviso de devolução de material deslocado foi ativado até o retorno à sala de origem.`);
};

window.confirmarSolicitacao = function() {
    window.confirmarTransferencia();
};

// Renderizar Histórico de Movimentação nas Salas Virtuais (Visão Operacional do Professor)
window.renderHistoricoMovimentacoesProf = function() {
    const container = document.getElementById('prof-historico-movimentacoes-container');
    if (!container) return;

    const filtroTipo = document.getElementById('prof-hist-mov-filtro-tipo')?.value || 'todos';
    const lista = Array.isArray(window.historicoMovimentacoes) ? window.historicoMovimentacoes : [];
    const filtrada = filtroTipo === 'todos' ? lista : lista.filter(m => m.tipo === filtroTipo);

    if (filtrada.length === 0) {
        container.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-secondary); background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">Nenhuma movimentação registrada para o filtro selecionado.</div>`;
        return;
    }

    container.innerHTML = `
        <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
                <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11.5px; text-transform:uppercase; color:var(--text-secondary);">
                    <tr>
                        <th style="padding:10px 14px;">Data / Hora</th>
                        <th style="padding:10px 14px;">Operação</th>
                        <th style="padding:10px 14px;">Material</th>
                        <th style="padding:10px 14px;">Qtd</th>
                        <th style="padding:10px 14px;">Origem ➔ Destino</th>
                        <th style="padding:10px 14px;">Responsável</th>
                        <th style="padding:10px 14px;">Vínculo / Observação</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrada.slice(0, 15).map(m => {
                        let badgeStyle = 'background:#e0f2fe; color:#0369a1;';
                        if (m.tipo === 'Entrada') badgeStyle = 'background:#dcfce7; color:#15803d;';
                        else if (m.tipo === 'Saída') badgeStyle = 'background:#fee2e2; color:#b91c1c;';
                        else if (m.tipo === 'Ficha Impressa') badgeStyle = 'background:#fef3c7; color:#b45309;';
                        return `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px 14px; white-space:nowrap; color:#64748b;">${m.dataHora}</td>
                                <td style="padding:10px 14px;"><span style="${badgeStyle} padding:3px 8px; border-radius:8px; font-weight:700; font-size:11px;">${m.tipo}</span></td>
                                <td style="padding:10px 14px; font-weight:700; color:#0b2341;">${m.material} <span style="font-size:11px; color:#64748b;">(${m.cod})</span></td>
                                <td style="padding:10px 14px; font-weight:800;">${m.qtd}</td>
                                <td style="padding:10px 14px; font-size:12px;"><strong>${m.origem}</strong> ➔ <strong>${m.destino}</strong></td>
                                <td style="padding:10px 14px; font-weight:600;">${m.usuario}</td>
                                <td style="padding:10px 14px; font-size:12px; color:#475569;">${m.vinculo}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
};

// Renderizar Relatório Detalhado Exclusivo na Coordenação (Baseado nas Entradas, Saídas, Transferências e Fichas Impressas)
window.filtroRelatorioCoordTipo = 'todos';

window.renderFluxoMateriaisCoord = function(query = '') {
    const container = document.getElementById('mon-fluxo-materiais-container');
    if (!container) return;

    // Exclusivo para Coordenação
    if (currentUser && currentUser.role !== 'Coordenação') {
        container.innerHTML = `<div style="padding:32px; text-align:center; color:var(--text-secondary);">Relatório detalhado exclusivo da Coordenação Pedagógica.</div>`;
        return;
    }

    const movs = Array.isArray(window.historicoMovimentacoes) ? window.historicoMovimentacoes : [];
    const q = (query || '').toLowerCase().trim();
    const tipoFiltro = window.filtroRelatorioCoordTipo || 'todos';

    const totalEntradas = movs.filter(m => m.tipo === 'Entrada').length;
    const totalSaidas = movs.filter(m => m.tipo === 'Saída').length;
    const totalTransf = movs.filter(m => m.tipo === 'Transferência').length;
    const totalImpresso = movs.filter(m => m.tipo === 'Ficha Impressa').length;

    const filtradas = movs.filter(m => {
        const matchTipo = (tipoFiltro === 'todos') || (m.tipo === tipoFiltro);
        const matchBusca = !q ||
            (m.material || '').toLowerCase().includes(q) ||
            (m.cod || '').toLowerCase().includes(q) ||
            (m.origem || '').toLowerCase().includes(q) ||
            (m.destino || '').toLowerCase().includes(q) ||
            (m.usuario || '').toLowerCase().includes(q) ||
            (m.vinculo || '').toLowerCase().includes(q);
        return matchTipo && matchBusca;
    });

    const rowsHtml = filtradas.map(m => {
        let badgeStyle = 'background:#e0f2fe; color:#0369a1;';
        if (m.tipo === 'Entrada') badgeStyle = 'background:#dcfce7; color:#15803d;';
        else if (m.tipo === 'Saída') badgeStyle = 'background:#fee2e2; color:#b91c1c;';
        else if (m.tipo === 'Ficha Impressa') badgeStyle = 'background:#fef3c7; color:#b45309;';

        const btnFoto = m.fotoComprovante
            ? `<button type="button" class="secondary-btn" onclick="window.visualizarComprovanteMovimentacao('${m.id}')" style="font-size:11px; padding:4px 8px; border-color:#0284c7; color:#0284c7;">📸 Ver Foto Ficha</button>`
            : `<span style="font-size:11px; color:#94a3b8;">Sistema Digital</span>`;

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-family:monospace; font-weight:700; color:#0b2341;">${m.id}</td>
                <td style="padding:12px 14px; white-space:nowrap; font-size:12px; color:#475569;">${m.dataHora}</td>
                <td style="padding:12px 14px;"><span style="${badgeStyle} padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px;">${m.tipo.toUpperCase()}</span></td>
                <td style="padding:12px 14px;"><strong>${m.material}</strong><br><span style="font-size:11px; color:#64748b;">Cód: ${m.cod}</span></td>
                <td style="padding:12px 14px; font-weight:800; font-size:14px; color:#0b2341;">${m.qtd}</td>
                <td style="padding:12px 14px; font-size:12.5px;">${m.origem}</td>
                <td style="padding:12px 14px; font-size:12.5px; font-weight:700; color:#0284c7;">${m.destino}</td>
                <td style="padding:12px 14px; font-size:12.5px;"><strong>${m.usuario}</strong><br><span style="font-size:11px; color:#64748b;">${m.cargo || 'Docente'} ${m.usuarioId ? `(${m.usuarioId})` : ''}</span></td>
                <td style="padding:12px 14px; font-size:12px; color:#334155;">${m.vinculo}</td>
                <td style="padding:12px 14px; text-align:center;">${btnFoto}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="background:white; border-radius:16px; border:1px solid var(--border-color); padding:24px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:18px; padding-bottom:14px; border-bottom:1px solid #f1f5f9;">
                <div>
                    <span style="background:#0b2341; color:white; font-size:10.5px; font-weight:800; padding:3px 10px; border-radius:12px; text-transform:uppercase; letter-spacing:0.5px;">Exclusivo Coordenação</span>
                    <h3 style="margin:6px 0 2px; font-size:19px; font-weight:800; color:#0b2341;">Relatório Detalhado de Movimentação de Materiais</h3>
                    <p style="margin:0; font-size:12.5px; color:var(--text-secondary);">Auditoria completa de todos os materiais que entraram, saíram, foram transferidos ou lançados via Ficha de Material Impresso</p>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="secondary-btn" onclick="window.exportarPlanilhaFluxoMateriais()" style="font-size:12.5px; padding:8px 14px;">
                        <span class="material-icons-outlined" style="font-size:16px; color:#10b981; margin-right:4px;">file_download</span> Exportar Relatório CSV
                    </button>
                </div>
            </div>

            <!-- KPIs de Movimentação -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:14px; margin-bottom:20px;">
                <div onclick="window.filtroRelatorioCoordTipo='todos'; window.renderFluxoMateriaisCoord();" style="cursor:pointer; background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:14px;">
                    <span style="font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">Total de Movimentações</span>
                    <div style="font-size:24px; font-weight:800; color:#0b2341; margin-top:4px;">${movs.length} registros</div>
                </div>
                <div onclick="window.filtroRelatorioCoordTipo='Entrada'; window.renderFluxoMateriaisCoord();" style="cursor:pointer; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px;">
                    <span style="font-size:11px; font-weight:800; color:#15803d; text-transform:uppercase;">Entradas / Devoluções</span>
                    <div style="font-size:24px; font-weight:800; color:#15803d; margin-top:4px;">${totalEntradas}</div>
                </div>
                <div onclick="window.filtroRelatorioCoordTipo='Saída'; window.renderFluxoMateriaisCoord();" style="cursor:pointer; background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:14px;">
                    <span style="font-size:11px; font-weight:800; color:#b91c1c; text-transform:uppercase;">Saídas / Consumo em Aula</span>
                    <div style="font-size:24px; font-weight:800; color:#b91c1c; margin-top:4px;">${totalSaidas}</div>
                </div>
                <div onclick="window.filtroRelatorioCoordTipo='Transferência'; window.renderFluxoMateriaisCoord();" style="cursor:pointer; background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; padding:14px;">
                    <span style="font-size:11px; font-weight:800; color:#0369a1; text-transform:uppercase;">Transferências entre Salas</span>
                    <div style="font-size:24px; font-weight:800; color:#0369a1; margin-top:4px;">${totalTransf}</div>
                </div>
                <div onclick="window.filtroRelatorioCoordTipo='Ficha Impressa'; window.renderFluxoMateriaisCoord();" style="cursor:pointer; background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:14px;">
                    <span style="font-size:11px; font-weight:800; color:#b45309; text-transform:uppercase;">Material Impresso (Foto)</span>
                    <div style="font-size:24px; font-weight:800; color:#b45309; margin-top:4px;">${totalImpresso}</div>
                </div>
            </div>

            <!-- Barra de Busca e Filtro -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px;">
                <div style="display:flex; gap:8px; align-items:center;">
                    <span style="font-size:12px; font-weight:700; color:var(--text-secondary);">Filtrar Operação:</span>
                    <select onchange="window.filtroRelatorioCoordTipo=this.value; window.renderFluxoMateriaisCoord();" style="padding:7px 12px; border-radius:8px; border:1px solid var(--border-color); font-size:12.5px; font-weight:700;">
                        <option value="todos" ${tipoFiltro === 'todos' ? 'selected' : ''}>Todas (${movs.length})</option>
                        <option value="Entrada" ${tipoFiltro === 'Entrada' ? 'selected' : ''}>Entradas (${totalEntradas})</option>
                        <option value="Saída" ${tipoFiltro === 'Saída' ? 'selected' : ''}>Saídas (${totalSaidas})</option>
                        <option value="Transferência" ${tipoFiltro === 'Transferência' ? 'selected' : ''}>Transferências (${totalTransf})</option>
                        <option value="Ficha Impressa" ${tipoFiltro === 'Ficha Impressa' ? 'selected' : ''}>Material Impresso por Foto (${totalImpresso})</option>
                    </select>
                </div>
                <div class="search-bar" style="width:320px; margin:0; padding:6px 12px;">
                    <span class="material-icons-outlined" style="font-size:18px;">search</span>
                    <input type="text" value="${query}" placeholder="Buscar por material, professor, origem, destino..." oninput="window.renderFluxoMateriaisCoord(this.value)" style="font-size:12.5px;">
                </div>
            </div>

            <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px;">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11.5px; text-transform:uppercase; color:var(--text-secondary);">
                        <tr>
                            <th style="padding:12px 14px;">Protocolo</th>
                            <th style="padding:12px 14px;">Data / Hora</th>
                            <th style="padding:12px 14px;">Operação</th>
                            <th style="padding:12px 14px;">Material & Código</th>
                            <th style="padding:12px 14px;">Qtd</th>
                            <th style="padding:12px 14px;">Origem</th>
                            <th style="padding:12px 14px;">Destino</th>
                            <th style="padding:12px 14px;">Professor / Usuário</th>
                            <th style="padding:12px 14px;">Vínculo / Detalhes</th>
                            <th style="padding:12px 14px; text-align:center;">Comprovante</th>
                        </tr>
                    </thead>
                    <tbody style="font-size:13px; color:var(--text-primary); background:white;">
                        ${rowsHtml || '<tr><td colspan="10" style="padding:24px; text-align:center; color:#64748b;">Nenhuma movimentação encontrada.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
};

window.visualizarComprovanteMovimentacao = function(movId) {
    const mov = (window.historicoMovimentacoes || []).find(m => m.id === movId);
    if (!mov || !mov.fotoComprovante) return;
    const img = document.getElementById('modal-foto-grande-img');
    const dados = document.getElementById('modal-foto-info-dados');
    if (img && dados) {
        img.src = mov.fotoComprovante;
        dados.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div><strong>Protocolo:</strong> ${mov.id} (${mov.tipo})</div>
                <div><strong>Data/Hora:</strong> ${mov.dataHora}</div>
                <div><strong>Responsável Referenciado:</strong> ${mov.usuario} (${mov.usuarioId || 'Docente'})</div>
                <div><strong>Material & Qtd:</strong> ${mov.material} (${mov.qtd})</div>
                <div><strong>Origem ➔ Destino:</strong> ${mov.origem} ➔ ${mov.destino}</div>
                <div><strong>Vínculo:</strong> ${mov.vinculo}</div>
            </div>
        `;
        openModal('visualizar-foto-devolucao-modal');
    }
};

// Também chamar renderHistoricoMovimentacoesProf sempre que renderSalas for executado
const origRenderSalas = window.renderSalas;
window.renderSalas = function() {
    if (typeof origRenderSalas === 'function') origRenderSalas();
    if (typeof window.renderHistoricoMovimentacoesProf === 'function') window.renderHistoricoMovimentacoesProf();
};

// -------------------------------------------------------------------------
// 7. MÓDULO DE MATERIAL IMPRESSO (FICHA FÍSICA DE AULA & CAPTURA POR FOTO)
// -------------------------------------------------------------------------
window.fotoMaterialImpressoTemp = null;
window.miCameraStream = null;

window.abrirModalMaterialImpressoFoto = function() {
    const userNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
    const userId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
    const userRole = (currentUser && currentUser.role) ? currentUser.role : 'Professor';

    const refDisplay = document.getElementById('mi-usuario-referencia-display');
    if (refDisplay) {
        refDisplay.innerText = `${userNome} (${userId}) • Perfil: ${userRole}`;
    }

    const salaSel = document.getElementById('mi-sala-uso');
    if (salaSel) {
        salaSel.innerHTML = '';
        (window.mockSalas || []).forEach(s => {
            salaSel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    }

    const matSel = document.getElementById('mi-material-select');
    if (matSel) {
        matSel.innerHTML = '';
        (window.mockMateriais || []).forEach(m => {
            const cod = m.cod || m.codigo || '';
            matSel.innerHTML += `<option value="${cod}">[${cod}] ${m.nome} (Disp: ${m.qtd} na ${m.almoxAtual})</option>`;
        });
    }

    const dataInp = document.getElementById('mi-data-aula');
    if (dataInp) {
        dataInp.value = new Date().toISOString().slice(0, 10);
    }

    window.resetarFotoMaterialImpresso();
    openModal('modal-material-impresso-foto');
};

window.fecharModalMaterialImpressoFoto = function() {
    window.pararCameraMaterialImpresso();
    closeModal('modal-material-impresso-foto');
};

window.iniciarCameraMaterialImpresso = async function() {
    const container = document.getElementById('mi-camera-stream-container');
    const video = document.getElementById('mi-video-stream');
    if (!container || !video) return;
    try {
        window.miCameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = window.miCameraStream;
        container.style.display = 'block';
    } catch (e) {
        try {
            window.miCameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = window.miCameraStream;
            container.style.display = 'block';
        } catch (err) {
            alert('Câmera indisponível neste dispositivo. Utilize o botão "Escolher Foto da Galeria / PC".');
        }
    }
};

window.pararCameraMaterialImpresso = function() {
    if (window.miCameraStream) {
        window.miCameraStream.getTracks().forEach(t => t.stop());
        window.miCameraStream = null;
    }
    const container = document.getElementById('mi-camera-stream-container');
    if (container) container.style.display = 'none';
};

window.capturarFotoMaterialImpresso = function() {
    const video = document.getElementById('mi-video-stream');
    const canvas = document.getElementById('mi-canvas-carimbo');
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Carimbo de captura com referência ao professor/usuário
    const userNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
    const userId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
    ctx.fillStyle = 'rgba(11, 35, 65, 0.88)';
    ctx.fillRect(0, canvas.height - 54, canvas.width, 54);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`SENAIVEST | FICHA DE MATERIAL IMPRESSO CAPTURADA POR FOTO`, 14, canvas.height - 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Responsável: ${userNome} (${userId}) | Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 14, canvas.height - 12);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    window.aplicarFotoMaterialImpresso(dataUrl);
    window.pararCameraMaterialImpresso();
};

window.carregarFotoMaterialImpresso = function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('mi-canvas-carimbo');
            canvas.width = img.width > 1200 ? 1200 : img.width;
            canvas.height = (img.height / img.width) * canvas.width;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const userNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
            const userId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
            const bh = Math.max(48, Math.floor(canvas.height * 0.1));
            ctx.fillStyle = 'rgba(11, 35, 65, 0.88)';
            ctx.fillRect(0, canvas.height - bh, canvas.width, bh);
            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`SENAIVEST | FICHA DE MATERIAL IMPRESSO CAPTURADA POR FOTO`, 14, canvas.height - bh + 22);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.fillText(`Responsável: ${userNome} (${userId}) | Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 14, canvas.height - 10);

            window.aplicarFotoMaterialImpresso(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.aplicarFotoMaterialImpresso = function(dataUrl) {
    window.fotoMaterialImpressoTemp = dataUrl;
    const prevContainer = document.getElementById('mi-foto-preview-container');
    const prevImg = document.getElementById('mi-foto-preview-img');
    if (prevImg) prevImg.src = dataUrl;
    if (prevContainer) prevContainer.style.display = 'block';

    // Preenchimento inteligente sugerido a partir da captura da ficha caso o campo de tema esteja em branco
    const temaInp = document.getElementById('mi-tema-aula');
    if (temaInp && !temaInp.value.trim()) {
        temaInp.value = 'Aula Prática Registrada via Ficha de Material Impresso';
    }
};

window.resetarFotoMaterialImpresso = function() {
    window.fotoMaterialImpressoTemp = null;
    window.pararCameraMaterialImpresso();
    const prevContainer = document.getElementById('mi-foto-preview-container');
    if (prevContainer) prevContainer.style.display = 'none';
    const fileInp = document.getElementById('mi-input-foto-arquivo');
    if (fileInp) fileInp.value = '';
};

window.processarMaterialImpressoPorFoto = function(e) {
    if (e) e.preventDefault();
    if (!window.fotoMaterialImpressoTemp) {
        alert('⚠️ Por favor, fotografe ou selecione a foto da Ficha de Material Impresso preenchida para comprovar e capturar os dados!');
        return;
    }

    const userNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
    const userId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
    const userRole = (currentUser && currentUser.role) ? currentUser.role : 'Professor';

    const tema = document.getElementById('mi-tema-aula')?.value.trim() || 'Aula Prática (Ficha Impressa)';
    const turma = document.getElementById('mi-turma')?.value || 'Vestuário e Estilismo - Manhã';
    const salaUso = document.getElementById('mi-sala-uso')?.value || 'Sala 01 - Modelagem';
    const dataAula = document.getElementById('mi-data-aula')?.value || new Date().toISOString().slice(0, 10);
    const horarioAula = document.getElementById('mi-horario-aula')?.value || '08:00 às 12:00';
    const matCod = document.getElementById('mi-material-select')?.value || 'MAT-001';
    const qtd = parseFloat(document.getElementById('mi-material-qtd')?.value || 1) || 1;
    const tipoAcao = document.getElementById('mi-tipo-acao')?.value || 'consumo';
    const obs = document.getElementById('mi-observacoes')?.value.trim() || 'Capturado via foto de Ficha de Material Impresso';

    const matObj = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === matCod);
    const matNome = matObj ? matObj.nome : matCod;
    const origemMat = matObj ? (matObj.almoxOrigem || matObj.almoxAtual || salaUso) : salaUso;

    // 1. Atualizar estoque do material
    if (matObj) {
        if (tipoAcao === 'consumo') {
            matObj.qtd = Math.max(0, (parseFloat(matObj.qtd) || 0) - qtd);
        } else if (tipoAcao === 'deslocamento') {
            if (!matObj.almoxOrigem) matObj.almoxOrigem = origemMat;
            matObj.almoxAtual = salaUso;
            localStorage.setItem('senaivest_transferencia_real_ativa', 'true');
        }
        matObj.responsavel = `${userNome} (${userId})`;
        if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
    }

    // 2. Registrar nos Planos de Aula e Histórico de Aulas com referência explícita ao Professor/Usuário
    const idFicha = 'IMP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const novoPlanoImpresso = {
        id: idFicha,
        plano: `${tema} [Ficha Impressa]`,
        tema: `${tema} [Ficha Impressa]`,
        horario: horarioAula,
        dia: dataAula,
        sala: salaUso,
        local: salaUso,
        materiais: `${qtd} un. de ${matNome} (${matCod})`,
        salaRetirada: origemMat,
        professor: `${userNome} (${userId})`,
        professorId: userId,
        turma: turma,
        timestamp: Date.now(),
        status: 'Concluída via Ficha Impressa',
        liberado: true,
        isFichaImpressa: true,
        fotoFicha: window.fotoMaterialImpressoTemp
    };

    if (!Array.isArray(window.mockPlanos)) window.mockPlanos = [];
    window.mockPlanos.unshift(novoPlanoImpresso);
    try {
        const salvosP = JSON.parse(localStorage.getItem('senaivest_planos_aula') || '[]');
        salvosP.unshift(novoPlanoImpresso);
        localStorage.setItem('senaivest_planos_aula', JSON.stringify(salvosP));
    } catch (e) {}

    if (Array.isArray(window.mockAulasHistorico)) {
        window.mockAulasHistorico.unshift({
            id: idFicha,
            ano: dataAula.slice(0, 4) || '2026',
            mes: 'Outubro',
            data: dataAula,
            horario: horarioAula,
            tema: `${tema} (Material Impresso)`,
            turma: turma,
            sala: salaUso,
            professor: `${userNome} (${userId})`,
            presentes: 22,
            total: 24,
            bancadasUtilizadas: 10,
            materiais: `${qtd}x ${matNome} (${matCod})`
        });
    }

    // 3. Registrar no Histórico de Movimentação e Relatório Detalhado da Coordenação com a foto e referência ao usuário
    window.registrarMovimentacaoEstoque({
        tipo: 'Ficha Impressa',
        cod: matCod,
        material: matNome,
        qtd: qtd,
        origem: origemMat,
        destino: salaUso,
        usuario: userNome,
        usuarioId: userId,
        cargo: userRole,
        vinculo: `Ficha Impressa (${idFicha}) • Aula: ${tema} (${turma}) • ${obs}`,
        fotoComprovante: window.fotoMaterialImpressoTemp
    });

    window.sincronizarControleApenasDeslocados();
    if (typeof renderSalas === 'function') renderSalas();
    if (typeof renderPlan === 'function') {
        renderPlan(`${tema} [Ficha Impressa]`, horarioAula, `${userNome} (${userId})`, true, `${qtd}x ${matNome}`, origemMat, dataAula, salaUso, '0', turma);
    }
    if (typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
    if (typeof renderPainelAtrasosCoord === 'function') renderPainelAtrasosCoord();

    window.fecharModalMaterialImpressoFoto();
    alert(`📸 Ficha de Material Impresso Capturada e Sistema Atualizado!\n\n• Protocolo: ${idFicha}\n• Usuário/Professor Referenciado: ${userNome} (${userId})\n• Aula: ${tema} (${turma})\n• Material Atualizado: ${qtd} un. de ${matNome} (${matCod})\n• Relatório Detalhado da Coordenação e Histórico de Salas Virtuais atualizados com a foto em anexo!`);
};

window.imprimirFichaAulaEmBranco = function() {
    const userNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
    const userId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
    const win = window.open('', '_blank', 'width=850,height=700');
    if (!win) {
        alert('Permita pop-ups para imprimir a Ficha Física de Aula e Retirada de Material.');
        return;
    }
    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Ficha Física de Aula & Retirada de Material - SENAI</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
                .header { border-bottom: 3px solid #0b2341; padding-bottom: 12px; margin-bottom: 18px; display:flex; justify-content:space-between; }
                .box { border: 1px solid #94a3b8; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
                .row { display: flex; gap: 16px; margin-bottom: 10px; }
                .field { flex: 1; border-bottom: 1px dotted #64748b; padding-bottom: 4px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 12.5px; text-align: left; }
                th { background: #f1f5f9; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:16px; text-align:right;">
                <button onclick="window.print()" style="background:#0b2341; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Imprimir Ficha Física</button>
            </div>
            <div class="header">
                <div>
                    <h2 style="margin:0; color:#0b2341;">SENAI &bull; FICHA FÍSICA DE AULA PRÁTICA E RETIRADA DE MATERIAL</h2>
                    <p style="margin:4px 0 0; font-size:12px; color:#475569;">Documento para preenchimento manual em aula sem plano prévio no sistema (Fotografar e enviar no SenaiVest 2.0)</p>
                </div>
                <div style="text-align:right; font-size:12px;">
                    <strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}<br>
                    <strong>Docente Referenciado:</strong> ${userNome} (${userId})
                </div>
            </div>
            <div class="box">
                <div class="row">
                    <div class="field"><strong>Professor(a) / Usuário:</strong> ${userNome} (${userId})</div>
                    <div class="field"><strong>Data da Aula:</strong> ____/____/2026</div>
                    <div class="field"><strong>Horário:</strong> ____:____ às ____:____</div>
                </div>
                <div class="row">
                    <div class="field"><strong>Sala / Laboratório:</strong> ____________________________________</div>
                    <div class="field"><strong>Turma:</strong> _____________________________________________</div>
                </div>
                <div class="row">
                    <div class="field"><strong>Tema da Aula Prática:</strong> ________________________________________________________________________</div>
                </div>
            </div>
            <h4 style="margin:14px 0 6px; color:#0b2341;">RELAÇÃO DE MATERIAIS RETIRADOS / UTILIZADOS NA AULA</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width:90px;">Código</th>
                        <th>Descrição do Material / Insumo / Ferramenta</th>
                        <th style="width:90px;">Qtd. Retirada</th>
                        <th style="width:90px;">Qtd. Consumida</th>
                        <th style="width:90px;">Qtd. Devolvida</th>
                        <th style="width:140px;">Almoxarifado Origem</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
                </tbody>
            </table>
            <div style="margin-top:36px; display:flex; justify-content:space-between; gap:40px;">
                <div style="flex:1; border-top:1px solid #334155; text-align:center; padding-top:6px; font-size:12px;">Assinatura do Professor / Responsável (${userNome})</div>
                <div style="flex:1; border-top:1px solid #334155; text-align:center; padding-top:6px; font-size:12px;">Visto da Coordenação / Almoxarifado</div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
};


// =========================================================================
// 8. MOTOR DE AGENDAMENTO AUTOMÁTICO DE SALAS, DETECÇÃO DE CHOQUE DE HORÁRIO,
//    REGISTRO DE SAÍDA NOS CARDS DE MATERIAIS & BIBLIOTECA DE BANCADAS CERTIFICADAS
// =========================================================================

// Parser seguro de Data + Hora no fuso horário local do computador/dispositivo
const _origNormalizarNomeSalaV37 = window.normalizarNomeSala;
window.normalizarNomeSala = function(sala) {
    if (!sala) return 'Sala 01 - Modelagem';
    const texto = String(sala).trim();
    if (Array.isArray(window.mockSalas)) {
        const exata = window.mockSalas.find(s => s && s.nome && s.nome.trim().toLowerCase() === texto.toLowerCase());
        if (exata) return exata.nome;
    }
    return (typeof _origNormalizarNomeSalaV37 === 'function') ? _origNormalizarNomeSalaV37(texto) : texto;
};

window.parseDataHoraLocalMs = function(diaStr, horaStr) {
    if (!diaStr || !horaStr) return null;
    const partesData = String(diaStr).trim().split('-').map(Number);
    const partesHora = String(horaStr).trim().split(':').map(Number);
    if (partesData.length !== 3 || partesHora.length < 2) return null;
    const [ano, mes, dia] = partesData;
    const [hora, minuto] = partesHora;
    if (!ano || !mes || !dia || isNaN(hora) || isNaN(minuto)) return null;
    return new Date(ano, mes - 1, dia, hora, minuto, 0, 0).getTime();
};

window.converterHoraParaMinutos = function(horaStr) {
    if (!horaStr || !String(horaStr).includes(':')) return null;
    const [h, m] = String(horaStr).trim().split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
};

window.converterMinutosParaHora = function(totalMin) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMin));
    const h = String(Math.floor(clamped / 60)).padStart(2, '0');
    const m = String(clamped % 60).padStart(2, '0');
    return `${h}:${m}`;
};

window.formatarDataBrCurta = function(diaIso) {
    if (!diaIso || !String(diaIso).includes('-')) return diaIso || 'Hoje';
    const hoje = (typeof window.getHojeFormatadoLocal === 'function')
        ? window.getHojeFormatadoLocal()
        : new Date().toISOString().slice(0, 10);
    const [a, m, d] = String(diaIso).split('-');
    const br = `${d}/${m}/${a}`;
    return diaIso === hoje ? `Hoje (${br})` : br;
};

// Obter todos os planos reais salvos (sem duplicatas por id)
window.obterPlanosReaisConsolidados = function() {
    const mapa = new Map();
    try {
        const salvos = JSON.parse(localStorage.getItem('senaivest_planos_aula') || '[]');
        if (Array.isArray(salvos)) {
            salvos.forEach(p => {
                if (p && p.id) mapa.set(p.id, p);
            });
        }
    } catch (e) {}
    if (Array.isArray(window.mockPlanos)) {
        window.mockPlanos.forEach(p => {
            if (p && p.id && !mapa.has(p.id)) mapa.set(p.id, p);
        });
    }
    return Array.from(mapa.values());
};

// Verificar se um plano está EM AULA AGORA, AGENDADO ou CONCLUÍDO conforme o relógio local
window.avaliarEstadoTemporalPlano = function(p, refNowMs) {
    const agora = refNowMs || Date.now();
    if (!p) return { codigo: 'agendado', label: 'Agendado' };
    if (p.isFichaImpressa) return { codigo: 'concluido', label: 'Ficha Impressa' };
    if (p.finalizadoManual === true) return { codigo: 'concluido', label: 'Concluído' };

    let ini = p.inicio;
    let fim = p.termino;
    if ((!ini || !fim) && p.horario && String(p.horario).includes('às')) {
        const partes = String(p.horario).split('às').map(s => s.trim().slice(0, 5));
        if (partes.length === 2) {
            ini = ini || partes[0];
            fim = fim || partes[1];
        }
    }

    const dia = p.dia || p.data;
    const tsIni = window.parseDataHoraLocalMs(dia, ini);
    let tsFim = window.parseDataHoraLocalMs(dia, fim);
    if (!tsIni || !tsFim) {
        return { codigo: 'agendado', label: 'Agendado' };
    }
    if (tsFim <= tsIni) tsFim += 24 * 3600 * 1000;

    if (agora >= tsIni && agora < tsFim) {
        return { codigo: 'em_aula', label: '● Em Aula Agora', tsInicio: tsIni, tsTermino: tsFim };
    }
    if (agora >= tsFim) {
        return { codigo: 'concluido', label: 'Concluído', tsInicio: tsIni, tsTermino: tsFim };
    }
    return { codigo: 'agendado', label: 'Agendado', tsInicio: tsIni, tsTermino: tsFim };
};

// Detecção de Choque de Horários na mesma Sala e Data
window.verificarChoqueHorarioPlano = function(salaAlvo, diaAlvo, inicioStr, terminoStr, ignorePlanId = '') {
    if (!salaAlvo || !diaAlvo || !inicioStr || !terminoStr) {
        return { conflito: false, invalido: false, aulasDoDia: [] };
    }

    const iniMin = window.converterHoraParaMinutos(inicioStr);
    const fimMin = window.converterHoraParaMinutos(terminoStr);
    if (iniMin === null || fimMin === null || fimMin <= iniMin) {
        return {
            conflito: false,
            invalido: true,
            mensagem: 'O horário de término deve ser maior que o horário de início da aula.',
            aulasDoDia: []
        };
    }

    const salaNorm = window.normalizarNomeSala ? window.normalizarNomeSala(salaAlvo) : salaAlvo;
    const planos = window.obterPlanosReaisConsolidados();

    const aulasDoDia = planos.filter(p => {
        if (!p || p.isFichaImpressa || p.finalizadoManual === true) return false;
        if (ignorePlanId && String(p.id) === String(ignorePlanId)) return false;
        const pDia = p.dia || p.data;
        if (pDia !== diaAlvo) return false;
        const pSala = window.normalizarNomeSala ? window.normalizarNomeSala(p.sala || p.local || '') : (p.sala || p.local || '');
        return pSala === salaNorm;
    }).map(p => {
        let pIni = p.inicio;
        let pFim = p.termino;
        if ((!pIni || !pFim) && p.horario && String(p.horario).includes('às')) {
            const pts = String(p.horario).split('às').map(s => s.trim().slice(0, 5));
            pIni = pIni || pts[0];
            pFim = pFim || pts[1];
        }
        return {
            id: p.id,
            tema: p.tema || p.plano || 'Aula Prática',
            professor: p.professor || p.profNome || 'Docente SENAI',
            turma: p.turma || 'Turma Regular',
            inicio: pIni,
            termino: pFim,
            iniMin: window.converterHoraParaMinutos(pIni),
            fimMin: window.converterHoraParaMinutos(pFim)
        };
    }).filter(x => x.iniMin !== null && x.fimMin !== null)
      .sort((a, b) => a.iniMin - b.iniMin);

    const conflitante = aulasDoDia.find(ex => (iniMin < ex.fimMin) && (fimMin > ex.iniMin));

    // Calcular sugestão automática de próximo intervalo livre com a mesma duração
    const duracaoDesejada = Math.max(30, fimMin - iniMin);
    let cursorSugestao = Math.max(iniMin, conflitante ? conflitante.fimMin + 5 : iniMin);
    for (const aula of aulasDoDia) {
        if (cursorSugestao < aula.fimMin && (cursorSugestao + duracaoDesejada) > aula.iniMin) {
            cursorSugestao = aula.fimMin + 5;
        }
    }
    let sugestao = null;
    if (cursorSugestao + duracaoDesejada <= 23 * 60 + 55) {
        sugestao = {
            inicio: window.converterMinutosParaHora(cursorSugestao),
            termino: window.converterMinutosParaHora(cursorSugestao + duracaoDesejada)
        };
    }

    if (conflitante) {
        return {
            conflito: true,
            invalido: false,
            aulaConflitante: conflitante,
            sugestaoHorario: sugestao,
            aulasDoDia: aulasDoDia,
            mensagem: `Choque de horário em "${salaAlvo}" no dia ${window.formatarDataBrCurta(diaAlvo)}: já ocorre a aula "${conflitante.tema}" (${conflitante.inicio} às ${conflitante.termino}) com ${conflitante.professor}.`
        };
    }

    return { conflito: false, invalido: false, aulasDoDia: aulasDoDia, sugestaoHorario: sugestao };
};

window.aplicarSugestaoHorarioPlano = function(novoIni, novoFim) {
    const iniEl = document.getElementById('p-inicio');
    const fimEl = document.getElementById('p-termino');
    if (iniEl) iniEl.value = novoIni;
    if (fimEl) fimEl.value = novoFim;
    window.verificarChoqueHorarioPlanoModal();
};

// Feedback visual em tempo real dentro do Modal de Elaboração do Plano de Aula
window.verificarChoqueHorarioPlanoModal = function() {
    const sala = document.getElementById('p-local')?.value || '';
    const dia = document.getElementById('p-dia')?.value || '';
    const inicio = document.getElementById('p-inicio')?.value || '';
    const termino = document.getElementById('p-termino')?.value || '';
    const idEdit = document.getElementById('p-id')?.value || '';

    const infoBox = document.getElementById('p-agenda-sala-dia-info');
    const alertBox = document.getElementById('p-conflito-horario-alert');
    if (!infoBox || !alertBox) return;

    if (!sala || !dia) {
        infoBox.style.display = 'none';
        alertBox.style.display = 'none';
        return;
    }

    const res = window.verificarChoqueHorarioPlano(sala, dia, inicio || '08:00', termino || '10:00', idEdit);

    // Exibir resumo organizado dos horários já agendados naquela sala/dia
    if (res.aulasDoDia && res.aulasDoDia.length > 0) {
        const chips = res.aulasDoDia.map(a =>
            `<span style="display:inline-flex; align-items:center; gap:4px; background:white; border:1px solid #bae6fd; color:#0369a1; padding:3px 9px; border-radius:8px; font-size:11.5px; font-weight:700;">
                <span class="material-icons-outlined" style="font-size:13px;">schedule</span>
                ${a.inicio} às ${a.termino} • ${a.tema} (${a.professor})
            </span>`
        ).join(' ');
        infoBox.style.display = 'block';
        infoBox.innerHTML = `
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:10px 14px; font-size:12px; color:#0c4a6e;">
                <div style="font-weight:800; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                    <span class="material-icons-outlined" style="font-size:16px; color:#0284c7;">event_note</span>
                    Horários já agendados em <strong>${sala}</strong> para ${window.formatarDataBrCurta(dia)}:
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">${chips}</div>
            </div>
        `;
    } else {
        infoBox.style.display = 'block';
        infoBox.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:8px 14px; font-size:12px; color:#166534; display:flex; align-items:center; gap:6px; font-weight:600;">
                <span class="material-icons-outlined" style="font-size:16px; color:#10b981;">check_circle</span>
                Sala <strong>${sala}</strong> totalmente livre para agendamento em ${window.formatarDataBrCurta(dia)}.
            </div>
        `;
    }

    if (res.invalido) {
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
            <div style="background:#fef2f2; border:1.5px solid #ef4444; border-radius:10px; padding:12px 14px; color:#991b1b; font-size:12.5px; display:flex; align-items:center; gap:10px;">
                <span class="material-icons-outlined" style="color:#ef4444; font-size:22px;">error</span>
                <div><strong>Intervalo de Horário Inválido:</strong> ${res.mensagem}</div>
            </div>
        `;
        return;
    }

    if (res.conflito && res.aulaConflitante) {
        const c = res.aulaConflitante;
        const btnSugestao = res.sugestaoHorario ? `
            <button type="button" onclick="window.aplicarSugestaoHorarioPlano('${res.sugestaoHorario.inicio}', '${res.sugestaoHorario.termino}')" style="margin-top:8px; background:#0b2341; color:white; border:none; border-radius:7px; padding:7px 12px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
                <span class="material-icons-outlined" style="font-size:15px;">auto_fix_high</span>
                Organizar Automaticamente p/ Próximo Horário Livre (${res.sugestaoHorario.inicio} às ${res.sugestaoHorario.termino})
            </button>
        ` : '';

        alertBox.style.display = 'block';
        alertBox.innerHTML = `
            <div style="background:#fef2f2; border:2px solid #ef4444; border-radius:12px; padding:14px 16px; color:#991b1b; font-size:12.5px; line-height:1.5;">
                <div style="font-weight:800; font-size:13.5px; color:#b91c1c; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    <span class="material-icons-outlined" style="font-size:20px; color:#ef4444;">warning_amber</span>
                    Atenção: Choque de Horário Detectado nesta Sala!
                </div>
                <div>
                    Já existe uma aula agendada na sala <strong>${sala}</strong> dentro deste intervalo:
                    <div style="margin-top:6px; background:white; border:1px solid #fecaca; border-radius:8px; padding:8px 12px; color:#0f172a;">
                        <strong>Aula:</strong> ${c.tema} &bull; <strong>Horário:</strong> ${c.inicio} às ${c.termino}<br>
                        <strong>Professor(a):</strong> ${c.professor} &bull; <strong>Turma:</strong> ${c.turma}
                    </div>
                </div>
                ${btnSugestao}
            </div>
        `;
    } else {
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
    }
};

// Garantir que ao abrir o modal de Plano de Aula a checagem de agenda/choque rode limpa
const _origOpenPlanoModalV37 = window.openPlanoModal;
window.openPlanoModal = function() {
    if (typeof _origOpenPlanoModalV37 === 'function') _origOpenPlanoModalV37();
    const idInp = document.getElementById('p-id');
    if (idInp) idInp.value = '';
    const titleEl = document.getElementById('modal-plano-title');
    if (titleEl) titleEl.innerText = 'Ficha de Plano de Aula';
    setTimeout(() => {
        if (typeof window.verificarChoqueHorarioPlanoModal === 'function') {
            window.verificarChoqueHorarioPlanoModal();
        }
    }, 30);
};

// Motor Automático de Sincronização de Salas Ocupadas a partir dos Planos de Aula Agendados
window._ultimoHashOcupacaoPlanos = '';

window.sincronizarOcupacaoAutomaticaPorPlanos = function(forcarRender = false) {
    const agora = Date.now();
    const planos = window.obterPlanosReaisConsolidados();
    const liveStatus = window.getProfessoresStatusState ? window.getProfessoresStatusState() : {};
    let alterouLive = false;

    // 1. Limpar entradas automáticas expiradas ou cujos planos foram finalizados
    for (const [profKey, st] of Object.entries(liveStatus)) {
        if (st && st.status === 'em_aula') {
            if (st.fimTimer && st.fimTimer <= agora) {
                liveStatus[profKey] = {
                    status: 'fora_aula',
                    local: 'Sala dos Professores / Bloco Pedagógico',
                    proximaAula: 'Horário de aula concluído automaticamente'
                };
                alterouLive = true;
            } else if (st.origemPlanoAuto && st.planoId) {
                const pl = planos.find(x => x.id === st.planoId);
                const est = pl ? window.avaliarEstadoTemporalPlano(pl, agora) : { codigo: 'concluido' };
                if (est.codigo !== 'em_aula') {
                    liveStatus[profKey] = {
                        status: 'fora_aula',
                        local: 'Sala dos Professores / Bloco Pedagógico',
                        proximaAula: 'Aula agendada concluída'
                    };
                    alterouLive = true;
                }
            }
        }
    }

    // 2. Ativar automaticamente os planos cujo intervalo [dia + inicio, dia + termino) está ocorrendo AGORA
    const planosAtivosIds = [];
    planos.forEach(p => {
        const est = window.avaliarEstadoTemporalPlano(p, agora);
        if (est.codigo === 'em_aula') {
            planosAtivosIds.push(p.id);
            const profId = p.professorId || ('PROF-PLAN-' + p.id);
            const salaCanon = window.normalizarNomeSala ? window.normalizarNomeSala(p.sala || p.local) : (p.sala || p.local);
            const jaAtivoMesmoPlano = liveStatus[profId] && liveStatus[profId].status === 'em_aula' && liveStatus[profId].planoId === p.id && liveStatus[profId].fimTimer === est.tsTermino;
            if (!jaAtivoMesmoPlano) {
                liveStatus[profId] = {
                    status: 'em_aula',
                    profNome: p.professor || 'Professor SENAI',
                    aula: p.tema || p.plano || 'Aula Prática',
                    turma: p.turma || 'Turma Regular',
                    sala: salaCanon,
                    materiais: p.materiais || 'Insumos do Plano',
                    fimTimer: est.tsTermino,
                    duracaoTotalMs: Math.max(60000, est.tsTermino - est.tsInicio),
                    planoId: p.id,
                    origemPlanoAuto: true
                };
                alterouLive = true;
            }
        }
    });

    if (alterouLive && typeof window.salvarProfessoresStatusState === 'function') {
        window.salvarProfessoresStatusState(liveStatus);
    }

    const novoHash = planosAtivosIds.sort().join('|');
    const mudouTransicao = (novoHash !== window._ultimoHashOcupacaoPlanos);
    window._ultimoHashOcupacaoPlanos = novoHash;

    if (forcarRender || alterouLive || mudouTransicao) {
        const viewMon = document.getElementById('view-monitoramento');
        if (forcarRender || (viewMon && viewMon.classList.contains('active'))) {
            if (typeof window.renderMonitoramento === 'function') window.renderMonitoramento();
        }
        const viewPlanos = document.getElementById('view-planos');
        if (forcarRender || (viewPlanos && viewPlanos.classList.contains('active'))) {
            if (typeof window.renderPlanosGridCompleta === 'function' && (!currentUser || currentUser.role !== 'Coordenação')) {
                window.renderPlanosGridCompleta();
            }
        }
        const viewAcomp = document.getElementById('view-acompanhamento');
        if (viewAcomp && viewAcomp.classList.contains('active') && typeof window.renderAcompanhamentoProfessores === 'function') {
            window.renderAcompanhamentoProfessores();
        }
    }
};

// Integrar getSalasOcupadasInfo diretamente com os Planos Agendados em andamento + liveStatus
const _origGetSalasOcupadasInfoV37 = window.getSalasOcupadasInfo;
window.getSalasOcupadasInfo = function() {
    const ocupadas = (typeof _origGetSalasOcupadasInfoV37 === 'function') ? _origGetSalasOcupadasInfoV37() : {};
    const agora = Date.now();

    // Remover qualquer ocupação cujo timer já tenha expirado
    for (const k of Object.keys(ocupadas)) {
        if (ocupadas[k] && ocupadas[k].fimTimer && ocupadas[k].fimTimer <= agora) {
            delete ocupadas[k];
        }
    }

    // Garantir que qualquer Plano de Aula agendado para AGORA ocupe automaticamente sua respectiva sala
    const planos = window.obterPlanosReaisConsolidados();
    planos.forEach(p => {
        const est = window.avaliarEstadoTemporalPlano(p, agora);
        if (est.codigo === 'em_aula') {
            const canonical = window.normalizarNomeSala ? window.normalizarNomeSala(p.sala || p.local) : (p.sala || p.local);
            if (canonical) {
                ocupadas[canonical] = {
                    profId: p.professorId || 'PROF-PLAN',
                    profNome: p.professor || 'Docente SENAI',
                    aula: p.tema || p.plano || 'Aula Prática',
                    turma: p.turma || 'Turma Regular',
                    sala: canonical,
                    materiais: p.materiais || 'Insumos reservados',
                    fimTimer: est.tsTermino,
                    duracaoTotalMs: Math.max(60000, est.tsTermino - est.tsInicio),
                    planoId: p.id
                };
            }
        }
    });

    return ocupadas;
};

// Lista normalizada e organizada de todas as aulas agendadas para Monitoramento
window.getAulasAgendadasList = function() {
    const agora = Date.now();
    const planos = window.obterPlanosReaisConsolidados().filter(p => p && !p.isFichaImpressa);

    if (planos.length === 0) {
        const hoje = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : new Date().toISOString().slice(0, 10);
        return [
            {
                id: 'PLAN-DEMO-01',
                aula: 'Modelagem Industrial & Encaixe',
                plano: 'Modelagem Industrial & Encaixe',
                profNome: 'Giovani Azevedo',
                professor: 'Giovani Azevedo',
                sala: 'Sala 01 - Modelagem',
                turma: 'Vestuário e Estilismo - Manhã',
                dia: hoje,
                data: window.formatarDataBrCurta(hoje),
                inicio: '19:30',
                termino: '21:30',
                horario: '19:30 às 21:30',
                estado: 'agendado'
            }
        ];
    }

    const normalizados = planos.map(p => {
        let ini = p.inicio || '';
        let fim = p.termino || '';
        if ((!ini || !fim) && p.horario && String(p.horario).includes('às')) {
            const pts = String(p.horario).split('às').map(s => s.trim().slice(0, 5));
            ini = ini || pts[0];
            fim = fim || pts[1];
        }
        const dia = p.dia || p.data || '';
        const est = window.avaliarEstadoTemporalPlano(p, agora);
        const salaCanon = window.normalizarNomeSala ? window.normalizarNomeSala(p.sala || p.local || 'Sala 01 - Modelagem') : (p.sala || p.local || 'Sala 01 - Modelagem');
        return {
            id: p.id,
            aula: p.tema || p.plano || 'Aula Prática',
            plano: p.tema || p.plano || 'Aula Prática',
            profNome: (p.professor || p.profNome || 'Docente SENAI').replace(/^Prof\.?\s*/i, ''),
            professor: p.professor || p.profNome || 'Docente SENAI',
            sala: salaCanon,
            turma: p.turma || 'Turma Regular',
            dia: dia,
            data: window.formatarDataBrCurta(dia),
            inicio: ini || '08:00',
            termino: fim || '10:00',
            horario: p.horario || `${ini} às ${fim}`,
            materiais: p.materiais || 'Nenhum material',
            estado: est.codigo,
            tsOrdenacao: est.tsInicio || 9999999999999
        };
    });

    // Organizar da melhor forma: 1º Em Aula Agora -> 2º Agendadas (ordem cronológica) -> 3º Concluídas (mais recentes)
    const peso = { em_aula: 0, agendado: 1, concluido: 2 };
    normalizados.sort((a, b) => {
        if (peso[a.estado] !== peso[b.estado]) return peso[a.estado] - peso[b.estado];
        if (a.estado === 'concluido') return b.tsOrdenacao - a.tsOrdenacao;
        if (a.tsOrdenacao !== b.tsOrdenacao) return a.tsOrdenacao - b.tsOrdenacao;
        return String(a.sala).localeCompare(String(b.sala));
    });

    return normalizados;
};

// Resumo da próxima aula agendada para exibir nos cards DISPONÍVEL de Monitoramento (sem botão manual)
window.obterResumoProximaAulaSalaHtml = function(nomeSala) {
    const hoje = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : new Date().toISOString().slice(0, 10);
    const canon = window.normalizarNomeSala ? window.normalizarNomeSala(nomeSala) : nomeSala;
    const proximas = (window.getAulasAgendadasList() || []).filter(a =>
        a.estado === 'agendado' &&
        (window.normalizarNomeSala ? window.normalizarNomeSala(a.sala) : a.sala) === canon
    );
    if (proximas.length === 0) return '';
    const prox = proximas[0];
    const quando = prox.dia === hoje ? `Hoje às ${prox.inicio}` : `${prox.data} às ${prox.inicio}`;
    return `
        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #86efac; font-size:11.5px; color:#14532d; display:flex; align-items:center; gap:6px;">
            <span class="material-icons-outlined" style="font-size:15px; color:#15803d;">schedule</span>
            <span><strong>Próxima na grade:</strong> ${quando} (${prox.inicio}–${prox.termino}) • ${prox.aula} — Prof. ${prox.profNome}</span>
        </div>
    `;
};

// Renderizador organizado por Sala e Horário no Monitoramento
window.renderCronogramaOrganizadoMonitoramento = function(container, todasAgendadas, salaFiltro) {
    container.innerHTML = '';
    const filtradas = (todasAgendadas || []).filter(a => {
        if (!salaFiltro || salaFiltro === 'todas') return true;
        const sA = window.normalizarNomeSala ? window.normalizarNomeSala(a.sala) : a.sala;
        const sF = window.normalizarNomeSala ? window.normalizarNomeSala(salaFiltro) : salaFiltro;
        return sA === sF;
    });

    if (filtradas.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:32px; color:var(--text-secondary); font-size:13.5px;">
                <span class="material-icons-outlined" style="font-size:32px; opacity:0.5; display:block; margin-bottom:8px;">event_busy</span>
                Nenhuma aula prática agendada para os critérios selecionados.
            </div>
        `;
        return;
    }

    filtradas.forEach(a => {
        let badgeStatus = `<span style="font-size:11px; font-weight:800; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:3px 9px; border-radius:20px;">📅 Agendada</span>`;
        let borderCard = '1px solid #e2e8f0';
        let bgCard = '#f8fafc';

        if (a.estado === 'em_aula') {
            badgeStatus = `<span style="font-size:11px; font-weight:800; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:3px 9px; border-radius:20px;">● Em Aula Agora</span>`;
            borderCard = '2px solid #ef4444';
            bgCard = '#fffafa';
        } else if (a.estado === 'concluido') {
            badgeStatus = `<span style="font-size:11px; font-weight:700; background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; padding:3px 9px; border-radius:20px;">✔ Concluída</span>`;
        }

        container.innerHTML += `
            <div style="background:${bgCard}; border:${borderCard}; border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                        <span style="font-size:11.5px; font-weight:800; background:#e0f2fe; color:#0284c7; padding:3px 9px; border-radius:6px;">${a.sala}</span>
                        ${badgeStatus}
                    </div>
                    <h4 style="margin:0 0 8px 0; font-size:15px; color:#0b2341; font-weight:800;">${a.aula}</h4>
                    <div style="font-size:12.5px; color:var(--text-secondary); display:flex; flex-direction:column; gap:5px;">
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#0284c7;">person</span> <strong>Prof(a):</strong> ${a.professor}</div>
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#f59e0b;">event</span> <strong>Data &amp; Horário:</strong> ${a.data} • <strong>${a.horario}</strong></div>
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:var(--primary-color);">groups</span> ${a.turma}</div>
                    </div>
                </div>
            </div>
        `;
    });
};

// Renderizar todos os Planos de Aula salvos no grid (#plans-grid) com status dinâmico em tempo real
window.renderPlanosGridCompleta = function() {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let planos = window.obterPlanosReaisConsolidados();
    if (planos.length === 0) {
        const hoje = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : '2026-10-29';
        planos = [{
            id: 'PLAN-EXEMPLO-01',
            plano: 'Modelagem Básica',
            tema: 'Modelagem Básica',
            professor: (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo',
            professorId: (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567',
            dia: hoje,
            inicio: '08:00',
            termino: '10:00',
            horario: '08:00 às 10:00',
            sala: 'Sala 01 - Modelagem',
            local: 'Sala 01 - Modelagem',
            salaRetirada: 'Sala 01 - Modelagem',
            tempoPreparo: '15',
            turma: 'Vestuário e Estilismo - Manhã (Turma 2026.1)',
            materiais: 'MAT-001 - Tecido Algodão',
            finalizadoManual: true
        }];
    }

    const agora = Date.now();
    const peso = { em_aula: 0, agendado: 1, concluido: 2 };
    const ordenados = [...planos].sort((a, b) => {
        const ea = window.avaliarEstadoTemporalPlano(a, agora);
        const eb = window.avaliarEstadoTemporalPlano(b, agora);
        if (peso[ea.codigo] !== peso[eb.codigo]) return peso[ea.codigo] - peso[eb.codigo];
        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    ordenados.forEach(p => {
        const tema = p.tema || p.plano || 'Aula Prática';
        const autor = p.professor || 'Docente SENAI';
        const dia = p.dia || p.data || '';
        const local = p.sala || p.local || 'Laboratório';
        const horarioStr = p.horario || `${p.inicio || '08:00'} às ${p.termino || '10:00'}`;
        const matsStr = p.materiais || 'Nenhum material';
        const salaRet = p.salaRetirada || local;
        const preparo = p.tempoPreparo || '15';
        const turmaStr = p.turma || '';
        const est = window.avaliarEstadoTemporalPlano(p, agora);

        let pillStyle = 'background:#e0f2fe; color:#0284c7;';
        if (est.codigo === 'em_aula') {
            pillStyle = 'background:#fef2f2; color:#dc2626; border:1px solid #fecaca; font-weight:800;';
        } else if (est.codigo === 'concluido') {
            pillStyle = 'background:#f1f5f9; color:#64748b;';
        }

        const isMeuPlano = !currentUser || !p.professorId || p.professorId === currentUser.id ||
            (currentUser.nome && String(autor).toLowerCase().includes(String(currentUser.nome).toLowerCase()));

        const safeId = String(p.id || '').replace(/'/g, "\\'");
        const botoesAcao = (isMeuPlano && est.codigo !== 'concluido')
            ? `<button type="button" class="action-btn outline" style="flex:1;" onclick="window.editarPlanoSalvo('${safeId}')">Editar Ficha</button>
               <button type="button" class="action-btn outline" style="flex:1; border-color:var(--danger-color); color:var(--danger-color);" onclick="window.finalizarPlanoEspecifico('${safeId}')">Finalizar Aula</button>`
            : `<button type="button" class="action-btn outline" style="width:100%;" onclick="window.abrirDetalhePlanoPorId('${safeId}')">Visualizar Detalhes</button>`;

        grid.innerHTML += `
            <div class="plan-card" style="${est.codigo === 'em_aula' ? 'border:2px solid #ef4444; box-shadow:0 8px 22px rgba(239,68,68,0.10);' : ''}">
                <div class="plan-status-pill" style="${pillStyle}">${est.label}</div>
                <h3 style="font-size:19px; color:var(--text-primary); margin-bottom:12px; margin-right:115px;">${tema}</h3>
                <div style="font-size:13.5px; color:var(--text-secondary); display:flex; flex-direction:column; gap:6px;">
                    <div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">person</span> ${autor}</div>
                    ${dia ? `<div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">calendar_today</span> ${window.formatarDataBrCurta(dia)}</div>` : ''}
                    <div style="display:flex; align-items:center; gap:6px;"><span class="material-icons-outlined" style="font-size:16px;">place</span> <strong>${local}</strong></div>
                    ${turmaStr ? `<div style="display:flex; align-items:center; gap:6px; color:var(--primary-color); font-weight:600;"><span class="material-icons-outlined" style="font-size:16px;">groups</span> ${turmaStr}</div>` : ''}
                </div>
                <div style="font-size:12.5px; margin-top:14px; color:var(--text-secondary); line-height:1.55;">
                    <strong>Materiais:</strong> ${matsStr}<br>
                    <strong>Local de Uso:</strong> ${local} &bull; <strong>Preparo:</strong> ${preparo} min
                </div>
                <div class="plan-time-box">
                    <span class="material-icons-outlined">schedule</span> ${horarioStr}
                </div>
                <div class="plan-actions" style="display:flex; gap:10px;">
                    ${botoesAcao}
                </div>
            </div>
        `;
    });
};

window.abrirDetalhePlanoPorId = function(planoId) {
    const p = window.obterPlanosReaisConsolidados().find(x => String(x.id) === String(planoId));
    if (!p) return;
    if (typeof window.visualizarPlano === 'function') {
        window.visualizarPlano(
            p.tema || p.plano || 'Aula Prática',
            p.professor || 'Docente SENAI',
            p.horario || `${p.inicio || ''} às ${p.termino || ''}`,
            p.dia || '',
            p.sala || p.local || '',
            p.materiais || 'Nenhum',
            p.salaRetirada || p.local || '',
            p.tempoPreparo || '15',
            p.turma || ''
        );
    }
};

window.editarPlanoSalvo = function(planoId) {
    const p = window.obterPlanosReaisConsolidados().find(x => String(x.id) === String(planoId));
    if (!p) return;
    window.openPlanoModal();
    setTimeout(() => {
        if (document.getElementById('p-id')) document.getElementById('p-id').value = p.id;
        if (document.getElementById('modal-plano-title')) document.getElementById('modal-plano-title').innerText = `Editar Plano (${p.id})`;
        if (document.getElementById('p-professor')) document.getElementById('p-professor').value = p.professor || '';
        if (document.getElementById('p-professor-id')) document.getElementById('p-professor-id').value = p.professorId || '';
        if (document.getElementById('p-tema')) document.getElementById('p-tema').value = p.tema || p.plano || '';
        if (document.getElementById('p-local')) document.getElementById('p-local').value = p.sala || p.local || '';
        if (document.getElementById('p-dia')) document.getElementById('p-dia').value = p.dia || '';
        if (document.getElementById('p-inicio') && p.inicio) document.getElementById('p-inicio').value = p.inicio;
        if (document.getElementById('p-termino') && p.termino) document.getElementById('p-termino').value = p.termino;
        if (document.getElementById('p-tempo')) document.getElementById('p-tempo').value = p.tempoPreparo || '15';
        if (typeof window.populatePlanosMateriaisSelect === 'function') window.populatePlanosMateriaisSelect();
        if (typeof window.verificarChoqueHorarioPlanoModal === 'function') window.verificarChoqueHorarioPlanoModal();
    }, 50);
};

window.finalizarPlanoEspecifico = function(planoId) {
    if (!confirm('Deseja finalizar esta aula agora e liberar imediatamente a sala em Monitoramento?')) return;
    try {
        const salvos = JSON.parse(localStorage.getItem('senaivest_planos_aula') || '[]');
        salvos.forEach(p => {
            if (String(p.id) === String(planoId)) {
                p.finalizadoManual = true;
                p.status = 'Finalizada';
            }
        });
        localStorage.setItem('senaivest_planos_aula', JSON.stringify(salvos));
    } catch (e) {}

    if (Array.isArray(window.mockPlanos)) {
        window.mockPlanos.forEach(p => {
            if (String(p.id) === String(planoId)) {
                p.finalizadoManual = true;
                p.status = 'Finalizada';
            }
        });
    }

    window.sincronizarOcupacaoAutomaticaPorPlanos(true);
    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Aula Finalizada', 'A ocupação da sala foi liberada automaticamente em Monitoramento.', 'success');
    }
};

// Verificar automaticamente a cada 1 segundo entradas e saídas de horário agendado
setInterval(() => {
    if (typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') {
        window.sincronizarOcupacaoAutomaticaPorPlanos(false);
    }
}, 1000);


// =========================================================================
// 9. REGISTRO DE SAÍDA E PROFESSOR RESPONSÁVEL NOS CARDS DE MATERIAIS
//    + REGULARIZAÇÃO DIRETA POR FOTO PARA RETORNO AO ESTOQUE
// =========================================================================

window.registrarSaidaPlanoNosCardsMateriais = function(cfg) {
    if (!cfg || !Array.isArray(window.mockMateriais)) return;
    const chaves = Object.keys(cfg.selectedMap || {});

    // Se estiver editando o mesmo plano, estornar primeiro registros ativos anteriores daquele plano para evitar duplicidade
    if (cfg.isEdit && cfg.planoId) {
        window.mockMateriais.forEach(m => {
            if (Array.isArray(m.registrosCard)) {
                m.registrosCard.forEach(r => {
                    if (r.planoId === cfg.planoId && !r.regularizado && !r.isEspelhoDestino) {
                        m.qtd = (parseFloat(m.qtd) || 0) + (parseFloat(r.qtd) || 0);
                        r.regularizado = true;
                        r.motivoEncerramento = 'Substituído na edição do plano';
                    }
                });
            }
        });
    }

    if (chaves.length === 0) {
        if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
        return;
    }

    const horaCurta = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dataHoraCompleta = new Date().toLocaleString('pt-BR');

    chaves.forEach(codOpt => {
        const sel = cfg.selectedMap[codOpt];
        if (!sel) return;
        const qtdSaida = Math.max(1, parseFloat(sel.qtd) || 1);
        const salaOrigemItem = sel.sala || cfg.salaDestino;

        // Localizar o card principal de origem deste material
        let matOrigem = window.mockMateriais.find(m =>
            (m.cod || m.codigo) === codOpt &&
            !m.isCardAlocadoTemporario &&
            ((m.almoxOrigem || m.almoxAtual) === salaOrigemItem)
        );
        if (!matOrigem) {
            matOrigem = window.mockMateriais.find(m => (m.cod || m.codigo) === codOpt && !m.isCardAlocadoTemporario)
                || window.mockMateriais.find(m => (m.cod || m.codigo) === codOpt);
        }
        if (!matOrigem) return;

        const origemReal = matOrigem.almoxOrigem || matOrigem.almoxAtual || salaOrigemItem;
        const foiDeslocado = Boolean(cfg.salaDestino && origemReal && cfg.salaDestino !== origemReal);

        // Deduzir do estoque disponível no card de origem
        matOrigem.qtd = Math.max(0, (parseFloat(matOrigem.qtd) || 0) - qtdSaida);

        const idReg = 'REG-' + Date.now().toString().slice(-6) + '-' + Math.floor(10 + Math.random() * 89);
        const registroBase = {
            idReg: idReg,
            planoId: cfg.planoId,
            tipo: foiDeslocado ? 'Saída c/ Deslocamento entre Salas' : 'Saída p/ Aula Prática',
            qtd: qtdSaida,
            professorNome: cfg.professorNome,
            professorId: cfg.professorId,
            temaAula: cfg.tema,
            turma: cfg.turma,
            horario: `${window.formatarDataBrCurta(cfg.dia)} • ${cfg.horario}`,
            salaOrigem: origemReal,
            salaDestino: cfg.salaDestino,
            localPrateleiraOrigem: matOrigem.local || 'Prateleira Padrão',
            dataHoraRegistro: dataHoraCompleta,
            regularizado: false
        };

        if (!Array.isArray(matOrigem.registrosCard)) matOrigem.registrosCard = [];
        matOrigem.registrosCard.unshift(registroBase);

        // Se o material foi levado para outra sala, garantir que na sala de destino o card mostre quem colocou lá e permita regularizar por foto!
        if (foiDeslocado) {
            let cardDestino = window.mockMateriais.find(m =>
                (m.cod || m.codigo) === codOpt &&
                m !== matOrigem &&
                m.almoxAtual === cfg.salaDestino
            );
            const regEspelho = { ...registroBase, isEspelhoDestino: true };
            if (cardDestino) {
                cardDestino.qtd = (parseFloat(cardDestino.qtd) || 0) + qtdSaida;
                cardDestino.almoxOrigem = origemReal;
                cardDestino.colocadoPorProfessor = `${cfg.professorNome} (${cfg.professorId})`;
                cardDestino.responsavel = cfg.professorNome;
                cardDestino.horarioEntrada = horaCurta;
                if (!Array.isArray(cardDestino.registrosCard)) cardDestino.registrosCard = [];
                cardDestino.registrosCard.unshift(regEspelho);
            } else {
                window.mockMateriais.push({
                    ...matOrigem,
                    qtd: qtdSaida,
                    almoxOrigem: origemReal,
                    almoxAtual: cfg.salaDestino,
                    local: `Em uso na aula (${cfg.salaDestino})`,
                    responsavel: cfg.professorNome,
                    colocadoPorProfessor: `${cfg.professorNome} (${cfg.professorId})`,
                    horarioEntrada: horaCurta,
                    isCardAlocadoTemporario: true,
                    registrosCard: [regEspelho]
                });
            }
            localStorage.setItem('senaivest_transferencia_real_ativa', 'true');
        }
    });

    if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
    if (typeof renderSalas === 'function') renderSalas();
};

// Também gravar no card quando houver Transferência Avulsa entre Salas
const _origConfirmarTransferenciaV37 = window.confirmarTransferencia;
window.confirmarTransferencia = function() {
    const prodSelect = document.getElementById('transfer-produto');
    const cod = prodSelect ? prodSelect.value : '';
    const qtdReq = parseInt(document.getElementById('transfer-qtd')?.value || '1', 10);
    const destino = document.getElementById('transfer-destino')?.value || 'Sala 02 - Costura';
    const profNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Professor SENAI';
    const profId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-DOCENTE';

    const matAntes = (window.mockMateriais || []).find(m => (m.cod || m.codigo) === cod);
    const origemReal = matAntes ? (matAntes.almoxOrigem || matAntes.almoxAtual || 'Estoque Central') : 'Estoque Central';

    if (typeof _origConfirmarTransferenciaV37 === 'function') {
        _origConfirmarTransferenciaV37();
    }

    if (cod && qtdReq > 0) {
        const idReg = 'REG-TR-' + Date.now().toString().slice(-6);
        const reg = {
            idReg: idReg,
            planoId: 'TRANSF-AVULSA',
            tipo: 'Transferência para Sala',
            qtd: qtdReq,
            professorNome: profNome,
            professorId: profId,
            temaAula: 'Transferência Direta de Almoxarifado',
            turma: 'Uso Laboratorial',
            horario: new Date().toLocaleString('pt-BR'),
            salaOrigem: origemReal,
            salaDestino: destino,
            localPrateleiraOrigem: matAntes?.local || 'Prateleira Padrão',
            dataHoraRegistro: new Date().toLocaleString('pt-BR'),
            regularizado: false
        };

        (window.mockMateriais || []).forEach(m => {
            if ((m.cod || m.codigo) === cod) {
                if (!Array.isArray(m.registrosCard)) m.registrosCard = [];
                if (m.almoxAtual === destino && m.almoxOrigem === origemReal) {
                    m.colocadoPorProfessor = `${profNome} (${profId})`;
                    m.isCardAlocadoTemporario = true;
                    m.registrosCard.unshift({ ...reg, isEspelhoDestino: true });
                } else if ((m.almoxAtual || '') === origemReal) {
                    m.registrosCard.unshift(reg);
                }
            }
        });
        if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();
        if (window.salaAbertaAtual && typeof abrirSala === 'function') abrirSala(window.salaAbertaAtual);
    }
};

// Renderizar a caixa de Registro de Saída + Professor Responsável + Botão de Regularização com Foto dentro do Card do Material
window.gerarBlocoRegistrosSaidaCardHtml = function(m) {
    if (!m) return '';
    const cod = String(m.cod || m.codigo || '').replace(/'/g, "\\'");
    const registros = Array.isArray(m.registrosCard) ? m.registrosCard : [];
    const pendentes = registros.filter(r => r && !r.regularizado);
    const regularizadosRecentes = registros.filter(r => r && r.regularizado && r.fotoRegularizacao);

    let html = '';

    if (pendentes.length > 0) {
        const itensHtml = pendentes.slice(0, 3).map(r => {
            const safeRegId = String(r.idReg || '').replace(/'/g, "\\'");
            return `
                <div style="background:white; border:1px solid #fed7aa; border-radius:8px; padding:9px 10px; margin-top:7px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:4px;">
                        <span style="font-size:11px; font-weight:800; color:#c2410c; background:#ffedd5; padding:2px 7px; border-radius:6px;">
                            📤 Saída: ${r.qtd} un.
                        </span>
                        <span style="font-size:10.5px; color:#64748b; font-weight:600;">${r.tipo || 'Saída p/ Aula'}</span>
                    </div>
                    <div style="font-size:11.5px; color:#0f172a; line-height:1.45;">
                        <div><strong>Registrado/Colocado por:</strong> <span style="color:#0b2341; font-weight:800;">${r.professorNome}</span> <span style="color:#64748b; font-size:10.5px;">(${r.professorId || 'Docente'})</span></div>
                        <div><strong>Aula:</strong> ${r.temaAula || 'Aula Prática'}</div>
                        <div><strong>Fluxo:</strong> ${r.salaOrigem} ➔ <strong>${r.salaDestino}</strong></div>
                        <div style="font-size:11px; color:#64748b;"><strong>Horário:</strong> ${r.horario || r.dataHoraRegistro}</div>
                    </div>
                    <button type="button" onclick="window.abrirRegularizacaoCardMaterial('${cod}', '${safeRegId}')" style="margin-top:8px; width:100%; background:#0b2341; color:white; border:none; border-radius:7px; padding:7px 10px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        <span class="material-icons-outlined" style="font-size:15px; color:#fde047;">add_a_photo</span>
                        Devolver c/ Foto &amp; Regularizar Estoque (+${r.qtd} un.)
                    </button>
                </div>
            `;
        }).join('');

        html += `
            <div style="margin:10px 0; background:#fff7ed; border:1.5px solid #fb923c; border-radius:10px; padding:10px 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <span style="font-size:11.5px; font-weight:800; color:#9a3412; display:flex; align-items:center; gap:5px;">
                        <span class="material-icons-outlined" style="font-size:16px; color:#ea580c;">assignment_ind</span>
                        REGISTRO DE SAÍDA / EM USO (${pendentes.length})
                    </span>
                    <span style="font-size:10.5px; font-weight:800; color:#b45309;">Aguardando Retorno</span>
                </div>
                ${itensHtml}
            </div>
        `;
    } else if (regularizadosRecentes.length > 0) {
        const ult = regularizadosRecentes[0];
        html += `
            <div style="margin:10px 0; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:9px; padding:8px 11px; font-size:11.5px; color:#166534;">
                <div style="font-weight:800; display:flex; align-items:center; gap:5px;">
                    <span class="material-icons-outlined" style="font-size:15px; color:#16a34a;">verified</span>
                    Estoque Regularizado (+${ult.qtd} un.)
                </div>
                <div style="margin-top:2px; font-size:11px; color:#15803d;">
                    Retirado por <strong>${ult.professorNome}</strong> • Devolvido c/ foto por <strong>${ult.regularizadoPor || 'Docente'}</strong> em ${ult.regularizadoEm || ''}
                </div>
            </div>
        `;
    }

    return html;
};

// Abrir modal de foto diretamente pelo Card do Material para regularizar retorno ao estoque
window.regularizacaoCardAtiva = null;

window.abrirRegularizacaoCardMaterial = function(cod, idReg) {
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    let regEncontrado = null;
    let matRef = null;

    for (const m of mats) {
        if ((m.cod || m.codigo) === cod && Array.isArray(m.registrosCard)) {
            const r = m.registrosCard.find(x => x.idReg === idReg && !x.regularizado);
            if (r) {
                regEncontrado = r;
                matRef = m;
                break;
            }
        }
    }

    if (!regEncontrado || !matRef) {
        alert('Este registro já foi regularizado no estoque.');
        return;
    }

    window.regularizacaoCardAtiva = {
        cod: cod,
        idReg: idReg,
        planoId: regEncontrado.planoId || '',
        qtd: parseFloat(regEncontrado.qtd) || 1,
        nomeMaterial: matRef.nome || cod,
        professorRetirada: regEncontrado.professorNome || 'Docente',
        professorRetiradaId: regEncontrado.professorId || '',
        salaUso: regEncontrado.salaDestino || window.salaAbertaAtual || 'Laboratório',
        salaOrigem: regEncontrado.salaOrigem || matRef.almoxOrigem || matRef.almoxAtual || 'Estoque Central',
        prateleiraOrigem: regEncontrado.localPrateleiraOrigem || matRef.local || 'Prateleira A1',
        temaAula: regEncontrado.temaAula || 'Aula Prática',
        turma: regEncontrado.turma || 'Turma Regular'
    };

    const devId = document.getElementById('dev-plano-id');
    if (devId) devId.value = regEncontrado.planoId || ('CARD-' + idReg);
    const devTurma = document.getElementById('dev-turma');
    if (devTurma) devTurma.innerText = window.regularizacaoCardAtiva.turma;
    const devProf = document.getElementById('dev-prof');
    if (devProf) devProf.innerText = `${window.regularizacaoCardAtiva.professorRetirada} (Retirada) ➔ Regularizando: ${(currentUser && currentUser.nome) ? currentUser.nome : 'Usuário Logado'}`;
    const devUso = document.getElementById('dev-sala-uso');
    if (devUso) devUso.innerText = window.regularizacaoCardAtiva.salaUso;
    const devOrig = document.getElementById('dev-sala-origem');
    if (devOrig) devOrig.innerText = `${window.regularizacaoCardAtiva.salaOrigem} (${window.regularizacaoCardAtiva.prateleiraOrigem})`;
    const devMats = document.getElementById('dev-materiais-lista');
    if (devMats) devMats.innerText = `${window.regularizacaoCardAtiva.qtd} un. de ${window.regularizacaoCardAtiva.nomeMaterial} [${cod}] — Aula: ${window.regularizacaoCardAtiva.temaAula}`;

    if (typeof resetarFotoDevolucao === 'function') resetarFotoDevolucao();
    openModal('devolucao-foto-modal');
};

// Interceptar confirmarDevolucaoComFoto para processar tanto a regularização direta do Card quanto a devolução de planos
const _origConfirmarDevolucaoComFotoV37 = window.confirmarDevolucaoComFoto;
window.confirmarDevolucaoComFoto = function() {
    if (window.regularizacaoCardAtiva) {
        const ctx = window.regularizacaoCardAtiva;
        const foto = (typeof fotoDevolucaoTemp !== 'undefined' && fotoDevolucaoTemp) ? fotoDevolucaoTemp : window.fotoDevolucaoTemp;
        if (!foto) {
            alert('⚠️ Tire ou selecione uma foto comprovando que o material foi guardado de volta no estoque para regularizar!');
            return;
        }

        const quemRegularizou = (currentUser && currentUser.nome) ? currentUser.nome : 'Docente / Almoxarifado';
        const quemRegularizouId = (currentUser && currentUser.id) ? currentUser.id : 'USR-SISTEMA';
        const dataHoraReg = new Date().toLocaleString('pt-BR');

        const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];

        // 1. Devolver quantidade ao card principal da sala de origem
        const matOrigem = mats.find(m =>
            (m.cod || m.codigo) === ctx.cod &&
            !m.isCardAlocadoTemporario &&
            (m.almoxOrigem || m.almoxAtual) === ctx.salaOrigem
        ) || mats.find(m => (m.cod || m.codigo) === ctx.cod && !m.isCardAlocadoTemporario);

        if (matOrigem) {
            matOrigem.qtd = (parseFloat(matOrigem.qtd) || 0) + ctx.qtd;
            if (matOrigem.almoxOrigem) matOrigem.almoxAtual = matOrigem.almoxOrigem;
        }

        // 2. Marcar o registro como regularizado em todos os cards vinculados e reduzir/remover card temporário deslocado
        for (let i = mats.length - 1; i >= 0; i--) {
            const m = mats[i];
            if ((m.cod || m.codigo) === ctx.cod && Array.isArray(m.registrosCard)) {
                m.registrosCard.forEach(r => {
                    if (r.idReg === ctx.idReg) {
                        r.regularizado = true;
                        r.regularizadoPor = `${quemRegularizou} (${quemRegularizouId})`;
                        r.regularizadoEm = dataHoraReg;
                        r.fotoRegularizacao = foto;
                    }
                });
                if (m.isCardAlocadoTemporario && m !== matOrigem && m.almoxAtual === ctx.salaUso) {
                    m.qtd = Math.max(0, (parseFloat(m.qtd) || 0) - ctx.qtd);
                    const aindaPendentes = m.registrosCard.some(r => !r.regularizado);
                    if (m.qtd <= 0 && !aindaPendentes) {
                        mats.splice(i, 1);
                    }
                }
            }
        }

        // 3. Se havia pendência em planosAulasControle para este plano, verificar se todos os itens foram regularizados
        if (ctx.planoId && Array.isArray(window.planosAulasControle)) {
            const algumPendenteDoPlano = mats.some(m =>
                Array.isArray(m.registrosCard) && m.registrosCard.some(r => r.planoId === ctx.planoId && !r.regularizado)
            );
            if (!algumPendenteDoPlano) {
                window.planosAulasControle.forEach(pc => {
                    if (pc.id === ctx.planoId) {
                        pc.status = 'devolvido';
                        pc.devolucao = {
                            dataHora: dataHoraReg,
                            foto: foto,
                            conferidoPor: quemRegularizou
                        };
                    }
                });
                if (typeof salvarPlanosAulasStorage === 'function') salvarPlanosAulasStorage();
            }
        }

        if (typeof salvarMateriaisStorage === 'function') salvarMateriaisStorage();

        // 4. Registrar Entrada Regularizada no Histórico de Movimentação e Relatório da Coordenação
        if (typeof window.registrarMovimentacaoEstoque === 'function') {
            window.registrarMovimentacaoEstoque({
                tipo: 'Entrada',
                cod: ctx.cod,
                material: ctx.nomeMaterial,
                qtd: ctx.qtd,
                origem: ctx.salaUso,
                destino: `${ctx.salaOrigem} (${ctx.prateleiraOrigem})`,
                usuario: quemRegularizou,
                usuarioId: quemRegularizouId,
                cargo: (currentUser && currentUser.role) ? currentUser.role : 'Professor',
                vinculo: `Regularização c/ Foto no Estoque (Retirado por ${ctx.professorRetirada} • ${ctx.temaAula})`,
                fotoComprovante: foto
            });
        }

        window.regularizacaoCardAtiva = null;
        if (typeof fecharModalDevolucao === 'function') {
            fecharModalDevolucao();
        } else {
            closeModal('devolucao-foto-modal');
        }

        if (typeof window.sincronizarControleApenasDeslocados === 'function') window.sincronizarControleApenasDeslocados();
        if (typeof renderSalas === 'function') renderSalas();
        if (window.salaAbertaAtual && typeof abrirSala === 'function') abrirSala(window.salaAbertaAtual);
        if (typeof renderBannerAtrasosProf === 'function') renderBannerAtrasosProf();
        if (typeof renderPainelAtrasosCoord === 'function') renderPainelAtrasosCoord();

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(
                'Estoque Regularizado com Sucesso!',
                `+${ctx.qtd} un. de "${ctx.nomeMaterial}" retornaram para ${ctx.salaOrigem} com comprovante fotográfico.`,
                'success'
            );
        } else {
            alert(`✅ Estoque regularizado! +${ctx.qtd} un. de "${ctx.nomeMaterial}" devolvidas para ${ctx.salaOrigem}.`);
        }
        return;
    }

    if (typeof _origConfirmarDevolucaoComFotoV37 === 'function') {
        _origConfirmarDevolucaoComFotoV37();
    }
};


// =========================================================================
// 10. CERTIFICAÇÃO FINAL ("CONFIRMAR OK") DO DIÁRIO & BANCADAS
//     + INTERFACE DA BIBLIOTECA DE REGISTROS CERTIFICADOS
// =========================================================================

window.obterBibliotecaDiarios = function() {
    try {
        const raw = localStorage.getItem('senaivest_biblioteca_diarios');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}

    // Registro inicial demonstrativo caso ainda não haja nenhum salvo
    const seed = [
        {
            id: 'CERT-2026-10482',
            dataHoraCertificacao: '28/10/2026, 11:55:00',
            timestamp: 1793199300000,
            planoId: 'PLAN-2026-091',
            planoTema: 'Modelagem Industrial & Preparação de Moldes Base',
            dataAula: '2026-10-28',
            horarioAula: '08:00 às 12:00',
            sala: 'Sala 01 - Modelagem',
            turma: 'Vestuário e Estilismo - Manhã (Turma 2026.1)',
            professorNome: 'Giovani Azevedo',
            professorId: 'PROF-1234567',
            observacoes: 'Todas as bancadas conferidas, réguas de alfaiate e carretilhas organizadas ao término.',
            resumoPresenca: { presentes: 6, ausentes: 0, total: 6, percentual: 100 },
            listaAlunos: [
                { id: 'ALU-001', nome: 'Pedro Santos', presente: true, bancada: 'Bancada 01' },
                { id: 'ALU-002', nome: 'Mariana Souza', presente: true, bancada: 'Bancada 02' },
                { id: 'ALU-003', nome: 'Lucas Oliveira', presente: true, bancada: 'Bancada 03' },
                { id: 'ALU-004', nome: 'Ana Beatriz Lima', presente: true, bancada: 'Bancada 04' }
            ],
            mapaBancadas: [
                { numero: 'Bancada 01', tipo: 'Mesa de Corte & Modelagem Plana', status: 'Ocupada', aluno: 'Pedro Santos (ALU-001)', materiais: 'Papel Kraft, Régua Curva Francesa, Fita Métrica' },
                { numero: 'Bancada 02', tipo: 'Mesa de Corte & Modelagem Plana', status: 'Ocupada', aluno: 'Mariana Souza (ALU-002)', materiais: 'Papel Kraft, Tesoura Alfaiate, Esquadro' },
                { numero: 'Bancada 03', tipo: 'Reta Industrial Direct Drive', status: 'Ocupada', aluno: 'Lucas Oliveira (ALU-003)', materiais: 'Tecido Algodão Cru, Linha Poliéster' },
                { numero: 'Bancada 04', tipo: 'Overlock Industrial 3 Fios', status: 'Ocupada', aluno: 'Ana Beatriz Lima (ALU-004)', materiais: 'Cones de Fio Poliéster, Pinça de Enfiamento' }
            ]
        }
    ];
    try {
        localStorage.setItem('senaivest_biblioteca_diarios', JSON.stringify(seed));
    } catch (e) {}
    return seed;
};

window.salvarBibliotecaDiarios = function(lista) {
    try {
        localStorage.setItem('senaivest_biblioteca_diarios', JSON.stringify(lista));
    } catch (e) {}
    window.atualizarBadgesBibliotecaDiarios();
};

window.atualizarBadgesBibliotecaDiarios = function() {
    const total = window.obterBibliotecaDiarios().length;
    const b1 = document.getElementById('badge-count-biblioteca-diarios');
    if (b1) b1.innerText = total;
    const b2 = document.getElementById('link-count-biblioteca-diarios');
    if (b2) b2.innerText = total;
};

window.switchDiarioSubTab = function(aba) {
    const opPanel = document.getElementById('diario-operacao-panel');
    const bibPanel = document.getElementById('diario-biblioteca-panel');
    const btnOp = document.getElementById('btn-subtab-diario-operacao');
    const btnBib = document.getElementById('btn-subtab-diario-biblioteca');

    window.atualizarBadgesBibliotecaDiarios();

    if (aba === 'biblioteca') {
        if (opPanel) opPanel.style.display = 'none';
        if (bibPanel) bibPanel.style.display = 'block';
        if (btnBib) {
            btnBib.style.background = '#0b2341';
            btnBib.style.color = 'white';
        }
        if (btnOp) {
            btnOp.style.background = 'transparent';
            btnOp.style.color = '#475569';
        }
        window.renderBibliotecaDiariosCertificados();
    } else {
        if (opPanel) opPanel.style.display = 'block';
        if (bibPanel) bibPanel.style.display = 'none';
        if (btnOp) {
            btnOp.style.background = '#0b2341';
            btnOp.style.color = 'white';
        }
        if (btnBib) {
            btnBib.style.background = 'transparent';
            btnBib.style.color = '#475569';
        }
        window.atualizarResumoCertificacaoDiarioLive();
    }
};

window.abrirBibliotecaDiariosDireto = function() {
    nav('view-diario-classe');
    window.switchDiarioSubTab('biblioteca');
};

window.obterSnapshotAtualDiarioEBancadas = function() {
    const planoSel = document.getElementById('diario-plano-select');
    const planoVal = planoSel ? planoSel.value : '';
    const planoTexto = (planoSel && planoSel.selectedIndex >= 0) ? planoSel.options[planoSel.selectedIndex].text : planoVal;
    const turmaSel = document.getElementById('diario-turma-select');
    const turmaEscolhida = turmaSel ? turmaSel.value : 'Vestuário e Estilismo - Manhã';

    const planos = window.obterPlanosReaisConsolidados();
    const planoObj = planos.find(p => p.id === planoVal || p.plano === planoVal || p.tema === planoVal) || null;

    const alunosTurma = (window.mockAlunosDiario || []).filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        const tT = turmaEscolhida.toLowerCase();
        return aT.includes(tT) || tT.includes(aT) ||
               (tT.includes('manhã') && aT.includes('manhã')) ||
               (tT.includes('tarde') && aT.includes('tarde')) ||
               (tT.includes('noite') && aT.includes('noite'));
    });

    const bancadasTurma = (window.bancadasCheckinMock || []).filter(b => {
        if (!b.turma || b.turma === 'Todas as Turmas') return true;
        const bT = b.turma.toLowerCase();
        const tF = turmaEscolhida.toLowerCase();
        return bT.includes(tF) || tF.includes(bT) ||
               (tF.includes('manhã') && bT.includes('manhã')) ||
               (tF.includes('tarde') && bT.includes('tarde')) ||
               (tF.includes('noite') && bT.includes('noite'));
    });

    const presentes = alunosTurma.filter(a => !!a.presente).length;
    const total = alunosTurma.length;
    const ausentes = Math.max(0, total - presentes);
    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;

    const mapaBancadas = bancadasTurma.map(b => {
        const ocupada = b.alunoMatricula && b.alunoMatricula !== 'LIVRE' && b.alunoMatricula !== 'PENDENTE';
        return {
            numero: b.numero || 'Bancada',
            tipo: b.tipo || 'Máquina Industrial',
            status: ocupada ? 'Ocupada' : 'Disponível',
            aluno: ocupada ? `${b.alunoNome || 'Aluno'} (${b.alunoMatricula})` : 'Livre / Sem aluno alocado',
            alunoMatricula: b.alunoMatricula || 'LIVRE',
            materiais: b.materiais || 'Kit Padrão'
        };
    });

    const listaAlunos = alunosTurma.map(a => {
        const banc = mapaBancadas.find(mb => mb.alunoMatricula === a.id);
        return {
            id: a.id,
            nome: a.nome,
            presente: !!a.presente,
            bancada: banc ? banc.numero : 'Não alocada'
        };
    });

    return {
        planoVal,
        planoId: planoObj ? planoObj.id : (planoVal || 'PLAN-AVULSO'),
        planoTema: planoObj ? (planoObj.tema || planoObj.plano) : (planoTexto || 'Aula Prática'),
        dataAula: planoObj ? (planoObj.dia || planoObj.data || new Date().toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
        horarioAula: planoObj ? (planoObj.horario || `${planoObj.inicio || '08:00'} às ${planoObj.termino || '10:00'}`) : 'Horário Regular',
        sala: planoObj ? (planoObj.sala || planoObj.local || 'Laboratório Prático') : 'Laboratório Prático',
        turma: turmaEscolhida,
        resumoPresenca: { presentes, ausentes, total, percentual },
        bancadasOcupadasCount: mapaBancadas.filter(b => b.status === 'Ocupada').length,
        bancadasTotalCount: mapaBancadas.length,
        listaAlunos,
        mapaBancadas
    };
};

window.atualizarResumoCertificacaoDiarioLive = function() {
    const boxResumo = document.getElementById('certificacao-resumo-live');
    const badgeAtual = document.getElementById('certificacao-status-badge-atual');
    if (!boxResumo) return;

    const snap = window.obterSnapshotAtualDiarioEBancadas();
    const existentes = window.obterBibliotecaDiarios();
    const jaCertificado = snap.planoVal ? existentes.find(c => c.planoId === snap.planoId || c.planoTema === snap.planoTema) : null;

    if (badgeAtual) {
        if (jaCertificado) {
            badgeAtual.style.background = '#dcfce7';
            badgeAtual.style.color = '#166534';
            badgeAtual.style.borderColor = '#86efac';
            badgeAtual.innerText = `✔ Certificado (${jaCertificado.id})`;
        } else {
            badgeAtual.style.background = 'white';
            badgeAtual.style.color = '#0f766e';
            badgeAtual.style.borderColor = '#99f6e4';
            badgeAtual.innerText = 'Aguardando Confirmação OK';
        }
    }

    boxResumo.innerHTML = `
        <div><span style="color:#64748b; font-size:11px; text-transform:uppercase; font-weight:700; display:block;">Plano Selecionado</span><strong style="color:#0b2341;">${snap.planoTema}</strong></div>
        <div><span style="color:#64748b; font-size:11px; text-transform:uppercase; font-weight:700; display:block;">Frequência Registrada</span><strong style="color:#059669;">${snap.resumoPresenca.presentes}/${snap.resumoPresenca.total} presentes (${snap.resumoPresenca.percentual}%)</strong></div>
        <div><span style="color:#64748b; font-size:11px; text-transform:uppercase; font-weight:700; display:block;">Organização de Bancadas</span><strong style="color:#0284c7;">${snap.bancadasOcupadasCount} ocupada(s) de ${snap.bancadasTotalCount}</strong></div>
        <div><span style="color:#64748b; font-size:11px; text-transform:uppercase; font-weight:700; display:block;">Sala &amp; Horário</span><strong>${snap.sala} • ${snap.horarioAula}</strong></div>
    `;
};

// Atualizar o resumo de certificação sempre que alunos ou bancadas forem renderizados
const _origRenderDiarioAlunosV37 = window.renderDiarioAlunos;
window.renderDiarioAlunos = function() {
    if (typeof _origRenderDiarioAlunosV37 === 'function') _origRenderDiarioAlunosV37();
    window.atualizarResumoCertificacaoDiarioLive();
    window.atualizarBadgesBibliotecaDiarios();
};

const _origRenderDiarioBancadasV37 = window.renderDiarioBancadasAlocacao;
window.renderDiarioBancadasAlocacao = function() {
    if (typeof _origRenderDiarioBancadasV37 === 'function') _origRenderDiarioBancadasV37();
    window.atualizarResumoCertificacaoDiarioLive();
};

window.confirmarECertificarDiarioBancadas = function() {
    const snap = window.obterSnapshotAtualDiarioEBancadas();
    if (!snap.planoVal) {
        alert('Selecione primeiro um Plano de Aula no topo para certificar o Diário e as Bancadas.');
        return;
    }

    const chk = document.getElementById('chk-certificar-diario-ok');
    if (chk && !chk.checked) {
        chk.focus();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Marque a Confirmação', 'Marque a caixa de seleção certificando que o diário e as bancadas foram concluídos antes de confirmar.', 'warning');
        } else {
            alert('Marque a caixa de seleção certificando a finalização do diário e da organização de bancadas.');
        }
        return;
    }

    const obs = document.getElementById('inp-obs-certificacao-diario')?.value.trim() || 'Diário de presença e organização de bancadas conferidos e finalizados sem pendências.';
    const profNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Prof. Giovani Azevedo';
    const profId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-1234567';
    const protocolo = 'CERT-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

    const registroCertificado = {
        id: protocolo,
        dataHoraCertificacao: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now(),
        planoId: snap.planoId,
        planoTema: snap.planoTema,
        dataAula: snap.dataAula,
        horarioAula: snap.horarioAula,
        sala: snap.sala,
        turma: snap.turma,
        professorNome: profNome,
        professorId: profId,
        observacoes: obs,
        resumoPresenca: snap.resumoPresenca,
        listaAlunos: snap.listaAlunos,
        mapaBancadas: snap.mapaBancadas
    };

    const lista = window.obterBibliotecaDiarios();
    lista.unshift(registroCertificado);
    window.salvarBibliotecaDiarios(lista);

    if (chk) chk.checked = false;
    const obsInp = document.getElementById('inp-obs-certificacao-diario');
    if (obsInp) obsInp.value = '';

    window.atualizarResumoCertificacaoDiarioLive();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            `Certificado ${protocolo} Salvo na Biblioteca!`,
            `O registro finalizado de "${snap.planoTema}" foi arquivado com sucesso.`,
            'success'
        );
    }

    // Levar direto para a Biblioteca e destacar o registro recém-arquivado
    window.switchDiarioSubTab('biblioteca');
};

window.renderBibliotecaDiariosCertificados = function() {
    const grid = document.getElementById('biblioteca-diarios-grid');
    const kpiBox = document.getElementById('biblioteca-diarios-kpis');
    if (!grid) return;

    const lista = window.obterBibliotecaDiarios();
    window.atualizarBadgesBibliotecaDiarios();

    const filtroTurma = (document.getElementById('filtro-turma-biblioteca-diarios')?.value || 'todas').toLowerCase();
    const busca = (document.getElementById('busca-biblioteca-diarios')?.value || '').trim().toLowerCase();

    const filtrados = lista.filter(item => {
        if (filtroTurma !== 'todas' && !String(item.turma || '').toLowerCase().includes(filtroTurma)) {
            return false;
        }
        if (busca) {
            const alvo = `${item.id} ${item.planoTema} ${item.planoId} ${item.sala} ${item.turma} ${item.professorNome}`.toLowerCase();
            if (!alvo.includes(busca)) return false;
        }
        return true;
    });

    if (kpiBox) {
        const totalCerts = lista.length;
        const totalBancadasHomolog = lista.reduce((acc, c) => acc + ((c.mapaBancadas || []).filter(b => b.status === 'Ocupada').length), 0);
        const mediaFreq = totalCerts > 0
            ? Math.round(lista.reduce((acc, c) => acc + (c.resumoPresenca?.percentual || 0), 0) / totalCerts)
            : 0;

        kpiBox.innerHTML = `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #0b2341; border-radius:12px; padding:14px 18px;">
                <span style="font-size:11.5px; color:#64748b; font-weight:700; text-transform:uppercase;">Registros na Biblioteca</span>
                <div style="font-size:24px; font-weight:800; color:#0b2341; margin-top:4px;">${totalCerts}</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-left:4px solid #10b981; border-radius:12px; padding:14px 18px;">
                <span style="font-size:11.5px; color:#166534; font-weight:700; text-transform:uppercase;">Bancadas Homologadas</span>
                <div style="font-size:24px; font-weight:800; color:#15803d; margin-top:4px;">${totalBancadasHomolog}</div>
            </div>
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-left:4px solid #0284c7; border-radius:12px; padding:14px 18px;">
                <span style="font-size:11.5px; color:#0369a1; font-weight:700; text-transform:uppercase;">Frequência Média Certificada</span>
                <div style="font-size:24px; font-weight:800; color:#0284c7; margin-top:4px;">${mediaFreq}%</div>
            </div>
        `;
    }

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding:42px 20px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:14px; color:#64748b;">
                <span class="material-icons-outlined" style="font-size:40px; opacity:0.6; margin-bottom:8px;">library_books</span>
                <h4 style="margin:0 0 6px; color:#0b2341;">Nenhum registro certificado encontrado</h4>
                <p style="margin:0; font-size:13px;">Finalize a chamada e a alocação em "Diário &amp; Bancadas" e clique em "Confirmar OK &amp; Arquivar na Biblioteca".</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtrados.map(c => {
        const bancOcup = (c.mapaBancadas || []).filter(b => b.status === 'Ocupada').length;
        const bancTot = (c.mapaBancadas || []).length;
        const safeId = String(c.id).replace(/'/g, "\\'");

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-top:4px solid #10b981; border-radius:14px; padding:18px; box-shadow:0 4px 12px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
                        <span style="font-family:monospace; font-size:12px; font-weight:800; color:#0b2341; background:#f1f5f9; padding:3px 9px; border-radius:6px;">${c.id}</span>
                        <span style="font-size:11px; font-weight:800; color:#15803d; background:#dcfce7; border:1px solid #86efac; padding:3px 9px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;">
                            <span class="material-icons-outlined" style="font-size:13px;">verified</span> CERTIFICADO OK
                        </span>
                    </div>
                    <h4 style="margin:0 0 8px; font-size:16px; color:#0b2341; font-weight:800; line-height:1.35;">${c.planoTema}</h4>
                    <div style="font-size:12.5px; color:#475569; display:flex; flex-direction:column; gap:5px;">
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#0284c7;">person</span> <strong>Certificado por:</strong> ${c.professorNome}</div>
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#10b981;">place</span> <strong>Sala:</strong> ${c.sala} &bull; ${window.formatarDataBrCurta(c.dataAula)} (${c.horarioAula})</div>
                        <div><span class="material-icons-outlined" style="font-size:14px; vertical-align:middle; color:#6366f1;">groups</span> ${c.turma}</div>
                        <div style="font-size:11.5px; color:#64748b;"><span class="material-icons-outlined" style="font-size:13px; vertical-align:middle;">history</span> Homologado em: ${c.dataHoraCertificacao}</div>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                        <span style="font-size:11.5px; font-weight:700; background:#ecfdf5; color:#047857; padding:4px 10px; border-radius:8px;">
                            👥 ${c.resumoPresenca?.presentes || 0}/${c.resumoPresenca?.total || 0} Presentes (${c.resumoPresenca?.percentual || 0}%)
                        </span>
                        <span style="font-size:11.5px; font-weight:700; background:#eff6ff; color:#1d4ed8; padding:4px 10px; border-radius:8px;">
                            🛠️ ${bancOcup}/${bancTot} Bancadas Alocadas
                        </span>
                    </div>
                </div>

                <div style="display:flex; gap:8px; padding-top:12px; border-top:1px solid #f1f5f9;">
                    <button type="button" onclick="window.abrirDetalheCertificadoBiblioteca('${safeId}')" class="primary-btn" style="flex:1; justify-content:center; background:#0b2341; font-size:12.5px; padding:9px 12px;">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">visibility</span> Ver Registro
                    </button>
                    <button type="button" onclick="window.imprimirCertificadoBiblioteca('${safeId}')" class="secondary-btn" style="justify-content:center; font-size:12.5px; padding:9px 12px;">
                        <span class="material-icons-outlined" style="font-size:16px;">print</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.abrirDetalheCertificadoBiblioteca = function(certId) {
    const c = window.obterBibliotecaDiarios().find(x => x.id === certId);
    const body = document.getElementById('modal-detalhe-certificado-body');
    if (!c || !body) return;

    const linhasAlunos = (c.listaAlunos || []).map(a => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px 10px; font-family:monospace; font-weight:700;">${a.id}</td>
            <td style="padding:8px 10px; font-weight:600;">${a.nome}</td>
            <td style="padding:8px 10px;">
                <span style="padding:2px 8px; border-radius:10px; font-size:11px; font-weight:700; background:${a.presente ? '#dcfce7' : '#fee2e2'}; color:${a.presente ? '#166534' : '#991b1b'};">
                    ${a.presente ? 'Presente' : 'Ausente'}
                </span>
            </td>
            <td style="padding:8px 10px; color:#0284c7; font-weight:700;">${a.bancada || '—'}</td>
        </tr>
    `).join('');

    const cardsBancadas = (c.mapaBancadas || []).map(b => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${b.status === 'Ocupada' ? '#10b981' : '#cbd5e1'}; border-radius:10px; padding:10px 12px; font-size:12px;">
            <div style="display:flex; justify-content:space-between; font-weight:800; color:#0b2341; margin-bottom:4px;">
                <span>${b.numero} — ${b.tipo}</span>
                <span style="color:${b.status === 'Ocupada' ? '#15803d' : '#64748b'};">${b.status}</span>
            </div>
            <div><strong>Aluno:</strong> ${b.aluno}</div>
            <div style="color:#64748b; margin-top:2px;"><strong>Insumos:</strong> ${b.materiais}</div>
        </div>
    `).join('');

    body.innerHTML = `
        <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:12px; padding:14px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <div style="font-size:11.5px; color:#166534; font-weight:800; text-transform:uppercase;">Protocolo Oficial Homologado</div>
                <div style="font-size:18px; font-weight:900; color:#064e3b; font-family:monospace;">${c.id}</div>
            </div>
            <div style="text-align:right; font-size:12px; color:#15803d;">
                <strong>Confirmado por:</strong> ${c.professorNome} (${c.professorId})<br>
                <strong>Data/Hora:</strong> ${c.dataHoraCertificacao}
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; margin-bottom:18px; font-size:13px;">
            <div><strong>Plano de Aula:</strong> ${c.planoTema} (${c.planoId})</div>
            <div><strong>Sala / Laboratório:</strong> ${c.sala}</div>
            <div><strong>Turma:</strong> ${c.turma}</div>
            <div><strong>Data e Horário:</strong> ${window.formatarDataBrCurta(c.dataAula)} • ${c.horarioAula}</div>
            <div style="grid-column:1 / -1;"><strong>Observações Certificadas:</strong> ${c.observacoes || 'Sem observações adicionais.'}</div>
        </div>

        <h4 style="margin:0 0 8px; color:#0b2341; font-size:14.5px;">1. Lista de Presença Consolidada (${c.resumoPresenca?.presentes || 0}/${c.resumoPresenca?.total || 0} presentes)</h4>
        <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; margin-bottom:18px;">
            <table style="width:100%; border-collapse:collapse; font-size:12.5px; text-align:left;">
                <thead style="background:#f1f5f9; font-size:11px; text-transform:uppercase; color:#475569;">
                    <tr>
                        <th style="padding:8px 10px;">Matrícula</th>
                        <th style="padding:8px 10px;">Aluno(a)</th>
                        <th style="padding:8px 10px;">Frequência</th>
                        <th style="padding:8px 10px;">Bancada</th>
                    </tr>
                </thead>
                <tbody>${linhasAlunos || '<tr><td colspan="4" style="padding:12px; text-align:center;">Nenhum aluno listado.</td></tr>'}</tbody>
            </table>
        </div>

        <h4 style="margin:0 0 8px; color:#0b2341; font-size:14.5px;">2. Mapa Certificado de Organização das Bancadas</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:10px; margin-bottom:18px;">
            ${cardsBancadas || '<div style="color:#64748b; font-size:12.5px;">Nenhuma bancada registrada.</div>'}
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; padding-top:14px; border-top:1px solid #e2e8f0;">
            <button type="button" class="secondary-btn" onclick="closeModal('modal-detalhe-certificado-biblioteca')">Fechar</button>
            <button type="button" class="primary-btn" onclick="window.imprimirCertificadoBiblioteca('${String(c.id).replace(/'/g, "\\'")}')" style="background:#0b2341;">
                <span class="material-icons-outlined" style="font-size:17px; margin-right:6px;">print</span> Imprimir Certificado
            </button>
        </div>
    `;

    openModal('modal-detalhe-certificado-biblioteca');
};

window.imprimirCertificadoBiblioteca = function(certId) {
    const c = window.obterBibliotecaDiarios().find(x => x.id === certId);
    if (!c) return;
    const win = window.open('', '_blank', 'width=860,height=720');
    if (!win) {
        alert('Permita pop-ups para imprimir o Certificado da Biblioteca.');
        return;
    }
    const alunosRows = (c.listaAlunos || []).map(a =>
        `<tr><td>${a.id}</td><td>${a.nome}</td><td>${a.presente ? 'PRESENTE' : 'AUSENTE'}</td><td>${a.bancada || '-'}</td></tr>`
    ).join('');
    const bancadasRows = (c.mapaBancadas || []).map(b =>
        `<tr><td>${b.numero}</td><td>${b.tipo}</td><td>${b.status}</td><td>${b.aluno}</td><td>${b.materiais}</td></tr>`
    ).join('');

    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Certificado ${c.id} - SenaiVest 2.0</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
                .top { border-bottom: 3px solid #0b2341; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; }
                .meta { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
                th, td { border: 1px solid #94a3b8; padding: 7px 9px; text-align: left; }
                th { background: #e2e8f0; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:right; margin-bottom:12px;">
                <button onclick="window.print()" style="background:#0b2341; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir / Salvar PDF</button>
            </div>
            <div class="top">
                <div>
                    <h2 style="margin:0; color:#0b2341;">SENAIVEST 2.0 • CERTIFICADO DE DIÁRIO E ORGANIZAÇÃO DE BANCADAS</h2>
                    <div style="font-size:12px; color:#475569; margin-top:4px;">Registro Oficial Arquivado na Biblioteca Digital</div>
                </div>
                <div style="text-align:right; font-size:12px;">
                    <strong>Protocolo:</strong> ${c.id}<br>
                    <strong>Certificado em:</strong> ${c.dataHoraCertificacao}
                </div>
            </div>
            <div class="meta">
                <strong>Plano de Aula:</strong> ${c.planoTema} (${c.planoId})<br>
                <strong>Docente Responsável:</strong> ${c.professorNome} (${c.professorId})<br>
                <strong>Sala:</strong> ${c.sala} &bull; <strong>Data/Horário:</strong> ${c.dataAula} (${c.horarioAula}) &bull; <strong>Turma:</strong> ${c.turma}<br>
                <strong>Observações:</strong> ${c.observacoes || '-'}
            </div>
            <h3>1. Frequência dos Alunos (${c.resumoPresenca?.presentes || 0}/${c.resumoPresenca?.total || 0} presentes)</h3>
            <table>
                <thead><tr><th>Matrícula</th><th>Aluno(a)</th><th>Status</th><th>Bancada Alocada</th></tr></thead>
                <tbody>${alunosRows}</tbody>
            </table>
            <h3>2. Organização das Bancadas &amp; Insumos</h3>
            <table>
                <thead><tr><th>Bancada</th><th>Equipamento / Máquina</th><th>Status</th><th>Aluno Alocado</th><th>Insumos</th></tr></thead>
                <tbody>${bancadasRows}</tbody>
            </table>
        </body>
        </html>
    `);
    win.document.close();
};

// Inicialização imediata dos badges da biblioteca
setTimeout(() => {
    if (typeof window.atualizarBadgesBibliotecaDiarios === 'function') window.atualizarBadgesBibliotecaDiarios();
    if (typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') window.sincronizarOcupacaoAutomaticaPorPlanos(false);
}, 200);


// =========================================================================
// SENAIVEST v3.8 — 6 NOVOS RECURSOS E CORREÇÕES INTEGRADAS:
// 1) Ficha Física sem nome automático do professor + Relação de Todos os Materiais Cadastrados
// 2) Botão "Transferir" corrigido nas Salas Virtuais e no Painel Rápido do Professor
// 3) Setor de Compras integrado a Shopee, Mercado Livre, Amazon & AliExpress + Organização nas Salas Virtuais
// 4) "Todos os Planos" da Coordenação com layout executivo moderno (sem Catraca / sem GERADO)
// 5) Separação Automática por "Kits de Aula" cruzando com Alunos Presentes
// 6) Check-in e Check-out de Ferramentas via QR Code na Bancada (Micro-Almoxarifado por Máquina)
// =========================================================================

// --- ENRIQUECIMENTO DE CATÁLOGO BASE PARA KITS DE CAMISARIA / MODELAGEM (SEM APAGAR DADOS DO USUÁRIO) ---
(function enriquecerCatalogoInsumosKits() {
    if (!Array.isArray(window.mockMateriais)) window.mockMateriais = [];
    const extras = [
        { cod: 'MAT-011', nome: 'Tecido Tricoline 100% Algodão (Camisaria)', tipo: 'Tecido', qtd: 120, preco: 'R$ 26,90', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira Tecidos A1', horarioEntrada: '08:00', responsavel: 'Almoxarifado SENAI', imagem: 'tecido_algodao.jpg' },
        { cod: 'MAT-012', nome: 'Papel Kraft p/ Modelagem 80g (Folhas/Metros)', tipo: 'Insumo', qtd: 240, preco: 'R$ 2,50', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Suporte Bobinas Kraft', horarioEntrada: '08:00', responsavel: 'Almoxarifado SENAI', imagem: 'tecido_algodao.jpg' },
        { cod: 'MAT-013', nome: 'Botões Camisaria Perolados 11mm', tipo: 'Aviamento', qtd: 600, preco: 'R$ 0,35', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Gaveteiro Aviamentos B2', horarioEntrada: '08:00', responsavel: 'Almoxarifado SENAI', imagem: 'tecido_algodao.jpg' },
        { cod: 'MAT-014', nome: 'Fio / Linha de Costura Poliéster 120', tipo: 'Insumo', qtd: 90, preco: 'R$ 9,90', almoxOrigem: 'Sala 01 - Modelagem', almoxAtual: 'Sala 01 - Modelagem', local: 'Prateleira B1', horarioEntrada: '08:00', responsavel: 'Almoxarifado SENAI', imagem: 'tecido_algodao.jpg' }
    ];
    let adicionou = false;
    extras.forEach(item => {
        if (!window.mockMateriais.some(m => (m.cod || m.codigo) === item.cod)) {
            window.mockMateriais.push(item);
            adicionou = true;
        }
    });
    if (adicionou && typeof window.salvarMateriaisStorage === 'function') {
        window.salvarMateriaisStorage();
    }
})();


// =========================================================================
// 1. FICHA FÍSICA SEM PREENCHIMENTO AUTOMÁTICO DO PROFESSOR + RELAÇÃO DE TODOS OS MATERIAIS CADASTRADOS
// =========================================================================
const _origOpenPlanoModalV38 = window.openPlanoModal;
window.openPlanoModal = function() {
    if (typeof _origOpenPlanoModalV38 === 'function') _origOpenPlanoModalV38();
    // Garantir que na abertura de uma nova ficha o nome do professor NÃO venha preenchido automaticamente
    const idEdit = document.getElementById('p-id')?.value || '';
    if (!idEdit) {
        const profInp = document.getElementById('p-professor');
        if (profInp) profInp.value = '';
    }
};

window.imprimirFichaAulaEmBranco = function() {
    const win = window.open('', '_blank', 'width=920,height=780');
    if (!win) {
        alert('Permita pop-ups no navegador para abrir e imprimir a Ficha Física de Aula.');
        return;
    }

    // Consolidar todos os materiais cadastrados no sistema (ordenados por sala e código)
    const listaMats = Array.isArray(window.mockMateriais) ? [...window.mockMateriais] : [];
    const unicosPorSalaCod = [];
    const vistos = new Set();
    listaMats.filter(m => !m.isCardAlocadoTemporario).forEach(m => {
        const chave = `${m.cod || m.codigo || ''}|${m.almoxAtual || m.almoxOrigem || ''}`;
        if (!vistos.has(chave)) {
            vistos.add(chave);
            unicosPorSalaCod.push(m);
        }
    });
    unicosPorSalaCod.sort((a, b) => {
        const sA = String(a.almoxAtual || a.almoxOrigem || '');
        const sB = String(b.almoxAtual || b.almoxOrigem || '');
        if (sA !== sB) return sA.localeCompare(sB);
        return String(a.cod || '').localeCompare(String(b.cod || ''));
    });

    const linhasCatalogoHtml = unicosPorSalaCod.map(m => `
        <tr>
            <td style="text-align:center; font-size:15px;">&#9744;</td>
            <td style="font-family:monospace; font-weight:bold;">${m.cod || m.codigo || '-'}</td>
            <td><strong>${m.nome || 'Material'}</strong></td>
            <td>${m.tipo || 'Insumo'}</td>
            <td>${m.almoxAtual || m.almoxOrigem || '-'} <span style="color:#475569;">(${m.local || 'Prateleira'})</span></td>
            <td style="text-align:center;">${m.qtd ?? 0}</td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `).join('');

    win.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Ficha Física de Aula Prática e Relação de Materiais - SENAI</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; padding: 24px 28px; color: #0f172a; font-size: 12px; }
                .header { border-bottom: 3px solid #0b2341; padding-bottom: 10px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end; }
                .box { border: 1.5px solid #64748b; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
                .row { display: flex; gap: 16px; margin-bottom: 12px; }
                .row:last-child { margin-bottom: 2px; }
                .field { flex: 1; border-bottom: 1px solid #475569; padding-bottom: 4px; font-size: 12.5px; }
                h4 { margin: 14px 0 6px; color: #0b2341; font-size: 13px; text-transform: uppercase; letter-spacing: 0.3px; }
                table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                th, td { border: 1px solid #64748b; padding: 6px 7px; font-size: 11.5px; text-align: left; }
                th { background: #e2e8f0; color: #0b2341; font-weight: bold; }
                .avulso-row td { height: 22px; }
                @media print { .no-print { display: none; } body { padding: 10px; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; background:#f1f5f9; padding:10px 14px; border-radius:8px;">
                <span style="font-size:12.5px; color:#334155;"><strong>Ficha Física Pronta para Impressão:</strong> Campos do professor em branco para preenchimento manual + catálogo completo de materiais cadastrados.</span>
                <button onclick="window.print()" style="background:#0b2341; color:white; border:none; padding:9px 18px; border-radius:6px; cursor:pointer; font-weight:bold;">🖨️ Imprimir Ficha Física</button>
            </div>

            <div class="header">
                <div>
                    <h2 style="margin:0; color:#0b2341; font-size:17px;">SENAI &bull; FICHA FÍSICA DE AULA PRÁTICA E CONTROLE DE MATERIAIS</h2>
                    <p style="margin:3px 0 0; font-size:11.5px; color:#475569;">Preenchimento manual em laboratório (Fotografar e enviar em "Material Impresso" no SenaiVest 2.0 para baixa automática)</p>
                </div>
                <div style="text-align:right; font-size:11.5px; line-height:1.5;">
                    <strong>Emissão do Formulário:</strong> ${new Date().toLocaleDateString('pt-BR')}<br>
                    <strong>Protocolo Manual:</strong> _______ / ${new Date().getFullYear()}
                </div>
            </div>

            <div class="box">
                <div class="row">
                    <div class="field" style="flex:2;"><strong>Professor(a) / Usuário Responsável:</strong> </div>
                    <div class="field" style="flex:1;"><strong>Matrícula / ID:</strong> </div>
                </div>
                <div class="row">
                    <div class="field"><strong>Data da Aula:</strong> ____/____/2026</div>
                    <div class="field"><strong>Horário:</strong> ____:____ às ____:____</div>
                    <div class="field"><strong>Nº Alunos Presentes:</strong> ________</div>
                </div>
                <div class="row">
                    <div class="field"><strong>Sala / Laboratório de Uso:</strong> </div>
                    <div class="field"><strong>Turma:</strong> </div>
                </div>
                <div class="row">
                    <div class="field"><strong>Tema da Aula Prática / Kit Utilizado:</strong> </div>
                </div>
            </div>

            <h4>1. Relação Completa de Materiais Cadastrados no Sistema (Marque os itens utilizados)</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width:28px; text-align:center;">Uso</th>
                        <th style="width:74px;">Código</th>
                        <th>Material / Insumo / Ferramenta Cadastrada</th>
                        <th style="width:78px;">Categoria</th>
                        <th style="width:175px;">Almoxarifado / Local</th>
                        <th style="width:52px; text-align:center;">Saldo</th>
                        <th style="width:68px;">Qtd. Retirada</th>
                        <th style="width:68px;">Consumida</th>
                        <th style="width:68px;">Devolvida</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasCatalogoHtml || '<tr><td colspan="9" style="text-align:center;">Nenhum material cadastrado.</td></tr>'}
                </tbody>
            </table>

            <h4>2. Outros Materiais / Insumos Avulsos (Caso necessário)</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width:85px;">Código</th>
                        <th>Descrição do Material / Insumo</th>
                        <th style="width:140px;">Sala de Origem</th>
                        <th style="width:85px;">Qtd. Retirada</th>
                        <th style="width:85px;">Qtd. Consumida</th>
                        <th style="width:85px;">Qtd. Devolvida</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="avulso-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr class="avulso-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                    <tr class="avulso-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </tbody>
            </table>

            <div style="margin-top:34px; display:flex; justify-content:space-between; gap:48px;">
                <div style="flex:1; border-top:1px solid #0f172a; text-align:center; padding-top:6px; font-size:11.5px;">
                    <strong>Assinatura do(a) Professor(a) / Responsável pela Retirada</strong>
                </div>
                <div style="flex:1; border-top:1px solid #0f172a; text-align:center; padding-top:6px; font-size:11.5px;">
                    <strong>Visto da Coordenação / Conferência de Almoxarifado</strong>
                </div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
};


// =========================================================================
// 2. CORREÇÃO DEFINITIVA DO BOTÃO "TRANSFERIR" (SALAS VIRTUAIS & PAINEL RÁPIDO DO PROFESSOR)
// =========================================================================
window.openTransferirModal = function(preselectCod = null) {
    const prodSelect = document.getElementById('transfer-produto');
    const destSelect = document.getElementById('transfer-destino');
    const planoSelect = document.getElementById('transfer-plano-select');
    if (!prodSelect) return;

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    prodSelect.innerHTML = '';

    mats.forEach((m, idx) => {
        const cod = m.cod || m.codigo || '';
        const salaAtual = m.almoxAtual || m.almoxOrigem || 'Estoque Central';
        const opt = document.createElement('option');
        opt.value = cod;
        opt.setAttribute('data-idx', String(idx));
        opt.setAttribute('data-preco', m.preco || 'R$ 0,00');
        opt.setAttribute('data-qtd', String(m.qtd ?? 0));
        opt.setAttribute('data-almox', salaAtual);
        opt.textContent = `${cod} - ${m.nome} (Disp: ${m.qtd ?? 0} em ${salaAtual})`;
        // Se houver múltiplos registros do mesmo código, priorizar o da sala aberta atualmente
        if (preselectCod && cod === preselectCod) {
            if (!window.salaAbertaAtual || salaAtual === window.salaAbertaAtual) {
                opt.selected = true;
            }
        }
        prodSelect.appendChild(opt);
    });

    if (preselectCod && prodSelect.value !== preselectCod) {
        prodSelect.value = preselectCod;
    }

    // Popular salas de destino dinamicamente a partir de mockSalas
    if (destSelect) {
        const salas = Array.isArray(window.mockSalas) && window.mockSalas.length > 0
            ? window.mockSalas
            : [{ nome: 'Sala 01 - Modelagem' }, { nome: 'Sala 02 - Costura' }, { nome: 'Estoque Central' }];
        destSelect.innerHTML = '';
        salas.forEach(s => {
            destSelect.innerHTML += `<option value="${s.nome}">${s.nome}</option>`;
        });
    }

    // Popular planos reais no seletor de vínculo
    if (planoSelect) {
        const planosReais = typeof window.obterPlanosReaisConsolidados === 'function'
            ? window.obterPlanosReaisConsolidados()
            : (window.mockPlanos || []);
        if (planosReais.length > 0) {
            planoSelect.innerHTML = planosReais.map(p =>
                `<option value="${p.id}">${p.id} — ${p.tema || p.plano || 'Aula Prática'} (${p.sala || p.local || ''})</option>`
            ).join('');
        }
    }

    const qtdInp = document.getElementById('transfer-qtd');
    if (qtdInp) qtdInp.value = '1';

    const tipoSel = document.getElementById('transfer-tipo');
    if (tipoSel) tipoSel.value = 'simples';
    if (typeof window.toggleTransferTipo === 'function') window.toggleTransferTipo();

    window.updateTransferInfo();
    openModal('transferir-modal');
};

// Manter openSolicitarModal apontando para o mesmo fluxo completo
window.openSolicitarModal = function(preselectCod = null) {
    window.openTransferirModal(preselectCod);
};

window.updateTransferInfo = function() {
    const prodSelect = document.getElementById('transfer-produto');
    const destSelect = document.getElementById('transfer-destino');
    if (!prodSelect || prodSelect.selectedIndex < 0) return;
    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    if (!selectedOpt) return;

    const qtd = selectedOpt.getAttribute('data-qtd') || '0';
    const almox = selectedOpt.getAttribute('data-almox') || 'Estoque';
    const preco = selectedOpt.getAttribute('data-preco') || 'R$ 0,00';

    const infoQtd = document.getElementById('transfer-info-qtd');
    if (infoQtd) infoQtd.innerText = `${qtd} un. (Origem: ${almox})`;
    const infoPreco = document.getElementById('transfer-info-preco');
    if (infoPreco) infoPreco.innerText = preco;

    // Pré-selecionar automaticamente uma sala de destino diferente da sala de origem
    if (destSelect && destSelect.value === almox) {
        for (let i = 0; i < destSelect.options.length; i++) {
            if (destSelect.options[i].value !== almox) {
                destSelect.selectedIndex = i;
                break;
            }
        }
    }
};

window.executarTransferenciaUnificada = function() {
    const tipo = document.getElementById('transfer-tipo')?.value || 'simples';
    const prodSelect = document.getElementById('transfer-produto');
    if (!prodSelect || prodSelect.selectedIndex < 0) return;

    const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
    const cod = prodSelect.value;
    const almoxSelecionado = selectedOpt ? selectedOpt.getAttribute('data-almox') : '';
    const qtdReq = parseFloat(document.getElementById('transfer-qtd')?.value || '0');

    if (!qtdReq || qtdReq <= 0) {
        alert('Informe uma quantidade válida maior que zero para transferir.');
        return;
    }

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const material = mats.find(m => (m.cod || m.codigo) === cod && (m.almoxAtual || m.almoxOrigem) === almoxSelecionado)
        || mats.find(m => (m.cod || m.codigo) === cod);

    if (!material) {
        alert('Material não localizado no estoque.');
        return;
    }

    if (qtdReq > (parseFloat(material.qtd) || 0)) {
        alert(`Quantidade solicitada (${qtdReq}) excede o saldo disponível (${material.qtd} un.) nesta sala!`);
        return;
    }

    const origemReal = material.almoxAtual || material.almoxOrigem || 'Estoque Central';
    const profNome = (currentUser && currentUser.nome) ? currentUser.nome : 'Docente SENAI';
    const profId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-DOCENTE';
    const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let destino = document.getElementById('transfer-destino')?.value || 'Sala 02 - Costura';
    let vinculoDesc = `Transferência entre Salas (${origemReal} ➔ ${destino})`;

    if (tipo === 'plano') {
        const planoSel = document.getElementById('transfer-plano-select');
        const pId = planoSel ? planoSel.value : '';
        const planoObj = (typeof window.obterPlanosReaisConsolidados === 'function' ? window.obterPlanosReaisConsolidados() : []).find(p => p.id === pId);
        if (planoObj && (planoObj.sala || planoObj.local)) {
            destino = planoObj.sala || planoObj.local;
        }
        vinculoDesc = `Vinculado ao Plano ${pId || ''} (${destino})`;
    } else if (destino === origemReal) {
        alert(`O item já está em "${origemReal}". Escolha outra Sala Virtual de destino para transferir.`);
        return;
    }

    // 1. Deduzir da sala de origem
    material.qtd = Math.max(0, (parseFloat(material.qtd) || 0) - qtdReq);

    // 2. Criar registro rastreável no card para quem for devolver com foto
    const idReg = 'REG-TR-' + Date.now().toString().slice(-6);
    const regBase = {
        idReg: idReg,
        planoId: 'TRANSF',
        tipo: 'Transferência entre Salas',
        qtd: qtdReq,
        professorNome: profNome,
        professorId: profId,
        temaAula: vinculoDesc,
        turma: 'Movimentação de Almoxarifado',
        horario: new Date().toLocaleString('pt-BR'),
        salaOrigem: origemReal,
        salaDestino: destino,
        localPrateleiraOrigem: material.local || 'Prateleira A1',
        dataHoraRegistro: new Date().toLocaleString('pt-BR'),
        regularizado: false
    };

    if (!Array.isArray(material.registrosCard)) material.registrosCard = [];
    material.registrosCard.unshift(regBase);

    // 3. Adicionar/atualizar na sala de destino se for sala diferente
    if (destino !== origemReal) {
        let cardDest = mats.find(m => m !== material && (m.cod || m.codigo) === cod && m.almoxAtual === destino);
        const regEspelho = { ...regBase, isEspelhoDestino: true };
        if (cardDest) {
            cardDest.qtd = (parseFloat(cardDest.qtd) || 0) + qtdReq;
            cardDest.almoxOrigem = material.almoxOrigem || origemReal;
            cardDest.colocadoPorProfessor = `${profNome} (${profId})`;
            cardDest.responsavel = profNome;
            cardDest.horarioEntrada = horaAgora;
            if (!Array.isArray(cardDest.registrosCard)) cardDest.registrosCard = [];
            cardDest.registrosCard.unshift(regEspelho);
        } else {
            mats.push({
                ...material,
                qtd: qtdReq,
                almoxOrigem: material.almoxOrigem || origemReal,
                almoxAtual: destino,
                local: `Transferido p/ ${destino}`,
                responsavel: profNome,
                colocadoPorProfessor: `${profNome} (${profId})`,
                horarioEntrada: horaAgora,
                isCardAlocadoTemporario: true,
                registrosCard: [regEspelho]
            });
        }
        localStorage.setItem('senaivest_transferencia_real_ativa', 'true');
    }

    if (typeof window.salvarMateriaisStorage === 'function') window.salvarMateriaisStorage();

    if (typeof window.registrarMovimentacaoEstoque === 'function') {
        window.registrarMovimentacaoEstoque({
            tipo: 'Transferência',
            cod: cod,
            material: material.nome,
            qtd: qtdReq,
            origem: origemReal,
            destino: destino,
            usuario: profNome,
            usuarioId: profId,
            cargo: (currentUser && currentUser.role) ? currentUser.role : 'Professor',
            vinculo: vinculoDesc
        });
    }

    if (typeof window.sincronizarControleApenasDeslocados === 'function') window.sincronizarControleApenasDeslocados();
    closeModal('transferir-modal');

    // Atualizar IMEDIATAMENTE Salas Virtuais, Sala Aberta e Painel Rápido do Professor!
    if (typeof window.renderSalas === 'function') window.renderSalas();
    const viewSalaDetalhe = document.getElementById('view-sala-detalhe');
    if (viewSalaDetalhe && viewSalaDetalhe.classList.contains('active') && window.salaAbertaAtual && typeof abrirSala === 'function') {
        abrirSala(window.salaAbertaAtual);
    }
    if (typeof window.renderProfEstoqueRapido === 'function') window.renderProfEstoqueRapido();
    if (typeof window.renderProfSalasTabs === 'function') window.renderProfSalasTabs();
    if (typeof window.renderBannerAtrasosProf === 'function') window.renderBannerAtrasosProf();
    if (typeof window.renderPainelAtrasosCoord === 'function') window.renderPainelAtrasosCoord();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            'Transferência Concluída!',
            `${qtdReq} un. de "${material.nome}" transferidas de ${origemReal} para ${destino}.`,
            'success'
        );
    }
};

window.confirmarTransferencia = window.executarTransferenciaUnificada;
window.confirmarSolicitacao = window.executarTransferenciaUnificada;


// =========================================================================
// 3. SETOR DE COMPRAS & INTEGRAÇÃO COM SHOPEE, MERCADO LIVRE, AMAZON E SALAS VIRTUAIS
// =========================================================================
window.obterPedidosSetorCompras = function() {
    try {
        const raw = localStorage.getItem('senaivest_pedidos_marketplace');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {}

    const inicial = [
        {
            id: 'PED-ML-8041',
            plataforma: 'Mercado Livre',
            produto: 'Tesoura de Alfaiate Profissional Titânio 10"',
            sku: 'MAT-002',
            categoria: 'Ferramenta',
            qtd: 8,
            preco: 'R$ 44,90',
            dataHora: '28/10/2026, 15:20',
            comprador: 'Coordenação SENAI',
            status: 'registrado_estoque',
            distribuicao: [{ sala: 'Sala 01 - Modelagem', qtd: 8, local: 'Gaveta 2 (Bancada Mestre)' }],
            url: 'https://www.mercadolivre.com.br/'
        }
    ];
    localStorage.setItem('senaivest_pedidos_marketplace', JSON.stringify(inicial));
    return inicial;
};

window.salvarPedidosSetorCompras = function(lista) {
    try {
        localStorage.setItem('senaivest_pedidos_marketplace', JSON.stringify(lista));
    } catch (e) {}
};

window.abrirPortalMarketplaceCompra = function(plataforma) {
    const termoInp = document.getElementById('sc-busca-termo');
    const qtdInp = document.getElementById('sc-busca-qtd');
    const catSel = document.getElementById('sc-busca-categoria');

    const termo = (termoInp && termoInp.value.trim()) ? termoInp.value.trim() : 'insumos costura industrial vestuario';
    const qtd = parseFloat(qtdInp?.value || '10') || 10;
    const cat = catSel?.value || 'Insumo';
    const qEnc = encodeURIComponent(termo);
    const slugMl = encodeURIComponent(termo.toLowerCase().replace(/\s+/g, '-'));

    let url = `https://www.mercadolivre.com.br/`;
    if (plataforma === 'Shopee') {
        url = `https://shopee.com.br/search?keyword=${qEnc}`;
    } else if (plataforma === 'Mercado Livre') {
        url = `https://lista.mercadolivre.com.br/${slugMl}`;
    } else if (plataforma === 'Amazon') {
        url = `https://www.amazon.com.br/s?k=${qEnc}`;
    } else if (plataforma === 'AliExpress') {
        url = `https://pt.aliexpress.com/wholesale?SearchText=${qEnc}`;
    }

    window.open(url, '_blank', 'noopener');

    // Pré-identificar os campos do pedido automaticamente para facilitar o registro ao concluir a compra no portal
    const platSel = document.getElementById('sc-plataforma');
    if (platSel) platSel.value = plataforma;
    const nomeInp = document.getElementById('sc-produto-nome');
    if (nomeInp && termoInp && termoInp.value.trim()) nomeInp.value = termoInp.value.trim();
    const qtdForm = document.getElementById('sc-produto-qtd');
    if (qtdForm) qtdForm.value = qtd;
    const catForm = document.getElementById('sc-produto-categoria');
    if (catForm) catForm.value = cat;
    const skuForm = document.getElementById('sc-produto-sku');
    if (skuForm && !skuForm.value.trim()) {
        skuForm.value = 'MAT-' + Math.floor(100 + Math.random() * 899);
    }
    const pedForm = document.getElementById('sc-numero-pedido');
    if (pedForm && !pedForm.value.trim()) {
        const sigla = plataforma.slice(0, 2).toUpperCase();
        pedForm.value = `PED-${sigla}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const pill = document.getElementById('sc-plataforma-detectada-pill');
    if (pill) {
        pill.style.background = '#dcfce7';
        pill.style.color = '#166534';
        pill.innerText = `🔗 Portal ${plataforma} Aberto — Pronto para Registrar Pedido`;
    }
    window.atualizarPreviewDistribuicaoCompras();
};

window.identificarLinkMarketplaceAutomatico = function(valor) {
    const txt = String(valor || '').trim();
    const pill = document.getElementById('sc-plataforma-detectada-pill');
    if (!txt) {
        if (pill) {
            pill.style.background = '#f1f5f9';
            pill.style.color = '#475569';
            pill.innerText = 'Aguardando Link ou Seleção de Portal';
        }
        return;
    }

    const low = txt.toLowerCase();
    let plat = null;
    if (low.includes('shopee')) plat = 'Shopee';
    else if (low.includes('mercadolivre') || low.includes('mercadolibre') || low.includes('mlb-')) plat = 'Mercado Livre';
    else if (low.includes('amazon') || low.includes('amzn')) plat = 'Amazon';
    else if (low.includes('aliexpress')) plat = 'AliExpress';

    if (plat) {
        const platSel = document.getElementById('sc-plataforma');
        if (platSel) platSel.value = plat;
        if (pill) {
            pill.style.background = '#dbeafe';
            pill.style.color = '#1d4ed8';
            pill.innerText = `✔ Plataforma Identificada: ${plat}`;
        }
    }

    // Extrair título legível do slug da URL caso seja um link de produto
    try {
        if (txt.startsWith('http')) {
            const u = new URL(txt);
            const partes = u.pathname.split('/').filter(Boolean);
            let candidato = partes.find(p => p.length > 8 && p.includes('-')) || partes[0] || '';
            candidato = decodeURIComponent(candidato)
                .replace(/[-_]+/g, ' ')
                .replace(/\b(dp|gp|ref|mlb\d+|item|p)\b/gi, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
            if (candidato.length > 4) {
                const formatado = candidato.charAt(0).toUpperCase() + candidato.slice(1, 75);
                const nomeInp = document.getElementById('sc-produto-nome');
                if (nomeInp && !nomeInp.value.trim()) {
                    nomeInp.value = formatado;
                }
                const cLow = formatado.toLowerCase();
                const catForm = document.getElementById('sc-produto-categoria');
                if (catForm) {
                    if (cLow.includes('tecido') || cLow.includes('tricoline') || cLow.includes('malha') || cLow.includes('algod')) catForm.value = 'Tecido';
                    else if (cLow.includes('tesoura') || cLow.includes('regua') || cLow.includes('régua') || cLow.includes('fita') || cLow.includes('pinca')) catForm.value = 'Ferramenta';
                    else if (cLow.includes('botao') || cLow.includes('botão') || cLow.includes('ziper') || cLow.includes('zíper')) catForm.value = 'Aviamento';
                }
            }
        }
    } catch (e) {}

    const skuForm = document.getElementById('sc-produto-sku');
    if (skuForm && !skuForm.value.trim()) {
        skuForm.value = 'MAT-' + Math.floor(100 + Math.random() * 899);
    }
    const pedForm = document.getElementById('sc-numero-pedido');
    if (pedForm && !pedForm.value.trim()) {
        pedForm.value = 'PED-' + Math.floor(10000 + Math.random() * 89999);
    }
};

window.toggleModoFracionarCompras = function(ativo) {
    const unico = document.getElementById('sc-destino-unico-box');
    const mult = document.getElementById('sc-destino-multiplo-box');
    if (unico) unico.style.display = ativo ? 'none' : 'grid';
    if (mult) mult.style.display = ativo ? 'block' : 'none';
    if (ativo) window.atualizarPreviewDistribuicaoCompras();
};

window.atualizarPreviewDistribuicaoCompras = function() {
    const container = document.getElementById('sc-lista-salas-fracionamento');
    if (!container) return;
    const salas = Array.isArray(window.mockSalas) ? window.mockSalas : [];
    const qtdTotal = parseFloat(document.getElementById('sc-produto-qtd')?.value || '10') || 10;
    const porSala = salas.length > 0 ? Math.floor(qtdTotal / salas.length) : qtdTotal;
    const resto = salas.length > 0 ? (qtdTotal - porSala * salas.length) : 0;

    container.innerHTML = salas.map((s, idx) => {
        const sugerida = idx === 0 ? (porSala + resto) : porSala;
        return `
            <div style="background:white; border:1px solid #86efac; border-radius:10px; padding:10px 12px;">
                <div style="font-weight:800; font-size:12.5px; color:#0b2341; margin-bottom:6px;">${s.nome}</div>
                <div style="display:grid; grid-template-columns:90px 1fr; gap:8px;">
                    <div>
                        <label style="font-size:10.5px; font-weight:700; color:#64748b;">Qtd nesta Sala</label>
                        <input type="number" class="sc-frac-qtd-input" data-sala="${s.nome}" min="0" step="0.5" value="${sugerida}" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; font-weight:700;">
                    </div>
                    <div>
                        <label style="font-size:10.5px; font-weight:700; color:#64748b;">Prateleira / Gaveta / Local</label>
                        <input type="text" class="sc-frac-local-input" data-sala="${s.nome}" value="Prateleira A1" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px;">
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.efetivarEntradaCompraNasSalasVirtuais = function(pedido) {
    if (!pedido || !Array.isArray(pedido.distribuicao)) return;
    if (!Array.isArray(window.mockMateriais)) window.mockMateriais = [];

    const horaEntrada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const responsavelNome = pedido.comprador || ((currentUser && currentUser.nome) ? currentUser.nome : 'Setor de Compras');

    pedido.distribuicao.forEach(dest => {
        const q = parseFloat(dest.qtd) || 0;
        if (q <= 0) return;

        // Verificar se já existe o produto naquela mesma sala para somar ou criar card organizado
        let existente = window.mockMateriais.find(m =>
            !m.isCardAlocadoTemporario &&
            (((m.cod || m.codigo) === pedido.sku) || String(m.nome).toLowerCase() === String(pedido.produto).toLowerCase()) &&
            (m.almoxAtual || m.almoxOrigem) === dest.sala
        );

        if (existente) {
            existente.qtd = (parseFloat(existente.qtd) || 0) + q;
            existente.local = dest.local || existente.local;
            existente.preco = pedido.preco || existente.preco;
            existente.horarioEntrada = horaEntrada;
            existente.responsavel = `${responsavelNome} (${pedido.plataforma})`;
        } else {
            const nLow = String(pedido.produto).toLowerCase();
            const imgDefault = nLow.includes('tesoura') ? 'tesoura_alfaiate.jpg' : 'tecido_algodao.jpg';
            window.mockMateriais.unshift({
                cod: pedido.sku,
                nome: pedido.produto,
                tipo: pedido.categoria || 'Insumo',
                qtd: q,
                preco: pedido.preco || 'R$ 0,00',
                almoxOrigem: dest.sala,
                almoxAtual: dest.sala,
                local: dest.local || 'Prateleira A1',
                horarioEntrada: horaEntrada,
                responsavel: `${responsavelNome} (${pedido.plataforma})`,
                imagem: imgDefault
            });
        }

        if (typeof window.registrarMovimentacaoEstoque === 'function') {
            window.registrarMovimentacaoEstoque({
                tipo: 'Entrada',
                cod: pedido.sku,
                material: pedido.produto,
                qtd: q,
                origem: `${pedido.plataforma} (${pedido.id})`,
                destino: `${dest.sala} • ${dest.local}`,
                usuario: responsavelNome,
                cargo: (currentUser && currentUser.role) ? currentUser.role : 'Coordenação',
                vinculo: `Compra ${pedido.plataforma} • Pedido ${pedido.id}`
            });
        }
    });

    if (typeof window.salvarMateriaisStorage === 'function') window.salvarMateriaisStorage();
    if (typeof window.renderSalas === 'function') window.renderSalas();
    if (typeof window.renderProfEstoqueRapido === 'function') window.renderProfEstoqueRapido();
};

window.confirmarRegistroCompraMarketplace = function() {
    const plataforma = document.getElementById('sc-plataforma')?.value || 'Mercado Livre';
    const produto = document.getElementById('sc-produto-nome')?.value.trim() || '';
    const sku = (document.getElementById('sc-produto-sku')?.value.trim()) || ('MAT-' + Math.floor(100 + Math.random() * 899));
    const numPedido = (document.getElementById('sc-numero-pedido')?.value.trim()) || ('PED-' + Date.now().toString().slice(-5));
    const qtdTotal = parseFloat(document.getElementById('sc-produto-qtd')?.value || '0');
    const precoRaw = document.getElementById('sc-produto-preco')?.value.trim() || 'R$ 0,00';
    const preco = precoRaw.startsWith('R$') ? precoRaw : `R$ ${precoRaw}`;
    const categoria = document.getElementById('sc-produto-categoria')?.value || 'Insumo';
    const statusEntrega = document.getElementById('sc-status-entrega')?.value || 'imediato';
    const urlLink = document.getElementById('sc-link-produto')?.value.trim() || '';
    const fracionado = !!document.getElementById('sc-fracionar-salas-chk')?.checked;

    if (!produto) {
        alert('Informe o nome do produto comprado (ou cole o link da plataforma) para continuar.');
        return;
    }
    if (!qtdTotal || qtdTotal <= 0) {
        alert('Informe uma quantidade válida comprada.');
        return;
    }

    let distribuicao = [];
    if (fracionado) {
        const inputsQtd = document.querySelectorAll('.sc-frac-qtd-input');
        const inputsLocal = document.querySelectorAll('.sc-frac-local-input');
        inputsQtd.forEach((inp, idx) => {
            const q = parseFloat(inp.value || '0');
            const sala = inp.getAttribute('data-sala');
            const loc = inputsLocal[idx] ? inputsLocal[idx].value.trim() : 'Prateleira A1';
            if (q > 0 && sala) {
                distribuicao.push({ sala, qtd: q, local: loc || 'Prateleira A1' });
            }
        });
        if (distribuicao.length === 0) {
            alert('Informe a quantidade em pelo menos uma Sala Virtual na distribuição.');
            return;
        }
    } else {
        const salaUnica = document.getElementById('sc-sala-destino')?.value || 'Estoque Central';
        const localUnico = document.getElementById('sc-local-interno')?.value.trim() || 'Prateleira A1';
        distribuicao.push({ sala: salaUnica, qtd: qtdTotal, local: localUnico });
    }

    const totalDistribuido = distribuicao.reduce((acc, d) => acc + d.qtd, 0);
    const novoPedido = {
        id: numPedido,
        plataforma,
        produto,
        sku,
        categoria,
        qtd: totalDistribuido,
        preco,
        dataHora: new Date().toLocaleString('pt-BR'),
        comprador: (currentUser && currentUser.nome) ? currentUser.nome : 'Setor de Compras',
        status: statusEntrega === 'imediato' ? 'registrado_estoque' : 'em_transito',
        distribuicao,
        url: urlLink
    };

    if (statusEntrega === 'imediato') {
        window.efetivarEntradaCompraNasSalasVirtuais(novoPedido);
    }

    const pedidos = window.obterPedidosSetorCompras();
    pedidos.unshift(novoPedido);
    window.salvarPedidosSetorCompras(pedidos);

    window.limparFormularioSetorCompras();
    window.renderSetorCompras();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            statusEntrega === 'imediato' ? 'Produto Cadastrado nas Salas Virtuais!' : 'Pedido Registrado em Trânsito!',
            statusEntrega === 'imediato'
                ? `${totalDistribuido} un. de "${produto}" (${plataforma}) já estão organizadas nas Salas Virtuais.`
                : `Pedido ${numPedido} (${plataforma}) salvo. Clique em "Receber nas Salas" assim que for entregue.`,
            'success'
        );
    }
};

window.receberPedidoTransitoNasSalas = function(pedidoId) {
    const pedidos = window.obterPedidosSetorCompras();
    const ped = pedidos.find(p => p.id === pedidoId);
    if (!ped || ped.status === 'registrado_estoque') return;

    ped.status = 'registrado_estoque';
    ped.dataRecebimento = new Date().toLocaleString('pt-BR');
    window.efetivarEntradaCompraNasSalasVirtuais(ped);
    window.salvarPedidosSetorCompras(pedidos);
    window.renderSetorCompras();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Pedido Recebido e Estocado!', `"${ped.produto}" foi inserido automaticamente nas Salas Virtuais configuradas.`, 'success');
    }
};

window.limparFormularioSetorCompras = function() {
    ['sc-link-produto', 'sc-produto-nome', 'sc-produto-sku', 'sc-numero-pedido'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const pill = document.getElementById('sc-plataforma-detectada-pill');
    if (pill) {
        pill.style.background = '#f1f5f9';
        pill.style.color = '#475569';
        pill.innerText = 'Aguardando Link ou Seleção de Portal';
    }
};

window.renderSetorCompras = function() {
    const salaSel = document.getElementById('sc-sala-destino');
    if (salaSel) {
        const salas = Array.isArray(window.mockSalas) ? window.mockSalas : [];
        const atual = salaSel.value;
        salaSel.innerHTML = salas.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('');
        if (atual) salaSel.value = atual;
    }
    window.atualizarPreviewDistribuicaoCompras();

    const container = document.getElementById('sc-pedidos-marketplace-container');
    if (!container) return;

    const pedidos = window.obterPedidosSetorCompras();
    if (pedidos.length === 0) {
        container.innerHTML = `<div style="padding:24px; text-align:center; color:#64748b;">Nenhum pedido registrado ainda no Setor de Compras.</div>`;
        return;
    }

    const coresPlat = {
        'Shopee': { bg: '#ffedd5', color: '#c2410c' },
        'Mercado Livre': { bg: '#fef9c3', color: '#854d0e' },
        'Amazon': { bg: '#e0f2fe', color: '#0369a1' },
        'AliExpress': { bg: '#ffe4e6', color: '#be123c' }
    };

    const rows = pedidos.map(p => {
        const cp = coresPlat[p.plataforma] || { bg: '#f1f5f9', color: '#334155' };
        const destStr = (p.distribuicao || []).map(d => `<strong>${d.sala}</strong>: ${d.qtd} un. <em>(${d.local})</em>`).join('<br>');
        const safeId = String(p.id).replace(/'/g, "\\'");
        const acaoHtml = p.status === 'registrado_estoque'
            ? `<span style="background:#dcfce7; color:#15803d; font-weight:800; font-size:11.5px; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:4px;"><span class="material-icons-outlined" style="font-size:14px;">check_circle</span> Nas Salas Virtuais</span>`
            : `<button type="button" onclick="window.receberPedidoTransitoNasSalas('${safeId}')" class="primary-btn" style="background:#0284c7; padding:6px 12px; font-size:11.5px; font-weight:800;">📦 Confirmar Chegada &amp; Estocar</button>`;

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:11px 12px; font-family:monospace; font-weight:800; color:#0b2341;">${p.id}</td>
                <td style="padding:11px 12px;"><span style="background:${cp.bg}; color:${cp.color}; font-weight:800; font-size:11.5px; padding:3px 9px; border-radius:8px;">${p.plataforma}</span></td>
                <td style="padding:11px 12px;">
                    <div style="font-weight:800; color:#0f172a;">${p.produto}</div>
                    <div style="font-size:11px; color:#64748b;">SKU: ${p.sku} &bull; ${p.categoria} &bull; ${p.dataHora}</div>
                </td>
                <td style="padding:11px 12px; font-weight:800;">${p.qtd} un.<br><span style="font-size:11px; color:#059669;">${p.preco}</span></td>
                <td style="padding:11px 12px; font-size:12px; line-height:1.45;">${destStr}</td>
                <td style="padding:11px 12px; text-align:center;">${acaoHtml}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
                <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11px; text-transform:uppercase; color:#64748b;">
                    <tr>
                        <th style="padding:10px 12px;">Pedido</th>
                        <th style="padding:10px 12px;">Portal</th>
                        <th style="padding:10px 12px;">Produto Identificado</th>
                        <th style="padding:10px 12px;">Qtd / Valor</th>
                        <th style="padding:10px 12px;">Organização nas Salas Virtuais</th>
                        <th style="padding:10px 12px; text-align:center;">Status / Entrada</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
};


// =========================================================================
// 4. "TODOS OS PLANOS" NA COORDENAÇÃO — LAYOUT EXECUTIVO MODERNO (SEM CATRACA / SEM "GERADO")
// =========================================================================
window.filtroCoordPlanosStatus = 'todos';
window.filtroCoordPlanosSala = 'todas';
window.filtroCoordPlanosBusca = '';

const _origRenderPlanosGridCompletaV38 = window.renderPlanosGridCompleta;
window.renderPlanosGridCompleta = function() {
    const coordToolbar = document.getElementById('coord-todos-planos-toolbar');
    const profActions = document.getElementById('planos-prof-actions-bar');
    if (coordToolbar) coordToolbar.style.display = 'none';
    if (profActions) profActions.style.display = 'flex';
    if (typeof _origRenderPlanosGridCompletaV38 === 'function') _origRenderPlanosGridCompletaV38();
};

window.renderPlanosGeral = function(apenasGridEKpis = false) {
    const grid = document.getElementById('plans-grid');
    const coordToolbar = document.getElementById('coord-todos-planos-toolbar');
    const profActions = document.getElementById('planos-prof-actions-bar');
    const titleEl = document.getElementById('planos-title');
    const subEl = document.getElementById('planos-subtitle');
    if (!grid) return;

    if (titleEl) {
        titleEl.innerHTML = `<span class="material-icons-outlined" style="color:var(--primary-color);">assignment</span> Todos os Planos de Aula (Visão Executiva da Coordenação)`;
    }
    if (subEl) {
        subEl.innerText = 'Acompanhamento pedagógico consolidado de agendamentos, docentes, laboratórios e insumos reservados';
    }
    if (profActions) profActions.style.display = 'none';
    if (coordToolbar) coordToolbar.style.display = 'block';

    let planos = typeof window.obterPlanosReaisConsolidados === 'function'
        ? window.obterPlanosReaisConsolidados()
        : (window.mockPlanos || []);

    // Se houver planos antigos simplificados sem professor/horário, enriquecer de forma limpa (zero menção a catraca/gerado)
    const hoje = (typeof window.getHojeFormatadoLocal === 'function') ? window.getHojeFormatadoLocal() : '2026-10-29';
    planos = planos.map((p, i) => ({
        ...p,
        id: p.id || `PLAN-2026-0${i + 1}`,
        tema: p.tema || p.plano || 'Aula Prática de Vestuário',
        professor: p.professor || (i % 2 === 0 ? 'Prof. Giovani Azevedo' : 'Prof. Roberto Silva'),
        dia: p.dia || p.data || hoje,
        inicio: p.inicio || '08:00',
        termino: p.termino || '10:00',
        horario: p.horario || `${p.inicio || '08:00'} às ${p.termino || '10:00'}`,
        sala: p.sala || p.local || (i % 2 === 0 ? 'Sala 01 - Modelagem' : 'Sala 02 - Costura'),
        turma: p.turma || 'Vestuário e Estilismo - Manhã (Turma 2026.1)',
        materiais: p.materiais || 'Insumos laboratoriais reservados'
    }));

    const agora = Date.now();
    let countEmAula = 0, countAgendados = 0, countConcluidos = 0;
    const enriquecidos = planos.map(p => {
        const est = window.avaliarEstadoTemporalPlano ? window.avaliarEstadoTemporalPlano(p, agora) : { codigo: 'agendado', label: 'Agendado' };
        if (est.codigo === 'em_aula') countEmAula++;
        else if (est.codigo === 'concluido') countConcluidos++;
        else countAgendados++;
        return { ...p, _est: est };
    });

    const salasUnicas = Array.from(new Set(enriquecidos.map(p => p.sala)));

    const kpisHtml = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px; margin-bottom:16px;">
            <div style="background:white; border:1px solid #e2e8f0; border-left:4px solid #0b2341; border-radius:12px; padding:14px 18px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">Total de Planos</span>
                <div style="font-size:26px; font-weight:900; color:#0b2341; margin-top:2px;">${enriquecidos.length}</div>
            </div>
            <div style="background:white; border:1px solid #fecaca; border-left:4px solid #ef4444; border-radius:12px; padding:14px 18px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <span style="font-size:11px; font-weight:800; color:#dc2626; text-transform:uppercase;">Em Aula Agora</span>
                <div style="font-size:26px; font-weight:900; color:#ef4444; margin-top:2px;">${countEmAula}</div>
            </div>
            <div style="background:white; border:1px solid #bae6fd; border-left:4px solid #0284c7; border-radius:12px; padding:14px 18px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <span style="font-size:11px; font-weight:800; color:#0369a1; text-transform:uppercase;">Programados / Agendados</span>
                <div style="font-size:26px; font-weight:900; color:#0284c7; margin-top:2px;">${countAgendados}</div>
            </div>
            <div style="background:white; border:1px solid #bbf7d0; border-left:4px solid #10b981; border-radius:12px; padding:14px 18px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                <span style="font-size:11px; font-weight:800; color:#15803d; text-transform:uppercase;">Concluídos</span>
                <div style="font-size:26px; font-weight:900; color:#10b981; margin-top:2px;">${countConcluidos}</div>
            </div>
        </div>
    `;

    if (coordToolbar) {
        const kpiBox = document.getElementById('coord-todos-planos-kpis');
        if (apenasGridEKpis && kpiBox) {
            kpiBox.innerHTML = kpisHtml;
        } else {
            coordToolbar.innerHTML = `
                <div id="coord-todos-planos-kpis">${kpisHtml}</div>
                <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                        <select onchange="window.filtroCoordPlanosStatus=this.value; window.renderPlanosGeral(true);" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:700; color:#0b2341;">
                            <option value="todos" ${window.filtroCoordPlanosStatus === 'todos' ? 'selected' : ''}>Todos os Status</option>
                            <option value="em_aula" ${window.filtroCoordPlanosStatus === 'em_aula' ? 'selected' : ''}>● Em Aula Agora</option>
                            <option value="agendado" ${window.filtroCoordPlanosStatus === 'agendado' ? 'selected' : ''}>📅 Agendados</option>
                            <option value="concluido" ${window.filtroCoordPlanosStatus === 'concluido' ? 'selected' : ''}>✔ Concluídos</option>
                        </select>
                        <select onchange="window.filtroCoordPlanosSala=this.value; window.renderPlanosGeral(true);" style="padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:12.5px; font-weight:700; color:#0b2341;">
                            <option value="todas">Todos os Laboratórios</option>
                            ${salasUnicas.map(s => `<option value="${s}" ${window.filtroCoordPlanosSala === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div style="position:relative; min-width:270px; flex:1; max-width:380px;">
                        <span class="material-icons-outlined" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:18px; color:#64748b;">search</span>
                        <input id="coord-busca-planos-inp" type="text" value="${window.filtroCoordPlanosBusca}" oninput="window.filtroCoordPlanosBusca=this.value; window.renderPlanosGeral(true);" placeholder="Buscar por professor, tema, turma ou código..." style="width:100%; padding:8px 12px 8px 34px; border:1px solid #cbd5e1; border-radius:8px; font-size:12.5px;">
                    </div>
                </div>
            `;
        }
    }

    const filtrados = enriquecidos.filter(p => {
        if (window.filtroCoordPlanosStatus !== 'todos' && p._est.codigo !== window.filtroCoordPlanosStatus) return false;
        if (window.filtroCoordPlanosSala !== 'todas' && p.sala !== window.filtroCoordPlanosSala) return false;
        if (window.filtroCoordPlanosBusca) {
            const q = window.filtroCoordPlanosBusca.toLowerCase();
            const alvo = `${p.id} ${p.tema} ${p.professor} ${p.turma} ${p.sala} ${p.materiais}`.toLowerCase();
            if (!alvo.includes(q)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1 / -1; text-align:center; padding:44px 20px; background:white; border:1px dashed #cbd5e1; border-radius:14px; color:#64748b;">
                <span class="material-icons-outlined" style="font-size:38px; opacity:0.5; margin-bottom:8px;">menu_book</span>
                <h4 style="margin:0 0 4px; color:#0b2341;">Nenhum plano encontrado para este filtro</h4>
                <p style="margin:0; font-size:13px;">Ajuste os filtros acima para visualizar os planos pedagógicos cadastrados.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtrados.map(p => {
        const inicialProf = String(p.professor || 'P').replace(/^Prof\.?\s*/i, '').charAt(0).toUpperCase() || 'P';
        let statusBadge = `<span style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px;">📅 Agendado</span>`;
        let topBorder = '#0284c7';

        if (p._est.codigo === 'em_aula') {
            statusBadge = `<span style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px;">● Em Aula Agora</span>`;
            topBorder = '#ef4444';
        } else if (p._est.codigo === 'concluido') {
            statusBadge = `<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; font-size:11px; font-weight:800; padding:4px 10px; border-radius:20px;">✔ Concluído</span>`;
            topBorder = '#10b981';
        }

        const safeId = String(p.id).replace(/'/g, "\\'");

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-top:4px solid ${topBorder}; border-radius:16px; padding:20px; box-shadow:0 6px 18px rgba(11,35,65,0.05); display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:10px;">
                        <span style="font-family:monospace; font-size:11.5px; font-weight:800; color:#475569; background:#f1f5f9; padding:3px 9px; border-radius:6px;">${p.id}</span>
                        ${statusBadge}
                    </div>

                    <h3 style="margin:0 0 6px; font-size:17.5px; font-weight:800; color:#0b2341; line-height:1.3;">${p.tema}</h3>
                    <div style="font-size:12px; font-weight:700; color:var(--primary-color); display:flex; align-items:center; gap:5px; margin-bottom:12px;">
                        <span class="material-icons-outlined" style="font-size:15px;">groups</span> ${p.turma}
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; margin-bottom:12px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:#0b2341; color:#fde047; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            ${inicialProf}
                        </div>
                        <div style="overflow:hidden;">
                            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Docente Responsável</div>
                            <div style="font-size:13px; font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.professor}</div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-bottom:12px;">
                        <div style="background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #f1f5f9;">
                            <span style="display:block; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Laboratório</span>
                            <strong style="color:#0b2341;">${p.sala}</strong>
                        </div>
                        <div style="background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #f1f5f9;">
                            <span style="display:block; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Data &amp; Horário</span>
                            <strong style="color:#0b2341;">${window.formatarDataBrCurta(p.dia)}<br>${p.horario}</strong>
                        </div>
                    </div>

                    <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:9px; padding:9px 11px; font-size:12px; color:#78350f; line-height:1.45;">
                        <strong style="display:flex; align-items:center; gap:4px; color:#92400e; margin-bottom:2px;">
                            <span class="material-icons-outlined" style="font-size:14px;">inventory_2</span> Insumos Planejados:
                        </strong>
                        ${p.materiais}
                    </div>
                </div>

                <button type="button" onclick="window.abrirDetalhePlanoPorId('${safeId}')" class="secondary-btn" style="width:100%; justify-content:center; font-weight:800; font-size:12.5px; padding:10px; border-color:#cbd5e1; color:#0b2341;">
                    <span class="material-icons-outlined" style="font-size:16px; margin-right:6px;">visibility</span>
                    Visualizar Ficha Pedagógica Completa
                </button>
            </div>
        `;
    }).join('');
};


// =========================================================================
// 5. SEPARAÇÃO AUTOMÁTICA POR "KITS DE AULA" (CRUZAMENTO COM ALUNOS PRESENTES)
// =========================================================================
window.kitSelecionadoId = 'kit-camisa';

window.obterKitsDeAula = function() {
    try {
        const raw = localStorage.getItem('senaivest_kits_aula');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    const padrao = [
        {
            id: 'kit-camisa',
            nome: 'Modelagem de Camisa',
            icone: 'checkroom',
            descricao: 'Separação completa p/ camisaria: tecido tricoline, papel kraft, botões e fio calculados por aluno.',
            salaSugerida: 'Sala 01 - Modelagem',
            itensPorAluno: [
                { cod: 'MAT-011', nome: 'Tecido Tricoline 100% Algodão (Camisaria)', qtdPorAluno: 1.5, unidade: 'm' },
                { cod: 'MAT-012', nome: 'Papel Kraft p/ Modelagem 80g', qtdPorAluno: 2.0, unidade: 'm/fls' },
                { cod: 'MAT-013', nome: 'Botões Camisaria Perolados 11mm', qtdPorAluno: 8, unidade: 'un.' },
                { cod: 'MAT-014', nome: 'Fio / Linha de Costura Poliéster 120', qtdPorAluno: 1, unidade: 'cone' }
            ]
        },
        {
            id: 'kit-modelagem-base',
            nome: 'Modelagem Plana Base (Saia / Blusa)',
            icone: 'architecture',
            descricao: 'Moldes base industriais em papel kraft, algodão cru p/ toile e giz de marcação.',
            salaSugerida: 'Sala 01 - Modelagem',
            itensPorAluno: [
                { cod: 'MAT-012', nome: 'Papel Kraft p/ Modelagem 80g', qtdPorAluno: 2.0, unidade: 'm/fls' },
                { cod: 'MAT-001', nome: 'Tecido Algodão Cru', qtdPorAluno: 1.2, unidade: 'm' },
                { cod: 'MAT-010', nome: 'Giz de Alfaiate Especial', qtdPorAluno: 1, unidade: 'un.' }
            ]
        },
        {
            id: 'kit-costura-overlock',
            nome: 'Costura Industrial & Acabamento',
            icone: 'precision_manufacturing',
            descricao: 'Montagem em máquina reta e overlock com agulhas industriais, cones de poliéster e tecido.',
            salaSugerida: 'Sala 02 - Costura',
            itensPorAluno: [
                { cod: 'MAT-003', nome: 'Agulha Industrial Reta 14', qtdPorAluno: 2, unidade: 'un.' },
                { cod: 'MAT-004', nome: 'Fio de Overlock 100% Poliéster', qtdPorAluno: 1, unidade: 'cone' },
                { cod: 'MAT-001', nome: 'Tecido Algodão Cru', qtdPorAluno: 1.0, unidade: 'm' }
            ]
        }
    ];
    localStorage.setItem('senaivest_kits_aula', JSON.stringify(padrao));
    return padrao;
};

window.contarPresentesDaTurma = function(turmaEscolhida) {
    const lista = Array.isArray(window.mockAlunosDiario) ? window.mockAlunosDiario : [];
    const tLow = String(turmaEscolhida || '').toLowerCase();
    const daTurma = lista.filter(a => {
        if (!a.turma) return true;
        const aT = a.turma.toLowerCase();
        return aT.includes(tLow) || tLow.includes(aT) ||
               (tLow.includes('manhã') && aT.includes('manhã')) ||
               (tLow.includes('tarde') && aT.includes('tarde')) ||
               (tLow.includes('noite') && aT.includes('noite'));
    });
    const presentes = daTurma.filter(a => !!a.presente).length;
    return { presentes: presentes > 0 ? presentes : (daTurma.length || 6), totalTurma: daTurma.length, reaisMarcados: presentes };
};

window.abrirModalKitsAula = function() {
    const salaSel = document.getElementById('kit-sala-select');
    if (salaSel) {
        const salas = Array.isArray(window.mockSalas) ? window.mockSalas : [{ nome: 'Sala 01 - Modelagem' }, { nome: 'Sala 02 - Costura' }];
        salaSel.innerHTML = salas.map(s => `<option value="${s.nome}">${s.nome}</option>`).join('');
    }

    // Sincronizar turma ativa caso venha do Diário de Classe
    const diarioTurma = document.getElementById('diario-turma-select')?.value;
    const kitTurma = document.getElementById('kit-turma-select');
    if (diarioTurma && kitTurma) {
        kitTurma.value = diarioTurma;
    }

    window.aoMudarTurmaKitAula();
    window.renderCardsKitsAula();
    window.recalcularTabelaKitAula();
    openModal('modal-kits-aula');
};

window.aoMudarTurmaKitAula = function() {
    const turma = document.getElementById('kit-turma-select')?.value || 'Vestuário e Estilismo - Manhã';
    const info = window.contarPresentesDaTurma(turma);
    const inp = document.getElementById('kit-alunos-presentes-input');
    const hint = document.getElementById('kit-alunos-origem-hint');
    if (inp) inp.value = info.presentes;
    if (hint) {
        hint.innerText = info.reaisMarcados > 0
            ? `✔ ${info.reaisMarcados} presente(s) no Diário (${info.totalTurma} na turma)`
            : `Baseado na turma (${info.presentes} alunos)`;
    }
    window.recalcularTabelaKitAula();
};

window.selecionarKitAula = function(kitId) {
    window.kitSelecionadoId = kitId;
    const kit = window.obterKitsDeAula().find(k => k.id === kitId);
    const salaSel = document.getElementById('kit-sala-select');
    if (kit && kit.salaSugerida && salaSel) {
        const existeOpt = Array.from(salaSel.options).some(o => o.value === kit.salaSugerida);
        if (existeOpt) salaSel.value = kit.salaSugerida;
    }
    window.renderCardsKitsAula();
    window.recalcularTabelaKitAula();
};

window.renderCardsKitsAula = function() {
    const grid = document.getElementById('kits-cards-selector-grid');
    if (!grid) return;
    const kits = window.obterKitsDeAula();
    grid.innerHTML = kits.map(k => {
        const ativo = k.id === window.kitSelecionadoId;
        const safeId = String(k.id).replace(/'/g, "\\'");
        return `
            <div onclick="window.selecionarKitAula('${safeId}')" style="cursor:pointer; background:${ativo ? '#ecfdf5' : 'white'}; border:2px solid ${ativo ? '#059669' : '#e2e8f0'}; border-radius:12px; padding:12px 14px; transition:all 0.15s;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span class="material-icons-outlined" style="color:${ativo ? '#059669' : '#0b2341'}; font-size:22px;">${k.icone || 'inventory'}</span>
                    <span style="font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:12px; background:${ativo ? '#059669' : '#f1f5f9'}; color:${ativo ? 'white' : '#64748b'};">
                        ${ativo ? '✔ SELECIONADO' : `${k.itensPorAluno.length} insumos`}
                    </span>
                </div>
                <div style="font-weight:800; font-size:14px; color:#0b2341; margin-bottom:4px;">${k.nome}</div>
                <div style="font-size:11.5px; color:#475569; line-height:1.35;">${k.descricao}</div>
            </div>
        `;
    }).join('');
};

window.recalcularTabelaKitAula = function() {
    const box = document.getElementById('kit-calculo-preview-box');
    if (!box) return;
    const kit = window.obterKitsDeAula().find(k => k.id === window.kitSelecionadoId) || window.obterKitsDeAula()[0];
    if (!kit) return;

    const salaAlvo = document.getElementById('kit-sala-select')?.value || 'Sala 01 - Modelagem';
    const numAlunos = Math.max(1, parseInt(document.getElementById('kit-alunos-presentes-input')?.value || '1', 10));
    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];

    const linhas = kit.itensPorAluno.map(it => {
        const totalCalc = Math.round((it.qtdPorAluno * numAlunos) * 100) / 100;
        const matNaSala = mats.find(m => !m.isCardAlocadoTemporario && (m.cod || m.codigo) === it.cod && (m.almoxAtual || m.almoxOrigem) === salaAlvo);
        const matGeral = matNaSala || mats.find(m => !m.isCardAlocadoTemporario && (m.cod || m.codigo) === it.cod);
        const disp = matGeral ? (parseFloat(matGeral.qtd) || 0) : 0;
        const origemRef = matNaSala ? salaAlvo : (matGeral ? `${matGeral.almoxAtual} (auto-alocar)` : 'Sem cadastro');
        const saldoPos = Math.round((disp - totalCalc) * 100) / 100;
        const suficiente = disp >= totalCalc;

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:9px 10px;">
                    <strong style="color:#0b2341;">${it.nome}</strong>
                    <div style="font-size:11px; color:#64748b;">Código: ${it.cod} &bull; Estoque em: ${origemRef}</div>
                </td>
                <td style="padding:9px 10px; font-weight:700;">${it.qtdPorAluno} ${it.unidade}</td>
                <td style="padding:9px 10px; font-weight:700; color:#0284c7;">× ${numAlunos} presentes</td>
                <td style="padding:9px 10px; font-weight:900; font-size:14px; color:#065f46; background:#f0fdf4;">= ${totalCalc} ${it.unidade}</td>
                <td style="padding:9px 10px; font-weight:700;">${disp} ${it.unidade}</td>
                <td style="padding:9px 10px;">
                    <span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:10px; background:${suficiente ? '#dcfce7' : '#fee2e2'}; color:${suficiente ? '#15803d' : '#991b1b'};">
                        ${suficiente ? `Restam ${saldoPos}` : `Faltam ${Math.abs(saldoPos)}`}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            <div style="font-size:14px; font-weight:800; color:#0b2341;">
                📐 Cálculo Automático do Kit: <span style="color:#059669;">${kit.nome}</span>
            </div>
            <span style="font-size:12px; font-weight:800; background:#ecfdf5; color:#047857; padding:4px 10px; border-radius:20px;">
                Sala de Baixa: ${salaAlvo} &bull; ${numAlunos} aluno(s) presente(s)
            </span>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:12.5px;">
                <thead style="background:#f8fafc; font-size:11px; text-transform:uppercase; color:#64748b; border-bottom:2px solid #e2e8f0;">
                    <tr>
                        <th style="padding:8px 10px;">Insumo do Kit</th>
                        <th style="padding:8px 10px;">Por Aluno</th>
                        <th style="padding:8px 10px;">Cruzamento</th>
                        <th style="padding:8px 10px;">Total a Deduzir</th>
                        <th style="padding:8px 10px;">Disponível</th>
                        <th style="padding:8px 10px;">Saldo Pós-Baixa</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        </div>
    `;
};

window.toggleFormNovoKitPersonalizado = function() {
    const box = document.getElementById('box-novo-kit-personalizado');
    if (!box) return;
    const abrir = box.style.display === 'none';
    box.style.display = abrir ? 'block' : 'none';
    if (abrir && document.getElementById('novo-kit-itens-builder')?.children.length === 0) {
        window.adicionarLinhaItemNovoKit();
        window.adicionarLinhaItemNovoKit();
    }
};

window.adicionarLinhaItemNovoKit = function() {
    const builder = document.getElementById('novo-kit-itens-builder');
    if (!builder) return;
    const mats = (window.mockMateriais || []).filter(m => !m.isCardAlocadoTemporario);
    const opts = mats.map(m => `<option value="${m.cod || m.codigo}" data-nome="${m.nome}">${m.cod || m.codigo} - ${m.nome}</option>`).join('');
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns:2fr 100px 90px; gap:8px;';
    row.innerHTML = `
        <select class="nk-mat-sel" style="padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">${opts}</select>
        <input type="number" class="nk-mat-qtd" value="1" min="0.1" step="0.1" placeholder="Qtd/aluno" style="padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
        <input type="text" class="nk-mat-unid" value="un." placeholder="m / un." style="padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
    `;
    builder.appendChild(row);
};

window.salvarNovoKitPersonalizado = function() {
    const nome = document.getElementById('novo-kit-nome')?.value.trim();
    const desc = document.getElementById('novo-kit-desc')?.value.trim() || 'Kit personalizado cadastrado pelo docente.';
    const salaSug = document.getElementById('kit-sala-select')?.value || 'Sala 01 - Modelagem';
    if (!nome) {
        alert('Informe o nome do novo Kit de Aula.');
        return;
    }

    const sels = document.querySelectorAll('.nk-mat-sel');
    const qtds = document.querySelectorAll('.nk-mat-qtd');
    const unids = document.querySelectorAll('.nk-mat-unid');
    const itens = [];
    sels.forEach((sel, idx) => {
        const opt = sel.options[sel.selectedIndex];
        const q = parseFloat(qtds[idx]?.value || '1') || 1;
        const u = unids[idx]?.value.trim() || 'un.';
        if (opt) {
            itens.push({ cod: sel.value, nome: opt.getAttribute('data-nome') || opt.text, qtdPorAluno: q, unidade: u });
        }
    });
    if (itens.length === 0) return;

    const kits = window.obterKitsDeAula();
    const novoId = 'kit-' + Date.now().toString().slice(-5);
    kits.unshift({ id: novoId, nome, icone: 'widgets', descricao: desc, salaSugerida: salaSug, itensPorAluno: itens });
    localStorage.setItem('senaivest_kits_aula', JSON.stringify(kits));

    document.getElementById('box-novo-kit-personalizado').style.display = 'none';
    window.kitSelecionadoId = novoId;
    window.renderCardsKitsAula();
    window.recalcularTabelaKitAula();
};

window.executarBaixaAutomaticaKitAula = function() {
    const kit = window.obterKitsDeAula().find(k => k.id === window.kitSelecionadoId);
    if (!kit) return;

    const salaAlvo = document.getElementById('kit-sala-select')?.value || 'Sala 01 - Modelagem';
    const turma = document.getElementById('kit-turma-select')?.value || 'Vestuário e Estilismo - Manhã';
    const numAlunos = Math.max(1, parseInt(document.getElementById('kit-alunos-presentes-input')?.value || '1', 10));
    const profDigitado = document.getElementById('kit-prof-responsavel')?.value.trim();
    const profResponsavel = profDigitado || ((currentUser && currentUser.nome) ? currentUser.nome : 'Docente SENAI');
    const profId = (currentUser && currentUser.id) ? currentUser.id : 'PROF-KIT';

    const mats = Array.isArray(window.mockMateriais) ? window.mockMateriais : [];
    const resumoBaixas = [];

    kit.itensPorAluno.forEach(it => {
        const totalDeduzir = Math.round((it.qtdPorAluno * numAlunos) * 100) / 100;
        let matRef = mats.find(m => !m.isCardAlocadoTemporario && (m.cod || m.codigo) === it.cod && (m.almoxAtual || m.almoxOrigem) === salaAlvo)
            || mats.find(m => !m.isCardAlocadoTemporario && (m.cod || m.codigo) === it.cod);

        if (matRef) {
            matRef.qtd = Math.max(0, Math.round(((parseFloat(matRef.qtd) || 0) - totalDeduzir) * 100) / 100);
            if (!Array.isArray(matRef.registrosCard)) matRef.registrosCard = [];
            matRef.registrosCard.unshift({
                idReg: 'REG-KIT-' + Date.now().toString().slice(-5) + '-' + Math.floor(Math.random() * 90),
                planoId: kit.id.toUpperCase(),
                tipo: `Kit "${kit.nome}" (${numAlunos} alunos)`,
                qtd: totalDeduzir,
                professorNome: profResponsavel,
                professorId: profId,
                temaAula: `Kit de Aula: ${kit.nome}`,
                turma: turma,
                horario: new Date().toLocaleString('pt-BR'),
                salaOrigem: matRef.almoxAtual || salaAlvo,
                salaDestino: salaAlvo,
                localPrateleiraOrigem: matRef.local || 'Prateleira Padrão',
                dataHoraRegistro: new Date().toLocaleString('pt-BR'),
                regularizado: false
            });

            if (typeof window.registrarMovimentacaoEstoque === 'function') {
                window.registrarMovimentacaoEstoque({
                    tipo: 'Saída',
                    cod: it.cod,
                    material: it.nome,
                    qtd: totalDeduzir,
                    origem: matRef.almoxAtual || salaAlvo,
                    destino: `${salaAlvo} (${numAlunos} alunos presentes)`,
                    usuario: profResponsavel,
                    usuarioId: profId,
                    cargo: 'Professor',
                    vinculo: `Baixa Automática Kit "${kit.nome}" • ${turma}`
                });
            }
            resumoBaixas.push(`${totalDeduzir} ${it.unidade} de ${it.nome}`);
        }
    });

    if (typeof window.salvarMateriaisStorage === 'function') window.salvarMateriaisStorage();
    if (typeof window.renderSalas === 'function') window.renderSalas();
    if (window.salaAbertaAtual && typeof abrirSala === 'function') abrirSala(window.salaAbertaAtual);
    if (typeof window.renderProfEstoqueRapido === 'function') window.renderProfEstoqueRapido();

    closeModal('modal-kits-aula');

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            `Kit "${kit.nome}" Separado e Deduzido!`,
            `Baixa automática p/ ${numAlunos} alunos presentes na ${salaAlvo}: ${resumoBaixas.join(' • ')}.`,
            'success'
        );
    }
};


// =========================================================================
// 6. CHECK-IN E CHECK-OUT DE FERRAMENTAS VIA QR CODE NA BANCADA (MICRO-ALMOXARIFADO)
// =========================================================================
window.FERRAMENTAS_PADRAO_MAQUINA = [
    { cod: 'FER-TES', nome: 'Tesoura de Alfaiate / Arremate' },
    { cod: 'FER-FIT', nome: 'Fita Métrica Fibra 150cm' },
    { cod: 'FER-DES', nome: 'Desmanchador de Costura (Abridor)' },
    { cod: 'FER-PIN', nome: 'Pinça & Chave de Caixa de Bobina' }
];

window.obterEstadoMicroAlmoxQR = function() {
    let salvo = {};
    try {
        const raw = localStorage.getItem('senaivest_micro_almox_ferramentas');
        if (raw) salvo = JSON.parse(raw) || {};
    } catch (e) {}

    const bancadas = Array.isArray(window.bancadasCheckinMock) && window.bancadasCheckinMock.length > 0
        ? window.bancadasCheckinMock
        : [
            { numero: 'Bancada 01', tipo: 'Reta Industrial Direct Drive' },
            { numero: 'Bancada 02', tipo: 'Overlock Industrial 3 Fios' },
            { numero: 'Bancada 03', tipo: 'Mesa de Modelagem & Corte' },
            { numero: 'Bancada 04', tipo: 'Reta Industrial Eletrônica' }
        ];

    bancadas.forEach((b, idx) => {
        const num = b.numero || `Bancada 0${idx + 1}`;
        const slug = num.toUpperCase().replace(/\s+/g, '-');
        if (!salvo[num]) {
            salvo[num] = {
                bancada: num,
                maquina: b.tipo || 'Máquina de Costura Industrial',
                qrPayload: `SENAIVEST-MAQ-${slug}`,
                status: 'na_prateleira', // 'na_prateleira' | 'em_posse_aluno' | 'notificado_devolucao' | 'pendencia_falta'
                alunoNome: '',
                alunoId: '',
                horarioCheckin: '',
                horarioCheckout: '',
                faltantes: [],
                ferramentas: window.FERRAMENTAS_PADRAO_MAQUINA.map(f => ({ ...f, ok: true }))
            };
        } else {
            salvo[num].maquina = b.tipo || salvo[num].maquina;
        }
    });

    return salvo;
};

window.salvarEstadoMicroAlmoxQR = function(estado) {
    try {
        localStorage.setItem('senaivest_micro_almox_ferramentas', JSON.stringify(estado));
    } catch (e) {}
};

// Descobrir qual é a bancada vinculada ao aluno logado
window.obterBancadaDoAlunoAtual = function() {
    const estado = window.obterEstadoMicroAlmoxQR();
    const chaves = Object.keys(estado);
    const dispEl = document.getElementById('bancada-numero-display');
    if (dispEl) {
        const txt = dispEl.innerText || '';
        const match = chaves.find(k => txt.toLowerCase().includes(k.toLowerCase()));
        if (match) return match;
    }
    if (currentUser && currentUser.id && Array.isArray(window.bancadasCheckinMock)) {
        const b = window.bancadasCheckinMock.find(x => x.alunoMatricula === currentUser.id);
        if (b && b.numero && estado[b.numero]) return b.numero;
    }
    return chaves[0] || 'Bancada 01';
};

// Renderizar o card de Check-in / Check-out de Ferramentas via QR Code no Portal do Aluno
window.renderMicroAlmoxAlunoQR = function() {
    const container = document.getElementById('aluno-micro-almox-qr-container');
    if (!container) return;

    const nomeBancada = window.obterBancadaDoAlunoAtual();
    const estado = window.obterEstadoMicroAlmoxQR();
    const item = estado[nomeBancada];
    if (!item) return;

    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(item.qrPayload)}`;

    let statusBanner = '';
    let botaoPrincipal = '';
    let borderCol = '#0284c7';

    if (item.status === 'na_prateleira') {
        borderCol = '#10b981';
        statusBanner = `
            <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:10px; padding:10px 14px; font-size:12.5px; color:#166534; margin-bottom:12px;">
                <strong>✔ Ferramentas na Prateleira da Máquina:</strong> Escaneie o QR Code desta máquina no início da aula para realizar o <strong>Check-in</strong> e assumir a guarda da Tesoura, Fita Métrica e Desmanchador.
            </div>
        `;
        botaoPrincipal = `
            <button type="button" onclick="window.abrirModalQRFerramentas('${nomeBancada}', 'checkin')" class="primary-btn" style="background:#0b2341; padding:11px 20px; font-weight:800; font-size:13.5px;">
                <span class="material-icons-outlined" style="font-size:19px; margin-right:6px; color:#38bdf8;">qr_code_scanner</span>
                Escanear QR Code da Máquina (Check-in de Ferramentas)
            </button>
        `;
    } else if (item.status === 'em_posse_aluno' || item.status === 'notificado_devolucao') {
        const isNotif = item.status === 'notificado_devolucao';
        borderCol = isNotif ? '#f59e0b' : '#0284c7';
        statusBanner = isNotif ? `
            <div style="background:#fffbeb; border:2px solid #f59e0b; border-radius:10px; padding:12px 14px; font-size:13px; color:#92400e; margin-bottom:12px; display:flex; align-items:center; gap:10px;">
                <span class="material-icons-outlined" style="font-size:26px; color:#d97706;">notifications_active</span>
                <div>
                    <strong>🔔 FIM DE AULA — HORA DE DEVOLVER AS FERRAMENTAS!</strong><br>
                    Guarde a Tesoura, Fita Métrica, Desmanchador e Pinça de volta no suporte/prateleira da <strong>${nomeBancada}</strong> e faça o <strong>Check-out via QR Code</strong> abaixo.
                </div>
            </div>
        ` : `
            <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:10px; padding:10px 14px; font-size:12.5px; color:#1e40af; margin-bottom:12px;">
                <strong>🔒 Termo de Responsabilidade Ativo desde ${item.horarioCheckin}:</strong> As ferramentas desta máquina estão sob guarda de <strong>${item.alunoNome}</strong>. Ao término da aula, devolva à prateleira e faça o Check-out.
            </div>
        `;
        botaoPrincipal = `
            <button type="button" onclick="window.abrirModalQRFerramentas('${nomeBancada}', 'checkout')" class="primary-btn" style="background:#059669; border-color:#059669; padding:11px 20px; font-weight:800; font-size:13.5px;">
                <span class="material-icons-outlined" style="font-size:19px; margin-right:6px;">qr_code_2</span>
                Escanear QR Code p/ Devolver às Prateleiras (Check-out)
            </button>
        `;
    } else {
        borderCol = '#ef4444';
        statusBanner = `
            <div style="background:#fef2f2; border:1.5px solid #ef4444; border-radius:10px; padding:10px 14px; font-size:12.5px; color:#991b1b; margin-bottom:12px;">
                <strong>⚠️ Pendência Registrada:</strong> Falta reportada no retorno (${(item.faltantes || []).join(', ')}). A professora e a coordenação já foram notificadas no painel.
            </div>
        `;
        botaoPrincipal = `
            <button type="button" onclick="window.abrirModalQRFerramentas('${nomeBancada}', 'checkout')" class="secondary-btn" style="font-weight:800; font-size:12.5px;">
                Regularizar Ferramenta Encontrada via QR Code
            </button>
        `;
    }

    const chipsFerramentas = (item.ferramentas || []).map(f => `
        <span style="display:inline-flex; align-items:center; gap:5px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:6px 10px; font-size:12px; font-weight:700; color:#0b2341;">
            <span class="material-icons-outlined" style="font-size:15px; color:#0284c7;">handyman</span>
            ${f.nome}
        </span>
    `).join('');

    container.innerHTML = `
        <div class="content-section" style="margin:0; border-left:5px solid ${borderCol};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <img src="${qrImgUrl}" alt="QR Máquina" style="width:64px; height:64px; border:1px solid #cbd5e1; border-radius:8px; padding:3px; background:white;">
                    <div>
                        <span style="font-size:11px; font-weight:800; color:#0284c7; text-transform:uppercase;">Micro-Almoxarifado QR Code • ${item.qrPayload}</span>
                        <h3 style="margin:2px 0 3px; font-size:16.5px; color:#0b2341;">Check-in &amp; Check-out de Ferramentas (${nomeBancada})</h3>
                        <p style="margin:0; font-size:12px; color:var(--text-secondary);">Controle antifurto/extravio de tesouras, fitas métricas e desmanchadores por máquina</p>
                    </div>
                </div>
                <div>${botaoPrincipal}</div>
            </div>
            ${statusBanner}
            <div style="display:flex; flex-wrap:wrap; gap:8px;">${chipsFerramentas}</div>
        </div>
    `;
};

// Integrar renderMicroAlmoxAlunoQR automaticamente ao abrir Minha Bancada
const _origRenderAlunoBancadaV38 = window.renderAlunoBancada;
window.renderAlunoBancada = function() {
    if (typeof _origRenderAlunoBancadaV38 === 'function') _origRenderAlunoBancadaV38();
    window.renderMicroAlmoxAlunoQR();
};

// Scanner e Confirmação de Check-in / Check-out de Ferramentas via QR Code
window._qrFerrScannerInstance = null;

window.abrirModalQRFerramentas = function(nomeBancada, modo) {
    const estado = window.obterEstadoMicroAlmoxQR();
    const item = estado[nomeBancada];
    if (!item) return;

    const tit = document.getElementById('qr-ferr-modal-titulo');
    const sub = document.getElementById('qr-ferr-modal-sub');
    const body = document.getElementById('qr-ferr-modal-body');
    if (!body) return;

    if (tit) tit.innerText = modo === 'checkin'
        ? `Check-in QR Code — ${nomeBancada}`
        : `Check-out & Devolução à Prateleira — ${nomeBancada}`;
    if (sub) sub.innerText = `${item.maquina} • Código: ${item.qrPayload}`;

    const checklistHtml = modo === 'checkout' ? `
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 14px; margin-bottom:14px;">
            <div style="font-size:12.5px; font-weight:800; color:#0b2341; margin-bottom:8px;">Marque as ferramentas que estão sendo devolvidas à prateleira da máquina:</div>
            ${(item.ferramentas || []).map((f, i) => `
                <label style="display:flex; align-items:center; gap:8px; padding:5px 0; font-size:13px; font-weight:600; cursor:pointer;">
                    <input type="checkbox" class="chk-ferr-checkout" data-nome="${f.nome}" checked style="width:17px; height:17px; accent-color:#059669;">
                    <span>${f.nome} (${f.cod})</span>
                </label>
            `).join('')}
        </div>
    ` : `
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 14px; margin-bottom:14px; font-size:12.5px; color:#1e3a8a;">
            Ao escanear o QR Code da <strong>${nomeBancada}</strong>, você confirma que recebeu e assume a responsabilidade durante a aula por:
            <ul style="margin:6px 0 0 18px; padding:0;">
                ${(item.ferramentas || []).map(f => `<li><strong>${f.nome}</strong></li>`).join('')}
            </ul>
        </div>
    `;

    const safeBanc = String(nomeBancada).replace(/'/g, "\\'");
    body.innerHTML = `
        ${checklistHtml}
        <div id="qr-ferr-camera-reader" style="width:100%; border-radius:10px; overflow:hidden; margin-bottom:12px;"></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
            <button type="button" class="secondary-btn" onclick="window.iniciarCameraScannerFerramentas('${safeBanc}', '${modo}')" style="flex:1; justify-content:center; font-weight:700;">
                <span class="material-icons-outlined" style="font-size:18px; margin-right:6px;">photo_camera</span> Ler QR Code c/ Câmera
            </button>
            <button type="button" class="primary-btn" onclick="window.confirmarOperacaoQRFerramentas('${safeBanc}', '${modo}')" style="flex:1.4; justify-content:center; background:${modo === 'checkin' ? '#0b2341' : '#059669'}; font-weight:800;">
                <span class="material-icons-outlined" style="font-size:18px; margin-right:6px;">verified</span>
                ${modo === 'checkin' ? 'Confirmar Leitura QR & Assumir' : 'Confirmar Retorno às Prateleiras'}
            </button>
        </div>
    `;

    openModal('modal-qr-ferramentas-bancada');
};

window.iniciarCameraScannerFerramentas = function(nomeBancada, modo) {
    if (typeof Html5Qrcode === 'undefined') {
        alert('Leitor óptico pronto: clique no botão ao lado para validar o código da máquina.');
        return;
    }
    try {
        window._qrFerrScannerInstance = new Html5Qrcode('qr-ferr-camera-reader');
        window._qrFerrScannerInstance.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            () => {
                window.fecharCameraScannerFerramentas().finally(() => {
                    window.confirmarOperacaoQRFerramentas(nomeBancada, modo);
                });
            },
            () => {}
        ).catch(() => {
            alert('Câmera não detectada neste navegador/dispositivo. Use o botão de confirmação direta ao lado.');
        });
    } catch (e) {}
};

window.fecharCameraScannerFerramentas = async function() {
    if (window._qrFerrScannerInstance) {
        try {
            await window._qrFerrScannerInstance.stop();
            await window._qrFerrScannerInstance.clear();
        } catch (e) {}
        window._qrFerrScannerInstance = null;
    }
};

window.fecharModalQRFerramentas = function() {
    window.fecharCameraScannerFerramentas();
    closeModal('modal-qr-ferramentas-bancada');
};

window.confirmarOperacaoQRFerramentas = function(nomeBancada, modo) {
    const estado = window.obterEstadoMicroAlmoxQR();
    const item = estado[nomeBancada];
    if (!item) return;

    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const alunoNome = (currentUser && currentUser.role === 'Aluno' && currentUser.nome) ? currentUser.nome : (item.alunoNome || 'Pedro Santos');
    const alunoId = (currentUser && currentUser.role === 'Aluno' && currentUser.id) ? currentUser.id : (item.alunoId || 'ALU-001');

    if (modo === 'checkin') {
        item.status = 'em_posse_aluno';
        item.alunoNome = alunoNome;
        item.alunoId = alunoId;
        item.horarioCheckin = hora;
        item.horarioCheckout = '';
        item.faltantes = [];
        window.salvarEstadoMicroAlmoxQR(estado);
        window.fecharModalQRFerramentas();
        window.renderMicroAlmoxAlunoQR();
        window.renderPainelFerramentasQRProf();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('Check-in de Ferramentas Confirmado!', `Responsabilidade assumida na ${nomeBancada} às ${hora}.`, 'success');
        }
    } else {
        const chks = document.querySelectorAll('.chk-ferr-checkout');
        const faltando = [];
        if (chks.length > 0) {
            chks.forEach(c => {
                if (!c.checked) faltando.push(c.getAttribute('data-nome'));
            });
        }

        item.horarioCheckout = hora;
        if (faltando.length > 0) {
            item.status = 'pendencia_falta';
            item.faltantes = faltando;
            // Notificar automaticamente Professora e Coordenação sobre ferramenta ausente!
            if (typeof window.adicionarAlertaMuralAutomatico === 'function') {
                window.adicionarAlertaMuralAutomatico(
                    `🚨 Ferramenta Não Devolvida na ${nomeBancada}`,
                    `O aluno ${item.alunoNome || alunoNome} realizou Check-out às ${hora} reportando falta de: ${faltando.join(', ')}.`
                );
            }
            if (Array.isArray(window.notificacoes)) {
                window.notificacoes.unshift({
                    id: Date.now(),
                    title: `Falta de Ferramenta (${nomeBancada})`,
                    desc: `${faltando.join(', ')} não retornou à prateleira (Responsável: ${item.alunoNome || alunoNome}).`,
                    type: 'alert'
                });
                if (typeof renderNotificacoes === 'function') renderNotificacoes();
            }
        } else {
            item.status = 'na_prateleira';
            item.faltantes = [];
        }

        window.salvarEstadoMicroAlmoxQR(estado);
        window.fecharModalQRFerramentas();
        window.renderMicroAlmoxAlunoQR();
        window.renderPainelFerramentasQRProf();

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast(
                faltando.length === 0 ? 'Devolução 100% Confirmada!' : 'Divergência Reportada ao Painel',
                faltando.length === 0
                    ? `Todas as ferramentas da ${nomeBancada} retornaram às prateleiras às ${hora}.`
                    : `Falta registrada: ${faltando.join(', ')}. Painel SENAIVEST atualizado.`,
                faltando.length === 0 ? 'success' : 'warning'
            );
        }
    }
};

// Notificar automaticamente todos os alunos que ainda estão com ferramentas em posse ao encerrar aula
window.dispararNotificacaoDevolucaoFerramentas = function(silencioso = false) {
    const estado = window.obterEstadoMicroAlmoxQR();
    let pendentes = 0;
    Object.values(estado).forEach(it => {
        if (it.status === 'em_posse_aluno' || it.status === 'notificado_devolucao') {
            it.status = 'notificado_devolucao';
            pendentes++;
        }
    });
    window.salvarEstadoMicroAlmoxQR(estado);
    window.renderMicroAlmoxAlunoQR();
    window.renderPainelFerramentasQRProf();

    if (!silencioso && typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            pendentes > 0 ? 'Notificação de Devolução Enviada!' : 'Todas as Ferramentas já estão nas Prateleiras!',
            pendentes > 0
                ? `${pendentes} bancada(s) receberam alerta no celular do aluno para devolver tesoura, fita métrica e desmanchador.`
                : 'Nenhuma ferramenta pendente no momento.',
            pendentes > 0 ? 'info' : 'success'
        );
    }
};

// Acoplar notificação automática de devolução de ferramentas quando uma aula é finalizada
const _origFinalizarPlanoEspV38 = window.finalizarPlanoEspecifico;
window.finalizarPlanoEspecifico = function(planoId) {
    if (typeof _origFinalizarPlanoEspV38 === 'function') _origFinalizarPlanoEspV38(planoId);
    window.dispararNotificacaoDevolucaoFerramentas(true);
};

// Painel SENAIVEST automático para a Professora (sem precisar vigiar manualmente)
window.gerarHtmlPainelFerramentasQR = function(modoCompacto = false) {
    const estado = window.obterEstadoMicroAlmoxQR();
    const lista = Object.values(estado);
    const naPrateleira = lista.filter(i => i.status === 'na_prateleira').length;
    const emUso = lista.filter(i => i.status === 'em_posse_aluno' || i.status === 'notificado_devolucao').length;
    const comFalta = lista.filter(i => i.status === 'pendencia_falta').length;
    const todasOk = (naPrateleira === lista.length && lista.length > 0);

    const cardsMaquinas = lista.map(it => {
        let badge = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px;">✔ Na Prateleira</span>`;
        let subInfo = `<span style="color:#15803d; font-weight:600;">Tesoura, Fita Métrica, Desmanchador e Pinça conferidos na prateleira${it.horarioCheckout ? ` (retorno às ${it.horarioCheckout})` : ''}.</span>`;
        let borda = '#86efac';

        if (it.status === 'em_posse_aluno') {
            badge = `<span style="background:#dbeafe; color:#1d4ed8; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px;">📱 Com Aluno (${it.horarioCheckin})</span>`;
            subInfo = `Responsável via QR: <strong>${it.alunoNome} (${it.alunoId})</strong>`;
            borda = '#93c5fd';
        } else if (it.status === 'notificado_devolucao') {
            badge = `<span style="background:#fef3c7; color:#b45309; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px;">🔔 Notificado p/ Devolver</span>`;
            subInfo = `Aguardando Check-out QR de <strong>${it.alunoNome}</strong>`;
            borda = '#fcd34d';
        } else if (it.status === 'pendencia_falta') {
            badge = `<span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:3px 9px; border-radius:20px;">🚨 Falta: ${(it.faltantes || []).join(', ')}</span>`;
            subInfo = `Último responsável: <strong>${it.alunoNome} (${it.alunoId})</strong>`;
            borda = '#fca5a5';
        }

        return `
            <div style="background:white; border:1.5px solid ${borda}; border-radius:12px; padding:12px 14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:6px;">
                    <strong style="font-size:13.5px; color:#0b2341;">${it.bancada}</strong>
                    ${badge}
                </div>
                <div style="font-size:11.5px; color:#64748b; margin-bottom:4px;">${it.maquina}</div>
                <div style="font-size:12px; color:#0f172a; line-height:1.4;">${subInfo}</div>
            </div>
        `;
    }).join('');

    return `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 14px rgba(11,35,65,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:${todasOk ? '#dcfce7' : '#eff6ff'}; color:${todasOk ? '#15803d' : '#0284c7'}; display:flex; align-items:center; justify-content:center;">
                        <span class="material-icons-outlined" style="font-size:22px;">qr_code_2</span>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:16px; color:#0b2341; font-weight:800;">
                            Painel SENAIVEST — Retorno de Ferramentas das Bancadas (QR Code)
                        </h3>
                        <p style="margin:2px 0 0; font-size:12px; color:#64748b;">
                            ${todasOk
                                ? '✅ Todas as tesouras, fitas métricas e desmanchadores retornaram às prateleiras!'
                                : `Monitoramento automático: ${naPrateleira}/${lista.length} na prateleira • ${emUso} em uso • ${comFalta} pendência(s)`}
                        </p>
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="secondary-btn" onclick="window.imprimirEtiquetasQRMicroAlmox()" style="font-size:12px; padding:7px 12px; font-weight:700;">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:4px;">qr_code</span> Imprimir QR Codes das Máquinas
                    </button>
                    <button type="button" class="primary-btn" onclick="window.dispararNotificacaoDevolucaoFerramentas(false)" style="background:#0b2341; font-size:12px; padding:7px 14px; font-weight:700;">
                        <span class="material-icons-outlined" style="font-size:16px; margin-right:4px; color:#fde047;">notifications_active</span> Solicitar Devolução (Fim de Aula)
                    </button>
                </div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(245px, 1fr)); gap:12px;">
                ${cardsMaquinas}
            </div>
        </div>
    `;
};

window.renderPainelFerramentasQRProf = function() {
    const c1 = document.getElementById('diario-painel-ferramentas-qr-container');
    if (c1) c1.innerHTML = window.gerarHtmlPainelFerramentasQR(false);
    const c2 = document.getElementById('prof-painel-ferramentas-qr-resumo');
    if (c2) c2.innerHTML = window.gerarHtmlPainelFerramentasQR(true);
};

window.imprimirEtiquetasQRMicroAlmox = function() {
    const estado = window.obterEstadoMicroAlmoxQR();
    const win = window.open('', '_blank', 'width=860,height=720');
    if (!win) {
        alert('Permita pop-ups para imprimir as etiquetas QR Code das máquinas.');
        return;
    }
    const cards = Object.values(estado).map(it => {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(it.qrPayload)}`;
        return `
            <div style="border:2px dashed #0b2341; border-radius:12px; padding:16px; text-align:center; page-break-inside:avoid;">
                <div style="font-weight:900; font-size:15px; color:#0b2341;">SENAIVEST • MICRO-ALMOXARIFADO</div>
                <div style="font-size:14px; font-weight:bold; color:#0284c7; margin:4px 0 8px;">${it.bancada} (${it.maquina})</div>
                <img src="${url}" style="width:140px; height:140px; margin:0 auto; display:block;">
                <div style="font-family:monospace; font-size:11px; margin-top:6px; font-weight:bold;">${it.qrPayload}</div>
                <div style="font-size:11px; color:#475569; margin-top:6px;">Escaneie no início (Check-in) e ao devolver Tesoura, Fita Métrica e Desmanchador à prateleira (Check-out).</div>
            </div>
        `;
    }).join('');

    win.document.write(`
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Etiquetas QR Code das Máquinas - SENAI</title></head>
        <body style="font-family:Arial,sans-serif; padding:24px;">
            <div style="text-align:right; margin-bottom:16px;"><button onclick="window.print()" style="background:#0b2341; color:white; border:none; padding:9px 18px; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir Etiquetas p/ Máquinas</button></div>
            <h2 style="color:#0b2341; margin-top:0;">Etiquetas QR Code de Controle de Ferramentas por Máquina</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;">${cards}</div>
        </body></html>
    `);
    win.document.close();
};

// Acoplar renderPainelFerramentasQRProf ao Painel do Professor e ao Diário & Bancadas
const _origRenderProfDashboardV38 = window.renderProfDashboard;
window.renderProfDashboard = function() {
    if (typeof _origRenderProfDashboardV38 === 'function') _origRenderProfDashboardV38();
    window.renderPainelFerramentasQRProf();
};

const _origRenderDiarioBancadasV38 = window.renderDiarioBancadasAlocacao;
window.renderDiarioBancadasAlocacao = function() {
    if (typeof _origRenderDiarioBancadasV38 === 'function') _origRenderDiarioBancadasV38();
    window.renderPainelFerramentasQRProf();
};

// Inicialização automática ao carregar
setTimeout(() => {
    window.renderPainelFerramentasQRProf();
    window.renderMicroAlmoxAlunoQR();
    if (currentUser && currentUser.role === 'Coordenação') {
        const aqEl = document.querySelector('#sidebar-menu .nav-item:nth-child(2) .nav-text');
        if (aqEl) aqEl.innerText = 'Setor de Compras';
    }
}, 250);

// =========================================================================
// SENAIVEST v4.0 — MÓDULO INTEGRADO: NAVEGAÇÃO MOBILE COM ABAS,
// QR CODES EXCLUSIVOS DE BANCADA COM LOGIN OBRIGATÓRIO, CONFERÊNCIA
// GUIADA COM FOTO EM CASO DE AVARIA, REGISTRO CONCLUÍDO, RANKING REAL
// E SINCRONIZAÇÃO EM TEMPO REAL EM NUVEM VIA CLOUD FIRESTORE
// =========================================================================

// --- 0. INTERCEPTAÇÃO SÍNCRONA IMEDIATA DE QR CODE DA BANCADA ---
// Garante que escanear uma bancada NUNCA entre direto com sessão antiga;
// força sempre a tela de login solicitando ID e Senha!
(function() {
    try {
        const s = window.location.search || '';
        if (s.includes('qr_portal=aluno')) {
            sessionStorage.removeItem('senaivest_session');
            localStorage.removeItem('senaivest_aluno_qr_matricula');
            window.currentUser = null;
        }
    } catch (e) {}
})();

// --- 1. NAVEGAÇÃO MOBILE: HAMBURGER DRAWER E BARRAS DE ABAS DO PORTAL DO ALUNO ---
window.toggleMenuMobile = function() {
    const sb = document.getElementById('app-sidebar') || document.querySelector('.sidebar');
    const bd = document.getElementById('sidebar-mobile-backdrop');
    if (!sb) return;
    const abrindo = !sb.classList.contains('mobile-open');
    if (abrindo) {
        sb.classList.add('mobile-open');
        if (bd) bd.classList.add('active');
    } else {
        sb.classList.remove('mobile-open');
        if (bd) bd.classList.remove('active');
    }
};

window.fecharMenuMobile = function() {
    const sb = document.getElementById('app-sidebar') || document.querySelector('.sidebar');
    const bd = document.getElementById('sidebar-mobile-backdrop');
    if (sb) sb.classList.remove('mobile-open');
    if (bd) bd.classList.remove('active');
};

// Renderizar Abas Mobile Exclusivas do Aluno (Topo em pílulas + Rodapé fixo)
window.renderAbasMobilePortalAluno = function(viewAtiva = '') {
    const topo = document.getElementById('aluno-mobile-tabs-top');
    const rodape = document.getElementById('aluno-mobile-bottom-nav');
    if (!topo || !rodape) return;

    if (!currentUser || (currentUser.role !== 'Aluno' && currentUser.role !== 'aluno')) {
        document.body.classList.remove('role-aluno-active');
        topo.innerHTML = '';
        rodape.innerHTML = '';
        return;
    }

    document.body.classList.add('role-aluno-active');
    const ativa = viewAtiva || window.viewAtivaAtual || 'view-aluno-bancada';

    // Barra de topo (Scroll Horizontal em Pílulas)
    topo.innerHTML = `
        <button type="button" class="aluno-mob-pill ${ativa === 'view-aluno-bancada' ? 'active' : ''}" onclick="nav('view-aluno-bancada')">
            <span class="material-icons-outlined">precision_manufacturing</span> Minha Bancada
        </button>
        <button type="button" class="aluno-mob-pill ${ativa === 'view-aluno-retalhos' ? 'active' : ''}" onclick="nav('view-aluno-retalhos')">
            <span class="material-icons-outlined">recycling</span> Retalhos
        </button>
        <button type="button" class="aluno-mob-pill ${ativa === 'view-aluno-ranking' ? 'active' : ''}" onclick="nav('view-aluno-ranking')">
            <span class="material-icons-outlined">emoji_events</span> Ranking
        </button>
        <button type="button" class="aluno-mob-pill ${ativa === 'view-avisos' ? 'active' : ''}" onclick="nav('view-avisos')">
            <span class="material-icons-outlined">campaign</span> Avisos
        </button>
        <button type="button" class="aluno-mob-pill ${ativa === 'view-perfil' ? 'active' : ''}" onclick="nav('view-perfil')">
            <span class="material-icons-outlined">account_circle</span> Perfil
        </button>
        <button type="button" class="aluno-mob-pill pill-sair" onclick="logout()">
            <span class="material-icons-outlined">logout</span> Sair
        </button>
    `;

    // Barra de rodapé fixa no celular
    rodape.innerHTML = `
        <button type="button" class="aluno-bottom-btn ${ativa === 'view-aluno-bancada' ? 'active' : ''}" onclick="nav('view-aluno-bancada')">
            <span class="material-icons-outlined">precision_manufacturing</span>
            <span>Bancada</span>
        </button>
        <button type="button" class="aluno-bottom-btn ${ativa === 'view-aluno-retalhos' ? 'active' : ''}" onclick="nav('view-aluno-retalhos')">
            <span class="material-icons-outlined">recycling</span>
            <span>Retalhos</span>
        </button>
        <button type="button" class="aluno-bottom-btn ${ativa === 'view-aluno-ranking' ? 'active' : ''}" onclick="nav('view-aluno-ranking')">
            <span class="material-icons-outlined">emoji_events</span>
            <span>Ranking</span>
        </button>
        <button type="button" class="aluno-bottom-btn ${ativa === 'view-avisos' ? 'active' : ''}" onclick="nav('view-avisos')">
            <span class="material-icons-outlined">campaign</span>
            <span>Avisos</span>
        </button>
        <button type="button" class="aluno-bottom-btn ${ativa === 'view-perfil' ? 'active' : ''}" onclick="nav('view-perfil')">
            <span class="material-icons-outlined">account_circle</span>
            <span>Perfil</span>
        </button>
    `;
};

// Hook na função nav existente para fechar gaveta e atualizar abas mobile
const _origNavV40 = window.nav;
window.nav = function(viewId) {
    window.viewAtivaAtual = viewId;
    window.fecharMenuMobile();
    if (typeof _origNavV40 === 'function') {
        _origNavV40(viewId);
    }
    if (currentUser && (currentUser.role === 'Aluno' || currentUser.role === 'aluno')) {
        window.renderAbasMobilePortalAluno(viewId);
        if (viewId === 'view-aluno-bancada' && typeof window.renderAlunoBancada === 'function') {
            window.renderAlunoBancada();
        }
        if (viewId === 'view-aluno-ranking' && typeof window.renderRankingEficiencia === 'function') {
            window.renderRankingEficiencia();
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Hook no initApp para ativar abas mobile e perfil
const _origInitAppV40 = window.initApp;
window.initApp = function() {
    if (typeof _origInitAppV40 === 'function') {
        _origInitAppV40();
    }
    if (currentUser && (currentUser.role === 'Aluno' || currentUser.role === 'aluno')) {
        document.body.classList.add('role-aluno-active');
        window.renderAbasMobilePortalAluno('view-aluno-bancada');
    } else {
        document.body.classList.remove('role-aluno-active');
    }
    if (currentUser && currentUser.role === 'Coordenação') {
        window.renderGridQRCodesBancadasCoord();
        window.renderListaAlunosPreCadastradosCoord();
    }
};

// Hook no logout para limpar estado
const _origLogoutV40 = window.logout;
window.logout = function() {
    document.body.classList.remove('role-aluno-active');
    window.fecharMenuMobile();
    window._qrContextoPendente = null;
    if (typeof _origLogoutV40 === 'function') {
        _origLogoutV40();
    }
};

// --- 2. QR CODES EXCLUSIVOS DAS BANCADAS (ACESSO COM LOGIN ID + SENHA) ---
window.obterUrlBasePlataformaQR = function() {
    try {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return window.location.origin + window.location.pathname;
        }
    } catch (e) {}
    return 'https://senaivest.com.br/';
};

// Gera URL exclusiva para uma bancada específica: nunca embute matrícula nem senha!
window.gerarUrlQRBancada = function(nomeBancada = 'Bancada 01') {
    const base = window.obterUrlBasePlataformaQR();
    const params = new URLSearchParams();
    params.set('qr_portal', 'aluno');
    params.set('bancada', String(nomeBancada).trim());
    return `${base}?${params.toString()}`;
};

// Lista unificada de bancadas cadastradas para QR Codes
window.obterListaBancadasOficiais = function() {
    const conjunto = new Set();
    if (Array.isArray(window.bancadasCheckinMock)) {
        window.bancadasCheckinMock.forEach(b => {
            if (b && b.numero) conjunto.add(b.numero.trim());
        });
    }
    // Bancadas padrão mínimas caso vazio
    ['Bancada 01', 'Bancada 02', 'Bancada 03', 'Bancada 04', 'Bancada 05', 'Bancada 06'].forEach(b => conjunto.add(b));
    return Array.from(conjunto).sort();
};

// Renderizar painel de QR Codes exclusivos das bancadas na Coordenação
window.renderGridQRCodesBancadasCoord = function() {
    const grid = document.getElementById('grid-qrcodes-bancadas-coord');
    if (!grid) return;

    const bancadas = window.obterListaBancadasOficiais();
    grid.innerHTML = bancadas.map(bNome => {
        const urlQR = window.gerarUrlQRBancada(bNome);
        const imgQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(urlQR)}`;
        const safeNome = bNome.replace(/'/g, "\'");

        // Obter máquina vinculada
        let maquina = 'Máquina Reta Industrial';
        if (Array.isArray(window.bancadasCheckinMock)) {
            const bObj = window.bancadasCheckinMock.find(x => x.numero === bNome);
            if (bObj && bObj.maquina) maquina = bObj.maquina;
        }

        return `
            <div style="background:white; border:1.5px solid #cbd5e1; border-radius:14px; padding:16px; text-align:center; box-shadow:0 3px 10px rgba(11,35,65,0.04); display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
                <div>
                    <span style="font-size:10.5px; font-weight:800; color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:10px; text-transform:uppercase;">QR Code da Bancada</span>
                    <h4 style="margin:6px 0 2px; font-size:16px; font-weight:800; color:#0b2341;">${bNome}</h4>
                    <div style="font-size:11.5px; color:#64748b; margin-bottom:8px;">${maquina}</div>
                    <img src="${imgQR}" alt="QR ${bNome}" onclick="window.abrirModalQRBancada('${safeNome}')" title="Clique para ampliar / imprimir" style="width:130px; height:130px; margin:0 auto; display:block; border:1px solid #e2e8f0; border-radius:10px; padding:4px; cursor:pointer; background:white;">
                </div>
                <div style="font-size:11px; color:#475569; background:#f8fafc; padding:6px 8px; border-radius:8px;">
                    Solicita <strong>ID &amp; Senha</strong> antes da conferência.
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" class="secondary-btn" onclick="window.abrirModalQRBancada('${safeNome}')" style="flex:1; justify-content:center; font-size:12px; padding:7px 10px; font-weight:700;">
                        <span class="material-icons-outlined" style="font-size:16px;">visibility</span> Visualizar
                    </button>
                    <button type="button" class="primary-btn" onclick="window.imprimirEtiquetasQRMicroAlmox('${safeNome}')" style="padding:7px 12px; font-size:12px; background:#0b2341;" title="Imprimir QR desta bancada">
                        <span class="material-icons-outlined" style="font-size:16px;">print</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

// Modal de visualização do QR Code exclusivo de bancada
window.abrirModalQRBancada = function(nomeBancada = 'Bancada 01') {
    const urlQR = window.gerarUrlQRBancada(nomeBancada);
    const imgQR = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(urlQR)}`;

    const tit = document.getElementById('modal-qr-est-titulo');
    const sub = document.getElementById('modal-qr-est-sub');
    const body = document.getElementById('modal-qr-est-body');
    if (!body) return;

    if (tit) tit.innerText = `QR Code Oficial — ${nomeBancada}`;
    if (sub) sub.innerText = 'Escaneie na bancada para abrir a tela de login do Portal do Aluno';

    const safeUrl = urlQR.replace(/'/g, "\'");
    const safeNome = nomeBancada.replace(/'/g, "\'");

    body.innerHTML = `
        <div style="background:#f8fafc; border:2px dashed #0b2341; border-radius:16px; padding:18px; display:inline-block; margin-bottom:14px;">
            <img src="${imgQR}" alt="QR ${nomeBancada}" style="width:220px; height:220px; display:block; margin:0 auto;">
        </div>

        <div style="background:#eff6ff; border:1px solid #93c5fd; border-radius:12px; padding:12px 16px; margin-bottom:14px; font-size:13px; color:#1e3a8a; text-align:left; line-height:1.45;">
            <strong>Acesso à ${nomeBancada}:</strong><br>
            Ao apontar a câmera do celular para este QR Code, o estudante é direcionado à tela de login do <strong>Portal do Aluno</strong>, onde deverá inserir seu <strong>ID (Matrícula)</strong> e <strong>Senha</strong> cadastrados na Coordenação antes de iniciar a conferência.
        </div>

        <div style="font-size:11.5px; color:#64748b; word-break:break-all; background:#f1f5f9; padding:8px 10px; border-radius:8px; margin-bottom:16px;">
            ${urlQR}
        </div>

        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button type="button" class="secondary-btn" onclick="navigator.clipboard?.writeText('${safeUrl}'); if(window.mostrarToast) window.mostrarToast('Link Copiado!', 'Link do QR Code da bancada copiado.', 'info');" style="font-weight:700;">
                <span class="material-icons-outlined" style="font-size:17px; margin-right:5px;">content_copy</span> Copiar Link
            </button>
            <button type="button" class="primary-btn" onclick="window.imprimirEtiquetasQRMicroAlmox('${safeNome}')" style="background:#0b2341; font-weight:800;">
                <span class="material-icons-outlined" style="font-size:17px; margin-right:5px;">print</span> Imprimir QR Code da Bancada
            </button>
        </div>
    `;

    openModal('modal-qr-acesso-estudante');
};

// Impressão limpa das Etiquetas QR Code das Bancadas para colar nas máquinas
window.imprimirEtiquetasQRMicroAlmox = function(apenasBancada = '') {
    const bancadas = apenasBancada ? [apenasBancada] : window.obterListaBancadasOficiais();
    const win = window.open('', '_blank', 'width=900,height=740');
    if (!win) {
        alert('Permita pop-ups no navegador para imprimir os QR Codes das bancadas.');
        return;
    }

    const cardsHtml = bancadas.map(bNome => {
        const urlQR = window.gerarUrlQRBancada(bNome);
        const imgQR = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(urlQR)}`;

        let maquina = 'Máquina Reta Industrial';
        if (Array.isArray(window.bancadasCheckinMock)) {
            const bObj = window.bancadasCheckinMock.find(x => x.numero === bNome);
            if (bObj && bObj.maquina) maquina = bObj.maquina;
        }

        return `
            <div style="border:2.5px solid #0b2341; border-radius:14px; padding:16px; text-align:center; page-break-inside:avoid; display:flex; flex-direction:column; justify-content:space-between; height:320px;">
                <div>
                    <div style="font-size:11px; font-weight:900; color:#0284c7; text-transform:uppercase; letter-spacing:0.5px;">SENAIVEST • CONFERÊNCIA DE BANCADA</div>
                    <div style="font-size:20px; font-weight:900; color:#0b2341; margin:4px 0 2px;">${bNome}</div>
                    <div style="font-size:12px; color:#475569; font-weight:700;">${maquina}</div>
                </div>
                <img src="${imgQR}" style="width:160px; height:160px; display:block; margin:0 auto; border:1px solid #cbd5e1; border-radius:8px; padding:3px;">
                <div style="background:#f1f5f9; border-radius:8px; padding:6px; font-size:11px; color:#0f172a; line-height:1.35;">
                    Escaneie com a câmera do celular para entrar no <strong>Portal do Aluno</strong> (solicitará seu <strong>ID</strong> e <strong>Senha</strong>).
                </div>
            </div>
        `;
    }).join('');

    win.document.write(`
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>QR Codes das Bancadas - SENAI</title></head>
        <body style="font-family:Arial,sans-serif; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; border-bottom:2px solid #0b2341; padding-bottom:10px;">
                <div>
                    <h2 style="margin:0; color:#0b2341; font-size:18px;">SENAI • QR CODES EXCLUSIVOS DAS BANCADAS</h2>
                    <p style="margin:3px 0 0; font-size:12px; color:#475569;">Fixe estas etiquetas em cada bancada/máquina. O aluno faz login com ID (Matrícula) e Senha para conferir.</p>
                </div>
                <button onclick="window.print()" style="background:#0b2341; color:white; border:none; padding:9px 18px; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Imprimir Etiquetas</button>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;">${cardsHtml}</div>
        </body></html>
    `);
    win.document.close();
};

// Processamento quando o celular escaneia o QR Code da bancada:
// NUNCA entra direto! Sempre abre a tela de login exigindo ID e Senha!
window.processarEntradaDiretaViaQRCode = function() {
    try {
        const search = window.location.search || '';
        if (!search.includes('qr_portal=aluno')) return;

        const params = new URLSearchParams(search);
        const bancadaUrl = (params.get('bancada') || 'Bancada 04').trim();

        // Limpar query string da barra de navegação sem recarregar
        try {
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}

        // Forçar logout de sessão anterior
        sessionStorage.removeItem('senaivest_session');
        currentUser = null;
        window._qrContextoPendente = { bancada: bancadaUrl };

        // Mostrar tela de login no perfil Aluno
        document.getElementById('app-container')?.classList.remove('active');
        document.getElementById('cadastro-screen')?.classList.remove('active');
        document.getElementById('login-screen')?.classList.add('active');

        if (typeof window.selectLoginProfile === 'function') {
            window.selectLoginProfile('Aluno');
        }

        const idInp = document.getElementById('login-id');
        const senhaInp = document.getElementById('login-senha');
        if (idInp) {
            idInp.value = '';
            idInp.placeholder = 'Digite seu ID de Matrícula (Ex: ALU-101)';
            idInp.oninput = null; // Remove qualquer espelhamento automático
        }
        if (senhaInp) {
            senhaInp.value = '';
            senhaInp.placeholder = 'Digite sua Senha (Matrícula)';
        }

        const banner = document.getElementById('qr-login-banner-aluno');
        if (banner) {
            banner.style.display = 'block';
            banner.innerHTML = `
                <div style="display:flex; align-items:flex-start; gap:10px;">
                    <span class="material-icons-outlined" style="color:#0284c7; font-size:24px;">qr_code_scanner</span>
                    <div>
                        <strong style="color:#0b2341; font-size:13.5px; display:block;">Bancada Escaneada: ${bancadaUrl}</strong>
                        <span style="font-size:12px; color:#334155; line-height:1.4; display:block; margin-top:2px;">
                            Digite seu <strong>ID (Matrícula)</strong> e sua <strong>Senha</strong> para entrar no Portal do Aluno e realizar a conferência desta bancada.
                        </span>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.warn('Aviso no processamento de QR da bancada:', e);
    }
};

// Executar após o login bem-sucedido quando veio de um QR de Bancada
window.aplicarContextoAvaliacaoQRAluno = function(ctx = {}) {
    if (!ctx) return;
    const bancadaAlvo = ctx.bancada || 'Bancada 04';
    const matAluno = (currentUser && currentUser.id) ? currentUser.id : '';
    const nomeAluno = (currentUser && currentUser.nome) ? currentUser.nome : 'Estudante';

    // Vincular o aluno à bancada escaneada
    if (Array.isArray(window.bancadasCheckinMock)) {
        const b = window.bancadasCheckinMock.find(x => x.numero.toLowerCase() === bancadaAlvo.toLowerCase());
        if (b) {
            b.alunoMatricula = matAluno;
            b.alunoNome = nomeAluno;
            b.status = 'confirmado';
            try { localStorage.setItem('senaivest_bancadas_prof', JSON.stringify(window.bancadasCheckinMock)); } catch (e) {}
        }
    }

    if (window.alunoBancadaAtual) {
        window.alunoBancadaAtual.numero = bancadaAlvo;
        window.alunoBancadaAtual.checkin = true;
    }

    nav('view-aluno-bancada');
    if (typeof window.renderAlunoBancada === 'function') {
        window.renderAlunoBancada();
    }

    const banner = document.getElementById('aluno-qr-avaliacao-welcome-banner');
    if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
            <div style="background:linear-gradient(135deg, #0b2341 0%, #1e3a8a 100%); color:white; border-radius:14px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; box-shadow:0 6px 18px rgba(11,35,65,0.18);">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="material-icons-outlined" style="font-size:24px; color:#38bdf8;">verified_user</span>
                    <div>
                        <div style="font-size:14.5px; font-weight:800;">Conferência Liberada: ${bancadaAlvo}</div>
                        <div style="font-size:12px; color:#cbd5e1;">Estudante: <strong>${nomeAluno}</strong> (${matAluno}) &bull; Siga os passos 1, 2 e 3 abaixo para pontuar.</div>
                    </div>
                </div>
            </div>
        `;
    }
};

// --- 3. BASE DE ALUNOS NA COORDENAÇÃO (SEM QR POR ALUNO) ---
window.sincronizarBasePreCadastroAlunos = function() {
    let users = {};
    try { users = JSON.parse(localStorage.getItem('senaivest_users') || '{}'); } catch (e) { users = {}; }

    let cadastrados = [];
    try {
        const raw = localStorage.getItem('senaivest_alunos_cadastrados');
        if (raw) cadastrados = JSON.parse(raw);
    } catch (e) {}

    const listaDiario = Array.isArray(window.mockAlunosDiario) ? window.mockAlunosDiario : [];
    let alterou = false;

    listaDiario.forEach(al => {
        const mat = String(al.id || al.matricula || '').trim().toUpperCase();
        if (!mat) return;
        const nome = String(al.nome || ('Estudante ' + mat)).trim();
        const turma = al.turma || 'Vestuário e Estilismo - Manhã';

        if (!cadastrados.some(c => String(c.matricula).toUpperCase() === mat)) {
            cadastrados.push({
                id: mat,
                matricula: mat,
                nome: nome,
                turma: turma,
                bancadaPadrao: al.bancadaPadrao || '',
                senha: mat,
                role: 'Aluno'
            });
            alterou = true;
        }

        if (!users[mat]) {
            users[mat] = {
                id: mat,
                matricula: mat,
                nome: nome,
                role: 'Aluno',
                turma: turma,
                senha: mat,
                escola: 'SENAI Centro de Formação Cândido Atahyde'
            };
            alterou = true;
        }
    });

    Object.entries(users).forEach(([uid, u]) => {
        if (u && (u.role === 'Aluno' || u.role === 'aluno')) {
            const mat = String(u.matricula || uid).trim().toUpperCase();
            if (!cadastrados.some(c => String(c.matricula).toUpperCase() === mat)) {
                cadastrados.push({
                    id: mat,
                    matricula: mat,
                    nome: u.nome || ('Estudante ' + mat),
                    turma: u.turma || 'Vestuário e Estilismo - Manhã',
                    bancadaPadrao: u.bancadaPadrao || '',
                    senha: u.senha || mat,
                    role: 'Aluno'
                });
                alterou = true;
            }
        }
    });

    if (alterou) {
        try {
            localStorage.setItem('senaivest_users', JSON.stringify(users));
            localStorage.setItem('senaivest_alunos_cadastrados', JSON.stringify(cadastrados));
        } catch (e) {}
    }

    return cadastrados;
};

window.atualizarPreviewCredencialAlunoCoord = function(valor) {
    const limpo = String(valor || '').trim().toUpperCase();
    const elId = document.getElementById('preview-aluno-coord-id');
    const elSenha = document.getElementById('preview-aluno-coord-senha');
    if (elId) elId.innerText = limpo || 'AGUARDANDO MATRÍCULA';
    if (elSenha) elSenha.innerText = limpo || 'AGUARDANDO MATRÍCULA';
};

window.salvarAlunoPreCadastradoCoord = async function() {
    const nomeInp = document.getElementById('novo-aluno-coord-nome');
    const matInp = document.getElementById('novo-aluno-coord-matricula');
    const turmaSel = document.getElementById('novo-aluno-coord-turma');
    const bancSel = document.getElementById('novo-aluno-coord-bancada');

    const nome = nomeInp ? nomeInp.value.trim() : '';
    const matricula = matInp ? matInp.value.trim().toUpperCase() : '';
    const turma = turmaSel ? turmaSel.value : 'Vestuário e Estilismo - Manhã';
    const bancadaPadrao = bancSel ? bancSel.value : '';

    if (!nome || !matricula) {
        alert('Preencha o Nome Completo e o Número de Matrícula do estudante!');
        return;
    }

    const registro = {
        id: matricula,
        matricula: matricula,
        nome: nome,
        turma: turma,
        bancadaPadrao: bancadaPadrao,
        senha: matricula,
        role: 'Aluno',
        escola: 'SENAI Centro de Formação Cândido Atahyde',
        criadoEm: new Date().toISOString()
    };

    // 1. Salvar no Firestore
    if (typeof db !== 'undefined' && db) {
        try {
            await db.collection('usuarios').doc(matricula).set(registro, { merge: true });
        } catch (e) {
            console.warn('Aviso Firestore:', e);
        }
    }

    // 2. Salvar localmente
    try {
        const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        users[matricula] = registro;
        localStorage.setItem('senaivest_users', JSON.stringify(users));
    } catch (e) {}

    try {
        const lista = window.sincronizarBasePreCadastroAlunos();
        const idx = lista.findIndex(a => String(a.matricula).toUpperCase() === matricula);
        if (idx >= 0) lista[idx] = { ...lista[idx], ...registro };
        else lista.unshift(registro);
        localStorage.setItem('senaivest_alunos_cadastrados', JSON.stringify(lista));
    } catch (e) {}

    if (nomeInp) nomeInp.value = '';
    if (matInp) matInp.value = '';
    if (bancSel) bancSel.value = '';
    window.atualizarPreviewCredencialAlunoCoord('');
    window.renderListaAlunosPreCadastradosCoord();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            'Estudante Cadastrado!',
            `${nome} registrado com ID: ${matricula} e Senha: ${matricula} (Sincronizado na Nuvem).`,
            'success'
        );
    }
};

window.renderListaAlunosPreCadastradosCoord = function() {
    const grid = document.getElementById('lista-alunos-coord');
    const countEl = document.getElementById('count-alunos-pre-cadastrados');
    if (!grid) return;

    const lista = window.sincronizarBasePreCadastroAlunos();
    if (countEl) countEl.innerText = String(lista.length);

    const filtroTurma = document.getElementById('filtro-turma-alunos-coord')?.value || 'todas';
    const busca = (document.getElementById('busca-alunos-coord')?.value || '').trim().toLowerCase();

    const filtrados = lista.filter(a => {
        if (filtroTurma !== 'todas' && !String(a.turma || '').toLowerCase().includes(filtroTurma.toLowerCase())) {
            return false;
        }
        if (busca) {
            const alvo = `${a.nome} ${a.matricula} ${a.turma}`.toLowerCase();
            if (!alvo.includes(busca)) return false;
        }
        return true;
    });

    if (filtrados.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1 / -1; text-align:center; padding:32px 20px; border:1px dashed #cbd5e1; border-radius:12px; color:#64748b;">
                Nenhum estudante encontrado para este filtro.
            </div>
        `;
        return;
    }

    grid.innerHTML = filtrados.map(al => {
        const mat = String(al.matricula || al.id).toUpperCase();
        const safeMat = mat.replace(/'/g, "\'");

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:14px; padding:16px; box-shadow:0 3px 10px rgba(11,35,65,0.04); display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                    <div>
                        <div style="font-weight:800; font-size:15px; color:#0b2341;">${al.nome}</div>
                        <div style="font-size:12px; color:#64748b; margin-top:2px;">${al.turma || 'Turma Regular'}</div>
                    </div>
                    <button type="button" onclick="window.removerAlunoPreCadastradoCoord('${safeMat}')" style="background:#fee2e2; border:none; border-radius:6px; color:#ef4444; width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;" title="Remover cadastro">
                        <span class="material-icons-outlined" style="font-size:16px;">delete</span>
                    </button>
                </div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:12px;">
                    <div><strong>ID (Matrícula):</strong> <code style="color:#0284c7; font-weight:800;">${mat}</code></div>
                    <div><strong>Senha Padrão:</strong> <code style="color:#059669; font-weight:800;">${mat}</code></div>
                </div>
            </div>
        `;
    }).join('');
};

window.removerAlunoPreCadastradoCoord = async function(matRaw) {
    const mat = String(matRaw || '').trim().toUpperCase();
    if (!mat || !confirm(`Deseja remover o estudante de matrícula ${mat}?`)) return;

    try {
        const users = JSON.parse(localStorage.getItem('senaivest_users') || '{}');
        delete users[mat];
        localStorage.setItem('senaivest_users', JSON.stringify(users));
    } catch (e) {}

    try {
        let lista = JSON.parse(localStorage.getItem('senaivest_alunos_cadastrados') || '[]');
        lista = lista.filter(a => String(a.matricula || a.id).toUpperCase() !== mat);
        localStorage.setItem('senaivest_alunos_cadastrados', JSON.stringify(lista));
    } catch (e) {}

    if (typeof db !== 'undefined' && db) {
        try { await db.collection('usuarios').doc(mat).delete(); } catch (e) {}
    }

    window.renderListaAlunosPreCadastradosCoord();
};

// --- 4. CONFERÊNCIA CLARA DA BANCADA DO ALUNO, FOTO EM CASO DE AVARIA & REGISTRO CONCLUÍDO ---

// Helper de compressão de foto via Canvas para envio ultraleve ao Firestore
window.comprimirImagemBase64 = function(file, maxWidth = 640, quality = 0.68) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => resolve(e.target.result);
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

window._fotoAvariaBancadaAtual = null;

window.processarFotoAvariaBancada = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const base64 = await window.comprimirImagemBase64(file, 640, 0.68);
    window._fotoAvariaBancadaAtual = base64;

    const imgPrev = document.getElementById('img-preview-foto-avaria');
    const containerPrev = document.getElementById('preview-foto-avaria-container');
    const labelStatus = document.getElementById('status-foto-avaria-label');

    if (imgPrev) imgPrev.src = base64;
    if (containerPrev) containerPrev.style.display = 'block';
    if (labelStatus) {
        labelStatus.innerText = '✅ Foto do material anexada!';
        labelStatus.style.color = '#15803d';
    }

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('Foto Anexada!', 'A imagem da avaria foi capturada com sucesso.', 'success');
    }
};

window.processarFotoModalDivergencia = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const base64 = await window.comprimirImagemBase64(file, 640, 0.68);
    window._fotoModalDivergenciaAtual = base64;

    const imgPrev = document.getElementById('div-foto-preview-img');
    const boxPrev = document.getElementById('div-foto-preview-box');
    if (imgPrev) imgPrev.src = base64;
    if (boxPrev) boxPrev.style.display = 'block';
};

window.ativarRelatoProblemaBancadaManual = function() {
    const box = document.getElementById('box-foto-avaria-bancada');
    if (box) {
        box.style.display = 'block';
        box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// Obter materiais atuais da bancada
window.obterItensBancadaAluno = function(nomeBancada) {
    if (Array.isArray(window.bancadasCheckinMock)) {
        const b = window.bancadasCheckinMock.find(x => x.numero === nomeBancada);
        if (b && Array.isArray(b.materiaisSeparados) && b.materiaisSeparados.length > 0) {
            return b.materiaisSeparados.map(m => ({
                cod: m.cod || m.codigo || 'INS-01',
                nome: m.nome || m.material || 'Material da Bancada',
                qtdEsperada: parseFloat(m.qtd) || 1,
                unidade: m.unidade || 'un.'
            }));
        }
    }
    return [
        { cod: 'FER-004', nome: 'Tesoura de Arremate Mundial', qtdEsperada: 1, unidade: 'un.' },
        { cod: 'INS-012', nome: 'Bobinas de Linha Poliéster 120', qtdEsperada: 2, unidade: 'un.' },
        { cod: 'FER-008', nome: 'Fita Métrica Fibra 150cm', qtdEsperada: 1, unidade: 'un.' },
        { cod: 'MAT-001', nome: 'Tecido Algodão Cru', qtdEsperada: 5.0, unidade: 'm' }
    ];
};

// Renderizar cards claros e responsivos de conferência de materiais da bancada
window.renderTabelaAuditoriaInterativaAluno = function() {
    const container = document.getElementById('lista-auditoria-bancada-cards');
    if (!container) return;

    const nomeBancada = window.obterBancadaDoAlunoAtual ? window.obterBancadaDoAlunoAtual() : 'Bancada 04';
    const itens = window.obterItensBancadaAluno(nomeBancada);

    container.innerHTML = itens.map((item, idx) => {
        return `
            <div class="bancada-item-audit-card item-ok" id="card-item-bancada-${idx}">
                <div class="bancada-item-top">
                    <div>
                        <div style="font-weight:800; font-size:14px; color:#0b2341;">${item.nome}</div>
                        <div style="font-size:11.5px; color:#64748b;">Cód: ${item.cod} &bull; Qtd. Sistema: <strong>${item.qtdEsperada} ${item.unidade}</strong></div>
                    </div>
                    <span id="badge-item-status-${idx}" style="font-size:11px; font-weight:800; background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:8px;">
                        ✔ Em Boas Condições
                    </span>
                </div>

                <div class="bancada-item-controls">
                    <div>
                        <label>Qtd. na Bancada</label>
                        <input type="number" id="inp-qtd-fisica-${idx}" value="${item.qtdEsperada}" step="0.5" min="0" oninput="window.verificarMudancaCondicaoItem(${idx}, ${item.qtdEsperada})">
                    </div>
                    <div>
                        <label>Condição do Item</label>
                        <select id="sel-condicao-item-${idx}" onchange="window.verificarMudancaCondicaoItem(${idx}, ${item.qtdEsperada})">
                            <option value="Em perfeito estado">✅ Em perfeito estado</option>
                            <option value="Com avaria / danificado">⚠️ Com avaria / danificado</option>
                            <option value="Faltando na bancada">❌ Faltando na bancada</option>
                            <option value="Desgaste / precisa reparo">🔧 Desgaste / precisa reparo</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    window.verificarSeExisteAvariaGeral();
};

window.verificarMudancaCondicaoItem = function(idx, qtdEsperada) {
    const card = document.getElementById(`card-item-bancada-${idx}`);
    const badge = document.getElementById(`badge-item-status-${idx}`);
    const condSel = document.getElementById(`sel-condicao-item-${idx}`);
    const inpQtd = document.getElementById(`inp-qtd-fisica-${idx}`);

    const cond = condSel ? condSel.value : 'Em perfeito estado';
    const qtd = inpQtd ? parseFloat(inpQtd.value) : qtdEsperada;

    const temProblema = (cond !== 'Em perfeito estado') || (qtd !== qtdEsperada);

    if (card) {
        if (temProblema) {
            card.classList.remove('item-ok');
            card.classList.add('item-problema');
        } else {
            card.classList.remove('item-problema');
            card.classList.add('item-ok');
        }
    }

    if (badge) {
        if (temProblema) {
            badge.innerText = '⚠️ Com Problema';
            badge.style.background = '#fef2f2';
            badge.style.color = '#dc2626';
        } else {
            badge.innerText = '✔ Em Boas Condições';
            badge.style.background = '#dcfce7';
            badge.style.color = '#15803d';
        }
    }

    window.verificarSeExisteAvariaGeral();
};

window.verificarSeExisteAvariaGeral = function() {
    const container = document.getElementById('lista-auditoria-bancada-cards');
    const boxFoto = document.getElementById('box-foto-avaria-bancada');
    if (!container || !boxFoto) return;

    const cardsProblema = container.querySelectorAll('.bancada-item-audit-card.item-problema');
    if (cardsProblema.length > 0) {
        boxFoto.style.display = 'block';
    }
};

// Atribuição Justa de Pontos no Ranking (Local + Firestore)
window.atribuirPontosRankingAluno = async function(matAlunoRaw, pontosNovos, motivo = '') {
    const mat = String(matAlunoRaw || '').trim().toUpperCase();
    if (!mat || !pontosNovos) return 0;

    let pontuacoes = {};
    try {
        pontuacoes = JSON.parse(localStorage.getItem('senaivest_pontuacoes_alunos') || '{}');
    } catch (e) { pontuacoes = {}; }

    const atual = parseInt(pontuacoes[mat] || 0, 10);
    const novoTotal = atual + parseInt(pontosNovos, 10);
    pontuacoes[mat] = novoTotal;

    try {
        localStorage.setItem('senaivest_pontuacoes_alunos', JSON.stringify(pontuacoes));
    } catch (e) {}

    // Persistir no Firestore
    if (typeof db !== 'undefined' && db) {
        try {
            await db.collection('sincronizacao_sistema').doc('ranking_retalhos').set({
                pontuacoes: pontuacoes,
                atualizadoEm: new Date().toISOString()
            }, { merge: true });
        } catch (e) {}
    }

    return novoTotal;
};

// Concluir Conferência da Aula pelo Aluno (Comprovante Oficial + Notificação Coordenação + Pontos)
window.concluirConferenciaBancadaAula = async function() {
    const nomeBancada = window.obterBancadaDoAlunoAtual ? window.obterBancadaDoAlunoAtual() : 'Bancada 04';
    const matAluno = (currentUser && currentUser.id) ? currentUser.id : 'ALU-101';
    const nomeAluno = (currentUser && currentUser.nome) ? currentUser.nome : 'Estudante';
    const turmaAluno = (currentUser && currentUser.turma) ? currentUser.turma : 'Vestuário e Estilismo - Manhã';

    // Obter plano de aula ativo da turma
    let aulaId = 'PLAN-102';
    let aulaTema = 'Costura e Acabamentos';
    const planos = window.obterPlanosReaisConsolidados ? window.obterPlanosReaisConsolidados() : [];
    if (planos.length > 0) {
        const pAtivo = planos.find(p => p && !p.finalizadoManual) || planos[0];
        aulaId = pAtivo.id || aulaId;
        aulaTema = pAtivo.tema || pAtivo.plano || aulaTema;
    }

    // Verificar se algum item tem avaria ou divergência
    const containerCards = document.getElementById('lista-auditoria-bancada-cards');
    let itensComProblema = [];
    if (containerCards) {
        const cards = containerCards.querySelectorAll('.bancada-item-audit-card');
        cards.forEach((c, i) => {
            const cond = document.getElementById(`sel-condicao-item-${i}`)?.value || 'Em perfeito estado';
            const qtd = document.getElementById(`inp-qtd-fisica-${i}`)?.value || '1';
            if (cond !== 'Em perfeito estado') {
                itensComProblema.push(`Item ${i + 1} (${cond}) - Qtd: ${qtd}`);
            }
        });
    }

    const obsTexto = (document.getElementById('obs-avaria-bancada-input')?.value || '').trim();
    const teveAvaria = itensComProblema.length > 0 || Boolean(obsTexto) || Boolean(window._fotoAvariaBancadaAtual);

    // Se houver avaria relatada mas nenhuma foto foi tirada, exigir a foto!
    if (teveAvaria && !window._fotoAvariaBancadaAtual) {
        const boxFoto = document.getElementById('box-foto-avaria-bancada');
        if (boxFoto) {
            boxFoto.style.display = 'block';
            boxFoto.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        alert('📷 Identificamos uma avaria/problema relatado. Por favor, tire ou anexe uma foto do material para notificar a Coordenação antes de concluir!');
        return;
    }

    const agora = new Date();
    const dataHoraStr = agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Pontuação justa: concluiu o check-in ganha pontos (bônus de +10 pts ao reportar com foto responsável!)
    const pontosGanhos = teveAvaria ? 60 : 50;

    const conclusaoRegistro = {
        id: 'CONC-' + Date.now().toString().slice(-6),
        aulaId: aulaId,
        aulaTema: `${aulaId} (${aulaTema})`,
        bancada: nomeBancada,
        alunoId: matAluno,
        alunoNome: nomeAluno,
        turma: turmaAluno,
        horario: dataHoraStr,
        timestamp: Date.now(),
        status: 'CONCLUÍDO',
        teveAvaria: teveAvaria,
        descricaoAvaria: obsTexto || (itensComProblema.join('; ') || 'Sem avarias relatadas'),
        fotoAvaria: window._fotoAvariaBancadaAtual || null,
        pontosAtribuidos: pontosGanhos
    };

    // 1. Salvar na lista de conclusões do LocalStorage
    let salvas = [];
    try {
        salvas = JSON.parse(localStorage.getItem('senaivest_conclusoes_bancada') || '[]');
    } catch (e) {}
    salvas.unshift(conclusaoRegistro);
    try {
        localStorage.setItem('senaivest_conclusoes_bancada', JSON.stringify(salvas));
    } catch (e) {}

    // 2. Persistir no Cloud Firestore
    if (typeof db !== 'undefined' && db) {
        try {
            await db.collection('conclusoes_bancada').doc(conclusaoRegistro.id).set(conclusaoRegistro);
        } catch (e) {
            console.warn('Aviso ao salvar conclusão no Firestore:', e);
        }
    }

    // 3. Creditar pontos no Ranking
    await window.atribuirPontosRankingAluno(matAluno, pontosGanhos, `Conclusão de Conferência - ${aulaTema}`);

    // 4. Se teve avaria, gerar Boletim e Notificação automática para a Coordenação
    if (teveAvaria) {
        const idBoletim = 'BOL-AVAR-' + Date.now().toString().slice(-5);
        const novoBoletim = {
            id: idBoletim,
            material: `Avaria em Bancada (${nomeBancada})`,
            tipo: 'Avaria / Manutenção',
            status: 'Em Análise',
            autor: `${nomeAluno} (${matAluno})`,
            data: agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            almoxarifado: nomeBancada,
            detalhe: `Ocorrência registrada no check-in da aula ${aulaTema}. Relato: ${conclusaoRegistro.descricaoAvaria}`,
            fotoComprovante: conclusaoRegistro.fotoAvaria
        };

        if (Array.isArray(window.mockProcessos)) {
            window.mockProcessos.unshift(novoBoletim);
            try { localStorage.setItem('senaivest_processos', JSON.stringify(window.mockProcessos)); } catch (e) {}
        }

        if (typeof db !== 'undefined' && db) {
            try { await db.collection('boletins_ocorrencias').doc(idBoletim).set(novoBoletim); } catch (e) {}
        }

        if (Array.isArray(window.notificacoes)) {
            window.notificacoes.unshift({
                id: Date.now(),
                title: `⚠️ Avaria na ${nomeBancada} (${aulaTema})`,
                desc: `Aluno(a) ${nomeAluno} (${matAluno}) anexou foto e relatou avaria. Notificação enviada à Coordenação.`,
                type: 'alert'
            });
        }
    }

    // 5. Exibir Comprovante Salvo na Interface
    window.renderComprovanteConclusaoSalva(conclusaoRegistro);

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast(
            'Aula Concluída com Sucesso!',
            `Conferência da ${nomeBancada} finalizada! +${pontosGanhos} pontos computados no Ranking.`,
            'success'
        );
    }
};

window.renderComprovanteConclusaoSalva = function(registro) {
    const container = document.getElementById('container-conclusao-aula-salva');
    if (!container) return;

    const r = registro || (function() {
        try {
            const arr = JSON.parse(localStorage.getItem('senaivest_conclusoes_bancada') || '[]');
            return arr[0];
        } catch (e) { return null; }
    })();

    if (!r) {
        container.innerHTML = '';
        return;
    }

    const corBorda = r.teveAvaria ? '#ea580c' : '#059669';
    const bgBadge = r.teveAvaria ? '#fff7ed' : '#ecfdf5';
    const corTexto = r.teveAvaria ? '#9a3412' : '#065f46';

    const btnFoto = r.fotoAvaria ? `
        <button type="button" onclick="window.visualizarFotoConclusaoModal('${r.id}')" style="background:#0b2341; color:white; border:none; border-radius:7px; padding:6px 12px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
            <span class="material-icons-outlined" style="font-size:15px; color:#fde047;">photo</span> Ver Foto Anexada
        </button>
    ` : '';

    container.innerHTML = `
        <div class="conclusao-salva-card ${r.teveAvaria ? 'com-avaria' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="material-icons-outlined" style="color:${corBorda}; font-size:24px;">task_alt</span>
                    <div>
                        <strong style="font-size:15px; color:#0b2341;">${r.aulaTema} &bull; CONCLUÍDO</strong>
                        <span style="display:block; font-size:12px; color:#64748b;">Horário Registrado: <strong>${r.horario}</strong></span>
                    </div>
                </div>
                <span style="background:${bgBadge}; color:${corTexto}; border:1px solid ${corBorda}; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:800;">
                    +${r.pontosAtribuidos || 50} pts no Ranking
                </span>
            </div>

            <div style="font-size:12.5px; color:#334155; line-height:1.45; background:#f8fafc; padding:10px 12px; border-radius:10px; margin-top:8px;">
                <div><strong>Registro do Aluno:</strong> ${r.alunoNome} (Matrícula: <code>${r.alunoId}</code>)</div>
                <div><strong>Bancada:</strong> ${r.bancada} &bull; <strong>Turma:</strong> ${r.turma}</div>
                <div><strong>Situação dos Materiais:</strong> ${r.teveAvaria ? `<span style="color:#dc2626; font-weight:800;">⚠️ Avaria Reportada com Foto (${r.descricaoAvaria})</span>` : '<span style="color:#15803d; font-weight:700;">✅ Em boas condições / Sem avarias</span>'}</div>
            </div>

            ${btnFoto ? `<div style="margin-top:10px;">${btnFoto}</div>` : ''}
        </div>
    `;
};

window.visualizarFotoConclusaoModal = function(id) {
    let foto = null;
    try {
        const arr = JSON.parse(localStorage.getItem('senaivest_conclusoes_bancada') || '[]');
        const achado = arr.find(x => x.id === id);
        if (achado) foto = achado.fotoAvaria;
    } catch (e) {}

    if (!foto) {
        alert('Foto não encontrada.');
        return;
    }

    const win = window.open('', '_blank', 'width=650,height=600');
    if (!win) {
        alert('Permita pop-ups para visualizar a foto.');
        return;
    }
    win.document.write(`
        <!DOCTYPE html><html><head><title>Foto da Avaria - SENAIVEST</title></head>
        <body style="margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; height:100vh;">
            <img src="${foto}" style="max-width:95vw; max-height:95vh; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.5);">
        </body></html>
    `);
    win.document.close();
};

// --- 5. RANKING DINÂMICO BASEADO EM ALUNOS REAIS E PONTUAÇÕES ATRIBUÍDAS ---
window.renderRankingEficiencia = function() {
    const podioContainer = document.getElementById('ranking-podio-dinamico');
    const tabelaContainer = document.getElementById('ranking-tabela-completa-alunos');
    const pontosTotalEl = document.getElementById('aluno-pontos-total');
    if (!podioContainer && !tabelaContainer) return;

    // Obter todos os estudantes pré-cadastrados
    const estudantes = window.sincronizarBasePreCadastroAlunos ? window.sincronizarBasePreCadastroAlunos() : [];

    let pontuacoes = {};
    try {
        pontuacoes = JSON.parse(localStorage.getItem('senaivest_pontuacoes_alunos') || '{}');
    } catch (e) {}

    let conclusoes = [];
    try {
        conclusoes = JSON.parse(localStorage.getItem('senaivest_conclusoes_bancada') || '[]');
    } catch (e) {}

    // Montar lista de classificação real
    const rankingLista = estudantes.map(est => {
        const mat = String(est.matricula || est.id).toUpperCase();
        const pts = parseInt(pontuacoes[mat] || 0, 10);
        const checksConcluidos = conclusoes.filter(c => String(c.alunoId).toUpperCase() === mat).length;
        return {
            id: mat,
            matricula: mat,
            nome: est.nome,
            turma: est.turma || 'Vestuário e Estilismo - Manhã',
            bancada: est.bancadaPadrao || 'Bancada',
            pontos: pts,
            conclusoes: checksConcluidos
        };
    });

    // Ordenar por pontuação decrescente
    rankingLista.sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.conclusoes !== a.conclusoes) return b.conclusoes - a.conclusoes;
        return a.nome.localeCompare(b.nome);
    });

    // Atualizar pontuação do usuário logado
    const matLogado = (currentUser && currentUser.id) ? currentUser.id.toUpperCase() : '';
    const posUsuario = rankingLista.findIndex(x => x.matricula === matLogado);
    const ptsUsuario = (posUsuario >= 0) ? rankingLista[posUsuario].pontos : 0;
    if (pontosTotalEl) {
        pontosTotalEl.innerText = `${ptsUsuario} pts ${posUsuario >= 0 ? `(${posUsuario + 1}º Lugar)` : ''}`;
    }

    // Pódio dos 3 Primeiros Colocados Reais
    if (podioContainer) {
        const top3 = rankingLista.slice(0, 3);
        const medalhas = [
            { pos: '1º Lugar', emoji: '🥇', grad: 'linear-gradient(135deg, #fef08a, #facc15)', textCor: '#713f12', borda: 'none', badge: 'Mestre da Bancada' },
            { pos: '2º Lugar', emoji: '🥈', grad: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', textCor: '#1e293b', borda: '2px solid #0284c7', badge: 'Acurácia Exemplar' },
            { pos: '3º Lugar', emoji: '🥉', grad: 'linear-gradient(135deg, #fed7aa, #fdba74)', textCor: '#7c2d12', borda: 'none', badge: 'Conferência Ágil' }
        ];

        podioContainer.innerHTML = top3.map((al, idx) => {
            const m = medalhas[idx] || medalhas[2];
            const isVoce = (al.matricula === matLogado);
            return `
                <div style="background:${m.grad}; padding:20px; border-radius:16px; color:${m.textCor}; text-align:center; border:${m.borda}; box-shadow:0 4px 14px rgba(0,0,0,0.08);">
                    <span style="font-size:36px; display:block; margin-bottom:4px;">${m.emoji}</span>
                    <h3 style="margin:2px 0 4px; font-size:17px; font-weight:800;">${m.pos} ${isVoce ? '(Você)' : ''}</h3>
                    <div style="font-size:15px; font-weight:800;">${al.nome}</div>
                    <div style="font-size:12px; margin-top:2px;">Matrícula: <strong>${al.matricula}</strong> &bull; <strong style="font-size:14px;">${al.pontos} pts</strong></div>
                    <span style="display:inline-block; margin-top:8px; font-size:11px; background:rgba(0,0,0,0.12); padding:3px 10px; border-radius:12px; font-weight:700;">
                        ${m.badge} &bull; ${al.conclusoes} aula(s) concluída(s)
                    </span>
                </div>
            `;
        }).join('');
    }

    // Tabela Completa dos Alunos
    if (tabelaContainer) {
        if (rankingLista.length === 0) {
            tabelaContainer.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-secondary);">Nenhum estudante pré-cadastrado na plataforma.</div>`;
            return;
        }

        tabelaContainer.innerHTML = `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                    <thead style="background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11.5px; text-transform:uppercase; color:#64748b;">
                        <tr>
                            <th style="padding:10px 14px; width:70px;">Posição</th>
                            <th style="padding:10px 14px;">Estudante</th>
                            <th style="padding:10px 14px;">Matrícula (ID)</th>
                            <th style="padding:10px 14px;">Turma</th>
                            <th style="padding:10px 14px; text-align:center;">Aulas Concluídas</th>
                            <th style="padding:10px 14px; text-align:right;">Pontos Atribuídos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rankingLista.map((al, idx) => {
                            const isVoce = (al.matricula === matLogado);
                            const bgLinha = isVoce ? '#f0f9ff' : (idx % 2 === 0 ? '#ffffff' : '#fcfcfc');
                            return `
                                <tr style="border-bottom:1px solid #f1f5f9; background:${bgLinha};">
                                    <td style="padding:10px 14px; font-weight:800; color:#0b2341;">
                                        ${idx === 0 ? '🥇 1º' : (idx === 1 ? '🥈 2º' : (idx === 2 ? '🥉 3º' : `${idx + 1}º`))}
                                    </td>
                                    <td style="padding:10px 14px; font-weight:700; color:#0b2341;">
                                        ${al.nome} ${isVoce ? '<span style="font-size:11px; background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:6px; margin-left:4px;">Você</span>' : ''}
                                    </td>
                                    <td style="padding:10px 14px; font-family:monospace; font-weight:700; color:#0284c7;">${al.matricula}</td>
                                    <td style="padding:10px 14px; color:#475569;">${al.turma}</td>
                                    <td style="padding:10px 14px; text-align:center; font-weight:700;">${al.conclusoes}</td>
                                    <td style="padding:10px 14px; text-align:right; font-weight:800; font-size:14px; color:#059669;">
                                        ${al.pontos} pts
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
};

// --- 6. SINCRONIZAÇÃO EM TEMPO REAL EM NUVEM (CLOUD FIRESTORE) ---
window._sincronizacaoFirestoreAtiva = false;

window.initSincronizacaoGlobalFirestoreV40 = function() {
    if (window._sincronizacaoFirestoreAtiva || typeof db === 'undefined' || !db) return;
    window._sincronizacaoFirestoreAtiva = true;

    console.log("Iniciando motor de sincronização em nuvem Cloud Firestore (v4.0)...");

    // A. Coleção 'planos_aula' em tempo real
    db.collection('planos_aula').onSnapshot(snapshot => {
        if (!snapshot) return;
        const planosNuvem = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.id) planosNuvem.push(d);
        });

        if (planosNuvem.length > 0) {
            try {
                localStorage.setItem('senaivest_planos_aula', JSON.stringify(planosNuvem));
                window.mockPlanos = planosNuvem;
            } catch (e) {}

            if (typeof window.sincronizarOcupacaoAutomaticaPorPlanos === 'function') {
                window.sincronizarOcupacaoAutomaticaPorPlanos(true);
            }
            if (typeof window.renderPlanosGeral === 'function' && currentUser && currentUser.role === 'Coordenação') {
                window.renderPlanosGeral();
            }
            if (typeof window.renderPlanosGridCompleta === 'function' && currentUser && currentUser.role !== 'Coordenação') {
                window.renderPlanosGridCompleta();
            }
        }
    }, err => {
        console.warn("Aviso onSnapshot planos_aula:", err);
    });

    // B. Coleção 'conclusoes_bancada' em tempo real
    db.collection('conclusoes_bancada').onSnapshot(snapshot => {
        if (!snapshot) return;
        const conclusoes = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d && d.id) conclusoes.push(d);
        });

        if (conclusoes.length > 0) {
            conclusoes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            try {
                localStorage.setItem('senaivest_conclusoes_bancada', JSON.stringify(conclusoes));
            } catch (e) {}

            if (currentUser && currentUser.role === 'Aluno') {
                window.renderComprovanteConclusaoSalva();
                window.renderRankingEficiencia();
            }
        }
    }, err => {
        console.warn("Aviso onSnapshot conclusoes_bancada:", err);
    });

    // C. Documentos de Estado Geral em 'sincronizacao_sistema'
    db.collection('sincronizacao_sistema').doc('ranking_retalhos').onSnapshot(doc => {
        if (!doc || !doc.exists) return;
        const data = doc.data() || {};
        if (data.pontuacoes) {
            try {
                localStorage.setItem('senaivest_pontuacoes_alunos', JSON.stringify(data.pontuacoes));
            } catch (e) {}
            if (typeof window.renderRankingEficiencia === 'function') {
                window.renderRankingEficiencia();
            }
        }
    }, err => {
        console.warn("Aviso onSnapshot ranking_retalhos:", err);
    });

    // Upload inicial de planos locais para nuvem caso ainda não existam
    setTimeout(async () => {
        try {
            const locais = JSON.parse(localStorage.getItem('senaivest_planos_aula') || '[]');
            for (const p of locais) {
                if (p && p.id) {
                    await db.collection('planos_aula').doc(String(p.id)).set(p, { merge: true });
                }
            }
        } catch (e) {}
    }, 1500);
};

// Inicialização automática ao carregar
setTimeout(() => {
    window.processarEntradaDiretaViaQRCode();
    window.sincronizarBasePreCadastroAlunos();
    window.initSincronizacaoGlobalFirestoreV40();

    if (currentUser && (currentUser.role === 'Aluno' || currentUser.role === 'aluno')) {
        document.body.classList.add('role-aluno-active');
        window.renderAbasMobilePortalAluno();
        window.renderTabelaAuditoriaInterativaAluno();
        window.renderComprovanteConclusaoSalva();
        window.renderRankingEficiencia();
    }
}, 150);
