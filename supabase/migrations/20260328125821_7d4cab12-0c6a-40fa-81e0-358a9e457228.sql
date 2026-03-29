-- Fix permissive INSERT policy on profiles - restrict to own profile or gestor
DROP POLICY "Service can insert profiles" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'gestor'));