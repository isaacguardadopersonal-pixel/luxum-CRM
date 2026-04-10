// Este código recibe los datos de tu CRM y los guarda
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Hoja: ficha_de_clientes
    var clientSheet = ss.getSheetByName("ficha_de_clientes");
    if (!clientSheet) {
      // Si por alguna razón la primera hoja ya existe con otro nombre, la renombramos o creamos
      clientSheet = ss.getSheets()[0];
      clientSheet.setName("ficha_de_clientes");
      clientSheet.appendRow(["fecha_de_creacion", "nombre", "apellido", "estado", "referido_por", "contacto", "email", "numero_de_calle", "ciudad", "estado", "código_postal", "fecha_de_nacimiento", "licencia", "estado_Dl", "codigo"]);
    }
    
    // 2. Hoja: Recordatorio
    var reminderSheet = ss.getSheetByName("Recordatorio");
    if (!reminderSheet) {
      reminderSheet = ss.insertSheet("Recordatorio");
      reminderSheet.appendRow(["fecha_de_creacion", "cliente", "teléfono", "fecha_agendad", "notas", "codigo"]);
    }

    // 3. Hoja: products
    var productSheet = ss.getSheetByName("products");
    if (!productSheet) {
      productSheet = ss.insertSheet("products");
      productSheet.appendRow(["fecha_de_creacion", "categoría", "nombre_en_la_poliza", "apellido_en_la_poliza", "compañía", "Prima", "numero_de_licencia", "fecha_de_efectividad", "fecha_de_vencimiento", "codigo"]);
    }

    // 4. Hoja: conductores_adicionales
    var driverSheet = ss.getSheetByName("conductores_adicionales");
    if (!driverSheet) {
      driverSheet = ss.insertSheet("conductores_adicionales");
      driverSheet.appendRow(["nombre", "apellido", "teléfono", "numero_de_poliza", "nombre_customer", "codigo"]);
    }
    
    // Lee la información que manda tu aplicación React
    var data = JSON.parse(e.postData.contents);
    var fechaActual = new Date();
    
    // ==========================================
    // 1. Guardar/Actualizar en ficha_de_clientes
    // ==========================================
    // Orden requerido: fecha_de_creacion nombre apellido estado referido_por contacto email numero_de_calle ciudad estado código_postal fecha_de_nacimiento licencia estado_Dl codigo
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
      data.id || ""            
    ];
    
    var clientData = clientSheet.getDataRange().getValues();
    var rowIndex = -1;
    // Buscamos la fila del cliente por su ID (Columna 15, index 14)
    for (var r = clientData.length - 1; r >= 1; r--) {
      if (clientData[r][14] === data.id && data.id) {
        rowIndex = r + 1;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      clientSheet.getRange(rowIndex, 1, 1, clientRow.length).setValues([clientRow]);
    } else {
      clientSheet.appendRow(clientRow);
    }
    
    // ==========================================
    // 2. Guardar en Recordatorio
    // ==========================================
    // Orden: fecha_de_creacion, cliente, teléfono, fecha_agendad, notas, (codigo interno)
    var remData = reminderSheet.getDataRange().getValues();
    for (var rr = remData.length - 1; rr >= 1; rr--) {
      if (remData[rr][5] === data.id && data.id) { 
        reminderSheet.deleteRow(rr + 1);
      }
    }

    if (data.reminders && data.reminders.length > 0) {
      for (var j = 0; j < data.reminders.length; j++) {
        var rExt = data.reminders[j];
        var reminderRow = [
          fechaActual,                       
          clienteNombreC,                   
          data.workPhone || data.phone || "",                  
          rExt.date || "",                   
          rExt.notes || "",                  
          data.id || ""                      
        ];
        reminderSheet.appendRow(reminderRow);
      }
    }

    // ==========================================
    // 3. Guardar en products y 4. conductores_adicionales
    // ==========================================
    // Limpiar productos anteriores
    var prodData = productSheet.getDataRange().getValues();
    for (var rp = prodData.length - 1; rp >= 1; rp--) {
      if (prodData[rp][9] === data.id && data.id) { 
        productSheet.deleteRow(rp + 1);
      }
    }

    // Limpiar conductores anteriores
    var drvData = driverSheet.getDataRange().getValues();
    for (var rd = drvData.length - 1; rd >= 1; rd--) {
      if (drvData[rd][5] === data.id && data.id) {
        driverSheet.deleteRow(rd + 1);
      }
    }

    if (data.products && data.products.length > 0) {
      for (var i = 0; i < data.products.length; i++) {
        var p = data.products[i];

        // AUTO-LLENADO: si no tiene nombre_en_la_poliza, usamos el nombre del cliente general
        var polName = p.firstName ? p.firstName : data.firstName || "";
        var polLast = p.lastName ? p.lastName : data.lastName || "";

        // Orden requerido products: fecha_de_creacion categoría nombre_en_la_poliza apellido_en_la_poliza compañía Prima numero_de_licencia fecha_de_efectividad fecha_de_vencimiento (codigo)
        var productRow = [
          fechaActual,                       
          p.category || "",                  
          polName,
          polLast,
          p.company || "",                   
          p.premium || 0,                    
          p.licenseNumber || data.driversLicense || "",              
          p.effectiveDate || "",
          p.expirationDate || "",
          data.id || ""
        ];
        productSheet.appendRow(productRow);

        // Guardar cada conductor asociado a este producto en 'conductores_adicionales'
        // Orden requerido: nombre, apellido, teléfono, numero_de_poliza, nombre_customer, (codigo)
        if (p.drivers && p.drivers.length > 0) {
          for (var dIdx = 0; dIdx < p.drivers.length; dIdx++) {
            var driver = p.drivers[dIdx];
            var driverRow = [
              driver.firstName || "",
              driver.lastName || "",
              driver.phone || "",
              p.policyNumber || "",
              clienteNombreC, // nombre_customer auto-llenado
              data.id || ""
            ];
            driverSheet.appendRow(driverRow);
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Cliente, productos y recordatorios sincronizados." }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

