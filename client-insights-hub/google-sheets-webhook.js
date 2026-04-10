// Este código recibe los datos de tu CRM y los guarda
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Abre la primera hoja (o la hoja activa) para los CLIENTES
    var clientSheet = ss.getSheets()[0]; 
    
    // Busca o crea la hoja llamada "PRODUCTS"
    var productSheet = ss.getSheetByName("PRODUCTS");
    if (!productSheet) {
      productSheet = ss.insertSheet("PRODUCTS");
      // Opcional: poner encabezados en la primera fila de PRODUCTS
      productSheet.appendRow(["Fecha", "Cliente", "Teléfono", "Categoría", "Compañía", "Póliza", "Prima", "Vigencia"]);
    }
    
    // Lee la información que manda tu aplicación React
    var data = JSON.parse(e.postData.contents);
    var fechaActual = new Date();
    
    // 1. Guardar o Actualizar el Cliente en la hoja principal (CLIENTES)
    var clientRow = [
      fechaActual,             // Columna A: Fecha
      data.name || "",         // Columna B: Nombre del cliente
      data.email || "",        // Columna C: Correo
      data.phone || "",        // Columna D: Teléfono
      data.status || "",       // Columna E: Estado (Active, Quoting...)
      data.id || ""            // Columna F: ID del Sistema
    ];
    
    var clientData = clientSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var r = clientData.length - 1; r >= 0; r--) {
      // clientData[r][5] corresponde a Columna F (ID)
      if (clientData[r][5] === data.id && data.id) {
        rowIndex = r + 1;
        break;
      } else if (!clientData[r][5] && clientData[r][3] === data.phone && clientData[r][1] === data.name) {
        // Fallback: si es una fila vieja sin ID, lo actualizamos mediante nombre y teléfono
        rowIndex = r + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      clientSheet.getRange(rowIndex, 1, 1, clientRow.length).setValues([clientRow]);
    } else {
      clientSheet.appendRow(clientRow);
    }
    
    // 2. Guardar los Productos en la hoja "PRODUCTS"
    var prodData = productSheet.getDataRange().getValues();
    // Limpiamos los productos anteriores del mismo cliente usando el ID (recorremos de abajo hacia arriba)
    for (var rp = prodData.length - 1; rp >= 1; rp--) {
      if (prodData[rp][8] === data.id && data.id) { // Columna I (index 8) es el ID
        productSheet.deleteRow(rp + 1);
      }
    }

    if (data.products && data.products.length > 0) {
      for (var i = 0; i < data.products.length; i++) {
        var p = data.products[i];
        var productRow = [
          fechaActual,                       // A: Fecha
          data.name || "",                   // B: A qué cliente pertenece
          data.phone || "",                  // C: Referencia (teléfono)
          p.category || "",                  // D: Categoría
          p.company || "",                   // E: Compañía
          p.policyNumber || "",              // F: No. de Póliza
          p.premium || 0,                    // G: Prima costo
          (p.effectiveDate || "") + " a " + (p.expirationDate || ""), // H: Vigencia
          data.id || ""                      // I: ID Cliente
        ];
        productSheet.appendRow(productRow);
      }
    }

    // Busca o crea la hoja llamada "Recordatorio"
    var reminderSheet = ss.getSheetByName("Recordatorio");
    if (!reminderSheet) {
      reminderSheet = ss.insertSheet("Recordatorio");
      reminderSheet.appendRow(["Fecha de Creación", "Cliente", "Teléfono", "Fecha Agenda", "Notas", "ID Cliente"]);
    }

    // 3. Guardar los Recordatorios en la hoja "Recordatorio"
    var remData = reminderSheet.getDataRange().getValues();
    // Limpiamos los recordatorios anteriores del mismo cliente
    for (var rr = remData.length - 1; rr >= 1; rr--) {
      if (remData[rr][5] === data.id && data.id) { // Columna F (index 5) es el ID
        reminderSheet.deleteRow(rr + 1);
      }
    }

    if (data.reminders && data.reminders.length > 0) {
      for (var j = 0; j < data.reminders.length; j++) {
        var rExt = data.reminders[j];
        var reminderRow = [
          fechaActual,                       // A: Fecha de Creación
          data.name || "",                   // B: Cliente
          data.phone || "",                  // C: Teléfono
          rExt.date || "",                   // D: Fecha Agenda
          rExt.notes || "",                  // E: Notas
          data.id || ""                      // F: ID Cliente
        ];
        reminderSheet.appendRow(reminderRow);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Cliente y productos guardados en Sheets" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

