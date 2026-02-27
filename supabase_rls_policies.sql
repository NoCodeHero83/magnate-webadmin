-- =====================================================
-- POLÍTICAS PARA ADMINISTRADORES (SIN RECURSIÓN)
-- =====================================================

-- Primero, eliminar las políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- =====================================================
-- FUNCIÓN HELPER PARA VERIFICAR SI ES ADMIN
-- =====================================================
-- Esta función bypasea RLS para evitar recursión infinita

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS USANDO LA FUNCIÓN HELPER
-- =====================================================

-- Usuarios: Los admins pueden ver todos
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT TO authenticated
USING (public.is_admin());

-- Usuarios: Los admins pueden actualizar todos
CREATE POLICY "Admins can update all users"
ON public.users FOR UPDATE TO authenticated
USING (public.is_admin());

-- Cuentas: Los admins pueden ver todas
CREATE POLICY "Admins can view all accounts"
ON public.accounts FOR SELECT TO authenticated
USING (public.is_admin());

-- Transacciones: Los admins pueden ver todas
CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT TO authenticated
USING (public.is_admin());

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 
  tablename, 
  policyname, 
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Admin%'
ORDER BY tablename, policyname;
