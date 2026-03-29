
-- Machines table
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  sector text NOT NULL DEFAULT '',
  minifabrica text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read machines"
  ON public.machines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors and diretors can insert machines"
  ON public.machines FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can update machines"
  ON public.machines FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));

CREATE POLICY "Gestors can delete machines"
  ON public.machines FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));

-- Checklists table
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  minifabrica text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read checklists"
  ON public.checklists FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors and diretors can insert checklists"
  ON public.checklists FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors and diretors can update checklists"
  ON public.checklists FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));

CREATE POLICY "Gestors and diretors can delete checklists"
  ON public.checklists FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));

-- Checklist items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  question text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'ok_nok',
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read checklist items"
  ON public.checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors and diretors can insert checklist items"
  ON public.checklist_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors and diretors can update checklist items"
  ON public.checklist_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));

CREATE POLICY "Gestors and diretors can delete checklist items"
  ON public.checklist_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role) OR public.has_role(auth.uid(), 'diretor'::app_role));
