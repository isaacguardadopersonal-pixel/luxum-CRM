// Este código recibe los datos de tu CRM y los guarda con el nuevo sistema de actualizacion exacta
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Hoja: ficha_de_clientes
    var clientSheet = ss.getSheetByName("ficha_de_clientes");
    if (!clientSheet) {
      clientSheet = ss.getSheets()[0];
      clientSheet.setName("ficha_de_clientes");
      clientSheet.appendRow(["fecha_de_creacion", "nombre", "apellido", "estado", "referido_por", "contacto", "email", "numero_de_calle", "ciudad", "estado", "código_postal", "fecha_de_nacimiento", "licencia", "estado_Dl", "codigo"]); // index 14
    }
    
    // 2. Hoja: Recordatorio
    var reminderSheet = ss.getSheetByName("Recordatorio");
    if (!reminderSheet) {
      reminderSheet = ss.insertSheet("Recordatorio");
      reminderSheet.appendRow(["fecha_de_creacion", "cliente", "teléfono", "fecha_agendad", "notas", "codigo_cliente", "codigo_recordatorio"]); // index 5 y 6
    }

    // 3. Hoja: products
    var productSheet = ss.getSheetByName("products");
    if (!productSheet) {
      productSheet = ss.insertSheet("products");
      productSheet.appendRow(["fecha_de_creacion", "categoría", "nombre_en_la_poliza", "apellido_en_la_poliza", "compañía", "Prima", "numero_de_licencia", "fecha_de_efectividad", "fecha_de_vencimiento", "codigo_cliente", "codigo_producto"]); // index 9 y 10
    }

    // 4. Hoja: conductores_adicionales
    var driverSheet = ss.getSheetByName("conductores_adicionales");
    if (!driverSheet) {
      driverSheet = ss.insertSheet("conductores_adicionales");
      driverSheet.appendRow(["nombre", "apellido", "teléfono", "numero_de_poliza", "nombre_customer", "codigo_cliente", "codigo_conductor"]); // index 5 y 6
    }
    
    var rawData = JSON.parse(e.postData.contents);
    var dataArray = Array.isArray(rawData) ? rawData : [rawData];
    var fechaActual = new Date();
    
    // Función auxiliar para insertar en fila vacía o sobreescribir ID exacto
    function fillOrUpdateEntity(sheet, rowArray, entityId, idColIndex) {
      if(!entityId) entityId = "NO_ID";
      var sData = sheet.getDataRange().getValues();
      var targetRow = -1;
      var firstEmptyRow = -1;

      for (var i = 1; i < sData.length; i++) {
        var rowContent = sData[i];
        var isEmpty = true;
        for (var j = 0; j < Math.min(rowContent.length, 5); j++) {
          if (rowContent[j] !== "" && rowContent[j] !== null) {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty && firstEmptyRow === -1) {
          firstEmptyRow = i + 1; 
        }

        // Si la entidad existe, targeteamos esta
        if (!isEmpty && rowContent[idColIndex] === entityId) {
          targetRow = i + 1;
          break; // Encontramos la exacta, ya no hay que buscar 
        }
      }

      if (targetRow !== -1) {
        // Encontrado: Sobreescribir en la MISMA fila inmobible
        sheet.getRange(targetRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else if (firstEmptyRow !== -1) {
        // Rellenar Fila Vaciada
        sheet.getRange(firstEmptyRow, 1, 1, rowArray.length).setValues([rowArray]);
      } else {
        // Modo fallback: Append (si la tabla esta perfecta sin huecos)
        sheet.appendRow(rowArray);
      }
    }

    // Función auxiliar para Vaciar (sin borrar fila) entidades eliminadas del CRM
    function clearRemovedItems(sheet, activeItemsArray, clientIdCol, entityIdCol, curClientId) {
      if(!curClientId) return;
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

    // Procesamos todos los clientes en el Array
    for (var mainIdx = 0; mainIdx < dataArray.length; mainIdx++) {
      var data = dataArray[mainIdx];

      // ==========================================
      // 1. Guardar/Actualizar en ficha_de_clientes
      // ==========================================
      var clienteNombreC = (data.firstName || "") + (data.lastName ? " " + data.lastName : "");

      var clientRow = [
        fechaActual,             
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
        data.id || "" // Col: 14            
      ];
      fillOrUpdateEntity(clientSheet, clientRow, data.id, 14);

      // ==========================================
      // 2. Guardar en Recordatorio
      // ==========================================
      clearRemovedItems(reminderSheet, data.reminders, 5, 6, data.id);

      if (data.reminders && data.reminders.length > 0) {
        for (var j = 0; j < data.reminders.length; j++) {
          var rExt = data.reminders[j];
          if(!rExt.id) {
              // Autogenerar ID si no trae
              rExt.id = "rem_" + Math.random().toString(36).substr(2,9); 
          }
          var reminderRow = [
            fechaActual,                       
            clienteNombreC,                   
            data.workPhone || data.phone || "",                  
            rExt.date || "",                   
            rExt.notes || "",                  
            data.id || "",                      
            rExt.id || "" // Col: 6
          ];
          fillOrUpdateEntity(reminderSheet, reminderRow, rExt.id, 6);
        }
      }

      // ==========================================
      // 3. Guardar en products y 4. conductores_adicionales
      // ==========================================
      clearRemovedItems(productSheet, data.products, 9, 10, data.id);
      
      // Extraer todos los conductores activos de todos los productos
      var allActiveDrivers = [];
      if (data.products && data.products.length > 0) {
        for (var a = 0; a < data.products.length; a++) {
          if(data.products[a].drivers) {
              for(var b=0; b < data.products[a].drivers.length; b++){
                  allActiveDrivers.push(data.products[a].drivers[b]);
              }
          }
        }
      }
      clearRemovedItems(driverSheet, allActiveDrivers, 5, 6, data.id);

      if (data.products && data.products.length > 0) {
        for (var i = 0; i < data.products.length; i++) {
          var p = data.products[i];
          if(!p.id) p.id = "prod_" + Math.random().toString(36).substr(2,9);

          var polName = p.firstName ? p.firstName : data.firstName || "";
          var polLast = p.lastName ? p.lastName : data.lastName || "";

          var productRow = [
            p.createdAt || fechaActual, // Usa el createdAt del producto o fecha actual si es nuevo                      
            p.category || "",                  
            polName,
            polLast,
            p.company || "",                   
            p.premium || 0,                    
            p.licenseNumber || data.driversLicense || "",              
            p.effectiveDate || "",
            p.expirationDate || "",
            data.id || "",
            p.id || "" // Col: 10
          ];
          fillOrUpdateEntity(productSheet, productRow, p.id, 10);

          if (p.drivers && p.drivers.length > 0) {
            for (var dIdx = 0; dIdx < p.drivers.length; dIdx++) {
              var driver = p.drivers[dIdx];
              if(!driver.id) driver.id = "drv_" + Math.random().toString(36).substr(2,9);
              
              var driverRow = [
                driver.firstName || "",
                driver.lastName || "",
                driver.phone || "",
                p.policyNumber || "",
                clienteNombreC, 
                data.id || "",
                driver.id || "" // Col: 6
              ];
              fillOrUpdateEntity(driverSheet, driverRow, driver.id, 6);
            }
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Upsert dinámico ejecutado exitosamente." }))

      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
