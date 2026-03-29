-- Drop the restrictive old policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow Gestores to update any profile (including minifabrica)
CREATE POLICY "Gestores can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- Allow Administrativos to update any profile (including minifabrica)
CREATE POLICY "Administrativos can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrativo'))
  WITH CHECK (public.has_role(auth.uid(), 'administrativo'));
