import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Client, parseCSVRow } from "@/lib/clientData";
import { supabase } from "@/integrations/supabase/client";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupabaseClients = async () => {
      try {
        const { data, error } = await supabase.from("clients").select("*");
        if (error) throw error;
        
        if (data && data.length > 0) {
          setClients(data as Client[]);
          localStorage.setItem("crm_clients", JSON.stringify(data));
        } else {
          // Fallback a Storage o CSV local
          const savedClients = localStorage.getItem("crm_clients");
          if (savedClients) {
            setClients(JSON.parse(savedClients));
          } else {
            // Si es primera vez, cargamos el csv por defecto y lo mandamos a Supabase
            fetch("/data/clients.csv")
              .then((res) => res.text())
              .then(async (csv) => {
                const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
                const parsed = (result.data as Record<string, string>[]).map(parseCSVRow);
                setClients(parsed);
                localStorage.setItem("crm_clients", JSON.stringify(parsed));
                
                // Cargar a Supabase de golpe
                if (parsed.length > 0) {
                  await supabase.from("clients").upsert(parsed as any);
                }
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.error("Error cargando de Supabase:", err);
        // Fallback local
        const savedClients = localStorage.getItem("crm_clients");
        if (savedClients) setClients(JSON.parse(savedClients));
      } finally {
        setLoading(false);
      }
    };

    fetchSupabaseClients();
  }, []);

  const pullFromSupabase = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      
      if (data && Array.isArray(data)) {
        setClients(data as Client[]);
        localStorage.setItem("crm_clients", JSON.stringify(data));
        console.log("Sincronización O.K. - Se recuperaron", data.length, "clientes desde Supabase.");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Fallo al descargar de Supabase:", error);
      return false;
    }
  };

  const addClients = async (newClients: Client[]) => {
    setClients((prev) => {
      const updated = [...newClients, ...prev];
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      return updated;
    });

    if (newClients.length > 0) {
      try {
        const { error } = await supabase.from("clients").upsert(newClients as any);
        if (error) throw error;
      } catch (error) {
        console.error("Error sincronizando (Bulk) con Supabase:", error);
      }
    }
  };

  const updateClient = async (id: string, updatedClient: Partial<Client>) => {
    let clientToSync: Client | null = null;
    
    setClients((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          const newC = { ...c, ...updatedClient };
          clientToSync = newC;
          return newC;
        }
        return c;
      });

      if (clientToSync) {
        localStorage.setItem("crm_clients", JSON.stringify(updated));
      }
      return updated;
    });

    if (clientToSync) {
      try {
        const { error } = await supabase.from("clients").upsert(clientToSync as any);
        if (error) throw error;
      } catch (err) {
        console.error("Error actualizando en Supabase:", err);
      }
    }
  };

  const deleteClient = async (id: string) => {
    setClients((prev) => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error eliminando de Supabase:", err);
    }
  };

  const deleteAllClients = async () => {
    setClients([]);
    localStorage.removeItem("crm_clients");
    try {
      const { error } = await supabase.from("clients").delete().neq("id", "none_existent");
      if (error) throw error;
    } catch (err) {
      console.error("Error vaciando base de datos en Supabase", err);
    }
  };

  return { clients, loading, addClients, updateClient, deleteClient, pullFromSupabase, deleteAllClients };
}
