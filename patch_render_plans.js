const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

const ownerCheckCode = `
        // Verificar se o usuário logado é o dono do plano (por teacherId ou nome para planos antigos)
        let isOwner = true;
        try {
            const loggedUser = JSON.parse(localStorage.getItem('registeredUser') || '{}');
            const loggedTeacherId = (loggedUser.email || loggedUser.id || loggedUser.code || '').trim();
            const loggedName = (loggedUser.name || '').trim();
            if (plano.teacherId && loggedTeacherId) {
                isOwner = plano.teacherId === loggedTeacherId;
            } else if (loggedName && plano.professor) {
                isOwner = plano.professor.trim() === loggedName;
            }
        } catch (e) { isOwner = true; }

        // Botões de ação — apenas para o dono do plano
        let actionButtons = '';
        if (isOwner) {
            if (plano.statusAula === 'agendada') {
                actionButtons = '<button class="btn-table-action" onclick="iniciarAulaPlano(' + plano.id + ')" style="background:#22c55e; color:#fff; padding:6px 12px; border-radius:6px; font-weight:600; font-size:0.82rem; white-space:nowrap;">▶ Iniciar</button>';
            } else if (plano.statusAula === 'em_andamento') {
                actionButtons = '<button class="btn-table-action" onclick="encerrarAulaPlano(' + plano.id + ')" style="background:#ef4444; color:#fff; padding:6px 12px; border-radius:6px; font-weight:600; font-size:0.82rem; white-space:nowrap;">⏹ Encerrar</button>';
            } else if ((plano.statusAula === 'concluida' || plano.statusAula === 'finalizada') && Array.isArray(plano.resources) && plano.resources.length > 0 && !plano.questionarioRespondido) {
                actionButtons = '<button class="btn-table-action" onclick="openQuestionarioAula(' + plano.id + ')" style="background:#f59e0b; color:#fff; padding:6px 12px; border-radius:6px; font-weight:600; font-size:0.82rem; white-space:nowrap;">📋 Questionário</button>';
            }
        }

        `;

const idx = c.indexOf('row.innerHTML = `');
if (idx > -1) {
    const endIdx = c.indexOf('`;', idx);
    if (endIdx > -1) {
        const originalRowInnerHTML = c.substring(idx, endIdx + 2);
        
        if (originalRowInnerHTML.includes('getLabDisplayName')) {
             let modifiedRowInnerHTML = originalRowInnerHTML;
             if (modifiedRowInnerHTML.includes('openPlanoDetailsModal')) {
                 modifiedRowInnerHTML = modifiedRowInnerHTML.replace(/<button class="btn-table-action" onclick="openPlanoDetailsModal([^>]+)>Ficha<\/button>/, 
                    '<button class="btn-table-action" onclick="openPlanoDetailsModal$1>Ficha</button>\\n                    ${actionButtons}');
             }
             c = c.substring(0, idx) + ownerCheckCode + modifiedRowInnerHTML + c.substring(endIdx + 2);
             fs.writeFileSync('app.js', c);
             console.log('Successfully patched app.js renderLessonPlans');
             
             // Patch app_v2.js as well if exists
             if (fs.existsSync('app_v2.js')) {
                 let v2 = fs.readFileSync('app_v2.js', 'utf8');
                 let v2Idx = v2.indexOf('row.innerHTML = `');
                 if (v2Idx > -1) {
                     let v2EndIdx = v2.indexOf('`;', v2Idx);
                     if (v2EndIdx > -1) {
                         let v2Orig = v2.substring(v2Idx, v2EndIdx + 2);
                         if (v2Orig.includes('getLabDisplayName')) {
                             let v2Mod = v2Orig.replace(/<button class="btn-table-action" onclick="openPlanoDetailsModal([^>]+)>Ficha<\/button>/, 
                                '<button class="btn-table-action" onclick="openPlanoDetailsModal$1>Ficha</button>\\n                    ${actionButtons}');
                             v2 = v2.substring(0, v2Idx) + ownerCheckCode + v2Mod + v2.substring(v2EndIdx + 2);
                             fs.writeFileSync('app_v2.js', v2);
                             console.log('Successfully patched app_v2.js');
                         }
                     }
                 }
             }
        } else {
             console.log('Found row.innerHTML but it does not match renderLessonPlans');
        }
    }
} else {
    console.log('Could not find row.innerHTML');
}
