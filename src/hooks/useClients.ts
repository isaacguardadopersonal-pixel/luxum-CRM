import { useState, useEffect } from "react";
import { Client } from "@/lib/clientData";
import { supabase } from "@/lib/supabase";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga inicial
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          // Transform snake_case back to camelCase for the UI
          const transformed: Client[] = data.map((row: any) => ({
             id: row.id,
             status: row.status || '',
             firstName: row.first_name || '',
             lastName: row.last_name || '',
             email: row.email || '',
             workPhone: row.work_phone || '',
             dob: row.dob || '',
             driversLicense: row.drivers_license || '',
             dlState: row.dl_state || '',
             address: row.address || '',
             city: row.city || '',
             zip: row.zip || '',
             state: row.state || '',
             referredBy: row.referred_by || '',
             notes: row.notes || '',
             products: row.products || [],
             reminders: row.reminders || [],
             logs: row.logs || []
          }));
          setClients(transformed);
        }
      } catch (err) {
        console.error("Error fetching clients from Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const addClients = async (newClients: Client[]) => {
    // 1. Instantly update the UI
    setClients((prev) => [...newClients, ...prev]);

    // 2. Map back to snake_case for Supabase
    const toInsert = newClients.map(c => ({
      id: c.id,
      status: c.status,
      first_name: c.firstName,
      last_name: c.lastName,
      email: c.email,
      work_phone: c.workPhone,
      dob: c.dob,
      drivers_license: c.driversLicense,
      dl_state: c.dlState,
      address: c.address,
      city: c.city,
      zip: c.zip,
      state: c.state,
      referred_by: c.referredBy,
      notes: c.notes,
      products: c.products,
      reminders: c.reminders,
      logs: c.logs
    }));

    try {
      const { error } = await supabase.from('clients').insert(toInsert);
      if (error) throw error;
    } catch (err) {
      console.error("Error inserting clients to Supabase:", err);
    }
  };

  const updateClient = async (id: string, updatedClient: Partial<Client>) => {
    // 1. Update UI
    let fullUpdated: Record<string, any> = {};
    setClients((prev) => prev.map(c => {
      if (c.id === id) {
        const newC = { ...c, ...updatedClient };
        fullUpdated = newC;
        return newC;
      }
      return c;
    }));

    if (Object.keys(fullUpdated).length === 0) return;

    // 2. Prepare payload for DB
    const payload = {
      status: fullUpdated.status,
      first_name: fullUpdated.firstName,
      last_name: fullUpdated.lastName,
      email: fullUpdated.email,
      work_phone: fullUpdated.workPhone,
      dob: fullUpdated.dob,
      drivers_license: fullUpdated.driversLicense,
      dl_state: fullUpdated.dlState,
      address: fullUpdated.address,
      city: fullUpdated.city,
      zip: fullUpdated.zip,
      state: fullUpdated.state,
      referred_by: fullUpdated.referredBy,
      notes: fullUpdated.notes,
      products: fullUpdated.products,
      reminders: fullUpdated.reminders,
      logs: fullUpdated.logs
    };

    try {
      const { error } = await supabase.from('clients').update(payload).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating client in Supabase:", err);
    }
  };

  const deleteClient = async (id: string) => {
    // 1. Update UI
    setClients((prev) => prev.filter(c => c.id !== id));

    // 2. Delete from DB
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting client in Supabase:", err);
    }
  };

  const deleteAllClients = async () => {
    // 1. Update UI
    setClients([]);

    // 2. Delete all from DB
    try {
      const { error } = await supabase.from('clients').delete().neq('id', 'placeholder');
      if (error) throw error;
    } catch (err) {
      console.error("Error deleting all clients in Supabase:", err);
    }
  };

  return { clients, loading, addClients, updateClient, deleteClient, deleteAllClients };
}