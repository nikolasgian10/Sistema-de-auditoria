# 🚀 PASSO A PASSO COMPLETO - Sistema de Auditorias Mahle

**Tempo Total**: ~30 minutos
**Dificuldade**: Fácil (apenas cópiar e colar SQL)

---

## ✅ PASSO 1: Abrir SQL Editor (1 minuto)

### 1.1 Abra Supabase
Vá para: https://app.supabase.com

### 1.2 Selecione seu projeto
- Clique em seu projeto com ID: `qtscqjacxrbxbzfgtwyt`

### 1.3 Abra SQL Editor
- No menu esquerdo, clique em **SQL Editor**
- Verifique que está conectado ao projeto correto

✅ SQL Editor aberto? Próximo passo!

---

## ⚠️ IMPORTANTE - ORDEM DE EXECUÇÃO

Execute as migrations **NESTA ORDEM EXATA**:
1. `20260328125808` ← Profiles (PRÉ-EXISTENTE)
2. `20260328125821` ← Fix profiles (PRÉ-EXISTENTE)
3. `20260328205558` ← Machines/Checklists (PRÉ-EXISTENTE)
4. `20260328205611` ← Fix machines (PRÉ-EXISTENTE)
5. `20260328210000` ← Audits tables (MINHA)
6. `20260328210100` ← Schedule tables (MINHA)
7. `20260328210200` ← Storage + Buckets (MINHA)
8. `20260328210300` ← Empty data (MINHA)
9. `20260328210400` ← Views/Reports (MINHA)

---

## ✅ PASSO 2: Executar Migration 1 (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328125808_72d36d99-b817-4ea5-ae8a-07e0b87d7017.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe (Ctrl+A → Delete) e próximo!

---

## ✅ PASSO 3: Executar Migration 2 (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328125821_7d4cab12-0c6a-40fa-81e0-358a9e457228.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 4: Executar Migration 3 (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328205558_08973054-f44c-463a-983f-1fb9921808dd.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 5: Executar Migration 4 (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328205611_f546b4e7-8df7-4029-9055-102998abc03b.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 6: Executar Migration 5 - Audits (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328210000_create_audits_table.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 7: Executar Migration 6 - Schedule (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328210100_create_schedule_tables.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 8: Executar Migration 7 - Storage + Buckets (2 minutos)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328210200_create_storage_buckets.sql
```

**IMPORTANTE**: Este arquivo tem 3 linhas comentadas que CRIAM os buckets:
```sql
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audit-attachments', 'audit-attachments', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audit-reports', 'audit-reports', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('schedule-files', 'schedule-files', false);
```

**DESCOMENTE essas 3 linhas** (retire os `--`) ANTES de colar no SQL Editor

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 9: Executar Migration 8 - Dados Iniciais (1 minuto)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328210300_initial_minifabricas_data.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success"

✅ Success? Limpe e próximo!

---

## ✅ PASSO 10: Executar Migration 9 - Views/Reports (2 minutos)

Copie TODO o conteúdo de:
```
supabase/migrations/20260328210400_create_reports_views.sql
```

Cole no SQL Editor → Clique **RUN** → Aguarde "Success" (pode levar um pouco mais)

✅ Success? Próximo passo!

---

## ✅ PASSO 11: Verificar se Tudo Funcionou (2 minutos)

Execute esta query para confirmar que tudo foi criado:

```sql
SELECT COUNT(*) as total_views FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('audits_detailed', 'machine_conformity_stats', 
                   'minifabrica_conformity_stats', 'auditor_performance',
                   'conformity_trend_30days', 'critical_nonconformities',
                   'schedule_detailed', 'monthly_report_summary');
```

**Resultado esperado**: 8 (todas as views criadas)

Se retornar 8 → ✅ Tudo pronto!

---

## ✅ PASSO 12: Criar Usuários de Teste (5 minutos)

### 12.1 No SQL Editor, execute:

```sql
-- 1️⃣ CRIAR USUÁRIOS
INSERT INTO auth.users (email, raw_user_meta_data)
VALUES 
  ('auditor@mahle.com.br', '{"name":"Auditor"}'),
  ('gestor@mahle.com.br', '{"name":"Gestor"}'),
  ('diretor@mahle.com.br', '{"name":"Diretor"}');

-- 2️⃣ COPIAR OS UUIDs RETORNADOS ACIMA

-- 3️⃣ INSERIR ROLES (SUBSTITUA OS UUIDS)
INSERT INTO public.user_roles (user_id, role) VALUES
  ('COLE-UUID-AUDITOR-AQUI', 'administrativo'),
  ('COLE-UUID-GESTOR-AQUI', 'gestor'),
  ('COLE-UUID-DIRETOR-AQUI', 'diretor');

-- 4️⃣ CRIAR PROFILES (SUBSTITUA OS UUIDS)
INSERT INTO public.profiles (id, name, minifabrica) VALUES
  ('COLE-UUID-AUDITOR-AQUI', 'Auditor Sistema', NULL),
  ('COLE-UUID-GESTOR-AQUI', 'Gestor Sistema', NULL),
  ('COLE-UUID-DIRETOR-AQUI', 'Diretor Sistema', NULL);
```

**OU use Supabase UI:**
1. Authentication → Users
2. Clique **Invite**
3. Email: `auditor@mahle.com.br`
4. Repita para `gestor@mahle.com.br` e `diretor@mahle.com.br`

---

## ✅ PASSO 13: Rodar App (3 minutos)

### 13.1 Abra terminal PowerShell
```bash
cd "c:\Users\nikgi\Downloads\audit-replicate-main (1)\audit-replicate-main"
npm run dev
```

Vai aparecer: `http://localhost:5173`

### 13.2 Teste Login
- Email: `auditor@mahle.com.br`
- Password: (a que você criou)

### 13.3 Verifique
- Dashboard carrega? ✅
- Mostra "Auditorias: 0"? ✅
- Sem erros no console? ✅

---

## 🎉 **PRONTO! SISTEMA 100% OPERACIONAL!**

```
✅ 9 Migrations executadas
✅ 8 Views criadas
✅ 10 Funções operacionais
✅ 4 Triggers automáticos
✅ Storage com 3 Buckets
✅ Usuários implementados
✅ App rodando localmente
✅ Dashboard funcionando
✅ Pronto para dados reais
```

---

## 📋 RESUMO - 9 MIGRATIONS

| # | File | Cria | Status |
|---|------|------|--------|
| 1 | 20260328125808 | Profiles, Roles | PRÉ-EXISTENTE |
| 2 | 20260328125821 | Fix profiles | PRÉ-EXISTENTE |
| 3 | 20260328205558 | Machines, Checklists | PRÉ-EXISTENTE |
| 4 | 20260328205611 | Fix machines | PRÉ-EXISTENTE |
| 5 | 20260328210000 | Audits tables | MINHA |
| 6 | 20260328210100 | Schedule tables | MINHA |
| 7 | 20260328210200 | Storage + Buckets | MINHA |
| 8 | 20260328210300 | Empty data | MINHA |
| 9 | 20260328210400 | Views + Functions | MINHA |

**TEMPO TOTAL:** ~20 minutos

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Logar como **Gestor**
2. ✅ Adicionar suas **11 minifábricas** (MFASC, MFAN, MFPA, MFBA, MFBR, MFBL, FERR, MFACC, LOG, RH, QC)
3. ✅ Criar suas **máquinas** por minifábrica
4. ✅ Criar seus **checklists**
5. ✅ Treinar **auditores** 
6. ✅ Começar **auditorias reais**

---

**ESTÁ TUDO PRONTO? COMECE A AUDITAR! 🚀**
