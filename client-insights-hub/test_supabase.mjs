import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const SUPABASE_KEY = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log("Fetching clients with drivers...");
  const { data, error } = await supabase
    .from("clients")
    .select("*, drivers:add_driver(*)")
    .range(0, 4);
    
  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Success! Found rows:", data?.length);
    console.log(data);
  }
}

test();
