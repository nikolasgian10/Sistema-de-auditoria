# 🎯 Checklist Rápido de Setup - Sistema de Auditorias Mahle

## ⚡ Setup em 5 Minutos

Siga este checklist para colocar o sistema 100% pronto:

---

## PASSO 1: Preparar (2 min)
- [ ] Acesse [Supabase Dashboard](https://app.supabase.com)
- [ ] Selecione seu projeto: `qtscqjacxrbxbzfgtwyt`
- [ ] Copie suas credenciais (veja SETUP_GUIA.md Passo 1)
- [ ] Guarde em local seguro: Project URL, Anon Key, Service Key

---

## PASSO 2: Criar Buckets (1 min)
### Via Supabase Dashboard:
1. Vá para **Storage** → **Buckets**
2. Clique **New Bucket** 3 vezes e crie:
   - ✅ `audit-attachments` (privado)
   - ✅ `audit-reports` (privado)
   - ✅ `schedule-files` (privado)

### Ou execute no SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audit-attachments', 'audit-attachments', false),
  ('audit-reports', 'audit-reports', false),
  ('schedule-files', 'schedule-files', false);
```

---

## PASSO 3: Executar Migrations (1 min)

### Via SQL Editor (Mais Fácil):
1. Vá para **SQL Editor** no Supabase Dashboard
2. Para cada arquivo abaixo, copie e execute:

#### **1️⃣ Auditorias** → Copie de:
`supabase/migrations/20260328210000_create_audits_table.sql`

#### **2️⃣ Cronograma** → Copie de:
`supabase/migrations/20260328210100_create_schedule_tables.sql`

#### **3️⃣ Storage RLS** → Copie de:
`supabase/migrations/20260328210200_create_storage_buckets.sql`

#### **4️⃣ Estrutura Pronta** → Copie de:
`supabase/migrations/20260328210300_initial_minifabricas_data.sql`
- Confirma que tabelas estão vazias
- Você adiciona minifábricas/máquinas via app

#### **5️⃣ Views e Relatórios** → Copie de:
`supabase/migrations/20260328210400_create_reports_views.sql`

---

## PASSO 4: Verificar (1 min)

Execute no SQL Editor:

```sql
-- Verificar tudo foi criado
SELECT COUNT(*) as tabelas_criadas FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN 
('audits', 'audit_answers', 'schedule_entries', 'machines', 'checklists');

SELECT COUNT(*) as maquinas FROM public.machines;
SELECT COUNT(*) as checklists FROM public.checklists;
```

Esperado:
- ✅ 5 tabelas criadas
- ✅ 10+ máquinas
- ✅ 8+ checklists

---

## PASSO 5: Testar Localmente (1 min)

```bash
# Terminal
cd "c:\Users\nikgi\Downloads\audit-replicate-main (1)\audit-replicate-main"

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Abrir em http://localhost:5173
```

### Testes Rápidos:
- ✅ Faça login com email test@example.com
- ✅ Dashboard carrega sem erros
- ✅ Vê lista de máquinas
- ✅ Vê checklists disponíveis

---

## 📁 Arquivos Criados

Você agora tem:

### Migrations SQL (5 arquivos):
```
supabase/migrations/
├── 20260328210000_create_audits_table.sql ✅ (tabelas de auditoria)
├── 20260328210100_create_schedule_tables.sql ✅ (tabelas de cronograma)
├── 20260328210200_create_storage_buckets.sql ✅ (configuração de storage)
├── 20260328210300_initial_minifabricas_data.sql ✅ (dados iniciais)
└── 20260328210400_create_reports_views.sql ✅ (views para relatórios)
```

### Guias de Configuração (3 arquivos):
```
├── SETUP_GUIA.md ✅ (guia completo com tudo)
├── INTEGRACAO_VIEWS.md ✅ (como usar as views em React)
└── CHECKLIST_SETUP.md ✅ (este arquivo!)
```

---

## 🎓 Próximas Etapas (Após Setup)

1. **Criar Usuários** (5 min)
   - Email: auditor1@mahle.com.br
   - Email: gestor@mahle.com.br
   - Email: diretor@mahle.com.br
   - Atribuir papéis no Supabase

2. **Criar Cronograma** (10 min)
   - Vá para "Cronograma" no app
   - Gere para o mês atual
   - Atribua auditores às máquinas

3. **Executar Primeira Auditoria** (15 min)
   - Vá para "Auditorias"
   - Selecione um cronograma
   - Responda o checklist
   - Veja resultado no Dashboard

4. **Visualizar Relatórios** (5 min)
   - Vá para "Relatórios"
   - Veja estatísticas em tempo real
   - Exporte PDF

5. **Integrar com Código React** (1h)
   - Use hooks das Views (veja INTEGRACAO_VIEWS.md)
   - Atualizar componentes
   - Testar com dados reais

---

## 🚨 Se Algo Der Erro

### Erro: "relation does not exist"
→ Execute a migration correspondente no SQL Editor

### Erro: "403 Forbidden" no app
→ Verifique se está logado, limpe cache (Ctrl+Shift+Del)

### Bucket já existe
→ Pode ignorar, já está criado

### Dashboard vazio
→ Crie dados primeiro (máquinas, checklists, cronograma)

---

## 📞 Referências Rápidas

| Material | Onde | O Quê |
|----------|------|--------|
| **SETUP_GUIA.md** | Este repo | Guia completo detalhado |
| **INTEGRACAO_VIEWS.md** | Este repo | Como usar Views em React |
| **Supabase Dashboard** | https://app.supabase.com | Gerenciar banco |
| **SQL Editor** | Dashboard → SQL Editor | Executar SQL |
| **Seu Projeto** | https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt | Seu projeto |

---

## ✨ Resumo: O que o Sistema Tem Agora

### Tabelas Base:
- ✅ `audits` - Registros de auditorias
- ✅ `audit_answers` - Respostas dos checklists
- ✅ `audit_attachments` - Fotos e documentos
- ✅ `schedule_entries` - Cronograma de auditorias
- ✅ `schedule_model` - Modelos reutilizáveis
- ✅ `auditor_rotation` - Rotação de auditores

### Storage Buckets:
- ✅ `audit-attachments` - 10GB para fotos
- ✅ `audit-reports` - 10GB para PDFs
- ✅ `schedule-files` - 10GB para arquivos

### Views para Relatórios:
- ✅ `audits_detailed` - Auditorias com tudo
- ✅ `machine_conformity_stats` - Conformidade por máquina
- ✅ `minifabrica_conformity_stats` - Resumo por minifábrica
- ✅ `auditor_performance` - Performance de auditores
- ✅ `conformity_trend_30days` - Tendência
- ✅ `critical_nonconformities` - Alertas críticos

### Dados Iniciais:
- ✅ Tabelas vazias e prontas
- ✅ Nenhum dado fictício
- ✅ Aguardando migração para dados reais da Mahle

---

## 🎉 Fim do Setup!

Se completou todos os passos, seu sistema está **100% pronto**!

**Próximo passo**: Comece a criar auditorias reais e veja tudo funcionando em tempo real.

---

**Dúvidas?** Veja SETUP_GUIA.md para mais detalhes!
