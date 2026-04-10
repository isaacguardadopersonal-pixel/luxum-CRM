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

  const syncToSheets = async (client: Client) => {
    try {
      // Usamos await para manejar mejor el flujo, aunque sea no-cors
      await fetch("https://script.google.com/macros/s/AKfycbyCPXkvS3SuYFYE7N0gzbYGWn0G1-Rh8mtpccJVm4LCadY7MAFNdmRCYtkkY4tORLDFUA/exec", {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(client),
      });
      console.log("Sincronizado con Sheets:", client.firstName);
    } catch (error) {
      console.error("Error sincronizando con Sheets:", error);
    }
  };

  const syncBulkToSheets = async (clientsArray: Client[]) => {
    try {
      await fetch("https://script.google.com/macros/s/AKfycbwutwaAXWecBMzwnfK_NAeqlMlFgjgbK0amY3gkszPdBcjboyV3e7mIcCmYuISxwKxk0g/exec", {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientsArray), // Envío masivo de clientes en 1 sola llamada (array)
      });
      console.log("Sincronización MASIVA con Sheets:", clientsArray.length, "clientes");
    } catch (error) {
      console.error("Error sincronizando (Bulk) con Sheets:", error);
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
        syncToSheets(newClients[0]);
      } else {
        // Enviar lentamente: 1 cliente cada 20 segundos
        const syncLento = async () => {
          for (let i = 0; i < newClients.length; i++) {
            await syncToSheets(newClients[i]);
            // Esperar 15 Segundos antes del próximo
            console.log(`Sincronización pausada... esperando 15 segundos para el cliente ${i+1} de ${newClients.length}`);
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
          console.log("¡Sincronización por goteo finalizada!");
        };
        syncLento();
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
        syncToSheets(clientToSync);
      }
      return updated;
    });
  };

  return { clients, loading, addClients, updateClient };
}
