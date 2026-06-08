-- Script SQL para agregar la columna motivo_descarte a la tabla de clientes en Supabase
ALTER TABLE clients ADD COLUMN IF NOT EXISTS motivo_descarte TEXT;
