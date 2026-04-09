# Sistema de Auditoria Mahle

## Visão Geral
O sistema é uma plataforma de auditorias industriais focada em inspeção de máquinas, checklists e geração de relatórios de conformidade. Ele integra controle de auditorias, respostas, imagens, cronograma de inspeções e dashboards de performance por auditor, máquina e minifábrica.

## Objetivo
Permitir que equipes de auditoria capturem evidências reais no campo, acompanhem o índice de conformidade das máquinas e tenham visibilidade rápida de não conformidades, performance de auditores e tendências de conformidade.

## Principais casos de uso
- Registrar auditorias por máquina com checklist estruturado
- Salvar respostas de conformidade (ok / nok / na)
- Capturar fotos e anexar evidências a cada auditoria
- Agendar auditorias e monitorar cronograma
- Visualizar relatórios e métricas de conformidade
- Acompanhar desempenho de auditores e unidades (minifábricas)

## Funcionalidades principais
- Cadastro e consulta de auditorias
- Cadastro de respostas em checklists
- Upload de fotos para o Supabase Storage
- Geração automática de status de auditoria com base nas respostas
- Visões e relatórios analíticos criados em views SQL
- Dashboard com métricas por máquina, minifábrica e auditor
- Cronograma de auditorias pendentes e concluídas
- Validação de consistência via triggers no banco

## Estrutura de dados
- `audits`: registra as auditorias realizadas
- `audit_answers`: armazena cada resposta de checklist
- `audit_attachments`: referencia fotos e anexos das auditorias
- `schedule_entries`: controla o cronograma de auditorias
- `machines`: catálogo de máquinas e minifábricas
- `checklists`: modelos de checklist usados nas inspeções
- `profiles` / `auth.users`: dados de usuários e auditores

## Módulos existentes no projeto
- `src/pages/`: interface e páginas principais do app
  - `Login.tsx`
  - `MyAudits.tsx`
  - `MobileAudit.tsx`
  - `Checklists.tsx`
  - `Schedule.tsx`
  - `Reports.tsx`
  - `Dashboard.tsx`
  - `Machines.tsx`
- `src/hooks/`: hooks de dados e integração com Supabase
  - `use-audits.ts`
  - `use-checklists.ts`
  - `use-machines.ts`
  - `use-schedule.ts`
  - `use-toast.ts`
- `supabase/migrations/`: scripts de banco de dados
  - criação de tabelas de auditoria, agenda, storage e relatórios

## Principais relatórios e views
O sistema já possui views SQL para alimentar dashboards e relatórios:
- `audits_detailed`: histórico completo de auditorias
- `machine_conformity_stats`: conformidade por máquina
- `minifabrica_conformity_stats`: conformidade por minifábrica
- `auditor_performance`: desempenho dos auditores
- `conformity_trend_30days`: tendência de conformidade dos últimos 30 dias
- `critical_nonconformities`: auditorias críticas com baixa conformidade
- `schedule_detailed`: detalhes do cronograma de auditorias
- `monthly_report_summary`: resumo mensal de auditorias

## Tecnologias utilizadas
- Frontend: React, TypeScript, Vite
- UI: Tailwind CSS, Radix UI, Recharts
- Banco de dados e backend: Supabase (PostgreSQL + Auth + Storage)
- Query Client: `@tanstack/react-query`
- Validação: `zod`
- Testes: Vitest

## Fluxo de operação
1. Usuário faz login via Supabase Auth
2. Cria ou seleciona uma máquina e um checklist
3. Realiza a auditoria preenchendo perguntas e marcando conformidade
4. Anexa fotos como evidência
5. O sistema calcula conformidade e atualiza o status automaticamente
6. Os dados alimentam relatórios e painéis em tempo real

## Valor agregado
- Transparência na gestão de auditorias
- Controle de qualidade com evidências fotográficas
- Métricas de desempenho por auditor e unidade
- Automação de cálculos de conformidade e atualizações de agenda
- Relatórios prontos para tomada de decisão

## Como apresentar
1. Explique o objetivo do sistema: auditoria industrial com checklist e foto
2. Mostre os principais módulos: auditorias, checklists, cronograma, relatórios
3. Destaque a arquitetura: app React + Supabase + Storage
4. Enfatize os relatórios e a tomada de decisão rápida
5. Aponte os benefícios: visibilidade, controle e rastreabilidade
