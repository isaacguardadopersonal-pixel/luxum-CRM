import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Papa from "papaparse";
import { Client, parseCSVRow } from "@/lib/clientData";
import { supabase } from "@/integrations/supabase/client";

export function useClients() {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("clients").select("*");
        if (error) throw error;
        
        if (data && data.length > 0) {
          return data as Client[];
        } else {
          // Si es primera vez y no hay en Supabase, cargamos el csv por defecto y lo mandamos a Supabase
          try {
            const res = await fetch("/data/clients.csv");
            if (res.ok) {
              const csv = await res.text();
              const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
              const parsed = (result.data as Record<string, string>[]).map(parseCSVRow);
              
              if (parsed.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await supabase.from("clients").upsert(parsed as any);
              }
              return parsed;
            }
          } catch (e) {
            console.error("Error cargando CSV inicial:", e);
          }
          return [];
        }
      } catch (err) {
        console.error("Error cargando de Supabase:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // Mantiene los datos frescos en caché por 5 minutos
    refetchInterval: 30000, // Fallback automático cada 30 segundos
  });

  useEffect(() => {
    // Configurar suscripción Realtime a Supabase
    const channel = supabase
      .channel('clients-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          // Cuando algo cambia en la DB, invalidamos la caché silenciosamente
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const pullFromSupabase = async (): Promise<boolean> => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      console.log("Sincronización O.K. - Se recuperaron clientes desde Supabase.");
      return true;
    } catch (error) {
      console.error("Fallo al descargar de Supabase:", error);
      return false;
    }
  };

  const addClients = async (newClients: Client[]) => {
    // Actualizar UI optimísticamente
    queryClient.setQueryData(["clients"], (prev: Client[] | undefined) => {
      return [...newClients, ...(prev || [])];
    });

    if (newClients.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("clients").upsert(newClients as any);
        if (error) throw error;
      } catch (error) {
        console.error("Error sincronizando (Bulk) con Supabase:", error);
        // Podríamos invalidar la query si falla, pero para CRM lo dejamos así
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    }
  };

  const updateClient = async (id: string, updatedClient: Partial<Client>) => {
    let clientToSync: Client | null = null;
    
    // Actualizar UI optimísticamente
    queryClient.setQueryData(["clients"], (prev: Client[] | undefined) => {
      if (!prev) return [];
      return prev.map((c) => {
        if (c.id === id) {
          const newC = { ...c, ...updatedClient };
          clientToSync = newC;
          return newC;
        }
        return c;
      });
    });

    if (clientToSync) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from("clients").upsert(clientToSync as any);
        if (error) throw error;
      } catch (err) {
        console.error("Error actualizando en Supabase:", err);
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    }
  };

  const deleteClient = async (id: string) => {
    // Actualizar UI optimísticamente
    queryClient.setQueryData(["clients"], (prev: Client[] | undefined) => {
      if (!prev) return [];
      return prev.filter(c => c.id !== id);
    });

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error eliminando de Supabase:", err);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  };

  const deleteAllClients = async () => {
    queryClient.setQueryData(["clients"], []);
    try {
      const { error } = await supabase.from("clients").delete().neq("id", "none_existent");
      if (error) throw error;
    } catch (err) {
      console.error("Error vaciando base de datos en Supabase", err);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  };

  return { clients, loading, addClients, updateClient, deleteClient, pullFromSupabase, deleteAllClients };
}
