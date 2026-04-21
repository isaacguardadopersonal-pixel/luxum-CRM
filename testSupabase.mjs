import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testeando conexión a Supabase...");
  try {
    const { data, error } = await supabase.from("clients").select("*").limit(1);
    if (error) {
      console.error("FALLÓ AL LEER TABLA CLIENTS. Error:", error);
    } else {
      console.log("¡CONEXIÓN EXITOSA! Tabla leída correctamente. Datos:", data);
    }
  } catch (err) {
    console.error("EXCEPCIÓN Inesperada:", err);
  }
}

testConnection();
