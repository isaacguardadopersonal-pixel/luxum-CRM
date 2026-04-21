import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
  console.log("Probando FETCH con nombres de columna exactos...");
  try {
    const { data, error } = await supabase.from("clients").select("firstName, lastName, workPhone, driversLicense, dlState, referredBy").limit(1);
    if (error) {
      console.error("❌ FALLÓ SELECT de columnas:", error);
    } else {
      console.log("✅ SELECT EXITOSO de columnas:", data);
    }
  } catch (err) {
    console.error("Excepción:", err);
  }
}

testFetch();
