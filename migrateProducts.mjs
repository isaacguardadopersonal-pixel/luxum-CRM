import { createClient } from "@supabase/supabase-js";

// TODO: usar el mismo cliente / llaves de tu app
const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateProducts() {
  console.log("Iniciando migración de productos antiguos...");

  // 1. Obtener todos los clientes con paginación para evitar el límite de 1000
  let clients = [];
  let from = 0;
  const step = 1000;
  let fetchMore = true;

  while (fetchMore) {
    const { data, error: fetchErr } = await supabase
      .from("clients")
      .select("id, products")
      .range(from, from + step - 1);

    if (fetchErr) {
      console.error("Error al obtener clientes:", fetchErr);
      return;
    }
    
    if (data && data.length > 0) {
      clients = clients.concat(data);
      if (data.length < step) {
        fetchMore = false;
      } else {
        from += step;
      }
    } else {
      fetchMore = false;
    }
  }

  if (!clients || clients.length === 0) {
    console.log("No hay clientes en la base de datos.");
    return;
  }

  const allProductsToInsert = [];

  for (const client of clients) {
    if (client.products && Array.isArray(client.products)) {
      for (const p of client.products) {
        // Prepare product exactly as the new table needs it
        allProductsToInsert.push({
          id: p.id || Math.random().toString(36).substring(2, 15),
          client_id: client.id,
          category: p.category || "",
          firstName: p.firstName || "",
          lastName: p.lastName || "",
          policyNumber: p.policyNumber || "",
          company: p.company || "",
          premium: p.premium ? parseFloat(p.premium) : 0,
          licenseNumber: p.licenseNumber || "",
          effectiveDate: p.effectiveDate || "",
          expirationDate: p.expirationDate || "",
          drivers: p.drivers || [],
          createdAt: p.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  if (allProductsToInsert.length === 0) {
    console.log("No se encontraron productos embebidos dentro de los clientes que migrar.");
    return;
  }

  console.log(`Encontrados ${allProductsToInsert.length} productos históricos. Migrando a la nueva tabla en lotes...`);

  const chunkSize = 500;
  let hasError = false;
  
  for (let i = 0; i < allProductsToInsert.length; i += chunkSize) {
    const chunk = allProductsToInsert.slice(i, i + chunkSize);
    const { error: upsertErr } = await supabase
      .from("products")
      .upsert(chunk, { onConflict: "id" });

    if (upsertErr) {
      console.error(`❌ Falló la migración del lote ${i / chunkSize + 1}:`, upsertErr);
      hasError = true;
    } else {
      console.log(`✅ Lote ${i / chunkSize + 1} insertado (${chunk.length} productos).`);
    }
  }
  
  if (!hasError) {
    console.log("✅ ¡Migración de productos completada exitosamente!");
  }
}

migrateProducts();
