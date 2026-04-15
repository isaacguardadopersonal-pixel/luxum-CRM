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
      await fetch("https://script.google.com/macros/s/AKfycbxIXwAdmqPgj6LpGfJPuNpYCb255SAlXQL1lvLfMHzg-2Qs3KERITfrhitbZRdGgCSaqg/exec", {
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

  const addClients = (newClients: Client[]) => {
    setClients((prev) => {
      const updated = [...newClients, ...prev];
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      // Sincronizamos cada nuevo cliente individualmente
      newClients.forEach(syncToSheets);
      return updated;
    });
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
  const deleteClient = (id: string) => {
    setClients((prev) => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem("crm_clients", JSON.stringify(updated));
      return updated;
    });
  };

  const deleteAllClients = () => {
    setClients([]);
    localStorage.removeItem("crm_clients");
  };

  return { clients, loading, addClients, updateClient, deleteClient, deleteAllClients };
}