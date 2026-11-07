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
    // 3. ABA: TURMAS
    else if (tipo === "Turma" || tipo === "TURMAS") {
      var shTurmas = obterOuCriarAba(ss, "TURMAS", ["TURMAS", "PROFESSOR RESPONSÁVEL "]);
      shTurmas.appendRow([
        data.nomeTurma || data.turma || "",
        data.professor || ""
      ]);
    }
    // 4. ABA: ALUNOS
    else if (tipo === "Aluno" || tipo === "Alunos" || tipo === "ALUNOS") {
      var shAlunos = obterOuCriarAba(ss, "ALUNOS", ["NOME DOS ALUNOS ", "TURMA", "TURNO", "SALA DE AULA"]);
      shAlunos.appendRow([
        data.nome || data.aluno || "",
        data.turma || "",
        data.turno || "Manhã",
        data.sala || "Sala 01 - Modelagem"
      ]);
    }
    // 5. ABA: DIARIO
    else if (tipo === "Diario" || tipo === "DIARIO" || tipo === "Checkin_Bancada") {
      var shDiario = obterOuCriarAba(ss, "DIARIO", ["ALUNO", "MATRICULA", "DATA DA AULA", "CHECK-IN", "TURMA"]);
      shDiario.appendRow([
        data.aluno || data.nome || "",
        data.matricula || "",
        data.data || horarioAtual,
        data.checkin || data.status || "Presente",
        data.turma || ""
      ]);
    }
    // 6. ABA: ALMOXARIFADO
    else if (tipo === "Produto" || tipo === "ALMOXARIFADO") {
      var shAlmox = obterOuCriarAba(ss, "ALMOXARIFADO", ["COD ", "PRODUTO", "QUANT", "VALOR UNITARIO", "USUARIO QUE CADASTROU O PRODUTO", "HORARIO DO CADASTRO", "ENTRADA ", "SÁIDA", "VINCULO  AO PLANO DE AULA", "SALA VIRTUAL", "LOCALIZAÇÃO "]);
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
        data.localizacao || ""
      ]);
    }
    // 7. ABA: PLANOS DE AULA
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
    // 8. ABA: BOLETIM
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
    // 9. ABA: GESTÃO DE TURMAS
    else if (tipo === "Gestao de Turmas" || tipo === "GESTÃO DE TURMAS" || tipo === "Conclusao_Aula_Bancada") {
      var shGestao = obterOuCriarAba(ss, "GESTÃO DE TURMAS", ["NOME", "TURMA", "PLANO", "INDICE", "AÇÃO"]);
      shGestao.appendRow([
        data.nome || data.aluno || "",
        data.turma || data.bancada || "",
        data.plano || data.aula || "",
        data.indice || data.status || "100% Concluído",
        data.acao || data.localGuarda || "Regular"
      ]);
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

function doGet(e) {
  expurgarFotosSeisMesesDrive();
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    spreadsheetId: SPREADSHEET_ID,
    driveFolderId: DRIVE_FOLDER_ID,
    photoRetentionPolicy: "6 months (180 days)"
  })).setMimeType(ContentService.MimeType.JSON);
}
