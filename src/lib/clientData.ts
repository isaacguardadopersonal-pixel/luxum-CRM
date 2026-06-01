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
  cancelationDate?: string | null;
  drivers?: ProductDriver[];
  createdAt?: string;
  tipo_movimiento?: 'Venta Nueva' | 'Renovación' | 'Reemplazo' | 'Fidelización' | string;
  id_poliza_padre?: string;
  fecha_sustitucion?: string;
  status?: 'Activa' | 'Renovada' | 'Cancelada' | 'Cancelada por Reemplazo' | 'Removida por Reemplazo' | 'Finalizada' | string;
  motivo_salida?: string;
}

export type LoyaltyRank = 'Plata' | 'Oro' | 'Diamante';

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
    case "Website": return "status-website";
    default: return "status-quoting";
  }
}

export interface ClientPremiumSummary {
  primaryPremium: number;
  primaryProduct: Product | null;
  hasDeduction: boolean;
  deductionAmount: number;
  visualString: string;
}

/**
 * Calcula el resumen financiero (libro de negocios) de un mes específico (ej. "05/2026")
 */
export function calculateMonthlyBookOfBusiness(
  clients: Client[],
  targetMonth: string
): { activeTotal: number; historicalTotal: number; lossTotal: number; netTotal: number } {
  let activeTotal = 0;
  let historicalTotal = 0;
  let lossTotal = 0;

  clients.forEach(client => {
    if (!client.products) return;

    client.products.forEach(product => {
      const isSameMonth = (dateStr?: string | null) => {
        if (!dateStr) return false;
        // Permite validar formatos de fecha comunes (MM/DD/YYYY o YYYY-MM-DD)
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const monthYear = `${parts[0].padStart(2, '0')}/${parts[2]}`;
          return monthYear === targetMonth;
        }
        return false;
      };

      if (product.status === 'Activa' && isSameMonth(product.effectiveDate)) {
        activeTotal += product.premium || 0;
      }

      if (product.status === 'Renovada' && isSameMonth(product.effectiveDate)) {
        historicalTotal += product.premium || 0;
      }

      if (product.status === 'Cancelada' && product.cancelationDate) {
        const cancelDateObj = new Date(product.cancelationDate);
        const expDateObj = product.expirationDate ? new Date(product.expirationDate) : null;

        if (expDateObj && cancelDateObj < expDateObj && isSameMonth(product.cancelationDate)) {
          lossTotal += product.premium || 0;
        }
      }
    });
  });

  return {
    activeTotal,
    historicalTotal,
    lossTotal,
    netTotal: activeTotal + historicalTotal - lossTotal
  };
}

/**
 * Evalúa los productos de un cliente bajo la jerarquía: Activa (1) > Renovada (2) > Cancelada (3)
 */
export function getClientPremiumSummary(client: Client): ClientPremiumSummary {
  const products = client.products || [];

  const activeProduct = products.find(p => p.status === 'Activa');
  const primaryPremium = activeProduct ? (activeProduct.premium || 0) : 0;

  let deductionAmount = 0;
  const canceledProducts = products.filter(p => p.status === 'Cancelada');

  canceledProducts.forEach(p => {
    if (p.cancelationDate && p.expirationDate) {
      const cancelDateObj = new Date(p.cancelationDate);
      const expDateObj = new Date(p.expirationDate);
      if (cancelDateObj < expDateObj) {
        deductionAmount += p.premium || 0;
      }
    }
  });

  let visualString = `$${primaryPremium.toLocaleString()}`;
  if (deductionAmount > 0) {
    visualString += ` | Deducción: -$${deductionAmount.toLocaleString()}`;
  }

  return {
    primaryPremium,
    primaryProduct: activeProduct || null,
    hasDeduction: deductionAmount > 0,
    deductionAmount,
    visualString
  };
}

/**
 * Determina el rango de fidelización según la cantidad de renovaciones del cliente
 */
export function getClientLoyaltyRank(client: Client): { rank: LoyaltyRank; color: string; count: number } {
  const products = client.products || [];

  const renewalCount = products.filter(p => p.status === 'Renovada' || p.tipo_movimiento === 'Renovación').length;

  if (renewalCount >= 6) {
    return { rank: 'Diamante', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', count: renewalCount };
  } else if (renewalCount >= 3) {
    return { rank: 'Oro', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', count: renewalCount };
  } else {
    return { rank: 'Plata', color: 'text-slate-400 bg-slate-400/10 border-slate-400/30', count: renewalCount };
  }
}
