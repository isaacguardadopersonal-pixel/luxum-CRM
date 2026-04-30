import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('prospects').select('*');
  if (error) console.log("No prospects table");
  else console.log("Prospects: ", data.length);
}
check();
