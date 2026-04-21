const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wpjyjpwcrydzlqoccvyf.supabase.co';
const supabaseKey = 'sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  const mockProduct = {
    id: "test-product-id-1",
    client_id: "test_1776799548261", // The client we created earlier
    company: "Progressive",
    premium: 100
  };

  console.log("1. Insertando producto original...");
  const { error: err1 } = await supabase.from('products').upsert([mockProduct]);
  if (err1) { console.error("Err 1", err1); return; }

  console.log("2. Verificando producto insertado...");
  const { data: d1 } = await supabase.from('products').select('*').eq('id', 'test-product-id-1');
  console.log("DB value premium:", d1[0].premium);

  console.log("3. Haciendo UPSERT (sobre escribiendo)...");
  mockProduct.premium = 999; 
  const { error: err2 } = await supabase.from('products').upsert([mockProduct]);
  if (err2) { console.error("Err 2", err2); return; }

  console.log("4. Verificando producto actualizado...");
  const { data: d2 } = await supabase.from('products').select('*').eq('id', 'test-product-id-1');
  console.log("DB value premium despues:", d2[0].premium);
}

testUpsert();
