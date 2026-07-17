const fs = require('fs');

function patchFile(filepath) {
    if (!fs.existsSync(filepath)) return;
    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Patch getEstelaResponse
    const estelaRegex = /function getEstelaResponse\(query\) \{[\s\S]*?return "Hm, essa dúvida escapou do meu molde!.*";\s*\}/;
    
    const newEstelaLogic = `function getEstelaResponse(query) {
    const q = query.toLowerCase();

    // ==========================================
    // NOVA BASE DE CONHECIMENTO (QUIZ / AVALIAÇÃO)
    // ==========================================
    
    if (q.includes('estela') && (q.includes('função') || q.includes('serve'))) {
        return "Minha principal função (Estela) é auxiliar os professores em dúvidas sobre costura, modelagem e uso do painel do SENAI VEST.";
    }
    
    if (q.includes('chat') && q.includes('coordenação')) {
        return "O chat coordenação-professor fica localizado na barra superior da tela, posicionado ao lado do nome do usuário. Ele serve para oferecer observações e diálogos entre a coordenação e o professor.";
    }
    
    if (q.includes('vlibras') || q.includes('v libras')) {
        return "Para ativar o modo Vlibras, basta posicionar o cursor do mouse (ou passar o mouse) diretamente sobre o texto que deseja traduzir!";
    }
    
    if (q.includes('design') && q.includes('almoxarifado')) {
        return "O design estrutural dos almoxarifados no sistema é representado visualmente por Portas.";
    }
    
    if (q.includes('cadastrar') && (q.includes('novo produto') || q.includes('insumo'))) {
        return "Para realizar o cadastro completo de um novo produto no estoque: Acesse a aba de almoxarifado, selecione uma porta, clique em adicionar novo produto e preencha o formulário correspondente.";
    }
    
    if (q.includes('informações detalhadas') || q.includes('especificações') || (q.includes('visualizar') && q.includes('produto'))) {
        return "Para visualizar as informações detalhadas e especificações de um produto cadastrado, basta clicar diretamente em cima do nome ou ícone do produto no Almoxarifado.";
    }
    
    if (q.includes('categorias') && q.includes('boletim')) {
        return "Existem ao todo 9 categorias estruturadas de boletins no sistema SENAI VEST.";
    }
    
    if (q.includes('preenchimento') && q.includes('boletim')) {
        return "Assim que o preenchimento de um boletim é finalizado pelo professor, ele é automaticamente direcionado para a aba de Ocorrências. A Coordenação Pedagógica possui a atribuição de atualizar o status do boletim.";
    }
    
    if (q.includes('agendamento') || q.includes('agendar sala')) {
        return "O agendamento de uma sala de aula está diretamente condicionado à seleção do código do plano de aula que foi previamente cadastrado para aquela respectiva aula.";
    }

    // ==========================================
    // CONHECIMENTOS ORIGINAIS 
    // ==========================================

    // Saudações
    if (q.includes('olá') || q.includes('oi') || q.includes('estela') || q.includes('bom dia') || q.includes('boa tarde') || q.includes('boa noite') || q.includes('hello')) {
        return "Olá! Eu sou a Estela, a assistente virtual inteligente da plataforma SENAI VEST. Estou aqui para te explicar como nossa plataforma funciona. O que você gostaria de saber hoje?";
    }

    // Como transferir materiais
    if (q.includes('transferir') || q.includes('transferência') || q.includes('mover') || q.includes('emprestar') || q.includes('pegar emprestado')) {
        return "Para transferir um material, acesse a aba <strong>Almoxarifado</strong> e clique no botão escuro 'Transferir' no card do material. Uma janela abrirá onde você informará a quantidade desejada, o laboratório de destino e o nome do professor responsável. Aquele item será separado e aparecerá no laboratório de destino com o status de 'Não Pertencente'.";
    }

    // Como devolver materiais
    if (q.includes('devolver') || q.includes('retornar') || q.includes('devolução') || q.includes('voltar')) {
        return "Quando terminar de usar um item transferido, basta ir na aba <strong>Almoxarifado</strong>, localizar o item na sala onde ele está sendo usado, e clicar no botão verde 'Devolver'. A quantidade retornará magicamente para o item original no laboratório de origem!";
    }

    // Plano de Aula / Agendamento (Reserva Geral)
    if (q.includes('plano de aula') || q.includes('agendar') || q.includes('horário') || q.includes('reservar sala') || q.includes('reserva')) {
        return "Para agendar uma sala e reservar materiais, vá em <strong>Plano de Aula</strong> e clique em 'Criar Novo Plano'. Lá, você define a data, os horários de início e término e a sala desejada. Você também pode incluir materiais na 'Ficha de Controle'. Lembre-se: O sistema bloqueia o agendamento se a sala já estiver ocupada e requer que o plano seja cadastrado previamente!";
    }

    // Cadastros gerais e escola
    if (q.includes('cadastro') || q.includes('criar conta') || q.includes('escola') || q.includes('instituição') || q.includes('filtrar')) {
        return "O seu cadastro está vinculado à sua escola. Na página de <strong>Almoxarifado</strong>, o sistema sempre filtra e exibe apenas os materiais da escola onde você trabalha. Para trocar de escola, vá no menu <strong>Perfil</strong> e atualize sua instituição.";
    }

    // Excluir materiais
    if (q.includes('excluir') || q.includes('apagar') || q.includes('remover') || q.includes('deletar')) {
        return "Apenas materiais do seu laboratório original podem ser excluídos. Clique no botão vermelho 'Excluir' no card do produto no <strong>Almoxarifado</strong>. Use isso quando um produto for descartado, quebrado sem conserto ou consumido totalmente.";
    }

    // Diferença Boletim x Ocorrência
    if (q.includes('diferença') || q.includes('boletim') || q.includes('ocorrência') || q.includes('denúncia') || q.includes('avaria')) {
        return "A seção <strong>Boletim</strong> é como um diário de bordo: serve para relatos do dia a dia da sala. Já a aba de <strong>Ocorrências (Denúncias)</strong> deve ser usada para registrar materiais quebrados, sumiços ou situações graves, ajudando a coordenação a tomar providências.";
    }

    // Perfil e Dados
    if (q.includes('perfil') || q.includes('e-mail') || q.includes('atualizar dados') || q.includes('senha') || q.includes('notificações')) {
        return "No menu <strong>Perfil</strong> você edita seus dados pessoais e cargo. Na aba <strong>Notificações</strong>, o sistema te envia alertas importantes, como quando um plano de aula é finalizado ou avisos sobre a plataforma.";
    }

    // Sustentabilidade
    if (q.includes('reciclar') || q.includes('meio ambiente') || q.includes('sustentabilidade') || q.includes('5s') || q.includes('lixo') || q.includes('organização')) {
        return "Sustentabilidade é muito importante para nós! Acesse o <strong>Guia de Organização</strong> para ver dicas visuais e regras de 5S aplicadas aos laboratórios de costura e modelagem.";
    }

    // Função não encontrada ou suporte
    return "Hm, essa dúvida escapou do meu molde! Se tiver alguma dúvida que eu não consiga responder ou encontrar algum problema na plataforma, envie um e-mail para o nosso suporte: <strong>senaivest.suporte@gmail.com</strong>. Nós responderemos em até 24 horas!";
}`;
    
    if(estelaRegex.test(content)) {
        content = content.replace(estelaRegex, newEstelaLogic);
        console.log("Patched getEstelaResponse in " + filepath);
    } else {
        console.log("Did not find Estela logic in " + filepath);
    }

    // 2. Patch verificarEExibirPopInQuestionario
    // It exists twice in app.js and twice in app_v2.js (if any).
    // Original: const profOk = !currentProfName || !p.professor || p.professor.trim() === currentProfName;
    // New: const profOk = !!currentProfName && !!p.professor && p.professor.trim() === currentProfName;
    
    const profOkRegex = /const profOk = !currentProfName \|\| !p\.professor \|\| p\.professor\.trim\(\) === currentProfName;/g;
    const newProfOk = "const profOk = !!currentProfName && !!p.professor && p.professor.trim() === currentProfName;";
    
    if(profOkRegex.test(content)) {
        content = content.replace(profOkRegex, newProfOk);
        console.log("Patched verificarEExibirPopInQuestionario in " + filepath);
    } else {
        console.log("Did not find profOk in " + filepath);
    }

    fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('app.js');
patchFile('app_v2.js');
