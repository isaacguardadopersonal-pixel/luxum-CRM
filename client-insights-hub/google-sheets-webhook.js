// Este código recibe los datos de tu CRM y los guarda con el nuevo sistema de actualizacion exacta
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Hoja: ficha_de_clientes
    var clientSheet = ss.getSheetByName("ficha_de_clientes");
    if (!clientSheet) {
      clientSheet = ss.getSheets()[0];
      clientSheet.setName("ficha_de_clientes");
      clientSheet.appendRow(["fecha_de_creacion", "nombre", "apellido", "estado", "referido_por", "contacto", "email", "numero_de_calle", "ciudad", "estado", "código_postal", "fecha_de_nacimiento", "licencia", "estado_Dl", "codigo"]); 
    }
    
    // 2. Hoja: Recordatorio
    var reminderSheet = ss.getSheetByName("Recordatorio") || ss.insertSheet("Recordatorio");
    if (reminderSheet.getLastRow() === 0) {
      reminderSheet.appendRow(["fecha_de_creacion", "cliente", "teléfono", "fecha_agendad", "notas", "codigo_cliente", "codigo_recordatorio"]);
    }

    // 3. Hoja: products
    var productSheet = ss.getSheetByName("products") || ss.insertSheet("products");
    if (productSheet.getLastRow() === 0) {
      productSheet.appendRow(["fecha_de_creacion", "categoría", "nombre_en_la_poliza", "apellido_en_la_poliza", "compañía", "Prima", "numero_de_licencia", "fecha_de_efectividad", "fecha_de_vencimiento", "codigo_cliente", "codigo_producto", "policyNumber"]);
    }

    // 4. Hoja: conductores_adicionales
    var driverSheet = ss.getSheetByName("conductores_adicionales") || ss.insertSheet("conductores_adicionales");
    if (driverSheet.getLastRow() === 0) {
      driverSheet.appendRow(["nombre", "apellido", "teléfono", "numero_de_poliza", "nombre_customer", "codigo_cliente", "codigo_conductor", "codigo_producto"]);
    }
    
    var rawData = JSON.parse(e.postData.contents);
    var dataArray = Array.isArray(rawData) ? rawData : [rawData];
    var fechaActual = new Date();
    
    // Función auxiliar mejorada para manejar grandes volúmenes
    function fillOrUpdateEntity(sheet, rowArray, entityId, idColIndex) {
      if(!entityId || entityId === "") {
        sheet.appendRow(rowArray);
        return;
      }

      var lastRow = sheet.getLastRow();
      if (lastRow < 2) {
        sheet.appendRow(rowArray);
        return;
      }

      var sData = sheet.getDataRange().getValues();
      var targetRow = -1;
      var firstEmptyRow = -1;

      // Buscar ID o fila vacía
      for (var i = 1; i < sData.length; i++) {
        var rowContent = sData[i];
        
        // Verificar si la fila está realmente vacía (primeras 5 columnas)
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
        // Actualizar existente
        sheet.getRange(targetRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else if (firstEmptyRow !== -1) {
        // Llenar hueco
        sheet.getRange(firstEmptyRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else {
        // Si no hay huecos ni existe, añadir al final
        sheet.appendRow(rowArray);
      }
    }

    function clearRemovedItems(sheet, activeItemsArray, clientIdCol, entityIdCol, curClientId) {
      if(!curClientId) return;
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      
      var d = sheet.getDataRange().getValues();
      var activeIds = (activeItemsArray || []).map(function(item) { return item.id; }).filter(function(id){ return !!id; });
      
      for (var r = 1; r < d.length; r++) {
         if (d[r][clientIdCol] === curClientId) {
            var eId = d[r][entityIdCol];
            if (activeIds.indexOf(eId) === -1) {
               sheet.getRange(r + 1, 1, 1, sheet.getLastColumn()).clearContent();
            }
         }
      }
    }

    // Procesar Clientes
    for (var mainIdx = 0; mainIdx < dataArray.length; mainIdx++) {
      var data = dataArray[mainIdx];
      var clienteNombreC = (data.firstName || "") + (data.lastName ? " " + data.lastName : "");

      // 1. Ficha Clientes
      var clientRow = [
        data.createdAt || fechaActual, 
        data.firstName || "", 
        data.lastName || "", 
        data.status || "", 
        data.referredBy || "",
        data.workPhone || data.phone || "",
        data.email || "",
        data.address || "",
        data.city || "",
        data.state || "",
        data.zip || "",
        data.dob || "",
        data.driversLicense || "",
        data.dlState || "",
        data.id || "" // Col 14
      ];
      fillOrUpdateEntity(clientSheet, clientRow, data.id, 14);

      // 2. Recordatorios
      clearRemovedItems(reminderSheet, data.reminders, 5, 6, data.id);
      if (data.reminders && data.reminders.length > 0) {
        for (var j = 0; j < data.reminders.length; j++) {
          var rExt = data.reminders[j];
          if(!rExt.id) rExt.id = "rem_" + Math.random().toString(36).substr(2,9); 
          var reminderRow = [fechaActual, clienteNombreC, data.workPhone || data.phone || "", rExt.date || "", rExt.notes || "", data.id || "", rExt.id || ""];
          fillOrUpdateEntity(reminderSheet, reminderRow, rExt.id, 6);
        }
      }

      // 3. Productos y Conductores
      clearRemovedItems(productSheet, data.products, 9, 10, data.id);
      
      var allActiveDrivers = [];
      if (data.products) {
        data.products.forEach(function(p) {
          if(p.drivers) allActiveDrivers = allActiveDrivers.concat(p.drivers);
        });
      }
      clearRemovedItems(driverSheet, allActiveDrivers, 5, 6, data.id);

      if (data.products && data.products.length > 0) {
        for (var i = 0; i < data.products.length; i++) {
          var p = data.products[i];
          if(!p.id) p.id = "prod_" + Math.random().toString(36).substr(2,9);
          
          var productRow = [
            p.createdAt || fechaActual, p.category || "", 
            p.firstName || data.firstName || "", p.lastName || data.lastName || "",
            p.company || "", p.premium || 0, p.licenseNumber || data.driversLicense || "",
            p.effectiveDate || "", p.expirationDate || "", data.id || "", p.id || "", p.policyNumber || ""
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

    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: dataArray.length }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Mantener tu función doGet igual, ya que está bien estructurada para la lectura.
