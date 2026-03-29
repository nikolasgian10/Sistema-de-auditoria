-- Create schedule_entries table (Cronograma/Agendamento)
CREATE TABLE public.schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
  minifabrica text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'rescheduled')),
  scheduled_date date,
  completed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, day_of_week, month, year, employee_id, machine_id)
);

-- Create schedule_model table (Modelo de Cronograma para reutilização)
CREATE TABLE public.schedule_model (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  minifabrica text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  week_index integer NOT NULL DEFAULT 1 CHECK (week_index >= 1 AND week_index <= 5),
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create schedule_assignments table (Atribuições de Auditores para Cronograma)
CREATE TABLE public.schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minifabrica text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_index integer NOT NULL CHECK (week_index >= 1 AND week_index <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (minifabrica, sector, machine_id, employee_id, week_index)
);

-- Create auditor_rotation table (Rotação de Auditores)
CREATE TABLE public.auditor_rotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rotation_order integer NOT NULL,
  minifabrica text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector, employee_id, minifabrica)
);

-- Create indexes for better performance
CREATE INDEX idx_schedule_entries_machine_id ON public.schedule_entries(machine_id);
CREATE INDEX idx_schedule_entries_employee_id ON public.schedule_entries(employee_id);
CREATE INDEX idx_schedule_entries_date ON public.schedule_entries(year, month);
CREATE INDEX idx_schedule_entries_status ON public.schedule_entries(status);
CREATE INDEX idx_schedule_entries_minifabrica ON public.schedule_entries(minifabrica);
CREATE INDEX idx_schedule_model_minifabrica ON public.schedule_model(minifabrica);
CREATE INDEX idx_schedule_model_sector ON public.schedule_model(sector);
CREATE INDEX idx_schedule_assignments_minifabrica ON public.schedule_assignments(minifabrica);
CREATE INDEX idx_auditor_rotation_sector ON public.auditor_rotation(sector);

-- Enable RLS
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditor_rotation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_entries
CREATE POLICY "Authenticated users can read schedule entries"
  ON public.schedule_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors can insert schedule entries"
  ON public.schedule_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can update schedule entries"
  ON public.schedule_entries FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can delete schedule entries"
  ON public.schedule_entries FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

-- RLS Policies for schedule_model
CREATE POLICY "Authenticated users can read schedule model"
  ON public.schedule_model FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors can insert schedule model"
  ON public.schedule_model FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can update schedule model"
  ON public.schedule_model FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can delete schedule model"
  ON public.schedule_model FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

-- RLS Policies for schedule_assignments
CREATE POLICY "Authenticated users can read schedule assignments"
  ON public.schedule_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors can manage schedule assignments"
  ON public.schedule_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can update schedule assignments"
  ON public.schedule_assignments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can delete schedule assignments"
  ON public.schedule_assignments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

-- RLS Policies for auditor_rotation
CREATE POLICY "Authenticated users can read auditor rotation"
  ON public.auditor_rotation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestors can manage auditor rotation"
  ON public.auditor_rotation FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can update auditor rotation"
  ON public.auditor_rotation FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

CREATE POLICY "Gestors can delete auditor rotation"
  ON public.auditor_rotation FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'gestor'::app_role) OR
    public.has_role(auth.uid(), 'diretor'::app_role)
  );

-- Triggers for updated_at timestamps
CREATE TRIGGER update_schedule_entries_updated_at
  BEFORE UPDATE ON public.schedule_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_model_updated_at
  BEFORE UPDATE ON public.schedule_model
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_assignments_updated_at
  BEFORE UPDATE ON public.schedule_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auditor_rotation_updated_at
  BEFORE UPDATE ON public.auditor_rotation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
