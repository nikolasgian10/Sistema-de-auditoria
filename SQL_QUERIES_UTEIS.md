-- SQL Queries Úteis para Relatórios e Análises
-- Use estas queries no SQL Editor do Supabase para gerar relatórios customizados

-- ============================================================================
-- 📊 Dashboard QUERIES
-- ============================================================================

-- 1. Resumo Geral do Sistema
SELECT 
  (SELECT COUNT(*) FROM public.audits) as total_auditorias,
  (SELECT COUNT(*) FROM public.machines) as total_maquinas,
  (SELECT COUNT(*) FROM public.checklists) as total_checklists,
  (SELECT COUNT(DISTINCT minifabrica) FROM public.machines) as total_minifabricas,
  (SELECT COUNT(*) FROM public.schedule_entries WHERE status = 'pending') as agendamentos_pendentes,
  (SELECT COUNT(*) FROM public.schedule_entries WHERE status = 'completed') as agendamentos_completos;

-- ============================================================================
-- 🎯 CONFORMIDADE QUERIES
-- ============================================================================

-- 2. Conformidade Geral (Última 30 Dias)
SELECT 
  COUNT(*) as total_auditorias,
  ROUND(AVG(conformity_percentage)) as conformidade_media,
  SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) as conformes,
  SUM(CASE WHEN status = 'nao_conforme' THEN 1 ELSE 0 END) as nao_conformes,
  SUM(CASE WHEN status = 'parcial' THEN 1 ELSE 0 END) as parciais
FROM public.audits_detailed
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- 3. Conformidade por Minifábrica
SELECT 
  minifabrica,
  COUNT(*) as total_auditorias,
  ROUND(AVG(conformity_percentage)) as conformidade_media,
  MAX(date) as ultima_auditoria
FROM public.audits_detailed
WHERE status IS NOT NULL
GROUP BY minifabrica
ORDER BY conformidade_media DESC;

-- 4. Máquinas com Pior Desempenho
SELECT 
  machine_name,
  machine_code,
  sector,
  minifabrica,
  ROUND(avg_conformity) as conformidade_media,
  total_audits,
  non_conforming_count
FROM public.machine_conformity_stats
ORDER BY avg_conformity ASC
LIMIT 10;

-- 5. Máquinas com Melhor Desempenho
SELECT 
  machine_name,
  machine_code,
  sector,
  minifabrica,
  ROUND(avg_conformity) as conformidade_media,
  total_audits
FROM public.machine_conformity_stats
WHERE total_audits >= 5
ORDER BY avg_conformity DESC
LIMIT 10;

-- ============================================================================
-- 👥 PERFORMANCE DE AUDITORES
-- ============================================================================

-- 6. Ranking de Auditores por Conformidade
SELECT 
  auditor_name,
  minifabrica,
  total_audits,
  ROUND(avg_conformity) as conformidade_media,
  conforming_audits,
  non_conforming_audits,
  machines_audited,
  MAX(last_audit) as ultima_auditoria
FROM public.auditor_performance
GROUP BY auditor_name, minifabrica, total_audits, avg_conformity, 
         conforming_audits, non_conforming_audits, machines_audited, last_audit
ORDER BY avg_conformity DESC;

-- 7. Auditores Mais Ativos
SELECT 
  auditor_name,
  minifabrica,
  total_audits,
  COUNT(DISTINCT machines_audited) as setores_auditados,
  last_audit
FROM public.auditor_performance
ORDER BY total_audits DESC;

-- ============================================================================
-- 🚨 PROBLEMAS CRÍTICOS
-- ============================================================================

-- 8. Top 10 Não Conformidades Recentes
SELECT 
  date,
  machine_name,
  minifabrica,
  auditor_name,
  conformity_percentage,
  issues,
  issue_count
FROM public.critical_nonconformities
LIMIT 10;

-- 9. Máquinas com Não Conformidade Recorrente
SELECT 
  machine_name,
  machine_code,
  minifabrica,
  COUNT(*) as vezes_nao_conforme,
  ROUND(AVG(conformity_percentage)) as conformidade_media,
  MAX(date) as ultima_ocorrencia
FROM public.critical_nonconformities
GROUP BY machine_name, machine_code, minifabrica
HAVING COUNT(*) >= 3
ORDER BY COUNT(*) DESC;

-- 10. Problemas Não Resolvidos (Mais de 7 Dias)
SELECT 
  machine_name,
  minifabrica,
  date,
  CURRENT_DATE - date as dias_sem_resolver,
  conformity_percentage,
  issues
FROM public.critical_nonconformities
WHERE date <= CURRENT_DATE - INTERVAL '7 days'
  AND status IN ('nao_conforme', 'parcial')
ORDER BY dias_sem_resolver DESC;

-- ============================================================================
-- 📈 TENDÊNCIAS E GRÁFICOS
-- ============================================================================

-- 11. Tendência de Conformidade - Últimas 30 Dias
SELECT 
  audit_date,
  minifabrica,
  audits_count,
  ROUND(avg_conformity) as conformidade_media,
  conforming,
  non_conforming,
  partial
FROM public.conformity_trend_30days
WHERE minifabrica = 'Minifábrica A'  -- altere minifábrica
ORDER BY audit_date DESC;

-- 12. Evolução de Conformidade por Semana
SELECT 
  DATE_TRUNC('week', date) as semana,
  minifabrica,
  COUNT(*) as auditorias,
  ROUND(AVG(conformity_percentage)) as conformidade_media,
  SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) as conformes
FROM public.audits_detailed
WHERE date >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', date), minifabrica
ORDER BY semana DESC;

-- ============================================================================
-- 📅 CRONOGRAMA E AGENDAMENTO
-- ============================================================================

-- 13. Cronograma Pendente para Próximos 7 Dias
SELECT 
  auditor_name,
  machine_name,
  sector,
  effective_date,
  checklist_name,
  status
FROM public.schedule_detailed
WHERE effective_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND status = 'pending'
ORDER BY effective_date ASC;

-- 14. Taxa de Conclusão de Cronograma (por mês)
SELECT 
  year,
  month,
  COUNT(*) as total_agendado,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completados,
  SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as perdidos,
  ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*)) as taxa_conclusao
FROM public.schedule_entries
GROUP BY year, month
ORDER BY year DESC, month DESC;

-- ============================================================================
-- 🔍 ANÁLISES DETALHADAS
-- ============================================================================

-- 15. Análise de Respostas por Questão
SELECT 
  ci.question,
  COUNT(*) as total_respostas,
  SUM(CASE WHEN aa.conformity = 'ok' THEN 1 ELSE 0 END) as conformes,
  SUM(CASE WHEN aa.conformity = 'nok' THEN 1 ELSE 0 END) as nao_conformes,
  ROUND(100.0 * SUM(CASE WHEN aa.conformity = 'ok' THEN 1 ELSE 0 END) / COUNT(*)) as taxa_conformidade
FROM public.audit_answers aa
LEFT JOIN public.checklist_items ci ON aa.checklist_item_id = ci.id
WHERE aa.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ci.question
ORDER BY taxa_conformidade ASC;

-- 16. Problemas Mais Frequentes
SELECT 
  ci.question,
  cc.category,
  COUNT(*) as ocorrencias,
  COUNT(DISTINCT ad.machine_id) as maquinas_afetadas,
  COUNT(DISTINCT ad.auditor_name) as auditores_encontraram
FROM public.audit_answers aa
LEFT JOIN public.checklist_items ci ON aa.checklist_item_id = ci.id
LEFT JOIN public.checklists cc ON ci.checklist_id = cc.id
LEFT JOIN public.audits_detailed ad ON aa.audit_id = ad.id
WHERE aa.conformity = 'nok'
  AND aa.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ci.question, cc.category
ORDER BY ocorrencias DESC
LIMIT 15;

-- ============================================================================
-- 📋 EXPORTAÇÃO DE DADOS
-- ============================================================================

-- 17. Exportar Todas as Auditorias (para Excel)
SELECT 
  ad.date,
  ad.machine_name,
  ad.sector,
  ad.minifabrica,
  ad.auditor_name,
  ad.checklist_name,
  ad.status,
  ad.conformity_percentage,
  ad.observations,
  ad.created_at
FROM public.audits_detailed ad
WHERE ad.date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY ad.date DESC;

-- 18. Exportar Respostas Detalhadas de Última Auditoria
SELECT 
  a.id as audit_id,
  a.date,
  m.name as maquina,
  ci.question,
  aa.answer,
  aa.conformity,
  aa.created_at
FROM public.audits a
LEFT JOIN public.machines m ON a.machine_id = m.id
LEFT JOIN public.audit_answers aa ON a.id = aa.audit_id
LEFT JOIN public.checklist_items ci ON aa.checklist_item_id = ci.id
WHERE a.date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.date DESC, ci.sort_order ASC;

-- ============================================================================
-- 🎯 METAS E KPIs
-- ============================================================================

-- 19. Progresso em Relação a Meta (90% conformidade)
SELECT 
  minifabrica,
  90 as meta_conformidade,
  ROUND(AVG(conformity_percentage)) as conformidade_atual,
  CASE 
    WHEN AVG(conformity_percentage) >= 90 THEN '✅ META ATINGIDA'
    WHEN AVG(conformity_percentage) >= 80 THEN '⚠️ PRÓXIMO DA META'
    ELSE '❌ ABAIXO DA META'
  END as status_meta
FROM public.audits_detailed
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY minifabrica;

-- 20. KPI Dashboard Mensal
SELECT 
  MIN(date) as periodo_inicio,
  MAX(date) as periodo_fim,
  COUNT(*) as total_auditorias,
  COUNT(DISTINCT machine_id) as maquinas_auditadas,
  COUNT(DISTINCT auditor_name) as auditores_ativos,
  COUNT(DISTINCT minifabrica) as minifabricas_auditadas,
  ROUND(AVG(conformity_percentage)) as conformidade_media,
  SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) as total_conformes,
  SUM(CASE WHEN status = 'nao_conforme' THEN 1 ELSE 0 END) as total_nao_conformes,
  ROUND(100.0 * SUM(CASE WHEN status = 'conforme' THEN 1 ELSE 0 END) / COUNT(*)) as taxa_conformidade_geral
FROM public.audits_detailed
WHERE date >= DATE_TRUNC('month', CURRENT_DATE);

-- ============================================================================
-- 💡 QUERIES ÚTEIS PARA MANUTENÇÃO
-- ============================================================================

-- 21. Verificar Integridade de Dados
SELECT 
  'Auditorias sem respostas' as problema,
  COUNT(*) as quantidade
FROM public.audits a
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_answers 
  WHERE audit_id = a.id
)
UNION ALL
SELECT 'Cronogramas sem máquina', COUNT(*)
FROM public.schedule_entries 
WHERE machine_id IS NULL
UNION ALL
SELECT 'Respostas órfãs', COUNT(*)
FROM public.audit_answers aa
WHERE NOT EXISTS (
  SELECT 1 FROM public.audits WHERE id = aa.audit_id
);

-- 22. Uso de Storage (em GB)
SELECT 
  'Total de anexos' as tipo,
  COUNT(*) as quantidade,
  ROUND(SUM(file_size) / 1024.0 / 1024.0 / 1024.0, 2) as gb_usados
FROM public.audit_attachments;

-- 23. Máquinas Sem Auditoria Recente (>30 dias)
SELECT 
  m.name,
  m.code,
  m.minifabrica,
  MAX(a.date) as ultima_auditoria,
  CURRENT_DATE - MAX(a.date) as dias_sem_auditoria
FROM public.machines m
LEFT JOIN public.audits a ON m.id = a.machine_id
GROUP BY m.id, m.name, m.code, m.minifabrica
HAVING MAX(a.date) < CURRENT_DATE - INTERVAL '30 days'
  OR MAX(a.date) IS NULL
ORDER BY dias_sem_auditoria DESC;

-- ============================================================================
-- 🎨 DADOS PARA GRÁFICOS
-- ============================================================================

-- 24. Dados para Pie Chart - Distribuição de Status
SELECT 
  status,
  COUNT(*) as quantidade,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()) as percentual
FROM public.audits_detailed
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status;

-- 25. Dados para Line Chart - Conformidade por Dia
SELECT 
  date,
  ROUND(AVG(conformity_percentage)) as conformidade,
  COUNT(*) as auditorias
FROM public.audits_detailed
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date ASC;

-- 26. Dados para Bar Chart - Top 10 Máquinas
SELECT 
  machine_name,
  total_audits,
  ROUND(avg_conformity) as conformidade
FROM public.machine_conformity_stats
ORDER BY avg_conformity DESC
LIMIT 10;

-- ============================================================================
-- DICAS:
-- - Use LIMIT para evitar muito retorno de dados
-- - Use DATE para filtrar períodos específicos
-- - Use ROUND para limpar números decimais
-- - Altere 'Minifábrica A' para seu valor específico
-- - Copie queries para Excel para análises adicionais
-- ============================================================================
