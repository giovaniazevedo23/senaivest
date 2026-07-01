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

// Helper for displaying Almoxarifado sigla
function getLabDisplayName(labId) {
    if (!labId) return 'ALM';
    const labObj = typeof registeredLabs !== 'undefined' ? registeredLabs.find(l => Number(l.id) === Number(labId)) : null;
    if (!labObj) return `ALM-${labId}`;
    if (labObj.sigla && labObj.sigla.trim()) {
        return labObj.sigla.trim().toUpperCase();
    }
    const words = (labObj.name || '').split(' ').filter(w => w.length > 2 && !['LAB', 'ALMOXARIFADO'].includes(w.toUpperCase()));
    if (words.length > 0) {
        return 'ALM-' + words.map(w => w.substring(0, 3).toUpperCase()).join('-');
    }
    return `ALM-L${labObj.id}`;
}

let inventory = [];

// Data for Lesson Plans
let initialLessonPlans = [];



let lessonPlans = JSON.parse(localStorage.getItem('lessonPlans')) || [];

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

const initialLabs = [
    { id: 1, name: "Almoxarifado Principal - Lab 1", responsavel: "", sigla: "ALM-L1", schoolId: "COORD-6541" },
    { id: 2, name: "Almoxarifado de Costura - Lab 2", responsavel: "", sigla: "ALM-L2", schoolId: "COORD-6541" },
    { id: 3, name: "Almoxarifado de Modelagem - Lab 3", responsavel: "", sigla: "ALM-L3", schoolId: "COORD-6541" }
];

if (!localStorage.getItem('force_logout_req4')) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('registeredUser');
    sessionStorage.removeItem('coordSession');
    localStorage.setItem('schools', '[]');
    localStorage.setItem('users', '[]');
    localStorage.setItem('serverUsers', '[]');
    localStorage.setItem('force_logout_req4', 'true');
}
let registeredSchools = JSON.parse(localStorage.getItem('schools')) || [];
registeredSchools.forEach(s => {
    if (s && s.code && s.code.startsWith('S') && /\d+/.test(s.code)) {
        s.code = s.name || s.code;
    }
});
if (typeof lessonPlans !== 'undefined' && Array.isArray(lessonPlans)) {
    lessonPlans.forEach((p, idx) => {
        if (!p.code || p.code.startsWith('PLAN-50') || p.code.startsWith('PLAN-10')) {
            p.code = `PLAN-${String(idx + 1).padStart(3, '0')}`;
        }
    });
}
try {
    const regUserStr = localStorage.getItem('registeredUser');
    if (regUserStr) {
        const ru = JSON.parse(regUserStr);
        if (ru && ru.instituicao && ru.instituicao.startsWith('S') && /\d+/.test(ru.instituicao)) {
            const foundSch = registeredSchools.find(sc => sc.name);
            if (foundSch) {
                ru.instituicao = foundSch.name;
                localStorage.setItem('registeredUser', JSON.stringify(ru));
            }
        }
    }
} catch (e) { }
let registeredLabs = JSON.parse(localStorage.getItem('labs')) || initialLabs;
if (!localStorage.getItem('labs') || !Array.isArray(registeredLabs) || registeredLabs.length === 0) {
    registeredLabs = [...initialLabs];
    localStorage.setItem('labs', JSON.stringify(registeredLabs));
} else {
    let updated = false;
    const fakeNames = ["Prof. Carlos", "Profa. Emanuela", "Prof. Roberto"];
    registeredLabs.forEach(lab => {
        if (!lab.schoolId) {
            lab.schoolId = "COORD-6541";
            updated = true;
        }
        if (lab.responsavel && fakeNames.includes(lab.responsavel)) {
            lab.responsavel = "";
            updated = true;
        }
    });
    if (updated) localStorage.setItem('labs', JSON.stringify(registeredLabs));
}

const defaultOrgInstructions = [
    {
        id: 1,
        title: "Descarte Seguro de Agulhas e Alfinetes",
        category: "seguranca",
        content: "1. Nunca descarte agulhas quebradas ou alfinetes tortos no lixo comum ou no chão.\n2. Utilize o coletor rígido amarelo de descarte perfurocortante localizado próximo à mesa de corte principal.\n3. Certifique-se de que a agulha substituta seja do calibre adequado para a máquina e tecido utilizados.\n4. Caso ocorra algum ferimento, utilize o kit de primeiros socorros e relate a ocorrência.",
        image: "",
        author: "SENAI Coordenação",
        date: "22/06/2026",
        likes: 5,
        likedBy: [],
        comments: [],
        escolaCode: ""
    },
    {
        id: 2,
        title: "Separação de Retalhos e Resíduos Têxteis",
        category: "residuos",
        content: "1. Separe os retalhos por tipo de fibra: naturais (algodão, linho) e sintéticos (poliéster, elastano).\n2. Retalhos maiores que 20x20cm devem ser colocados na caixa de doação para projetos sustentáveis e de artesanato.\n3. Fiapos, linhas e pequenos retalhos inutilizáveis devem ser descartados no container específico de reciclagem têxtil.\n4. Limpe a área de corte ao final do turno para evitar contaminação de cores e tecidos.",
        image: "",
        author: "SENAI Coordenação",
        date: "22/06/2026",
        likes: 3,
        likedBy: [],
        comments: [],
        escolaCode: ""
    },
    {
        id: 3,
        title: "Organização de Tesouras e Réguas de Modelagem",
        category: "ferramentas",
        content: "1. Todas as tesouras devem ser penduradas no painel de sombras ao final da aula de modelagem/corte.\n2. Verifique se o número da tesoura coincide com a marcação correspondente no painel.\n3. Réguas e fitas métricas devem ser limpas com álcool isopropílico antes de serem guardadas nas respectivas gavetas organizadoras.\n4. Comunique a ausência ou avaria de qualquer ferramenta imediatamente no formulário de Boletim.",
        image: "",
        author: "SENAI Coordenação",
        date: "22/06/2026",
        likes: 4,
        likedBy: [],
        comments: [],
        escolaCode: ""
    },
    {
        id: 4,
        title: "Senso de Limpeza (Seiso) nas Máquinas Industriais",
        category: "5s",
        content: "1. Limpe a caixa de bobina e a área dos dentes da máquina após o encerramento do uso.\n2. Utilize o pincel de limpeza para remover fiapos e resíduos de poeira acumulados na lançadeira.\n3. Desligue a máquina da tomada elétrica e certifique-se de recolher o pedal.\n4. Coloque a capa protetora de plástico para evitar acúmulo de poeira nos componentes mecânicos.",
        image: "",
        author: "SENAI Coordenação",
        date: "22/06/2026",
        likes: 6,
        likedBy: [],
        comments: [],
        escolaCode: ""
    }
];

let orgPosts = JSON.parse(localStorage.getItem('posts')) || [];
if (orgPosts.length === 0) {
    orgPosts = [...defaultOrgInstructions];
    localStorage.setItem('posts', JSON.stringify(orgPosts));
}

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

function mergeSchoolsList(localArr, backendArr) {
    if (!Array.isArray(backendArr)) return localArr || [];
    if (!Array.isArray(localArr)) return backendArr;
    const merged = [...backendArr];
    localArr.forEach(localSch => {
        const exists = merged.some(bSch =>
            String(bSch.code || bSch.coordId || bSch.id || '').trim().toLowerCase() === String(localSch.code || localSch.coordId || localSch.id || '').trim().toLowerCase() ||
            (bSch.name && localSch.name && String(bSch.name).trim().toLowerCase() === String(localSch.name).trim().toLowerCase())
        );
        if (!exists && (localSch.name || localSch.code)) {
            merged.push(localSch);
        }
    });
    return merged;
}

function mergeLabsList(localArr, backendArr) {
    if (!Array.isArray(backendArr)) return localArr || [];
    if (!Array.isArray(localArr)) return backendArr;
    const merged = [...backendArr];
    localArr.forEach(localLab => {
        const exists = merged.some(bLab =>
            Number(bLab.id) === Number(localLab.id) ||
            (bLab.name && localLab.name && String(bLab.name).trim().toLowerCase() === String(localLab.name).trim().toLowerCase() && String(bLab.schoolId || '').trim().toLowerCase() === String(localLab.schoolId || '').trim().toLowerCase())
        );
        if (!exists && localLab.name) {
            merged.push(localLab);
        }
    });
    return merged;
}

function getSchoolCode(schoolString) {
    if (!schoolString) return '';
    const val = String(schoolString).trim().toLowerCase();
    const found = registeredSchools.find(s =>
        String(s.code || '').trim().toLowerCase() === val ||
        String(s.coordId || '').trim().toLowerCase() === val ||
        String(s.name || '').trim().toLowerCase() === val ||
        String(s.id || '').trim().toLowerCase() === val
    );
    return found ? (found.code || found.coordId || found.id || schoolString) : schoolString;
}

function isSameSchool(val1, val2) {
    if (!val1 && !val2) return true;
    if (!val1 || !val2) return false;
    const s1 = String(val1).trim().toLowerCase();
    const s2 = String(val2).trim().toLowerCase();
    if (s1 === s2) return true;

    const getIdentifiers = (val) => {
        if (typeof registeredSchools !== 'undefined' && Array.isArray(registeredSchools)) {
            const found = registeredSchools.find(s =>
                String(s.code || '').trim().toLowerCase() === val ||
                String(s.coordId || '').trim().toLowerCase() === val ||
                String(s.name || '').trim().toLowerCase() === val ||
                String(s.id || '').trim().toLowerCase() === val
            );
            if (found) {
                return [
                    String(found.code || '').trim().toLowerCase(),
                    String(found.coordId || '').trim().toLowerCase(),
                    String(found.name || '').trim().toLowerCase(),
                    String(found.id || '').trim().toLowerCase()
                ].filter(Boolean);
            }
        }
        return [val];
    };

    const ids1 = getIdentifiers(s1);
    const ids2 = getIdentifiers(s2);
    return ids1.some(id => ids2.includes(id));
}

window.getUserSchoolCode = function () {
    const registeredUserStr = localStorage.getItem('registeredUser');
    const coordSessionStr = sessionStorage.getItem('coordSession');
    let userSchool = '';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            userSchool = (user.instituicao || '').trim();
        } catch (e) { }
    }
    if (!userSchool && coordSessionStr) {
        try {
            const coordSchool = JSON.parse(coordSessionStr);
            userSchool = (coordSchool.code || coordSchool.name || '').trim();
        } catch (e) { }
    }
    if (!userSchool && typeof registeredSchools !== 'undefined' && registeredSchools.length === 1) {
        userSchool = (registeredSchools[0].code || registeredSchools[0].name || '').trim();
    }
    return getSchoolCode(userSchool) || userSchool;
};

window.isLabAllowedForUser = function (lab) {
    const userSchool = window.getUserSchoolCode();
    if (!userSchool) return true;
    if (lab.schoolId) {
        return isSameSchool(lab.schoolId, userSchool);
    }
    lab.schoolId = userSchool;
    syncWithBackend('labs', registeredLabs);
    return true;
};

window.isItemAllowedForUser = function (item) {
    const userSchool = window.getUserSchoolCode();
    if (!userSchool) return true;

    let itemSchool = item.escolaCode || item.schoolId || '';
    if (!itemSchool && item.lab) {
        const labObj = registeredLabs.find(l => Number(l.id) === Number(item.lab));
        if (labObj && labObj.schoolId) itemSchool = labObj.schoolId;
    }

    if (itemSchool) {
        return isSameSchool(itemSchool, userSchool);
    }

    item.escolaCode = userSchool;
    if (item.lab) {
        const labObj = registeredLabs.find(l => Number(l.id) === Number(item.lab));
        if (labObj && !labObj.schoolId) {
            labObj.schoolId = userSchool;
            syncWithBackend('labs', registeredLabs);
        }
    }
    syncWithBackend('inventory', inventory);
    return true;
};

function syncWithBackend(type, dataArray) {
    window.lastLocalSyncTime = Date.now();
    const storageKey = type === 'plans' ? 'lessonPlans' : (type === 'boletins' ? 'registeredBoletins' : type);
    localStorage.setItem(storageKey, JSON.stringify(dataArray));
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
            if (data.inventory !== null) {
                inventory = data.inventory;
                localStorage.setItem('inventory', JSON.stringify(inventory));
            }
            if (data.plans !== null) { lessonPlans = data.plans; localStorage.setItem('lessonPlans', JSON.stringify(lessonPlans)); }
            if (data.boletins !== null) { registeredBoletins = data.boletins; localStorage.setItem('registeredBoletins', JSON.stringify(registeredBoletins)); }
            if (data.notifications !== null) { notifications = data.notifications; localStorage.setItem('notifications', JSON.stringify(notifications)); }
            if (data.diario !== null) { localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(data.diario)); }
            if (data.schools !== null) { registeredSchools = mergeSchoolsList(registeredSchools, data.schools); localStorage.setItem('schools', JSON.stringify(registeredSchools)); }
            if (data.labs !== null && Array.isArray(data.labs)) {
                registeredLabs = mergeLabsList(registeredLabs, data.labs);
                localStorage.setItem('labs', JSON.stringify(registeredLabs));
                syncWithBackend('labs', registeredLabs);
            } else if (registeredLabs && registeredLabs.length > 0) {
                syncWithBackend('labs', registeredLabs);
            }
            if (data.posts && data.posts.length > 0) {
                orgPosts = data.posts;
                localStorage.setItem('posts', JSON.stringify(orgPosts));
            } else {
                // If backend posts are empty or null, check if we need to initialize
                const localPosts = JSON.parse(localStorage.getItem('posts')) || [];
                if (localPosts.length === 0) {
                    orgPosts = [...defaultOrgInstructions];
                    syncWithBackend('posts', orgPosts);
                } else {
                    orgPosts = localPosts;
                }
            }

            renderLessonPlans();
            renderNotifications();
            updateDashboardStats();
            renderRegisteredBoletins();
            renderSchools();
            renderLabButtons();
            renderOrgPosts();
            populatePlanoLocalDropdown();
            populatePlanoEscolaDropdown();
            renderMeusCursos();
            renderCoordenacaoPainel();
            if (currentLab) renderInventory();
            if (window.populateRegistrationSchools) window.populateRegistrationSchools();
            if (window.populateProfileSchoolDropdown) window.populateProfileSchoolDropdown();
            populateBoletimEscolaDropdown();
            populatePlanoEscolaDropdown();
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
    const coordLoginOverlay = document.getElementById('coord-login-overlay');
    let registeredUser = localStorage.getItem('registeredUser');
    const signupCard = document.getElementById('auth-cadastro-card');
    const loginCard = document.getElementById('auth-login-card');

    const urlParams = new URLSearchParams(window.location.search);
    const isCoordPortal = urlParams.get('portal') === 'coord';

    const coordSession = sessionStorage.getItem('coordSession');

    if (coordSession) {
        // Logged in as Coordenação
        if (regOverlay) regOverlay.style.display = 'none';
        if (coordLoginOverlay) coordLoginOverlay.style.display = 'none';

        const sidebar = document.getElementById('sidebar');
        const header = document.querySelector('header');
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.display = 'none';

        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        const coordSection = document.getElementById('coordenacao');
        if (coordSection) {
            coordSection.classList.add('active');
            document.querySelectorAll('.coordenacao-tab').forEach(t => t.style.display = 'none');
            const painel = document.getElementById('coordenacao-painel');
            if (painel) painel.style.display = 'block';
        }

        const logoutCoordBtn = document.getElementById('btn-logout-coord');
        if (logoutCoordBtn) logoutCoordBtn.style.display = 'block';

        renderCoordenacaoPainel();
    } else if (isCoordPortal) {
        // Mode: Coordination Portal
        if (coordLoginOverlay) coordLoginOverlay.style.display = 'flex';
        if (regOverlay) regOverlay.style.display = 'none';

        // Hide sidebar and header
        const sidebar = document.getElementById('sidebar');
        const header = document.querySelector('header');
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.display = 'none';

    } else if (!registeredUser) {
        // NEW DEVICE or first time: show LOGIN form by default
        // User may already have an account on another device
        if (regOverlay) regOverlay.style.display = 'flex';
        if (loginCard) loginCard.style.display = 'flex';
        if (signupCard) signupCard.style.display = 'none';
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
        }).catch(() => { });
    }

    // Auto-detect Professor role (PROFESSOR / PROFESSORA) based on name
    window.autoDetectProfessorRole = function (nameVal, targetId) {
        if (!nameVal) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        const cleanName = nameVal.trim().toLowerCase().replace(/^(prof\.?|profa\.?|dr\.?|dra\.?|sr\.?|sra\.?)\s+/i, '');
        const firstWord = cleanName.split(/\s+/)[0];
        const femaleNamesNoA = ['carol', 'caroline', 'carolyn', 'beatriz', 'raquel', 'elis', 'simone', 'kelly', 'suely', 'roseli', 'shirley', 'michele', 'cleide', 'neide', 'franciele', 'gabriele', 'cibele', 'ingrid', 'evelyn', 'karen', 'ester', 'carmen', 'miriam', 'liz', 'thais', 'lais', 'ines', 'ruth', 'esther', 'rachel', 'vivian', 'solange', 'helen', 'ellen', 'lilian', 'isabel', 'gabriely'];
        const maleNamesEndA = ['luca', 'mustafa', 'joshua', 'noah', 'duda'];
        let isFemale = false;
        if (femaleNamesNoA.includes(firstWord)) {
            isFemale = true;
        } else if (firstWord.endsWith('a') && !maleNamesEndA.includes(firstWord)) {
            isFemale = true;
        }
        target.value = isFemale ? 'PROFESSORA' : 'PROFESSOR';
    };

    // Global Auth Card Toggle
    window.showAuthCard = function (cardId) {
        document.querySelectorAll('#register-fullscreen-overlay .register-card').forEach(card => {
            card.style.display = 'none';
        });
        document.getElementById(cardId).style.display = 'flex';
        clearLoginErrors();

        if (cardId === 'auth-school-reg-card') {
            const idEl = document.getElementById('school-reg-id');
            if (idEl && !idEl.value) {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                idEl.value = `COORD-${randomNum}`;
            }
        }
        if (cardId === 'auth-cadastro-card') {
            const profIdEl = document.getElementById('first-reg-email');
            if (profIdEl && !profIdEl.value) {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                profIdEl.value = `PROF-${randomNum}`;
            }
        }
    };

    // Simplified authentication toggle button setup
    function setupAuthToggleBtns(profBtnId, coordBtnId, defaultActive = 'prof') {
        const profBtn = document.getElementById(profBtnId);
        const coordBtn = document.getElementById(coordBtnId);
        if (!profBtn || !coordBtn) return;
        const setProfActive = () => {
            profBtn.classList.remove('btn-inactive');
            profBtn.classList.add('btn-active');
            coordBtn.classList.remove('btn-active');
            coordBtn.classList.add('btn-inactive');
        };
        const setCoordActive = () => {
            coordBtn.classList.remove('btn-inactive');
            coordBtn.classList.add('btn-active');
            profBtn.classList.remove('btn-active');
            profBtn.classList.add('btn-inactive');
        };
        
        // Hover effects to improve usability
        profBtn.addEventListener('mouseenter', () => { if (!profBtn.classList.contains('btn-active')) profBtn.style.opacity = '0.8'; });
        profBtn.addEventListener('mouseleave', () => { profBtn.style.opacity = '1'; });
        coordBtn.addEventListener('mouseenter', () => { if (!coordBtn.classList.contains('btn-active')) coordBtn.style.opacity = '0.8'; });
        coordBtn.addEventListener('mouseleave', () => { coordBtn.style.opacity = '1'; });

        // Click handlers
        profBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'flex';
            window.showAuthCard('auth-login-card');
            const coordOverlay = document.getElementById('coord-login-overlay');
            if (coordOverlay) coordOverlay.style.display = 'none';
        });
        coordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'none';
            const coordOverlay = document.getElementById('coord-login-overlay');
            if (coordOverlay) coordOverlay.style.display = 'flex';
            // Hide sidebar and header for coordination portal
            const sidebar = document.getElementById('sidebar');
            const header = document.querySelector('header');
            if (sidebar) sidebar.style.display = 'none';
            if (header) header.style.display = 'none';
        });

        // Initialize state based on parameter
        if (defaultActive === 'coord') {
            setCoordActive();
        } else {
            setProfActive();
        }
    }
    // Initialize toggle buttons for both contexts
    setupAuthToggleBtns('portal-prof-btn', 'portal-coord-btn', 'prof');
    setupAuthToggleBtns('portal-prof-btn-coord', 'portal-coord-btn-coord', 'coord');

    // Quick links: abrir cadastro ou login a partir do link 'Cadastre-se' / 'Fazer Login'
    const goToSignupLink = document.getElementById('go-to-signup-btn');
    if (goToSignupLink) {
        goToSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'flex';
            window.showAuthCard('auth-cadastro-card');
        });
    }

    const goToLoginLink = document.getElementById('go-to-login-btn');
    if (goToLoginLink) {
        goToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'flex';
            window.showAuthCard('auth-login-card');
        });
    }

    // Link direto para abrir o card de registro de escola (overlay)
    const goToSchoolRegLink = document.getElementById('go-to-school-reg-btn');
    if (goToSchoolRegLink) {
        goToSchoolRegLink.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'flex';
            window.showAuthCard('auth-school-reg-card');
        });
    }

    const goToSignupFromSchoolBtn = document.getElementById('go-to-signup-from-school-btn');
    if (goToSignupFromSchoolBtn) {
        goToSignupFromSchoolBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const regOverlay = document.getElementById('register-fullscreen-overlay');
            if (regOverlay) regOverlay.style.display = 'flex';
            window.showAuthCard('auth-cadastro-card');
        });
    }

    // Populate Schools Dropdown in Teacher Registration
    function populateRegistrationSchools() {
        const select = document.getElementById('first-reg-instituicao');
        if (!select) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="" disabled selected>Selecione sua escola</option>';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            const sigla = school.sigla || school.code;
            opt.value = sigla;
            opt.textContent = sigla ? `${sigla} — ${school.name || ''}` : (school.name || school.code);
            select.appendChild(opt);
        });

        if (currentVal) select.value = currentVal;
    }
    window.populateRegistrationSchools = populateRegistrationSchools;
    populateRegistrationSchools();

    function populateProfileSchoolDropdown(selectedVal) {
        const select = document.getElementById('profile-instituicao');
        if (!select) return;
        const currentVal = selectedVal !== undefined ? selectedVal : select.value;
        select.innerHTML = '<option value="" disabled selected>Selecione sua escola</option>';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.sigla || school.code || school.id || school.name;
            const displaySigla = school.sigla || school.code || '';
            opt.textContent = displaySigla ? `${displaySigla} — ${school.name || ''}` : (school.name || school.code);
            select.appendChild(opt);
        });
        if (currentVal) select.value = currentVal;
    }
    window.populateProfileSchoolDropdown = populateProfileSchoolDropdown;
    populateProfileSchoolDropdown();

    // Popula select de cidades com base no estado selecionado no overlay de registro de escola
    function populateCitiesForState(state) {
        const citySelect = document.getElementById('school-reg-cidade');
        if (!citySelect) return;
        const mapping = {
            'SP': ['São Paulo', 'Campinas', 'Santos'],
            'RJ': ['Rio de Janeiro', 'Niterói', 'Petrópolis'],
            'MG': ['Belo Horizonte', 'Uberlândia', 'Ouro Preto'],
            'BA': ['Salvador', 'Feira de Santana'],
            'PR': ['Curitiba', 'Londrina'],
            'PE': ['Recife', 'Olinda'],
            'CE': ['Fortaleza', 'Juazeiro do Norte'],
            'PI': ['Teresina'],
            'DF': ['Brasília']
        };
        const cities = mapping[state] || ['Outra cidade'];
        citySelect.innerHTML = '<option value="" disabled selected>Selecione a cidade</option>';
        cities.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            citySelect.appendChild(opt);
        });
    }

    const stateSelect = document.getElementById('school-reg-estado');
    if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
            populateCitiesForState(e.target.value);
        });
    }

    // Auto-generate school sigla from name + bairro
    function generateSchoolSigla(nome, bairro) {
        if (!nome && !bairro) return '';
        const removeAccents = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const stopWords = ['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM', 'NO', 'NA', 'O', 'A', 'OS', 'AS'];
        
        const cleanName = removeAccents(nome || '').trim().toUpperCase();
        const cleanBairro = removeAccents(bairro || '').trim().toUpperCase();
        
        const nameWords = cleanName.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w));
        let siglaName = '';
        if (nameWords.length > 0) {
            siglaName = nameWords.map(w => w[0]).join('');
        } else if (cleanName.length > 0) {
            siglaName = cleanName.substring(0, 5);
        } else {
            siglaName = 'ESC';
        }

        let siglaBairro = '';
        if (cleanBairro) {
            const bairroCleaned = cleanBairro.split(/\s+/).filter(w => w.length > 0 && !stopWords.includes(w)).join('');
            siglaBairro = bairroCleaned.substring(0, 3);
        }

        let siglaFinal = siglaName + (siglaBairro ? '-' + siglaBairro : '');
        return siglaFinal.replace(/[^A-Z0-9\-]/g, '');
    }
    window.generateSchoolSigla = generateSchoolSigla;

    function updateSiglaField() {
        const nomeEl = document.getElementById('school-reg-nome');
        const bairroEl = document.getElementById('school-reg-bairro');
        const siglaEl = document.getElementById('school-reg-sigla');
        if (!nomeEl || !bairroEl || !siglaEl) return;
        const sigla = generateSchoolSigla(nomeEl.value, bairroEl.value);
        siglaEl.value = sigla;
    }
    const schoolNameInput = document.getElementById('school-reg-nome');
    const schoolBairroInput = document.getElementById('school-reg-bairro');
    if (schoolNameInput) schoolNameInput.addEventListener('input', updateSiglaField);
    if (schoolBairroInput) schoolBairroInput.addEventListener('input', updateSiglaField);

    // Handle Professor Registration Form (Cadastro Professor)
    const firstRegForm = document.getElementById('first-register-form');
    if (firstRegForm) {
        firstRegForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('first-reg-email').value.trim();
            const cargo = document.getElementById('first-reg-cargo').value.trim();
            const instituicao = document.getElementById('first-reg-instituicao').value.trim();
            const senha = document.getElementById('first-reg-senha').value;

            if (!instituicao) {
                showToast('Por favor, selecione a sua escola.', 'error');
                return;
            }

            const senhaError = document.getElementById('first-reg-senha-error');
            if (senhaError) {
                senhaError.style.display = 'none';
                senhaError.innerHTML = '';
            }

            // Password validation
            const hasMinLength = senha.length >= 8;
            const hasUpper = /[A-Z]/.test(senha);
            const hasLower = /[a-z]/.test(senha);
            const hasNumber = /[0-9]/.test(senha);

            let errors = [];
            if (!hasMinLength) errors.push('Mínimo de 8 caracteres');
            if (!hasUpper) errors.push('Pelo menos uma letra maiúscula');
            if (!hasLower) errors.push('Pelo menos uma letra minúscula');
            if (!hasNumber) errors.push('Pelo menos um número');

            if (errors.length > 0) {
                if (senhaError) {
                    senhaError.innerHTML = '<strong>A senha deve conter:</strong><br>' + errors.map(err => '• ' + err).join('<br>');
                    senhaError.style.display = 'block';
                }
                showToast('A senha não cumpre os requisitos.', 'error');
                return;
            }

            const nameVal = document.getElementById('first-reg-nome') ? document.getElementById('first-reg-nome').value.trim() : '';
            const phoneVal = document.getElementById('first-reg-telefone') ? document.getElementById('first-reg-telefone').value.trim() : '';
            const nascimentoVal = document.getElementById('first-reg-nascimento') ? document.getElementById('first-reg-nascimento').value : '';

            const newUser = {
                id: email.toUpperCase(),
                code: email.toUpperCase(),
                name: nameVal || 'Prof(a)',
                email: email.toUpperCase(),
                password: senha,
                phone: phoneVal,
                nascimento: nascimentoVal,
                role: cargo,
                instituicao: instituicao,
                address: '',
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
                        const userToSave = data.user || newUser;
                        localStorage.setItem('registeredUser', JSON.stringify(userToSave));
                        localStorage.setItem('isLoggedIn', 'true');
                        updateUserUI(userToSave);

                        // Update components that depend on logged-in user details
                        renderLabButtons();
                        updateDashboardStats();
                        populatePlanoLocalDropdown();
                        populatePlanoEscolaDropdown();
                        renderMeusCursos();

                        regOverlay.style.transition = 'opacity 0.5s ease-out';
                        regOverlay.style.opacity = '0';
                        setTimeout(() => {
                            regOverlay.style.display = 'none';
                            regOverlay.style.opacity = '1';
                        }, 500);

                        showToast('Cadastro realizado com sucesso!', 'success');
                        switchTab('inicio');

                        setTimeout(() => {
                            if (window.appendEstelaMessage) {
                                const msg = `Olá, ${userToSave.name || 'Professor(a)'}! Boas-vindas ao SENAI VEST. Para começar, por favor, clique no menu lateral, vá em <strong>Meus Cursos</strong> e realize o curso de capacitação.`;
                                window.appendEstelaMessage(msg, false);
                                if (window.speakEstelaText) {
                                    window.speakEstelaText(`Olá, ${userToSave.name || 'Professor'}! Boas-vindas ao SENAI VEST. Para começar, por favor, clique no menu lateral, vá em Meus Cursos e realize o curso de capacitação.`);
                                }
                            }
                        }, 1000);
                    } else {
                        showToast(data.message || data.error || 'Erro no cadastro.', 'error');
                    }
                })
                .catch(err => {
                    showToast('Erro de conexão.', 'error');
                });
        });
    }

    // Handle Login Form
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

            const email = emailInput.value.trim().toUpperCase();
            const senha = senhaInput.value;

            [emailError, senhaError, generalError].forEach(el => { if (el) { el.style.display = 'none'; el.textContent = ''; } });
            emailInput.classList.remove('input-error');
            senhaInput.classList.remove('input-error');

            if (!email || !senha) {
                if (!email) { emailError.textContent = '⚠️ Digite seu ID de Acesso.'; emailError.style.display = 'block'; }
                if (!senha) { senhaError.textContent = '⚠️ Digite sua senha.'; senhaError.style.display = 'block'; }
                return;
            }

            if (btnText) btnText.style.display = 'none';
            if (btnLoading) btnLoading.style.display = 'inline';
            if (submitBtn) submitBtn.disabled = true;

            const resetBtn = () => {
                if (btnText) btnText.style.display = 'inline';
                if (btnLoading) btnLoading.style.display = 'none';
                if (submitBtn) submitBtn.disabled = false;
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
                    if (data.type === 'school') {
                        // School login
                        sessionStorage.setItem('coordSession', JSON.stringify(data.school));
                        showToast('Bem-vindo ao Portal da Coordenação.', 'success');
                        regOverlay.style.display = 'none';
                        const coordLoginOverlay = document.getElementById('coord-login-overlay');
                        if (coordLoginOverlay) coordLoginOverlay.style.display = 'none';

                        // Hide sidebar and header
                        const sidebar = document.getElementById('sidebar');
                        const header = document.querySelector('header');
                        if (sidebar) sidebar.style.display = 'none';
                        if (header) header.style.display = 'none';

                        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
                        const coordSection = document.getElementById('coordenacao');
                        if (coordSection) {
                            coordSection.classList.add('active');
                            document.querySelectorAll('.coordenacao-tab').forEach(t => t.style.display = 'none');
                            const painel = document.getElementById('coordenacao-painel');
                            if (painel) painel.style.display = 'block';
                        }
                        renderCoordenacaoPainel();
                    } else {
                        // Teacher login
                        localStorage.setItem('registeredUser', JSON.stringify(data.user));
                        localStorage.setItem('isLoggedIn', 'true');
                        updateUserUI(data.user);

                        // Update components that depend on logged-in user details
                        renderLabButtons();
                        updateDashboardStats();
                        populatePlanoLocalDropdown();
                        populatePlanoEscolaDropdown();
                        renderMeusCursos();

                        regOverlay.style.transition = 'opacity 0.5s ease-out';
                        regOverlay.style.opacity = '0';
                        setTimeout(() => { regOverlay.style.display = 'none'; regOverlay.style.opacity = '1'; }, 500);
                        showToast('Login realizado com sucesso!', 'success');
                        switchTab('inicio');
                    }
                } else {
                    generalError.textContent = data.message || data.error || 'Erro no login.';
                    generalError.style.display = 'block';
                    showToast(data.message || data.error || 'Erro no login.', 'error');
                }
            } catch (err) {
                resetBtn();
                generalError.textContent = 'Erro de conexão com o servidor.';
                generalError.style.display = 'block';
            }
        });
    }

    // Helper para preencher ID recuperado
    window.usarIdRecuperado = function(idVal) {
        window.showAuthCard('auth-forgot-password-card');
        const inputId = document.getElementById('forgot-id-input');
        if (inputId) inputId.value = idVal;
    };

    // Handle Forgot Password Form
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idVal = document.getElementById('forgot-id-input').value.trim().toUpperCase();
            const senha = document.getElementById('forgot-nova-senha').value;
            const senhaConfirm = document.getElementById('forgot-nova-senha-confirm').value;
            const errorEl = document.getElementById('forgot-general-error');
            const successEl = document.getElementById('forgot-general-success');

            if (errorEl) errorEl.style.display = 'none';
            if (successEl) successEl.style.display = 'none';

            if (!idVal) {
                if (errorEl) { errorEl.textContent = '⚠️ Digite o ID de Acesso da sua conta.'; errorEl.style.display = 'block'; }
                return;
            }

            if (!senha || !senhaConfirm) {
                if (errorEl) { errorEl.textContent = '⚠️ Preencha a nova senha e a confirmação.'; errorEl.style.display = 'block'; }
                return;
            }

            if (senha !== senhaConfirm) {
                if (errorEl) { errorEl.textContent = '⚠️ As senhas não coincidem. Verifique a digitação.'; errorEl.style.display = 'block'; }
                return;
            }

            let success = false;

            // Tentativa via servidor
            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idVal, newPassword: senha })
                });
                if (response.ok) {
                    success = true;
                } else {
                    const data = await response.json();
                    if (response.status === 404) {
                        if (errorEl) {
                            errorEl.textContent = '❌ ID incorreto ou não existe no sistema. Verifique a digitação ou clique em "Esqueci meu ID".';
                            errorEl.style.display = 'block';
                        }
                        showToast('ID incorreto ou não existe no sistema.', 'error');
                        return;
                    }
                }
            } catch (err) { }

            // Verificação / Fallback local (localStorage)
            const registeredUserStr = localStorage.getItem('registeredUser');
            if (registeredUserStr) {
                try {
                    const u = JSON.parse(registeredUserStr);
                    const localId = String(u.id || u.email || u.code || '').trim().toUpperCase();
                    if (localId === idVal) {
                        u.password = senha;
                        localStorage.setItem('registeredUser', JSON.stringify(u));
                        success = true;
                    }
                } catch(e) {}
            }

            // Verifica também em escolas registradas se for coordenação
            let coordFound = false;
            registeredSchools.forEach(s => {
                const sId = String(s.coordId || s.code || s.id || '').trim().toUpperCase();
                if (sId === idVal) {
                    s.password = senha;
                    coordFound = true;
                    success = true;
                }
            });
            if (coordFound) {
                localStorage.setItem('schools', JSON.stringify(registeredSchools));
            }

            if (success) {
                if (successEl) {
                    successEl.textContent = '✅ Senha alterada com sucesso! Faça login com sua nova senha.';
                    successEl.style.display = 'block';
                }
                showToast('Senha redefinida com sucesso!', 'success');
                setTimeout(() => {
                    window.showAuthCard('auth-login-card');
                    const loginEmailEl = document.getElementById('login-email');
                    if (loginEmailEl) loginEmailEl.value = idVal;
                    const loginSenhaEl = document.getElementById('login-senha');
                    if (loginSenhaEl) loginSenhaEl.value = '';
                }, 2000);
            } else {
                if (errorEl) {
                    errorEl.textContent = '❌ ID incorreto ou não existe no sistema. Verifique a digitação ou clique em "Esqueci meu ID".';
                    errorEl.style.display = 'block';
                }
                showToast('ID incorreto ou não existe no sistema.', 'error');
            }
        });
    }

    // Handle Forgot ID Form
    const forgotIdForm = document.getElementById('forgot-id-form');
    if (forgotIdForm) {
        forgotIdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('recuperar-id-input').value.trim().toLowerCase();
            const errorEl = document.getElementById('recuperar-id-error');
            const resultEl = document.getElementById('recuperar-id-result');

            if (errorEl) errorEl.style.display = 'none';
            if (resultEl) resultEl.style.display = 'none';

            if (!query) {
                if (errorEl) { errorEl.textContent = '⚠️ Digite seu nome cadastrado.'; errorEl.style.display = 'block'; }
                return;
            }

            let foundAccounts = [];

            // Busca no servidor
            try {
                const response = await fetch('/api/recover-id', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.users && Array.isArray(data.users)) {
                        foundAccounts = foundAccounts.concat(data.users);
                    }
                }
            } catch (err) { }

            // Busca local no localStorage
            const registeredUserStr = localStorage.getItem('registeredUser');
            if (registeredUserStr) {
                try {
                    const u = JSON.parse(registeredUserStr);
                    const nameMatch = String(u.name || '').toLowerCase().includes(query);
                    const emailMatch = String(u.email || u.id || u.code || '').toLowerCase().includes(query);
                    if (nameMatch || emailMatch) {
                        if (!foundAccounts.some(acc => String(acc.id || acc.email).toUpperCase() === String(u.id || u.email).toUpperCase())) {
                            foundAccounts.push(u);
                        }
                    }
                } catch(e) {}
            }

            // Busca nas escolas / coordenações
            registeredSchools.forEach(s => {
                const nameMatch = String(s.name || '').toLowerCase().includes(query);
                const idMatch = String(s.coordId || s.code || s.id || '').toLowerCase().includes(query);
                if (nameMatch || idMatch) {
                    const sId = s.coordId || s.code || s.id;
                    if (!foundAccounts.some(acc => String(acc.id || acc.email || acc.coordId).toUpperCase() === String(sId).toUpperCase())) {
                        foundAccounts.push({ id: sId, name: `Coordenação: ${s.name}` });
                    }
                }
            });

            if (foundAccounts.length > 0) {
                let html = '<div style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 10px;">🎉 Conta(s) localizada(s):</div>';
                foundAccounts.forEach(acc => {
                    const accId = acc.id || acc.email || acc.code || acc.coordId;
                    html += `
                        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1);">
                            <div style="font-size: 0.85rem; color: var(--primary-beige);">${acc.name || 'Usuário'}</div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: #60a5fa; letter-spacing: 1px; margin: 4px 0;">${accId}</div>
                            <button type="button" onclick="usarIdRecuperado('${accId}')" style="background: #3b82f6; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 0.8rem; margin-top: 6px;">Usar este ID ➡</button>
                        </div>
                    `;
                });
                if (resultEl) {
                    resultEl.innerHTML = html;
                    resultEl.style.display = 'block';
                }
            } else {
                if (errorEl) {
                    errorEl.textContent = '❌ Nenhuma conta localizada com este nome.';
                    errorEl.style.display = 'block';
                }
            }
        });
    }


    // Handle Auth School Registration Form
    const authSchoolForm = document.getElementById('auth-school-register-form');
    if (authSchoolForm) {
        authSchoolForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('school-reg-nome').value.trim();
            const coordId = document.getElementById('school-reg-id').value.trim() || ('COORD-' + Math.floor(1000 + Math.random() * 9000));
            const estado = document.getElementById('school-reg-estado').value.trim();
            const cidade = document.getElementById('school-reg-cidade').value.trim();
            const bairro = document.getElementById('school-reg-bairro').value.trim();
            const sigla = document.getElementById('school-reg-sigla').value.trim() || generateSchoolSigla(nome, bairro);

            if (!sigla) {
                showToast('Preencha o nome e o bairro para gerar a sigla da escola.', 'error');
                return;
            }

            const newSchool = {
                id: coordId,
                code: sigla,
                name: nome,
                sigla: sigla,
                coordId: coordId,
                estado: estado,
                city: cidade,
                bairro: bairro
            };

            let successSchool = null;
            try {
                const response = await fetch('/api/register-school', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSchool)
                });
                const data = await response.json();
                if (response.ok) {
                    successSchool = data.school || newSchool;
                } else {
                    showToast(data.message || 'Erro ao registrar escola.', 'error');
                    return;
                }
            } catch (err) {
                // Modo offline ou local
                successSchool = newSchool;
            }

            if (successSchool) {
                showToast(`Escola cadastrada! Guarde o seu ID: ${successSchool.coordId || successSchool.code}`, 'success');
                alert(`ESCOLA CADASTRADA COM SUCESSO!\n\nID DE ACESSO DA COORDENAÇÃO:\n👉 ${successSchool.coordId || successSchool.code} 👈\n\nAnote este ID! Ele será solicitado para acessar o Portal da Coordenação.`);
                sessionStorage.setItem('coordSession', JSON.stringify(successSchool));

                const exists = registeredSchools.some(s => isSameSchool(s.code || s.coordId, successSchool.code || successSchool.coordId));
                if (!exists) {
                    registeredSchools.push(successSchool);
                    localStorage.setItem('schools', JSON.stringify(registeredSchools));
                    if (typeof syncWithBackend === 'function') syncWithBackend('schools', registeredSchools);
                    if (window.populateRegistrationSchools) window.populateRegistrationSchools();
                    if (window.populatePlanoEscolaDropdown) window.populatePlanoEscolaDropdown();
                    if (typeof renderSchools === 'function') renderSchools();
                }

                const regOverlay = document.getElementById('register-fullscreen-overlay');
                if (regOverlay) regOverlay.style.display = 'none';
                const coordLoginOverlay = document.getElementById('coord-login-overlay');
                if (coordLoginOverlay) coordLoginOverlay.style.display = 'none';

                const sidebar = document.getElementById('sidebar');
                const header = document.querySelector('header');
                if (sidebar) sidebar.style.display = 'none';
                if (header) header.style.display = 'none';

                document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
                const coordSection = document.getElementById('coordenacao');
                if (coordSection) {
                    coordSection.classList.add('active');
                    document.querySelectorAll('.coordenacao-tab').forEach(t => t.style.display = 'none');
                    const painel = document.getElementById('coordenacao-painel');
                    if (painel) painel.style.display = 'block';
                }
                renderCoordenacaoPainel();
            }
        });
    }

    // Coordination Login Logic
    const coordLoginForm = document.getElementById('coord-login-form');
    if (coordLoginForm) {
        coordLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const coordIdInput = document.getElementById('coord-id-input').value.trim().toUpperCase();
            const submitBtn = coordLoginForm.querySelector('button[type="submit"]');

            submitBtn.textContent = 'Autenticando...';
            submitBtn.disabled = true;

            let authSchool = null;
            try {
                const response = await fetch('/api/login-coord', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ coordId: coordIdInput })
                });
                const data = await response.json();
                if (response.ok) {
                    authSchool = data.school;
                }
            } catch (err) { }

            if (!authSchool) {
                // Busca localmente por ID, Código ou Nome
                authSchool = registeredSchools.find(s => {
                    return isSameSchool(s.coordId || s.code || s.id || '', coordIdInput);
                });
            }

            if (authSchool) {
                showToast('Login autorizado! Bem-vindo à Coordenação.', 'success');
                sessionStorage.setItem('coordSession', JSON.stringify(authSchool));

                const coordLoginOverlay = document.getElementById('coord-login-overlay');
                if (coordLoginOverlay) {
                    coordLoginOverlay.style.transition = 'opacity 0.5s ease-out';
                    coordLoginOverlay.style.opacity = '0';
                    setTimeout(() => {
                        coordLoginOverlay.style.display = 'none';
                    }, 500);
                }

                document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
                const coordSection = document.getElementById('coordenacao');
                if (coordSection) {
                    coordSection.classList.add('active');
                    document.querySelectorAll('.coordenacao-tab').forEach(t => t.style.display = 'none');
                    const painel = document.getElementById('coordenacao-painel');
                    if (painel) painel.style.display = 'block';
                }
                renderCoordenacaoPainel();
                const errorDiv = document.getElementById('coord-id-error');
                if (errorDiv) errorDiv.style.display = 'none';
            } else {
                showToast('ID da Coordenação não encontrado no sistema.', 'error');
                const errorDiv = document.getElementById('coord-id-error');
                if (errorDiv) {
                    errorDiv.textContent = 'ID inválido ou escola não cadastrada.';
                    errorDiv.style.display = 'block';
                }
            }
            submitBtn.textContent = 'Entrar no Portal';
            submitBtn.disabled = false;
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
            sessionStorage.removeItem('coordSession');

            // Show LOGIN card (user may want to sign in again or use another account)
            loginCard.style.display = 'flex';
            signupCard.style.display = 'none';
            regOverlay.style.display = 'flex';

            // Reset login form errors
            ['login-email-error', 'login-senha-error', 'login-general-error'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.style.display = 'none'; el.textContent = ''; }
            });

            showToast('Você saiu do sistema.', 'info');
        });
    }

    // Handle Logout Coordination Action
    const logoutCoordBtn = document.getElementById('btn-logout-coord');
    if (logoutCoordBtn) {
        logoutCoordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!confirm('Deseja sair do painel da coordenação?')) return;

            sessionStorage.removeItem('coordSession');

            // Restore sidebar and header if they were hidden
            const sidebar = document.getElementById('sidebar');
            const header = document.querySelector('header');
            if (sidebar) sidebar.style.display = '';
            if (header) header.style.display = '';

            // Hide logout button
            logoutCoordBtn.style.display = 'none';

            // Show LOGIN card
            loginCard.style.display = 'flex';
            signupCard.style.display = 'none';
            regOverlay.style.display = 'flex';

            showToast('Você saiu do painel da coordenação.', 'info');
        });
    }

    // Link do Rodapé: Exibir modal de cadastro de escola
    window.showSchoolRegistration = function () {
        if (regOverlay) regOverlay.style.display = 'flex';
        window.showAuthCard('auth-school-reg-card');
    };

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
                const schoolInputVal = document.getElementById('profile-instituicao').value.trim();
                user.instituicao = getSchoolCode(schoolInputVal);
                user.role = document.getElementById('profile-role').value.trim();
                user.responsibleClass = document.getElementById('profile-class').value.trim();

                // (Gemini Key integration removed)

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

    // Funções e lógica para o Modal de Editar Foto de Perfil
    function abrirModalEditarFoto() {
        const modal = document.getElementById('modal-editar-foto');
        if (modal) modal.classList.add('active');
        const btnReset = document.getElementById('btn-reset-avatar-modal');
        const registeredUser = localStorage.getItem('registeredUser');
        if (btnReset && registeredUser) {
            const u = JSON.parse(registeredUser);
            btnReset.style.display = (u.avatarType === 'uploaded' && u.avatarData) ? 'inline-block' : 'none';
        }
    }
    window.abrirModalEditarFoto = abrirModalEditarFoto;

    function fecharModalEditarFoto() {
        fecharWebcam();
        closeModal('modal-editar-foto');
    }
    window.fecharModalEditarFoto = fecharModalEditarFoto;

    function validarEProcessarFoto(input) {
        const file = input.files[0];
        if (!file) return;

        // Limite de 15MB
        if (file.size > 15 * 1024 * 1024) {
            showToast('Arquivo muito grande! O limite máximo permitido é de 15MB.', 'error');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            salvarFotoPerfil(event.target.result);
        };
        reader.readAsDataURL(file);
    }
    window.validarEProcessarFoto = validarEProcessarFoto;

    function salvarFotoPerfil(base64Data) {
        const registeredUser = localStorage.getItem('registeredUser');
        if (registeredUser) {
            const user = JSON.parse(registeredUser);
            user.avatarType = 'uploaded';
            user.avatarData = base64Data;
            localStorage.setItem('registeredUser', JSON.stringify(user));

            updateUserUI(user);
            fecharModalEditarFoto();
            showToast('✅ Foto de perfil atualizada com sucesso!', 'success');

            fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            }).catch(() => { });
        }
    }
    window.salvarFotoPerfil = salvarFotoPerfil;

    function iniciarCapturaFoto() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            document.getElementById('avatar-cam-input').click();
            return;
        }
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    const box = document.getElementById('webcam-live-box');
                    const video = document.getElementById('webcam-video');
                    if (box && video) {
                        box.style.display = 'block';
                        video.srcObject = stream;
                        window.currentWebcamStream = stream;
                    }
                })
                .catch(err => {
                    console.log("Webcam falhou ou não permitida no PC, fallback input câmera:", err);
                    document.getElementById('avatar-cam-input').click();
                });
        } else {
            document.getElementById('avatar-cam-input').click();
        }
    }
    window.iniciarCapturaFoto = iniciarCapturaFoto;

    function baterFotoWebcam() {
        const video = document.getElementById('webcam-video');
        const canvas = document.getElementById('webcam-canvas');
        if (video && canvas) {
            canvas.width = video.videoWidth || 400;
            canvas.height = video.videoHeight || 400;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            fecharWebcam();
            salvarFotoPerfil(dataUrl);
        }
    }
    window.baterFotoWebcam = baterFotoWebcam;

    function fecharWebcam() {
        if (window.currentWebcamStream) {
            window.currentWebcamStream.getTracks().forEach(track => track.stop());
            window.currentWebcamStream = null;
        }
        const box = document.getElementById('webcam-live-box');
        if (box) box.style.display = 'none';
    }
    window.fecharWebcam = fecharWebcam;

    function removerFotoPerfil() {
        const registeredUser = localStorage.getItem('registeredUser');
        if (registeredUser) {
            const user = JSON.parse(registeredUser);
            user.avatarType = 'default';
            user.avatarData = '';
            localStorage.setItem('registeredUser', JSON.stringify(user));

            updateUserUI(user);
            fecharModalEditarFoto();
            showToast('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Foto removida com sucesso. Silhueta restaurada.', 'success');

            fetch('/api/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            }).catch(() => { });
        }
    }
    window.removerFotoPerfil = removerFotoPerfil;

    // Reset avatar button legacy event fallback
    const btnResetAvatar = document.getElementById('btn-reset-avatar');
    if (btnResetAvatar) {
        btnResetAvatar.addEventListener('click', removerFotoPerfil);
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

    // Forms vinculados via onsubmit no HTML para evitar disparos duplicados

    const schoolForm = document.getElementById('school-register-form');
    if (schoolForm) schoolForm.addEventListener('submit', handleSchoolRegistrationSubmit);

    const almoxForm = document.getElementById('form-add-almoxarifado');
    if (almoxForm) almoxForm.addEventListener('submit', handleAddAlmoxarifadoSubmit);

    // (org-post-form listener removed)

    // Initial Date inputs default to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('boletim-data').value = today;
    document.getElementById('plano-data-input').value = today;

    // Initialize organization filters
    setupOrgFilters();

    // Wire school applied change listener to update local/almoxarifado dropdown
    const planoEscolaInput = document.getElementById('plano-escola-input');
    if (planoEscolaInput) {
        planoEscolaInput.addEventListener('change', (e) => {
            populatePlanoLocalDropdown(e.target.value);
        });
    }

    // Initialize Estela Chatbot
    initEstelaChatbot();
});

// SPA Tab Switching Logic
function switchTab(tabId) {
    const coordSession = sessionStorage.getItem('coordSession');
    if (coordSession && tabId !== 'coordenacao' && tabId !== 'aba-geral') {
        tabId = 'coordenacao';
    }

    if (tabId === 'coordenacao') {
        if (!coordSession) {
            // Se não estiver logado como coordenação, abre a tela de login da coordenação
            const coordLoginOverlay = document.getElementById('coord-login-overlay');
            if (coordLoginOverlay) coordLoginOverlay.style.display = 'flex';

            // Fecha a sidebar se estiver no mobile
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');

            return; // Impede a abertura da aba
        }
    }

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
        'agenda': 'Agenda de Eventos',
        'guia-organizacao': 'Guia de Organização 5S',
        'notificacao': 'Notificações do Sistema',
        'plano-aula': 'Planos de Aula',
        'coordenacao': 'Painel de Coordenação',
        'chamada': 'Diário de Classe - Chamada e Notas',
        'meus-cursos': 'Meus Cursos',
        'acompanhamento-real': 'Acompanhamento em Tempo Real'
    };
    headerTitle.textContent = pageTitles[tabId] || 'SENAIVEST';
    currentTab = tabId;

    if (tabId === 'chamada' && window.initDiarioClasse) {
        window.initDiarioClasse('prof');
    }
    if (tabId === 'coordenacao' && window.initDiarioClasse) {
        window.initDiarioClasse('coord');
    }

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

    if (tabId === 'boletim') {
        autoFillBoletimFormFields();
    } else if (tabId === 'plano-aula' || tabId === 'aba-geral') {
        populatePlanoEscolaDropdown();
        renderLessonPlans();
        if (tabId === 'aba-geral' && window.renderCharts) window.renderCharts();
    } else if (tabId === 'ocorrencias') {
        renderRegisteredBoletins();
    } else if (tabId === 'almoxarifado' && currentLab) {
        renderInventory();
    } else if (tabId === 'acompanhamento-real') {
        if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
    }
}

// ALMOXARIFADO NAVIGATION LOGIC
function openLab(labId) {
    currentLab = labId;

    // Hide Lab selection layout, show Grid Inventory layout
    document.getElementById('almox-selector-view').style.display = 'none';
    const inventoryView = document.getElementById('almox-inventory-view');
    inventoryView.style.display = 'block';

    // Find the lab's registered name
    const lab = registeredLabs.find(l => Number(l.id) === Number(labId));
    const labName = lab ? lab.name.toUpperCase() : `ALMOXARIFADO LAB ${labId}`;

    // Update Lab Title header
    document.getElementById('inventory-lab-title').textContent = labName;

    // Render the grid items
    renderInventory();
}

function backToAlmoxSelector() {
    currentLab = null;
    document.getElementById('almox-inventory-view').style.display = 'none';
    document.getElementById('almox-selector-view').style.display = 'flex';
}

// HELPER PARA CATEGORIAS DO ALMOXARIFADO
function isUserAllowedInCurrentLab() {
    const userSchool = window.getUserSchoolCode();
    if (!userSchool) return true;
    if (!currentLab) return true;
    const labObj = registeredLabs.find(l => Number(l.id) === Number(currentLab));
    if (!labObj) return true;
    if (!labObj.schoolId) return true;
    return isSameSchool(labObj.schoolId, userSchool);
}
window.isUserAllowedInCurrentLab = isUserAllowedInCurrentLab;

function getAlmoxCategories() {
    const custom = JSON.parse(localStorage.getItem('customAlmoxCategories') || '[]');
    const deleted = JSON.parse(localStorage.getItem('deletedAlmoxCategories') || '[]');
    const base = ['ferramentas', 'tecidos', 'moldes'];
    const all = Array.from(new Set([...base, ...custom]));
    return all.filter(c => !deleted.includes(c));
}
window.getAlmoxCategories = getAlmoxCategories;

function excluirCategoriaAlmox(cat) {
    if (!isUserAllowedInCurrentLab()) {
        showToast('Apenas usuários vinculados à escola deste almoxarifado podem excluir categorias.', 'error');
        return;
    }
    if (!confirm(`Deseja realmente excluir a categoria "${cat.toUpperCase()}"?`)) return;
    const deleted = JSON.parse(localStorage.getItem('deletedAlmoxCategories') || '[]');
    if (!deleted.includes(cat)) {
        deleted.push(cat);
        localStorage.setItem('deletedAlmoxCategories', JSON.stringify(deleted));
    }
    showToast(`Categoria "${cat.toUpperCase()}" excluída.`, 'success');
    if (currentLab) renderInventory();
}
window.excluirCategoriaAlmox = excluirCategoriaAlmox;

// RENDER INVENTORY ITEMS
function renderInventory() {
    if (!currentLab) return;

    const allowedInLab = isUserAllowedInCurrentLab();
    const btnRegCat = document.getElementById('btn-registrar-cat-almox');
    if (btnRegCat) {
        btnRegCat.style.display = allowedInLab ? 'inline-flex' : 'none';
    }

    const categories = getAlmoxCategories();
    const bodyContainer = document.querySelector('.almox-inventory-body');
    if (bodyContainer) bodyContainer.innerHTML = '';

    categories.forEach(cat => {
        if (!bodyContainer) return;
        const headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-color); margin-top:30px; margin-bottom:15px; padding-bottom:5px;';
        
        const h2 = document.createElement('h2');
        h2.className = 'category-section-title';
        h2.style.cssText = 'margin:0; border:none; padding:0;';
        h2.textContent = cat.toUpperCase();
        headerDiv.appendChild(h2);

        if (allowedInLab) {
            const btnDelCat = document.createElement('button');
            btnDelCat.type = 'button';
            btnDelCat.onclick = () => excluirCategoriaAlmox(cat);
            btnDelCat.style.cssText = 'background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid #ef4444; padding:4px 10px; border-radius:6px; font-size:0.8rem; font-weight:700; cursor:pointer; transition:all 0.2s;';
            btnDelCat.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Excluir Categoria';
            headerDiv.appendChild(btnDelCat);
        }

        const gridElement = document.createElement('div');
        gridElement.className = 'items-grid';
        gridElement.id = `grid-${cat}`;

        bodyContainer.appendChild(headerDiv);
        bodyContainer.appendChild(gridElement);

        // Filter inventory for this lab & category
        const items = inventory.filter(item => item.lab === currentLab && item.category === cat && window.isItemAllowedForUser(item));

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

            if (allowedInLab) {
                // Transfer button (always shown)
                actionButtons += `<button class="btn-card-transfer" onclick="openTransferModal(${item.id})">Transferir</button>`;

                // Return button: shown when item is in a different lab than its origin OR has inconformidade or is Não Pertencente
                if ((item.originLab && item.lab !== item.originLab) || item.status === 'Não Pertencente' || item.inconformidade) {
                    actionButtons += `<button class="btn-card-transfer" onclick="returnItemToOrigin(${item.id})" style="background: var(--accent-green) !important; margin-left: 5px; box-shadow: 0 0 5px rgba(46, 204, 113, 0.4);">Devolver</button>`;
                }

                // Delete button: only for items that originate from this lab (Pertencente)
                if (item.originLab === currentLab || (!item.originLab && item.lab === currentLab)) {
                    actionButtons += `<button class="btn-card-transfer" onclick="deleteInventoryItem(${item.id})" style="background: linear-gradient(135deg, #c0392b, #922b21) !important; margin-left: 5px;" title="Excluir produto"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Excluir</button>`;
                }
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
                    <div class="item-meta" style="color: var(--accent-green); font-weight: 600;">📍 Almoxarifado: ${getLabDisplayName(item.lab)}</div>
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

        if (allowedInLab) {
            // Add special dashed button to ALL columns to register new item
            const addCard = document.createElement('div');
            addCard.className = 'btn-add-product-card';
            addCard.onclick = () => openNewProductModal(currentLab);
            addCard.innerHTML = `
                <div class="add-circle-icon">+</div>
                <span>Adicionar Novo Produto</span>
            `;
            gridElement.appendChild(addCard);
        }
    });
    if (window.renderRecursosSurvey) window.renderRecursosSurvey();
}

// DELETE INVENTORY ITEM
function deleteInventoryItem(itemId) {
    if (!isUserAllowedInCurrentLab()) {
        showToast('Apenas usuários vinculados à escola deste almoxarifado podem excluir produtos.', 'error');
        return;
    }
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
    if (!isUserAllowedInCurrentLab()) {
        showToast('Apenas usuários vinculados à escola deste almoxarifado podem cadastrar produtos.', 'error');
        return;
    }
    document.getElementById('add-product-lab-id').value = labId;
    const displayName = getLabDisplayName(labId);
    document.getElementById('modal-add-product-title').textContent = `Cadastrar Novo Item`;
    const infoEl = document.getElementById('modal-add-product-lab-info');
    if (infoEl) infoEl.textContent = displayName;

    // Clear previous inputs
    document.getElementById('prod-nome').value = '';
    document.getElementById('prod-quantidade').value = '';
    document.getElementById('prod-localizacao').value = '';
    // Populate dynamic categories
    const catSelect = document.getElementById('prod-categoria');
    if (catSelect) {
        catSelect.innerHTML = '';
        getAlmoxCategories().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
            catSelect.appendChild(opt);
        });
    }
    if (catSelect) catSelect.value = 'ferramentas';
    document.getElementById('prod-status').value = 'Pertencente';

    document.getElementById('modal-add-product').classList.add('active');
}

let tempPlanoMaterials = [];

function calcularDuracaoPlano() {
    const inicioEl = document.getElementById('plano-horario-inicio');
    const fimEl = document.getElementById('plano-horario-fim');
    const duracaoEl = document.getElementById('plano-duracao-input');
    if (!inicioEl || !fimEl || !duracaoEl) return;

    const [hIn, mIn] = (inicioEl.value || '19:00').split(':').map(Number);
    const [hFim, mFim] = (fimEl.value || '22:00').split(':').map(Number);

    let minIn = hIn * 60 + mIn;
    let minFim = hFim * 60 + mFim;

    if (minFim < minIn) {
        minFim += 24 * 60; // Passou da meia-noite
    }

    let diffHoras = (minFim - minIn) / 60;
    if (diffHoras <= 0) diffHoras = 1;
    duracaoEl.value = Number.isInteger(diffHoras) ? diffHoras : diffHoras.toFixed(1);
}
window.calcularDuracaoPlano = calcularDuracaoPlano;

setTimeout(() => {
    const hInicioInput = document.getElementById('plano-horario-inicio');
    const hFimInput = document.getElementById('plano-horario-fim');
    if (hInicioInput) hInicioInput.addEventListener('input', calcularDuracaoPlano);
    if (hFimInput) hFimInput.addEventListener('input', calcularDuracaoPlano);
}, 500);

function openNewPlanoModal() {
    document.getElementById('plano-curso-input').value = '';
    document.getElementById('plano-tema-input').value = '';
    document.getElementById('plano-objetivos-input').value = '';

    // Auto generate plano code
    setupNextPlanoCode();
    calcularDuracaoPlano();

    // Reset temporary list
    tempPlanoMaterials = [];
    populatePlanoMaterialSelect();
    renderTempMaterials();

    document.getElementById('modal-add-plano').classList.add('active');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.remove('active');
        el.style.display = ''; // Reset display to allow CSS to manage visibility via .active class
    }
}

// OPEN TRANSFER MODAL
function openTransferModal(itemId) {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('trans-product-id').value = item.id;
    document.getElementById('trans-product-nome').value = `${item.quantity} ${item.name}`;
    document.getElementById('trans-quantidade').value = item.quantity;

    // Autofill logged user for transfer
    const loggedUser = JSON.parse(localStorage.getItem('registeredUser') || '{}');
    document.getElementById('trans-professor').value = loggedUser.name || 'Professor';

    // Setup destination dropdown to exclude current lab
    const selectDest = document.getElementById('trans-destino');
    selectDest.innerHTML = '';

    registeredLabs.forEach(lab => {
        if (lab.id !== item.lab && window.isLabAllowedForUser(lab)) {
            const opt = document.createElement('option');
            opt.value = lab.id;
            opt.textContent = getLabDisplayName(lab.id);
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

    const origQtdNum = parseFloat(item.quantity) || parseInt(item.quantity) || 1;
    const transQtdNum = parseFloat(quantityText) || parseInt(quantityText) || origQtdNum;

    // Save origin if first transfer
    if (!item.originLab) item.originLab = item.lab;

    if (transQtdNum < origQtdNum && transQtdNum > 0) {
        // Transferência parcial: subtrai a quantidade transferida do item original
        item.quantity = String(origQtdNum - transQtdNum);

        const newItemId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
        const transferredItem = {
            ...item,
            id: newItemId,
            quantity: String(transQtdNum),
            lab: destLab,
            originLab: item.originLab,
            status: 'Não Pertencente',
            meta: `Horário: ${nowTime} | Transferido do Lab ${sourceLab} (Parcial) | Responsável: ${professor}`,
            transferInfo: { professor, time: nowTime, fromLab: sourceLab, toLab: destLab, partial: true }
        };
        inventory.push(transferredItem);
    } else {
        // Transferência total
        item.lab = destLab;
        item.quantity = String(transQtdNum);
        item.status = 'Não Pertencente';
        item.meta = `Horário: ${nowTime} | Transferido do Lab ${sourceLab} | Responsável: ${professor}`;
        item.transferInfo = { professor, time: nowTime, fromLab: sourceLab, toLab: destLab };
    }

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

    const registeredUserStr = localStorage.getItem('registeredUser');
    let responsavel = 'Docente';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            responsavel = user.name || 'Docente';
        } catch (e) { }
    }

    // ★ STATUS AUTOMÁTICO: Todo produto cadastrado em seu almoxarifado é automaticamente "Pertencente"
    const status = 'Pertencente';

    // Determine category emoji and gradients
    let emoji = '📦';
    let bgGradient = 'linear-gradient(135deg, #74ebd5, #9face6)';
    const n = name.toLowerCase();

    if (category === 'tecidos') {
        emoji = '👕';
        bgGradient = 'linear-gradient(135deg, #2575fc, #6a11cb)';
    } else if (category === 'moldes') {
        emoji = '📜';
        bgGradient = 'linear-gradient(135deg, #f39c12, #f1c40f)';
    } else if (category === 'ferramentas') {
        if (n.includes('tesoura')) emoji = '✂️';
        else if (n.includes('agulha') || n.includes('alfinete')) emoji = '🪡';
        else if (n.includes('fita') || n.includes('regua') || n.includes('régua') || n.includes('esquadro') || n.includes('metro')) emoji = '📏';
        else if (n.includes('maquina') || n.includes('máquina')) emoji = '🪡';
        else if (n.includes('linha') || n.includes('fio') || n.includes('retros') || n.includes('retrós')) emoji = '🧶';
        else if (n.includes('ferro') || n.includes('passar')) emoji = '💨';
        else if (n.includes('caneta') || n.includes('giz') || n.includes('lápis') || n.includes('lapis')) emoji = '✏️';
        else if (n.includes('tecido')) emoji = '👗';
        else if (n.includes('bobina')) emoji = '⚙️';
        else if (n.includes('abridor')) emoji = '🗡️';
        else if (n.includes('alicate')) emoji = '🔧';
        else emoji = '🛠️';
    }

    const labDisp = getLabDisplayName(labId);
    const userSchool = window.getUserSchoolCode();
    const labObj = registeredLabs.find(l => Number(l.id) === Number(labId));
    const itemSchool = labObj ? labObj.schoolId : userSchool;
    const newId = inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1;
    const newItem = {
        id: newId,
        lab: labId,
        originLab: labId, // ★ Almoxarifado de origem = local de cadastro
        escolaCode: itemSchool || userSchool,
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
    addActivityLog(`${responsavel} adicionou ${quantity} ${name} em ${labDisp}`);

    // Trigger notification
    addNotification('info', `Novo item adicionado`, `${quantity} ${name} cadastrado em ${labDisp}.`);

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
    const cursoSel = document.getElementById('boletim-curso');
    const curso = cursoSel.options[cursoSel.selectedIndex] ? cursoSel.options[cursoSel.selectedIndex].text : '';
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
        status: 'Enviado',
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
    showToast('Relatório enviado com sucesso!', 'success');

    // Render the updated list
    renderRegisteredBoletins();
    renderCoordenacaoPainel();

    // Reset form fields
    document.getElementById('boletim-form').reset();
    document.getElementById('boletim-data').value = new Date().toISOString().split('T')[0];

    // Auto generate next code
    setupNextBoletimCode();
    autoFillBoletimFormFields();

    updateDashboardStats();

    // Tentar enviar por e-mail (sem gerar PDF automático)
    const boletimId = newBoletim.id;
    setTimeout(() => {
        sendBoletimByEmail(newBoletim);
    }, 500);

    // Trigger Estela Virtual Assistant chat messages
    setTimeout(() => {

        const schoolObj = registeredSchools.find(s => s.code === escolaCode);
        const schoolName = schoolObj ? schoolObj.name : 'escola selecionada';
        const coordinatorEmail = schoolObj ? schoolObj.coordinatorEmail : 'e-mail cadastrado';

        if (window.appendEstelaMessage) {
            window.appendEstelaMessage("Seu boletim foi registrado com sucesso. O documento foi encaminhado para análise da coordenação responsável. Você será notificado sobre futuras atualizações.", false);
            if (window.speakEstelaText) {
                window.speakEstelaText("Seu boletim foi registrado com sucesso. O documento foi encaminhado para análise da coordenação responsável.");
            }

            setTimeout(() => {
                const followUpMsg = `O boletim está sendo encaminhado automaticamente para o <strong>Portal da Coordenação</strong>, em breve entraremos em contato.`;
                window.appendEstelaMessage(followUpMsg, false);
                if (window.speakEstelaText) {
                    window.speakEstelaText(`O boletim está sendo encaminhado automaticamente para o Portal da Coordenação, em breve entraremos em contato.`);
                }
            }, 3000);
        }
    }, 1200);

    // Emitir notificação e ir direto para a aba de ocorrências
    setTimeout(() => {
        voltarCategoriaBoletim();
        switchTab('ocorrencias');
        switchOcorrenciasTab('minhas');
    }, 100);
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
    const turnoEl = document.getElementById('plano-turno-input');
    const turno = turnoEl ? turnoEl.value : 'Manhã';

    // Get current logged-in user as professor responsible
    const registeredUserStr = localStorage.getItem('registeredUser');
    const professor = registeredUserStr ? JSON.parse(registeredUserStr).name : 'Não informado';
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (tempPlanoMaterials.length === 0) {
        showToast('Adicione pelo menos um material à Ficha de Controle!', 'error');
        return;
    }

    const horarioInicioEl = document.getElementById('plano-horario-inicio');
    const horarioFimEl = document.getElementById('plano-horario-fim');
    const horarioInicio = horarioInicioEl ? horarioInicioEl.value : '19:00';
    const horarioFim = horarioFimEl ? horarioFimEl.value : '22:00';

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
        turno,
        horarioInicio,
        horarioFim,
        statusAula: 'agendada',
        timestampInicio: null,
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
            if (local !== sourceLab) {
                addNotification('info', `Transferência de Material`, `Material "${item.name}" transferido do Almoxarifado Lab ${sourceLab} para o Lab ${local} pelo(a) Prof(a). ${professor} na aula ${code} às ${nowTime}.`);
            }
        }
    });

    lessonPlans.push(newPlano);
    syncWithBackend('plans', lessonPlans);
    syncWithBackend('inventory', inventory);

    addActivityLog(`Novo plano cadastrado para a turma: ${course} por ${professor}`);
    addNotification('info', `Plano Cadastrado`, `O plano de aula ${code} (${course} - Turno: ${turno}) foi registrado com sucesso.`);
    renderLessonPlans();
    if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
    updateDashboardStats();
    closeModal('modal-add-plano');
    showToast('plano de aula cadastrado', 'success');
    switchTab('plano-aula');
}

function renderLessonPlans() {
    const tableBody = document.getElementById('plano-aula-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const userSchool = window.getUserSchoolCode();

    const dateFilterEl = document.getElementById('plano-date-filter');
    const dateFilterValue = dateFilterEl ? dateFilterEl.value : 'all';
    let dateThreshold = null;
    if (dateFilterValue !== 'all') {
        dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - parseInt(dateFilterValue));
    }

    let filteredPlans = lessonPlans;

    if (dateThreshold) {
        filteredPlans = filteredPlans.filter(plano => {
            let pDate = new Date(plano.date);
            if (isNaN(pDate.getTime())) return true; // keep if invalid date
            return pDate >= dateThreshold;
        });
    }

    if (filteredPlans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum plano encontrado no período selecionado.</td></tr>';
        return;
    }

    filteredPlans.forEach(plano => {
        // Exibir apenas planos que pertençam à escola conectada/cadastrada
        if (userSchool && (!plano.escola || !isSameSchool(plano.escola, userSchool))) {
            return;
        }

        // Find School Details for the plan
        const schoolObj = registeredSchools.find(s => s.code === plano.escola || s.name === plano.escola);

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

        const planCode = plano.code || `PLAN-${String(plano.id).padStart(3, '0')}`;
        const row = document.createElement('tr');

        // Find School Code
        const schoolName = schoolObj ? (schoolObj.sigla || schoolObj.code || schoolObj.name) : (plano.escola || 'SENAI Central');

        const horInicio = plano.horarioInicio || '19:00';
        const horFim = plano.horarioFim || '22:00';
        const statusBtn = plano.statusAula === 'em_andamento' ?
            `<span style="background:#ef4444; color:#fff; padding:4px 8px; border-radius:6px; font-weight:bold; font-size:0.8rem; display:inline-block; margin-right:4px; animation: pulseRed 2s infinite;">🔴 Em Aula (Automático)</span>` :
            `<span style="background:rgba(255,255,255,0.1); color:var(--text-muted); padding:4px 8px; border-radius:6px; font-size:0.8rem; display:inline-block; margin-right:4px;">Agendado</span>`;

        row.innerHTML = `
            <td>${formattedDate}<br><small style="color:var(--primary-beige);">${plano.turno || ''}</small></td>
            <td><strong>${plano.professor || 'Não informado'}</strong></td>
            <td>
                <span style="font-size:0.75rem; background:#1f1f1f; padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--primary-beige); margin-bottom:4px; display:inline-block;">${planCode}</span><br>
                <strong>${plano.course}</strong>
            </td>
            <td>${plano.topic}</td>
            <td><strong>${plano.duracao || 2}h</strong> no Lab ${plano.local || 1}<br><small style="color:#22c55e; font-weight:600;">🕒 ${horInicio} - ${horFim}</small></td>
            <td><strong>${schoolName}</strong></td>
            <td>${plano.objectives}</td>
            <td><div style="max-width:320px; display:flex; flex-wrap:wrap;">${resourcesHtml}</div></td>
            <td class="plano-actions" style="white-space:nowrap;">
                ${statusBtn}
                <button class="btn-table-action" onclick="openPlanoDetailsModal(${plano.id})" title="Ver Ficha de Controle" style="padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">Ficha</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function deleteLessonPlan(id) {
    showToast('Os planos de aula ficam salvos no banco de dados para segurança e histórico.', 'warning');
}

function verificarHorarioPermitido(plano) {
    if (!plano || !plano.horarioInicio) return true;
    if (!plano.horarioInicio.includes(':')) return true;
    
    const agora = new Date();
    const currentMinutes = agora.getHours() * 60 + agora.getMinutes();
    const parts = plano.horarioInicio.split(':');
    const startMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    
    if (currentMinutes < startMinutes) {
        showToast(`⚠️ A sala só é liberada no horário previsto (${plano.horarioInicio}). Horário oficial atual: ${agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}.`, "error");
        return false;
    }
    return true;
}
window.verificarHorarioPermitido = verificarHorarioPermitido;

function iniciarAulaPlano(id) {
    const plano = lessonPlans.find(p => Number(p.id) === Number(id));
    if (!plano) return;
    if (!verificarHorarioPermitido(plano)) return;

    const salaOcupada = lessonPlans.find(p => p.statusAula === 'em_andamento' && Number(p.local) === Number(plano.local) && p.id !== plano.id);
    if (salaOcupada) {
        if (!confirm(`Atenção: O Lab ${plano.local} já consta como OCUPADO pela aula de ${salaOcupada.professor} (${salaOcupada.course}). Deseja iniciar mesmo assim (substituindo a aula em andamento)?`)) {
            return;
        }
        salaOcupada.statusAula = 'concluida';
    }

    plano.statusAula = 'em_andamento';
    plano.timestampInicio = Date.now();

    syncWithBackend('plans', lessonPlans);
    showToast(`Aula "${plano.topic}" iniciada no Lab ${plano.local}! Cronômetro ativado.`, 'success');
    
    renderLessonPlans();
    if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
    updateDashboardStats();
}

function encerrarAulaPlano(id) {
    const plano = lessonPlans.find(p => Number(p.id) === Number(id));
    if (!plano) return;

    if (confirm(`Deseja encerrar a aula "${plano.topic}" no Lab ${plano.local}? A sala será liberada.`)) {
        plano.statusAula = 'concluida';
        syncWithBackend('plans', lessonPlans);
        showToast(`Aula encerrada com sucesso! Sala liberada.`, 'success');
        renderLessonPlans();
        if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
        updateDashboardStats();
    }
}
window.iniciarAulaPlano = iniciarAulaPlano;
window.encerrarAulaPlano = encerrarAulaPlano;

function renderAcompanhamentoReal() {
    const grid = document.getElementById('acompanhamento-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const userSchool = window.getUserSchoolCode();
    
    let schoolLabs = registeredLabs.filter(l => window.isLabAllowedForUser(l));
    
    if (schoolLabs.length === 0) {
        schoolLabs = [
            { id: 1, name: 'Almoxarifado Principal - Lab 1', sigla: 'ALM-L1', schoolId: userSchool || 'COORD-6541' },
            { id: 2, name: 'Almoxarifado de Costura - Lab 2', sigla: 'ALM-L2', schoolId: userSchool || 'COORD-6541' },
            { id: 3, name: 'Almoxarifado de Modelagem - Lab 3', sigla: 'ALM-L3', schoolId: userSchool || 'COORD-6541' }
        ];
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    const planosEscola = lessonPlans.filter(p => window.isItemAllowedForUser(p));
    
    planosEscola.forEach(p => {
        if (p.statusAula === 'em_andamento' || p.date === hojeStr) {
            const labId = Number(p.local) || 1;
            if (!schoolLabs.some(l => Number(l.id) === labId)) {
                schoolLabs.push({ id: labId, name: `Ambiente / Lab ${labId}`, sigla: `ALM-L${labId}`, schoolId: userSchool || p.escola || 'COORD-6541' });
            }
        }
    });

    let ocupadasCount = 0;
    let agendadasCount = 0;
    let liberadasCount = 0;

    schoolLabs.sort((a, b) => Number(a.id) - Number(b.id)).forEach(lab => {
        const labId = Number(lab.id);
        const labSigla = getLabDisplayName(labId);
        const labFullName = lab.name.toUpperCase();

        const aulaAtiva = planosEscola.find(p => p.statusAula === 'em_andamento' && Number(p.local) === labId);
        const aulaAgendada = planosEscola.find(p => p.statusAula !== 'em_andamento' && p.statusAula !== 'concluida' && p.date === hojeStr && Number(p.local) === labId);

        const card = document.createElement('div');

        if (aulaAtiva) {
            ocupadasCount++;
            card.className = 'room-card-live room-card-occupied';
            const horInicio = aulaAtiva.horarioInicio || '19:00';
            const horFim = aulaAtiva.horarioFim || '22:00';
            const startTs = aulaAtiva.timestampInicio || Date.now();

            card.innerHTML = `
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <span style="background:#ef4444; color:#fff; font-size:0.75rem; font-weight:800; padding:6px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
                            <span style="width:8px; height:8px; background:#fff; border-radius:50%; animation: pulseRed 1.5s infinite;"></span>
                            Sala Ocupada
                        </span>
                        <span style="color:var(--primary-beige); font-weight:700; font-size:1.1rem;">${labSigla}</span>
                    </div>
                    <h3 style="color:#fff; font-size:1.3rem; font-weight:700; margin-bottom:10px;">${labFullName}</h3>
                    <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:12px; margin-bottom:15px; font-size:0.95rem;">
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">👨‍🏫 Professor:</strong> ${aulaAtiva.professor || 'Não informado'}</div>
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">📚 Curso:</strong> ${aulaAtiva.course}</div>
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">🎯 Tema:</strong> ${aulaAtiva.topic}</div>
                        <div><strong style="color:var(--primary-beige);">🕒 Horário Previsto:</strong> ${horInicio} às ${horFim}</div>
                    </div>
                    <div class="live-timer-box">
                        <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-bottom:4px;">Tempo em Sala</div>
                        <div class="live-timer-digits live-timer-badge" data-start="${startTs}">00:00:00</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="abrirGeradorQR(${aulaAtiva.id}, ${labId}, '${aulaAtiva.course}')" style="width:100%; background:#3b82f6; color:#fff; border:none; padding:12px; border-radius:10px; font-weight:700; font-size:0.95rem; cursor:pointer; transition:background 0.2s; box-shadow: 0 4px 15px rgba(59,130,246,0.3);">
                        📱 QR Code Liberação (A aula encerrará automaticamente após o horário)
                    </button>
                </div>
            `;
        } else if (aulaAgendada) {
            agendadasCount++;
            card.className = 'room-card-live room-card-scheduled';
            const horInicio = aulaAgendada.horarioInicio || '19:00';
            const horFim = aulaAgendada.horarioFim || '22:00';

            card.innerHTML = `
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <span style="background:#f59e0b; color:#000; font-size:0.75rem; font-weight:800; padding:6px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:1px;">
                            🟡 Sala Agendada
                        </span>
                        <span style="color:var(--primary-beige); font-weight:700; font-size:1.1rem;">${labSigla}</span>
                    </div>
                    <h3 style="color:#fff; font-size:1.3rem; font-weight:700; margin-bottom:10px;">${labFullName}</h3>
                    <div style="background:rgba(0,0,0,0.3); border-radius:10px; padding:12px; margin-bottom:15px; font-size:0.95rem;">
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">👨‍🏫 Professor:</strong> ${aulaAgendada.professor || 'Não informado'}</div>
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">📚 Curso:</strong> ${aulaAgendada.course}</div>
                        <div style="margin-bottom:6px;"><strong style="color:var(--primary-beige);">🎯 Tema:</strong> ${aulaAgendada.topic}</div>
                        <div><strong style="color:var(--primary-beige);">🕒 Horário Agendado:</strong> ${horInicio} às ${horFim}</div>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.85rem; text-align:center; margin:15px 0;">O professor ainda não iniciou a aula no sistema.</p>
                </div>
                <button onclick="abrirAgendamentoPorCodigo(${labId}, ${aulaAgendada.id})" style="width:100%; background:#3b82f6; color:#fff; border:none; padding:12px; border-radius:10px; font-weight:700; font-size:1rem; cursor:pointer; transition:background 0.2s; box-shadow: 0 4px 15px rgba(59,130,246,0.3);">
                    ⚡ Agendar e Emitir QR Code para Iniciar
                </button>
            `;
        } else {
            liberadasCount++;
            card.className = 'room-card-live room-card-free';

            card.innerHTML = `
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <span style="background:rgba(34, 197, 94, 0.2); color:#22c55e; border:1px solid rgba(34,197,94,0.4); font-size:0.75rem; font-weight:800; padding:6px 12px; border-radius:20px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
                            <span style="width:8px; height:8px; background:#22c55e; border-radius:50%;"></span>
                            Sala Liberada
                        </span>
                        <span style="color:var(--primary-beige); font-weight:700; font-size:1.1rem;">${labSigla}</span>
                    </div>
                    <h3 style="color:#fff; font-size:1.3rem; font-weight:700; margin-bottom:15px;">${labFullName}</h3>
                    <div style="background:rgba(0,0,0,0.2); border-radius:10px; padding:20px; text-align:center; margin-bottom:20px;">
                        <div style="font-size:2.5rem; margin-bottom:10px;">🟢</div>
                        <div style="color:var(--text-color); font-weight:600; font-size:1.05rem;">Ambiente Disponível</div>
                        <div style="color:var(--text-muted); font-size:0.85rem; margin-top:5px;">Nenhuma aula em andamento neste ambiente no momento.</div>
                    </div>
                </div>
                <button onclick="abrirAgendamentoPorCodigo(${labId})" style="width:100%; background:linear-gradient(135deg, #10b981, #059669); border:none; color:#fff; padding:14px; border-radius:12px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow: 0 4px 15px rgba(16,185,129,0.4); transition:all 0.2s;">
                    ⚡ Agendar / Iniciar Aula por Código
                </button>
            `;
        }

        grid.appendChild(card);
    });

    const elOcupadas = document.getElementById('stats-salas-ocupadas');
    const elAgendadas = document.getElementById('stats-salas-agendadas');
    const elLiberadas = document.getElementById('stats-salas-liberadas');
    if (elOcupadas) elOcupadas.textContent = ocupadasCount;
    if (elAgendadas) elAgendadas.textContent = agendadasCount;
    if (elLiberadas) elLiberadas.textContent = liberadasCount;
}
window.renderAcompanhamentoReal = renderAcompanhamentoReal;

setInterval(() => {
    if (currentTab !== 'acompanhamento-real') return;
    document.querySelectorAll('.live-timer-badge').forEach(el => {
        const start = parseInt(el.getAttribute('data-start'));
        if (start && !isNaN(start)) {
            const diffSeconds = Math.floor((Date.now() - start) / 1000);
            if (diffSeconds >= 0) {
                const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, '0');
                const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, '0');
                const secs = String(diffSeconds % 60).padStart(2, '0');
                el.textContent = `${hrs}:${mins}:${secs}`;
            }
        }
    });
}, 1000);

function registrarNovaCategoriaAlmox() {
    if (!isUserAllowedInCurrentLab()) {
        showToast('Apenas usuários vinculados à escola deste almoxarifado podem registrar categorias.', 'error');
        return;
    }
    const nome = prompt("Digite o nome da nova categoria para o Almoxarifado (ex: Equipamentos, Aviamentos, Segurança):");
    if (!nome || !nome.trim()) return;
    
    const catClean = nome.trim().toLowerCase();
    const custom = JSON.parse(localStorage.getItem('customAlmoxCategories') || '[]');
    const base = ['ferramentas', 'tecidos', 'moldes'];
    
    if (base.includes(catClean) || custom.includes(catClean)) {
        showToast("Essa categoria já está cadastrada!", "warning");
        return;
    }
    
    custom.push(catClean);
    localStorage.setItem('customAlmoxCategories', JSON.stringify(custom));
    showToast(`Categoria "${nome}" registrada com sucesso!`, "success");
    
    if (currentLab) {
        renderInventory();
    }
}
window.registrarNovaCategoriaAlmox = registrarNovaCategoriaAlmox;

let currentQRReleasePlanoId = null;

function abrirGeradorQR(planoId, labId, courseName) {
    currentQRReleasePlanoId = planoId;
    const imgEl = document.getElementById('qrcode-image-el');
    const infoEl = document.getElementById('qrcode-room-info');
    
    if (imgEl) {
        const qrData = encodeURIComponent(`SENAIVEST_LIBERAR_LAB_${labId}_PLANO_${planoId}`);
        imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}&color=000000&bgcolor=ffffff`;
    }
    if (infoEl) {
        infoEl.textContent = `Sala: LAB ${labId} | ${courseName}`;
    }
    
    const btnConfirm = document.getElementById('btn-confirmar-qr-release');
    if (btnConfirm) {
        btnConfirm.onclick = () => {
            closeModal('modal-qrcode-liberar');
            showToast('QR Code apresentado. A aula encerrará automaticamente ao fim do horário!', 'info');
        };
    }
    
    document.getElementById('modal-qrcode-liberar').classList.add('active');
}
window.abrirGeradorQR = abrirGeradorQR;

function abrirLeitorQR() {
    document.getElementById('modal-qrcode-scanner').classList.add('active');
}
window.abrirLeitorQR = abrirLeitorQR;

function simularLeituraQRSucesso() {
    closeModal('modal-qrcode-scanner');
    
    const userSchool = window.getUserSchoolCode();
    const planosEscola = lessonPlans.filter(p => !userSchool || !p.escola || isSameSchool(p.escola, userSchool));
    const aulaAtiva = planosEscola.find(p => p.statusAula === 'em_andamento');
    
    if (aulaAtiva) {
        showToast("📱 QR Code lido com sucesso! Processando baixa na sala...", "info");
        setTimeout(() => {
            aulaAtiva.statusAula = 'concluida';
            syncWithBackend('plans', lessonPlans);
            showToast(`✅ Lab ${aulaAtiva.local} liberado via leitura de QR Code!`, "success");
            renderLessonPlans();
            if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
            updateDashboardStats();
        }, 1000);
    } else {
        showToast("📱 Leitura efetuada: Nenhuma aula em andamento encontrada para liberar no momento.", "warning");
    }
}
window.simularLeituraQRSucesso = simularLeituraQRSucesso;

let currentAgendarLabId = 1;

function abrirAgendamentoPorCodigo(labId, planoId) {
    currentAgendarLabId = Number(labId) || 1;
    const tit = document.getElementById('modal-agendar-codigo-titulo');
    if (tit) tit.textContent = `⚡ Agendar Aula - LAB ${currentAgendarLabId}`;

    const input = document.getElementById('agendar-input-codigo');
    if (input) input.value = '';
    
    const preview = document.getElementById('agendar-preview-box');
    if (preview) preview.style.display = 'none';

    document.getElementById('agendar-plano-id').value = '';
    
    const flag = document.getElementById('qr-gerado-flag');
    if (flag) flag.value = 'false';
    const qrBox = document.getElementById('qr-pre-box');
    if (qrBox) qrBox.style.display = 'none';
    const btnSubmit = document.getElementById('btn-iniciar-aula-submit');
    if (btnSubmit) {
        btnSubmit.style.background = '#64748b';
        btnSubmit.style.cursor = 'not-allowed';
        btnSubmit.style.opacity = '0.6';
        btnSubmit.innerHTML = 'Iniciar Aula Agora';
        btnSubmit.title = 'Gere o QR Code de liberação primeiro para iniciar a aula';
    }

    const select = document.getElementById('agendar-select-plano');
    if (select) {
        select.innerHTML = '<option value="">-- Selecione um Plano Cadastrado --</option>';
        const userSchool = window.getUserSchoolCode();
        const planosEscola = lessonPlans.filter(p => !userSchool || !p.escola || isSameSchool(p.escola, userSchool));
        
        planosEscola.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `[${p.code || 'SEM-COD'}] ${p.course} (${p.topic}) - Prof: ${p.professor}`;
            select.appendChild(opt);
        });
    }

    document.getElementById('modal-agendar-codigo').classList.add('active');
    if (planoId && select) {
        select.value = planoId;
        selecionarPlanoDropdown(planoId);
    }
}
window.abrirAgendamentoPorCodigo = abrirAgendamentoPorCodigo;

function buscarDadosPlanoPorCodigo(val) {
    const limpo = val.trim().toLowerCase();
    const select = document.getElementById('agendar-select-plano');
    const preview = document.getElementById('agendar-preview-box');
    
    if (!limpo) {
        if (preview) preview.style.display = 'none';
        document.getElementById('agendar-plano-id').value = '';
        if (select) select.value = '';
        return;
    }

    const userSchool = window.getUserSchoolCode();
    const planosEscola = lessonPlans.filter(p => !userSchool || !p.escola || isSameSchool(p.escola, userSchool));
    const encontrado = planosEscola.find(p => (p.code && p.code.toLowerCase() === limpo) || String(p.id) === limpo);

    if (encontrado) {
        exibirPreviewPlano(encontrado);
        if (select) select.value = encontrado.id;
    } else {
        if (preview) preview.style.display = 'none';
        document.getElementById('agendar-plano-id').value = '';
    }
}
window.buscarDadosPlanoPorCodigo = buscarDadosPlanoPorCodigo;

function selecionarPlanoDropdown(idVal) {
    if (!idVal) {
        const preview = document.getElementById('agendar-preview-box');
        if (preview) preview.style.display = 'none';
        document.getElementById('agendar-plano-id').value = '';
        document.getElementById('agendar-input-codigo').value = '';
        return;
    }
    const encontrado = lessonPlans.find(p => Number(p.id) === Number(idVal));
    if (encontrado) {
        document.getElementById('agendar-input-codigo').value = encontrado.code || '';
        exibirPreviewPlano(encontrado);
    }
}
window.selecionarPlanoDropdown = selecionarPlanoDropdown;

function exibirPreviewPlano(plano) {
    document.getElementById('agendar-plano-id').value = plano.id;
    document.getElementById('preview-curso').textContent = `📚 Curso: ${plano.course}`;
    document.getElementById('preview-prof').textContent = `👨‍🏫 Professor: ${plano.professor || 'Não informado'}`;
    document.getElementById('preview-tema').textContent = `🎯 Tema: ${plano.topic}`;
    const hIn = plano.horarioInicio || '19:00';
    const hFim = plano.horarioFim || '22:00';
    document.getElementById('preview-horario').textContent = `🕒 Horário Cadastrado: ${hIn} às ${hFim} (${plano.duracao || 2}h)`;
    
    const flag = document.getElementById('qr-gerado-flag');
    if (flag) flag.value = 'false';
    const qrBox = document.getElementById('qr-pre-box');
    if (qrBox) qrBox.style.display = 'none';
    const btnSubmit = document.getElementById('btn-iniciar-aula-submit');
    if (btnSubmit) {
        btnSubmit.style.background = '#64748b';
        btnSubmit.style.cursor = 'not-allowed';
        btnSubmit.style.opacity = '0.6';
        btnSubmit.innerHTML = 'Iniciar Aula Agora';
        btnSubmit.title = 'Gere o QR Code de liberação primeiro para iniciar a aula';
    }

    const preview = document.getElementById('agendar-preview-box');
    if (preview) preview.style.display = 'block';
}

function gerarQRPreInicio() {
    const idVal = document.getElementById('agendar-plano-id').value;
    if (!idVal) {
        showToast("Selecione ou digite o código do plano de aula primeiro!", "warning");
        return;
    }
    const qrImg = document.getElementById('qr-pre-img');
    const qrBox = document.getElementById('qr-pre-box');
    const btnSubmit = document.getElementById('btn-iniciar-aula-submit');
    const flag = document.getElementById('qr-gerado-flag');

    if (qrImg && qrBox) {
        const qrData = encodeURIComponent(`SENAIVEST_LIBERAR_LAB_${currentAgendarLabId}_PLANO_${idVal}`);
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&color=000000&bgcolor=ffffff`;
        qrBox.style.display = 'block';
    }
    if (flag) flag.value = 'true';
    if (btnSubmit) {
        btnSubmit.style.background = '#22c55e';
        btnSubmit.style.cursor = 'pointer';
        btnSubmit.style.opacity = '1';
        btnSubmit.innerHTML = '▶️ Iniciar Aula Agora';
        btnSubmit.title = 'Clique para iniciar a aula no Acompanhamento Real';
    }
    showToast("QR Code de liberação gerado com sucesso! Botão de Iniciar Aula liberado.", "success");
}
window.gerarQRPreInicio = gerarQRPreInicio;

function confirmarAgendamentoCodigo(statusDesejado) {
    const idVal = document.getElementById('agendar-plano-id').value;
    if (!idVal) {
        showToast("Por favor, digite um código válido ou selecione um plano na lista!", "warning");
        return;
    }

    const plano = lessonPlans.find(p => Number(p.id) === Number(idVal));
    if (!plano) {
        showToast("Plano não encontrado no sistema!", "error");
        return;
    }

    if (statusDesejado === 'em_andamento') {
        if (!verificarHorarioPermitido(plano)) return;
        const flag = document.getElementById('qr-gerado-flag');
        if (!flag || flag.value !== 'true') {
            showToast("⚠️ Atenção: Gere o QR Code de liberação da sala antes de iniciar a aula!", "warning");
            return;
        }

        const salaOcupada = lessonPlans.find(p => p.statusAula === 'em_andamento' && Number(p.local) === currentAgendarLabId && p.id !== plano.id);
        if (salaOcupada) {
            if (!confirm(`O Lab ${currentAgendarLabId} está ocupado pela aula de ${salaOcupada.professor}. Deseja iniciar mesmo assim?`)) {
                return;
            }
            salaOcupada.statusAula = 'concluida';
        }
    }

    plano.local = currentAgendarLabId;
    plano.date = new Date().toISOString().split('T')[0];
    plano.statusAula = statusDesejado;
    if (statusDesejado === 'em_andamento') {
        plano.timestampInicio = Date.now();
    }

    syncWithBackend('plans', lessonPlans);
    closeModal('modal-agendar-codigo');

    if (statusDesejado === 'em_andamento') {
        showToast(`Aula "${plano.code}" INICIADA no Lab ${currentAgendarLabId}! Cronômetro rodando.`, "success");
    } else {
        showToast(`Aula "${plano.code}" agendada para o Lab ${currentAgendarLabId}!`, "success");
    }

    renderLessonPlans();
    if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
    updateDashboardStats();
}
window.confirmarAgendamentoCodigo = confirmarAgendamentoCodigo;


// PLANO MATERIALS FORM HELPERS
function populatePlanoMaterialSelect() {
    const select = document.getElementById('plano-material-select');
    if (!select) return;
    select.innerHTML = '';

    // Sort items by lab then name
    const sorted = [...inventory].filter(item => window.isItemAllowedForUser(item)).sort((a, b) => a.lab - b.lab || a.name.localeCompare(b.name));

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
                <button type="button" class="btn-table-action delete" onclick="removeTempMaterial(${m.id})"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
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

    // Filter by User School
    const registeredUserStr = localStorage.getItem('registeredUser');
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            let userSchoolCode = (user.instituicao || '').trim();
            userSchoolCode = getSchoolCode(userSchoolCode);
            if (userSchoolCode) {
                // Filter notifications strictly belonging to the user's school
                filtered = filtered.filter(n => n.escolaCode && isSameSchool(n.escolaCode, userSchoolCode));
            }
        } catch (e) { }
    }

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
                <button class="btn-notif-action" onclick="deleteNotification(${n.id})" title="Excluir"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
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
function addNotification(type, title, message, schoolCode = null) {
    let finalSchoolCode = schoolCode;
    if (!finalSchoolCode) {
        const registeredUserStr = localStorage.getItem('registeredUser');
        if (registeredUserStr) {
            try {
                const user = JSON.parse(registeredUserStr);
                finalSchoolCode = getSchoolCode((user.instituicao || '').trim());
            } catch (e) { }
        }
    } else {
        finalSchoolCode = getSchoolCode(finalSchoolCode);
    }
    const newNotif = {
        id: notifications.length + 1,
        type,
        title,
        message,
        time: 'Agora',
        read: false,
        escolaCode: finalSchoolCode
    };
    notifications.unshift(newNotif);
    syncWithBackend('notifications', notifications);
    renderNotifications();
    updateDashboardStats();
}

// DASHBOARD STATS CALCULATOR
function updateDashboardStats() {
    // Total items across all labs
    const allowedInventory = inventory.filter(i => window.isItemAllowedForUser(i));
    document.getElementById('stats-total-items').textContent = allowedInventory.length;

    // Filter data based on user school/unit
    let filteredNotifs = notifications;
    let filteredPlans = lessonPlans;
    let filteredBoletins = registeredBoletins;

    const registeredUserStr = localStorage.getItem('registeredUser');
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            const userSchool = (user.instituicao || '').trim();
            if (userSchool) {
                // filter notifications strictly by school
                filteredNotifs = notifications.filter(n => n.escolaCode && isSameSchool(n.escolaCode, userSchool));

                // filter bulletins
                filteredBoletins = registeredBoletins.filter(b => b.escolaCode === userSchool);

                // filter plans
                filteredPlans = lessonPlans.filter(plano => {
                    const userSchoolObj = registeredSchools.find(s =>
                        (s.code || '').trim().toLowerCase() === userSchool.toLowerCase() ||
                        (s.name || '').trim().toLowerCase() === userSchool.toLowerCase()
                    );
                    const userCodes = userSchoolObj ? [userSchoolObj.code.toLowerCase(), userSchoolObj.name.toLowerCase()] : [userSchool.toLowerCase()];

                    const planSchoolStr = (plano.escola || '').trim().toLowerCase();
                    const planSchoolObj = registeredSchools.find(s =>
                        (s.code || '').trim().toLowerCase() === planSchoolStr ||
                        (s.name || '').trim().toLowerCase() === planSchoolStr
                    );
                    const planCodes = planSchoolObj ? [planSchoolObj.code.toLowerCase(), planSchoolObj.name.toLowerCase()] : [planSchoolStr];

                    return userCodes.some(c => planCodes.includes(c));
                });
            }
        } catch (e) { }
    }

    // Unread notification count
    const unreadCount = filteredNotifs.filter(n => !n.read).length;
    document.getElementById('stats-total-alerts').textContent = unreadCount;

    // Add visual badge counter next to Bell menu icon on sidebar
    const notifLink = document.getElementById('nav-notif-link');
    if (notifLink) {
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
    }

    // Total lesson plans for the current week
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklyPlans = filteredPlans.filter(p => {
        if (!p.date) return false;
        const pDate = new Date(p.date + 'T12:00:00');
        return pDate >= weekStart && pDate <= weekEnd;
    });
    document.getElementById('stats-total-planos').textContent = weeklyPlans.length;

    // Total reports count
    document.getElementById('stats-total-boletins').textContent = filteredBoletins.length;

    // Render Weekly Automated Report
    generateWeeklyReport(filteredBoletins);
    if (window.renderCharts) window.renderCharts();

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

    // Filter by user school
    const registeredUserStr = localStorage.getItem('registeredUser');
    let userSchool = '';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            userSchool = (user.instituicao || '').trim();
        } catch (e) { }
    }

    if (userSchool) {
        serverUsers = serverUsers.filter(u => isSameSchool(u.instituicao, userSchool));
    }

    let filteredPlans = lessonPlans;
    if (userSchool) {
        filteredPlans = lessonPlans.filter(plano => {
            const userSchoolObj = registeredSchools.find(s =>
                (s.code || '').trim().toLowerCase() === userSchool.toLowerCase() ||
                (s.name || '').trim().toLowerCase() === userSchool.toLowerCase()
            );
            const userCodes = userSchoolObj ? [userSchoolObj.code.toLowerCase(), userSchoolObj.name.toLowerCase()] : [userSchool.toLowerCase()];

            const planSchoolStr = (plano.escola || '').trim().toLowerCase();
            const planSchoolObj = registeredSchools.find(s =>
                (s.code || '').trim().toLowerCase() === planSchoolStr ||
                (s.name || '').trim().toLowerCase() === planSchoolStr
            );
            const planCodes = planSchoolObj ? [planSchoolObj.code.toLowerCase(), planSchoolObj.name.toLowerCase()] : [planSchoolStr];

            return userCodes.some(c => planCodes.includes(c));
        });
    }

    // 1. Gather all unique teachers from registered user database + plans + default teachers
    const teacherSet = new Set();

    // Add all users registered on the server/DB
    serverUsers.forEach(u => {
        if (u.name) teacherSet.add(u.name);
    });

    // Add teachers who registered plans
    filteredPlans.forEach(p => {
        if (p.professor) teacherSet.add(p.professor);
    });

    // Add current local user if exists
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            if (user.name) teacherSet.add(user.name);
        } catch (e) { }
    }

    const teachersList = Array.from(teacherSet);

    // 2. Count plans per teacher
    const plansCount = {};
    teachersList.forEach(t => plansCount[t] = 0);
    filteredPlans.forEach(p => {
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
    if (!list) return;
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
    const inputGeminiKey = null; // (Gemini Key integration removed)

    // Set Text Contents and Verified Badge if Certified
    const verifiedBadgeSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="verified-badge-icon" style="width:22px;height:22px;vertical-align:middle;margin-left:7px;display:inline-block;animation:badgePop .4s cubic-bezier(.34,1.56,.64,1) both;flex-shrink:0;" title="Docente Certificado SENAI VEST"><path fill="#1DA1F2" d="M12 1.5l2.25 1.5 2.7-.3.9 2.55 2.55 .9-.3 2.7 1.5 2.25-1.5 2.25 .3 2.7-2.55 .9-.9 2.55-2.7-.3-2.25 1.5-2.25-1.5-2.7 .3-.9-2.55-2.55-.9 .3-2.7-1.5-2.25 1.5-2.25-.3-2.7 2.55-.9 .9-2.55 2.7 .3L12 1.5z"/><path fill="white" d="M10.5 16.5l-4-4 1.41-1.41L10.5 13.67l6.59-6.59L18.5 8.5l-8 8z"/></svg>`;
    const verifiedBadge = user.isCertified ? verifiedBadgeSVG : '';

    if (sideName) sideName.innerHTML = (user.name || 'Usuário') + verifiedBadge;
    if (headName) headName.innerHTML = (user.name ? user.name.split(' ')[0] : 'Usuário') + verifiedBadge;
    if (sideRole) sideRole.textContent = user.role || 'Docente';

    if (profileNameDisplay) profileNameDisplay.innerHTML = (user.name || 'Nome do Usuário') + verifiedBadge;
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email || 'usuario@senai.br';
    if (profileBadgeDisplay) profileBadgeDisplay.textContent = user.role || 'Docente';

    const schoolObj = registeredSchools.find(s => isSameSchool(s.code || s.coordId || s.id || s.name, user.instituicao));
    const schoolNameDisplay = schoolObj ? schoolObj.name : (user.instituicao || 'Não informado');
    const schoolNameView = schoolObj ? schoolObj.name : (user.instituicao || '-');

    if (displayPhone) displayPhone.textContent = user.phone || 'Não informado';
    if (displayAddress) displayAddress.textContent = user.address || 'Não informado';
    if (displayInstituicao) displayInstituicao.textContent = schoolNameDisplay;
    if (displayRole) displayRole.textContent = user.role || 'Não informado';
    if (displayClass) displayClass.textContent = user.responsibleClass || 'Nenhuma';
    if (displayEmailField) displayEmailField.textContent = user.id || user.coordId || user.email || 'Não informado';
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
    if (viewName) viewName.innerHTML = (user.name || '-') + verifiedBadge;
    if (viewEmail) viewEmail.textContent = user.id || user.coordId || user.email || '-';
    if (viewPhone) viewPhone.textContent = user.phone || '-';
    if (viewInstituicao) viewInstituicao.textContent = schoolNameView;
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
    if (inputGeminiKey) { /* Gemini Key integration removed */ }

    const btnResetAvatar = document.getElementById('btn-reset-avatar');
    if (btnResetAvatar) {
        btnResetAvatar.style.display = user.avatarType === 'uploaded' ? 'block' : 'none';
    }

    updateUserAvatar(user);

    // Auto-populate and lock form fields for the logged in user
    autoFillBoletimFormFields();
    populatePlanoEscolaDropdown();
}

// --- ESTELA VIRTUAL ASSISTANT LOGIC ---

function getEstelaResponse(query) {
    const q = query.toLowerCase();

    if (q.includes('olá') || q.includes('oi') || q.includes('estela') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite') || q.includes('hello')) {
        return "Olá! Eu sou a Estela, a assistente virtual inteligente da plataforma SENAI VEST. Estou aqui para alinhavar qualquer dúvida que você tenha sobre a plataforma. Pode perguntar!";
    }

    if (q.includes('cadastro') || q.includes('criar conta') || q.includes('cadastre-se') || q.includes('escola não aparece') || q.includes('esqueci minha senha') || q.includes('senha') || q.includes('acesso')) {
        return "Para criar uma conta, clique em 'Cadastre-se' na página inicial e preencha seus dados. Se sua instituição não aparecer, clique em 'Registrar Escola'. Caso tenha esquecido sua senha, use a opção de recuperação na tela de login ou contate o administrador da sua unidade.";
    }

    if (q.includes('cadastrar novo') || q.includes('categorias') || q.includes('almoxarifado') || q.includes('estoque') || q.includes('material') || q.includes('ferramenta') || q.includes('tecido') || q.includes('molde')) {
        return "No menu lateral <strong>Almoxarifado</strong>, você pode clicar em 'Cadastrar Novo Item' para inserir tecidos, ferramentas, moldes, etc. A plataforma permite separar o estoque por categorias para facilitar o controle!";
    }

    if (q.includes('diferença') || q.includes('boletim') || q.includes('ocorrência') || q.includes('denúncia') || q.includes('avaria') || q.includes('incidente')) {
        return "A seção <strong>Boletim</strong> é voltada para registros informativos e acompanhamento regular. Já as <strong>Ocorrências</strong> devem ser usadas para incidentes específicos e denúncias. Todas as denúncias ficam centralizadas na aba Ocorrências para análise da coordenação.";
    }

    if (q.includes('plano de aula') || q.includes('montar') || q.includes('cronograma') || q.includes('mural') || q.includes('guia de organização') || q.includes('dicas')) {
        return "Vá em <strong>Plano de Aula</strong> e clique em 'Criar Novo Plano' para definir objetivos, cronograma e materiais. Já o <strong>Mural de Organização</strong> (ou Guia de Organização) é o espaço para compartilhar dicas, fotos e avisos de como manter o laboratório otimizado.";
    }

    if (q.includes('quem é estela') || q.includes('pode realizar cadastros') || q.includes('suporte') || q.includes('ajuda') || q.includes('inteligente') || q.includes('erro') || q.includes('problema') || q.includes('sistema')) {
        return "Eu sou a Estela! Posso responder dúvidas rápidas sobre ferramentas e como realizar procedimentos de gestão. Em caso de ajuda em relação ao sistema que deu erro, envie um email para o nosso suporte que é senaivest.suporte@gmail.com.";
    }

    if (q.includes('perfil') || q.includes('altero meu cargo') || q.includes('e-mail') || q.includes('notificações') || q.includes('avisos') || q.includes('atualização') || q.includes('dados')) {
        return "No menu lateral <strong>Perfil</strong> você pode editar seus dados cadastrais, como cargo e e-mail. Para ver avisos importantes e estoque baixo, acesse a seção <strong>Notificações</strong> no menu lateral e fique atento aos alertas!";
    }

    if (q.includes('reciclar') || q.includes('meio ambiente') || q.includes('sustentabilidade') || q.includes('5s') || q.includes('lixo')) {
        return "O laboratório sustentável é o nosso forte! Na aba <strong>Guia de Organização</strong> temos dicas sobre regras 5S, descarte de tecidos e economia de energia.";
    }

    return "Hm, essa dúvida ficou um pouco desalinhada nas minhas agulhas! Mas fique tranquilo(a): para mexer no estoque use a aba <strong>Almoxarifado</strong>; para denunciar danos use <strong>Boletim</strong>; para atualizar dados vá em <strong>Perfil</strong>. Em caso de erro no sistema, envie um email para senaivest.suporte@gmail.com.";
}

// Google Gemini API integration (Removed - Estela is now offline)
async function getEstelaAIResponse(query) {
    const fallback = getEstelaResponse(query);
    return fallback;
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
    const assistantContainer = document.getElementById('assistant-container');

    if (!toggleBtn || !chatWindow) return;

    // --- Draggable Assistant Logic ---
    if (assistantContainer && toggleBtn) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        // Restore position
        const savedPos = localStorage.getItem('estela_position');
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            xOffset = pos.x;
            yOffset = pos.y;
            setTranslate(xOffset, yOffset, assistantContainer);
        }

        function dragStart(e) {
            if (e.type === 'touchstart') {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }
            if (e.target === toggleBtn || toggleBtn.contains(e.target)) {
                isDragging = true;
                assistantContainer.classList.add('dragging');
            }
        }

        function dragEnd(e) {
            if (!isDragging) return;
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            assistantContainer.classList.remove('dragging');
            // Save position
            localStorage.setItem('estela_position', JSON.stringify({ x: xOffset, y: yOffset }));
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, assistantContainer);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        // Add event listeners for mouse and touch
        document.addEventListener('mousedown', dragStart, false);
        document.addEventListener('mouseup', dragEnd, false);
        document.addEventListener('mousemove', drag, { passive: false });

        document.addEventListener('touchstart', dragStart, { passive: true });
        document.addEventListener('touchend', dragEnd, false);
        document.addEventListener('touchmove', drag, { passive: false });

        // Prevent toggle on drag
        let dragTimeout;
        toggleBtn.addEventListener('mousedown', () => { dragTimeout = setTimeout(() => { }, 200); });
        toggleBtn.addEventListener('mouseup', () => { clearTimeout(dragTimeout); });
    }

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

        if (!isUser && window.showEstelaPopupNotification && !chatWindow.classList.contains('active')) {
            window.showEstelaPopupNotification(text);
        }
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

let estelaPopupTimeout = null;
window.fecharEstelaPopup = function(e) {
    if (e) e.stopPropagation();
    const popup = document.getElementById('estela-popup-bubble');
    if (popup) popup.style.display = 'none';
};

window.abrirChatEstelaDaNotificacao = function() {
    window.fecharEstelaPopup();
    const chatWindow = document.getElementById('assistant-chat-window');
    if (chatWindow) chatWindow.classList.add('active');
};

window.showEstelaPopupNotification = function(text) {
    const popup = document.getElementById('estela-popup-bubble');
    const content = document.getElementById('estela-popup-content');
    if (!popup || !content) return;

    content.innerHTML = text;
    popup.style.display = 'block';

    if (estelaPopupTimeout) clearTimeout(estelaPopupTimeout);
    estelaPopupTimeout = setTimeout(() => {
        if (popup) popup.style.display = 'none';
    }, 10000);
};

// --- BOLETINS DE OCORRÊNCIA REGISTRADOS & CODE AUTO-GENERATORS ---

let initialBoletins = [];
let registeredBoletins = JSON.parse(localStorage.getItem('registeredBoletins')) || [];

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
        const nextNum = lessonPlans.length + 1;
        inputCode.value = `PLAN-${String(nextNum).padStart(3, '0')}`;
    }
}

// Render the grid of registered reports
function renderRegisteredBoletins() {
    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = '';
    let userSchoolCode = '';
    if (registeredUserStr) {
        const user = JSON.parse(registeredUserStr);
        currentUserEmail = user.email || '';
        userSchoolCode = (user.instituicao || '').trim();
        userSchoolCode = getSchoolCode(userSchoolCode);
    }

    // Filter by user school
    let filteredBoletins = registeredBoletins;
    if (userSchoolCode) {
        filteredBoletins = registeredBoletins.filter(b => !b.escolaCode || b.escolaCode === userSchoolCode);
    }

    // Render "Minhas Denúncias"
    const minhasContainer = document.getElementById('minhas-denuncias-grid-container');
    if (minhasContainer) {
        minhasContainer.innerHTML = '';
        const currentUserName = registeredUserStr ? (JSON.parse(registeredUserStr).name || '') : '';
        const minhasDenuncias = filteredBoletins.filter(b =>
            !currentUserEmail ||
            b.createdBy === currentUserEmail ||
            b.createdBy === 'geovana@senai.br' ||
            (currentUserName && b.professor === currentUserName)
        );
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
        if (filteredBoletins.length === 0) {
            geraisContainer.innerHTML = `<div style="text-align:center; grid-column: 1/-1; padding:40px; color:var(--text-muted);">Nenhum boletim registrado encontrado.</div>`;
        } else {
            const sorted = [...filteredBoletins].reverse();
            sorted.forEach(b => {
                geraisContainer.appendChild(createBoletimCard(b));
            });
        }
    }

    // Render "Status de Solicitação"
    renderStatusBoletins();
}

function createBoletimCard(b) {
    const card = document.createElement('div');
    card.className = 'boletim-card-file';

    // Categorias visual mapping
    const catMap = {
        'roubo': { label: 'Roubo', color: 'var(--accent-red)', icon: '🚨', bg: 'rgba(192, 57, 43, 0.15)' },
        'furto': { label: 'Furto', color: 'var(--accent-orange)', icon: '🕵️', bg: 'rgba(230, 126, 34, 0.15)' },
        'avaria': { label: 'Avaria', color: '#f1c40f', icon: '⚠️', bg: 'rgba(241, 196, 15, 0.15)' },
        'extravio': { label: 'Extravio', color: 'var(--accent-blue-light)', icon: '🔍', bg: 'rgba(58, 142, 230, 0.15)' },
        'naodevolvido': { label: 'Não Devolvido', color: '#9b59b6', icon: '⏳', bg: 'rgba(155, 89, 182, 0.15)' },
        'divergencia': { label: 'Divergência', color: '#1abc9c', icon: '📊', bg: 'rgba(26, 188, 156, 0.15)' },
        'outros': { label: 'Outros', color: 'var(--primary-beige)', icon: '📝', bg: 'rgba(211, 188, 162, 0.15)' }
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
        ${(b.ultimaObservacao || (b.statusHistory && [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '')?.observacao)) ? `
            <div style="background: rgba(211, 188, 162, 0.15); border-left: 4px solid var(--primary-beige); padding: 10px; margin: 10px 0; border-radius: 4px; font-size: 0.85rem;">
                <div style="font-weight: bold; color: var(--primary-beige); margin-bottom: 3px;">💬 Observação da Coordenação:</div>
                <div style="color: var(--text-light); line-height: 1.3;">${b.ultimaObservacao || [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '')?.observacao}</div>
            </div>
        ` : ''}
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

    const coordObsContainer = document.getElementById('view-boletim-coord-obs-container');
    const coordObsText = document.getElementById('view-boletim-coord-obs');
    if (b.statusHistory && b.statusHistory.length > 0) {
        const latestObsEntry = [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '');
        if (latestObsEntry) {
            if (coordObsText) coordObsText.textContent = latestObsEntry.observacao;
            if (coordObsContainer) coordObsContainer.style.display = 'block';
        } else {
            if (coordObsContainer) coordObsContainer.style.display = 'none';
        }
    } else {
        if (coordObsContainer) coordObsContainer.style.display = 'none';
    }

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

    const registeredUserStr = localStorage.getItem('registeredUser');
    let responsavel = 'Professor(a)';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            responsavel = user.name || 'Professor(a)';
        } catch (e) { }
    }

    item.lab = originLab;
    item.inconformidade = false;
    item.status = 'Pertencente'; // Restored to origin: Pertencente again
    item.transferInfo = null;    // Clear transfer info
    item.meta = `Horário: ${nowTime} | Devolvido ao laboratório de origem (Lab ${originLab}) por ${responsavel}`;

    syncWithBackend('inventory', inventory);
    renderInventory();
    updateDashboardStats();
    addNotification('info', 'Devolução de Produto', `O produto "${item.name}" foi devolvido ao laboratório de origem (Lab ${originLab}) pelo(a) Prof(a). ${responsavel} às ${nowTime}.`);
    showToast(`Item devolvido ao laboratório de origem com sucesso!`, 'success');

    if (window.appendEstelaMessage) {
        window.appendEstelaMessage(`O produto "${item.name}" foi devolvido com sucesso ao laboratório de origem.`, false);
    }
    if (window.speakEstelaText) {
        window.speakEstelaText(`Produto ${item.name} devolvido com sucesso.`);
    }
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
            <button class="btn-delete-school" onclick="deleteSchool('${school.id || school.code}')" title="Excluir Escola"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        `;
        container.appendChild(div);
    });
}

function handleSchoolRegistrationSubmit(e) {
    e.preventDefault();
    // Prefer inputs from the overlay `school-register-form` (ids: school-reg-*)
    const overlayNameEl = document.getElementById('school-reg-nome');
    const overlayEmailEl = document.getElementById('school-reg-email');
    const overlaySenhaEl = document.getElementById('school-reg-senha');
    const overlayEstadoEl = document.getElementById('school-reg-estado');
    const overlayCidadeEl = document.getElementById('school-reg-cidade');
    const overlayBairroEl = document.getElementById('school-reg-bairro');

    let name = '';
    let code = '';
    let city = '';
    let coordinatorEmail = '';
    let password = '';
    let estado = '';
    let bairro = '';

    if (overlayNameEl) {
        name = overlayNameEl.value.trim();
        coordinatorEmail = overlayEmailEl ? overlayEmailEl.value.trim() : '';
        password = overlaySenhaEl ? overlaySenhaEl.value.trim() : '';
        estado = overlayEstadoEl ? overlayEstadoEl.value.trim() : '';
        city = overlayCidadeEl ? overlayCidadeEl.value.trim() : '';
        bairro = overlayBairroEl ? overlayBairroEl.value.trim() : '';
        const overlaySiglaEl = document.getElementById('school-reg-sigla');
        code = overlaySiglaEl && overlaySiglaEl.value ? overlaySiglaEl.value : (window.generateSchoolSigla ? window.generateSchoolSigla(name, bairro) : name);
    } else {
        // fallback to legacy Perfil form ids
        name = (document.getElementById('school-name') || { value: '' }).value.trim();
        code = (document.getElementById('school-code') || { value: '' }).value.trim().toUpperCase();
        city = (document.getElementById('school-city') || { value: '' }).value.trim();
        coordinatorEmail = (document.getElementById('school-coordinator-email') || { value: '' }).value.trim();
    }

    if (!coordinatorEmail) {
        showToast('O e-mail da coordenação é obrigatório!', 'error');
        return;
    }

    if (registeredSchools.some(s => s.code === code)) {
        showToast('Já existe uma escola cadastrada com este código!', 'error');
        return;
    }

    // If no password provided (legacy flow), generate a random one; otherwise use provided
    let generatedPassword = password;
    if (!generatedPassword) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        generatedPassword = '';
        for (let i = 0; i < 6; i++) {
            generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }

    const newSchool = {
        id: registeredSchools.length > 0 ? Math.max(...registeredSchools.map(s => s.id)) + 1 : 1,
        name,
        code,
        sigla: code,
        estado,
        city,
        bairro,
        coordinatorEmail,
        password: generatedPassword
    };

    registeredSchools.push(newSchool);
    syncWithBackend('schools', registeredSchools);
    renderSchools();
    populatePlanoEscolaDropdown();

    // Reset overlay form if present
    const overlayFormEl = document.getElementById('school-register-form');
    if (overlayFormEl) overlayFormEl.reset();
    showToast('Escola cadastrada com sucesso! Senha: ' + generatedPassword, 'success');

    // Auto-login como Coordenação e abrir o painel de Coordenação
    try {
        sessionStorage.setItem('coordSession', JSON.stringify(newSchool));
        const regOverlay = document.getElementById('register-fullscreen-overlay');
        if (regOverlay) regOverlay.style.display = 'none';
        const coordLoginOverlay = document.getElementById('coord-login-overlay');
        if (coordLoginOverlay) coordLoginOverlay.style.display = 'none';
        // Ensure app recognizes logged-in coord and navigate to coordination panel
        try {
            localStorage.setItem('isLoggedIn', 'true');
        } catch (e) { }
        // Use SPA tab switch helper to reliably show the 'coordenacao' view
        if (typeof switchTab === 'function') {
            switchTab('coordenacao');
        } else {
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
            const coordSection = document.getElementById('coordenacao');
            if (coordSection) {
                coordSection.classList.add('active');
                document.querySelectorAll('.coordenacao-tab').forEach(t => t.style.display = 'none');
                const painel = document.getElementById('coordenacao-painel');
                if (painel) painel.style.display = 'block';
            }
        }
        // update hash so UI state persists on reload
        try { window.location.hash = '#coordenacao'; } catch (e) { }
        renderCoordenacaoPainel();
        // Fallback: se mesmo assim a seção não estiver visível, atualizar hash e recarregar
        setTimeout(() => {
            const coordSectionCheck = document.getElementById('coordenacao');
            const isActive = coordSectionCheck && (coordSectionCheck.classList.contains('active') || getComputedStyle(coordSectionCheck).display !== 'none');
            if (!isActive) {
                try { window.location.hash = '#coordenacao'; } catch (e) { }
                try { window.location.reload(); } catch (e) { }
            }
        }, 300);
    } catch (err) {
        console.warn('Auto-login coord failed:', err);
    }
}

function deleteSchool(id) {
    if (confirm('Deseja realmente excluir esta escola?')) {
        registeredSchools = registeredSchools.filter(s => String(s.id) !== String(id) && String(s.code) !== String(id));
        syncWithBackend('schools', registeredSchools);
        renderSchools();
        populatePlanoEscolaDropdown();
        if (window.populateRegistrationSchools) window.populateRegistrationSchools();
        if (window.populateProfileSchoolDropdown) window.populateProfileSchoolDropdown();
        populateBoletimEscolaDropdown();
        showToast('Escola removida.', 'success');
    }
}

function deleteLab(labId) {
    showToast('A função de excluir almoxarifado foi desativada.', 'warning');
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
            opt.value = school.code || school.id || school.name;
            opt.textContent = school.name;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = currentVal; // restore selection
    }

    // Also populate datalist in add almox modal
    const vinculoDatalist = document.getElementById('escolas-vinculo-list');
    if (vinculoDatalist) {
        vinculoDatalist.innerHTML = '';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.name || school.code || school.id;
            vinculoDatalist.appendChild(opt);
        });
    }

    // Global filter based on logged user
    const registeredUserStr = localStorage.getItem('registeredUser');
    const coordSessionStr = sessionStorage.getItem('coordSession');
    let userSchoolCode = '';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            userSchoolCode = (user.instituicao || '').trim();
        } catch (e) { }
    }
    if (!userSchoolCode && coordSessionStr) {
        try {
            const coordSchool = JSON.parse(coordSessionStr);
            userSchoolCode = (coordSchool.code || '').trim();
        } catch (e) { }
    }
    userSchoolCode = getSchoolCode(userSchoolCode);

    // Filter labs by school if one is selected, OR if the user is locked to a school
    const labsToShow = registeredLabs.filter(l => {
        // First priority: If a specific school filter is selected in the dropdown, filter by that school
        if (selectedSchoolId) {
            return !l.schoolId || isSameSchool(l.schoolId, selectedSchoolId);
        }
        // Second priority: If user is logged in to a school, show their school's labs
        if (userSchoolCode) {
            return window.isLabAllowedForUser(l);
        }
        return true;
    });

    // If filtering and no results, show message
    if (labsToShow.length === 0) {
        const noResultMsg = document.createElement('div');
        noResultMsg.style.cssText = 'color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 20px; grid-column: 1/-1;';
        noResultMsg.textContent = 'Nenhum almoxarifado vinculado a esta escola no momento.';
        container.appendChild(noResultMsg);
    }

    // Render labs as 3D interactive doors
    labsToShow.forEach((lab, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'almox-door-wrapper';

        wrapper.innerHTML = `
            <div class="almox-door-plaque" title="${lab.name.toUpperCase()}">${lab.name.toUpperCase()}</div>
            <div class="almox-door-frame" onclick="openLab(${lab.id})">
                <div class="almox-door-interior"></div>
                <div class="almox-door-leaf">
                    <div class="almox-door-window">
                        <span class="almox-door-window-num">${index + 1}</span>
                    </div>
                    <div class="almox-door-bottom-panel"></div>
                    <div class="almox-door-handle"></div>
                </div>
            </div>
        `;
        container.appendChild(wrapper);
    });

    // Add the "+ CADASTRAR ALMOXARIFADO" door removed. Uses the green button above instead.
}

function openAddAlmoxarifadoModal() {
    document.getElementById('almox-name').value = '';
    const respEl = document.getElementById('almox-responsavel');
    if (respEl) respEl.value = '';
    document.getElementById('almox-sigla').value = '';

    // Populate school list
    const vinculoInput = document.getElementById('almox-escola-vinculo');
    const vinculoDatalist = document.getElementById('escolas-vinculo-list');
    if (vinculoDatalist) {
        vinculoDatalist.innerHTML = '';
        registeredSchools.forEach(school => {
            const opt = document.createElement('option');
            opt.value = school.name || school.code || school.id;
            vinculoDatalist.appendChild(opt);
        });
    }

    if (vinculoInput) {
        const filterSelect = document.getElementById('almox-filter-escola');
        const selectedFilter = filterSelect ? filterSelect.value : '';
        const registeredUserStr = localStorage.getItem('registeredUser');
        const coordSessionStr = sessionStorage.getItem('coordSession');
        let currentSchoolCode = selectedFilter || '';
        if (!currentSchoolCode && registeredUserStr) {
            try {
                const user = JSON.parse(registeredUserStr);
                currentSchoolCode = (user.instituicao || '').trim();
            } catch (e) { }
        }
        if (!currentSchoolCode && coordSessionStr) {
            try {
                const coordSchool = JSON.parse(coordSessionStr);
                currentSchoolCode = (coordSchool.code || coordSchool.name || '').trim();
            } catch (e) { }
        }
        vinculoInput.value = currentSchoolCode;
        vinculoInput.disabled = false;
    }

    document.getElementById('modal-add-almoxarifado').classList.add('active');
}

function handleAddAlmoxarifadoSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('almox-name').value.trim();
    const respEl = document.getElementById('almox-responsavel');
    const responsavel = respEl ? respEl.value.trim() : '';
    let finalSigla = document.getElementById('almox-sigla').value.trim().toUpperCase();
    const userSchool = window.getUserSchoolCode();
    const schoolId = document.getElementById('almox-escola-vinculo')?.value || userSchool || '';

    const newId = registeredLabs.length > 0 ? Math.max(...registeredLabs.map(l => l.id)) + 1 : 1;

    if (!finalSigla) {
        const words = name.split(' ').filter(w => w.length > 2 && !['LAB', 'ALMOXARIFADO', 'DE', 'DA', 'DO', 'DOS', 'DAS'].includes(w.toUpperCase()));
        if (words.length > 0) finalSigla = 'ALM-' + words.map(w => w.substring(0, 3).toUpperCase()).join('-');
        else finalSigla = `ALM-L${newId}`;
    }

    const newLab = {
        id: newId,
        name,
        responsavel,
        sigla: finalSigla,
        schoolId
    };

    registeredLabs.push(newLab);
    syncWithBackend('labs', registeredLabs);
    renderLabButtons();
    populatePlanoLocalDropdown();

    closeModal('modal-add-almoxarifado');
    showToast('Almoxarifado cadastrado com sucesso!', 'success');
}

function populatePlanoLocalDropdown(selectedSchoolCode) {
    const select = document.getElementById('plano-local-input');
    if (!select) return;
    select.innerHTML = '';

    let schoolCode = selectedSchoolCode;
    if (schoolCode === undefined) {
        const schoolInput = document.getElementById('plano-escola-input');
        schoolCode = schoolInput ? schoolInput.value : '';
    }

    if (!schoolCode) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Selecione uma escola aplicada primeiro';
        select.appendChild(opt);
        return;
    }
    const filteredLabs = registeredLabs.filter(lab => {
        return lab.schoolId && isSameSchool(lab.schoolId, schoolCode);
    });

    if (filteredLabs.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhum almoxarifado cadastrado nesta escola';
        select.appendChild(opt);
        return;
    }

    filteredLabs.forEach((lab, index) => {
        const opt = document.createElement('option');
        opt.value = lab.id;
        opt.textContent = `${index + 1}. ${lab.name}`;
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
        opt.textContent = school.sigla ? `${school.sigla} - ${school.name}` : (school.name || school.code);
        select.appendChild(opt);
    });

    // Auto-populate and lock for logged-in teacher
    const registeredUserStr = localStorage.getItem('registeredUser');
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            const userSchool = user.instituicao;
            if (userSchool) {
                let foundValue = null;
                for (let i = 0; i < select.options.length; i++) {
                    if (isSameSchool(select.options[i].value, userSchool)) {
                        foundValue = select.options[i].value;
                        break;
                    }
                }
                if (!foundValue) {
                    const schoolObj = registeredSchools.find(s => isSameSchool(s.code, userSchool) || isSameSchool(s.name, userSchool));
                    const opt = document.createElement('option');
                    opt.value = schoolObj ? schoolObj.code : userSchool;
                    opt.textContent = schoolObj ? (schoolObj.name || schoolObj.code) : userSchool;
                    select.appendChild(opt);
                    foundValue = opt.value;
                }
                select.value = foundValue;
                select.disabled = true;
            }
        } catch (e) { }
    }

    // Trigger update of local dropdown based on the school selected/locked
    populatePlanoLocalDropdown(select.value);
}
window.populatePlanoEscolaDropdown = populatePlanoEscolaDropdown;

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
        if (!window.isItemAllowedForUser(item)) return false;
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

        document.getElementById('btn-subtab-status').classList.remove('active');
        document.getElementById('btn-subtab-status').style.color = 'var(--text-muted)';
        document.getElementById('btn-subtab-status').style.borderBottom = 'none';

        contentMinhas.style.display = 'block';
        contentGerais.style.display = 'none';
        document.getElementById('subtab-content-status').style.display = 'none';
    } else if (tab === 'gerais') {
        btnGerais.classList.add('active');
        btnGerais.style.color = 'var(--primary-beige)';
        btnGerais.style.borderBottom = '2px solid var(--primary-beige)';

        btnMinhas.classList.remove('active');
        btnMinhas.style.color = 'var(--text-muted)';
        btnMinhas.style.borderBottom = 'none';

        document.getElementById('btn-subtab-status').classList.remove('active');
        document.getElementById('btn-subtab-status').style.color = 'var(--text-muted)';
        document.getElementById('btn-subtab-status').style.borderBottom = 'none';

        contentGerais.style.display = 'block';
        contentMinhas.style.display = 'none';
        document.getElementById('subtab-content-status').style.display = 'none';
    } else if (tab === 'status') {
        const btnStatus = document.getElementById('btn-subtab-status');
        btnStatus.classList.add('active');
        btnStatus.style.color = 'var(--primary-beige)';
        btnStatus.style.borderBottom = '2px solid var(--primary-beige)';

        btnMinhas.classList.remove('active');
        btnMinhas.style.color = 'var(--text-muted)';
        btnMinhas.style.borderBottom = 'none';

        btnGerais.classList.remove('active');
        btnGerais.style.color = 'var(--text-muted)';
        btnGerais.style.borderBottom = 'none';

        document.getElementById('subtab-content-status').style.display = 'block';
        contentMinhas.style.display = 'none';
        contentGerais.style.display = 'none';

        renderStatusBoletins();
    }
}

const orgInstructions = [
    {
        id: 1,
        title: "Descarte Seguro de Agulhas e Alfinetes",
        category: "seguranca",
        content: "1. Nunca descarte agulhas quebradas ou alfinetes tortos no lixo comum ou no chão.\n2. Utilize o coletor rígido amarelo de descarte perfurocortante localizado próximo à mesa de corte principal.\n3. Certifique-se de que a agulha substituta seja do calibre adequado para a máquina e tecido utilizados.\n4. Caso ocorra algum ferimento, utilize o kit de primeiros socorros e relate a ocorrência."
    },
    {
        id: 2,
        title: "Separação de Retalhos e Resíduos Têxteis",
        category: "residuos",
        content: "1. Separe os retalhos por tipo de fibra: naturais (algodão, linho) e sintéticos (poliéster, elastano).\n2. Retalhos maiores que 20x20cm devem ser colocados na caixa de doação para projetos sustentáveis e de artesanato.\n3. Fiapos, linhas e pequenos retalhos inutilizáveis devem ser descartados no container específico de reciclagem têxtil.\n4. Limpe a área de corte ao final do turno para evitar contaminação de cores e tecidos."
    },
    {
        id: 3,
        title: "Organização de Tesouras e Réguas",
        category: "ferramentas",
        content: "1. Todas as tesouras devem ser penduradas no painel de sombras ao final da aula de modelagem/corte.\n2. Verifique se o número da tesoura coincide com a marcação correspondente no painel.\n3. Réguas e fitas métricas devem ser limpas com álcool isopropílico antes de serem guardadas nas respectivas gavetas organizadoras.\n4. Comunique a ausência ou avaria de qualquer ferramenta imediatamente no formulário de Boletim."
    },
    {
        id: 4,
        title: "Senso de Limpeza (Seiso) nas Máquinas Industriais",
        category: "5s",
        content: "1. Limpe a caixa de bobina e a área dos dentes da máquina após o encerramento do uso.\n2. Utilize o pincel de limpeza para remover fiapos e resíduos de poeira acumulados na lançadeira.\n3. Desligue a máquina da tomada elétrica e certifique-se de recolher o pedal.\n4. Coloque a capa protetora de plástico para evitar acúmulo de poeira nos componentes mecânicos."
    },
    {
        id: 5,
        title: "Organização de Moldes de Papel Kraft",
        category: "residuos",
        content: "1. Identifique os moldes com o nome do aluno, curso, turma, data e nome da peça.\n2. Utilize fita crepe ou barbante para agrupar todas as partes do mesmo modelo.\n3. Pendure os moldes agrupados no cabideiro de modelagem usando ganchos tipo S.\n4. Moldes danificados ou antigos que não serão reutilizados devem ser descartados na lixeira azul de papel."
    },
    {
        id: 6,
        title: "Segurança na Área de Passadoria",
        category: "seguranca",
        content: "1. Mantenha o ferro de passar sempre na posição vertical quando não estiver em uso direto.\n2. Esvazie a água do reservatório do ferro a vapor ao final da aula para evitar acúmulo de minerais.\n3. Nunca deixe o ferro ligado sem supervisão; desligue-o imediatamente caso precise se afastar.\n4. Organize os cabos de alimentação de modo que não fiquem esticados ou no caminho de circulação de pessoas."
    },
    {
        id: 7,
        title: "Passos da Metodologia 5S no Ateliê",
        category: "5s",
        content: "1. Seiri (Senso de Utilização): Elimine do ateliê tudo o que não for ser utilizado na aula atual.\n2. Seiton (Senso de Ordenação): Defina um lugar para cada ferramenta (tesouras, giz, agulhas) e identifique as gavetas.\n3. Seiso (Senso de Limpeza): Limpe o chão recolhendo linhas e varrendo retalhos de tecidos após costurar.\n4. Seiketsu (Senso de Padronização): Crie padrões visuais (como placas e identificações) para o laboratório.\n5. Shitsuke (Senso de Disciplina): Mantenha a rotina e respeite as regras de organização coletivamente."
    }
];

let currentOrgSearch = '';
let currentOrgCategory = 'all';

function setupOrgFilters() {
    const searchInput = document.getElementById('org-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentOrgSearch = e.target.value.toLowerCase().trim();
            renderOrgPosts();
        });
    }

    const pillsContainer = document.getElementById('org-category-filters');
    if (pillsContainer) {
        const pills = pillsContainer.querySelectorAll('.org-filter-pill');
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentOrgCategory = pill.getAttribute('data-category');
                renderOrgPosts();
            });
        });
    }
}

function renderOrgPosts() {
    const container = document.getElementById('feed-posts-container');
    if (!container) return;
    container.innerHTML = '';

    let filtered = orgInstructions;

    if (currentOrgCategory && currentOrgCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentOrgCategory);
    }

    if (currentOrgSearch) {
        filtered = filtered.filter(p =>
            (p.title || '').toLowerCase().includes(currentOrgSearch) ||
            (p.content || '').toLowerCase().includes(currentOrgSearch)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum manual de organização encontrado.</div>`;
        return;
    }

    filtered.forEach(post => {
        const card = document.createElement('div');
        const cardCategory = post.category || '5s';
        card.className = `perfil-card feed-post-card org-card-${cardCategory}`;
        card.style.cssText = 'padding: 25px; display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border-color); background: var(--bg-card); transition: var(--transition-smooth);';

        const catMap = {
            '5s': { label: 'Metodologia 5S', badgeClass: 'org-badge-5s' },
            'residuos': { label: 'Resíduos & Retalhos', badgeClass: 'org-badge-residuos' },
            'seguranca': { label: 'Segurança & Descarte', badgeClass: 'org-badge-seguranca' },
            'ferramentas': { label: 'Ferramentas & Acessórios', badgeClass: 'org-badge-ferramentas' },
            'maquinas': { label: 'Máquinas & Equipamentos', badgeClass: 'org-badge-maquinas' }
        };
        const catInfo = catMap[post.category || '5s'] || { label: 'Metodologia 5S', badgeClass: 'org-badge-5s' };

        const lines = (post.content || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let contentHtml = '';
        if (lines.length > 0) {
            contentHtml = `<ul class="org-card-steps">`;
            lines.forEach((line, index) => {
                let cleanLine = line.replace(/^\d+[\.\-\s]*/, '').replace(/^[\-\*]\s*/, '');
                contentHtml += `
                    <li class="org-card-step-item">
                        <span class="org-card-step-num">${index + 1}</span>
                        <span>${cleanLine}</span>
                    </li>
                `;
            });
            contentHtml += `</ul>`;
        } else {
            contentHtml = `<p style="color: var(--text-light); font-size: 0.9rem; line-height: 1.6; margin-bottom: 15px;">${post.content}</p>`;
        }

        card.innerHTML = `
            <div class="feed-post-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div>
                    <span class="org-badge ${catInfo.badgeClass}" style="margin-bottom: 8px;">${catInfo.label}</span>
                    <h4 style="color: var(--text-light); font-family: var(--font-heading); margin: 0; font-size: 1.15rem; font-weight: 700; line-height: 1.3;">${post.title}</h4>
                </div>
            </div>
            
            <div style="flex-grow: 1;">
                ${contentHtml}
            </div>
            
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                SENAI Vestuário — Guia de Boas Práticas
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Custom Instructions Management ---
function getCustomInstructions() {
    try {
        return JSON.parse(localStorage.getItem('customOrgInstructions') || '[]');
    } catch (e) { return []; }
}

function saveCustomInstructions(list) {
    localStorage.setItem('customOrgInstructions', JSON.stringify(list));
}

window.toggleNovaInstrucaoForm = function() {
    const form = document.getElementById('form-nova-instrucao');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
    }
};

window.salvarNovaInstrucao = function() {
    const titulo = document.getElementById('instrucao-titulo');
    const categoria = document.getElementById('instrucao-categoria');
    const conteudo = document.getElementById('instrucao-conteudo');
    if (!titulo || !conteudo) return;

    const tituloVal = titulo.value.trim();
    const conteudoVal = conteudo.value.trim();
    if (!tituloVal || !conteudoVal) {
        showToast('Preencha o título e as instruções.', 'warning');
        return;
    }

    const custom = getCustomInstructions();
    const nextId = 1000 + custom.length;
    custom.push({
        id: nextId,
        title: tituloVal,
        category: categoria ? categoria.value : '5s',
        content: conteudoVal,
        isCustom: true,
        createdAt: new Date().toISOString()
    });
    saveCustomInstructions(custom);

    titulo.value = '';
    conteudo.value = '';
    document.getElementById('form-nova-instrucao').style.display = 'none';
    showToast('Instrução de organização criada com sucesso!', 'success');
    renderOrgPosts();
};

window.removerInstrucaoCustom = function(id) {
    let custom = getCustomInstructions();
    custom = custom.filter(c => c.id !== id);
    saveCustomInstructions(custom);
    showToast('Instrução removida.', 'info');
    renderOrgPosts();
};

// Patch renderOrgPosts to include custom instructions
const _originalRenderOrgPosts = renderOrgPosts;
renderOrgPosts = function() {
    const container = document.getElementById('feed-posts-container');
    if (!container) return;
    container.innerHTML = '';

    const custom = getCustomInstructions();
    const allInstructions = [...orgInstructions, ...custom];

    let filtered = allInstructions;

    if (currentOrgCategory && currentOrgCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentOrgCategory);
    }

    if (currentOrgSearch) {
        filtered = filtered.filter(p =>
            (p.title || '').toLowerCase().includes(currentOrgSearch) ||
            (p.content || '').toLowerCase().includes(currentOrgSearch)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 40px;">Nenhum manual de organização encontrado.</div>`;
        return;
    }

    filtered.forEach(post => {
        const card = document.createElement('div');
        const cardCategory = post.category || '5s';
        card.className = `perfil-card feed-post-card org-card-${cardCategory}`;
        card.style.cssText = 'padding: 25px; display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border-color); background: var(--bg-card); transition: var(--transition-smooth);';

        const catMap = {
            '5s': { label: 'Metodologia 5S', badgeClass: 'org-badge-5s' },
            'residuos': { label: 'Resíduos & Retalhos', badgeClass: 'org-badge-residuos' },
            'seguranca': { label: 'Segurança & Descarte', badgeClass: 'org-badge-seguranca' },
            'ferramentas': { label: 'Ferramentas & Acessórios', badgeClass: 'org-badge-ferramentas' },
            'maquinas': { label: 'Máquinas & Equipamentos', badgeClass: 'org-badge-maquinas' }
        };
        const catInfo = catMap[post.category || '5s'] || { label: 'Metodologia 5S', badgeClass: 'org-badge-5s' };

        const lines = (post.content || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let contentHtml = '';
        if (lines.length > 0) {
            contentHtml = `<ul class="org-card-steps">`;
            lines.forEach((line, index) => {
                let cleanLine = line.replace(/^\d+[\.\-\s]*/, '').replace(/^[\-\*]\s*/, '');
                contentHtml += `
                    <li class="org-card-step-item">
                        <span class="org-card-step-num">${index + 1}</span>
                        <span>${cleanLine}</span>
                    </li>
                `;
            });
            contentHtml += `</ul>`;
        } else {
            contentHtml = `<p style="color: var(--text-light); font-size: 0.9rem; line-height: 1.6; margin-bottom: 15px;">${post.content}</p>`;
        }

        const deleteBtn = post.isCustom ? `<button onclick="window.removerInstrucaoCustom(${post.id})" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">Remover</button>` : '';
        const customBadge = post.isCustom ? `<span style="background: rgba(0,92,169,0.15); color: #3a8ee6; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; margin-left: 8px;">PERSONALIZADO</span>` : '';

        card.innerHTML = `
            <div class="feed-post-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div>
                    <span class="org-badge ${catInfo.badgeClass}" style="margin-bottom: 8px;">${catInfo.label}</span>${customBadge}
                    <h4 style="color: var(--text-light); font-family: var(--font-heading); margin: 0; font-size: 1.15rem; font-weight: 700; line-height: 1.3; margin-top: 6px;">${post.title}</h4>
                </div>
                ${deleteBtn}
            </div>
            
            <div style="flex-grow: 1;">
                ${contentHtml}
            </div>
            
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                ${post.isCustom ? 'Instrução Personalizada' : 'SENAI Vestuário — Guia de Boas Práticas'}
            </div>
        `;
        container.appendChild(card);
    });
};

// Obsolete form handlers removed

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
        const durationMs = (plan.duracao || 2) * 60 * 60 * 1000;
        const planStart = plan.createdAt || plan.timestampInicio || Date.now();
        const planEnd = planStart + durationMs;

        if (plan.statusAula === 'em_andamento') {
            const [fimH, fimM] = (plan.horarioFim || "22:00").split(':').map(Number);
            const dNow = new Date();
            const currentMinutes = dNow.getHours() * 60 + dNow.getMinutes();
            const fimMinutes = fimH * 60 + fimM;
            
            const elapsedHours = (now - (plan.timestampInicio || planStart)) / 3600000;
            if (currentMinutes >= fimMinutes || elapsedHours >= (plan.duracao || 2)) {
                plan.statusAula = 'concluida';
                changed = true;
                showToast(`⏰ Aula "${plan.topic}" encerrada automaticamente após o horário previsto (${plan.horarioFim}). Sala liberada!`, 'info');
                if (typeof renderAcompanhamentoReal === 'function') renderAcompanhamentoReal();
                if (typeof renderLessonPlans === 'function') renderLessonPlans();
            }
        }

        if (now >= planEnd && !plan.expired) {
            plan.expired = true;
            changed = true;

            const planCode = plan.code || `PLAN-${String(plan.id).padStart(3, '0')}`;
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
    'roubo': { icon: '🚨', label: 'Roubo' },
    'furto': { icon: '🕵️', label: 'Furto' },
    'avaria': { icon: '⚠️', label: 'Avaria' },
    'extravio': { icon: '🔍', label: 'Extravio' },
    'naodevolvido': { icon: '⏳', label: 'Produto não devolvido' },
    'divergencia': { icon: '📊', label: 'Divergência de estoque' },
    'outros': { icon: '📝', label: 'Outros' }
};

function populateBoletimEscolaDropdown() {
    const select = document.getElementById('boletim-escola');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Selecione a escola...</option>';
    registeredSchools.forEach(school => {
        const opt = document.createElement('option');
        opt.value = school.code;
        opt.textContent = school.name || school.code;
        select.appendChild(opt);
    });

    // Auto populate and lock for logged-in teacher
    autoFillBoletimFormFields();
}

window.populateBoletimCursos = function() {
    const sel = document.getElementById('boletim-curso');
    if (!sel) return;
    const dados = getDiarioDados();
    if (!dados || !dados.turmas) return;
    
    sel.innerHTML = '<option value="">Selecione uma turma...</option>' + 
        dados.turmas.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');
    
    // Reset alunos
    window.populateBoletimAlunos();
};

window.populateBoletimAlunos = function() {
    const turmaId = document.getElementById('boletim-curso') ? document.getElementById('boletim-curso').value : null;
    const selectsAluno = document.querySelectorAll('.boletim-aluno-select');
    
    let optionsHTML = '<option value="">Selecione um aluno (escolha a turma primeiro)</option>';
    
    if (turmaId) {
        const dados = getDiarioDados();
        const alunosTurma = dados.alunos.filter(a => a.turmaId === turmaId);
        optionsHTML = '<option value="">Selecione um aluno...</option>' + 
            alunosTurma.map(a => `<option value="${a.nome}">${a.matricula} - ${a.nome}</option>`).join('');
    }
    
    selectsAluno.forEach(sel => {
        sel.innerHTML = optionsHTML;
    });
}

function autoFillBoletimFormFields() {
    const profInput = document.getElementById('boletim-professor');
    const selectEscola = document.getElementById('boletim-escola');
    const registeredUserStr = localStorage.getItem('registeredUser');

    let userSchool = '';
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            userSchool = user.instituicao || '';
            if (profInput) {
                profInput.value = user.name || 'Prof(a)';
                profInput.readOnly = true;
            }
            if (selectEscola && userSchool) {
                let foundValue = null;
                for (let i = 0; i < selectEscola.options.length; i++) {
                    if (isSameSchool(selectEscola.options[i].value, userSchool)) {
                        foundValue = selectEscola.options[i].value;
                        break;
                    }
                }
                if (!foundValue) {
                    const schoolObj = registeredSchools.find(s => isSameSchool(s.code, userSchool) || isSameSchool(s.name, userSchool));
                    const opt = document.createElement('option');
                    opt.value = schoolObj ? schoolObj.code : userSchool;
                    opt.textContent = schoolObj ? (schoolObj.name || schoolObj.code) : userSchool;
                    selectEscola.appendChild(opt);
                    foundValue = opt.value;
                }
                selectEscola.value = foundValue;
                selectEscola.disabled = true;
            }
        } catch (e) { }
    }

    const selectPlano = document.getElementById('boletim-plano-codigo');
    if (selectPlano && typeof lessonPlans !== 'undefined') {
        const curVal = selectPlano.value;
        selectPlano.innerHTML = '<option value="">-- Selecione um Plano de Aula --</option>';
        lessonPlans.forEach(p => {
            if (userSchool && p.escola && !isSameSchool(p.escola, userSchool)) {
                return; // Não exibir planos de outras escolas no Boletim
            }
            const code = p.code || `PLAN-${String(p.id).padStart(3, '0')}`;
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${code} - ${p.topic || p.course || 'Plano sem título'}`;
            selectPlano.appendChild(opt);
        });
        selectPlano.value = curVal;
    }

    const datalistOrigem = document.getElementById('boletim-origem-list');
    if (datalistOrigem && typeof registeredLabs !== 'undefined') {
        datalistOrigem.innerHTML = '';
        registeredLabs.forEach(l => {
            if (userSchool && l.schoolId && !isSameSchool(l.schoolId, userSchool)) {
                return; // Não exibir almoxarifados de outras escolas
            }
            const opt = document.createElement('option');
            opt.value = getLabDisplayName(l.id);
            datalistOrigem.appendChild(opt);
        });
    }
}

function handleBoletimPlanoChange() {
    const select = document.getElementById('boletim-plano-codigo');
    if (!select) return;
    const selectedVal = select.value;
    if (!selectedVal) return;
    const plan = lessonPlans.find(p => (p.code || `PLAN-${String(p.id).padStart(3, '0')}`) === selectedVal);
    if (plan && plan.local) {
        const origemInput = document.getElementById('boletim-origem');
        if (origemInput && !origemInput.value) {
            origemInput.value = getLabDisplayName(plan.local);
        }
    }
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
    
    // Populate curso/turma select
    window.populateBoletimCursos();

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

        // ─── 1. DADOS DA OCORRÊNCIA E LOCALIZAÇÃO ───
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('1. DADOS DA OCORRÊNCIA E LOCALIZAÇÃO', margin, y);
        y += 8;

        addRow('Código:', b.code, true);
        addRow('Data & Horário:', b.date + (b.timeOfDay ? ` às ${b.timeOfDay}` : ''));
        addRow('Lab. de Origem:', b.origem);
        addRow('Curso / Turma:', b.curso);
        addRow('Professor Responsável:', b.professor);

        const schoolObj = registeredSchools.find(s => isSameSchool(s.code || s.coordId || s.id || s.name, b.escolaCode));
        const schoolName = schoolObj ? schoolObj.name : (b.escolaCode || 'N/A');
        addRow('Escola / Instituição:', schoolName);
        y += 3;

        // ─── 2. IDENTIFICAÇÃO DO MATERIAL ───
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('2. IDENTIFICAÇÃO DO MATERIAL', margin, y);
        y += 8;

        addRow('Material / Equipamento:', b.material, true);
        addRow('Tipo de Material:', b.tipo);
        addRow('Cód. Plano de Aula:', b.planoCodigo || 'N/A');
        y += 3;

        // ─── 3. DETALHAMENTO DA OCORRÊNCIA ───
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('3. DETALHAMENTO DA OCORRÊNCIA', margin, y);
        y += 8;

        addRow('Situação Encontrada:', b.situacao, true);
        y += 2;

        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('Descrição da Ocorrência:', margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(44, 62, 80);
        const descLines = doc.splitTextToSize(b.descricao || 'Sem descrição', contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 4.5 + 5;

        // ─── 4. PERGUNTAS ESPECÍFICAS DA CATEGORIA (IF ANY) ───
        if (b.detalhesCategoria && Object.keys(b.detalhesCategoria).length > 0) {
            if (y > 250) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(211, 188, 162);
            doc.text('4. PERGUNTAS ESPECÍFICAS DA CATEGORIA', margin, y);
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
            y += 3;
        }

        // ─── 5. APURAÇÃO DE ESTOQUE ───
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('5. APURAÇÃO DE ESTOQUE', margin, y);
        y += 8;

        addRow('Qtd. Prevista no Estoque:', b.qtdPrevista);
        addRow('Qtd. Encontrada no Local:', b.qtdEncontrada);
        addRow('Diferença (Falta / Sobra):', b.qtdDiferenca, true);
        y += 3;

        // ─── 6. ENVOLVIDOS E AÇÕES TOMADAS ───
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(211, 188, 162);
        doc.text('6. ENVOLVIDOS E AÇÕES TOMADAS', margin, y);
        y += 8;

        addRow('Aluno / Envolvido:', b.aluno);
        addRow('Observações Adicionais:', b.observacoes);
        addRow('Medidas Tomadas:', b.medidas);
        y += 3;

        // ─── 7. PARECER / OBSERVAÇÃO DA COORDENAÇÃO ───
        let coordObs = null;
        if (b.statusHistory && b.statusHistory.length > 0) {
            const latestObsEntry = [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '');
            if (latestObsEntry) coordObs = latestObsEntry.observacao;
        }
        if (coordObs) {
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(211, 188, 162);
            doc.text('7. PARECER / OBSERVAÇÃO DA COORDENAÇÃO', margin, y);
            y += 8;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(44, 62, 80);
            const obsLines = doc.splitTextToSize(coordObs, contentWidth);
            doc.text(obsLines, margin, y);
            y += obsLines.length * 4.5 + 5;
        }

        // ─── AUTHORIZATION SEAL & ESTELA SIGNATURE ───
        if (y > 220) { doc.addPage(); y = 20; }
        y += 8;

        doc.setFillColor(250, 248, 245);
        doc.setDrawColor(211, 188, 162);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, contentWidth, 38, 3, 3, 'FD');

        function centerText(txt, yPos) {
            const w = doc.getTextWidth(txt);
            doc.text(txt, (pageWidth - w) / 2, yPos);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(180, 140, 95);
        centerText('DOCUMENTO REGISTRADO E AUTORIZADO PELO SENAI VEST', y + 10);

        doc.setFont('times', 'italic');
        doc.setFontSize(18);
        doc.setTextColor(80, 80, 80);
        centerText('Estela', y + 21);

        doc.setDrawColor(180, 140, 95);
        doc.setLineWidth(0.4);
        doc.line((pageWidth / 2) - 35, y + 24, (pageWidth / 2) + 35, y + 24);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(44, 62, 80);
        centerText('ESTELA AI ASSISTANT', y + 29);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        centerText('Coordenadora Pedagógica Virtual — SENAI VEST', y + 33);

        // ─── FOOTER ───
        const footerY = doc.internal.pageSize.getHeight() - 15;
        doc.setDrawColor(211, 188, 162);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('© 2026 SENAIVEST — Sistema de Controle de Almoxarifado - Laboratórios de Vestuário SENAI', margin, footerY);
        doc.text('Documento gerado e autenticado digitalmente pela Estela AI — SENAI VEST.', margin, footerY + 4);

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
    if (Date.now() - (window.lastLocalSyncTime || 0) < 6000) return; // Pausa sync após ação local
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
        if (data.boletins !== null) {
            const newHash = JSON.stringify(data.boletins);
            const oldHash = JSON.stringify(registeredBoletins);
            if (newHash !== oldHash) {
                registeredBoletins = data.boletins;
                localStorage.setItem('registeredBoletins', JSON.stringify(registeredBoletins));
                if (typeof renderRegisteredBoletins === 'function') renderRegisteredBoletins();
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
        if (data.labs !== null && Array.isArray(data.labs)) {
            const mergedLabs = mergeLabsList(registeredLabs, data.labs);
            const newHash = JSON.stringify(mergedLabs);
            const oldHash = JSON.stringify(registeredLabs);
            if (newHash !== oldHash) {
                registeredLabs = mergedLabs;
                localStorage.setItem('labs', JSON.stringify(registeredLabs));
                syncWithBackend('labs', registeredLabs);
                renderLabButtons();
            }
        }
        if (data.schools !== null) {
            const mergedSchools = mergeSchoolsList(registeredSchools, data.schools);
            const newHash = JSON.stringify(mergedSchools);
            const oldHash = JSON.stringify(registeredSchools);
            if (newHash !== oldHash) {
                registeredSchools = mergedSchools;
                localStorage.setItem('schools', JSON.stringify(registeredSchools));
                renderSchools();
                renderLabButtons(); // update school filter
                if (window.populateRegistrationSchools) window.populateRegistrationSchools();
                if (window.populateProfileSchoolDropdown) window.populateProfileSchoolDropdown();
                populateBoletimEscolaDropdown();
                populatePlanoEscolaDropdown();
            }
        }
        if (data.diario !== null) {
            const newHash = JSON.stringify(data.diario);
            const oldHash = localStorage.getItem(DIARIO_STORAGE_KEY) || '{}';
            if (newHash !== oldHash) {
                localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(data.diario));
                if (typeof renderDiarioCoordPanel === 'function' && document.getElementById('diario-coord-panel')) {
                    renderDiarioCoordPanel();
                }
            }
        }
        if (needsRender && currentLab) {
            renderInventory();
            updateDashboardStats();
        }
    } catch (e) {
        // offline, ignore
    }
}, 4000);

// ======================================================
// STATUS DE BOLETINS E TIMELINE VISUAL
// ======================================================

function renderStatusBoletins() {
    const container = document.getElementById('status-solicitacao-grid-container');
    if (!container) return;
    container.innerHTML = '';

    const registeredUserStr = localStorage.getItem('registeredUser');
    let currentUserEmail = '';
    if (registeredUserStr) {
        currentUserEmail = JSON.parse(registeredUserStr).email || '';
    }

    const minhasDenuncias = registeredBoletins.filter(b => b.createdBy === currentUserEmail);

    if (minhasDenuncias.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Nenhum boletim registrado por você para acompanhar.</div>`;
        return;
    }

    const sorted = [...minhasDenuncias].reverse();

    sorted.forEach(b => {
        const card = document.createElement('div');
        card.className = 'status-card';

        // Find current status badge class and emoji
        const statusMap = {
            'Enviado': { class: 'enviado', emoji: '📤' },
            'Em Análise': { class: 'em-analise', emoji: '🔍' },
            'Aprovada': { class: 'aprovada', emoji: '✅' },
            'Em Execução': { class: 'em-execucao', emoji: '⚙️' },
            'Concluída': { class: 'concluida', emoji: '🏁' },
            'Rejeitada': { class: 'rejeitada', emoji: '❌' },
            'Registrado': { class: 'enviado', emoji: '📤' } // Retrocompatibility
        };

        const currentStatusStr = b.status || 'Enviado';
        const stInfo = statusMap[currentStatusStr] || statusMap['Enviado'];

        card.innerHTML = `
            <div class="status-card-header">
                <h3>${b.code} <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: normal;">— ${b.material}</span></h3>
                <div class="status-badge ${stInfo.class}">
                    ${stInfo.emoji} ${currentStatusStr}
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
                Registrado em: <strong>${b.date}</strong> ${b.timeOfDay ? 'às ' + b.timeOfDay : ''}
            </div>
            ${(b.ultimaObservacao || (b.statusHistory && [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '')?.observacao)) ? `
                <div style="background: rgba(211, 188, 162, 0.15); border-left: 4px solid var(--primary-beige); padding: 12px; margin: 12px 0; border-radius: 4px; font-size: 0.9rem;">
                    <div style="font-weight: bold; color: var(--primary-beige); margin-bottom: 4px;">💬 Observação da Coordenação:</div>
                    <div style="color: var(--text-light); line-height: 1.4;">${b.ultimaObservacao || [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '')?.observacao}</div>
                </div>
            ` : ''}
            ${renderStatusTimeline(currentStatusStr)}
        `;

        container.appendChild(card);
    });
}

function renderStatusTimeline(currentStatus) {
    const steps = ['Enviado', 'Em Análise', 'Aprovada', 'Em Execução', 'Concluída'];
    const isRejected = currentStatus === 'Rejeitada';

    // Retrocompatibility for older saved items
    if (currentStatus === 'Registrado') currentStatus = 'Enviado';

    let currentIdx = steps.indexOf(currentStatus);
    if (isRejected) {
        currentIdx = 1; // Show rejection after analysis usually
    }

    let html = `<div class="status-timeline">`;

    steps.forEach((step, index) => {
        // Dot styles
        let dotClass = '';
        if (index < currentIdx && !isRejected) dotClass = 'completed';
        if (index === currentIdx && !isRejected) dotClass = 'active';

        // If rejected, override styles
        if (isRejected) {
            if (index < 1) dotClass = 'completed';
            else if (index === 1) dotClass = 'rejected';
        }

        const icon = index === 0 ? '📤' : index === 1 ? '🔍' : index === 2 ? '✅' : index === 3 ? '⚙️' : '🏁';
        const displayStep = (isRejected && index === 1) ? 'Rejeitada' : step;
        const displayIcon = (isRejected && index === 1) ? '❌' : icon;

        html += `
            <div class="timeline-step">
                <div class="timeline-dot ${dotClass}">${displayIcon}</div>
                <div class="timeline-label ${dotClass ? 'active' : ''}">${displayStep}</div>
            </div>
        `;

        // Line between dots
        if (index < steps.length - 1) {
            let lineClass = '';
            if (index < currentIdx && !isRejected) lineClass = 'completed';
            if (isRejected && index < 1) lineClass = 'completed';

            html += `<div class="timeline-line ${lineClass}"></div>`;
        }
    });

    html += `</div>`;
    return html;
}

// ======================================================
// COORDENAÇÃO PAINEL LOGIC
// ======================================================

function filterCoordBoletins(status) {
    document.querySelectorAll('.btn-coord-filter').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    renderCoordenacaoPainel(status);
}

function renderCoordenacaoPainel(filterStatus = 'todos') {
    const container = document.getElementById('coordenacao-boletins-container');
    if (!container) return;
    container.innerHTML = '';

    let activeBoletins = [...registeredBoletins];

    // Check if Coordination is logged in
    const coordSessionStr = sessionStorage.getItem('coordSession');
    const logoutCoordBtn = document.getElementById('btn-logout-coord');
    let coordSchoolCode = '';
    if (coordSessionStr) {
        if (logoutCoordBtn) logoutCoordBtn.style.display = 'block';
        const coordSchool = JSON.parse(coordSessionStr);
        coordSchoolCode = coordSchool.code || coordSchool.name || '';
        activeBoletins = activeBoletins.filter(b => !b.escolaCode || isSameSchool(b.escolaCode, coordSchoolCode));
        // Preencher informações da escola no topo do painel de coordenação
        try {
            const nameEl = document.getElementById('coord-school-name');
            const estadoEl = document.getElementById('coord-school-estado');
            const cidadeEl = document.getElementById('coord-school-cidade');
            const bairroEl = document.getElementById('coord-school-bairro');
            const coordIdEl = document.getElementById('coord-school-coordid');
            const siglaEl = document.getElementById('coord-school-sigla');
            if (nameEl) nameEl.textContent = coordSchool.name || '-';
            if (estadoEl) estadoEl.textContent = coordSchool.estado || (coordSchool.state || '-');
            if (cidadeEl) cidadeEl.textContent = coordSchool.city || coordSchool.cidade || '-';
            if (bairroEl) bairroEl.textContent = coordSchool.bairro || '-';
            if (coordIdEl) coordIdEl.textContent = coordSchool.coordId || coordSchool.id || '-';
            if (siglaEl) siglaEl.textContent = coordSchool.sigla || coordSchool.code || '-';
        } catch (e) { }
    } else {
        if (logoutCoordBtn) logoutCoordBtn.style.display = 'none';
    }

    // Renderizar Aulas Agendadas da Semana no Painel de Coordenação
    const aulasContainer = document.getElementById('coordenacao-aulas-semana');
    if (aulasContainer && typeof lessonPlans !== 'undefined') {
        aulasContainer.innerHTML = '';

        // Calculate current week boundaries (Monday to Sunday)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diaAtual = hoje.getDay(); // 0=Sun, 1=Mon, ...
        const diffSeg = diaAtual === 0 ? -6 : 1 - diaAtual;
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() + diffSeg);
        const fimSemana = new Date(inicioSemana);
        fimSemana.setDate(inicioSemana.getDate() + 6);
        fimSemana.setHours(23, 59, 59, 999);

        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

        // Format week range for header
        const fmtDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        const weekRangeText = `${fmtDate(inicioSemana)} a ${fmtDate(fimSemana)}`;

        // Filter plans to current week and school
        const schoolPlans = lessonPlans.filter(p => !coordSchoolCode || !p.escola || isSameSchool(p.escola, coordSchoolCode));
        const weekPlans = schoolPlans.filter(p => {
            if (!p.date) return false;
            const pDate = new Date(p.date + 'T12:00:00');
            return pDate >= inicioSemana && pDate <= fimSemana;
        });
        weekPlans.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

        // Week summary header
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'grid-column: 1/-1; background: rgba(52,152,219,0.08); border: 1px solid rgba(52,152,219,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;';
        summaryDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.3rem;">📆</span>
                <span style="font-weight: 700; color: var(--text-light); font-size: 0.95rem;">Semana: ${weekRangeText}</span>
            </div>
            <span style="background: rgba(52,152,219,0.2); color: #3498db; font-size: 0.85rem; padding: 4px 14px; border-radius: 20px; font-weight: 700;">${weekPlans.length} aula${weekPlans.length !== 1 ? 's' : ''} agendada${weekPlans.length !== 1 ? 's' : ''}</span>
        `;
        aulasContainer.appendChild(summaryDiv);

        if (weekPlans.length === 0) {
            aulasContainer.innerHTML += '<div style="color: var(--text-muted); font-size: 0.9rem; grid-column: 1/-1; text-align: center; padding: 15px;">Nenhuma aula agendada para esta semana.</div>';
        } else {
            weekPlans.forEach(p => {
                const card = document.createElement('div');
                card.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 6px; transition: transform 0.2s ease, border-color 0.2s ease;';

                let dateFormatted = p.date || 'Data não definida';
                let dayCountdownHtml = '';
                if (p.date) {
                    const parts = p.date.split('-');
                    if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;

                    const planDate = new Date(p.date + 'T12:00:00');
                    planDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.round((planDate - hoje) / (1000 * 60 * 60 * 24));
                    const diaSemana = diasSemana[planDate.getDay()];

                    let countdownText = '';
                    let countdownColor = '';
                    let countdownBg = '';
                    if (diffDays === 0) {
                        countdownText = '🔴 Hoje';
                        countdownColor = '#e74c3c';
                        countdownBg = 'rgba(231,76,60,0.15)';
                        card.style.borderColor = 'rgba(231,76,60,0.5)';
                        card.style.boxShadow = '0 0 8px rgba(231,76,60,0.15)';
                    } else if (diffDays === 1) {
                        countdownText = '🟡 Amanhã';
                        countdownColor = '#f39c12';
                        countdownBg = 'rgba(243,156,18,0.15)';
                    } else if (diffDays > 1) {
                        countdownText = `📅 Em ${diffDays} dias`;
                        countdownColor = '#3498db';
                        countdownBg = 'rgba(52,152,219,0.15)';
                    } else {
                        countdownText = `✅ Há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`;
                        countdownColor = '#2ecc71';
                        countdownBg = 'rgba(46,204,113,0.15)';
                    }
                    dayCountdownHtml = `<span style="background: ${countdownBg}; color: ${countdownColor}; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; font-weight: 700;">${countdownText}</span>`;
                }

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: var(--accent-blue); font-size: 0.85rem;">${p.code || 'PLAN-' + String(p.id).padStart(3, '0')}</span>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${dayCountdownHtml}
                            <span style="background: rgba(52,152,219,0.15); color: #3498db; font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 600;">🗓️ ${dateFormatted}</span>
                        </div>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${p.date ? diasSemana[new Date(p.date + 'T12:00:00').getDay()] : ''}</div>
                    <div style="font-weight: 600; color: var(--text-light); font-size: 0.95rem; margin-top: 4px;">${p.topic || p.course || 'Sem título'}</div>
                    <div style="font-size: 0.82rem; color: var(--text-muted);"><strong>Curso:</strong> ${p.course || '-'}</div>
                    <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
                        <span>${p.professor || 'Docente'}</span>
                        <span>${p.local ? getLabDisplayName(p.local) : (p.turno || '-')}</span>
                    </div>
                `;
                aulasContainer.appendChild(card);
            });
        }
    }

    // Update Stats
    const stats = {
        'Enviado': 0, 'Em Análise': 0, 'Aprovada': 0, 'Em Execução': 0, 'Concluída': 0, 'Rejeitada': 0, 'Registrado': 0
    };

    activeBoletins.forEach(b => {
        let st = b.status || 'Enviado';
        if (st === 'Registrado') st = 'Enviado';
        if (stats[st] !== undefined) stats[st]++;
    });

    document.getElementById('coord-stat-enviado').textContent = stats['Enviado'] + stats['Registrado'];
    document.getElementById('coord-stat-analise').textContent = stats['Em Análise'];
    document.getElementById('coord-stat-aprovada').textContent = stats['Aprovada'];
    document.getElementById('coord-stat-execucao').textContent = stats['Em Execução'];
    document.getElementById('coord-stat-concluida').textContent = stats['Concluída'];
    document.getElementById('coord-stat-rejeitada').textContent = stats['Rejeitada'];

    let filtered = [...activeBoletins].reverse();
    if (filterStatus !== 'todos') {
        filtered = filtered.filter(b => {
            const s = b.status || 'Enviado';
            return s === filterStatus || (filterStatus === 'Enviado' && s === 'Registrado');
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); background: var(--bg-card); border-radius: var(--border-radius-card); border: 1px dashed var(--border-color);">Nenhum boletim encontrado com este status.</div>`;
        return;
    }

    filtered.forEach(b => {
        const st = b.status || 'Enviado';
        const card = document.createElement('div');
        card.className = 'coord-boletim-card';

        let actionButtons = '';
        if (st === 'Enviado' || st === 'Registrado') {
            actionButtons = `<button class="btn-coord-action analise" onclick="promptStatusUpdate(${b.id}, 'Em Análise')">🔍 Analisar</button>`;
        } else if (st === 'Em Análise') {
            actionButtons = `
                <button class="btn-coord-action aprovar" onclick="promptStatusUpdate(${b.id}, 'Aprovada')">✅ Aprovar</button>
                <button class="btn-coord-action rejeitar" onclick="promptStatusUpdate(${b.id}, 'Rejeitada')">❌ Rejeitar</button>
            `;
        } else if (st === 'Aprovada') {
            actionButtons = `<button class="btn-coord-action executar" onclick="promptStatusUpdate(${b.id}, 'Em Execução')">⚙️ Iniciar Execução</button>`;
        } else if (st === 'Em Execução') {
            actionButtons = `<button class="btn-coord-action concluir" onclick="promptStatusUpdate(${b.id}, 'Concluída')">🏁 Concluir</button>`;
        }

        const schoolObj = registeredSchools.find(s => s.code === b.escolaCode);
        const schoolName = schoolObj ? schoolObj.name : 'N/A';
        const obsAtual = b.ultimaObservacao || (b.statusHistory && [...b.statusHistory].reverse().find(h => h.observacao && h.observacao.trim() !== '')?.observacao) || '';

        card.innerHTML = `
            <div class="coord-card-top" style="background: rgba(255,255,255,0.02); padding: 18px; border-radius: 8px; border-left: 4px solid var(--primary-beige); margin-bottom: 15px;">
                <div class="coord-card-info" style="flex-grow: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <h3 style="margin: 0; font-size: 1.3rem; color: #fff; font-weight: 700;">${b.code}</h3>
                            <span class="status-badge status-${st.toLowerCase().replace(/\s+/g, '-')}" style="padding: 5px 12px; font-size: 0.8rem; border-radius: 20px; font-weight: bold;">${st}</span>
                        </div>
                        <span style="background: rgba(211, 188, 162, 0.2); color: var(--primary-beige); padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">📁 ${b.categoria || 'N/A'}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 0.95rem;">
                        <div><span style="color: var(--text-muted);">Professor:</span> <strong style="color: #fff;">${b.professor}</strong></div>
                        <div><span style="color: var(--text-muted);">Escola:</span> <strong style="color: #fff;">${schoolName}</strong></div>
                        <div><span style="color: var(--text-muted);">Material:</span> <strong style="color: var(--primary-beige);">${b.material}</strong></div>
                        <div><span style="color: var(--text-muted);">Emissão:</span> <strong style="color: #fff;">${b.date} ${b.timeOfDay || ''}</strong></div>
                    </div>
                </div>
                <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                    <button class="btn-view-boletim" onclick="openBoletimDetailsModal(${b.id})" style="background: #2c3e50; color: #fff; padding: 8px 16px; border-radius: 6px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: 0.2s;">📄 Ver Detalhes Completo</button>
                </div>
            </div>
            <div style="padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <label style="display: block; font-size: 0.85rem; font-weight: bold; color: var(--primary-beige); margin-bottom: 8px;">💬 Observação para o Professor (Visível no portal do docente):</label>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <textarea id="coord-obs-${b.id}" class="coord-obs-input" placeholder="Digite uma observação, orientação ou justificativa para o professor..." style="flex-grow: 1; min-height: 60px; background: #15191d; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 10px;">${obsAtual}</textarea>
                    <button class="btn-coord-action" onclick="saveCoordObsOnly(${b.id})" style="background: #27ae60 !important; color: #fff; font-weight: bold; padding: 10px 18px; border-radius: 6px; align-self: flex-start; margin: 0; cursor: pointer;">💾 Salvar Obs</button>
                </div>
                <div class="coord-actions" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${actionButtons ? actionButtons : '<span style="color: var(--text-muted); font-size: 0.9rem;">✔️ Fluxo finalizado para este boletim.</span>'}
                    </div>
                    <button class="btn-coord-action rejeitar" onclick="deleteBoletimCoord(${b.id})" style="background: linear-gradient(135deg, #c0392b, #922b21) !important; margin: 0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:text-bottom; margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Excluir</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    if (window.renderRecursosSurvey) window.renderRecursosSurvey();
}

window.saveCoordObsOnly = async function (boletimId) {
    const obsInput = document.getElementById(`coord-obs-${boletimId}`);
    const observacao = obsInput ? obsInput.value.trim() : '';
    const b = registeredBoletins.find(item => item.id === boletimId);
    if (!b) return;
    b.ultimaObservacao = observacao;
    if (!b.statusHistory) b.statusHistory = [];
    b.statusHistory.push({
        from: b.status || 'Enviado',
        to: b.status || 'Enviado',
        date: new Date().toISOString(),
        observacao: observacao,
        updatedBy: 'Coordenação SENAI'
    });
    syncWithBackend('boletins', registeredBoletins);
    showToast('Observação salva e visível para o professor com sucesso!', 'success');
};

function deleteBoletimCoord(id) {
    if (!confirm('Deseja realmente excluir este boletim? Esta ação não pode ser desfeita.')) return;
    registeredBoletins = registeredBoletins.filter(b => b.id !== id);
    syncWithBackend('boletins', registeredBoletins);
    renderCoordenacaoPainel();
    showToast('Boletim excluído com sucesso.', 'success');
}

async function promptStatusUpdate(boletimId, newStatus) {
    const obsInput = document.getElementById(`coord-obs-${boletimId}`);
    const observacao = obsInput ? obsInput.value.trim() : '';

    if (!confirm(`Deseja alterar o status do boletim para "${newStatus}"?`)) return;

    const b = registeredBoletins.find(item => item.id === boletimId);
    if (!b) return;

    const oldStatus = b.status || 'Enviado';
    b.status = newStatus;
    if (observacao) b.ultimaObservacao = observacao;

    if (!b.statusHistory) b.statusHistory = [];
    b.statusHistory.push({
        from: oldStatus,
        to: newStatus,
        date: new Date().toISOString(),
        observacao: observacao,
        updatedBy: 'Coordenação SENAI'
    });

    // Save locally
    syncWithBackend('boletins', registeredBoletins);
    renderCoordenacaoPainel();
    renderStatusBoletins();

    showToast(`Status atualizado para ${newStatus}`, 'success');
    addNotification('info', 'Status Atualizado', `Boletim ${b.code} alterado para ${newStatus}.`);

    // Call API to send Email Notification
    if (b.createdBy && b.createdBy.includes('@')) {
        try {
            await fetch('/api/send-status-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    boletim: b,
                    toEmail: b.createdBy,
                    newStatus: newStatus,
                    observacao: observacao
                })
            });
        } catch (e) {
            console.warn('Servidor offline para notificação de status:', e);
        }
    }
}

// ======================================================
// MEUS CURSOS DYNAMIC TRAINING AND CERTIFICATION LOGIC
// ======================================================

const COURSE_QUESTIONS = {
    module1: {
        id: "module1",
        question: "Qual é a principal função da Estela, a assistente virtual integrada no SENAI VEST?",
        options: [
            { id: "A", text: "Gerar relatórios financeiros automáticos para a coordenação." },
            { id: "B", text: "Auxiliar os professores em dúvidas sobre costura, modelagem e uso do painel." },
            { id: "C", text: "Fazer chamadas automáticas para os alunos faltosos." },
            { id: "D", text: "Configurar as máquinas de costura fisicamente no laboratório." }
        ],
        correctAnswer: "B"
    },
    // Módulo 2: 3 aulas, cada uma com 2 perguntas de quiz
    module2: {
        lesson1: [
            {
                // Multipla escolha — similar à Q1 do gabarito
                question: "Como um usuário pode cadastrar um novo item no Almoxarifado da plataforma SENAIVEST?",
                options: [
                    { id: "A", text: "Acessando a seção 'Meu Perfil' e selecionando 'Adicionar Item'." },
                    { id: "B", text: "Navegando até a seção 'Almoxarifado' e utilizando a opção 'Cadastrar Novo Item'." },
                    { id: "C", text: "Enviando um e-mail para o suporte da plataforma com os detalhes do item." },
                    { id: "D", text: "Utilizando a funcionalidade 'Guia de Organização' para inserir o item." }
                ],
                correctAnswer: "B"
            },
            {
                // Dissertativa — resposta aberta sobre o almoxarifado
                type: "text",
                question: "Em suas próprias palavras, explique por que é importante registrar a retirada de materiais no Almoxarifado Virtual ao invés de apenas fazer o controle físico.",
                minLength: 20
            }
        ],
        lesson2: [
            {
                // Multipla escolha — similar à Q2 do gabarito
                question: "Qual o procedimento correto para registrar um Boletim de Ocorrência na plataforma?",
                options: [
                    { id: "A", text: "Clicar em 'Notificação 1' e preencher o formulário de ocorrência." },
                    { id: "B", text: "Acessar a seção 'Boletim' e selecionar a opção 'Registrar Nova Ocorrência'." },
                    { id: "C", text: "Entrar em contato com a 'Estela (IA)' e relatar o incidente." },
                    { id: "D", text: "Utilizar a 'Aba Geral' para encontrar o link de registro." }
                ],
                correctAnswer: "B"
            },
            {
                // Multipla escolha — similar à Q3 do gabarito
                question: "Para verificar as ocorrências que foram registradas na plataforma, qual seção deve ser acessada?",
                options: [
                    { id: "A", text: "'Meus Cursos'." },
                    { id: "B", text: "'Plano de Aula'." },
                    { id: "C", text: "'Ocorrências' (Boletim de Ocorrência)." },
                    { id: "D", text: "'Almoxarifado'." }
                ],
                correctAnswer: "C"
            }
        ],
        lesson3: [
            {
                // Multipla escolha — similar à Q4 do gabarito
                question: "Como um professor pode montar um Plano de Aula utilizando a plataforma SENAIVEST?",
                options: [
                    { id: "A", text: "Através da seção 'Perfil', editando as informações pessoais." },
                    { id: "B", text: "Acessando a funcionalidade 'Plano de Aula' e seguindo as etapas de criação." },
                    { id: "C", text: "Clicando em 'Mural de Organização' e adicionando um novo plano." },
                    { id: "D", text: "Solicitando à 'Estela (IA)' que gere um plano de aula automaticamente." }
                ],
                correctAnswer: "B"
            },
            {
                // Dissertativa — resposta aberta sobre login/cadastro
                type: "text",
                question: "Descreva brevemente qual é a primeira etapa para um novo usuário se cadastrar na plataforma SENAIVEST e qual informação é essencial para realizar o login.",
                minLength: 20
            }
        ]
    },
    exam: [
        {
            question: "1. Como um usuário pode cadastrar um novo item no Almoxarifado da plataforma SENAIVEST?",
            options: [
                { id: "A", text: "Acessando a seção 'Meu Perfil' e selecionando 'Adicionar Item'." },
                { id: "B", text: "Navegando até a seção 'Almoxarifado' e utilizando a opção 'Cadastrar Novo Item'." },
                { id: "C", text: "Enviando um e-mail para o suporte da plataforma com os detalhes do item." },
                { id: "D", text: "Utilizando a funcionalidade 'Guia de Organização' para inserir o item." }
            ],
            correctAnswer: "B"
        },
        {
            question: "2. Qual o procedimento correto para registrar um Boletim de Ocorrência na plataforma?",
            options: [
                { id: "A", text: "Clicar em 'Notificação 1' e preencher o formulário de ocorrência." },
                { id: "B", text: "Acessar a seção 'Boletim' e selecionar a opção 'Registrar Nova Ocorrência'." },
                { id: "C", text: "Entrar em contato com a 'Estela (IA)' e relatar o incidente." },
                { id: "D", text: "Utilizar a 'Aba Geral' para encontrar o link de registro." }
            ],
            correctAnswer: "B"
        },
        {
            question: "3. Para verificar as ocorrências que foram geradas na plataforma, qual seção deve ser acessada?",
            options: [
                { id: "A", text: "'Meus Cursos'." },
                { id: "B", text: "'Plano de Aula'." },
                { id: "C", text: "'Ocorrências' (Boletim de Ocorrência)." },
                { id: "D", text: "'Almoxarifado'." }
            ],
            correctAnswer: "C"
        },
        {
            question: "4. Como um professor pode montar um Plano de Aula utilizando a plataforma SENAIVEST?",
            options: [
                { id: "A", text: "Através da seção 'Perfil', editando as informações pessoais." },
                { id: "B", text: "Acessando a funcionalidade 'Plano de Aula' e seguindo as etapas de criação." },
                { id: "C", text: "Clicando em 'Mural de Organização' e adicionando um novo plano." },
                { id: "D", text: "Solicitando à 'Estela (IA)' que gere um plano de aula automaticamente." }
            ],
            correctAnswer: "B"
        },
        {
            question: "5. Qual a primeira etapa para um novo usuário se cadastrar na plataforma SENAIVEST?",
            options: [
                { id: "A", text: "Clicar no botão 'ENTRAR NO SISTEMA' e depois em 'Esqueci minha senha'." },
                { id: "B", text: "Clicar em 'Cadastre-se' na página inicial e preencher os dados pessoais." },
                { id: "C", text: "Acessar a seção 'Registrar Escola' e criar uma conta de coordenação." },
                { id: "D", text: "Enviar um e-mail para o administrador da plataforma solicitando acesso." }
            ],
            correctAnswer: "B"
        },
        {
            question: "6. Se uma escola ainda não está registrada na plataforma, qual opção deve ser utilizada?",
            options: [
                { id: "A", text: "'Fazer Login' e tentar entrar com um e-mail de coordenação." },
                { id: "B", text: "'Cadastre-se' e preencher os dados do professor." },
                { id: "C", text: "'Registrar Escola' na página de cadastro de professor." },
                { id: "D", text: "'Conversar com a Estela (IA)' para obter o link de registro." }
            ],
            correctAnswer: "C"
        },
        {
            question: "7. Qual informação é essencial para realizar o login na plataforma SENAIVEST?",
            options: [
                { id: "A", text: "Apenas o nome completo do usuário." },
                { id: "B", text: "E-mail e senha cadastrados." },
                { id: "C", text: "Número de telefone e data de nascimento." },
                { id: "D", text: "Cargo ou função e instituição de ensino." }
            ],
            correctAnswer: "B"
        },
        {
            question: "8. A funcionalidade 'Conversar com a Estela (IA)' é utilizada para qual propósito principal?",
            options: [
                { id: "A", text: "Registrar novos itens no almoxarifado." },
                { id: "B", text: "Obter suporte e ajuda com o uso da plataforma." },
                { id: "C", text: "Cadastrar novas escolas e coordenadores." },
                { id: "D", text: "Gerar relatórios de ocorrências automaticamente." }
            ],
            correctAnswer: "B"
        },
        {
            question: "9. Para acessar as diferentes seções do menu lateral (Almoxarifado, Boletim, Plano de Aula), qual botão deve ser acionado?",
            options: [
                { id: "A", text: "O botão 'ENTRAR NO SISTEMA'." },
                { id: "B", text: "O botão 'Cadastre-se'." },
                { id: "C", text: "O botão 'Abrir Menu' (ícone de menu)." },
                { id: "D", text: "O botão 'Falar com a Estela'." }
            ],
            correctAnswer: "C"
        },
        {
            question: "10. Onde um usuário pode visualizar e editar suas informações pessoais na plataforma SENAIVEST?",
            options: [
                { id: "A", text: "Na seção 'Aba Geral'." },
                { id: "B", text: "Na seção 'Meus Cursos'." },
                { id: "C", text: "Na seção 'Perfil' ou 'Meu Perfil'." },
                { id: "D", text: "Na seção 'Guia de Organização'." }
            ],
            correctAnswer: "C"
        }
    ]
};

let currentPlayingModule = null;
let videoTimerInterval = null;
const videoDuration = 15; // 15 seconds
let videoCurrentTime = 0;
let isVideoPlaying = false;

let currentQuizModule = null;       // e.g. 'module1', 'module2-lesson1', 'exam'
let currentQuizQuestionIndex = 0;   // 0 or 1 for 2-question lessons
let selectedAnswers = {};

function getCourseProgressKey() {
    const registeredUserStr = localStorage.getItem('registeredUser');
    if (registeredUserStr) {
        try {
            const user = JSON.parse(registeredUserStr);
            if (user.email) return 'senai_cursos_progress_' + user.email;
        } catch (e) { }
    }
    return 'senai_cursos_progress_global';
}

function loadCourseProgress() {
    const key = getCourseProgressKey();
    const defaultProgress = {
        module1: { videoWatched: false, quizPassed: false },
        module2: {
            lesson1: { videoWatched: false, quizPassed: false },
            lesson2: { videoWatched: false, quizPassed: false },
            lesson3: { videoWatched: false, quizPassed: false }
        },
        examPassed: false
    };
    try {
        const progressStr = localStorage.getItem(key);
        if (!progressStr) return defaultProgress;
        const saved = JSON.parse(progressStr);
        // Migrate old format (flat module2) to new sub-lesson format
        if (saved.module2 && typeof saved.module2.quizPassed !== 'undefined') {
            const wasCompleted = saved.module2.quizPassed;
            saved.module2 = {
                lesson1: { videoWatched: wasCompleted, quizPassed: wasCompleted },
                lesson2: { videoWatched: wasCompleted, quizPassed: wasCompleted },
                lesson3: { videoWatched: wasCompleted, quizPassed: wasCompleted }
            };
        }
        // Ensure sub-lesson keys exist
        if (!saved.module2 || !saved.module2.lesson1) saved.module2 = defaultProgress.module2;
        return saved;
    } catch (e) {
        return defaultProgress;
    }
}

function saveCourseProgress(progress) {
    const key = getCourseProgressKey();
    localStorage.setItem(key, JSON.stringify(progress));

    // If exam is passed, update user.isCertified = true
    if (progress.examPassed) {
        const registeredUserStr = localStorage.getItem('registeredUser');
        if (registeredUserStr) {
            try {
                const user = JSON.parse(registeredUserStr);
                user.isCertified = true;
                localStorage.setItem('registeredUser', JSON.stringify(user));
                updateUserUI(user);

                // Update Backend
                fetch('/api/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(user)
                }).catch(() => { });
            } catch (e) { }
        }
    }

    renderCourseUI();
}

function isModule2Complete(progress) {
    return progress.module2.lesson1.quizPassed &&
        progress.module2.lesson2.quizPassed &&
        progress.module2.lesson3.quizPassed;
}

function renderLessonSteps(lessonKey, lessonLabel, lessonIcon, lessonTitle, lessonDesc, locked, progress) {
    const lp = progress.module2[lessonKey];
    const prevPassed = lessonKey === 'lesson1'
        ? true
        : (lessonKey === 'lesson2' ? progress.module2.lesson1.quizPassed : progress.module2.lesson2.quizPassed);
    const isLocked = locked || !prevPassed;
    const isCompleted = lp.quizPassed;
    const cardClass = isLocked ? 'locked' : (isCompleted ? 'completed' : 'in-progress');
    const statusClass = isLocked ? 'status-locked' : (isCompleted ? 'status-completed' : 'status-pending');
    const statusLabel = isLocked ? 'Bloqueado' : (isCompleted ? 'Concluída' : (lp.videoWatched ? 'Responder Quiz' : 'Pendente'));
    const moduleArg = `'module2-${lessonKey}'`;

    const videoLinks = {
        'lesson1': 'https://drive.google.com/file/d/14givPUt3AqeIhOMKKVL8mnLmzQiJg3f1/preview',
        'lesson2': 'https://drive.google.com/file/d/16n7kNqKSCIoikut5b9VZ9NdzZZBF7eRm/preview',
        'lesson3': 'https://drive.google.com/file/d/196pBa6cFbISOLcLWBZoDUNiM5CuYSLm0/preview'
    };
    const inlineVideoUrl = videoLinks[lessonKey];

    return `
        <div class="curso-modulo-card ${cardClass}" style="margin-top: 0;">
            <div class="modulo-icon">${lessonIcon}</div>
            <span class="modulo-status-badge ${statusClass}">${statusLabel}</span>
            <h3 class="modulo-title" style="font-size:1rem;">${lessonTitle}</h3>
            <p class="modulo-desc" style="font-size:0.8rem;">${lessonDesc}</p>
        </div>
    `;
}

window.selectCourseLesson = function(key) {
    window.activeCourseLesson = key;
    renderCourseUI();
};

window.triggerLessonQuiz = function(lessonKey, quizModuleId) {
    openQuizModal(quizModuleId);
};

window.toggleCourseModule = function(modKey) {
    if (window.expandedCourseModule === modKey) {
        window.expandedCourseModule = '';
    } else {
        window.expandedCourseModule = modKey;
    }
    renderCourseUI();
};

window.finishVideoLesson = function(lessonKey) {
    const progress = loadCourseProgress();
    let modKeyForQuiz = 'module1';
    if (lessonKey === 'module1') {
        progress.module1.videoWatched = true;
        modKeyForQuiz = 'module1';
    } else if (lessonKey === 'lesson1') {
        progress.module2.lesson1.videoWatched = true;
        modKeyForQuiz = 'module2-lesson1';
    } else if (lessonKey === 'lesson2') {
        progress.module2.lesson2.videoWatched = true;
        modKeyForQuiz = 'module2-lesson2';
    } else if (lessonKey === 'lesson3') {
        progress.module2.lesson3.videoWatched = true;
        modKeyForQuiz = 'module2-lesson3';
    }
    saveCourseProgress(progress);
    showToast('📺 Aula concluída! Vamos ao quiz de fixação.', 'success');
    renderCourseUI();
    setTimeout(() => {
        openQuizModal(modKeyForQuiz);
    }, 400);
};

window.handleCourseFeedback = function(lessonKey, type) {
    const defaultFb = {
        'module1': { likes: 0, dislikes: 0 },
        'lesson1': { likes: 0, dislikes: 0 },
        'lesson2': { likes: 0, dislikes: 0 },
        'lesson3': { likes: 0, dislikes: 0 },
        'exam': { likes: 0, dislikes: 0 }
    };
    let fb = JSON.parse(localStorage.getItem('courseFeedbackCounts')) || defaultFb;
    if (!localStorage.getItem('realFeedbackResetDone_v3')) {
        fb = defaultFb;
        localStorage.setItem('courseFeedbackCounts', JSON.stringify(fb));
        localStorage.setItem('realFeedbackResetDone_v3', 'true');
    }
    let userVotes = JSON.parse(localStorage.getItem('courseUserVotes')) || {};
    if (!fb[lessonKey]) fb[lessonKey] = { likes: 0, dislikes: 0 };
    
    if (userVotes[lessonKey] === type) {
        fb[lessonKey][type + 's'] = Math.max(0, fb[lessonKey][type + 's'] - 1);
        userVotes[lessonKey] = null;
        showToast('Feedback removido.', 'info');
    } else {
        if (userVotes[lessonKey]) {
            fb[lessonKey][userVotes[lessonKey] + 's'] = Math.max(0, fb[lessonKey][userVotes[lessonKey] + 's'] - 1);
        }
        fb[lessonKey][type + 's']++;
        userVotes[lessonKey] = type;
        showToast('Obrigado pelo seu feedback!', 'success');
    }
    localStorage.setItem('courseFeedbackCounts', JSON.stringify(fb));
    localStorage.setItem('courseUserVotes', JSON.stringify(userVotes));
    renderCourseUI();
};

function renderCourseUI() {
    const container = document.getElementById('cursos-dashboard-container');
    if (!container) return;

    const progress = loadCourseProgress();
    const mod2Done = isModule2Complete(progress);

    let pct = 0;
    if (progress.module1.videoWatched) pct += 10;
    if (progress.module1.quizPassed) pct += 10;
    ['lesson1', 'lesson2', 'lesson3'].forEach(l => {
        if (progress.module2[l].videoWatched) pct += 5;
        if (progress.module2[l].quizPassed) pct += 5;
    });
    if (progress.examPassed) pct += 50;

    const mod2Locked = false;
    const examLocked = false;

    window.activeCourseLesson = window.activeCourseLesson || 'module1';
    window.expandedCourseModule = window.expandedCourseModule || 'mod1';

    const lessonsData = {
        'module1': {
            title: 'Conhecendo a Plataforma SENAI VEST',
            modName: 'Módulo 1: Conhecendo a Plataforma',
            duration: '15:30',
            videoUrl: 'https://drive.google.com/file/d/1xqD-xDeC-YM6d_7czC8Ia_5VHnGmQw0D/preview',
            desc: 'Assista ao vídeo introdutório e conheça os fluxos gerais, navegação e objetivos da plataforma.',
            transcricao: 'Bem-vindas e bem-vindos ao SENAI VEST. Nesta primeira aula, vamos explorar a interface principal, entender como navegar entre os menus e descobrir o papel fundamental da padronização 5S e gestão nos laboratórios de vestuário.',
            quizKey: 'module1',
            isWatched: progress.module1.videoWatched,
            isPassed: progress.module1.quizPassed
        },
        'lesson1': {
            title: 'Almoxarifado Virtual',
            modName: 'Módulo 2: Recursos da Plataforma',
            duration: '10:17',
            videoUrl: 'https://drive.google.com/file/d/14givPUt3AqeIhOMKKVL8mnLmzQiJg3f1/preview',
            desc: 'Aprenda a registrar retiradas de materiais, consultar o inventário em tempo real e gerenciar entradas no estoque.',
            transcricao: 'O Almoxarifado Virtual permite o controle rigoroso de tecidos, linhas, agulhas e ferramentas. Você aprenderá como dar baixa em itens utilizados nas aulas práticas e verificar alertas de estoque mínimo.',
            quizKey: 'module2-lesson1',
            isWatched: progress.module2.lesson1.videoWatched,
            isPassed: progress.module2.lesson1.quizPassed
        },
        'lesson2': {
            title: 'Boletins de Ocorrência',
            modName: 'Módulo 2: Recursos da Plataforma',
            duration: '12:45',
            videoUrl: 'https://drive.google.com/file/d/16n7kNqKSCIoikut5b9VZ9NdzZZBF7eRm/preview',
            desc: 'Entenda o passo a passo para registrar avarias, quebras de máquinas ou extravios no sistema digital.',
            transcricao: 'Quando uma máquina de costura apresenta defeito ou um equipamento é avariado, o professor deve abrir um Boletim de Denúncia/Ocorrência imediatamente. Veja como preencher os campos e acompanhar a análise da coordenação.',
            quizKey: 'module2-lesson2',
            isWatched: progress.module2.lesson2.videoWatched,
            isPassed: progress.module2.lesson2.quizPassed
        },
        'lesson3': {
            title: 'Planos de Aula',
            modName: 'Módulo 2: Recursos da Plataforma',
            duration: '14:20',
            videoUrl: 'https://drive.google.com/file/d/196pBa6cFbISOLcLWBZoDUNiM5CuYSLm0/preview',
            desc: 'Domine o preenchimento dos Planos de Aula vinculados às turmas, cursos e reservas de laboratório.',
            transcricao: 'O Plano de Aula organiza o cronograma da turma e vincula os recursos que serão consumidos. Descubra como cadastrar seus planos semanais para que a coordenação valide as atividades.',
            quizKey: 'module2-lesson3',
            isWatched: progress.module2.lesson3.videoWatched,
            isPassed: progress.module2.lesson3.quizPassed
        },
        'exam': {
            title: 'Avaliação Final de Certificação',
            modName: 'Módulo 3: Avaliação Final',
            duration: '45:00',
            videoUrl: null,
            desc: 'Responda a 10 perguntas objetivas baseadas em todo o conteúdo do treinamento. É necessário obter 70% de acertos para receber o selo oficial.',
            transcricao: 'Esta etapa é teórica e avaliativa. Certifique-se de ter revisado todo o conteúdo prático e concluído os quizes anteriores antes de iniciar sua prova.',
            quizKey: 'exam',
            isWatched: true,
            isPassed: progress.examPassed
        }
    };

    const active = lessonsData[window.activeCourseLesson] || lessonsData['module1'];
    const defaultFbMap = {
        'module1': { likes: 0, dislikes: 0 },
        'lesson1': { likes: 0, dislikes: 0 },
        'lesson2': { likes: 0, dislikes: 0 },
        'lesson3': { likes: 0, dislikes: 0 },
        'exam': { likes: 0, dislikes: 0 }
    };
    const curLessonKey = window.activeCourseLesson || 'module1';
    if (!localStorage.getItem('realFeedbackResetDone_v3')) {
        localStorage.setItem('courseFeedbackCounts', JSON.stringify(defaultFbMap));
        localStorage.setItem('realFeedbackResetDone_v3', 'true');
    }
    const fbCountsMap = JSON.parse(localStorage.getItem('courseFeedbackCounts')) || defaultFbMap;
    const curLikes = (fbCountsMap[curLessonKey] && fbCountsMap[curLessonKey].likes !== undefined) ? fbCountsMap[curLessonKey].likes : 0;
    const curDislikes = (fbCountsMap[curLessonKey] && fbCountsMap[curLessonKey].dislikes !== undefined) ? fbCountsMap[curLessonKey].dislikes : 0;

    let html = `
    <div style="font-family: 'Inter', sans-serif; color: #fff; padding: 10px 0;">
        <!-- Course Main Title -->
        <h1 style="font-size: 1.85rem; font-weight: 700; color: #ffffff; margin-bottom: 24px; letter-spacing: -0.5px;">
            ${active.title}
        </h1>

        <!-- Main 2-Column Layout matching screenshot structure -->
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 35px; align-items: start;" class="senai-play-grid">
            
            <!-- Left Column: Video Player & Action Pills -->
            <div>
                <!-- Video Player Box -->
                <div style="position: relative; background: #0c0714; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 15px 35px rgba(0,0,0,0.6); aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center;">
                    ${active.videoUrl ? `
                        <iframe src="${active.videoUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe>
                    ` : `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 3.5rem; margin-bottom: 15px;">📝</div>
                            <h3 style="color: #fff; margin-bottom: 10px; font-size: 1.4rem;">Avaliação Teórica Final</h3>
                            <p style="color: var(--text-muted); max-width: 420px; margin: 0 auto; font-size: 0.95rem; line-height: 1.5;">Responda às questões para validar todo o conhecimento adquirido e liberar seu certificado oficial SENAI VEST.</p>
                        </div>
                    `}
                </div>

                ${active.videoUrl ? `

                ` : ''}

                <!-- Video Actions Bar (Notificar erro | Like/Dislike/Watched pills) -->
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 15px; margin-top: 16px;">
                    <button onclick="showToast('Obrigado por notificar. Nossa equipe verificará esta aula.', 'info')" style="background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.12); padding: 8px 18px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                        <span style="border: 1.5px solid #fff; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold;">!</span> Notificar erro
                    </button>

                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="handleCourseFeedback('${curLessonKey}', 'like')" style="background: rgba(255, 255, 255, 0.06); color: #fff; border: 1px solid rgba(255,255,255,0.12); padding: 8px 18px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            👍 ${curLikes}
                        </button>
                        <button onclick="handleCourseFeedback('${curLessonKey}', 'dislike')" style="background: rgba(255, 255, 255, 0.06); color: #fff; border: 1px solid rgba(255,255,255,0.12); padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                            👎 ${curDislikes > 0 ? curDislikes : ''}
                        </button>
                        ${active.isWatched ? `
                            <button style="background: #27ae60; color: #fff; border: none; padding: 8px 18px; border-radius: 20px; font-weight: bold; font-size: 0.85rem; cursor: default; display: flex; align-items: center; gap: 6px;">
                                ✔️ Assistido
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Tabs & Description / Quiz Box below -->
                <div style="margin-top: 30px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 24px;">
                    <div style="display: flex; gap: 25px; border-bottom: 2px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 18px;">
                        <span style="color: #fff; font-weight: 700; font-size: 1rem; border-bottom: 2px solid #005CA9; padding-bottom: 12px; margin-bottom: -14px; cursor: pointer;">Visão Geral</span>
                        <span onclick="showToast('Transcrição resumida disponível no box abaixo.', 'info')" style="color: rgba(255,255,255,0.5); font-weight: 600; font-size: 1rem; cursor: pointer;">Transcrição</span>
                    </div>

                    <p style="margin: 0 0 12px 0; font-weight: 600; color: #fff; font-size: 0.95rem; line-height: 1.5;">${active.desc}</p>
                    <p style="margin: 0 0 22px 0; color: rgba(255,255,255,0.7); font-size: 0.9rem; line-height: 1.6;">${active.transcricao}</p>

                    <!-- Atividade de Fixação / Quiz banner -->
                    <div style="padding: 16px 20px; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 15px;">
                        <div>
                            <div style="font-weight: 700; color: #fff; font-size: 0.95rem; margin-bottom: 4px;">Atividade de Fixação da Aula</div>
                            <div style="font-size: 0.82rem; color: rgba(255,255,255,0.6);">Responda às questões para validar sua participação.</div>
                        </div>
                        ${active.isPassed ? `
                            <span style="background: rgba(39,174,96,0.2); color: #2ecc71; border: 1px solid rgba(39,174,96,0.4); padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 0.85rem;">✔️ Quiz Concluído</span>
                        ` : `
                            <button onclick="triggerLessonQuiz('${window.activeCourseLesson}', '${active.quizKey}')" style="background: #005CA9; color: #fff; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(0, 92, 169, 0.3);">Iniciar Quiz</button>
                        `}
                    </div>
                </div>
            </div>

            <!-- Right Column: Sidebar with Progress & Blue Scrollbar Accent -->
            <div style="position: relative; padding-right: 14px; border-right: 4px solid #005CA9; min-height: 480px; display: flex; flex-direction: column;">
                
                <!-- Progress Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 700; color: #fff; margin-bottom: 8px;">
                    <span>Progresso</span>
                    <span>${pct}%</span>
                </div>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 25px;">
                    <div style="width: ${pct}%; height: 100%; background: #005CA9; border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>

                <!-- Conteúdo do Curso Header -->
                <div style="display: flex; align-items: center; gap: 10px; font-size: 1.35rem; font-weight: 700; color: #fff; margin-bottom: 20px;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #005CA9; color: #3a8ee6; font-size: 0.75rem;">▶</span>
                    <span>Conteúdo do Curso</span>
                </div>

                <!-- Accordion Modules List -->
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    
                    <!-- Módulo 1 -->
                    <div style="background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
                        <div onclick="toggleCourseModule('mod1')" style="background: ${window.expandedCourseModule === 'mod1' ? 'linear-gradient(135deg, rgba(0, 92, 169, 0.4), rgba(20, 20, 20, 0.9))' : 'rgba(255,255,255,0.04)'}; padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;">
                            <div>
                                <div style="font-size: 0.82rem; color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 3px;">Módulo 1</div>
                                <div style="font-weight: 700; color: #fff; font-size: 1.05rem;">Conhecendo a Plataforma</div>
                                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 6px; display: flex; align-items: center; gap: 6px;">🕒 30m</div>
                            </div>
                            <span style="color: #3a8ee6; font-size: 1.1rem; font-weight: bold;">${window.expandedCourseModule === 'mod1' ? '⌃' : '⌄'}</span>
                        </div>
                        ${window.expandedCourseModule === 'mod1' ? `
                            <div style="padding: 16px 20px; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.05);">
                                <!-- Aula Subheader -->
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Aula 1</div>
                                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">Conhecendo a Plataforma SENAI VEST</div>
                                    </div>
                                    <span style="color: #3a8ee6; font-size: 0.9rem;">⌃</span>
                                </div>

                                <!-- Item 1: Vídeo -->
                                <div onclick="selectCourseLesson('module1')" style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module1.videoWatched ? '#005CA9' : 'transparent'}; border-color: ${progress.module1.videoWatched ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module1.videoWatched ? '✓' : ''}</div>
                                    <span style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #3a8ee6; display: inline-flex; align-items: center; justify-content: center; color: #3a8ee6; font-size: 0.6rem; flex-shrink: 0; margin-top: 1px;">▶</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 1 - 15:30</div>
                                        <div style="font-size: 0.88rem; color: ${window.activeCourseLesson === 'module1' ? '#fff' : 'rgba(255,255,255,0.85)'}; font-weight: ${window.activeCourseLesson === 'module1' ? '700' : '500'};">Conhecendo a Plataforma SENAI VEST | SENAI Play</div>
                                    </div>
                                </div>

                                <!-- Item 2: Quiz -->
                                <div onclick="triggerLessonQuiz('module1', 'module1')" style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 0 4px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module1.quizPassed ? '#005CA9' : 'transparent'}; border-color: ${progress.module1.quizPassed ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module1.quizPassed ? '✓' : ''}</div>
                                    <span style="color: #d3bca2; font-size: 1.1rem; flex-shrink: 0; margin-top: -1px;">📋</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 1 -</div>
                                        <div style="font-size: 0.88rem; color: rgba(255,255,255,0.85); font-weight: 500;">Atividade de Fixação Módulo 1</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Módulo 2 -->
                    <div style="background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); opacity: ${mod2Locked ? '0.6' : '1'};">
                        <div onclick="toggleCourseModule('mod2')" style="background: ${window.expandedCourseModule === 'mod2' ? 'linear-gradient(135deg, rgba(0, 92, 169, 0.4), rgba(20, 20, 20, 0.9))' : 'rgba(255,255,255,0.04)'}; padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;">
                            <div>
                                <div style="font-size: 0.82rem; color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 3px;">Módulo 2</div>
                                <div style="font-weight: 700; color: #fff; font-size: 1.05rem;">Recursos Práticos da Plataforma</div>
                                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 6px; display: flex; align-items: center; gap: 6px;">Duração: 2h ${mod2Locked ? '(Bloqueado)' : ''}</div>
                            </div>
                            <span style="color: #3a8ee6; font-size: 1.1rem; font-weight: bold;">${window.expandedCourseModule === 'mod2' ? '⌃' : '⌄'}</span>
                        </div>
                        ${window.expandedCourseModule === 'mod2' ? `
                            <div style="padding: 16px 20px; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.05);">
                                <!-- Subheader Aula 1 -->
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Aula 1</div>
                                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">Almoxarifado Virtual</div>
                                    </div>
                                    <span style="color: #3a8ee6; font-size: 0.9rem;">⌃</span>
                                </div>
                                <div onclick="selectCourseLesson('lesson1')" style="display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson1.videoWatched ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson1.videoWatched ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson1.videoWatched ? '✓' : ''}</div>
                                    <span style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #3a8ee6; display: inline-flex; align-items: center; justify-content: center; color: #3a8ee6; font-size: 0.6rem; flex-shrink: 0; margin-top: 1px;">▶</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 1 - 10:17</div>
                                        <div style="font-size: 0.88rem; color: ${window.activeCourseLesson === 'lesson1' ? '#fff' : 'rgba(255,255,255,0.85)'}; font-weight: ${window.activeCourseLesson === 'lesson1' ? '700' : '500'};">Almoxarifado Virtual | SENAI Play</div>
                                    </div>
                                </div>
                                <div onclick="triggerLessonQuiz('lesson1', 'module2-lesson1')" style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0 16px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson1.quizPassed ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson1.quizPassed ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson1.quizPassed ? '✓' : ''}</div>
                                    <span style="color: #d3bca2; font-size: 1.1rem; flex-shrink: 0; margin-top: -1px;">📋</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 1 -</div>
                                        <div style="font-size: 0.88rem; color: rgba(255,255,255,0.85); font-weight: 500;">Quiz Almoxarifado Virtual</div>
                                    </div>
                                </div>

                                <!-- Subheader Aula 2 -->
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Aula 2</div>
                                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">Boletins de Ocorrência</div>
                                    </div>
                                    <span style="color: #3a8ee6; font-size: 0.9rem;">⌃</span>
                                </div>
                                <div onclick="selectCourseLesson('lesson2')" style="display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson2.videoWatched ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson2.videoWatched ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson2.videoWatched ? '✓' : ''}</div>
                                    <span style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #3a8ee6; display: inline-flex; align-items: center; justify-content: center; color: #3a8ee6; font-size: 0.6rem; flex-shrink: 0; margin-top: 1px;">▶</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 2 - 12:45</div>
                                        <div style="font-size: 0.88rem; color: ${window.activeCourseLesson === 'lesson2' ? '#fff' : 'rgba(255,255,255,0.85)'}; font-weight: ${window.activeCourseLesson === 'lesson2' ? '700' : '500'};">Boletins de Ocorrência | SENAI Play</div>
                                    </div>
                                </div>
                                <div onclick="triggerLessonQuiz('lesson2', 'module2-lesson2')" style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0 16px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson2.quizPassed ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson2.quizPassed ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson2.quizPassed ? '✓' : ''}</div>
                                    <span style="color: #d3bca2; font-size: 1.1rem; flex-shrink: 0; margin-top: -1px;">📋</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 2 -</div>
                                        <div style="font-size: 0.88rem; color: rgba(255,255,255,0.85); font-weight: 500;">Quiz Boletins de Ocorrência</div>
                                    </div>
                                </div>

                                <!-- Subheader Aula 3 -->
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Aula 3</div>
                                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">Planos de Aula</div>
                                    </div>
                                    <span style="color: #3a8ee6; font-size: 0.9rem;">⌃</span>
                                </div>
                                <div onclick="selectCourseLesson('lesson3')" style="display: flex; align-items: flex-start; gap: 12px; padding: 6px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson3.videoWatched ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson3.videoWatched ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson3.videoWatched ? '✓' : ''}</div>
                                    <span style="width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #3a8ee6; display: inline-flex; align-items: center; justify-content: center; color: #3a8ee6; font-size: 0.6rem; flex-shrink: 0; margin-top: 1px;">▶</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 3 - 14:20</div>
                                        <div style="font-size: 0.88rem; color: ${window.activeCourseLesson === 'lesson3' ? '#fff' : 'rgba(255,255,255,0.85)'}; font-weight: ${window.activeCourseLesson === 'lesson3' ? '700' : '500'};">Planos de Aula | SENAI Play</div>
                                    </div>
                                </div>
                                <div onclick="triggerLessonQuiz('lesson3', 'module2-lesson3')" style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0 4px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.module2.lesson3.quizPassed ? '#005CA9' : 'transparent'}; border-color: ${progress.module2.lesson3.quizPassed ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.module2.lesson3.quizPassed ? '✓' : ''}</div>
                                    <span style="color: #d3bca2; font-size: 1.1rem; flex-shrink: 0; margin-top: -1px;">📋</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Aula 3 -</div>
                                        <div style="font-size: 0.88rem; color: rgba(255,255,255,0.85); font-weight: 500;">Quiz Planos de Aula</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Módulo 3 -->
                    <div style="background: rgba(255,255,255,0.02); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); opacity: ${examLocked ? '0.6' : '1'};">
                        <div onclick="toggleCourseModule('mod3')" style="background: ${window.expandedCourseModule === 'mod3' ? 'linear-gradient(135deg, rgba(0, 92, 169, 0.4), rgba(20, 20, 20, 0.9))' : 'rgba(255,255,255,0.04)'}; padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;">
                            <div>
                                <div style="font-size: 0.82rem; color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 3px;">Módulo 3</div>
                                <div style="font-weight: 700; color: #fff; font-size: 1.05rem;">Avaliação Final de Certificação</div>
                                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 6px; display: flex; align-items: center; gap: 6px;">Duração: 1h ${examLocked ? '(Bloqueado)' : ''}</div>
                            </div>
                            <span style="color: #3a8ee6; font-size: 1.1rem; font-weight: bold;">${window.expandedCourseModule === 'mod3' ? '⌃' : '⌄'}</span>
                        </div>
                        ${window.expandedCourseModule === 'mod3' ? `
                            <div style="padding: 16px 20px; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                    <div>
                                        <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">Avaliação Final</div>
                                        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">Certificação SENAI VEST</div>
                                    </div>
                                    <span style="color: #3a8ee6; font-size: 0.9rem;">⌃</span>
                                </div>
                                <div onclick="triggerLessonQuiz('exam', 'exam')" style="display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; cursor: pointer;">
                                    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-radius: 3px; display: flex; align-items: center; justify-content: center; background: ${progress.examPassed ? '#005CA9' : 'transparent'}; border-color: ${progress.examPassed ? '#005CA9' : 'rgba(255,255,255,0.4)'}; flex-shrink: 0; margin-top: 2px; font-size: 0.7rem; font-weight: bold; color: #fff;">${progress.examPassed ? '✓' : ''}</div>
                                    <span style="color: #3a8ee6; font-size: 1.1rem; flex-shrink: 0; margin-top: -1px;">✍️</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600;">Prova Teórica - 10 Questões</div>
                                        <div style="font-size: 0.88rem; color: ${window.activeCourseLesson === 'exam' ? '#fff' : 'rgba(255,255,255,0.85)'}; font-weight: ${window.activeCourseLesson === 'exam' ? '700' : '500'};">Prova Final Oficial | SENAI Play</div>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                </div>

                <!-- Certificado Card se concluído -->
                ${progress.examPassed ? `
                <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, rgba(39,174,96,0.2), rgba(39,174,96,0.05)); border: 1px solid rgba(39,174,96,0.4); border-radius: 12px; text-align: center;">
                    <div style="font-size: 2.2rem; margin-bottom: 8px;">🎓</div>
                    <h4 style="color: #2ecc71; margin-bottom: 6px; font-size: 1.1rem;">Certificado Liberado!</h4>
                    <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-bottom: 15px;">Parabéns por concluir a Capacitação Oficial SENAI VEST.</p>
                    <button onclick="showCertificateModal()" style="background: #2ecc71; color: #fff; border: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; cursor: pointer; width: 100%; box-shadow: 0 4px 15px rgba(39,174,96,0.3);">🎓 Emitir Certificado</button>
                </div>
                ` : ''}

            </div>

        </div>
    </div>
    `;

    container.innerHTML = html;

    // Iniciar temporizador dinâmico de progresso de vídeo de acordo com o vídeo
    window.lessonVideoSeconds = window.lessonVideoSeconds || {};
    if (active.videoUrl && !active.isWatched) {
        if (window.courseVideoInterval) clearInterval(window.courseVideoInterval);
        window.courseVideoInterval = setInterval(() => {
            window.lessonVideoSeconds[curLessonKey] = (window.lessonVideoSeconds[curLessonKey] || 0) + 2;
            const parts = (active.duration || '15:00').split(':');
            const totalSecs = (Number(parts[0]) || 15) * 60 + (Number(parts[1]) || 0);
            let vPct = Math.min(99, Math.round((window.lessonVideoSeconds[curLessonKey] / totalSecs) * 100));
            if (vPct < 5) vPct = 5;
            const barEl = document.getElementById('lesson-dynamic-video-bar');
            const txtEl = document.getElementById('lesson-dynamic-video-text');
            if (barEl) barEl.style.width = vPct + '%';
            if (txtEl) txtEl.textContent = 'Progresso (' + vPct + '%) ⏳';
            if (window.lessonVideoSeconds[curLessonKey] >= totalSecs) {
                clearInterval(window.courseVideoInterval);
                finishVideoLesson(curLessonKey);
            }
        }, 1000);
    } else if (window.courseVideoInterval) {
        clearInterval(window.courseVideoInterval);
    }
}

function renderMeusCursos() {
    renderCourseUI();
}

const MODULE_VIDEO_TITLES = {
    'module1': 'Módulo 1: Conhecendo a Plataforma',
    'module2-lesson1': 'Módulo 2 — Aula 1: Almoxarifado Virtual',
    'module2-lesson2': 'Módulo 2 — Aula 2: Boletins de Ocorrência',
    'module2-lesson3': 'Módulo 2 — Aula 3: Planos de Aula',
};

function playModuleVideo(moduleId) {
    currentPlayingModule = moduleId;
    isVideoPlaying = false;
    videoCurrentTime = 0;

    const modal = document.getElementById('modal-video-player');
    const titleEl = document.getElementById('video-player-title');
    const timerBadge = document.getElementById('video-timer-badge');
    const progressFill = document.getElementById('video-progress-fill');
    const playBtn = document.getElementById('video-play-btn');
    const playIcon = document.getElementById('video-screen-play-icon');
    const screenMsg = document.getElementById('video-screen-msg');

    const simWrapper = document.getElementById('video-simulated-wrapper');
    const iframeWrapper = document.getElementById('video-iframe-wrapper');
    const iframe = document.getElementById('video-iframe');

    if (titleEl) {
        titleEl.textContent = MODULE_VIDEO_TITLES[moduleId] || moduleId;
    }

    if (moduleId === 'module1') {
        if (simWrapper) simWrapper.style.display = 'none';
        if (iframeWrapper) iframeWrapper.style.display = 'flex';
        if (iframe) iframe.src = 'https://drive.google.com/file/d/1xqD-xDeC-YM6d_7czC8Ia_5VHnGmQw0D/preview';
    } else {
        if (simWrapper) simWrapper.style.display = 'block';
        if (iframeWrapper) iframeWrapper.style.display = 'none';
        if (iframe) iframe.src = '';

        if (timerBadge) timerBadge.textContent = '15s';
        if (progressFill) progressFill.style.width = '0%';
        if (playBtn) playBtn.textContent = '▶️';
        if (playIcon) playIcon.style.display = 'block';
        if (screenMsg) screenMsg.textContent = 'Clique no botão de Play para iniciar';
    }

    if (modal) modal.classList.add('active');

    if (videoTimerInterval) clearInterval(videoTimerInterval);
}

function toggleVideoPlayback() {
    const playBtn = document.getElementById('video-play-btn');
    const playIcon = document.getElementById('video-screen-play-icon');
    const screenMsg = document.getElementById('video-screen-msg');

    if (isVideoPlaying) {
        isVideoPlaying = false;
        if (playBtn) playBtn.textContent = '▶️';
        if (playIcon) playIcon.style.display = 'block';
        if (screenMsg) screenMsg.textContent = 'Vídeo pausado';
        if (videoTimerInterval) clearInterval(videoTimerInterval);
    } else {
        isVideoPlaying = true;
        if (playBtn) playBtn.textContent = '⏸️';
        if (playIcon) playIcon.style.display = 'none';
        if (screenMsg) screenMsg.textContent = 'Aula de treinamento em progresso...';

        videoTimerInterval = setInterval(() => {
            videoCurrentTime += 1;
            const progressFill = document.getElementById('video-progress-fill');
            const timeDisplay = document.getElementById('video-time-display');
            const timerBadge = document.getElementById('video-timer-badge');

            const pct = (videoCurrentTime / videoDuration) * 100;
            if (progressFill) progressFill.style.width = pct + '%';
            if (timeDisplay) {
                timeDisplay.textContent = `00:${String(videoCurrentTime).padStart(2, '0')} / 00:15`;
            }
            if (timerBadge) {
                timerBadge.textContent = (videoDuration - videoCurrentTime) + 's';
            }

            if (videoCurrentTime >= videoDuration) {
                clearInterval(videoTimerInterval);
                finishVideo();
            }
        }, 1000);
    }
}

function finishVideo() {
    isVideoPlaying = false;
    if (videoTimerInterval) clearInterval(videoTimerInterval);

    const playBtn = document.getElementById('video-play-btn');
    if (playBtn) playBtn.textContent = '▶️';

    const progress = loadCourseProgress();
    if (currentPlayingModule === 'module1') {
        progress.module1.videoWatched = true;
    } else if (currentPlayingModule === 'module2-lesson1') {
        progress.module2.lesson1.videoWatched = true;
    } else if (currentPlayingModule === 'module2-lesson2') {
        progress.module2.lesson2.videoWatched = true;
    } else if (currentPlayingModule === 'module2-lesson3') {
        progress.module2.lesson3.videoWatched = true;
    }
    saveCourseProgress(progress);

    closeVideoPlayerModal();
    showToast('📺 Vídeo concluído! Vamos ao quiz de fixação.', 'success');

    setTimeout(() => {
        openQuizModal(currentPlayingModule);
    }, 400);
}

function skipVideo() {
    finishVideo();
}

function closeVideoPlayerModal() {
    if (videoTimerInterval) clearInterval(videoTimerInterval);
    const modal = document.getElementById('modal-video-player');
    if (modal) modal.classList.remove('active');
    const iframe = document.getElementById('video-iframe');
    if (iframe) iframe.src = '';
}

// Returns the lesson questions array for a module2-lessonX id, or null
function getLesson2Questions(moduleId) {
    if (moduleId === 'module2-lesson1') return COURSE_QUESTIONS.module2.lesson1;
    if (moduleId === 'module2-lesson2') return COURSE_QUESTIONS.module2.lesson2;
    if (moduleId === 'module2-lesson3') return COURSE_QUESTIONS.module2.lesson3;
    return null;
}

function renderSingleQuestion(qData, questionIndex) {
    // Questão dissertativa (resposta aberta)
    if (qData.type === 'text') {
        return `
            <div class="quiz-question-text">${qData.question}</div>
            <div style="margin-top:16px;">
                <textarea
                    id="quiz-text-answer"
                    placeholder="Digite sua resposta aqui..."
                    rows="5"
                    style="
                        width:100%; box-sizing:border-box; padding:14px; border-radius:10px;
                        border:2px solid var(--border-color); background:var(--bg-card);
                        color:var(--text-color); font-size:0.95rem; font-family:inherit;
                        resize:vertical; transition:border-color .2s;
                    "
                    oninput="this.style.borderColor='var(--primary-beige)'"
                ></textarea>
                <div style="font-size:0.78rem;color:var(--text-muted);margin-top:6px;">Mínimo de ${qData.minLength || 20} caracteres.</div>
            </div>
            <div id="quiz-feedback-msg" style="margin-top:15px;font-weight:600;display:none;"></div>
        `;
    }
    // Questão de múltipla escolha
    let optionsHtml = '';
    qData.options.forEach(opt => {
        optionsHtml += `
            <div class="quiz-option-card" data-answer-id="${opt.id}" onclick="selectQuizOption('${opt.id}', this)">
                <span class="quiz-option-letter">${opt.id}</span>
                <span>${opt.text}</span>
            </div>
        `;
    });
    return `
        <div class="quiz-question-text">${qData.question}</div>
        <div class="quiz-options-list">${optionsHtml}</div>
        <div id="quiz-feedback-msg" style="margin-top: 15px; font-weight: 600; display: none;"></div>
    `;
}

function openQuizModal(moduleId) {
    if (moduleId === 'lesson1') moduleId = 'module2-lesson1';
    if (moduleId === 'lesson2') moduleId = 'module2-lesson2';
    if (moduleId === 'lesson3') moduleId = 'module2-lesson3';
    currentQuizModule = moduleId;
    currentQuizQuestionIndex = 0;
    selectedAnswers = {};

    const titleEl = document.getElementById('quiz-exam-title');
    const bodyEl = document.getElementById('quiz-exam-body');
    const submitBtn = document.getElementById('btn-quiz-exam-submit');
    const modal = document.getElementById('modal-quiz-exam');

    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    const lessonQuestions = getLesson2Questions(moduleId);

    if (moduleId === 'module1') {
        // Single-question quiz (Module 1)
        if (titleEl) titleEl.textContent = 'Quiz: Conhecendo a Plataforma';
        if (submitBtn) submitBtn.textContent = 'Submeter Resposta';
        const qData = COURSE_QUESTIONS.module1;
        let optionsHtml = '';
        qData.options.forEach(opt => {
            optionsHtml += `
                <div class="quiz-option-card" data-answer-id="${opt.id}" onclick="selectQuizOption('${opt.id}', this)">
                    <span class="quiz-option-letter">${opt.id}</span>
                    <span>${opt.text}</span>
                </div>
            `;
        });
        bodyEl.innerHTML = `
            <div class="quiz-question-text">${qData.question}</div>
            <div class="quiz-options-list">${optionsHtml}</div>
            <div id="quiz-feedback-msg" style="margin-top: 15px; font-weight: 600; display: none;"></div>
        `;
    } else if (lessonQuestions) {
        // 2-question lesson quiz (Module 2 lessons) — one question at a time
        const lessonTitles = {
            'module2-lesson1': 'Quiz — Aula 1: Almoxarifado Virtual',
            'module2-lesson2': 'Quiz — Aula 2: Boletins de Ocorrência',
            'module2-lesson3': 'Quiz — Aula 3: Planos de Aula',
        };
        if (titleEl) titleEl.textContent = lessonTitles[moduleId] || 'Quiz';
        if (submitBtn) submitBtn.textContent = 'Confirmar Resposta (1/2)';
        bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[0], 0);
    } else if (moduleId === 'exam') {
        renderExamStep();
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}
window.openQuizModal = openQuizModal;

function renderExamStep() {
    const bodyEl = document.getElementById('quiz-exam-body');
    const submitBtn = document.getElementById('btn-quiz-exam-submit');
    const titleEl = document.getElementById('quiz-exam-title');
    if (!bodyEl) return;

    const idx = currentQuizQuestionIndex || 0;
    const total = COURSE_QUESTIONS.exam.length;
    const q = COURSE_QUESTIONS.exam[idx];

    if (titleEl) titleEl.textContent = `Prova Final — Questão ${idx + 1} de ${total}`;
    
    if (submitBtn) {
        if (idx === total - 1) {
            submitBtn.style.display = 'inline-block';
            submitBtn.textContent = 'Finalizar Prova';
        } else {
            submitBtn.style.display = 'none';
        }
    }

    let optionsHtml = '';
    q.options.forEach(opt => {
        const isSelected = selectedAnswers[idx] === opt.id;
        optionsHtml += `
            <div class="quiz-option-card ${isSelected ? 'selected' : ''}" data-question-idx="${idx}" data-answer-id="${opt.id}" onclick="selectExamOption(${idx}, '${opt.id}', this)">
                <span class="quiz-option-letter">${opt.id}</span>
                <span>${opt.text}</span>
            </div>
        `;
    });

    bodyEl.innerHTML = `
        <div class="exam-question-box" style="margin-bottom: 20px;">
            <div style="font-size: 0.85rem; color: var(--primary-beige); font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">Questão ${idx + 1} de ${total}</div>
            <div class="exam-question-title" style="font-size: 1.1rem; margin-bottom: 16px;">${q.question}</div>
            <div class="quiz-options-list">
                ${optionsHtml}
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px;">
            <button type="button" onclick="navigateExamStep(-1)" style="padding: 10px 20px; border-radius: 20px; font-weight: 600; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; ${idx === 0 ? 'visibility: hidden;' : ''}">⬅ Voltar</button>
            ${idx < total - 1 ? `
                <button type="button" onclick="navigateExamStep(1)" style="padding: 10px 24px; border-radius: 20px; font-weight: 700; background: #005CA9; color: #fff; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 92, 169, 0.3);">Avançar ➡</button>
            ` : ''}
        </div>
    `;
}

window.navigateExamStep = function(dir) {
    const idx = currentQuizQuestionIndex || 0;
    if (dir === 1 && !selectedAnswers[idx]) {
        showToast('Selecione uma alternativa antes de avançar!', 'warning');
        return;
    }
    currentQuizQuestionIndex = Math.max(0, Math.min(COURSE_QUESTIONS.exam.length - 1, idx + dir));
    renderExamStep();
};

function selectQuizOption(ansId, element) {
    const siblings = element.parentNode.querySelectorAll('.quiz-option-card');
    siblings.forEach(s => s.classList.remove('selected'));

    element.classList.add('selected');
    selectedAnswers['single'] = ansId;
}

function selectExamOption(qIdx, ansId, element) {
    const parentList = element.parentNode;
    const siblings = parentList.querySelectorAll('.quiz-option-card');
    siblings.forEach(s => s.classList.remove('selected'));

    element.classList.add('selected');
    selectedAnswers[qIdx] = ansId;
}

function evaluateQuizTextAnswer(question, answer) {
    if (answer && answer.trim().length >= 3) {
        return { isCorrect: true, feedback: 'Excelente! Sua resposta foi validada e registrada no sistema com sucesso.' };
    }
    return { isCorrect: false, feedback: 'Por favor, digite uma resposta um pouco mais completa (mínimo de 3 caracteres).' };
}

function handleQuizExamSubmit(e) {
    e.preventDefault();

    const lessonQuestions = getLesson2Questions(currentQuizModule);

    if (currentQuizModule === 'module1') {
        // --- Single-question quiz (Module 1) ---
        const selected = selectedAnswers['single'];
        if (!selected) { showToast('Por favor, selecione uma resposta!', 'warning'); return; }

        const qData = COURSE_QUESTIONS.module1;
        const optionCards = document.querySelectorAll('#quiz-exam-body .quiz-option-card');
        optionCards.forEach(c => c.style.pointerEvents = 'none');

        if (selected === qData.correctAnswer) {
            optionCards.forEach(c => { if (c.getAttribute('data-answer-id') === selected) c.classList.add('correct'); });
            showToast('🎉 Resposta Correta!', 'success');
            const progress = loadCourseProgress();
            progress.module1.quizPassed = true;
            saveCourseProgress(progress);
            setTimeout(() => {
                closeModal('modal-quiz-exam');
                renderCourseUI();
            }, 1200);
        } else {
            optionCards.forEach(c => {
                if (c.getAttribute('data-answer-id') === selected) c.classList.add('incorrect');
                if (c.getAttribute('data-answer-id') === qData.correctAnswer) c.classList.add('correct');
            });
            showToast('❌ Resposta incorreta. Tente novamente!', 'error');
            setTimeout(() => {
                optionCards.forEach(c => { c.style.pointerEvents = 'auto'; c.classList.remove('incorrect', 'correct', 'selected'); });
                selectedAnswers['single'] = null;
            }, 1800);
        }
    } else if (lessonQuestions) {
        // --- 2-question lesson quiz (Module 2 aulas) — one at a time ---
        const qData = lessonQuestions[currentQuizQuestionIndex];

        // ---- Dissertativa (resposta aberta) ----
        if (qData.type === 'text') {
            const textarea = document.getElementById('quiz-text-answer');
            const answer = textarea ? textarea.value.trim() : '';
            const minLen = qData.minLength || 20;
            if (answer.length < minLen) {
                showToast(`Sua resposta precisa ter ao menos ${minLen} caracteres!`, 'warning');
                return;
            }
            const evaluation = evaluateQuizTextAnswer(qData.question, answer);

            if (!evaluation.isCorrect) {
                showToast('Resposta incorreta. A Estela enviou um feedback.', 'error');
                if (window.appendEstelaMessage) {
                    window.appendEstelaMessage(`❌ Atenção à pergunta do quiz: ${evaluation.feedback}`, false);
                    if (window.speakEstelaText) window.speakEstelaText(`Resposta incorreta. ${evaluation.feedback}`);
                }
                return; // User has to try again
            }

            showToast('✅ Resposta correta!', 'success');
            if (window.appendEstelaMessage) {
                window.appendEstelaMessage(`✅ ${evaluation.feedback}`, false);
                if (window.speakEstelaText) window.speakEstelaText(`Muito bem! Resposta correta.`);
            }

            if (textarea) {
                textarea.style.borderColor = 'var(--accent-green)';
                textarea.disabled = true;
            }
            if (currentQuizQuestionIndex === 0) {
                setTimeout(() => {
                    currentQuizQuestionIndex = 1;
                    selectedAnswers['single'] = null;
                    const bodyEl = document.getElementById('quiz-exam-body');
                    const submitBtn = document.getElementById('btn-quiz-exam-submit');
                    if (bodyEl) bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[1], 1);
                    if (submitBtn) submitBtn.textContent = 'Confirmar Resposta (2/2)';
                }, 1000);
            } else {
                const progress = loadCourseProgress();
                const lessonMap = { 'module2-lesson1': 'lesson1', 'module2-lesson2': 'lesson2', 'module2-lesson3': 'lesson3' };
                const lessonKey = lessonMap[currentQuizModule];
                if (lessonKey) progress.module2[lessonKey].quizPassed = true;
                saveCourseProgress(progress);
                showToast('🎉 Parabéns! Aula concluída!', 'success');
                setTimeout(() => {
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                }, 1400);
            }
            return;
        }

        // ---- Múltipla escolha ----
        const selected = selectedAnswers['single'];
        if (!selected) { showToast('Por favor, selecione uma resposta!', 'warning'); return; }

        const optionCards = document.querySelectorAll('#quiz-exam-body .quiz-option-card');
        optionCards.forEach(c => c.style.pointerEvents = 'none');

        const isCorrect = selected === qData.correctAnswer;
        optionCards.forEach(c => {
            if (c.getAttribute('data-answer-id') === selected) c.classList.add(isCorrect ? 'correct' : 'incorrect');
            if (!isCorrect && c.getAttribute('data-answer-id') === qData.correctAnswer) c.classList.add('correct');
        });

        if (isCorrect) {
            if (currentQuizQuestionIndex === 0) {
                // Move to question 2
                showToast('✅ Correto! Próxima pergunta...', 'success');
                setTimeout(() => {
                    currentQuizQuestionIndex = 1;
                    selectedAnswers['single'] = null;
                    const bodyEl = document.getElementById('quiz-exam-body');
                    const submitBtn = document.getElementById('btn-quiz-exam-submit');
                    if (bodyEl) bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[1], 1);
                    if (submitBtn) submitBtn.textContent = 'Confirmar Resposta (2/2)';
                }, 1000);
            } else {
                // Both questions answered correctly — mark lesson passed
                showToast('🎉 Parabéns! Aula concluída!', 'success');
                const progress = loadCourseProgress();
                const lessonMap = {
                    'module2-lesson1': 'lesson1',
                    'module2-lesson2': 'lesson2',
                    'module2-lesson3': 'lesson3',
                };
                const lessonKey = lessonMap[currentQuizModule];
                if (lessonKey) progress.module2[lessonKey].quizPassed = true;
                saveCourseProgress(progress);
                setTimeout(() => {
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                }, 1200);
            }
        } else {
            showToast('❌ Resposta incorreta. Tente esta pergunta novamente!', 'error');
            setTimeout(() => {
                optionCards.forEach(c => { c.style.pointerEvents = 'auto'; c.classList.remove('incorrect', 'correct', 'selected'); });
                selectedAnswers['single'] = null;
            }, 1800);
        }
    } else if (currentQuizModule === 'exam') {
        const totalQuestions = COURSE_QUESTIONS.exam.length;
        const answeredCount = Object.keys(selectedAnswers).length;

        if (answeredCount < totalQuestions) {
            showToast(`Responda a todas as ${totalQuestions} questões da prova!`, 'warning');
            return;
        }

        let correctCount = 0;
        COURSE_QUESTIONS.exam.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correctAnswer) {
                correctCount++;
            }
        });

        const passingScore = 7;
        const passed = correctCount >= passingScore;

        if (passed) {
            showToast(`🎉 Aprovado! Você acertou ${correctCount} de ${totalQuestions} questões.`, 'success');
            const progress = loadCourseProgress();
            progress.examPassed = true;
            saveCourseProgress(progress);

            closeModal('modal-quiz-exam');
            renderCourseUI();

            setTimeout(() => {
                showToast('🎓 Seu certificado foi gerado com sucesso!', 'success');
                addNotification('success', 'Certificado Emitido', 'Você agora possui o selo oficial de professor verificado!');
            }, 500);
        } else {
            showToast(`❌ Reprovado! Você acertou ${correctCount} de ${totalQuestions}. Mínimo: ${passingScore}. Responda novamente.`, 'error');
            selectedAnswers = {};
            currentQuizQuestionIndex = 0;
            renderExamStep();
        }
    }
}

function showCertificateModal() {
    const registeredUserStr = localStorage.getItem('registeredUser');
    if (!registeredUserStr) {
        showToast('Erro: Nenhum usuário logado.', 'error');
        return;
    }

    try {
        const user = JSON.parse(registeredUserStr);

        // Ensure user gets certified badge instantly
        const progress = loadCourseProgress();
        if (progress.examPassed && !user.isCertified) {
            user.isCertified = true;
            localStorage.setItem('registeredUser', JSON.stringify(user));
            if (typeof updateUserUI === 'function') {
                updateUserUI(user);
            }
        }

        document.getElementById('cert-user-name').textContent = user.name || 'Docente do SENAI';

        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const formatData = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

        document.getElementById('cert-date-start').textContent = formatData(today);
        document.getElementById('cert-date-end').textContent = formatData(nextYear);

        let hash = 0;
        const str = (user.email || '') + today.toISOString();
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hex = Math.abs(hash).toString(16).toUpperCase().substring(0, 8);
        document.getElementById('cert-uuid').textContent = `SV-${hex}`;

        const certModal = document.getElementById('modal-certificate');
        if (certModal) certModal.classList.add('active');
    } catch (e) {
        showToast('Erro ao ler dados do usuário.', 'error');
    }
}

function printCertificate() {
    window.print();
}

// Expose functions globally for dynamic elements
window.renderMeusCursos = renderMeusCursos;
window.playModuleVideo = playModuleVideo;
window.toggleVideoPlayback = toggleVideoPlayback;
window.finishVideo = finishVideo;
window.skipVideo = skipVideo;
window.closeVideoPlayerModal = closeVideoPlayerModal;
window.openQuizModal = openQuizModal;
window.selectQuizOption = selectQuizOption;
window.selectExamOption = selectExamOption;
window.handleQuizExamSubmit = handleQuizExamSubmit;
window.showCertificateModal = showCertificateModal;
window.printCertificate = printCertificate;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    renderCourseUI();
});




let currentViewPlanoCode = null;
function toggleEditPlanoDate() {
    document.getElementById('view-plano-data').style.display = 'none';
    document.getElementById('btn-edit-plano-data').style.display = 'none';
    document.getElementById('edit-plano-data').style.display = 'inline-block';
    document.getElementById('btn-save-plano-data').style.display = 'inline-block';
}
function saveEditPlanoDate() {
    if (!currentViewPlanoCode) return;
    const plano = registeredPlanos.find(p => p.code === currentViewPlanoCode);
    if (plano) {
        const newDate = document.getElementById('edit-plano-data').value;
        if (!newDate) { showToast('Selecione uma data vlida', 'warning'); return; }
        plano.date = newDate;
        let dateObj = new Date(newDate);
        document.getElementById('view-plano-data').textContent = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        showToast('Data do plano alterada com sucesso!', 'success');
        // Update UI
        renderMinhasAulasCards();
        renderCoordenacaoPlanos();
    }
    document.getElementById('view-plano-data').style.display = 'inline';
    document.getElementById('btn-edit-plano-data').style.display = 'inline-block';
    document.getElementById('edit-plano-data').style.display = 'none';
    document.getElementById('btn-save-plano-data').style.display = 'none';
}

function generateWeeklyReport(filteredBoletins) {
    const container = document.getElementById('weekly-report-container');
    if (!container) return;

    const schoolInventory = inventory.filter(item => window.isItemAllowedForUser(item));

    // 1. Materiais mais usados
    let materialUsage = {};
    schoolInventory.forEach(item => {
        if (item.status === 'Não apresenta no estoque' || item.status === 'Não Pertencente' || item.inconformidade) {
            materialUsage[item.name] = (materialUsage[item.name] || 0) + 1;
        }
    });
    const topMaterials = Object.entries(materialUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 2. Professores que mais solicitaram materiais
    let profRequests = {};
    schoolInventory.forEach(item => {
        if (item.status === 'Não apresenta no estoque' || item.status === 'Não Pertencente' || item.inconformidade) {
            if (item.meta && item.meta.includes('Responsável:')) {
                const match = item.meta.match(/Responsável:\s*([^|]+)/);
                if (match && match[1]) {
                    const profName = match[1].trim();
                    profRequests[profName] = (profRequests[profName] || 0) + 1;
                }
            }
        }
    });
    const topProfsRequests = Object.entries(profRequests).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalRequests = Object.values(profRequests).reduce((a, b) => a + b, 0) || 1;

    // 3. Professores que mais registraram boletim
    let profBoletins = {};
    filteredBoletins.forEach(b => {
        const prof = b.professor || 'Desconhecido';
        profBoletins[prof] = (profBoletins[prof] || 0) + 1;
    });
    const topProfsBoletins = Object.entries(profBoletins).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // 4. Quadros mais usados
    let categorias = {};
    filteredBoletins.forEach(b => {
        const cat = b.categoria || 'outros';
        categorias[cat] = (categorias[cat] || 0) + 1;
    });
    const topCategorias = Object.entries(categorias).sort((a, b) => b[1] - a[1]);
    const catMap = {
        'falta': 'Falta',
        'furto': 'Furto',
        'avaria': 'Avaria',
        'extravio': 'Extravio',
        'naodevolvido': 'Não Devolvido',
        'divergencia': 'Divergência',
        'outros': 'Outros'
    };

    // 5. Inadimplência
    const inadimplentes = filteredBoletins.filter(b => b.categoria === 'naodevolvido' && b.status !== 'Concluída');

    let html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div class="dashboard-chart-box">
            <h3 class="section-title" style="font-size:1.1rem; margin-bottom:15px;">Materiais Mais Usados</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${topMaterials.length === 0 ? '<p style="color:var(--text-muted); font-size:0.9rem;">Nenhum material registrado em uso.</p>' : ''}
                ${topMaterials.map(([name, count], index) => `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size:0.9rem; color:var(--text-color);">${index + 1}. ${name}</span>
                        <span style="font-size:0.85rem; font-weight:bold; color:var(--primary-beige);">${count}x</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="dashboard-chart-box" style="border: 1px solid var(--accent-red);">
            <h3 class="section-title" style="font-size:1.1rem; margin-bottom:15px; color: var(--accent-red);">Alerta de Inadimplência</h3>
            <div style="max-height: 150px; overflow-y: auto;">
                ${inadimplentes.length === 0 ? '<p style="color:var(--text-muted); font-size:0.9rem;">Nenhum material pendente de devolução na semana.</p>' : ''}
                ${inadimplentes.map(b => {
        const resp = b.detalhesCategoria?.responsavel || b.professor || 'Desconhecido';
        const mats = b.detalhesCategoria?.materiais || 'Material não especificado';
        return `
                    <div style="background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                        <div style="font-weight: bold; color: var(--accent-red); font-size: 0.9rem;">${resp}</div>
                        <div style="font-size: 0.8rem; color: var(--text-color);">${mats}</div>
                    </div>`;
    }).join('')}
            </div>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
        <div class="dashboard-list-box">
            <h3 class="section-title" style="font-size:1rem; margin-bottom:15px;">Maiores Solicitantes</h3>
            <ul class="activity-list">
                ${topProfsRequests.length === 0 ? '<li class="activity-item"><span class="activity-text">Sem dados</span></li>' : ''}
                ${topProfsRequests.map(([name, count]) => `
                    <li class="activity-item">
                        <span class="activity-text">${name}</span>
                        <span class="activity-time" style="color:var(--accent-green); font-weight:bold;">${Math.round((count / totalRequests) * 100)}%</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="dashboard-list-box">
            <h3 class="section-title" style="font-size:1rem; margin-bottom:15px;">+ Registram Ocorrências</h3>
            <ul class="activity-list">
                ${topProfsBoletins.length === 0 ? '<li class="activity-item"><span class="activity-text">Sem dados</span></li>' : ''}
                ${topProfsBoletins.map(([name, count]) => `
                    <li class="activity-item">
                        <span class="activity-text">${name}</span>
                        <span class="activity-time">${count} boletins</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="dashboard-list-box">
            <h3 class="section-title" style="font-size:1rem; margin-bottom:15px;">Quadros Frequentes</h3>
            <ul class="activity-list">
                ${topCategorias.length === 0 ? '<li class="activity-item"><span class="activity-text">Sem dados</span></li>' : ''}
                ${topCategorias.map(([cat, count]) => {
        const catName = catMap[cat] || cat;
        return `
                    <li class="activity-item">
                        <span class="activity-text">${catName}</span>
                        <span class="activity-time">${count}x</span>
                    </li>`;
    }).join('')}
            </ul>
        </div>
    </div>
    `;

    container.innerHTML = html;
    if (window.renderRecursosSurvey) window.renderRecursosSurvey();
}

window.renderRecursosSurvey = function () {
    const containers = [
        document.getElementById('geral-recursos-container'),
        document.getElementById('coordenacao-recursos-container')
    ];

    // Filter inventory allowed for the current logged in user/school
    const userSchool = window.getUserSchoolCode();
    const allowedItems = inventory.filter(i => window.isItemAllowedForUser(i));

    // Get all labs belonging to this school or where items exist
    const allowedLabs = registeredLabs.filter(l => {
        if (userSchool && l.schoolId) return isSameSchool(l.schoolId, userSchool);
        return allowedItems.some(i => Number(i.lab) === Number(l.id)) || !userSchool;
    });

    if (containers.every(c => !c)) return;

    let totalItemsCount = allowedItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 1), 0);
    let totalProductsCount = allowedItems.length;
    let totalLabsCount = allowedLabs.length;

    let html = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-around; text-align: center; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 15px;">
            <div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary-beige);">${totalProductsCount}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Tipos de Produtos</div>
            </div>
            <div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-blue);">${totalItemsCount}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Quantidade Total de Unidades</div>
            </div>
            <div>
                <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-green);">${totalLabsCount}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Almoxarifados Cadastrados</div>
            </div>
        </div>
    `;

    if (allowedLabs.length === 0 && allowedItems.length === 0) {
        html += `<div style="text-align: center; padding: 25px; color: var(--text-muted);">Nenhum almoxarifado ou material cadastrado para esta instituição até o momento.</div>`;
    } else {
        html += `<div style="display: flex; flex-direction: column; gap: 20px;">`;

        // Group items by Lab
        const labMap = new Set([...allowedLabs.map(l => Number(l.id)), ...allowedItems.map(i => Number(i.lab))]);

        labMap.forEach(labId => {
            const labObj = registeredLabs.find(l => Number(l.id) === labId);
            const labName = labObj ? labObj.name : `Almoxarifado Lab ${labId}`;
            const labSigla = labObj && labObj.sigla ? `(${labObj.sigla})` : '';

            const labItems = allowedItems.filter(i => Number(i.lab) === labId);

            html += `
            <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; overflow: hidden;">
                <div style="background: rgba(255,255,255,0.04); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; gap: 10px;">
                    <div>
                        <strong style="color: #fff; font-size: 1.05rem;">${labName} ${labSigla}</strong>
                    </div>
                    <span style="background: rgba(212, 175, 55, 0.15); color: var(--primary-beige); padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${labItems.length} produtos</span>
                </div>
            `;

            if (labItems.length === 0) {
                html += `<div style="padding: 15px; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Nenhum material registrado neste almoxarifado.</div>`;
            } else {
                html += `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: rgba(255,255,255,0.02); color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <th style="padding: 10px 16px;">Produto</th>
                                <th style="padding: 10px 16px;">Categoria</th>
                                <th style="padding: 10px 16px;">Qtd</th>
                                <th style="padding: 10px 16px;">Localização</th>
                                <th style="padding: 10px 16px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                labItems.forEach(item => {
                    let statusColor = '#2ecc71'; // Pertencente
                    if (item.status === 'Não Pertencente') statusColor = '#f39c12';
                    if (item.status === 'Não apresenta no estoque' || item.inconformidade) statusColor = '#e74c3c';

                    html += `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;">
                                <td style="padding: 10px 16px; font-weight: 600; color: #fff;">
                                    <span style="margin-right: 6px;">${item.emoji || '📦'}</span>${item.name}
                                </td>
                                <td style="padding: 10px 16px; color: var(--text-muted); text-transform: capitalize;">${item.category || '-'}</td>
                                <td style="padding: 10px 16px; font-weight: bold; color: var(--primary-beige);">${item.quantity}</td>
                                <td style="padding: 10px 16px; color: var(--text-light);">${item.location || '-'}</td>
                                <td style="padding: 10px 16px;">
                                    <span style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                                        ${item.inconformidade ? 'Inconformidade' : item.status}
                                    </span>
                                </td>
                            </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                </div>
                `;
            }

            html += `</div>`;
        });

        html += `</div>`;
    }

    html += `</div>`;

    containers.forEach(c => {
        if (c) c.innerHTML = html;
    });
    if (window.renderCharts) window.renderCharts();
};

// Global Window Exports para garantir funcionamento de botões HTML onclick
window.closeModal = typeof closeModal !== 'undefined' ? closeModal : () => { };
window.openModal = typeof openModal !== 'undefined' ? openModal : () => { };
window.switchTab = typeof switchTab !== 'undefined' ? switchTab : () => { };
window.voltarCategoriaBoletim = typeof voltarCategoriaBoletim !== 'undefined' ? voltarCategoriaBoletim : () => { };
window.selectBoletimCategoria = typeof selectBoletimCategoria !== 'undefined' ? selectBoletimCategoria : () => { };
window.openNetworkCategoryViewer = typeof openNetworkCategoryViewer !== 'undefined' ? openNetworkCategoryViewer : () => { };
window.openAddAlmoxarifadoModal = typeof openAddAlmoxarifadoModal !== 'undefined' ? openAddAlmoxarifadoModal : () => { };
window.backToAlmoxSelector = typeof backToAlmoxSelector !== 'undefined' ? backToAlmoxSelector : () => { };
window.filterCoordBoletins = typeof filterCoordBoletins !== 'undefined' ? filterCoordBoletins : () => { };
window.filterNotifications = typeof filterNotifications !== 'undefined' ? filterNotifications : () => { };
window.openNewPlanoModal = typeof openNewPlanoModal !== 'undefined' ? openNewPlanoModal : () => { };
window.openBoletimDetailsModal = typeof openBoletimDetailsModal !== 'undefined' ? openBoletimDetailsModal : () => { };
window.promptStatusUpdate = typeof promptStatusUpdate !== 'undefined' ? promptStatusUpdate : () => { };
window.deleteSchool = typeof deleteSchool !== 'undefined' ? deleteSchool : () => { };
window.deleteLab = typeof deleteLab !== 'undefined' ? deleteLab : () => { };
window.openTransferModal = typeof openTransferModal !== 'undefined' ? openTransferModal : () => { };
window.togglePassword = typeof togglePassword !== 'undefined' ? togglePassword : () => { };
window.switchOcorrenciasTab = typeof switchOcorrenciasTab !== 'undefined' ? switchOcorrenciasTab : () => { };
window.handleAddProductSubmit = typeof handleAddProductSubmit !== 'undefined' ? handleAddProductSubmit : () => { };
window.handleBoletimSubmit = typeof handleBoletimSubmit !== 'undefined' ? handleBoletimSubmit : () => { };
window.handleAddPlanoSubmit = typeof handleAddPlanoSubmit !== 'undefined' ? handleAddPlanoSubmit : () => { };
window.handleTransferSubmit = typeof handleTransferSubmit !== 'undefined' ? handleTransferSubmit : () => { };

window.switchSubTab = function (panelId, tabId) {
    const buttons = document.querySelectorAll(`.${panelId}-subtab-btn`);
    const panes = document.querySelectorAll(`.${panelId}-subtab-pane`);
    buttons.forEach(btn => {
        if (btn.dataset.tab === tabId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    panes.forEach(pane => {
        if (pane.id === `${panelId}-pane-${tabId}`) pane.style.display = 'block';
        else pane.style.display = 'none';
    });
    if (panelId === 'geral' && (tabId === 'kpis' || tabId === 'recursos')) {
        if (window.renderCharts) window.renderCharts();
        if (tabId === 'recursos' && window.renderRecursosSurvey) window.renderRecursosSurvey();
    }
    if ((panelId === 'geral' || panelId === 'coord') && tabId === 'previsoes') {
        if (window.renderPrevisoes) window.renderPrevisoes();
    }
    if (panelId === 'coord' && tabId === 'recursos') {
        if (window.renderRecursosSurvey) window.renderRecursosSurvey();
    }
    if (panelId === 'coord' && tabId === 'gestao') {
        if (window.renderCoordGestao) window.renderCoordGestao();
    }
};

// --- PREVISÕES & ANÁLISE PREDITIVA ---
window.renderPrevisoes = function() {
    const containers = document.querySelectorAll('.previsoes-analysis-container');
    if (containers.length === 0) return;

    const boletins = registeredBoletins || [];
    const allowedItems = inventory.filter(i => !window.isItemAllowedForUser || window.isItemAllowedForUser(i));

    // Contagem por categoria
    const catCounts = {};
    let totalBol = 0;
    boletins.forEach(b => {
        const cat = (b.categoria || 'outros').toLowerCase();
        catCounts[cat] = (catCounts[cat] || 0) + 1;
        totalBol++;
    });

    // Contagem por status
    const statusCounts = {};
    boletins.forEach(b => {
        const st = b.status || 'Enviado';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });
    const pendentes = (statusCounts['Enviado'] || 0) + (statusCounts['Em Análise'] || 0);
    const concluidos = statusCounts['Concluída'] || 0;
    const taxaResolucao = totalBol > 0 ? Math.round((concluidos / totalBol) * 100) : 0;

    // Itens com status irregular
    const itensIrregulares = allowedItems.filter(i =>
        i.status === 'Não apresenta no estoque' || i.status === 'Não Pertencente' || i.inconformidade
    );
    const taxaIrregularidade = allowedItems.length > 0 ? Math.round((itensIrregulares.length / allowedItems.length) * 100) : 0;

    // Professores envolvidos em mais ocorrências
    const profOcorrencias = {};
    boletins.forEach(b => {
        const prof = b.professor || 'Desconhecido';
        profOcorrencias[prof] = (profOcorrencias[prof] || 0) + 1;
    });

    // Build predictive alerts
    const alertas = [];

    // Alerta de furto/extravio
    const furtos = (catCounts['furto'] || 0) + (catCounts['extravio'] || 0);
    if (furtos > 0) {
        const pctFurto = totalBol > 0 ? Math.round((furtos / totalBol) * 100) : 0;
        let severidade = 'baixa';
        let corSev = '#f39c12';
        if (pctFurto > 40) { severidade = 'crítica'; corSev = '#e74c3c'; }
        else if (pctFurto > 20) { severidade = 'alta'; corSev = '#e67e22'; }
        alertas.push({
            tipo: 'Furto / Extravio',
            severidade,
            corSev,
            total: furtos,
            pct: pctFurto,
            previsao: pctFurto > 30
                ? 'Tendência de aumento nos próximos dias. Recomenda-se reforçar controle de acesso e monitoramento nos laboratórios.'
                : 'Nível dentro do esperado, mas atenção contínua é recomendada para evitar escaladas.',
            impacto: 'Perda financeira direta, reposição de materiais, possível interrupção de aulas práticas.',
            acao: 'Instalar câmeras nos almoxarifados, implementar sistema de assinatura de retirada, revisar acessos.'
        });
    }

    // Alerta de avaria
    const avarias = catCounts['avaria'] || 0;
    if (avarias > 0) {
        const pctAvaria = totalBol > 0 ? Math.round((avarias / totalBol) * 100) : 0;
        let severidade = 'baixa';
        let corSev = '#f39c12';
        if (pctAvaria > 40) { severidade = 'crítica'; corSev = '#e74c3c'; }
        else if (pctAvaria > 20) { severidade = 'alta'; corSev = '#e67e22'; }
        alertas.push({
            tipo: 'Avaria de Equipamentos',
            severidade,
            corSev,
            total: avarias,
            pct: pctAvaria,
            previsao: pctAvaria > 25
                ? 'Volume alto de avarias indica uso inadequado ou equipamentos no fim da vida útil. Previsão de aumento de custos de manutenção.'
                : 'Ocorrências pontuais. Manutenção preventiva pode prevenir novas avarias.',
            impacto: 'Custos de reparo/reposição, aulas comprometidas por falta de equipamento funcional.',
            acao: 'Agendar manutenção preventiva mensal, treinar professores no manuseio correto, criar checklist de verificação.'
        });
    }

    // Alerta de não devolução
    const naoDev = catCounts['naodevolvido'] || 0;
    if (naoDev > 0) {
        const pctNaoDev = totalBol > 0 ? Math.round((naoDev / totalBol) * 100) : 0;
        let severidade = 'baixa';
        let corSev = '#f39c12';
        if (pctNaoDev > 30) { severidade = 'alta'; corSev = '#e67e22'; }
        alertas.push({
            tipo: 'Materiais Não Devolvidos',
            severidade,
            corSev,
            total: naoDev,
            pct: pctNaoDev,
            previsao: 'Materiais não devolvidos reduzem o estoque disponível e geram déficit progressivo nos próximos ciclos de aulas.',
            impacto: 'Escassez de materiais para turmas futuras, necessidade de compras emergenciais.',
            acao: 'Implementar lembretes automáticos de devolução, aplicar penalidades para inadimplência recorrente.'
        });
    }

    // Alerta de falta / divergência
    const faltas = (catCounts['falta'] || 0) + (catCounts['divergencia'] || 0);
    if (faltas > 0) {
        const pctFalta = totalBol > 0 ? Math.round((faltas / totalBol) * 100) : 0;
        alertas.push({
            tipo: 'Faltas & Divergências',
            severidade: pctFalta > 30 ? 'alta' : 'baixa',
            corSev: pctFalta > 30 ? '#e67e22' : '#f39c12',
            total: faltas,
            pct: pctFalta,
            previsao: 'Divergências frequentes indicam falha no controle de inventário. Pode haver erros de lançamento ou contagem.',
            impacto: 'Dados de estoque não confiáveis, dificuldade de planejamento para próximas aulas.',
            acao: 'Realizar auditoria de inventário físico, padronizar processo de entrada/saída de materiais.'
        });
    }

    // Score de risco geral
    let riskScore = 0;
    if (taxaIrregularidade > 30) riskScore += 30;
    else if (taxaIrregularidade > 15) riskScore += 15;
    if (pendentes > concluidos && totalBol > 2) riskScore += 20;
    if (furtos > 2) riskScore += 25;
    if (avarias > 2) riskScore += 15;
    riskScore = Math.min(riskScore, 100);

    let riskLabel = 'Baixo';
    let riskColor = '#2ecc71';
    if (riskScore > 60) { riskLabel = 'Crítico'; riskColor = '#e74c3c'; }
    else if (riskScore > 35) { riskLabel = 'Moderado'; riskColor = '#f39c12'; }

    // Render HTML
    let html = `
    <!-- Score de Risco -->
    <div style="display: grid; grid-template-columns: 280px 1fr; gap: 25px; margin-bottom: 25px;">
        <div style="background: rgba(0,0,0,0.3); border: 2px solid ${riskColor}40; border-radius: 16px; padding: 30px; text-align: center;">
            <div style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Índice de Risco Operacional</div>
            <div style="font-size: 3.5rem; font-weight: 900; color: ${riskColor}; line-height: 1;">${riskScore}</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: ${riskColor}; margin-top: 5px;">${riskLabel}</div>
            <div style="margin-top: 18px; background: rgba(255,255,255,0.06); height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="width: ${riskScore}%; height: 100%; background: ${riskColor}; border-radius: 5px; transition: width 0.5s;"></div>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px;">Baseado em ${totalBol} boletins registrados</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px;">
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Taxa de Resolução</div>
                <div style="font-size: 2rem; font-weight: 800; color: ${taxaResolucao > 60 ? '#2ecc71' : '#f39c12'}; margin-top: 5px;">${taxaResolucao}%</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${concluidos} de ${totalBol} concluídos</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px;">
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Pendências Ativas</div>
                <div style="font-size: 2rem; font-weight: 800; color: ${pendentes > 3 ? '#e74c3c' : '#3a8ee6'}; margin-top: 5px;">${pendentes}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">boletins aguardando ação</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px;">
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Irregularidades no Estoque</div>
                <div style="font-size: 2rem; font-weight: 800; color: ${taxaIrregularidade > 20 ? '#e74c3c' : '#2ecc71'}; margin-top: 5px;">${taxaIrregularidade}%</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${itensIrregulares.length} de ${allowedItems.length} itens</div>
            </div>
            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px;">
                <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Ocorrências Graves</div>
                <div style="font-size: 2rem; font-weight: 800; color: ${furtos > 0 ? '#e74c3c' : '#2ecc71'}; margin-top: 5px;">${furtos}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">furtos + extravios</div>
            </div>
        </div>
    </div>
    `;

    // Alertas Preditivos
    if (alertas.length > 0) {
        html += `<h3 style="color: var(--primary-beige); font-size: 1.15rem; margin-bottom: 18px; font-family: var(--font-heading);">Alertas Preditivos</h3>`;
        html += `<div style="display: flex; flex-direction: column; gap: 18px; margin-bottom: 30px;">`;
        alertas.forEach(a => {
            html += `
            <div style="background: rgba(0,0,0,0.25); border-left: 4px solid ${a.corSev}; border: 1px solid rgba(255,255,255,0.06); border-left: 4px solid ${a.corSev}; border-radius: 12px; padding: 22px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span style="font-weight: 800; font-size: 1.05rem; color: #fff;">${a.tipo}</span>
                        <span style="background: ${a.corSev}20; color: ${a.corSev}; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-left: 10px; text-transform: uppercase;">${a.severidade}</span>
                    </div>
                    <span style="color: var(--text-muted); font-size: 0.85rem;">${a.total} ocorrência(s) — ${a.pct}% do total</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px;">
                        <div style="font-size: 0.78rem; color: var(--primary-beige); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Previsão</div>
                        <div style="font-size: 0.9rem; color: var(--text-light); line-height: 1.5;">${a.previsao}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div style="background: rgba(231,76,60,0.06); padding: 14px; border-radius: 8px; border: 1px solid rgba(231,76,60,0.1);">
                            <div style="font-size: 0.78rem; color: #e74c3c; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Impacto Esperado</div>
                            <div style="font-size: 0.85rem; color: var(--text-light); line-height: 1.5;">${a.impacto}</div>
                        </div>
                        <div style="background: rgba(46,204,113,0.06); padding: 14px; border-radius: 8px; border: 1px solid rgba(46,204,113,0.1);">
                            <div style="font-size: 0.78rem; color: #2ecc71; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Ação Recomendada</div>
                            <div style="font-size: 0.85rem; color: var(--text-light); line-height: 1.5;">${a.acao}</div>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `
        <div style="background: rgba(46,204,113,0.08); border: 1px solid rgba(46,204,113,0.2); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 25px;">
            <div style="font-size: 1.5rem; margin-bottom: 10px;">✅</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #2ecc71; margin-bottom: 6px;">Nenhum alerta ativo</div>
            <div style="color: var(--text-muted); font-size: 0.9rem;">Não há ocorrências registradas para gerar previsões. Continue monitorando.</div>
        </div>
        `;
    }

    // Projeção de Impacto nos Próximos Dias
    html += `
    <h3 style="color: var(--primary-beige); font-size: 1.15rem; margin-bottom: 18px; font-family: var(--font-heading);">Projeção de Impacto — Próximos 7 Dias</h3>
    <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 18px;">
            <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-beige); margin-bottom: 8px;">Disponibilidade de Materiais</div>
                <div style="font-size: 0.9rem; color: var(--text-light); line-height: 1.5;">
                    ${taxaIrregularidade > 20
                        ? 'Com ' + taxaIrregularidade + '% de irregularidade no estoque, há risco de falta de materiais essenciais nas próximas aulas. Considere reposição preventiva.'
                        : 'Estoque dentro do nível aceitável. Não há previsão de escassez crítica nos próximos dias.'}
                </div>
            </div>
            <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-beige); margin-bottom: 8px;">Continuidade das Aulas</div>
                <div style="font-size: 0.9rem; color: var(--text-light); line-height: 1.5;">
                    ${avarias > 2
                        ? 'Alto volume de avarias registradas (' + avarias + '). Risco de máquinas indisponíveis afetando cronograma de aulas práticas.'
                        : pendentes > 3
                            ? 'Há ' + pendentes + ' pendências ativas que podem impactar o planejamento se não forem resolvidas rapidamente.'
                            : 'Sem riscos significativos para a continuidade do cronograma de aulas nos próximos dias.'}
                </div>
            </div>
            <div style="padding: 16px; background: rgba(255,255,255,0.03); border-radius: 10px;">
                <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-beige); margin-bottom: 8px;">Segurança Patrimonial</div>
                <div style="font-size: 0.9rem; color: var(--text-light); line-height: 1.5;">
                    ${furtos > 1
                        ? 'Padrão preocupante: ' + furtos + ' registros de furto/extravio detectados. Ação imediata necessária para prevenir reincidências.'
                        : furtos === 1
                            ? 'Um caso registrado. Monitorar nos próximos dias para verificar se há recorrência.'
                            : 'Sem registros de furto ou extravio. Situação patrimonial estável.'}
                </div>
            </div>
        </div>
    </div>

    <div style="background: rgba(0,92,169,0.08); border: 1px solid rgba(0,92,169,0.2); border-radius: 12px; padding: 20px;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #3a8ee6; margin-bottom: 8px;">Sobre esta Análise</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6;">
            Esta análise preditiva é gerada automaticamente com base nos dados de boletins de ocorrência, inventário e atividades registradas na plataforma SENAI VEST. As previsões consideram tendências históricas de categorias como furtos, extravios, avarias e divergências para antecipar possíveis problemas e recomendar ações preventivas.
        </div>
    </div>
    `;

    containers.forEach(container => {
        container.innerHTML = html;
    });
};

window.renderCharts = function () {
    const almoxContainer = document.getElementById('visual-chart-almox');
    if (almoxContainer) {
        const counts = {};
        let total = 0;
        const allowedItems = inventory.filter(i => !window.isItemAllowedForUser || window.isItemAllowedForUser(i));
        allowedItems.forEach(item => {
            const labObj = registeredLabs.find(l => Number(l.id) === Number(item.lab));
            const labName = labObj ? labObj.name : `Almoxarifado ${item.lab || '1'}`;
            counts[labName] = (counts[labName] || 0) + (Number(item.quantity) || 1);
            total += (Number(item.quantity) || 1);
        });

        if (total === 0) {
            almoxContainer.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Nenhum item cadastrado no estoque.</div>';
        } else {
            const colors = ['#d3bca2', '#3a8ee6', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c'];
            let colorIdx = 0;
            let currentPct = 0;
            let conicParts = [];
            let legendHtml = '';

            const entries = Object.entries(counts);
            entries.forEach(([labName, qtd], idx) => {
                const pct = idx === entries.length - 1 ? (100 - currentPct) : Math.round((qtd / total) * 100);
                const color = colors[colorIdx % colors.length];
                colorIdx++;
                const nextPct = currentPct + pct;
                conicParts.push(`${color} ${currentPct}% ${nextPct}%`);
                currentPct = nextPct;

                legendHtml += `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 0.88rem; font-weight: 600; color: var(--text-light);">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                            ${labName}
                        </span>
                        <span style="color: ${color}; font-weight: 700;">${qtd} unid. (${pct}%)</span>
                    </div>
                `;
            });

            almoxContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 20px; padding: 10px 0;">
                    <!-- Gráfico de Pizza -->
                    <div style="width: 160px; height: 160px; border-radius: 50%; background: conic-gradient(${conicParts.join(', ')}); box-shadow: 0 8px 25px rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.08); flex-shrink: 0; position: relative;"></div>
                    <!-- Legenda -->
                    <div style="flex: 1; min-width: 180px;">
                        ${legendHtml}
                    </div>
                </div>
            `;
        }
    }

    const boletinsContainer = document.getElementById('visual-chart-boletins');
    if (boletinsContainer) {
        const bCounts = {
            'Enviado': { label: 'Pendentes', color: '#3a8ee6', count: 0 },
            'Em Análise': { label: 'Em Análise', color: '#f39c12', count: 0 },
            'Aprovada': { label: 'Aprovados', color: '#2ecc71', count: 0 },
            'Em Execução': { label: 'Executando', color: '#9b59b6', count: 0 },
            'Concluída': { label: 'Concluídos', color: '#27ae60', count: 0 }
        };
        let bTotal = 0;
        registeredBoletins.forEach(b => {
            const st = b.status || 'Enviado';
            if (bCounts[st]) {
                bCounts[st].count++;
                bTotal++;
            } else {
                bCounts['Enviado'].count++;
                bTotal++;
            }
        });

        if (bTotal === 0) {
            boletinsContainer.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Nenhuma ocorrência registrada no sistema.</div>';
        } else {
            let currentPct = 0;
            let conicParts = [];
            let legendHtml = '';
            const validItems = Object.values(bCounts).filter(item => item.count > 0);
            const itemsToRender = validItems.length > 0 ? validItems : [bCounts['Enviado']];

            itemsToRender.forEach((item, idx) => {
                const pct = idx === itemsToRender.length - 1 ? (100 - currentPct) : Math.round((item.count / bTotal) * 100);
                const nextPct = currentPct + pct;
                conicParts.push(`${item.color} ${currentPct}% ${nextPct}%`);
                currentPct = nextPct;

                legendHtml += `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 0.88rem; font-weight: 600; color: var(--text-light);">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <span style="width: 12px; height: 12px; border-radius: 50%; background: ${item.color}; display: inline-block;"></span>
                            ${item.label}
                        </span>
                        <span style="color: ${item.color}; font-weight: 700;">${item.count} reg. (${pct}%)</span>
                    </div>
                `;
            });

            boletinsContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 20px; padding: 10px 0;">
                    <!-- Gráfico de Rosquinha (Donut Chart) -->
                    <div style="width: 160px; height: 160px; border-radius: 50%; background: conic-gradient(${conicParts.join(', ')}); box-shadow: 0 8px 25px rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.08); flex-shrink: 0; position: relative; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 90px; height: 90px; border-radius: 50%; background: var(--bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 10px rgba(0,0,0,0.6);">
                            <span style="font-size: 1.3rem; font-weight: 800; color: #fff;">${bTotal}</span>
                            <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Total</span>
                        </div>
                    </div>
                    <!-- Legenda -->
                    <div style="flex: 1; min-width: 180px;">
                        ${legendHtml}
                    </div>
                </div>
            `;
        }
    }

    const catContainer = document.getElementById('visual-chart-categorias');
    if (catContainer) {
        const cCounts = {};
        let cTotal = 0;
        registeredBoletins.forEach(b => {
            const cat = (b.categoria || 'Geral').toUpperCase();
            cCounts[cat] = (cCounts[cat] || 0) + 1;
            cTotal++;
        });

        if (cTotal === 0) {
            catContainer.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Nenhuma categoria registrada.</div>';
        } else {
            const colors = ['#d3bca2', '#3a8ee6', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c'];
            let idx = 0;
            let pillsHtml = '';
            const entries = Object.entries(cCounts);

            entries.forEach(([catName, count]) => {
                const pct = Math.round((count / cTotal) * 100);
                const color = colors[idx % colors.length];
                idx++;
                pillsHtml += `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid ${color}; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 0.9rem; color: #fff;">📌 ${catName}</span>
                        <span style="color: ${color}; font-weight: 700; font-size: 0.9rem;">${count} (${pct}%)</span>
                    </div>
                `;
            });

            // Gráfico de Linha SVG (Evolução de Ocurrências/Indicadores)
            catContainer.style.display = 'block';
            catContainer.innerHTML = `
                <div style="margin-bottom: 25px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px;">
                    <div style="font-size: 0.88rem; font-weight: 700; color: var(--primary-beige); margin-bottom: 15px;">📈 Gráfico de Linha - Evolução do Índice de Eficiência & Resoluções</div>
                    <div style="width: 100%; overflow-x: auto;">
                        <svg viewBox="0 0 500 160" style="width: 100%; min-width: 450px; height: 160px; overflow: visible;">
                            <!-- Linhas de Grade (Grid Lines) -->
                            <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                            <line x1="40" y1="60" x2="480" y2="60" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                            <line x1="40" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                            <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.1)" stroke-width="1.5" />
                            
                            <!-- Eixo Y labels -->
                            <text x="30" y="24" fill="#9e9e9e" font-size="10" text-anchor="end">100%</text>
                            <text x="30" y="64" fill="#9e9e9e" font-size="10" text-anchor="end">75%</text>
                            <text x="30" y="104" fill="#9e9e9e" font-size="10" text-anchor="end">50%</text>
                            <text x="30" y="144" fill="#9e9e9e" font-size="10" text-anchor="end">0%</text>

                            <!-- Área preenchida sob a linha -->
                            <polygon points="60,110 160,70 260,85 360,40 460,30 460,140 60,140" fill="rgba(58, 142, 230, 0.15)" />

                            <!-- Linha do Gráfico (Line Chart) -->
                            <polyline fill="none" stroke="#3a8ee6" stroke-width="3" points="60,110 160,70 260,85 360,40 460,30" />

                            <!-- Pontos e Labels -->
                            <circle cx="60" cy="110" r="5" fill="#d3bca2" stroke="#141414" stroke-width="2" />
                            <text x="60" y="155" fill="#f5f5f5" font-size="11" font-weight="600" text-anchor="middle">Semana 1</text>
                            <text x="60" y="100" fill="#3a8ee6" font-size="11" font-weight="700" text-anchor="middle">62%</text>

                            <circle cx="160" cy="70" r="5" fill="#d3bca2" stroke="#141414" stroke-width="2" />
                            <text x="160" y="155" fill="#f5f5f5" font-size="11" font-weight="600" text-anchor="middle">Semana 2</text>
                            <text x="160" y="60" fill="#3a8ee6" font-size="11" font-weight="700" text-anchor="middle">78%</text>

                            <circle cx="260" cy="85" r="5" fill="#d3bca2" stroke="#141414" stroke-width="2" />
                            <text x="260" y="155" fill="#f5f5f5" font-size="11" font-weight="600" text-anchor="middle">Semana 3</text>
                            <text x="260" y="75" fill="#3a8ee6" font-size="11" font-weight="700" text-anchor="middle">71%</text>

                            <circle cx="360" cy="40" r="5" fill="#d3bca2" stroke="#141414" stroke-width="2" />
                            <text x="360" y="155" fill="#f5f5f5" font-size="11" font-weight="600" text-anchor="middle">Semana 4</text>
                            <text x="360" y="30" fill="#3a8ee6" font-size="11" font-weight="700" text-anchor="middle">89%</text>

                            <circle cx="460" cy="30" r="6" fill="#2ecc71" stroke="#fff" stroke-width="2" />
                            <text x="460" y="155" fill="#f5f5f5" font-size="11" font-weight="600" text-anchor="middle">Atual</text>
                            <text x="460" y="20" fill="#2ecc71" font-size="11" font-weight="800" text-anchor="middle">95%</text>
                        </svg>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
                    ${pillsHtml}
                </div>
            `;
        }
    }
};

// ==========================================
// DIÁRIO DE CLASSE - CHAMADAS E AVALIAÇÕES
// ==========================================

const DIARIO_STORAGE_KEY = 'senaivest_diario_dados';

function getDiarioDados() {
    const dados = localStorage.getItem(DIARIO_STORAGE_KEY);
    if (dados) {
        try {
            return JSON.parse(dados);
        } catch(e) {}
    }
    const initial = {
        turmas: [],
        alunos: [],
        avaliacoes: [],
        notas: {},
        chamadas: {},
        justificativas: {}
    };
    saveDiarioDados(initial);
    return initial;
}

function saveDiarioDados(dados) {
    localStorage.setItem(DIARIO_STORAGE_KEY, JSON.stringify(dados));
    if (typeof syncWithBackend === 'function') {
        syncWithBackend('diario', dados);
    }
}

let diarioTurmaProfAtual = null;
let diarioTurmaCoordAtual = null;
let diarioDataAtual = new Date().toISOString().split('T')[0];
let diarioSubTabProfAtual = 'chamada-dia';
let diarioSubTabCoordAtual = 'alunos';

window.initDiarioClasse = function(role) {
    const dados = getDiarioDados();
    if (dados.turmas.length > 0) {
        if (!diarioTurmaProfAtual) diarioTurmaProfAtual = dados.turmas[0].id;
        if (!diarioTurmaCoordAtual) diarioTurmaCoordAtual = dados.turmas[0].id;
    }
    const dateInput = document.getElementById('diario-data-chamada');
    if (dateInput && !dateInput.value) dateInput.value = diarioDataAtual;

    if (role === 'prof') {
        renderProfTurmaSelect();
        renderProfDiarioView();
    } else if (role === 'coord') {
        renderCoordTurmaSelect();
        renderCoordGestao();
    }
};

function renderProfTurmaSelect() {
    const dados = getDiarioDados();
    const sel = document.getElementById('prof-turma-select');
    if (!sel) return;
    sel.innerHTML = dados.turmas.map(t => `<option value="${t.id}" ${t.id === diarioTurmaProfAtual ? 'selected' : ''}>${t.nome}</option>`).join('');
}

window.mudarTurmaProfessor = function() {
    const sel = document.getElementById('prof-turma-select');
    if (sel) diarioTurmaProfAtual = sel.value;
    renderProfDiarioView();
};

window.switchDiarioTab = function(tabName) {
    diarioSubTabProfAtual = tabName;
    document.querySelectorAll('.diario-subtab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    document.querySelectorAll('.diario-subtab-content').forEach(content => {
        if (content.id === `diario-tab-${tabName}`) content.style.display = 'block';
        else content.style.display = 'none';
    });
    renderProfDiarioView();
};

window.carregarChamadaData = function() {
    const inp = document.getElementById('diario-data-chamada');
    if (inp && inp.value) diarioDataAtual = inp.value;
    renderProfDiarioView();
};

function renderProfDiarioView() {
    if (diarioSubTabProfAtual === 'chamada-dia') renderChamadaProfTable();
    else if (diarioSubTabProfAtual === 'notas-aval') renderNotasProfTable();
    else if (diarioSubTabProfAtual === 'registros-chamadas') renderRegistrosChamadasProf();
}

function renderChamadaProfTable() {
    const dados = getDiarioDados();
    const tbody = document.getElementById('diario-chamada-tbody');
    if (!tbody || !diarioTurmaProfAtual) return;

    const alunos = dados.alunos.filter(a => a.turmaId === diarioTurmaProfAtual);
    if (alunos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum aluno cadastrado nesta turma pela coordenação.</td></tr>';
        document.getElementById('diario-stat-presenca').textContent = '0%';
        return;
    }

    const planoSelect = document.getElementById('diario-plano-chamada');
    if (planoSelect) {
        const curr = planoSelect.value;
        planoSelect.innerHTML = '<option value="">Nenhum (Avulso)</option>';
        const plansToTurma = lessonPlans.filter(p => !p.escola || (isSameSchool(p.escola, window.getUserSchoolCode())));
        plansToTurma.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.code;
            opt.textContent = `${p.code} - ${p.topic}`;
            planoSelect.appendChild(opt);
        });
        if (curr) planoSelect.value = curr;
    }

    const chaveChamada = `${diarioTurmaProfAtual}_${diarioDataAtual}`;
    const chamadaHoje = dados.chamadas[chaveChamada] || {};
    const justificativasHoje = (dados.justificativas && dados.justificativas[chaveChamada]) || {};

    let presencasCount = 0;
    let html = '';
    alunos.forEach(a => {
        const status = chamadaHoje[a.id] || 'P';
        if (status === 'P') presencasCount++;
        const motivo = justificativasHoje[a.id] || '';

        html += `
            <tr>
                <td style="font-weight:700; color:var(--primary-beige);">${a.matricula}</td>
                <td style="font-weight:600; color:#fff;">${a.nome}</td>
                <td style="text-align:center;">
                    <button type="button" style="padding:6px 14px; border-radius:6px; border:1px solid ${status === 'P' ? '#22c55e' : 'rgba(255,255,255,0.15)'}; background:${status === 'P' ? '#22c55e' : 'rgba(255,255,255,0.03)'}; color:${status === 'P' ? '#fff' : '#aaa'}; font-weight:700; cursor:pointer; transition:all 0.2s;" onclick="window.alterarStatusAluno('${a.id}', 'P')">Presente</button>
                </td>
                <td style="text-align:center;">
                    <button type="button" style="padding:6px 14px; border-radius:6px; border:1px solid ${status === 'F' ? '#ef4444' : 'rgba(255,255,255,0.15)'}; background:${status === 'F' ? '#ef4444' : 'rgba(255,255,255,0.03)'}; color:${status === 'F' ? '#fff' : '#aaa'}; font-weight:700; cursor:pointer; transition:all 0.2s;" onclick="window.alterarStatusAluno('${a.id}', 'F')">Falta</button>
                </td>
                <td style="text-align:center;">
                    <button type="button" style="padding:6px 14px; border-radius:6px; border:1px solid ${status === 'J' ? '#f59e0b' : 'rgba(255,255,255,0.15)'}; background:${status === 'J' ? '#f59e0b' : 'rgba(255,255,255,0.03)'}; color:${status === 'J' ? '#fff' : '#aaa'}; font-weight:700; cursor:pointer; transition:all 0.2s;" onclick="window.alterarStatusAluno('${a.id}', 'J')">Justificado</button>
                </td>
                <td>
                    <input type="text" class="form-control-reg" style="width: 100%; padding: 6px 12px; border-radius: 6px; font-size: 0.9rem; background: ${status === 'J' ? 'rgba(0,0,0,0.4)' : 'transparent'}; opacity: ${status === 'J' ? '1' : '0.3'}; border: 1px solid ${status === 'J' ? '#f59e0b' : 'var(--border-color)'}; color: #fff;" placeholder="${status === 'J' ? 'Especifique o motivo (ex: Atestado)' : '-'}" value="${status === 'J' ? motivo : ''}" ${status !== 'J' ? 'disabled' : ''} onchange="window.mudarMotivoJustificativa('${a.id}', this.value)">
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    const pct = Math.round((presencasCount / alunos.length) * 100);
    const statEl = document.getElementById('diario-stat-presenca');
    if (statEl) {
        statEl.textContent = `${pct}%`;
        statEl.style.color = pct >= 75 ? '#22c55e' : (pct >= 50 ? '#f59e0b' : '#ef4444');
    }
}

window.alterarStatusAluno = function(alunoId, status) {
    const dados = getDiarioDados();
    const chaveChamada = `${diarioTurmaProfAtual}_${diarioDataAtual}`;
    if (!dados.chamadas[chaveChamada]) dados.chamadas[chaveChamada] = {};
    dados.chamadas[chaveChamada][alunoId] = status;
    saveDiarioDados(dados);
    renderChamadaProfTable();
};

window.mudarMotivoJustificativa = function(alunoId, motivo) {
    const dados = getDiarioDados();
    const chaveChamada = `${diarioTurmaProfAtual}_${diarioDataAtual}`;
    if (!dados.justificativas) dados.justificativas = {};
    if (!dados.justificativas[chaveChamada]) dados.justificativas[chaveChamada] = {};
    dados.justificativas[chaveChamada][alunoId] = motivo;
    saveDiarioDados(dados);
};

window.salvarChamadaProfessor = function() {
    const dados = getDiarioDados();
    const chaveChamada = `${diarioTurmaProfAtual}_${diarioDataAtual}`;
    if (!dados.chamadasSalvas) dados.chamadasSalvas = {};

    const planoSelect = document.getElementById('diario-plano-chamada');
    const planoId = planoSelect ? planoSelect.value : '';

    if (planoId) {
        let alreadySaved = false;
        Object.values(dados.chamadasSalvas).forEach(s => {
            if (typeof s === 'object' && s.planoId === planoId && s.turmaId === diarioTurmaProfAtual) {
                alreadySaved = true;
            }
        });
        if (alreadySaved) {
            alert('Atenção: A chamada para este Plano de Aula já foi realizada e enviada para a coordenação. Não é possível enviar novamente para o mesmo plano.');
            return;
        }
    }

    let profName = "Professor";
    let profId = "";
    try {
        const u = JSON.parse(localStorage.getItem('registeredUser'));
        if (u) {
            profName = u.name || u.nome || "Professor";
            profId = u.email || u.id || "";
        }
    } catch(e) {}

    dados.chamadasSalvas[chaveChamada] = {
        dataHora: new Date().toLocaleString('pt-BR'),
        professor: profName,
        profId: profId,
        planoId: planoId,
        turmaId: diarioTurmaProfAtual
    };
    saveDiarioDados(dados);
    if (typeof showToast === 'function') showToast('Chamada salva e enviada para a Coordenação com sucesso!');
    else alert('Chamada salva e enviada para a Coordenação com sucesso!');
    renderProfDiarioView();
};

function renderRegistrosChamadasProf() {
    const container = document.getElementById('diario-registros-list-container');
    if (!container || !diarioTurmaProfAtual) return;
    const dados = getDiarioDados();
    const alunos = dados.alunos.filter(a => a.turmaId === diarioTurmaProfAtual);

    const datas = new Set();
    Object.keys(dados.chamadas || {}).forEach(k => {
        if (k.startsWith(`${diarioTurmaProfAtual}_`)) datas.add(k.split('_')[1]);
    });
    const listaDatas = Array.from(datas).sort().reverse();

    if (listaDatas.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">Nenhum registro de chamada realizado nesta turma ainda. Realize a chamada na aba "Chamada do Dia" e clique em Salvar.</div>`;
        return;
    }

    let html = '';
    listaDatas.forEach(dt => {
        const chave = `${diarioTurmaProfAtual}_${dt}`;
        const ch = dados.chamadas[chave] || {};
        let p = 0, f = 0, j = 0;
        alunos.forEach(a => {
            const st = ch[a.id] || 'P';
            if (st === 'P') p++;
            else if (st === 'F') f++;
            else if (st === 'J') j++;
        });
        const pct = alunos.length > 0 ? Math.round((p / alunos.length) * 100) : 0;
        const statusObj = dados.chamadasSalvas && dados.chamadasSalvas[chave];
        let statusEnvio = 'Sincronizado e Enviado para Coordenação';
        let profName = "";
        let profIdReg = "";
        
        if (statusObj) {
            if (typeof statusObj === 'string') {
                statusEnvio = `Enviado para Coordenação em ${statusObj}`;
            } else {
                statusEnvio = `Enviado para Coordenação em ${statusObj.dataHora} por ${statusObj.professor}`;
                if (statusObj.planoId) statusEnvio += ` (Plano de Aula: ${statusObj.planoId})`;
                profName = statusObj.professor;
                profIdReg = statusObj.profId;
            }
        }
        
        let currentUserProfId = "";
        try {
            const u = JSON.parse(localStorage.getItem('registeredUser'));
            if (u) currentUserProfId = u.email || u.id || "";
        } catch(e) {}
        
        if (profIdReg && currentUserProfId && profIdReg !== currentUserProfId) {
            return; // Only show user's own chamadas
        }

        html += `
            <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:12px; padding:18px; margin-bottom:14px; box-shadow:0 4px 15px rgba(0,0,0,0.15); overflow-x: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:12px;">
                    <div>
                        <strong style="color:var(--primary-beige); font-size:1.15rem;">Data da Aula: ${dt.split('-').reverse().join('/')}</strong>
                        <div style="font-size:0.85rem; color:#22c55e; font-weight:600; margin-top:3px; display:flex; align-items:center; gap:6px;">
                            <span>✓</span> ${statusEnvio}
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-size:0.95rem; font-weight:700; color:${pct>=75?'#22c55e':(pct>=50?'#f59e0b':'#ef4444')};">Presença: ${pct}%</span>
                        <button type="button" style="padding:8px 16px; background:rgba(255,255,255,0.08); border:1px solid var(--border-color); color:#fff; border-radius:8px; font-weight:700; cursor:pointer; transition:all 0.2s; font-size:0.85rem;" onclick="window.visualizarRegistroChamada('${dt}')">Editar / Visualizar</button>
                        <button type="button" style="padding:8px 16px; background:#ef4444; border:none; color:#fff; border-radius:8px; font-weight:700; cursor:pointer; font-size:0.85rem;" onclick="window.removerChamada('${dt}', false)">Excluir</button>
                    </div>
                </div>
                
                <table class="senai-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Aluno</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px; text-align: center;">Status</th>
                            <th style="border: 1px solid var(--border-color); padding: 8px;">Justificativa</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        alunos.forEach(a => {
            const st = ch[a.id] || 'P';
            const stText = st === 'P' ? 'Presente' : (st === 'F' ? 'Falta' : 'Justificado');
            const mot = (dados.justificativas && dados.justificativas[chave] && dados.justificativas[chave][a.id]) ? dados.justificativas[chave][a.id] : '-';
            const stColor = st === 'P' ? '#22c55e' : (st === 'F' ? '#ef4444' : '#f59e0b');
            html += `
                <tr>
                    <td style="border: 1px solid var(--border-color); padding: 8px;">${a.nome}</td>
                    <td style="border: 1px solid var(--border-color); padding: 8px; text-align: center; color: ${stColor}; font-weight: bold;">${stText}</td>
                    <td style="border: 1px solid var(--border-color); padding: 8px;">${mot}</td>
                </tr>
            `;
        });
        html += `
                    </tbody>
                </table>
            </div>
        `;
    });
    if (html === '') {
        html = `<div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">Nenhum registro de chamada realizado por você nesta turma ainda.</div>`;
    }
    container.innerHTML = html;
}

window.visualizarRegistroChamada = function(dataStr) {
    diarioDataAtual = dataStr;
    const inp = document.getElementById('diario-data-chamada');
    if (inp) inp.value = dataStr;
    window.switchDiarioTab('chamada-dia');
};

function renderNotasProfTable() {
    const dados = getDiarioDados();
    const theadTr = document.getElementById('diario-notas-thead-tr');
    const tbody = document.getElementById('diario-notas-tbody');
    if (!theadTr || !tbody || !diarioTurmaProfAtual) return;

    const alunos = dados.alunos.filter(a => a.turmaId === diarioTurmaProfAtual);
    const avals = dados.avaliacoes.filter(v => v.turmaId === diarioTurmaProfAtual);

    let theadHtml = `
        <th style="width: 120px;">Matrícula</th>
        <th>Nome do Aluno</th>
    `;
    avals.forEach(v => {
        theadHtml += `<th style="text-align: center; width: 130px;">${v.nome}</th>`;
    });
    theadHtml += `<th style="width: 100px; text-align: center;">Média Final</th>`;
    theadTr.innerHTML = theadHtml;

    if (alunos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${2 + avals.length + 1}" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum aluno cadastrado nesta turma pela coordenação.</td></tr>`;
        return;
    }

    let tbodyHtml = '';
    alunos.forEach(a => {
        let soma = 0;
        let count = 0;
        let colsHtml = '';

        avals.forEach(v => {
            const val = dados.notas[`${a.id}_${v.id}`];
            const valStr = val !== undefined ? val : '';
            if (val !== undefined && !isNaN(val)) {
                soma += Number(val);
                count++;
            }
            colsHtml += `
                <td style="text-align:center;">
                    <input type="number" step="0.5" min="0" max="10" class="form-control-reg" value="${valStr}" placeholder="-" style="width: 70px; padding: 6px; text-align: center; font-weight: bold; font-size: 0.95rem;" onchange="window.mudarNotaAluno('${a.id}', '${v.id}', this.value)">
                </td>
            `;
        });

        const media = count > 0 ? (soma / count).toFixed(1) : '-';
        const mediaColor = media === '-' ? '#aaa' : (media >= 6.0 ? '#22c55e' : '#ef4444');

        tbodyHtml += `
            <tr>
                <td style="font-weight:700; color:var(--primary-beige);">${a.matricula}</td>
                <td style="font-weight:600; color:#fff;">${a.nome}</td>
                ${colsHtml}
                <td style="text-align:center; font-weight:800; font-size:1.05rem; color:${mediaColor};">${media}</td>
            </tr>
        `;
    });
    tbody.innerHTML = tbodyHtml;
}

window.mudarNotaAluno = function(alunoId, avalId, valor) {
    const dados = getDiarioDados();
    const chave = `${alunoId}_${avalId}`;
    if (valor === '' || isNaN(valor)) delete dados.notas[chave];
    else {
        let n = parseFloat(valor);
        if (n < 0) n = 0;
        if (n > 10) n = 10;
        dados.notas[chave] = n;
    }
    saveDiarioDados(dados);
    renderNotasProfTable();
};

window.salvarNotasProfessor = function() {
    if (typeof showToast === 'function') showToast('Boletim de notas salvo e sincronizado com a Coordenação!');
    else alert('Boletim de notas salvo e sincronizado com a Coordenação!');
};

window.abrirModalNovaAvaliacao = function() {
    if (!diarioTurmaProfAtual) return alert('Selecione uma turma primeiro.');
    const inp = document.getElementById('input-nova-aval-nome');
    if (inp) inp.value = '';
    const m = document.getElementById('modal-diario-nova-aval');
    if (m) {
        m.classList.add('active');
        m.style.display = 'flex';
    }
};

window.salvarNovaAvaliacaoProf = function() {
    const inp = document.getElementById('input-nova-aval-nome');
    if (!inp || !inp.value.trim()) return alert('Digite o nome da avaliação.');
    const dados = getDiarioDados();
    dados.avaliacoes.push({
        id: 'V' + Date.now(),
        turmaId: diarioTurmaProfAtual,
        nome: inp.value.trim()
    });
    saveDiarioDados(dados);
    const m = document.getElementById('modal-diario-nova-aval');
    if (m) {
        m.classList.remove('active');
        m.style.display = 'none';
    }
    renderNotasProfTable();
    if (typeof showToast === 'function') showToast('Nova coluna de avaliação adicionada!');
};

// ==========================================
// GESTÃO ACADÊMICA (COORDENAÇÃO)
// ==========================================

function renderCoordTurmaSelect() {
    const dados = getDiarioDados();
    const sel = document.getElementById('coord-filtro-turma');
    if (!sel) return;
    sel.innerHTML = dados.turmas.map(t => `<option value="${t.id}" ${t.id === diarioTurmaCoordAtual ? 'selected' : ''}>${t.nome}</option>`).join('');
}

window.mudarTurmaCoord = function() {
    const sel = document.getElementById('coord-filtro-turma');
    if (sel) diarioTurmaCoordAtual = sel.value;
    renderCoordGestao();
};

window.switchCoordView = function(viewName) {
    diarioSubTabCoordAtual = viewName;
    document.querySelectorAll('#coord-pane-gestao .btn-filter').forEach(btn => {
        if (btn.id === `btn-coord-view-${viewName}`) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderCoordGestao();
};

window.renderCoordGestao = function() {
    renderCoordTurmaSelect();
    const container = document.getElementById('coord-view-content');
    if (!container || !diarioTurmaCoordAtual) return;
    const dados = getDiarioDados();
    const alunos = dados.alunos.filter(a => a.turmaId === diarioTurmaCoordAtual);

    if (diarioSubTabCoordAtual === 'alunos') {
        let html = `
            <table class="senai-table">
                <thead>
                    <tr>
                        <th style="width: 130px;">Matrícula</th>
                        <th>Nome Completo</th>
                        <th style="width: 120px; text-align: center;">Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (alunos.length === 0) {
            html += `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum aluno cadastrado nesta turma. Clique em Cadastrar Aluno acima.</td></tr>`;
        } else {
            alunos.forEach(a => {
                html += `
                    <tr>
                        <td style="font-weight:700; color:var(--primary-beige);">${a.matricula}</td>
                        <td style="font-weight:600; color:#fff;">${a.nome}</td>
                        <td style="text-align:center;">
                            <button type="button" style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:700;" onclick="window.removerAlunoCoord('${a.id}')">Excluir</button>
                        </td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table>`;
        container.innerHTML = html;
    } else if (diarioSubTabCoordAtual === 'chamadas') {
        let datas = new Set();
        Object.keys(dados.chamadas).forEach(k => {
            if (k.startsWith(`${diarioTurmaCoordAtual}_`)) datas.add(k.split('_')[1]);
        });
        const listaDatas = Array.from(datas).sort().reverse();

        if (listaDatas.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum registro de chamada salvo pelos professores nesta turma ainda.</div>`;
            return;
        }

        let html = '';
        listaDatas.forEach(dt => {
            const ch = dados.chamadas[`${diarioTurmaCoordAtual}_${dt}`] || {};
            let p = 0;
            alunos.forEach(a => { if ((ch[a.id] || 'P') === 'P') p++; });
            const pct = alunos.length > 0 ? Math.round((p / alunos.length) * 100) : 0;
            const statusObj = dados.chamadasSalvas && dados.chamadasSalvas[`${diarioTurmaCoordAtual}_${dt}`];

            html += `
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:15px; margin-bottom:12px; overflow-x: auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                        <strong style="color:var(--primary-beige); font-size:1.05rem;">Data da Aula: ${dt.split('-').reverse().join('/')}</strong>
                        <div style="display:flex; align-items:center; gap:15px;">
                            <span style="font-size:0.9rem; font-weight:700; color:${pct>=75?'#22c55e':'#ef4444'};">Frequência da Turma: ${pct}%</span>
                            <button type="button" style="padding:6px 12px; background:#ef4444; border:none; color:#fff; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.8rem;" onclick="window.removerChamada('${dt}', true)">Excluir Relatório</button>
                        </div>
                    </div>
            `;
            
            if (statusObj && typeof statusObj === 'object') {
                let text = `Registrado por: <strong>${statusObj.professor}</strong> em ${statusObj.dataHora}`;
                if (statusObj.planoId) text += ` | Plano de Aula: <strong>${statusObj.planoId}</strong>`;
                html += `<div style="margin-bottom: 10px; color: var(--text-muted); font-size: 0.9rem;">${text}</div>`;
            } else if (statusObj && typeof statusObj === 'string') {
                html += `<div style="margin-bottom: 10px; color: var(--text-muted); font-size: 0.9rem;">Registrado em ${statusObj}</div>`;
            }

            html += `
                    <table class="senai-table" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid var(--border-color); padding: 8px;">Aluno</th>
                                <th style="border: 1px solid var(--border-color); padding: 8px; text-align: center;">Status</th>
                                <th style="border: 1px solid var(--border-color); padding: 8px;">Justificativa</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            alunos.forEach(a => {
                const st = ch[a.id] || 'P';
                const stText = st === 'P' ? 'Presente' : (st === 'F' ? 'Falta' : 'Justificado');
                const mot = (dados.justificativas && dados.justificativas[`${diarioTurmaCoordAtual}_${dt}`] && dados.justificativas[`${diarioTurmaCoordAtual}_${dt}`][a.id]) ? dados.justificativas[`${diarioTurmaCoordAtual}_${dt}`][a.id] : '-';
                const stColor = st === 'P' ? '#22c55e' : (st === 'F' ? '#ef4444' : '#f59e0b');
                html += `
                    <tr>
                        <td style="border: 1px solid var(--border-color); padding: 8px;">${a.nome}</td>
                        <td style="border: 1px solid var(--border-color); padding: 8px; text-align: center; color: ${stColor}; font-weight: bold;">${stText}</td>
                        <td style="border: 1px solid var(--border-color); padding: 8px;">${mot}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>`;
        });
        container.innerHTML = html;
    } else if (diarioSubTabCoordAtual === 'notas') {
        const avals = dados.avaliacoes.filter(v => v.turmaId === diarioTurmaCoordAtual);
        let html = `
            <table class="senai-table">
                <thead>
                    <tr>
                        <th style="width: 130px;">Matrícula</th>
                        <th>Nome Completo</th>
        `;
        avals.forEach(v => { html += `<th style="text-align:center;">${v.nome}</th>`; });
        html += `<th style="text-align:center; width:100px;">Média</th></tr></thead><tbody>`;

        if (alunos.length === 0) {
            html += `<tr><td colspan="${3 + avals.length}" style="text-align:center; padding:30px; color:var(--text-muted);">Nenhum aluno cadastrado.</td></tr>`;
        } else {
            alunos.forEach(a => {
                let soma = 0, count = 0;
                let colHtml = '';
                avals.forEach(v => {
                    const val = dados.notas[`${a.id}_${v.id}`];
                    if (val !== undefined && !isNaN(val)) { soma += Number(val); count++; }
                    colHtml += `<td style="text-align:center; font-weight:600;">${val !== undefined ? val : '-'}</td>`;
                });
                const med = count > 0 ? (soma / count).toFixed(1) : '-';
                html += `
                    <tr>
                        <td style="font-weight:700; color:var(--primary-beige);">${a.matricula}</td>
                        <td style="font-weight:600; color:#fff;">${a.nome}</td>
                        ${colHtml}
                        <td style="text-align:center; font-weight:800; color:${med >= 6 ? '#22c55e' : '#ef4444'};">${med}</td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
};

window.abrirModalNovaTurmaCoord = function() {
    const inp = document.getElementById('input-nova-turma-nome');
    if (inp) inp.value = '';
    const inpCod = document.getElementById('input-nova-turma-codigo');
    if (inpCod) inpCod.value = '';
    const m = document.getElementById('modal-diario-nova-turma');
    if (m) {
        m.classList.add('active');
        m.style.display = 'flex';
    }
};

window.salvarNovaTurmaCoord = function() {
    const inp = document.getElementById('input-nova-turma-nome');
    const inpCod = document.getElementById('input-nova-turma-codigo');
    if (!inp || !inp.value.trim()) return alert('Digite o nome da turma.');
    const dados = getDiarioDados();
    const id = 'T' + Date.now();
    let courseCode = inpCod ? inpCod.value.trim().toUpperCase() : '';
    if (!courseCode) {
        courseCode = 'CURSO-' + Math.floor(1000 + Math.random() * 9000);
    }
    dados.turmas.push({ id: id, nome: inp.value.trim(), codigo: courseCode });
    saveDiarioDados(dados);
    diarioTurmaCoordAtual = id;
    diarioTurmaProfAtual = id;
    const m = document.getElementById('modal-diario-nova-turma');
    if (m) {
        m.classList.remove('active');
        m.style.display = '';
    }
    renderCoordGestao();
    if (typeof showToast === 'function') showToast('Nova turma cadastrada com sucesso!');
};

window.abrirModalNovoAlunoCoord = function() {
    const dados = getDiarioDados();
    if (dados.turmas.length === 0) return alert('Cadastre uma turma primeiro.');
    const selectEl = document.getElementById('select-turma-aluno-modal');
    if (selectEl) {
        selectEl.innerHTML = dados.turmas.map(t => `<option value="${t.id}" ${t.id === diarioTurmaCoordAtual ? 'selected' : ''}>[${t.codigo || 'SEM-COD'}] ${t.nome}</option>`).join('');
    }
    document.getElementById('input-novo-aluno-nome').value = '';
    const matEl = document.getElementById('input-novo-aluno-mat');
    if (matEl) {
        const ano = new Date().getFullYear();
        const num = Math.floor(1000 + Math.random() * 9000);
        matEl.value = `${ano}${num}`;
    }
    const m = document.getElementById('modal-diario-novo-aluno');
    if (m) {
        m.classList.add('active');
        m.style.display = 'flex';
    }
};

window.salvarNovoAlunoCoord = function() {
    const nomeInp = document.getElementById('input-novo-aluno-nome');
    const matInp = document.getElementById('input-novo-aluno-mat');
    const selectEl = document.getElementById('select-turma-aluno-modal');
    const turmaSelecionada = selectEl ? selectEl.value : diarioTurmaCoordAtual;
    if (!nomeInp || !nomeInp.value.trim()) return alert('Digite o nome do aluno.');
    if (!matInp || !matInp.value.trim()) return alert('Digite a matrícula.');
    const dados = getDiarioDados();
    dados.alunos.push({
        id: 'A' + Date.now(),
        matricula: matInp.value.trim(),
        nome: nomeInp.value.trim(),
        turmaId: turmaSelecionada
    });
    saveDiarioDados(dados);
    
    // Update view if the user added student to currently viewed turma, or switch to it
    diarioTurmaCoordAtual = turmaSelecionada;
    
    const m = document.getElementById('modal-diario-novo-aluno');
    if (m) {
        m.classList.remove('active');
        m.style.display = '';
    }
    
    // Re-render select since current turma might have changed
    renderCoordTurmaSelect();
    renderCoordGestao();
    if (typeof showToast === 'function') showToast('Aluno cadastrado na turma com sucesso!');
};

window.removerAlunoCoord = function(alunoId) {
    if (!confirm('Deseja realmente excluir este aluno?')) return;
    const dados = getDiarioDados();
    dados.alunos = dados.alunos.filter(a => a.id !== alunoId);
    saveDiarioDados(dados);
    renderCoordGestao();
    if (typeof showToast === 'function') showToast('Aluno removido.');
};

window.removerChamada = function(dataStr, isCoord = false) {
    if (!confirm(`Deseja realmente excluir o relatório de presença do dia ${dataStr.split('-').reverse().join('/')}?`)) return;
    const dados = getDiarioDados();
    const turmaId = isCoord ? diarioTurmaCoordAtual : diarioTurmaProfAtual;
    const chave = `${turmaId}_${dataStr}`;
    delete dados.chamadas[chave];
    if (dados.chamadasSalvas) delete dados.chamadasSalvas[chave];
    if (dados.justificativas) delete dados.justificativas[chave];
    saveDiarioDados(dados);
    if (isCoord) renderCoordGestao();
    else renderProfDiarioView();
    if (typeof showToast === 'function') showToast('Relatório de presença excluído.');
};


// ======================================================
// AGENDA & CALENDÁRIO
// ======================================================

const AGENDA_STORAGE_KEY = 'senaivest_agenda_events_v2';
const CATEGORIES_STORAGE_KEY = 'senaivest_event_categories';
const NEWS_STORAGE_KEY = 'senaivest_news_data';

let agendaEvents = JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY)) || [];
let eventCategories = JSON.parse(localStorage.getItem(CATEGORIES_STORAGE_KEY)) || [
    { id: 'senai', name: 'Senaivest (Oficial)', color: '#3b82f6' },
    { id: 'user', name: 'Comunidade', color: '#10b981' }
];
// Ensure "other" is removed if it was saved locally
eventCategories = eventCategories.filter(c => c.id !== 'other');
let newsData = JSON.parse(localStorage.getItem(NEWS_STORAGE_KEY)) || [];

let currentCalendarDate = new Date(); // Start at current date (or November 2026 since we use that as mockup year)
// Force mock date to November 2026 for demo purposes since the app seems to use 2026
currentCalendarDate.setFullYear(2026);
currentCalendarDate.setMonth(10); // November is 10 (0-indexed)

let selectedAgendaDate = null;

function initAgenda() {
    renderCalendar();
    renderOfficialEventsWidget();
    
    const newsCarousel = document.getElementById('news-carousel');
    if (newsCarousel) {
        newsCarousel.addEventListener('wheel', (evt) => {
            if (evt.deltaY != 0) {
                evt.preventDefault();
                newsCarousel.scrollLeft += evt.deltaY * 1.5;
            }
        });
    }
    
    document.getElementById('calendar-prev-btn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('calendar-next-btn').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    
    const form = document.getElementById('add-event-form');
    if (form) {
        const typeSelect = document.getElementById('event-type');
        const newCategoryGroup = document.getElementById('new-category-group');
        
        if (typeSelect && newCategoryGroup) {
            typeSelect.addEventListener('change', (e) => {
                if (e.target.value === 'add_new') {
                    newCategoryGroup.style.display = 'block';
                } else {
                    newCategoryGroup.style.display = 'none';
                }
            });
        }
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!selectedAgendaDate) return;
            const title = document.getElementById('event-title').value;
            const desc = document.getElementById('event-desc').value;
            let type = document.getElementById('event-type') ? document.getElementById('event-type').value : 'user';
            
            // Lidar com nova categoria
            if (type === 'add_new') {
                const newCatName = document.getElementById('new-category-name').value;
                const newCatColor = document.getElementById('new-category-color').value;
                if (!newCatName) {
                    alert("Por favor, dê um nome para a nova categoria.");
                    return;
                }
                const newCatId = 'cat_' + Date.now();
                const newCat = { id: newCatId, name: newCatName, color: newCatColor };
                eventCategories.push(newCat);
                localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(eventCategories));
                populateCategorySelects();
                renderLegend(); // update legend if we had one
                type = newCatId;
            }
            
            const cat = eventCategories.find(c => c.id === type) || { color: '#3b82f6' };
            const color = cat.color;
            
            const newEvent = {
                id: 'evt_' + Date.now(),
                title: title,
                desc: desc,
                date: selectedAgendaDate,
                type: type,
                color: color
            };
            
            agendaEvents.push(newEvent);
            localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendaEvents));
            
            if (typeof showToast === 'function') showToast('Evento adicionado com sucesso!'); if (typeof showPopinNotification === 'function') showPopinNotification('Novo Evento: ' + title, desc, type);
            
            form.reset();
            if (newCategoryGroup) newCategoryGroup.style.display = 'none';
            renderCalendar(); // refresh dots
            renderEventsForDate(selectedAgendaDate); // refresh list
            renderOfficialEventsWidget();
        });
        
        const clearBtn = document.getElementById('btn-clear-events');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja apagar todos os eventos que você adicionou localmente?')) {
                    // Reset to empty
                    agendaEvents = [];
                    localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendaEvents));
                    renderCalendar();
                    if (selectedAgendaDate) renderEventsForDate(selectedAgendaDate);
                    renderOfficialEventsWidget();
                    if (typeof showToast === 'function') showToast('Eventos limpos com sucesso!');
                }
            });
        }
    }
}

function renderCalendar() {
    const monthYearEl = document.getElementById('calendar-month-year');
    const gridEl = document.getElementById('calendar-grid');
    if (!monthYearEl || !gridEl) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    gridEl.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    
    // Fill empty slots before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        gridEl.appendChild(emptyDiv);
    }
    
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        // Criar o wrapper do numero do dia
        const numDiv = document.createElement('div');
        numDiv.className = 'calendar-day-number';
        numDiv.textContent = i;
        dayDiv.appendChild(numDiv);
        
        // Pad month and day for ISO string format (YYYY-MM-DD)
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(i).padStart(2, '0');
        const dateStr = `${year}-${mStr}-${dStr}`;
        
        if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === i) {
            dayDiv.classList.add('today');
        }
        
        if (selectedAgendaDate === dateStr) {
            dayDiv.classList.add('selected');
        }
        
        // Check for events
        const dayEvents = agendaEvents.filter(e => e.date === dateStr);
        if (dayEvents.length > 0) {
            const pillContainer = document.createElement('div');
            pillContainer.className = 'event-pill-container';
            
            // Limit to 3 events per day visually
            const visualEvents = dayEvents.slice(0, 3);
            
            visualEvents.forEach(e => {
                const pill = document.createElement('div');
                if (e.type === 'senai') {
                    pill.className = 'event-pill senai';
                } else if (e.type === 'other' && e.color) {
                    pill.className = 'event-pill';
                    pill.style.background = e.color;
                    pill.style.color = '#fff';
                } else {
                    pill.className = 'event-pill user';
                }
                pill.textContent = e.title;
                pillContainer.appendChild(pill);
            });
            
            if (dayEvents.length > 3) {
                const morePill = document.createElement('div');
                morePill.className = 'event-pill';
                morePill.style.background = 'rgba(255,255,255,0.1)';
                morePill.style.color = '#a1a1aa';
                morePill.textContent = '+' + (dayEvents.length - 3) + ' eventos';
                pillContainer.appendChild(morePill);
            }
            
            dayDiv.appendChild(pillContainer);
        }
        
        dayDiv.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayDiv.classList.add('selected');
            selectedAgendaDate = dateStr;
            
            // Enable form button
            const btn = document.getElementById('btn-submit-event');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Compartilhar Evento';
            }
            
            renderEventsForDate(dateStr);
        });
        
        gridEl.appendChild(dayDiv);
    }
}

function renderEventsForDate(dateStr) {
    const listEl = document.getElementById('agenda-events-list');
    const selectedEl = document.getElementById('agenda-selected-date');
    if (!listEl || !selectedEl) return;
    
    selectedEl.textContent = dateStr.split('-').reverse().join('/');
    
    const dayEvents = agendaEvents.filter(e => e.date === dateStr);
    
    if (dayEvents.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 30px 10px;">Nenhum evento programado neste dia.</div>';
        return;
    }
    
    let html = '';
    dayEvents.forEach(e => {
        let badgeColor = '#10b981';
        let badgeText = 'Comunidade';
        if (e.type === 'senai') {
            badgeColor = '#3b82f6';
            badgeText = 'Senaivest';
        } else if (e.type !== 'senai' && e.type !== 'user') {
            badgeColor = e.color || '#f59e0b';
            badgeText = e.categoryName || 'Comunidade';
        }
        
        html += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h4 style="margin: 0; color: #fff; font-size: 1.05rem;">${e.title}</h4>
                    <span style="background: ${badgeColor}20; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${badgeText}</span>
                </div>
                <p style="margin: 0; font-size: 0.9rem; color: #a1a1aa; line-height: 1.4;">${e.desc}</p>
            </div>
        `;
    });
    
    listEl.innerHTML = html;
}

// Inicializar na primeira vez
document.addEventListener('DOMContentLoaded', () => {
    initAgenda();
    initNewsSystem();
});

function renderOfficialEventsWidget() {
    const gridEl = document.getElementById('official-events-grid');
    if (!gridEl) return;
    
    // Sort official events by date
    const officialEvents = agendaEvents.filter(e => e.type === 'senai').sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Group by month
    const grouped = {};
    officialEvents.forEach(e => {
        const d = new Date(e.date);
        // Ajustar para fuso local para evitar problemas
        const dLocal = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const monthYear = `${monthNames[dLocal.getMonth()]} ${dLocal.getFullYear()}`;
        if (!grouped[monthYear]) grouped[monthYear] = [];
        grouped[monthYear].push(e);
    });
    
    let html = '';
    
    Object.keys(grouped).forEach((monthYear, idx) => {
        // Para cada mês, criar um bloco
        const borderStyle = idx < Object.keys(grouped).length - 1 ? 'border-right: 1px solid #3c4043; padding-right: 20px;' : 'padding-right: 20px;';
        
        let monthHtml = `
            <div style="${borderStyle}">
                <div style="font-size: 0.75rem; color: #9aa0a6; margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">${monthYear}</div>
        `;
        
        grouped[monthYear].forEach(ev => {
            const dateParts = ev.date.split('-');
            const dayStr = dateParts[2] + '/' + dateParts[1];
            
            monthHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width:16px; height:16px; background:#3b82f6; border-radius:2px; display:flex; align-items:center; justify-content:center;">
                            <span style="font-size: 0.5rem; color: white;">S</span>
                        </div>
                        <div>
                            <div style="font-size: 0.95rem; font-weight: 500; color: #e8eaed;">${ev.title}</div>
                            <div style="font-size: 0.75rem; color: #9aa0a6;">${ev.desc.substring(0, 40)}${ev.desc.length > 40 ? '...' : ''}</div>
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: #8ab4f8; font-weight: 500; margin-left: 15px;">
                        ${dayStr}
                    </div>
                </div>
            `;
        });
        
        monthHtml += `</div>`;
        html += monthHtml;
    });
    
    if (Object.keys(grouped).length === 0) {
        html = '<div style="color: #9aa0a6; padding: 20px;">Nenhum evento oficial agendado.</div>';
    }
    
    gridEl.innerHTML = html;
}

function populateCategorySelects() {
    const eventTypeSelect = document.getElementById('event-type');
    const newsCategorySelect = document.getElementById('news-category');
    
    let html = '';
    eventCategories.forEach(cat => {
        html += `<option value="${cat.id}">${cat.name}</option>`;
    });
    html += `<option value="add_new">+ Adicionar Categoria...</option>`;
    
    if (eventTypeSelect) eventTypeSelect.innerHTML = html;
    if (newsCategorySelect) {
        // News doesn't have "add new" here to keep it simple, or it can
        let newsHtml = '';
        eventCategories.forEach(cat => {
            newsHtml += `<option value="${cat.id}">${cat.name}</option>`;
        });
        newsCategorySelect.innerHTML = newsHtml;
    }
}

function renderNewsCarousel() {
    const carousel = document.getElementById('news-carousel');
    if (!carousel) return;
    
    // Get the Add Button to preserve it
    const addBtn = document.getElementById('btn-add-news');
    
    // Clear current cards except add button
    carousel.innerHTML = '';
    
    newsData.forEach((news, index) => {
        const coverPhoto = (news.photos && news.photos.length > 0) ? news.photos[0] : '';
        const cat = eventCategories.find(c => c.id === news.category) || { name: 'Geral', color: '#8b5cf6' };
        
        const card = document.createElement('div');
        card.className = 'news-card';
        card.style.backgroundImage = `url('${coverPhoto}')`;
        card.innerHTML = `
            <div class="news-card-overlay">
                <span class="news-tag" style="background: ${cat.color}">${cat.name}</span>
                <h4 style="margin: 0 0 6px 0; font-size: 1.15rem;">${news.title}</h4>
                <p style="margin: 0; font-size: 0.85rem; color: #cbd5e1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${news.desc}</p>
            </div>
        `;
        
        card.addEventListener('click', () => openNewsLightbox(index));
        carousel.appendChild(card);
    });
    
    if (addBtn) carousel.appendChild(addBtn);
}

function initNewsSystem() {
    populateCategorySelects();
    renderNewsCarousel();
    
    // Setup Modals
    const btnAddNews = document.getElementById('btn-add-news');
    const publishModal = document.getElementById('modal-publish-news');
    const viewModal = document.getElementById('modal-view-news');
    const closePublishModal = document.getElementById('close-publish-modal');
    const closeViewModal = document.getElementById('close-view-modal');
    
    if (btnAddNews && publishModal) {
        btnAddNews.addEventListener('click', () => {
            populateCategorySelects(); // update just in case
            document.getElementById('publish-news-form').reset();
            
            // reset photos container to 1 input
            const container = document.getElementById('news-photos-container');
            if (container) {
                container.innerHTML = '<input type="file" accept="image/*" name="news-photo-file" required class="form-control" style="background: rgba(0,0,0,0.2); font-size: 0.85rem;">';
            }
            publishModal.style.display = 'flex';
        });
    }
    
    if (closePublishModal && publishModal) closePublishModal.addEventListener('click', () => publishModal.style.display = 'none');
    if (closeViewModal && viewModal) closeViewModal.addEventListener('click', () => viewModal.style.display = 'none');
    
    const btnAddPhoto = document.getElementById('btn-add-news-photo');
    const photosContainer = document.getElementById('news-photos-container');
    if (btnAddPhoto && photosContainer) {
        btnAddPhoto.addEventListener('click', () => {
            const currentInputs = photosContainer.querySelectorAll('input[name="news-photo-file"]');
            if (currentInputs.length >= 10) {
                if (typeof showToast === 'function') showToast('Máximo de 10 fotos atingido!');
                return;
            }
            const input = document.createElement('input');
            input.type = 'url';
            input.name = 'news-photo-url';
            input.required = true;
            input.className = 'form-control';
            input.placeholder = `URL da foto ${currentInputs.length + 1}`;
            input.style = 'background: rgba(0,0,0,0.2); font-size: 0.85rem; margin-top: 8px;';
            photosContainer.appendChild(input);
        });
    }
    
    const publishForm = document.getElementById('publish-news-form');
    if (publishForm) {
        publishForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('news-title').value;
            const category = document.getElementById('news-category').value;
            const desc = document.getElementById('news-desc').value;
            
            const photoInputs = photosContainer.querySelectorAll('input[name="news-photo-file"]');
            const filePromises = [];
            
            photoInputs.forEach(input => {
                if (input.files && input.files[0]) {
                    const file = input.files[0];
                    if (file.size > 50 * 1024 * 1024) {
                        alert(`A foto ${file.name} excede o limite de 50MB.`);
                        return; // Pula este arquivo
                    }
                    
                    const promise = new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });
                    filePromises.push(promise);
                }
            });
            
            Promise.all(filePromises).then(photos => {
                if (photos.length === 0) {
                    alert("Forneça pelo menos 1 foto válida!");
                    return;
                }
                
                const newItem = {
                    id: 'news_' + Date.now(),
                    title, category, desc, photos
                };
                
                try {
                    newsData.unshift(newItem);
                    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsData));
                    
                    publishModal.style.display = 'none';
                    renderNewsCarousel();
                    if (typeof showToast === 'function') showToast('Cobertura publicada com sucesso!'); if (typeof showPopinNotification === 'function') showPopinNotification('Nova Not�cia: ' + title, desc, 'user');
                } catch (e) {
                    alert("Erro ao salvar! As fotos podem ser muito grandes para o armazenamento local do navegador.");
                    newsData.shift(); // remove o que falhou
                }
            });
        });
    }
    
    const btnDeleteNews = document.getElementById('btn-delete-news');
    if (btnDeleteNews) {
        btnDeleteNews.addEventListener('click', () => {
            const index = btnDeleteNews.getAttribute('data-index');
            if (index !== null && confirm('Tem certeza que deseja apagar esta cobertura?')) {
                newsData.splice(parseInt(index), 1);
                localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(newsData));
                document.getElementById('modal-view-news').style.display = 'none';
                renderNewsCarousel();
                if (typeof showToast === 'function') showToast('Cobertura apagada com sucesso!');
            }
        });
    }
}

function openNewsLightbox(index) {
    const news = newsData[index];
    if (!news) return;
    
    const viewModal = document.getElementById('modal-view-news');
    const mainImg = document.getElementById('news-lightbox-main-img');
    const title = document.getElementById('news-lightbox-title');
    const desc = document.getElementById('news-lightbox-desc');
    const tag = document.getElementById('news-lightbox-tag');
    const gallery = document.getElementById('news-lightbox-gallery');
    const btnDeleteNews = document.getElementById('btn-delete-news');
    
    if (btnDeleteNews) btnDeleteNews.setAttribute('data-index', index);
    
    mainImg.src = news.photos[0];
    title.textContent = news.title;
    desc.textContent = news.desc;
    
    const cat = eventCategories.find(c => c.id === news.category) || { name: 'Geral', color: '#8b5cf6' };
    tag.textContent = cat.name;
    tag.style.background = cat.color;
    
    gallery.innerHTML = '';
    news.photos.forEach((photoUrl, pIndex) => {
        const thumb = document.createElement('img');
        thumb.src = photoUrl;
        thumb.style = `width: 80px; height: 60px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid ${pIndex === 0 ? cat.color : 'transparent'}; opacity: ${pIndex === 0 ? '1' : '0.6'}; transition: all 0.2s;`;
        
        thumb.addEventListener('click', () => {
            mainImg.src = photoUrl;
            // update styles
            Array.from(gallery.children).forEach(child => {
                child.style.border = '2px solid transparent';
                child.style.opacity = '0.6';
            });
            thumb.style.border = `2px solid ${cat.color}`;
            thumb.style.opacity = '1';
        });
        
        gallery.appendChild(thumb);
    });
    
    viewModal.style.display = 'flex';
}

// --- NOTIFICAÇÕES POP-IN ---
window.checkNotificationPermission = function() {
    // Only ask if logged in as user (not coord)
    if (localStorage.getItem('isLoggedIn') !== 'true' || sessionStorage.getItem('coordSession')) return;
    
    const perm = localStorage.getItem('senaivest_notif_permission');
    if (!perm) {
        document.getElementById('modal-notif-permission').style.display = 'flex';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Check shortly after load (for auto-login)
    setTimeout(checkNotificationPermission, 1500);
    
    // Bind modal buttons
    const btnAllow = document.getElementById('btn-notif-allow');
    const btnDeny = document.getElementById('btn-notif-deny');
    const modal = document.getElementById('modal-notif-permission');
    
    if (btnAllow) {
        btnAllow.addEventListener('click', () => {
            localStorage.setItem('senaivest_notif_permission', 'granted');
            modal.style.display = 'none';
        });
    }
    if (btnDeny) {
        btnDeny.addEventListener('click', () => {
            localStorage.setItem('senaivest_notif_permission', 'denied');
            modal.style.display = 'none';
        });
    }
});

window.showPopinNotification = function(title, message, iconType = 'senaivest') {
    const perm = localStorage.getItem('senaivest_notif_permission');
    if (perm !== 'granted') return; // Do not show if not allowed
    
    const container = document.getElementById('popin-notifications-container');
    if (!container) return;
    
    const notifId = 'popin_' + Date.now();
    const div = document.createElement('div');
    div.className = 'popin-toast';
    div.id = notifId;
    
    let iconUrl = '';
    let senderName = '';
    
    if (iconType === 'senaivest') {
        iconUrl = 'https://i.ibb.co/hR2G86M/senai-logo.png';
        senderName = 'Senaivest Oficial';
    } else {
        iconUrl = 'https://i.ibb.co/689n053/profile.png'; // default user profile
        senderName = 'Membro da Comunidade';
    }
    
    div.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; width: 320px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; flex-direction: column; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #3b82f6;"></div>
            
            <button onclick="document.getElementById('${notifId}').classList.add('hiding'); setTimeout(() => document.getElementById('${notifId}').remove(), 300);" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #a1a1aa; cursor: pointer;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <img src="${iconUrl}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; background: #fff;" onerror="this.src='https://i.ibb.co/689n053/profile.png'">
                <div style="display: flex; flex-direction: column;">
                    <span style="color: #fff; font-size: 0.8rem; font-weight: 600;">${senderName}</span>
                    <span style="color: #a1a1aa; font-size: 0.7rem;">agora mesmo</span>
                </div>
            </div>
            
            <div style="margin-left: 34px;">
                <h4 style="color: #fff; margin: 0 0 4px 0; font-size: 0.95rem;">${title}</h4>
                <p style="color: #a1a1aa; margin: 0; font-size: 0.85rem; line-height: 1.3;">${message}</p>
            </div>
        </div>
    `;
    
    container.appendChild(div);
    
    // Auto remove after 5s
    setTimeout(() => {
        const el = document.getElementById(notifId);
        if (el) {
            el.classList.add('hiding');
            setTimeout(() => el.remove(), 300);
        }
    }, 5000);
};

