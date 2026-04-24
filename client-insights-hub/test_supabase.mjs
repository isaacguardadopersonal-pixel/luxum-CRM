import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const SUPABASE_KEY = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fix() {
  console.log("Fixing malformed client data...");
  const { data, error } = await supabase
    .from("clients")
    .update({ products: [] })
    .eq('id', '6f8cdd00-7525-41c6-a347-aaac4c10027a');
    
  if (error) {
    console.error("Error fixing:", error);
  } else {
    console.log("Database fixed! The CRM will now load correctly.");
  }
}

fix();
