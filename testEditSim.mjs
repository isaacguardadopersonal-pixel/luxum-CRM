import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEditSim() {
  const testId = "test_manual_id_999";
  
  // 1. Crear
  console.log("Creando cliente original...");
  const newClient = {
    id: testId,
    firstName: "OriginalName",
    lastName: "OriginalLastName",
    products: [],
    logs: []
  };
  
  const { error: e1 } = await supabase.from('clients').upsert(newClient);
  if (e1) { console.error("Error al crear:", e1); return; }
  
  // 2. Editar y Guardar
  console.log("Editando cliente (haciendo update/upsert)...");
  const editPayload = {
    id: testId,
    firstName: "ChangedName",   // Se cambia el nombre
    lastName: "OriginalLastName",
    products: [],
    logs: [{id: "log1", date: new Date().toISOString(), reason: "Prueba cambiar nombre"}]
  };
  
  const { error: e2 } = await supabase.from('clients').upsert(editPayload);
  if (e2) { console.error("Error al editar:", e2); return; }
  
  // 3. Revisar si la base de datos realmente tiene "ChangedName"
  const { data, error: e3 } = await supabase.from('clients').select('id, firstName').eq('id', testId);
  console.log("Resultado Supabase:", data);
}

testEditSim();
