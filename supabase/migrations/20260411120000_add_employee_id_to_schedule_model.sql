-- Add employee_id to schedule_model so the template can store the assigned auditor
ALTER TABLE public.schedule_model
  ADD COLUMN employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_schedule_model_employee_id ON public.schedule_model(employee_id);
