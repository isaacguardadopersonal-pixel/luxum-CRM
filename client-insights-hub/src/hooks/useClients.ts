import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Client, parseCSVRow } from "@/lib/clientData";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedClients = localStorage.getItem("crm_clients");
    if (savedClients) {
      setClients(JSON.parse(savedClients));
      setLoading(false);
    } else {
      fetch("/data/clients.csv")
        .then((res) => res.text())
        .then((csv) => {
          const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
          const parsed = (result.data as Record<string, string>[]).map(parseCSVRow);
          setClients(parsed);
          localStorage.setItem("crm_clients", JSON.stringify(parsed));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, []);

  const syncBulkToSheets = async (clientsArray: Client[]) => {
    try {
      await fetch("https://script.google.com/macros/s/AKfycbxNW_iqrbbUCqpKI-jgCv6PaUPCyxH36MEaFAMMHSoxKcFWuwrUe43H6XtT3AZKHEDebg/exec", {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientsArray), 
      });
      console.log("Sincronización MASIVA con Sheets:", clientsArray.length, "clientes");
    } catch (error) {
      console.error("Error sincronizando (Bulk) con Sheets:", error);
    }
  };

  const pullFromSheets = async (): Promise<boolean> => {
    try {
      // Usamos el fetch estándar (sin no-cors) para que siga el 302 y nos devuelva la data real con Permissive CORS de Google
      const response = await fetch("https://script.google.com/macros/s/AKfycbxNW_iqrbbUCqpKI-jgCv6PaUPCyxH36MEaFAMMHSoxKcFWuwrUe43H6XtT3AZKHEDebg/exec");
      if(!response.ok) throw new Error("Error en la descarga de datos.");
      const downloadedClients: Client[] = await response.json();
      
      // Sanitizamos y estructuramos
      if(Array.isArray(downloadedClients)) {
        setClients(downloadedClients);
        localStorage.setItem("crm_clients", JSON.stringify(downloadedClients));
        console.log("Sincronización Inversa O.K. - Se recuperaron", downloadedClients.length, "clientes desde Sheets.");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Fallo monumental al descargar de Google Sheets:", error);
      return false;
    }
  };

  const addClients = (newClients: Client[]) => {
    setClients((prev) => {
      const updated = [...newClients, ...prev];
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      return updated;
    });

    if (newClients.length > 0) {
      if (newClients.length === 1) {
        // Un solo cliente, mandarlo directo
        syncBulkToSheets([newClients[0]]);
      } else {
        // Enviar a Google de golpe en 1 sola petición súper-rápida (Bulk Insert Memoria Ram)
        syncBulkToSheets(newClients);
      }
    }
  };

  const updateClient = (id: string, updatedClient: Partial<Client>) => {
    setClients((prev) => {
      let clientToSync: Client | null = null;
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
        syncBulkToSheets([clientToSync]);
      }
      return updated;
    });
  };
  const deleteClient = (id: string) => {
    setClients((prev) => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      return updated;
    });
  };

  return { clients, loading, addClients, updateClient, deleteClient, pullFromSheets };
}
