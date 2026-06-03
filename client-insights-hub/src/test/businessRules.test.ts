import { describe, it, expect } from "vitest";
import { Client, Product } from "@/lib/clientData";
import {
  calculateMonthlyBookOfBusiness,
  getClientPremiumSummary,
  getClientLoyaltyRank
} from "@/lib/clientData";

// Helper para crear clientes de prueba rápido
const createMockClient = (id: string, products: Partial<Product>[]): Client => {
  return {
    id,
    firstName: "Test",
    lastName: "User",
    status: "Current Customer",
    email: "test@example.com",
    workPhone: "1234567890",
    dob: "01/01/1990",
    driversLicense: "123456",
    dlState: "VA",
    address: "123 Main St",
    city: "Richmond",
    zip: "23220",
    state: "VA",
    referredBy: "",
    notes: "",
    reminders: [],
    logs: [],
    products: products.map((p, idx) => ({
      id: `${id}-prod-${idx}`,
      category: "Auto",
      firstName: "Test",
      lastName: "User",
      policyNumber: `POL-${idx}`,
      company: "Progressive",
      premium: 500,
      licenseNumber: "123456",
      effectiveDate: "05/01/2026",
      expirationDate: "11/01/2026",
      status: "Activa",
      ...p
    }))
  };
};

describe("Reglas de Negocio del CRM de Seguros", () => {
  
  describe("Regla 1: Estados y Cálculo del Libro de Negocios Mensual", () => {
    it("debe sumar correctamente las pólizas Activas en el mes correspondiente", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 600, effectiveDate: "05/15/2026" }
      ]);
      const res = calculateMonthlyBookOfBusiness([client], "05/2026");
      expect(res.activeTotal).toBe(600);
      expect(res.historicalTotal).toBe(0);
      expect(res.lossTotal).toBe(0);
      expect(res.netTotal).toBe(600);
    });

    it("debe registrar pólizas Renovadas en el historial pero no en las activas", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 700, effectiveDate: "05/10/2026" },
        { status: "Renovada", premium: 500, effectiveDate: "05/01/2026" } // Histórica renovada
      ]);
      const res = calculateMonthlyBookOfBusiness([client], "05/2026");
      expect(res.activeTotal).toBe(700);
      expect(res.historicalTotal).toBe(500);
      expect(res.lossTotal).toBe(0);
      expect(res.netTotal).toBe(1200); // Se suma al valor acumulado neto
    });

    it("debe restar la prima de pólizas Canceladas antes de su expiración", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 800, effectiveDate: "05/01/2026" },
        { 
          status: "Cancelada", 
          premium: 300, 
          effectiveDate: "05/01/2026",
          expirationDate: "11/01/2026",
          cancelationDate: "05/15/2026" // Cancelada antes del 11/01/2026
        }
      ]);
      const res = calculateMonthlyBookOfBusiness([client], "05/2026");
      expect(res.activeTotal).toBe(800);
      expect(res.lossTotal).toBe(300);
      expect(res.netTotal).toBe(500); // 800 + 0 - 300 = 500
    });

    it("NO debe restar pólizas canceladas si la fecha de cancelación no es menor a la de expiración", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 800, effectiveDate: "05/01/2026" },
        { 
          status: "Cancelada", 
          premium: 300, 
          effectiveDate: "01/01/2026",
          expirationDate: "05/01/2026",
          cancelationDate: "05/01/2026" // Cancelada el mismo día o después
        }
      ]);
      const res = calculateMonthlyBookOfBusiness([client], "05/2026");
      expect(res.activeTotal).toBe(800);
      expect(res.lossTotal).toBe(0); // No se resta
      expect(res.netTotal).toBe(800);
    });

    it("debe calcular correctamente el libro de negocios histórico (cuando targetMonth es 'all')", () => {
      const client1 = createMockClient("c1", [
        { status: "Activa", premium: 600, effectiveDate: "05/15/2026" }
      ]);
      const client2 = createMockClient("c2", [
        { status: "Renovada", premium: 500, effectiveDate: "04/10/2026" }
      ]);
      const client3 = createMockClient("c3", [
        { 
          status: "Cancelada", 
          premium: 300, 
          effectiveDate: "02/01/2026",
          expirationDate: "08/01/2026",
          cancelationDate: "03/15/2026" // Cancelada antes de expiración
        }
      ]);
      const res = calculateMonthlyBookOfBusiness([client1, client2, client3], "all");
      expect(res.activeTotal).toBe(600);
      expect(res.historicalTotal).toBe(500);
      expect(res.lossTotal).toBe(300);
      expect(res.netTotal).toBe(800); // 600 + 500 - 300 = 800
    });
  });

  describe("Regla 2: Vista Previa del Cliente y Jerarquía Visual de Prima", () => {
    it("debe tomar el producto Activo como principal", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 1000 }
      ]);
      const summary = getClientPremiumSummary(client);
      expect(summary.primaryPremium).toBe(1000);
      expect(summary.hasDeduction).toBe(false);
      expect(summary.visualString).toBe("$1,000");
    });

    it("debe resaltar visualmente deducciones si existen pólizas canceladas antes de su vencimiento", () => {
      const client = createMockClient("c1", [
        { status: "Activa", premium: 1200 },
        { 
          status: "Cancelada", 
          premium: 400, 
          effectiveDate: "02/01/2026", 
          expirationDate: "08/01/2026", 
          cancelationDate: "05/01/2026" 
        }
      ]);
      const summary = getClientPremiumSummary(client);
      expect(summary.primaryPremium).toBe(1200);
      expect(summary.hasDeduction).toBe(true);
      expect(summary.deductionAmount).toBe(400);
      expect(summary.visualString).toBe("$1,200 | Deducción: -$400");
    });
  });

  describe("Regla 3: Sistema de Rangos (Fidelización)", () => {
    it("debe asignar Rango Plata de 0 a 2 renovaciones", () => {
      const client = createMockClient("c1", [
        { status: "Activa" }
      ]);
      const loyalty = getClientLoyaltyRank(client);
      expect(loyalty.rank).toBe("Plata");
      expect(loyalty.count).toBe(0);
    });

    it("debe asignar Rango Oro de 3 a 5 renovaciones", () => {
      const client = createMockClient("c1", [
        { status: "Activa" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" }
      ]);
      const loyalty = getClientLoyaltyRank(client);
      expect(loyalty.rank).toBe("Oro");
      expect(loyalty.count).toBe(3);
    });

    it("debe asignar Rango Diamante con 6 o más renovaciones", () => {
      const client = createMockClient("c1", [
        { status: "Activa" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" },
        { status: "Renovada", tipo_movimiento: "Renovación" }
      ]);
      const loyalty = getClientLoyaltyRank(client);
      expect(loyalty.rank).toBe("Diamante");
      expect(loyalty.count).toBe(6);
    });
  });
});
