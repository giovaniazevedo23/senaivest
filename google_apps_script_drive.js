/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: INTEGRAÇÃO SENAIVEST 2.0 & SUB-BANCO DE DADOS NO GOOGLE DRIVE
 * =========================================================================================
 * 
 * Instruções de Instalação no Google Apps Script:
 * 1. Abra o seu projeto no Google Apps Script (extensões associadas à Planilha Google).
 * 2. Adicione este código ou incorpore as funções `doPost(e)` e `doGet(e)`.
 * 3. Clique em "Implantar" > "Gerenciar implantações" > "Editar" (ícone de lápis) > Versão "Nova versão" > "Implantar".
 * 4. Certifique-se de que o acesso esteja configurado como: "Qualquer pessoa" (Anyone).
 * 
 * Pasta Google Drive Vinculada:
 * ID: 1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj
 * Link: https://drive.google.com/drive/folders/1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj?usp=sharing
 */

var DRIVE_FOLDER_ID = "1KrTwyjOYHpUNHMMY8JUT-zX6dZ-8ksLj";

function doPost(e) {
  try {
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

    var action = data.action || e.parameter.action || "";

    // 1. AÇÃO: SALVAR DOCUMENTO OFICIAL DO PLANO DE AULA NO GOOGLE DRIVE
    if (action === "savePlanDrive" || data.documentoCompleto) {
      var folderId = data.folderId || DRIVE_FOLDER_ID;
      var folder;
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch(fErr) {
        folder = DriveApp.getRootFolder();
      }

      var fileName = data.fileName || ("Plano_Aula_" + new Date().getTime() + ".json");
      var fileContent = typeof data.documentoCompleto === "object" 
        ? JSON.stringify(data.documentoCompleto, null, 2) 
        : (data.documentoCompleto || JSON.stringify(data, null, 2));

      var file = folder.createFile(fileName, fileContent, MimeType.PLAIN_TEXT);
      file.setDescription("Plano de Aula Oficial registrado pelo SenaiVest 2.0 - Professor: " + (data.professor || "N/A"));

      // Registrar também linha de auditoria na planilha ativa (se houver aba "Planos_Drive")
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        if (ss) {
          var sheet = ss.getSheetByName("Planos_Drive") || ss.getActiveSheet();
          sheet.appendRow([
            new Date(),
            data.codigoPlano || "",
            data.professor || "",
            data.horario || "",
            data.sala || "",
            data.turma || "",
            fileName,
            file.getUrl()
          ]);
        }
      } catch(sheetErr) {
        // Fallback silencioso se a planilha tiver estrutura restrita
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Documento salvo com sucesso no Google Drive",
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        fileName: fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. AÇÃO PADRÃO: REGISTRAR NA PLANILHA GOOGLE
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      var sheet = ss.getActiveSheet();
      sheet.appendRow([
        new Date(),
        data.tipoCadastro || "Registro",
        data.professor || data.responsavel || "",
        data.codigoPlano || data.codigo || "",
        data.horario || "",
        data.sala || data.local || "",
        data.produtoUsado || data.materiais || ""
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Dados inseridos com sucesso na planilha."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var action = e.parameter.action || "";
  var busca = e.parameter.busca || "";

  // Retornar lista de planos de backup salvos no Drive
  if (action === "getDrivePlans") {
    try {
      var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      var files = folder.getFiles();
      var list = [];
      while (files.hasNext()) {
        var file = files.next();
        if (file.getName().endsWith(".json")) {
          list.push({
            id: file.getId(),
            name: file.getName(),
            url: file.getUrl(),
            dateCreated: file.getDateCreated()
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify(list)).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Busca geral ou lista de usuários
  if (action === "getUsers") {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "online", service: "SenaiVest Google Apps Script Backend" })).setMimeType(ContentService.MimeType.JSON);
}
