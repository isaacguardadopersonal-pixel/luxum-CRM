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
          .select('*');

        if (error) throw error;
        
        if (data) {
          // Transform snake_case back to camelCase for the UI
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const transformed: Client[] = data.map((row: any) => ({
             id: row.id,
             status: row.status || '',
             firstName: row.firstName || '',
             lastName: row.lastName || '',
             email: row.email || '',
             workPhone: row.workPhone || '',
             dob: row.dob || '',
             driversLicense: row.driversLicense || '',
             dlState: row.dlState || '',
             address: row.address || '',
             city: row.city || '',
             zip: row.zip || '',
             state: row.state || '',
             referredBy: row.referredBy || '',
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

    const toInsert = newClients.map(c => ({
      id: c.id,
      status: c.status,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      workPhone: c.workPhone,
      dob: c.dob,
      driversLicense: c.driversLicense,
      dlState: c.dlState,
      address: c.address,
      city: c.city,
      zip: c.zip,
      state: c.state,
      referredBy: c.referredBy,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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