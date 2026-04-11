-- Add level field to checklists so each checklist can be classified as Nível 1, Nível 2 or Outros Níveis.
ALTER TABLE public.checklists
  ADD COLUMN level text NOT NULL DEFAULT '1';
