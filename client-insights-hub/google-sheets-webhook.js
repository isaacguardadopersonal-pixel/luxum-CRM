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
    
    // ==========================================
    // SISTEMA CACHÉ RAM (Para Bulk Insert Instantáneo)
    // ==========================================
    var memCache = {};

    function getMemData(sheet) {
      var name = sheet.getName();
      if (!memCache[name]) {
        var range = sheet.getDataRange();
        memCache[name] = { 
          sheet: sheet, 
          values: range.getValues() 
        };
      }
      return memCache[name];
    }
    
    function fillOrUpdateEntity(sheet, rowArray, entityId, idColIndex) {
      if(!entityId) entityId = "NO_ID";
      var cache = getMemData(sheet);
      var sData = cache.values;
      var targetRow = -1;
      var firstEmptyRow = -1;

      for (var i = 1; i < sData.length; i++) {
        var rowContent = sData[i];
        var isEmpty = true;
        for (var j = 0; j < Math.min(rowContent.length, 5); j++) {
          if (rowContent[j] !== "" && rowContent[j] !== null) {
            isEmpty = false; break;
          }
        }
        if (isEmpty && firstEmptyRow === -1) firstEmptyRow = i; 
        if (!isEmpty && rowContent[idColIndex] === entityId) {
          targetRow = i; break; 
        }
      }

      var maxCols = sData[0].length;
      var finalRow = targetRow !== -1 ? sData[targetRow] : (firstEmptyRow !== -1 ? sData[firstEmptyRow] : []);
      
      for(var p = 0; p < Math.max(maxCols, rowArray.length); p++) {
         finalRow[p] = p < rowArray.length ? rowArray[p] : (finalRow[p] || "");
      }

      if (targetRow !== -1) {
        sData[targetRow] = finalRow;
      } else if (firstEmptyRow !== -1) {
        sData[firstEmptyRow] = finalRow;
      } else {
        sData.push(finalRow);
      }
    }

    function clearRemovedItems(sheet, activeItemsArray, clientIdCol, entityIdCol, curClientId) {
      if(!curClientId) return;
      var cache = getMemData(sheet);
      var sData = cache.values;
      var activeIds = (activeItemsArray || []).map(function(item) { return item.id; }).filter(function(id){ return !!id; });
      
      for (var r = 1; r < sData.length; r++) {
         if (sData[r][clientIdCol] === curClientId) {
            var eId = sData[r][entityIdCol];
            if (activeIds.indexOf(eId) === -1) {
               for(var c=0; c<sData[r].length; c++) sData[r][c] = ""; 
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
            p.id || "", // Col: 10
            p.policyNumber || "" // Col: 11
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
                driver.id || "", // Col: 6
                p.id || "" // Col: 7 (Enlazar directamente con el producto!!)
              ];
              fillOrUpdateEntity(driverSheet, driverRow, driver.id, 6);
            }
          }
        }
      }
    }

    // ==========================================
    // VACÍO INSTANTÁNEO A DISCO DURO (Flush)
    // ==========================================
    for (var sheetName in memCache) {
       var cacheObj = memCache[sheetName];
       var sData = cacheObj.values;
       if (sData.length > 0) {
          var numRows = sData.length;
          var numCols = Math.max(...sData.map(r => r.length)); // Seguridad ante filas desiguales

          // Pad todas las filas para que Google no lance error de dimensiones desiguales
          for(var x=0; x < numRows; x++){
              while(sData[x].length < numCols) sData[x].push("");
          }

          cacheObj.sheet.getRange(1, 1, numRows, numCols).setValues(sData);
       }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Upsert dinámico ejecutado exitosamente." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// NUEVO: SISTEMA BIDIRECCIONAL - Descarga Completa de la Base de Datos Relacional
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var clientSheet = ss.getSheetByName("ficha_de_clientes");
    var reminderSheet = ss.getSheetByName("Recordatorio");
    var productSheet = ss.getSheetByName("products");
    var driverSheet = ss.getSheetByName("conductores_adicionales");

    if (!clientSheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);

    var cData = clientSheet.getDataRange().getValues();
    var rData = reminderSheet ? reminderSheet.getDataRange().getValues() : [];
    var pData = productSheet ? productSheet.getDataRange().getValues() : [];
    var dData = driverSheet ? driverSheet.getDataRange().getValues() : [];

    var clientsMap = {};
    var clientsArray = [];

    // Parse Clients
    for (var i = 1; i < cData.length; i++) {
       var row = cData[i];
       var clientId = row[14];
       if(!clientId) continue;

       var isEmp = true;
       for (var x = 0; x < 5; x++) { if(row[x]) { isEmp = false; break; } }
       if(isEmp) continue;

       var clientObj = {
          createdAt: row[0],
          firstName: row[1],
          lastName: row[2],
          status: row[3],
          referredBy: row[4],
          workPhone: row[5],
          email: row[6],
          address: row[7],
          city: row[8],
          state: row[9],
          zip: row[10],
          dob: row[11],
          driversLicense: row[12],
          dlState: row[13],
          id: row[14],
          products: [],
          reminders: [],
          logs: []
       };
       clientsMap[clientId] = clientObj;
       clientsArray.push(clientObj);
    }

    // Parse Reminders
    for (var j = 1; j < rData.length; j++) {
       var rRow = rData[j];
       var rClientId = rRow[5];
       if(!rClientId || !clientsMap[rClientId]) continue;
       var isEmp2 = true;
       for (var x = 0; x < 5; x++) { if(rRow[x]) { isEmp2 = false; break; } }
       if(isEmp2) continue;

       clientsMap[rClientId].reminders.push({
          createdAt: rRow[0],
          date: rRow[3],
          notes: rRow[4],
          id: rRow[6] || ("rem_" + Math.random().toString(36).substr(2,9))
       });
    }

    // Parse Products
    // Mapeo inverso de productos para colgarles luego sus drivers
    var productsMap = {};
    for (var k = 1; k < pData.length; k++) {
       var pRow = pData[k];
       var pClientId = pRow[9];
       
       if(!pClientId || !clientsMap[pClientId]) continue;
       var isEmp3 = true;
       for (var x = 0; x < 5; x++) { if(pRow[x]) { isEmp3 = false; break; } }
       if(isEmp3) continue;

       var prodObj = {
          createdAt: pRow[0],
          category: pRow[1],
          firstName: pRow[2],
          lastName: pRow[3],
          company: pRow[4],
          premium: pRow[5],
          licenseNumber: pRow[6],
          effectiveDate: pRow[7],
          expirationDate: pRow[8],
          id: pRow[10] || ("prod_" + Math.random().toString(36).substr(2,9)),
          policyNumber: pRow[11] || "", // Nueva Columna si existe
          drivers: []
       };
       productsMap[prodObj.id] = prodObj;
       clientsMap[pClientId].products.push(prodObj);
    }

    // Parse Drivers
    for (var d = 1; d < dData.length; d++) {
       var dRow = dData[d];
       var dClientId = dRow[5];
       if(!dClientId || !clientsMap[dClientId]) continue;
       var isEmp4 = true;
       for (var x = 0; x < 5; x++) { if(dRow[x]) { isEmp4 = false; break; } }
       if(isEmp4) continue;

       var driverObj = {
          firstName: dRow[0],
          lastName: dRow[1],
          phone: dRow[2],
          id: dRow[6] || ("drv_" + Math.random().toString(36).substr(2,9))
       };
       
       var relatedPolNum = dRow[3] || "";
       var hardLinkProdId = dRow[7]; // Nueva columna de enlace directo si existe

       var placed = false;
       // Tratar de enlazar por ID directo primero
       if (hardLinkProdId && productsMap[hardLinkProdId]) {
           productsMap[hardLinkProdId].drivers.push(driverObj);
           placed = true;
       } else if (relatedPolNum) {
           // Fallback: enlazar coincidiendo el numero de poliza a nivel cliente
           var cProds = clientsMap[dClientId].products;
           for(var cp=0; cp<cProds.length; cp++) {
               if(cProds[cp].policyNumber === relatedPolNum) {
                   cProds[cp].drivers.push(driverObj);
                   placed = true;
                   break;
               }
           }
       }
       
       if(!placed) {
           // Si no supimos de que producto era (por falta de num poliza), lo aventamos al primer producto del cliente o lo ignoramos.
           var cProds = clientsMap[dClientId].products;
           if(cProds.length > 0) {
               cProds[0].drivers.push(driverObj); // Fallback best-effort
           }
       }
    }

    return ContentService.createTextOutput(JSON.stringify(clientsArray)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
