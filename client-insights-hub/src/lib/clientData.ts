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
  dob?: string;
  driversLicense?: string;
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
  products: Product[];
  reminders: Reminder[];
  logs: ChangeLog[];
  drivers?: Driver[];
  created_by?: string;
}

export interface Driver {
  id?: string;
  client_id?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  drivers_license: string;
  dob: string;
  driver_off?: string;
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

  const premiumRaw = getV(["Policy Premium", "Premium", "Prima", "Precio", "Pago", "Total Premium", "Costo"]).replace(/[$,"]/g, "").trim();
  const premium = premiumRaw ? parseFloat(premiumRaw) : 0;

  const products: Product[] = [];
  const policyNumber = getV(["Policy Number", "Poliza", "Póliza", "No. Poliza", "Numero de Poliza", "Policy #", "Poliza #"]);
  const company = getV(["Company", "Compañia", "Compania", "Aseguradora", "Carrier", "Insurance Company", "Compañía de Seguros"]);

  if (policyNumber || company || premium > 0) {
    products.push({
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      category: getV(["Policy Type", "Type", "Tipo", "Categoria", "Categoría", "Línea de Negocio", "Line of Business", "LOB"]) || "Auto",
      firstName: getV(["First Name", "Nombre", "Nombres", "Primer Nombre", "Nombre del Titular"]) || "",
      lastName: getV(["Last Name", "Apellido", "Apellidos", "Apellidos del Titular"]) || "",
      policyNumber: policyNumber,
      company: company,
      premium: premium,
      licenseNumber: getV(["Drivers License #", "License", "Drivers License", "Licencia", "No. Licencia", "Licencia de Conducir", "DL", "DL#"]) || "",
      effectiveDate: getV(["Effective Date", "Efectividad", "Effective", "Fecha Efectiva", "Inicio de Vigencia", "Vigencia", "Effective Date (MM/DD/YYYY)"]) || "",
      expirationDate: getV(["Expiration Date", "Vencimiento", "Expiration", "Fecha de Vencimiento", "Fin de Vigencia", "Expiration Date (MM/DD/YYYY)"]) || "",
      drivers: [],
      createdAt: new Date().toISOString()
    });
  }

  return {
    id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    status: getV(["Status", "Estado", "Estatus", "Etiqueta"]) || "",
    firstName: getV(["First Name", "Nombre", "Nombres", "Primer Nombre", "Nombre del Cliente", "Client Name"]) || "",
    lastName: getV(["Last Name", "Apellido", "Apellidos", "Apellidos del Cliente"]) || "",
    email: getV(["Email", "Correo", "Mail", "Correo Electronico", "Correo Electrónico", "E-mail"]) || "",
    workPhone: getV(["Work Phone", "Phone", "Teléfono", "Telefono", "Contacto", "Celular", "Mobile", "Phone Number", "Numero de Telefono"]) || "",
    dob: getV(["DOB", "Date of Birth", "Fecha de Nacimiento", "Nacimiento", "Cumpleaños"]) || "",
    driversLicense: getV(["Drivers License #", "Drivers License", "License", "Licencia", "No. Licencia", "Licencia de Conducir", "DL", "DL#"]) || "",
    dlState: getV(["DL State", "Estado DL", "DL_State", "Estado de Licencia", "Estado Licencia"]) || "",
    address: getV(["Address", "Dirección", "Direccion", "Calle", "Domicilio", "Street Address"]) || "",
    city: getV(["City", "Ciudad", "Municipio", "Población"]) || "",
    zip: getV(["Zip", "Zip Code", "Codigo Postal", "Postal", "CP", "C.P."]) || "",
    state: getV(["State", "Estado", "Provincia", "Departamento", "Region"]) || "",
    referredBy: getV(["Referred By", "Referido Por", "Referido", "Recomendado Por", "Referral"]) || "",
    notes: getV(["Notes", "Notas", "Comentarios", "Observaciones", "Detalles"]) || "",
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
    case "IMPORTANTE": return "status-importante";
    default: return "status-quoting";
  }
}
