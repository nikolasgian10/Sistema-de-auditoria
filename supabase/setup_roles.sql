-- ============================================================================
-- SETUP ROLES - Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar que o usuário existe
SELECT id, email FROM auth.users WHERE email = 'nikolasgian10@gmail.com';

-- 2. Remover role anterior se tiver (opcional)
DELETE FROM public.user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'nikolasgian10@gmail.com');

-- 3. Adicionar role como GESTOR
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'gestor'::app_role FROM auth.users 
WHERE email = 'nikolasgian10@gmail.com';

-- 4. Verificar que foi inserido
SELECT u.email, ur.role 
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'nikolasgian10@gmail.com';
