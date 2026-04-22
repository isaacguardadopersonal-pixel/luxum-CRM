export interface ChangeLog {
  id: string;
  date: string;
  reason: string;
}

export interface ProductDriver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface Product {
  id: string;
  category: string;
  firstName: string;
  lastName: string;
  policyNumber: string;
  company: string;
  premium: number;
  licenseNumber: string;
  effectiveDate?: string;
  expirationDate?: string;
  drivers?: ProductDriver[];
  createdAt?: string;
  tipo_movimiento?: 'Venta Nueva' | 'Renovación' | 'Reemplazo' | string;
  id_poliza_padre?: string;
  fecha_sustitucion?: string;
  status?: 'Activa' | 'Cancelada por Reemplazo' | string;
}

export interface Reminder {
  id: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface Client {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  workPhone: string;
  dob: string;
  driversLicense: string;
  dlState: string;
  address: string;
  city: string;
  zip: string;
  state: string;
  referredBy: string;
  notes: string;
  products: Product[]; // Quitamos el '?' para que siempre sea un array (facilita el map/sync)
  reminders: Reminder[]; // Quitamos el '?' para evitar el error de TypeScript
  logs: ChangeLog[]; // Quitamos el '?' para consistencia
}

export function parseCSVRow(row: Record<string, string>): Client {
  const lowerRow: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    lowerRow[k.trim().toLowerCase()] = v;
  }

  const getV = (keys: string[]) => {
    for (const k of keys) {
      const val = lowerRow[k.toLowerCase()];
      if (val !== undefined && val !== "") return val;
    }
    return "";
  };

  const premiumRaw = getV(["Policy Premium", "Premium"]).replace(/[$,"]/g, "").trim();
  const premium = premiumRaw ? parseFloat(premiumRaw) : 0;

  const products: Product[] = [];
  const policyNumber = getV(["Policy Number", "Poliza"]);
  const company = getV(["Company", "Compañia", "Compania"]);

  if (policyNumber || company || premium > 0) {
    products.push({
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      category: getV(["Policy Type", "Type", "Tipo"]) || "Auto",
      firstName: getV(["First Name", "Nombre", "Nombres"]) || "",
      lastName: getV(["Last Name", "Apellido", "Apellidos"]) || "",
      policyNumber: policyNumber,
      company: company,
      premium: premium,
      licenseNumber: getV(["Drivers License #", "License", "Drivers License", "Licencia"]) || "",
      effectiveDate: getV(["Effective Date", "Efectividad", "Effective"]) || "",
      expirationDate: getV(["Expiration Date", "Vencimiento", "Expiration"]) || "",
      drivers: [],
      createdAt: new Date().toISOString()
    });
  }

  return {
    id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    status: getV(["Status", "Estado", "Estatus"]) || "",
    firstName: getV(["First Name", "Nombre", "Nombres"]) || "",
    lastName: getV(["Last Name", "Apellido", "Apellidos"]) || "",
    email: getV(["Email", "Correo", "Mail"]) || "",
    workPhone: getV(["Work Phone", "Phone", "Teléfono", "Telefono", "Contacto"]) || "",
    dob: getV(["DOB", "Date of Birth", "Fecha de Nacimiento", "Nacimiento"]) || "",
    driversLicense: getV(["Drivers License #", "Drivers License", "License", "Licencia"]) || "",
    dlState: getV(["DL State", "Estado DL", "DL_State", "Estado de Licencia"]) || "",
    address: getV(["Address", "Dirección", "Direccion", "Calle"]) || "",
    city: getV(["City", "Ciudad", "Municipio"]) || "",
    zip: getV(["Zip", "Zip Code", "Codigo Postal", "Postal"]) || "",
    state: getV(["State", "Estado", "Provincia"]) || "",
    referredBy: getV(["Referred By", "Referido Por", "Referido"]) || "",
    notes: getV(["Notes", "Notas", "Comentarios"]) || "",
    products: products,
    reminders: [],
    logs: []
  };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Current Customer": return "status-current";
    case "Quoting": return "status-quoting";
    case "Opportunities": return "status-opportunities";
    case "Not Interested": return "status-not-interested";
    default: return "status-quoting";
  }
}
