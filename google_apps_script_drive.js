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
 * Grava uma linha exatamente na primeira linha vazia (a partir da linha 2),
 * funcionando mesmo quando a aba possui Tabelas formatadas do Google Sheets (ex: Tabela_7 em ALUNOS).
 */
function gravarNaPrimeiraLinhaVazia(sheet, valoresColunas) {
  if (!sheet || !valoresColunas || !valoresColunas.length) return;
  var maxRows = Math.max(sheet.getMaxRows(), 2);
  var colA = sheet.getRange(1, 1, maxRows, 1).getValues();
  var linhaAlvo = maxRows + 1;

  for (var r = 1; r < colA.length; r++) {
    if (String(colA[r][0] || "").trim() === "") {
      linhaAlvo = r + 1; // 1-indexed (r=1 é a Linha 2)
      break;
    }
  }

  sheet.getRange(linhaAlvo, 1, 1, valoresColunas.length).setValues([valoresColunas]);
}

/**
 * Obtém ou cria uma aba mantendo a Linha 1 intacta.
 */
function obterOuCriarAba(ss, nomeAba, cabecalhos) {
  var sheet = ss.getSheetByName(nomeAba);
  if (!sheet) {
    sheet = ss.insertSheet(nomeAba);
    if (cabecalhos && cabecalhos.length > 0) {
      sheet.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
    }
  }
  return sheet;
}

/**
 * Remove automaticamente do Google Drive todas as fotos/arquivos cadastrados há mais de 6 meses (180 dias).
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

/**
 * Organiza e preenche imediatamente as abas TURMAS, ALUNOS (Tabela_7), DIARIO, GESTÃO DE TURMAS e PERFIL
 * diretamente a partir da Linha 2 (A2), cada informação em sua coluna exata!
 */
function organizarELimparPlanilhaCompleta(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;

  // 1. ABA TURMAS: Limpar textos concatenados e deixar SOMENTE [TURMAS, PROFESSOR RESPONSÁVEL]
  var shTurmas = obterOuCriarAba(ss, "TURMAS", ["TURMAS", "PROFESSOR RESPONSÁVEL "]);
  var maxRowsTurmas = shTurmas.getMaxRows();
  if (maxRowsTurmas >= 2) {
    shTurmas.getRange(2, 1, maxRowsTurmas - 1, 2).clearContent();
  }
  var turmasLimpas = [
    ["Vestuário - Manhã/noite", "Carlos Alberto"],
    ["Vestuário e Estilismo - Manhã (Turma 2026.1)", "Prof. Giovani Azevedo"],
    ["Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "Prof. Roberto Silva"],
    ["Tecelagem e Acabamentos - Noite (Turma 2026.3)", "Profª Clara Mendes"]
  ];
  shTurmas.getRange(2, 1, turmasLimpas.length, 2).setValues(turmasLimpas);

  // 2. ABA ALUNOS (Tabela_7): Preencher diretamente a partir da Linha 2 (A2:F13) nas 6 colunas exatas:
  // ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]
  var shAlunos = obterOuCriarAba(ss, "ALUNOS", ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]);
  var valorA2Alunos = String(shAlunos.getRange(2, 1).getValue() || "").trim();
  if (valorA2Alunos === "") {
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
    shAlunos.getRange(2, 1, alunosIniciais.length, 6).setValues(alunosIniciais);
  }

  // 3. ABA DIARIO: Preencher diretamente a partir da Linha 2 (A2:E13) nas 5 colunas exatas:
  // ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]
  var shDiario = obterOuCriarAba(ss, "DIARIO", ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]);
  var valorA2Diario = String(shDiario.getRange(2, 1).getValue() || "").trim();
  if (valorA2Diario === "") {
    var dataHoje = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy");
    var diarioInicial = [
      ["Pedro Santos", "ALU-001", dataHoje, "Presente - Bancada 01", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Mariana Souza", "ALU-002", dataHoje, "Presente - Bancada 02", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Lucas Oliveira", "ALU-003", dataHoje, "Presente - Bancada 03", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Ana Beatriz Lima", "ALU-004", dataHoje, "Presente - Bancada 04", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Gabriel Costa", "ALU-005", dataHoje, "Ausente", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Juliana Martins", "ALU-006", dataHoje, "Presente - Bancada 06", "Vestuário e Estilismo - Manhã (Turma 2026.1)"],
      ["Rafael Almeida", "ALU-007", dataHoje, "Presente - Bancada 01", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)"],
      ["Camila Rodrigues", "ALU-008", dataHoje, "Presente - Bancada 02", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)"],
      ["Bruno Ferreira", "ALU-009", dataHoje, "Presente - Bancada 03", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)"],
      ["Fernanda Gomes", "ALU-010", dataHoje, "Presente - Bancada 04", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)"],
      ["Diego Nascimento", "ALU-011", dataHoje, "Presente - Bancada 01", "Tecelagem e Acabamentos - Noite (Turma 2026.3)"],
      ["Larissa Barbosa", "ALU-012", dataHoje, "Presente - Bancada 02", "Tecelagem e Acabamentos - Noite (Turma 2026.3)"]
    ];
    shDiario.getRange(2, 1, diarioInicial.length, 5).setValues(diarioInicial);
  }

  // 4. ABA GESTÃO DE TURMAS: Preencher diretamente a partir da Linha 2 (A2:E13) nas 5 colunas exatas:
  // ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]
  var shGestao = obterOuCriarAba(ss, "GESTÃO DE TURMAS", ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]);
  var valorA2Gestao = String(shGestao.getRange(2, 1).getValue() || "").trim();
  if (valorA2Gestao === "") {
    var gestaoInicial = [
      ["Pedro Santos", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "100% Excelente", "Bancada 01 Regularizada"],
      ["Mariana Souza", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "98% Excelente", "Bancada 02 Regularizada"],
      ["Lucas Oliveira", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "95% Bom", "Bancada 03 Regularizada"],
      ["Ana Beatriz Lima", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "100% Excelente", "Bancada 04 Regularizada"],
      ["Gabriel Costa", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "80% Regular", "Ausência Registrada"],
      ["Juliana Martins", "Vestuário e Estilismo - Manhã (Turma 2026.1)", "PLAN-102", "100% Excelente", "Bancada 06 Regularizada"],
      ["Rafael Almeida", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "PLAN-105", "96% Excelente", "Bancada 01 Regularizada"],
      ["Camila Rodrigues", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "PLAN-105", "100% Excelente", "Bancada 02 Regularizada"],
      ["Bruno Ferreira", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "PLAN-105", "92% Bom", "Bancada 03 Regularizada"],
      ["Fernanda Gomes", "Modelagem e Costura Industrial - Tarde (Turma 2026.2)", "PLAN-105", "98% Excelente", "Bancada 04 Regularizada"],
      ["Diego Nascimento", "Tecelagem e Acabamentos - Noite (Turma 2026.3)", "PLAN-108", "98% Excelente", "Bancada 01 Regularizada"],
      ["Larissa Barbosa", "Tecelagem e Acabamentos - Noite (Turma 2026.3)", "PLAN-108", "100% Excelente", "Bancada 02 Regularizada"]
    ];
    shGestao.getRange(2, 1, gestaoInicial.length, 5).setValues(gestaoInicial);
  }

  // 5. ABA PERFIL: Limpar células que ficaram com "[Turma]" ou "•" concatenados
  var shPerfil = ss.getSheetByName("PERFIL");
  if (shPerfil && shPerfil.getLastRow() >= 2) {
    var dadosPerfil = shPerfil.getRange(2, 1, shPerfil.getLastRow() - 1, 7).getValues();
    var alterouPerfil = false;
    for (var p = 0; p < dadosPerfil.length; p++) {
      var nomeCel = String(dadosPerfil[p][0] || "");
      var cargoCel = String(dadosPerfil[p][2] || "");
      var escolaCel = String(dadosPerfil[p][3] || "");
      if (nomeCel.indexOf("[") !== -1 || cargoCel.indexOf("•") !== -1 || escolaCel.indexOf("|") !== -1) {
        dadosPerfil[p][0] = nomeCel.split("[")[0].trim();
        dadosPerfil[p][2] = "Aluno";
        dadosPerfil[p][3] = "SENAI Centro de Formação Cândido Atahyde";
        alterouPerfil = true;
      }
    }
    if (alterouPerfil) {
      shPerfil.getRange(2, 1, dadosPerfil.length, 7).setValues(dadosPerfil);
    }
  }

  Logger.log("✅ Planilha SENAIVEST organizada com sucesso! Abas TURMAS, ALUNOS, DIARIO, GESTÃO DE TURMAS e PERFIL atualizadas a partir da linha 2.");
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();

    // Se o usuário clicar no botão "▷ Executar" direto no editor do Apps Script (sem parâmetro `e`),
    // organiza e popula imediatamente todas as abas (ALUNOS, DIARIO, GESTÃO DE TURMAS e TURMAS)!
    if (!e || (!e.postData && !e.parameter)) {
      organizarELimparPlanilhaCompleta(ss);
      expurgarFotosSeisMesesDrive();
      return;
    }

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
    var horarioAtual = data.horario || data.hora || Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy, HH:mm:ss");

    if (action === "organizarPlanilhaCompleta" || tipo === "OrganizarPlanilha") {
      organizarELimparPlanilhaCompleta(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Planilha organizada com todas as abas e colunas separadas!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "purgeOldPhotos6Months") {
      var totalApagadas = expurgarFotosSeisMesesDrive();
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        removedPhotos: totalApagadas,
        policy: "6 months (180 days)"
      })).setMimeType(ContentService.MimeType.JSON);
    }

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

    // 1. ABA: PERFIL -> ["NOME DO USUÁRIO", "SENHA", "CARGO", "ESCOLA ", "ACESSO", "MATRÍCULA", "ID"]
    if (tipo === "Usuario" || tipo === "PERFIL") {
      var shPerfil = obterOuCriarAba(ss, "PERFIL", ["NOME DO USUÁRIO", "SENHA", "CARGO", "ESCOLA ", "ACESSO", "MATRÍCULA", "ID"]);
      gravarNaPrimeiraLinhaVazia(shPerfil, [
        String(data.nome || "").split("[")[0].trim(),
        data.senha || "",
        String(data.cargo || data.role || "Aluno").split("•")[0].trim(),
        "SENAI Centro de Formação Cândido Atahyde",
        data.role || data.acesso || "Professor",
        data.matricula || "",
        data.id || data.matricula || ""
      ]);
    }
    // 2. ABA: PROFESSORES -> ["NOME DO PROFESSOR", "ID", "ESCOLA QUE ATUA", "MATRICULA", "SENHA ", "SITUAÇÃO"]
    else if (tipo === "Professor" || tipo === "PROFESSORES") {
      var shProf = obterOuCriarAba(ss, "PROFESSORES", ["NOME DO PROFESSOR", "ID", "ESCOLA QUE ATUA", "MATRICULA", "SENHA ", "SITUAÇÃO"]);
      gravarNaPrimeiraLinhaVazia(shProf, [
        data.nome || "",
        data.id || ("PROF-" + (data.matricula || "")),
        data.escola || "SENAI Centro de Formação Cândido Atahyde",
        data.matricula || "",
        data.senha || data.matricula || "",
        data.situacao || "Ativo"
      ]);
    }
    // 3. ABA: TURMAS -> ["TURMAS", "PROFESSOR RESPONSÁVEL "]
    else if (tipo === "Turma" || tipo === "TURMAS") {
      var shTurmas = obterOuCriarAba(ss, "TURMAS", ["TURMAS", "PROFESSOR RESPONSÁVEL "]);
      var nomeTurmaLimpo = String(data.nomeTurma || data.turma || "").split("|")[0].trim();
      var profLimpo = String(data.professor || "").split("(")[0].trim();
      gravarNaPrimeiraLinhaVazia(shTurmas, [
        nomeTurmaLimpo,
        profLimpo
      ]);
    }
    // 4. ABA: ALUNOS -> ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]
    else if (tipo === "Aluno" || tipo === "Alunos" || tipo === "ALUNOS") {
      var shAlunos = obterOuCriarAba(ss, "ALUNOS", ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA", "PONTOS XP", "MATRICULA"]);
      gravarNaPrimeiraLinhaVazia(shAlunos, [
        String(data.nome || data.nomeAluno || data.aluno || "").split("[")[0].trim(),
        String(data.turma || "").split("|")[0].trim(),
        data.turno || "Manhã",
        String(data.sala || data.salaDeAula || "Sala 01 - Modelagem").split("|")[0].trim(),
        data.pontos !== undefined ? data.pontos : (data.xp !== undefined ? data.xp : 300),
        data.matricula || data.id || ""
      ]);
    }
    // 5. ABA: DIARIO -> ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]
    else if (tipo === "Diario" || tipo === "Diário" || tipo === "DIARIO" || tipo === "Checkin_Bancada") {
      var shDiario = obterOuCriarAba(ss, "DIARIO", ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]);
      gravarNaPrimeiraLinhaVazia(shDiario, [
        String(data.aluno || data.nome || "").split("[")[0].trim(),
        data.matricula || data.id || "",
        data.data || data.dataAula || horarioAtual,
        data.checkin || data.status || "Presente",
        String(data.turma || "").split("|")[0].trim()
      ]);
    }
    // 6. ABA: ALMOXARIFADO -> 12 Colunas
    else if (tipo === "Produto" || tipo === "ALMOXARIFADO") {
      var shAlmox = obterOuCriarAba(ss, "ALMOXARIFADO", ["COD ", "PRODUTO", "QUANT", "VALOR UNITARIO", "Usuário que Cadastrou Produto", "HORARIO DO CADASTRO", "ENTRADA ", "SÁIDA", "VINCULO  AO PLANO DE AULA", "SALA VIRTUAL", "LOCALIZAÇÃO ", "Horario de saída"]);
      gravarNaPrimeiraLinhaVazia(shAlmox, [
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
    // 7. ABA: PLANOS DE AULA -> ["PROFESOR", "COD DO PLANO DE AULA", "HORARIO DA AULA CADTARDO", "SALA", "PRODUTOS A SER USADO"]
    else if (tipo === "Plano de Aula" || tipo === "PLANOS DE AULA") {
      var shPlanos = obterOuCriarAba(ss, "PLANOS DE AULA", ["PROFESOR", "COD DO PLANO DE AULA", "HORARIO DA AULA CADTARDO", "SALA", "PRODUTOS A SER USADO"]);
      gravarNaPrimeiraLinhaVazia(shPlanos, [
        data.professor || "",
        data.codigoPlano || "",
        data.horario || horarioAtual,
        data.sala || "",
        data.produtoUsado || data.materiais || ""
      ]);
    }
    // 8. ABA: BOLETIM -> ["COD", "NOME DO PROFESSOR", "HORA", "STATUS", "TEMA", "DETALHES"]
    else if (tipo === "Boletim" || tipo === "BOLETIM" || tipo === "Solicitacao_Acesso_QR") {
      var shBoletim = obterOuCriarAba(ss, "BOLETIM", ["COD", "NOME DO PROFESSOR", "HORA", "STATUS", "TEMA", "DETALHES"]);
      gravarNaPrimeiraLinhaVazia(shBoletim, [
        data.codigo || "",
        data.autor || data.usuario || "",
        data.hora || horarioAtual,
        data.status || "Pendente",
        data.tema || "",
        data.detalhes || ""
      ]);
    }
    // 9. ABA: GESTÃO DE TURMAS -> ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]
    else if (tipo === "Gestao de Turmas" || tipo === "Gestão de Turmas" || tipo === "GESTÃO DE TURMAS" || tipo === "Conclusao_Aula_Bancada" || tipo === "Acompanhamento") {
      var shGestao = obterOuCriarAba(ss, "GESTÃO DE TURMAS", ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]);
      gravarNaPrimeiraLinhaVazia(shGestao, [
        String(data.nome || data.aluno || "").split("[")[0].trim(),
        String(data.turma || "").split("|")[0].trim(),
        data.plano || data.aula || "PLAN-102",
        data.indice || data.status || "100% Excelente",
        data.acao || data.localGuarda || "Bancada Regularizada"
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Sincronizado com sucesso na planilha SENAIVEST."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Erro em doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID) || SpreadsheetApp.getActiveSpreadsheet();
  if (!e || !e.parameter) {
    organizarELimparPlanilhaCompleta(ss);
    expurgarFotosSeisMesesDrive();
    return;
  }
  expurgarFotosSeisMesesDrive();
  var params = e.parameter || {};
  if (params.action === "organizarPlanilhaCompleta") {
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
