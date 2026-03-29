-- Create audits table (Auditorias)
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_entry_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE RESTRICT,
  minifabrica text NOT NULL DEFAULT '',
  date date NOT NULL DEFAULT CURRENT_DATE,
  observations text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'conforme', 'nao_conforme', 'parcial')),
  conformity_percentage integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT valid_conformity_percentage CHECK (conformity_percentage >= 0 AND conformity_percentage <= 100)
);

-- Create audit answers table (Respostas das Auditorias)
CREATE TABLE public.audit_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE RESTRICT,
  answer text NOT NULL DEFAULT '',
  conformity text NOT NULL DEFAULT 'na' CHECK (conformity IN ('ok', 'nok', 'na')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create audit attachments table (Anexos das Auditorias)
CREATE TABLE public.audit_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_audits_machine_id ON public.audits(machine_id);
CREATE INDEX idx_audits_employee_id ON public.audits(employee_id);
CREATE INDEX idx_audits_checklist_id ON public.audits(checklist_id);
CREATE INDEX idx_audits_date ON public.audits(date);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_audits_minifabrica ON public.audits(minifabrica);
CREATE INDEX idx_audit_answers_audit_id ON public.audit_answers(audit_id);
CREATE INDEX idx_audit_attachments_audit_id ON public.audit_attachments(audit_id);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audits table
CREATE POLICY "Authenticated users can read audits"
  ON public.audits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert audits"
  ON public.audits FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Users can update own audits"
  ON public.audits FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() OR public.has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can delete audits"
  ON public.audits FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'::app_role));

-- RLS Policies for audit_answers table
CREATE POLICY "Authenticated users can read audit answers"
  ON public.audit_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert audit answers"
  ON public.audit_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = audit_answers.audit_id
      AND audits.employee_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own audit answers"
  ON public.audit_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = audit_answers.audit_id
      AND audits.employee_id = auth.uid()
    )
  );

-- RLS Policies for audit_attachments table
CREATE POLICY "Authenticated users can read audit attachments"
  ON public.audit_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert audit attachments"
  ON public.audit_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = audit_attachments.audit_id
      AND audits.employee_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own audit attachments"
  ON public.audit_attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.audits
      WHERE audits.id = audit_attachments.audit_id
      AND audits.employee_id = auth.uid()
    )
  );

-- Trigger to update audit updated_at timestamp
CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
