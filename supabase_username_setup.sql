-- 1. Agregar la columna username a la tabla user_roles
ALTER TABLE public.user_roles 
ADD COLUMN username text UNIQUE;

-- 2. Crear una función (RPC) que permita buscar el correo de un username
-- Se crea con SECURITY DEFINER para que pueda ejecutarse saltándose las políticas
-- y buscar en auth.users a pesar de no haber iniciado sesión.
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  -- Buscar el correo uniendose a la tabla protegida de auth.users
  SELECT au.email INTO v_email
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.username = p_username;
  
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANTE PARA ISAAC:
-- Una vez que corras esto en SQL Editor de Supabase:
-- Tienes que asignarte a ti mismo tu nombre de usuario corriendo este comando,
-- remplazando el valor y el ID de tu usuario como administrador:
-- UPDATE public.user_roles SET username = 'iguardado' WHERE user_id = 'AQUÍ_EL_ID_DE_TU_USUARIO';
