import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Papa from "papaparse";
import { Client, parseCSVRow, Product } from "@/lib/clientData";
import { supabase } from "@/integrations/supabase/client";

const sanitizeProductForDb = (p: Product, clientId: string) => {
  const cleanP = { ...p, client_id: clientId };
  delete (cleanP as any).status;
  delete (cleanP as any).tipo_movimiento;
  delete (cleanP as any).id_poliza_padre;
  delete (cleanP as any).fecha_sustitucion;
  return cleanP;
};


export function useClients() {
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading: loading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      try {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let fetchMore = true;

        while (fetchMore) {
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .range(from, from + step - 1);
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) {
              fetchMore = false;
            } else {
              from += step;
            }
          } else {
            fetchMore = false;
          }
        }
        
        if (allData.length > 0) {
          return allData as Client[];
        } else {
          // Si es primera vez y no hay en Supabase, cargamos el csv por defecto y lo mandamos a Supabase
          try {
            const res = await fetch("/data/clients.csv");
            if (res.ok) {
              const csv = await res.text();
              const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
              const parsed = (result.data as Record<string, string>[]).map(parseCSVRow);
              
              if (parsed.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < parsed.length; i += chunkSize) {
                  const chunk = parsed.slice(i, i + chunkSize);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await supabase.from("clients").upsert(chunk as any);
                  
                  const productsToSync = [];
                  for (const c of chunk) {
                    if (c.products) {
                      for (const p of c.products) {
                        productsToSync.push(sanitizeProductForDb(p, c.id));
                      }
                    }
                  }
                  if (productsToSync.length > 0) {
                    const pChunkSize = 500;
                    for (let j = 0; j < productsToSync.length; j += pChunkSize) {
                       await supabase.from("products").upsert(productsToSync.slice(j, j + pChunkSize) as any);
                    }
                  }
                }
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
        const chunkSize = 500;
        for (let i = 0; i < newClients.length; i += chunkSize) {
          const chunk = newClients.slice(i, i + chunkSize);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await supabase.from("clients").upsert(chunk as any);
          if (error) throw error;
          
          const productsToSync = [];
          for (const c of chunk) {
            if (c.products) {
              for (const p of c.products) {
                productsToSync.push(sanitizeProductForDb(p, c.id));
              }
            }
          }
          if (productsToSync.length > 0) {
            const pChunkSize = 500;
            for (let j = 0; j < productsToSync.length; j += pChunkSize) {
              await supabase.from("products").upsert(productsToSync.slice(j, j + pChunkSize) as any);
            }
          }
        }
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

        if (clientToSync.products) {
           const productsToSync = clientToSync.products.map(p => sanitizeProductForDb(p, clientToSync!.id));
           if (productsToSync.length > 0) {
             await supabase.from("products").upsert(productsToSync as any);
           }
           
           const productIds = clientToSync.products.map(p => p.id);
           if (productIds.length > 0) {
              await supabase.from("products").delete().eq("client_id", clientToSync.id).not("id", "in", `(${productIds.map(id => `"${id}"`).join(',')})`);
           } else {
              await supabase.from("products").delete().eq("client_id", clientToSync.id);
           }
        }
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
      await supabase.from("products").delete().eq("client_id", id);
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
      await supabase.from("products").delete().neq("id", "none_existent");
    } catch (err) {
      console.error("Error vaciando base de datos en Supabase", err);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  };

  return { clients, loading, addClients, updateClient, deleteClient, pullFromSupabase, deleteAllClients };
}
