-- Script de Restauração: Remove Dados Mockup e Reinicia o Sistema
-- ⚠️ CUIDADO: Este script limpa TODOS os dados de testes
-- ✅ Use apenas após backup completo

-- ============================================================================
-- NÃO EXECUTE ESTE ARQUIVO NO SQL EDITOR DO SUPABASE
-- Este é apenas um REFERÊNCIA para limpeza manual se necessário
-- ============================================================================

-- Se você deseja LIMPAR dados de teste e recomeçar:

-- 1. BACKUP seus dados importantes PRIMEIRO!
-- 2. Faça login em https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt

-- 3. Vá para SQL Editor e execute SEPARADAMENTE:

-- ============================================================================
-- OPÇÃO 1: Limpar Apenas Auditorias (Mantém Machines e Checklists)
-- ============================================================================
-- DELETE FROM public.audit_attachments;
-- DELETE FROM public.audit_answers;
-- DELETE FROM public.audits;
-- TRUNCATE public.audits RESTART IDENTITY;

-- ============================================================================
-- OPÇÃO 2: Limpar Apenas Cronogramas
-- ============================================================================
-- DELETE FROM public.schedule_entries;
-- DELETE FROM public.schedule_assignments;
-- DELETE FROM public.auditor_rotation;

-- ============================================================================
-- OPÇÃO 3: Limpar Tudo EXCETO Máquinas e Checklists
-- ============================================================================
-- DELETE FROM public.audit_attachments;
-- DELETE FROM public.audit_answers;
-- DELETE FROM public.audits;
-- DELETE FROM public.schedule_entries;
-- DELETE FROM public.schedule_assignments;
-- DELETE FROM public.schedule_model;
-- DELETE FROM public.auditor_rotation;

-- Resultado:
-- ✅ Machines (máquinas) - MANTIDAS
-- ✅ Checklists (checklists de auditoria) - MANTIDAS  
-- ✅ Checklist Items - MANTIDAS
-- ❌ Auditorias - DELETADAS
-- ❌ Cronogramas - DELETADOS
-- ❌ Dados de Teste - DELETADOS

-- ============================================================================
-- OPÇÃO 4: Reset Completo (Reinicia tudo ao estado inicial)
-- ============================================================================
-- -- Deletar Views primeiro (elas dependem de tabelas)
-- DROP VIEW IF EXISTS public.critical_nonconformities CASCADE;
-- DROP VIEW IF EXISTS public.conformity_trend_30days CASCADE;
-- DROP VIEW IF EXISTS public.auditor_performance CASCADE;
-- DROP VIEW IF EXISTS public.minifabrica_conformity_stats CASCADE;
-- DROP VIEW IF EXISTS public.machine_conformity_stats CASCADE;
-- DROP VIEW IF EXISTS public.schedule_detailed CASCADE;
-- DROP VIEW IF EXISTS public.audits_detailed CASCADE;

-- -- Deletar tabelas
-- DELETE FROM public.audit_attachments;
-- DELETE FROM public.audit_answers;
-- DELETE FROM public.audits;
-- DELETE FROM public.schedule_entries;
-- DELETE FROM public.schedule_assignments;
-- DELETE FROM public.schedule_model;
-- DELETE FROM public.auditor_rotation;
-- DELETE FROM public.checklist_items;
-- DELETE FROM public.checklists;
-- DELETE FROM public.machines;

-- Depois execute a migration 20260328210400_create_reports_views.sql novamente
-- Depois execute a migration 20260328210300_initial_minifabricas_data.sql novamente

-- ============================================================================
-- Para NOVO INÍCIO sem dados mockup no localStorage:
-- ============================================================================
-- No navegador, abra o Console (F12) e execute:
/*
localStorage.removeItem('lpa_machines');
localStorage.removeItem('lpa_checklists');
localStorage.removeItem('lpa_schedule');
localStorage.removeItem('lpa_audits');
localStorage.removeItem('lpa_schedule_model');
localStorage.removeItem('lpa_auditor_order_*');
localStorage.removeItem('lpa_auditor_matrix_*');
localStorage.removeItem('lpa_week_templates_*');
localStorage.removeItem('lpa_schedule_locations_*');
localStorage.removeItem('lpa_location_pattern_*');
window.location.reload();
*/

-- ============================================================================
-- VERIFICAÇÕES ÚTEIS
-- ============================================================================

-- Ver quantos registros tem em cada tabela
-- SELECT 
--   'audits' as table_name, COUNT(*) as count FROM public.audits
-- UNION ALL
-- SELECT 'audit_answers', COUNT(*) FROM public.audit_answers
-- UNION ALL
-- SELECT 'audit_attachments', COUNT(*) FROM public.audit_attachments
-- UNION ALL
-- SELECT 'schedule_entries', COUNT(*) FROM public.schedule_entries
-- UNION ALL
-- SELECT 'machines', COUNT(*) FROM public.machines
-- UNION ALL
-- SELECT 'checklists', COUNT(*) FROM public.checklists;

-- Ver auditorias mais recentes
-- SELECT id, machine_id, date, status, conformity_percentage
-- FROM public.audits
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Ver cronogramas pendentes
-- SELECT id, employee_id, machine_id, status, scheduled_date
-- FROM public.schedule_entries
-- WHERE status = 'pending'
-- ORDER BY scheduled_date ASC
-- LIMIT 20;

-- Ver máquinas cadastradas
-- SELECT name, code, minifabrica, sector FROM public.machines;

-- Ver checklists disponíveis
-- SELECT name, category, minifabrica FROM public.checklists;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Este sistema foi projetado para:
-- ✅ Trabalhar com dados REAIS do Supabase (não localStorage)
-- ✅ Ser 100% funcional em produção
-- ✅ Calcular conformidade automaticamente
-- ✅ Gerar relatórios em tempo real
-- 
-- Os dados mockup do localStorage foram removidos para evitar confusão
-- Agora TODO dado vem do Supabase banco de dados
-- ============================================================================
