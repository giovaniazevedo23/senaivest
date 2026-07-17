const fs = require('fs');
let c = fs.readFileSync('app.js', 'utf8');

// Find the section inside renderLessonPlans that builds statusBtn and row.innerHTML
// We'll insert owner check and actionButtons right before row.innerHTML
const marker = "        row.innerHTML = `\r\n            <td>${formattedDate}<br><small style=\"color:var(--primary-beige);\">${plano.turno || ''}</small></td>\r\n            <td><strong>${plano.professor || 'Não informado'}</strong></td>\r\n            <td>\r\n                <span style=\"font-size:0.75rem; background:#1f1f1f; padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--primary-beige); margin-bottom:4px; display:inline-block;\">${planCode}</span><br>\r\n                <strong>${plano.course}</strong>\r\n            </td>\r\n            <td>${plano.topic}</td>\r\n            <td><strong>${plano.duracao || 2}h</strong> em ${getLabDisplayName(plano.local || 1)}<br><small style=\"color:#22c55e; font-weight:600;\">🕒 ${horInicio} - ${horFim}</small></td>\r\n            <td><strong>${schoolName}</strong></td>\r\n            <td>${plano.objectives}</td>\r\n            <td><div style=\"max-width:320px; display:flex; flex-wrap:wrap;\">${resourcesHtml}</div></td>\r\n            <td class=\"plano-actions\">\r\n                <div style=\"display: flex; align-items: center; gap: 8px;\">\r\n                    ${statusBtn}\r\n                    <button class=\"btn-table-action\" onclick=\"openPlanoDetailsModal(${plano.id})\" title=\"Ver Ficha de Controle\" style=\"padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; white-space: nowrap;\">Ficha</button>\r\n                </div>\r\n            </td>\r\n        `;";

if (!c.includes(marker)) {
    console.log('Marker NOT FOUND — checking LF version');
    const lfMarker = marker.replace(/\r\n/g, '\n');
    if (c.includes(lfMarker)) {
        console.log('LF version found, will use that');
    } else {
        console.log('Neither found. Will do line-based replacement instead.');
        // Find and show the relevant section
        const idx = c.indexOf('row.innerHTML = `');
        // Find the first one inside renderLessonPlans (after tableBody.appendChild)
        const idx2 = c.indexOf('tableBody.appendChild(row)');
        console.log('row.innerHTML at:', idx, 'tableBody at:', idx2);
        // Print the region
        const region = c.substring(idx, idx + 1200);
        console.log('Region:', JSON.stringify(region.substring(0, 500)));
        process.exit(1);
    }
}

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

const newRowHtml = `row.innerHTML = \`
            <td>\${formattedDate}<br><small style="color:var(--primary-beige);">\${plano.turno || ''}</small></td>
            <td><strong>\${plano.professor || 'Não informado'}</strong></td>
            <td>
                <span style="font-size:0.75rem; background:#1f1f1f; padding:2px 6px; border-radius:4px; border:1px solid var(--border-color); color:var(--primary-beige); margin-bottom:4px; display:inline-block;">\${planCode}</span><br>
                <strong>\${plano.course}</strong>
            </td>
            <td>\${plano.topic}</td>
            <td><strong>\${plano.duracao || 2}h</strong> em \${getLabDisplayName(plano.local || 1)}<br><small style="color:#22c55e; font-weight:600;">🕒 \${horInicio} - \${horFim}</small></td>
            <td><strong>\${schoolName}</strong></td>
            <td>\${plano.objectives}</td>
            <td><div style="max-width:320px; display:flex; flex-wrap:wrap;">\${resourcesHtml}</div></td>
            <td class="plano-actions">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap:wrap;">
                    \${statusBtn}
                    <button class="btn-table-action" onclick="openPlanoDetailsModal(\${plano.id})" title="Ver Ficha de Controle" style="padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; white-space: nowrap;">Ficha</button>
                    \${actionButtons}
                </div>
            </td>
        \`;`;

c = c.replace(marker, ownerCheckCode + newRowHtml);

if (!c.includes('isOwner')) {
    // Try LF version
    const lfMarker = marker.replace(/\r\n/g, '\n');
    c = fs.readFileSync('app.js', 'utf8');
    c = c.replace(lfMarker, ownerCheckCode + newRowHtml);
}

fs.writeFileSync('app.js', c);
console.log('Done - renderLessonPlans patched');
