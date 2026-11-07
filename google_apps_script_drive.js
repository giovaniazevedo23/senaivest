/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT OFICIAL: BANCO DE DADOS EXCEL (9 ABAS) & GOOGLE DRIVE (SENAIVEST 2.0)
 * Planilha Oficial: https://docs.google.com/spreadsheets/d/11tnkcbkItvICOg430nluloMYE1-_i4-f1kbWRFZvHIQ/edit
 * Pasta Google Drive (Fotos & Auditoria): https://drive.google.com/drive/folders/1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj
 * Política de Retenção de Fotos: Exclusão automática após 6 meses (180 dias).
 * =========================================================================================
 */

var SPREADSHEET_ID = "11tnkcbkItvICOg430nluloMYE1-_i4-f1kbWRFZvHIQ";
var DRIVE_FOLDER_ID = "1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj";
var SEIS_MESES_MS = 180 * 24 * 60 * 60 * 1000; // 180 dias (6 meses)

/**
 * Remove automaticamente do Google Drive todas as fotos/arquivos cadastrados há mais de 6 meses (180 dias).
 * Os dados escritos permanecem salvos nas abas da planilha Excel.
 */
function expurgarFotosSeisMesesDrive() {
  try {
    var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var files = folder.getFiles();
    var agora = new Date().getTime();
    var removidos = 0;

    while (files.hasNext()) {
      var file = files.next();
      var criadoEm = file.getDateCreated().getTime();
      if ((agora - criadoEm) >= SEIS_MESES_MS) {
        file.setTrashed(true);
        removidos++;
      }
    }
    return removidos;
  } catch (err) {
    return 0;
  }
}

function obterOuCriarAba(ss, nomeAba, cabecalhos) {
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    sheet = ss.insertSheet(nomeAba);
    if (cabecalhos && cabecalhos.length > 0) {
      sheet.appendRow(cabecalhos);
    }
  }
  return sheet;
}

function doPost(e) {
  try {
    // Executar limpeza automática de fotos com mais de 6 meses no Drive
    expurgarFotosSeisMesesDrive();

    var rawData = e.postData ? e.postData.contents : "";
    var data = {};
    if (rawData) {
      try {
        data = JSON.parse(rawData);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var action = data.action || "";
    var tipo = data.tipoCadastro || "";
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
    var horarioAtual = data.horario || data.hora || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy, HH:mm:ss");

    // AÇÃO: Limpeza manual/automática de fotos com mais de 6 meses
    if (action === "purgeOldPhotos6Months") {
      var totalApagadas = expurgarFotosSeisMesesDrive();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        removedPhotos: totalApagadas,
        policy: "6 months (180 days)"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // AÇÃO: Salvar Foto / Comprovante no Google Drive (com validade de 6 meses)
    if (data.fotoBase64 || action === "savePhotoDrive") {
      try {
        var folder = DriveApp.getFolderById(data.folderId || DRIVE_FOLDER_ID);
        var nomeFoto = data.fileName || ("Foto_SenaiVest_" + new Date().getTime() + ".jpg");
        var base64Content = String(data.fotoBase64 || "").replace(/^data:image\/\w+;base64,/, "");
        var blob = Utilities.newBlob(Utilities.base64Decode(base64Content), "image/jpeg", nomeFoto);
        var arqFoto = folder.createFile(blob);
        arqFoto.setDescription("EXPIRA_EM_6_MESES | Cadastrada em: " + horarioAtual + " | Responsável: " + (data.usuario || data.professor || "Docente"));
      } catch (photoErr) {}
    }

    // 1. ABA: PERFIL
    if (tipo === "Usuario" || tipo === "PERFIL") {
      var shPerfil = obterOuCriarAba(ss, "PERFIL", ["NOME DO USUÁRIO", "SENHA", "CARGO", "ESCOLA ", "ACESSO", "MATRÍCULA", "ID"]);
      shPerfil.appendRow([
        data.nome || "",
        data.senha || "",
        data.cargo || "",
        data.escola || "SENAI Centro de Formação Cândido Atahyde",
        data.role || data.acesso || "Professor",
        data.matricula || "",
        data.id || data.matricula || ""
      ]);
    }
    // 2. ABA: PROFESSORES
    else if (tipo === "Professor" || tipo === "PROFESSORES") {
      var shProf = obterOuCriarAba(ss, "PROFESSORES", ["NOME DO PROFESSOR", "ID", "ESCOLA QUE ATUA", "MATRICULA", "SENHA ", "SITUAÇÃO"]);
      shProf.appendRow([
        data.nome || "",
        data.id || ("PROF-" + (data.matricula || "")),
        data.escola || "SENAI Centro de Formação Cândido Atahyde",
        data.matricula || "",
        data.senha || data.matricula || "",
        data.situacao || "Ativo"
      ]);
    }
    // 3. ABA: TURMAS (Apenas Nome da Turma e Professor Responsável em colunas separadas)
    else if (tipo === "Turma" || tipo === "TURMAS") {
      var shTurmas = obterOuCriarAba(ss, "TURMAS", ["TURMAS", "PROFESSOR RESPONSÁVEL "]);
      shTurmas.appendRow([
        data.nomeTurma || data.turma || "",
        data.professor || ""
      ]);
    }
    // 4. ABA: ALUNOS (Todas as 6 colunas oficiais: NOME DOS ALUNOS, TURMA, TURNO, SALA DE AULA, PONTOS XP, MATRICULA)
    else if (tipo === "Aluno" || tipo === "Alunos" || tipo === "ALUNOS") {
      var shAlunos = obterOuCriarAba(ss, "ALUNOS", ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]);
      shAlunos.appendRow([
        data.nome || data.nomeAluno || data.aluno || "",
        data.turma || "",
        data.turno || "Manhã",
        data.sala || data.salaDeAula || "Sala 01 - Modelagem",
        data.pontos !== undefined ? data.pontos : (data.xp !== undefined ? data.xp : 300),
        data.matricula || data.id || ""
      ]);
    }
    // 5. ABA: DIARIO (5 colunas oficiais: ALUNO, MATRICULA, DATA DA AULA, CHECK-IN, TURMA)
    else if (tipo === "Diario" || tipo === "Diário" || tipo === "DIARIO" || tipo === "Checkin_Bancada") {
      var shDiario = obterOuCriarAba(ss, "DIARIO", ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]);
      shDiario.appendRow([
        data.aluno || data.nome || "",
        data.matricula || data.id || "",
        data.data || data.dataAula || horarioAtual,
        data.checkin || data.status || "Presente",
        data.turma || ""
      ]);
    }
    // 6. ABA: ALMOXARIFADO (12 colunas oficiais)
    else if (tipo === "Produto" || tipo === "ALMOXARIFADO") {
      var shAlmox = obterOuCriarAba(ss, "ALMOXARIFADO", ["COD ", "PRODUTO", "QUANT", "VALOR UNITARIO", "Usuário que Cadastrou Produto", "HORARIO DO CADASTRO", "ENTRADA ", "SÁIDA", "VINCULO  AO PLANO DE AULA", "SALA VIRTUAL", "LOCALIZAÇÃO ", "Horario de saída"]);
      shAlmox.appendRow([
        data.cod || data.codigo || "",
        data.produto || data.material || "",
        data.quant !== undefined ? data.quant : "",
        data.valorUnitario || data.preco || "",
        data.usuario || "",
        horarioAtual,
        data.entrada !== undefined ? data.entrada : "",
        data.saida !== undefined ? data.saida : "",
        data.vinculo || "",
        data.sala || data.salaDevolvida || "",
        data.localizacao || "",
        data.horarioSaida || ""
      ]);
    }
    // 7. ABA: PLANOS DE AULA (5 colunas oficiais)
    else if (tipo === "Plano de Aula" || tipo === "PLANOS DE AULA") {
      var shPlanos = obterOuCriarAba(ss, "PLANOS DE AULA", ["PROFESOR", "COD DO PLANO DE AULA", "HORARIO DA AULA CADTARDO", "SALA", "PRODUTOS A SER USADO"]);
      shPlanos.appendRow([
        data.professor || "",
        data.codigoPlano || "",
        data.horario || horarioAtual,
        data.sala || "",
        data.produtoUsado || data.materiais || ""
      ]);
    }
    // 8. ABA: BOLETIM (6 colunas oficiais)
    else if (tipo === "Boletim" || tipo === "BOLETIM" || tipo === "Solicitacao_Acesso_QR") {
      var shBoletim = obterOuCriarAba(ss, "BOLETIM", ["COD", "NOME DO PROFESSOR", "HORA", "STATUS", "TEMA", "DETALHES"]);
      shBoletim.appendRow([
        data.codigo || "",
        data.autor || data.usuario || "",
        data.hora || horarioAtual,
        data.status || "Pendente",
        data.tema || "",
        data.detalhes || ""
      ]);
    }
    // 9. ABA: GESTÃO DE TURMAS (5 colunas oficiais: NOME, TURMA, PLANO, INDICE, AÇÃO)
    else if (tipo === "Gestao de Turmas" || tipo === "Gestão de Turmas" || tipo === "GESTÃO DE TURMAS" || tipo === "Conclusao_Aula_Bancada" || tipo === "Acompanhamento") {
      var shGestao = obterOuCriarAba(ss, "GESTÃO DE TURMAS", ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]);
      shGestao.appendRow([
        data.nome || data.aluno || "",
        data.turma || "",
        data.plano || data.aula || "PLAN-102",
        data.indice || data.status || "100% Excelente",
        data.acao || data.localGuarda || "Bancada Regularizada"
      ]);
    }
    // 10. AÇÃO: Organizar e Limpar Automaticamente todas as abas (TURMAS, ALUNOS, DIARIO, GESTÃO DE TURMAS, PERFIL)
    if (action === "organizarPlanilhaCompleta" || tipo === "OrganizarPlanilha") {
      organizarELimparPlanilhaCompleta(ss);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Sincronizado com sucesso na planilha SENAIVEST."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function organizarELimparPlanilhaCompleta(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  // 1. Limpar linhas concatenadas de TURMAS e deixar apenas [TURMAS, PROFESSOR RESPONSÁVEL]
  var shTurmas = obterOuCriarAba(ss, "TURMAS", ["TURMAS", "PROFESSOR RESPONSÁVEL "]);
  shTurmas.clearContents();
  shTurmas.appendRow(["TURMAS", "PROFESSOR RESPONSÁVEL "]);
  shTurmas.appendRow(["Vestuário - Manhã/noite", "Carlos Alberto"]);
  shTurmas.appendRow(["Vestuário e Estilismo - Manhã (Turma 2026.1)", "Prof. Giovani Azevedo"]);
  shTurmas.appendRow(["Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Prof. Roberto Silva"]);
  shTurmas.appendRow(["Tecelagem e Acabamentos - Noite (Turma 2026.3)", "Profª Clara Mendes"]);

  // 2. Popular ABA ALUNOS com as 6 colunas exatas: ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]
  var shAlunos = obterOuCriarAba(ss, "ALUNOS", ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]);
  if (shAlunos.getLastRow() <= 1) {
    var alunosIniciais = [
      ["Pedro Santos", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 450, "ALU-001"],
      ["Mariana Souza", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 420, "ALU-002"],
      ["Lucas Oliveira", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 390, "ALU-003"],
      ["Ana Beatriz Lima", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 410, "ALU-004"],
      ["Gabriel Costa", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 350, "ALU-005"],
      ["Juliana Martins", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "Manhã", "Sala 01 - Modelagem", 400, "ALU-006"],
      ["Rafael Almeida", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Tarde", "Sala 02 - Costura", 380, "ALU-007"],
      ["Camila Rodrigues", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Tarde", "Sala 02 - Costura", 430, "ALU-008"],
      ["Bruno Ferreira", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Tarde", "Sala 02 - Costura", 360, "ALU-009"],
      ["Fernanda Gomes", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Tarde", "Sala 02 - Costura", 415, "ALU-010"],
      ["Diego Nascimento", "Tecelagem e Acabamentos - Noite (Turma 2026.3)", "Noite", "Sala 01 - Modelagem", 395, "ALU-011"],
      ["Larissa Barbosa", "Tecelagem e Acabamentos - Noite (Turma 2026.3)", "Noite", "Sala 01 - Modelagem", 440, "ALU-012"]
    ];
    for (var i = 0; i < alunosIniciais.length; i++) {
      shAlunos.appendRow(alunosIniciais[i]);
    }
  }

  // 3. Popular ABA DIARIO com as 5 colunas exatas: ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]
  var shDiario = obterOuCriarAba(ss, "DIARIO", ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]);
  if (shDiario.getLastRow() <= 1) {
    var dataHoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy");
    var diarioInicial = [
      ["Pedro Santos", "ALU-001", dataHoje, "Presente - Bancada 01", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Mariana Souza", "ALU-002", dataHoje, "Presente - Bancada 02", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Lucas Oliveira", "ALU-003", dataHoje, "Presente - Bancada 03", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Ana Beatriz Lima", "ALU-004", dataHoje, "Presente - Bancada 04", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Gabriel Costa", "ALU-005", dataHoje, "Ausente", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Juliana Martins", "ALU-006", dataHoje, "Presente - Bancada 06", "Vestuário e Estilismo - Manhã (Turma 2026.1)"]
    ];
    for (var j = 0; j < diarioInicial.length; j++) {
      shDiario.appendRow(diarioInicial[j]);
    }
  }

  // 4. Popular ABA GESTÃO DE TURMAS com as 5 colunas exatas: ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]
  var shGestao = obterOuCriarAba(ss, "GESTÃO DE TURMAS", ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]);
  if (shGestao.getLastRow() <= 1) {
    var gestaoInicial = [
      ["Pedro Santos", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102 (Costura Reta)", "100% Excelente", "Bancada 01 Regularizada"],
      ["Mariana Souza", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102 (Costura Reta)", "98% Excelente", "Bancada 02 Regularizada"],
      ["Lucas Oliveira", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102 (Costura Reta)", "95% Bom", "Bancada 03 Regularizada"],
      ["Ana Beatriz Lima", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102 (Costura Reta)", "100% Excelente", "Bancada 04 Regularizada"],
      ["Rafael Almeida", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "PLAN-105 (Moldes Base)", "96% Excelente", "Bancada 01 Regularizada"],
      ["Diego Nascimento", "Tecelagem e Acabamentos - Noite (Turma 2026.3)", "PLAN-108 (Acabamento)", "98% Excelente", "Bancada 01 Regularizada"]
    ];
    for (var k = 0; k < gestaoInicial.length; k++) {
      shGestao.appendRow(gestaoInicial[k]);
    }
  }
}

function doGet(e) {
  expurgarFotosSeisMesesDrive();
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === "organizarPlanilhaCompleta") {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
    organizarELimparPlanilhaCompleta(ss);
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Planilha organizada com todas as 9 abas e colunas individuais!"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    spreadsheetId: SPREADSHEET_ID,
    driveFolderId: DRIVE_FOLDER_ID,
    photoRetentionPolicy: "6 months (180 days)"
  })).setMimeType(ContentService.MimeType.JSON);
}
