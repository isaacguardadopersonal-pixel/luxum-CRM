export interface ChangeLog {
  id: string;
  date: string;
  reason: string;
}

export interface ProductDriver {
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
  products?: Product[];
  logs?: ChangeLog[];
}

export function parseCSVRow(row: Record<string, string>): Client {
  const premiumRaw = (row["Policy Premium"] || "").replace(/[$,"]/g, "").trim();
  const premium = premiumRaw ? parseFloat(premiumRaw) : 0;
  
  const products: Product[] = [];
  const policyNumber = row["Policy Number"] || "";
  const company = row["Company"] || "";
  
  if (policyNumber || company || premium > 0) {
    products.push({
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      category: row["Policy Type"] || "Auto", // mapping Policy Type to category
      firstName: row["First Name"] || "",
      lastName: row["Last Name"] || "",
      policyNumber: policyNumber,
      company: company,
      premium: premium,
      licenseNumber: row["Drivers License #"] || "",
      effectiveDate: row["Effective Date"] || "",
      expirationDate: row["Expiration Date"] || "",
      drivers: [],
      createdAt: new Date().toISOString()
    });
  }

  return {
    id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
    status: row["Status"] || "",
    firstName: row["First Name"] || "",
    lastName: row["Last Name"] || "",
    email: row["Email"] || "",
    workPhone: row["Work Phone"] || "",
    dob: row["DOB"] || "",
    driversLicense: row["Drivers License #"] || "",
    dlState: row["DL State"] || "",
    address: row["Address"] || "",
    city: row["City"] || "",
    zip: row["Zip"] || "",
    state: row["State"] || "",
    referredBy: row["Referred By"] || "",
    notes: row["Notes"] || "",
    products
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
