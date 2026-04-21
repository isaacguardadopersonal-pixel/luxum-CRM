import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchAll() {
  console.log("Probando FETCH All de clientes con order...");
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error("❌ FALLÓ SELECT:", error);
    } else {
      console.log("✅ SELECT EXITOSO con order, data length:", data.length);
    }
  } catch (err) {
    console.error("Excepción:", err);
  }
}

testFetchAll();
