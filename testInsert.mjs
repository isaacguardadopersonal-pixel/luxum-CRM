import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Probando INSERT...");
  const dummyClient = {
    id: "test_" + Date.now(),
    firstName: "TestName",
    lastName: "TestLastName",
    products: [],
    reminders: [],
    logs: []
  };

  try {
    const { data, error } = await supabase.from("clients").upsert([dummyClient]).select();
    if (error) {
      console.error("❌ FALLÓ INSERT:", error);
    } else {
      console.log("✅ INSERT EXITOSO:", data);
    }
  } catch (err) {
    console.error("Excepción:", err);
  }
}

testInsert();
