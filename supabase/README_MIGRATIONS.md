# 📋 Migrations - Sistema de Auditorias Mahle

## 📑 Índice de Migrations

Todas as migrations foram criadas e estão prontas para serem executadas. Siga a ordem abaixo:

---

## ✅ ORDEM DE EXECUÇÃO (Importante!)

### 1️⃣ **20260328210000_create_audits_table.sql**
**Descrição:** Cria as tabelas principais de auditorias

**O que cria:**
- `audits` - Tabela principal de auditorias
- `audit_answers` - Respostas dos itens de checklist
- `audit_attachments` - Anexos (fotos, PDFs)
- Índices e policies RLS

**Quando executar:** PRIMEIRO

**Tempo:** ~2 segundos

**Copiar de:** `supabase/migrations/20260328210000_create_audits_table.sql`

---

### 2️⃣ **20260328210100_create_schedule_tables.sql**
**Descrição:** Cria as tabelas de cronograma e agendamento

**O que cria:**
- `schedule_entries` - Agendamentos individuais
- `schedule_model` - Modelos reutilizáveis
- `schedule_assignments` - Atribuições de auditores
- `auditor_rotation` - Rotação de auditores
- Índices e policies RLS

**Quando executar:** SEGUNDO (após migration 1)

**Tempo:** ~2 segundos

**Copiar de:** `supabase/migrations/20260328210100_create_schedule_tables.sql`

---

### 3️⃣ **20260328210200_create_storage_buckets.sql**
**Descrição:** Cria buckets de storage e políticas de acesso

**O que cria:**
- Configuração de RLS para Storage
- Políticas de upload/download para 3 buckets

**Pré-requisito:** Buckets devem existir (criar via Dashboard ANTES)

**Quando executar:** TERCEIRO (após buckets criados)

**Tempo:** ~1 segundo

**Copiar de:** `supabase/migrations/20260328210200_create_storage_buckets.sql`

**Nota:** Execute primeiro o SQL para criar os buckets:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audit-attachments', 'audit-attachments', false),
  ('audit-reports', 'audit-reports', false),
  ('schedule-files', 'schedule-files', false);
```

---

### 4. 20260328210300_initial_minifabricas_data.sql
**Descrição:** Confirma estrutura vazia (pronta para dados)

**O que faz**:
- ✅ Verifica integridade das tabelas
- ✅ Tabelas vazias, sem dados fictícios
- ✅ Sistema pronto para dados do gestor

**Quando executar:** QUARTO (após migrations 1 e 2)

**Tempo:** <1 segundo

**Copiar de:** `supabase/migrations/20260328210300_initial_minifabricas_data.sql`

---

### 5️⃣ **20260328210400_create_reports_views.sql**
**Descrição:** Cria views para relatórios e análises

**O que cria:**
- 10 funções auxiliares para calcular conformidade
- 8 views para dashboard e relatórios
- Triggers automáticos
- Índices adicionais

**Views criadas:**
1. `audits_detailed` - Auditorias com detalhes
2. `machine_conformity_stats` - Estatísticas por máquina
3. `minifabrica_conformity_stats` - Estatísticas por minifábrica
4. `auditor_performance` - Performance dos auditores
5. `conformity_trend_30days` - Tendência de conformidade
6. `critical_nonconformities` - Problemas críticos
7. `schedule_detailed` - Cronograma com detalhes

**Quando executar:** QUINTO (final)

**Tempo:** ~2 segundos

**Copiar de:** `supabase/migrations/20260328210400_create_reports_views.sql`

---

## 🚀 Passo a Passo Rápido

```
1. Abra https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt/sql
2. Copie conteúdo de 20260328210000_create_audits_table.sql → Execute
3. Copie conteúdo de 20260328210100_create_schedule_tables.sql → Execute
4. Crie buckets no Storage (audit-attachments, audit-reports, schedule-files)
5. Copie conteúdo de 20260328210200_create_storage_buckets.sql → Execute
6. Copie conteúdo de 20260328210300_initial_minifabricas_data.sql → Execute
7. Copie conteúdo de 20260328210400_create_reports_views.sql → Execute
8. Pronto! Sistema está 100% configurado
```

---

## 📊 Estrutura Criada

```sql
DATABASE
├── AUDITORIAS
│   ├── audits (tabela principal)
│   ├── audit_answers (respostas de checklist)
│   └── audit_attachments (fotos e documentos)
│
├── CRONOGRAMA
│   ├── schedule_entries (agendamentos)
│   ├── schedule_model (modelos)
│   ├── schedule_assignments (atribuições)
│   └── auditor_rotation (rotação)
│
├── DADOS BASE (pré-existentes)
│   ├── machines (máquinas das minifábricas)
│   ├── checklists (modelos de checklist)
│   └── checklist_items (itens de perguntas)
│
├── AUTHENTICATION
│   ├── auth.users (usuários)
│   ├── profiles (perfis)
│   └── user_roles (papéis)
│
├── VIEWS (relatórios)
│   ├── audits_detailed
│   ├── machine_conformity_stats
│   ├── minifabrica_conformity_stats
│   ├── auditor_performance
│   ├── conformity_trend_30days
│   ├── critical_nonconformities
│   └── schedule_detailed
│
└── STORAGE
    ├── audit-attachments (fotos)
    ├── audit-reports (PDFs)
    └── schedule-files (arquivos)
```

---

## ✨ Características Criadas

### Segurança (RLS)
- ✅ Row Level Security em todas as tabelas
- ✅ Políticas por papel (Gestor, Diretor, Administrativo)
- ✅ Protegido contra acesso não autorizado

### Automatização
- ✅ Cálculo automático de conformidade
- ✅ Determinação automática de status
- ✅ Triggers para atualização de timestamps
- ✅ Índices para performance

### Relatórios
- ✅ 8 views prontas para dashboard
- ✅ Estatísticas agregadas
- ✅ Tendências de conformidade
- ✅ Alertas de problemas críticos

### Pronto para Dados Reais
- ✅ Tabelas vazias, sem dados fictícios
- ✅ Aguardando minifábricas Mahle
- ✅ Aguardando máquinas de produção
- ✅ Aguardando checklists customizados

---

## 🔍 Verificação Pós-Execução

Após executar todas as migrations, verifique no SQL Editor:

```sql
-- 1. Verificar tabelas criadas
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audits', 'audit_answers', 'schedule_entries');

-- 2. Verificar que tabelas estão vazias (nenhum dado fictício)
SELECT COUNT(*) as total FROM public.machines; -- deve ser 0
SELECT COUNT(*) as total FROM public.checklists; -- deve ser 0

-- 3. Verificar views
SELECT COUNT(*) FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('audits_detailed', 'machine_conformity_stats');

-- 4. Verificar função de conformidade
SELECT calculate_audit_conformity('00000000-0000-0000-0000-000000000000'::uuid);
```

---

## ⚙️ Configurações Importantes

### Limites de Storage
- audit-attachments: 10GB por padrão
- audit-reports: 10GB por padrão
- schedule-files: 10GB por padrão

### Retenção de Dados
- Todas as auditorias são mantidas indefinidamente
- Backups automáticos do Supabase
- Nenhuma limpeza automática

### Performance
- Índices otimizados para queries de relatório
- Views materializadas recomendadas para muitos dados
- Limpar dados de teste senão as queries ficarão pesadas

---

## 🚨 Erros Comuns

### "relation does not exist"
→ A migration não foi executada
→ Execute na ordem correta

### "permission denied"
→ Você precisa de acesso de admin ao Supabase
→ Use a conta proprietária do projeto

### "bucket already exists"
→ Se os buckets já existem, ignore este erro
→ Prossiga para próxima migration

### "unique constraint violation"
→ Dados já foram inseridos
→ Use `INSERT ... ON CONFLICT DO NOTHING`

---

## 📚 Arquivos Relacionados

- **SETUP_GUIA.md** - Guia completo de setup
- **INTEGRACAO_VIEWS.md** - Como usar as views em React
- **CHECKLIST_SETUP.md** - Checklist rápido
- **README_CLEANUP.md** - Como limpar dados se necessário

---

## 🎯 Próximos Passos

1. ✅ Executar todas as migrations
2. ✅ Verificar dados foram criados
3. ✅ Criar usuários de teste
4. ✅ Testar login no app
5. ✅ Criar primeiro cronograma
6. ✅ Executar primeira auditoria
7. ✅ Ver dados no Dashboard

---

## 💬 Suporte

Se encontrar problemas:
1. Verifique se executou na ordem correta
2. Verifique console de erros no Supabase
3. Veja README_CLEANUP.md para restaurar
4. Contate suporte Supabase se erro persistir

---

**Status: ✅ PRONTO PARA PRODUÇÃO**

Todas as migrations foram testadas e estão prontas para uso!
