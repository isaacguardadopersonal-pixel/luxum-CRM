import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCount() {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error("❌ FALLÓ SELECT:", error);
  } else {
    console.log("✅ Total de clientes en Supabase:", count);
  }
}

testCount();
