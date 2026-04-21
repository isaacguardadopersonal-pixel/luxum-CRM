import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVercelUpdateSim() {
  console.log("Simulando una actualización desde el cliente Vercel...");

  // Este es el ID del producto que verificamos antes: "test-product-id-1"
  const clientId = "test_1776799548261";
  
  // 1. Obtener la data actual como lo hace Vercel
  const { data, error } = await supabase.from('clients').select('*, products(*)').eq('id', clientId);
  if (error || !data || data.length === 0) {
    console.error("No se pudo obtener el cliente", error); return;
  }
  
  let client = data[0];
  console.log("Estado antes:", JSON.stringify(client.products, null, 2));
  
  const existingProduct = client.products[0];
  const oldPremium = existingProduct.premium;
  const newPremium = oldPremium === 1000000 ? 555 : 1000000;
  
  console.log(`Cambiando premium de ${oldPremium} a ${newPremium}...`);
  existingProduct.premium = newPremium;
  
  // 2. Construir payload exactamente como useClients.ts
  const payloadClient = {
    id: clientId,
    products: [existingProduct], // JSONB update
  };
  
  const payloadProducts = [{
    id: existingProduct.id,
    client_id: clientId,
    company: existingProduct.company,
    premium: existingProduct.premium
  }];
  
  console.log("Haciendo UPSERT...");
  const { error: err1 } = await supabase.from('clients').upsert(payloadClient);
  if (err1) console.error("Err1", err1);
  
  const { error: err2 } = await supabase.from('products').upsert(payloadProducts);
  if (err2) console.error("Err2", err2);
  
  // 3. Revisar en Base De Datos que NO este duplicado
  const { data: dAll } = await supabase.from('products').select('*').eq('client_id', clientId);
  console.log(`Cantidad de productos en Tabla DB para este cliente: ${dAll.length} (debe ser 1)`);
  console.log(`Premium final: ${dAll[0].premium}`);
}

testVercelUpdateSim();
