-- Allow special day_of_week values for Nível 2 and Demais Níveis in schedule entries and schedule model
ALTER TABLE public.schedule_entries
  DROP CONSTRAINT IF EXISTS schedule_entries_day_of_week_check;
ALTER TABLE public.schedule_entries
  ADD CONSTRAINT schedule_entries_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 11);

ALTER TABLE public.schedule_model
  DROP CONSTRAINT IF EXISTS schedule_model_day_of_week_check;
ALTER TABLE public.schedule_model
  ADD CONSTRAINT schedule_model_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 11);
