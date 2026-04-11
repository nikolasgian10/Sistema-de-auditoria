-- Allow unscheduled audits and add auditado fields
ALTER TABLE public.audits
  ALTER COLUMN schedule_entry_id DROP NOT NULL;

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS auditado_re text NOT NULL DEFAULT '';

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS auditado_nome text NOT NULL DEFAULT '';