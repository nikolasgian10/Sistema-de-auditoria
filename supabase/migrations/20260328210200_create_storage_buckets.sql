-- Storage Configuration SQL Script
-- Execute this manually in the Supabase SQL Editor AFTER creating the buckets

-- Create audit_attachments bucket (Anexos de Auditorias)
-- This bucket stores photos and documents from audits
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-attachments', 'audit-attachments', false);

-- Create audit_reports bucket (Relatórios de Auditorias)
-- This bucket stores generated PDF reports
INSERT INTO storage.buckets (id, name, public) VALUES ('audit-reports', 'audit-reports', false);

-- Create schedule_files bucket (Arquivos de Cronograma)
-- This bucket stores schedule-related files and exports
INSERT INTO storage.buckets (id, name, public) VALUES ('schedule-files', 'schedule-files', false);

-- RLS Policies for audit_attachments bucket
-- Create audit_attachments bucket policy
CREATE POLICY "Authenticated users can upload audit attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-attachments' AND
    auth.uid() = owner
  );

CREATE POLICY "Authenticated users can read audit attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-attachments');

CREATE POLICY "Users can delete own audit attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'audit-attachments' AND
    auth.uid() = owner
  );

-- RLS Policies for audit_reports bucket
CREATE POLICY "Gestors can upload audit reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-reports' AND
    auth.uid() = owner
  );

CREATE POLICY "Authenticated users can read audit reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-reports');

CREATE POLICY "Gestors can delete audit reports"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'audit-reports' AND
    auth.uid() = owner
  );

-- RLS Policies for schedule_files bucket
CREATE POLICY "Gestors can upload schedule files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'schedule-files' AND
    auth.uid() = owner
  );

CREATE POLICY "Authenticated users can read schedule files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'schedule-files');

CREATE POLICY "Gestors can delete schedule files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'schedule-files' AND
    auth.uid() = owner
  );
