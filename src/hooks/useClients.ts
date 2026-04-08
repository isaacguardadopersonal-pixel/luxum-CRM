import { useState, useEffect } from "react";
import Papa from "papaparse";
import { Client, parseCSVRow } from "@/lib/clientData";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/clients.csv")
      .then((res) => res.text())
      .then((csv) => {
        const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
        const parsed = (result.data as Record<string, string>[]).map(parseCSVRow);
        setClients(parsed);
        setLoading(false);
      });
  }, []);

  const addClients = (newClients: Client[]) => {
    setClients((prev) => [...newClients, ...prev]);
  };

  const updateClient = (id: string, updatedClient: Partial<Client>) => {
    setClients((prev) => 
      prev.map((c) => (c.id === id ? { ...c, ...updatedClient } : c))
    );
  };

  return { clients, loading, addClients, updateClient };
}
