const fs = require('fs');

function patchFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');

    // 1. Replace COURSE_QUESTIONS
    const newQuestions = `const COURSE_QUESTIONS = {
    module1: [
        {
            question: "1- Qual é a principal função da Estela, a assistente virtual integrada no SENAI VEST?",
            options: [
                { id: "A", text: "Gerar relatórios financeiros automáticos para a coordenação." },
                { id: "B", text: "Auxiliar os professores em dúvidas sobre costura, modelagem e uso do painel." },
                { id: "C", text: "Fazer chamadas automáticas para os alunos faltosos." },
                { id: "D", text: "Configurar as máquinas de costura fisicamente no laboratório." }
            ],
            correctAnswer: "B"
        },
        {
            question: "2- Onde fica localizado o chat-coordenação-professor?",
            options: [
                { id: "A", text: "Perfil" },
                { id: "B", text: "Planos de Aula" },
                { id: "C", text: "Na barra superior ao lado do nome do usuário" },
                { id: "D", text: "Boletins" }
            ],
            correctAnswer: "C"
        },
        {
            question: "3- Como ativar o modo Vlibras?",
            options: [
                { id: "A", text: "Basta passar o mouse sobre o texto" },
                { id: "B", text: "Clicar em configuração e ativar a opção" },
                { id: "C", text: "Em chat – coordenação" },
                { id: "D", text: "Em planos de aula" }
            ],
            correctAnswer: "A"
        }
    ],
    module2: {
        lesson1: [
            {
                question: "1- Qual o design dos almoxarifados?",
                options: [
                    { id: "A", text: "Estantes" },
                    { id: "B", text: "Portas" },
                    { id: "C", text: "Grades" },
                    { id: "D", text: "Prateleiras" }
                ],
                correctAnswer: "B"
            },
            {
                question: "2- Como cadastra um produto?",
                options: [
                    { id: "A", text: "Aba de almoxarifado, selecionar uma porta, apertar no adicionar novo produto e preencher o formulário" },
                    { id: "B", text: "Aba de almoxarifado, selecionar porta , apertar o botão de adicionar nova categoria e preencher o formulário" },
                    { id: "C", text: "Aba de almoxarifado" },
                    { id: "D", text: "Planos de aula apertar em cadastrar plano de aula." }
                ],
                correctAnswer: "A"
            },
            {
                question: "3- Como ver detalhes do produto cadastrado?",
                options: [
                    { id: "A", text: "Clique em cima da porta" },
                    { id: "B", text: "Clique em cima do produto" },
                    { id: "C", text: "Clique em cima do botão nova categoria" },
                    { id: "D", text: "Nenhuma das alternativas" }
                ],
                correctAnswer: "B"
            }
        ],
        lesson2: [
            {
                question: "1- Qual o número de categorias em relação aos boletins?",
                options: [
                    { id: "A", text: "10" },
                    { id: "B", text: "9" },
                    { id: "C", text: "8" },
                    { id: "D", text: "7" }
                ],
                correctAnswer: "B"
            },
            {
                question: "2- Após realizar o boletim, para onde ele vai?",
                options: [
                    { id: "A", text: "Plano de aula" },
                    { id: "B", text: "Perfil" },
                    { id: "C", text: "Ocorrências" },
                    { id: "D", text: "Acompanhamento Real" }
                ],
                correctAnswer: "C"
            },
            {
                question: "3- Quem é responsável por atualizar o status do boletim?",
                options: [
                    { id: "A", text: "O próprio usuário" },
                    { id: "B", text: "Alunos" },
                    { id: "C", text: "Diretor" },
                    { id: "D", text: "Coordenação" }
                ],
                correctAnswer: "D"
            },
            {
                question: "4- Para que serve o chat coordenação-professor?",
                options: [
                    { id: "A", text: "Para oferecer observações e diálogos entre coordenação e professor" },
                    { id: "B", text: "Somente para estilo" },
                    { id: "C", text: "Para falar com a estela" },
                    { id: "D", text: "Para enviar boletim" }
                ],
                correctAnswer: "A"
            }
        ],
        lesson3: [
            {
                type: "text",
                question: "1- Explique em suas próprias palavras como registar um plano de Aula",
                minLength: 10
            },
            {
                question: "2- De que forma o professor pode agendar a sala de aula?",
                options: [
                    { id: "A", text: "Selecionando o código do plano de aula para onde será ministrada a aula" },
                    { id: "B", text: "Somente apertando o botão de agendar sem necessidade de cadastrar plano de aula" },
                    { id: "C", text: "Escrevendo para estela para ela adicionar o plano no acompanhamento real" },
                    { id: "D", text: "Nenhuma das alternativas" }
                ],
                correctAnswer: "A"
            }
        ]
    },
    exam: [
        {
            question: "1- Qual das alternativas descreve uma função incorreta para a assistente virtual Estela no SENAI VEST?",
            options: [
                { id: "A", text: "Esclarecer dúvidas dos docentes sobre processos de modelagem." },
                { id: "B", text: "Auxiliar os professores na navegação e uso do painel da plataforma." },
                { id: "C", text: "Configurar fisicamente o maquinário de costura dentro dos laboratórios." },
                { id: "D", text: "Responder a questionamentos relacionados a técnicas de costura." }
            ],
            correctAnswer: "C"
        },
        {
            question: "2- Ao navegar pela plataforma do SENAI VEST, em qual local exato o professor encontra o chat de comunicação direta com a coordenação?",
            options: [
                { id: "A", text: "Dentro da aba dedicada aos Boletins." },
                { id: "B", text: "Na barra superior da tela, posicionado ao lado do nome do usuário." },
                { id: "C", text: "No menu lateral, especificamente dentro da aba Planos de Aula." },
                { id: "D", text: "Apenas acessando as configurações do Perfil do usuário." }
            ],
            correctAnswer: "B"
        },
        {
            question: "3- Um professor precisa utilizar a ferramenta de acessibilidade VLibras para traduzir um conteúdo na plataforma. Qual procedimento ele deve adotar?",
            options: [
                { id: "A", text: "Clicar na aba de planos de aula e selecionar a opção de acessibilidade." },
                { id: "B", text: "Abrir o chat da coordenação e solicitar o suporte da assistente Estela." },
                { id: "C", text: "Acessar o menu de configurações gerais do sistema e ativar manualmente a caixa de seleção." },
                { id: "D", text: "Posicionar o cursor do mouse diretamente sobre o texto que deseja traduzir." }
            ],
            correctAnswer: "D"
        },
        {
            question: "4- O design estrutural do almoxarifado dentro do sistema do SENAI VEST é representado visualmente por qual elemento?",
            options: [
                { id: "A", text: "Prateleiras abertas." },
                { id: "B", text: "Estantes de metal." },
                { id: "C", text: "Portas." },
                { id: "D", text: "Grades de proteção." }
            ],
            correctAnswer: "C"
        },
        {
            question: "5- Para realizar o cadastro completo de um novo produto no estoque da plataforma, o usuário deve seguir qual sequência de passos?",
            options: [
                { id: "A", text: "Acessar a aba de almoxarifado, selecionar uma porta, clicar em adicionar novo produto e preencher o formulário correspondente." },
                { id: "B", text: "Ir até a aba de almoxarifado, selecionar uma porta e clicar no botão de adicionar nova categoria para preencher o formulário." },
                { id: "C", text: "Entrar na aba de almoxarifado e clicar diretamente no botão de salvar modificações gerais." },
                { id: "D", text: "Acessar a área de planos de aula, clicar em cadastrar plano e preencher as informações do insumo." }
            ],
            correctAnswer: "A"
        },
        {
            question: "6- Após o cadastro de um insumo no almoxarifado, qual ação o usuário deve realizar para visualizar as informações detalhadas e especificações desse produto?",
            options: [
                { id: "A", text: "Clicar em cima da imagem da porta correspondente." },
                { id: "B", text: "Clicar diretamente em cima do nome ou ícone do produto cadastrado." },
                { id: "C", text: "Clicar no botão denominado 'Nova Categoria'." },
                { id: "D", text: "Digitar o código de barras no chat de suporte com a coordenação." }
            ],
            correctAnswer: "B"
        },
        {
            question: "7- Em relação à organização dos boletins no sistema SENAI VEST, quantas categorias estruturadas existem ao todo?",
            options: [
                { id: "A", text: "7 categorias." },
                { id: "B", text: "8 categorias." },
                { id: "C", text: "9 categorias." },
                { id: "D", text: "10 categorias." }
            ],
            correctAnswer: "C"
        },
        {
            question: "8- Assim que o preenchimento de um boletim é finalizado pelo professor, para qual seção da plataforma esse documento é automaticamente direcionado?",
            options: [
                { id: "A", text: "Para a aba de Acompanhamento Real." },
                { id: "B", text: "Para a aba de Ocorrências." },
                { id: "C", text: "Para a aba de Planos de Aula." },
                { id: "D", text: "Para a página de Perfil do docente." }
            ],
            correctAnswer: "B"
        },
        {
            question: "9- O fluxo de trabalho da plataforma determina que uma figura específica possui a atribuição de atualizar o status atual de um boletim. Quem é esse responsável?",
            options: [
                { id: "A", text: "O próprio usuário que redigiu o documento." },
                { id: "B", text: "O corpo de alunos matriculados na turma." },
                { id: "C", text: "O Diretor da unidade de ensino." },
                { id: "D", text: "A Coordenação pedagógica." }
            ],
            correctAnswer: "D"
        },
        {
            question: "10- No SENAI VEST, o agendamento de uma sala de aula por parte do docente está diretamente condicionado a qual ação prévia no sistema?",
            options: [
                { id: "A", text: "À ativação imediata do modo VLibras na tela inicial." },
                { id: "B", text: "À seleção do código do plano de aula que foi previamente cadastrado para aquela respectiva aula." },
                { id: "C", text: "Ao envio de uma mensagem de texto para a assistente virtual Estela realizar a marcação automática." },
                { id: "D", text: "Ao clique simples no botão de agendamento, sem a necessidade de qualquer plano de aula registrado." }
            ],
            correctAnswer: "B"
        }
    ]
};`;

    content = content.replace(/const COURSE_QUESTIONS = \{[\s\S]*?\n\};\n/, newQuestions + '\n');

    const getLesson2QuestionsNew = `function getLesson2Questions(moduleId) {
    if (moduleId === 'module1') return COURSE_QUESTIONS.module1;
    if (moduleId === 'module2-lesson1') return COURSE_QUESTIONS.module2.lesson1;
    if (moduleId === 'module2-lesson2') return COURSE_QUESTIONS.module2.lesson2;
    if (moduleId === 'module2-lesson3') return COURSE_QUESTIONS.module2.lesson3;
    return null;
}`;
    content = content.replace(/function getLesson2Questions\(moduleId\) \{[\s\S]*?return null;\n\}/, getLesson2QuestionsNew);

    const openQuizModalNew = `function openQuizModal(moduleId) {
    if (moduleId === 'lesson1') moduleId = 'module2-lesson1';
    if (moduleId === 'lesson2') moduleId = 'module2-lesson2';
    if (moduleId === 'lesson3') moduleId = 'module2-lesson3';
    currentQuizModule = moduleId;
    currentQuizQuestionIndex = 0;
    selectedAnswers = {};

    const progress = loadCourseProgress();
    progress.attempts = progress.attempts || {};
    const attempts = progress.attempts[moduleId] || 0;
    const maxAttempts = moduleId === 'exam' ? 1 : 3;

    if (attempts >= maxAttempts) {
        showToast('Tentativas esgotadas para este quiz!', 'error');
        return;
    }

    const titleEl = document.getElementById('quiz-exam-title');
    const bodyEl = document.getElementById('quiz-exam-body');
    const submitBtn = document.getElementById('btn-quiz-exam-submit');
    const modal = document.getElementById('modal-quiz-exam');

    if (!bodyEl) return;
    bodyEl.innerHTML = '';

    const lessonQuestions = getLesson2Questions(moduleId);

    if (lessonQuestions) {
        const lessonTitles = {
            'module1': 'Quiz — Módulo 1',
            'module2-lesson1': 'Quiz — Aula 1: Almoxarifado Virtual',
            'module2-lesson2': 'Quiz — Aula 2: Boletins de Ocorrência',
            'module2-lesson3': 'Quiz — Aula 3: Planos de Aula',
        };
        if (titleEl) titleEl.textContent = lessonTitles[moduleId] || 'Quiz';
        if (submitBtn) submitBtn.textContent = \`Confirmar Resposta (1/\${lessonQuestions.length})\`;
        bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[0], 0);
    } else if (moduleId === 'exam') {
        renderExamStep();
    }

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}`;
    content = content.replace(/function openQuizModal\(moduleId\) \{[\s\S]*?window\.openQuizModal = openQuizModal;/, openQuizModalNew + '\nwindow.openQuizModal = openQuizModal;');


    const handleQuizExamSubmitNew = `function handleQuizExamSubmit(e) {
    e.preventDefault();

    const progress = loadCourseProgress();
    progress.attempts = progress.attempts || {};
    const maxAttempts = currentQuizModule === 'exam' ? 1 : 3;
    let attempts = progress.attempts[currentQuizModule] || 0;

    const lessonQuestions = getLesson2Questions(currentQuizModule);

    if (lessonQuestions) {
        const qData = lessonQuestions[currentQuizQuestionIndex];

        if (qData.type === 'text') {
            const textarea = document.getElementById('quiz-text-answer');
            const answer = textarea ? textarea.value.trim() : '';
            const minLen = qData.minLength || 10;
            if (answer.length < minLen) {
                showToast(\`Sua resposta precisa ter ao menos \${minLen} caracteres!\`, 'warning');
                return;
            }
            const evaluation = evaluateQuizTextAnswer(qData.question, answer);

            if (!evaluation.isCorrect) {
                progress.attempts[currentQuizModule] = (progress.attempts[currentQuizModule] || 0) + 1;
                saveCourseProgress(progress);
                if (progress.attempts[currentQuizModule] >= maxAttempts) {
                    showToast('Tentativas esgotadas!', 'error');
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                } else {
                    showToast('Resposta incorreta. Tente novamente!', 'error');
                }
                return;
            }
            showToast('✅ Resposta correta!', 'success');
            if (textarea) {
                textarea.style.borderColor = 'var(--accent-green)';
                textarea.disabled = true;
            }
            if (currentQuizQuestionIndex < lessonQuestions.length - 1) {
                setTimeout(() => {
                    currentQuizQuestionIndex++;
                    selectedAnswers['single'] = null;
                    const bodyEl = document.getElementById('quiz-exam-body');
                    const submitBtn = document.getElementById('btn-quiz-exam-submit');
                    if (bodyEl) bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[currentQuizQuestionIndex], currentQuizQuestionIndex);
                    if (submitBtn) submitBtn.textContent = \`Confirmar Resposta (\${currentQuizQuestionIndex + 1}/\${lessonQuestions.length})\`;
                }, 1000);
            } else {
                if (currentQuizModule === 'module1') {
                    progress.module1.quizPassed = true;
                } else {
                    const lessonMap = { 'module2-lesson1': 'lesson1', 'module2-lesson2': 'lesson2', 'module2-lesson3': 'lesson3' };
                    const lessonKey = lessonMap[currentQuizModule];
                    if (lessonKey) progress.module2[lessonKey].quizPassed = true;
                }
                saveCourseProgress(progress);
                showToast('🎉 Parabéns! Quiz concluído!', 'success');
                setTimeout(() => {
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                }, 1400);
            }
            return;
        }

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
            if (currentQuizQuestionIndex < lessonQuestions.length - 1) {
                showToast('✅ Correto! Próxima pergunta...', 'success');
                setTimeout(() => {
                    currentQuizQuestionIndex++;
                    selectedAnswers['single'] = null;
                    const bodyEl = document.getElementById('quiz-exam-body');
                    const submitBtn = document.getElementById('btn-quiz-exam-submit');
                    if (bodyEl) bodyEl.innerHTML = renderSingleQuestion(lessonQuestions[currentQuizQuestionIndex], currentQuizQuestionIndex);
                    if (submitBtn) submitBtn.textContent = \`Confirmar Resposta (\${currentQuizQuestionIndex + 1}/\${lessonQuestions.length})\`;
                }, 1000);
            } else {
                showToast('🎉 Parabéns! Quiz concluído!', 'success');
                if (currentQuizModule === 'module1') {
                    progress.module1.quizPassed = true;
                } else {
                    const lessonMap = { 'module2-lesson1': 'lesson1', 'module2-lesson2': 'lesson2', 'module2-lesson3': 'lesson3' };
                    const lessonKey = lessonMap[currentQuizModule];
                    if (lessonKey) progress.module2[lessonKey].quizPassed = true;
                }
                saveCourseProgress(progress);
                setTimeout(() => {
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                }, 1200);
            }
        } else {
            progress.attempts[currentQuizModule] = (progress.attempts[currentQuizModule] || 0) + 1;
            saveCourseProgress(progress);
            if (progress.attempts[currentQuizModule] >= maxAttempts) {
                showToast('❌ Tentativas esgotadas!', 'error');
                setTimeout(() => {
                    closeModal('modal-quiz-exam');
                    renderCourseUI();
                }, 1500);
            } else {
                showToast(\`❌ Incorreto. Você tem mais \${maxAttempts - progress.attempts[currentQuizModule]} tentativa(s).\`, 'error');
                setTimeout(() => {
                    optionCards.forEach(c => { c.style.pointerEvents = 'auto'; c.classList.remove('incorrect', 'correct', 'selected'); });
                    selectedAnswers['single'] = null;
                }, 1800);
            }
        }
    } else if (currentQuizModule === 'exam') {
        const totalQuestions = COURSE_QUESTIONS.exam.length;
        const answeredCount = Object.keys(selectedAnswers).length;

        if (answeredCount < totalQuestions) {
            showToast(\`Responda a todas as \${totalQuestions} questões da prova!\`, 'warning');
            return;
        }

        let correctCount = 0;
        COURSE_QUESTIONS.exam.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.correctAnswer) {
                correctCount++;
            }
        });

        progress.attempts['exam'] = (progress.attempts['exam'] || 0) + 1;

        const passingScore = 7;
        const passed = correctCount >= passingScore;

        if (passed) {
            progress.examPassed = true;
            saveCourseProgress(progress);
            showToast('🎓 Aprovado! Você concluiu a prova com sucesso.', 'success');
            setTimeout(() => {
                closeModal('modal-quiz-exam');
                renderCourseUI();
                openCertificateModal();
            }, 2000);
        } else {
            saveCourseProgress(progress);
            showToast(\`❌ Reprovado. Você acertou \${correctCount} de \${totalQuestions}. Tentativas esgotadas!\`, 'error');
            setTimeout(() => {
                closeModal('modal-quiz-exam');
                renderCourseUI();
            }, 2500);
        }
    }
}`;
    
    // Replace handleQuizExamSubmit using substring to accurately target the block
    const submitStart = content.indexOf('function handleQuizExamSubmit(e) {');
    const separatorIndex = content.indexOf('// ======================================================', submitStart);
    if (submitStart !== -1 && separatorIndex !== -1) {
        content = content.substring(0, submitStart) + handleQuizExamSubmitNew + '\n\n' + content.substring(separatorIndex);
    }

    fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('app_v2.js');
patchFile('app.js');
console.log('Successfully patched both files.');
