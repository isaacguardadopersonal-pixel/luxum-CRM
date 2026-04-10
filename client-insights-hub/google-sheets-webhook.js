function doPost(e) {
  // 1. SISTEMA DE BLOQUEO: Evita que múltiples peticiones choquen (Crucial para importar +100)
  var lock = LockService.getScriptLock();
  try {
    // Espera hasta 30 segundos a que la hoja esté libre antes de fallar
    lock.waitLock(30000); 

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Configuración de Hojas (Igual que antes)
    var clientSheet = ss.getSheetByName("ficha_de_clientes") || ss.getSheets()[0];
    if (clientSheet.getName() !== "ficha_de_clientes") clientSheet.setName("ficha_de_clientes");
    
    var reminderSheet = ss.getSheetByName("Recordatorio") || ss.insertSheet("Recordatorio");
    var productSheet = ss.getSheetByName("products") || ss.insertSheet("products");
    var driverSheet = ss.getSheetByName("conductores_adicionales") || ss.insertSheet("conductores_adicionales");

    var rawData = JSON.parse(e.postData.contents);
    var dataArray = Array.isArray(rawData) ? rawData : [rawData];
    var fechaActual = new Date();
    
    // Función auxiliar para insertar o actualizar
    function fillOrUpdateEntity(sheet, rowArray, entityId, idColIndex) {
      if(!entityId || entityId === "") {
        sheet.appendRow(rowArray);
        return;
      }

      var sData = sheet.getDataRange().getValues();
      var targetRow = -1;
      var firstEmptyRow = -1;

      for (var i = 1; i < sData.length; i++) {
        var rowContent = sData[i];
        var isEmpty = rowContent.slice(0,5).every(function(cell) { return cell === "" || cell === null; });

        if (isEmpty && firstEmptyRow === -1) {
          firstEmptyRow = i + 1; 
        }
        if (!isEmpty && rowContent[idColIndex] == entityId) {
          targetRow = i + 1;
          break; 
        }
      }

      if (targetRow !== -1) {
        sheet.getRange(targetRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else if (firstEmptyRow !== -1) {
        sheet.getRange(firstEmptyRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else {
        sheet.appendRow(rowArray);
      }
    }

    // --- PROCESAMIENTO DE DATOS ---
    for (var mainIdx = 0; mainIdx < dataArray.length; mainIdx++) {
      var data = dataArray[mainIdx];
      var clienteNombreC = (data.firstName || "") + (data.lastName ? " " + data.lastName : "");

      // 1. Guardar Cliente
      var clientRow = [
        data.createdAt || fechaActual, data.firstName || "", data.lastName || "", data.status || "", 
        data.referredBy || "", data.workPhone || data.phone || "", data.email || "", data.address || "", 
        data.city || "", data.state || "", data.zip || "", data.dob || "", data.driversLicense || "", 
        data.dlState || "", data.id || ""
      ];
      fillOrUpdateEntity(clientSheet, clientRow, data.id, 14);

      // 2. Recordatorios (Si existen)
      if (data.reminders && data.reminders.length > 0) {
        for (var j = 0; j < data.reminders.length; j++) {
          var rExt = data.reminders[j];
          if(!rExt.id) rExt.id = "rem_" + Math.random().toString(36).substr(2,9); 
          var reminderRow = [fechaActual, clienteNombreC, data.workPhone || data.phone || "", rExt.date || "", rExt.notes || "", data.id || "", rExt.id || ""];
          fillOrUpdateEntity(reminderSheet, reminderRow, rExt.id, 6);
        }
      }

      // 3. Productos y Conductores
      if (data.products && data.products.length > 0) {
        for (var i = 0; i < data.products.length; i++) {
          var p = data.products[i];
          if(!p.id) p.id = "prod_" + Math.random().toString(36).substr(2,9);
          var productRow = [
            p.createdAt || fechaActual, p.category || "", p.firstName || data.firstName || "", 
            p.lastName || data.lastName || "", p.company || "", p.premium || 0, 
            p.licenseNumber || data.driversLicense || "", p.effectiveDate || "", 
            p.expirationDate || "", data.id || "", p.id || "", p.policyNumber || ""
          ];
          fillOrUpdateEntity(productSheet, productRow, p.id, 10);

          if (p.drivers && p.drivers.length > 0) {
            for (var dIdx = 0; dIdx < p.drivers.length; dIdx++) {
              var dr = p.drivers[dIdx];
              if(!dr.id) dr.id = "drv_" + Math.random().toString(36).substr(2,9);
              var driverRow = [dr.firstName || "", dr.lastName || "", dr.phone || "", p.policyNumber || "", clienteNombreC, data.id || "", dr.id || "", p.id || ""];
              fillOrUpdateEntity(driverSheet, driverRow, dr.id, 6);
            }
          }
        }
      }
    }

    // IMPORTANTE: Retornar éxito ANTES de liberar el bloqueo
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: dataArray.length }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    // LIBERAR EL BLOQUEO para que la siguiente petición pueda entrar
    lock.releaseLock();
  }
}