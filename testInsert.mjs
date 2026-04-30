import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert...");
  const uniqueId = "test-form-insert-" + Date.now();
  const { data, error } = await supabase.from('clients').insert([{
    id: uniqueId,
    firstName: "Test",
    lastName: "User",
    status: "Website"
  }]);
  
  if (error) {
    console.error("Insert failed with error:", error);
  } else {
    console.log("Insert succeeded!", data);
    // Cleanup
    await supabase.from('clients').delete().eq('id', uniqueId);
  }
}

testInsert();
