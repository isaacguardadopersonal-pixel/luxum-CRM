import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMotivo() {
  console.log("Checking if motivo_descarte column exists...");
  try {
    const { data, error } = await supabase.from("clients").select("id, motivo_descarte").limit(1);
    if (error) {
      console.error("❌ ERROR SELECTING COLUMN motivo_descarte:", error);
    } else {
      console.log("✅ COLUMN motivo_descarte EXISTS! Data:", data);
    }
  } catch (err) {
    console.error("Exception:", err);
  }
}

testMotivo();
