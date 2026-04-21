import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wpjyjpwcrydzlqoccvyf.supabase.co";
const supabaseKey = "sb_publishable_LJiM-joYsFyOm_eXFXdnTg_6PPh6e3_";
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUpdate() {
  const id = "antonioguaradado12020202020test";
  
  // Simulando fetchClients
  const { data: clients } = await supabase.from('clients').select('*, products(*)').eq('id', id);
  if (!clients || clients.length === 0) { console.error("Client not found"); return; }
  
  let fullUpdated = clients[0];
  
  // Simulando cambio
  fullUpdated.lastName = "NUEVO_APELLIDO";
  fullUpdated.status = "Current Customer";

  // Preparando el payload tal como lo hace useClients.ts
  const payloadClient = {
    id: fullUpdated.id,
    status: fullUpdated.status,
    firstName: fullUpdated.firstName,
    lastName: fullUpdated.lastName,
    email: fullUpdated.email,
    workPhone: fullUpdated.workPhone,
    dob: fullUpdated.dob,
    driversLicense: fullUpdated.driversLicense,
    dlState: fullUpdated.dlState,
    address: fullUpdated.address,
    city: fullUpdated.city,
    zip: fullUpdated.zip,
    state: fullUpdated.state,
    referredBy: fullUpdated.referredBy,
    notes: fullUpdated.notes,
    products: fullUpdated.products, // Este es el array proveniente del join products(*)
    reminders: fullUpdated.reminders,
    logs: fullUpdated.logs
  };
  
  console.log("Haciendo UPSERT...");
  const { data, error } = await supabase.from('clients').upsert(payloadClient).select();
  if (error) {
    console.error("⛔ ERROR DE SUPABASE:");
    console.error(error);
  } else {
    console.log("✅ UPSERT EXITOSO:", data[0].lastName);
  }
}

debugUpdate();
