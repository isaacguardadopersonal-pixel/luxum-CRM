-- 1. Crear tabla para los roles de los usuarios
CREATE TABLE public.user_roles (
    user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('admin', 'vendedor')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar la seguridad a nivel de fila (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para que los usuarios puedan ver su propio rol
CREATE POLICY "Users can read their own role" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 4. Función y Trigger para asignar automáticamente 'vendedor' a un usuario nuevo
-- Nota: Deberás cambiar a 'admin' el rol de tu propio usuario manualmente después de crearlo
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'vendedor');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- IMPORTANTE:
-- Para crear tus usuarios como administrador:
-- 1. Ve a "Authentication" en el Dashboard de Supabase.
-- 2. Da click en "Add User" -> "Create New User".
-- 3. Pon el correo del usuario (la contraseña autogenerada o ponles una temporal; igual van a iniciar con código a su correo).
-- 4. El trigger se ejecutará y el usuario tendrá rol de 'vendedor'.
-- 5. Si quieres hacerlo 'admin', ve al "SQL Editor" y corre: 
--    UPDATE public.user_roles SET role = 'admin' WHERE user_id = 'AQUÍ_EL_ID_DEL_USUARIO';
