-- 1. Creamos la tabla independiente para los productos
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "policyNumber" TEXT,
  company TEXT,
  premium NUMERIC,
  "licenseNumber" TEXT,
  "effectiveDate" TEXT,
  "expirationDate" TEXT,
  drivers JSONB DEFAULT '[]'::jsonb,
  "createdAt" TEXT,
  tipo_movimiento TEXT DEFAULT 'Venta Nueva',
  id_poliza_padre TEXT,
  fecha_sustitucion TEXT,
  status TEXT DEFAULT 'Activa'
);

-- 2. Deshabilitamos o apagamos el guardia (RLS) para permitir que Vercel pueda interactuar
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Nota: Tus clientes actuales que tengan productos adentro de su tabla "clients" seguirán existiendo allí.
-- A partir de ahora, los nuevos se guardarán en esta estructura más limpia.
