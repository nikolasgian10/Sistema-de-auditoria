# SQL - Verificar Dados no Supabase

## 1. VERIFICAR MÁQUINAS (MACHINES)
```sql
SELECT id, name, sector, minifabrica, created_at 
FROM public.machines 
ORDER BY created_at DESC 
LIMIT 20;
```

**Espera:** Deve mostrar as máquinas que você criou com seus SETORES.

---

## 2. VERIFICAR CHECKLISTS
```sql
SELECT id, name, category, created_at 
FROM public.checklists 
ORDER BY created_at DESC 
LIMIT 20;
```

**Espera:** Deve mostrar os checklists que você criou.

---

## 3. VERIFICAR AUDITORIAS (AUDITS)
```sql
SELECT id, status, schedule_entry_id, user_id, created_at, updated_at
FROM public.audits 
ORDER BY created_at DESC 
LIMIT 20;
```

**Espera:** Deve mostrar as auditorias que você criou com fotos.

---

## 4. VERIFICAR ANEXOS DE AUDITORIA (FOTOS)
```sql
SELECT id, audit_id, file_path, file_name, file_size, created_at
FROM public.audit_attachments 
ORDER BY created_at DESC 
LIMIT 20;
```

**Espera:** Deve mostrar as fotos que você fez upload.

---

## 5. VERIFICAR MODELOS DE CRONOGRAMA (CRÍTICO!)
```sql
SELECT id, sector, minifabrica, week_index, day_of_week, checklist_id, created_at, created_by
FROM public.schedule_model 
ORDER BY sector, week_index, day_of_week
LIMIT 50;
```

**Espera:** Deve mostrar os MODELOS que você criou (semanas 1-4, dias 1-5, setores).

**Se NÃO aparecer nada → O problema é aqui! Os modelos não estão sendo salvos.**

---

## 6. VERIFICAR SEU USUÁRIO E ROLE
```sql
SELECT id, email, user_metadata, created_at
FROM auth.users 
WHERE email = 'seu_email_aqui' 
LIMIT 1;
```

**Depois execute:**
```sql
SELECT user_id, role 
FROM public.user_roles 
WHERE user_id = 'seu_user_id_aqui';
```

**Espera:** Deve mostrar se você é DIRETOR, GESTOR ou ADMINISTRATIVO.

---

## 7. VERIFICAR CRONOGRAMA GERADO (SCHEDULE_ENTRIES)
```sql
SELECT id, week_number, day_of_week, month, year, employee_id, machine_id, checklist_id, sector, status, created_at
FROM public.schedule_entries 
WHERE month = 3 AND year = 2026  -- Abril é mês 3 (zero-based)
ORDER BY week_number, day_of_week 
LIMIT 100;
```

**Espera:** Deve mostrar as entradas do cronograma geradas.

---

## 8. EXECUTAR TUDO DE UMA VEZ (Para Copiar/Colar)

```sql
-- Máquinas
SELECT COUNT(*) as máquinas_total, COUNT(DISTINCT sector) as setores_unicos FROM public.machines;

-- Checklists
SELECT COUNT(*) as checklists_total FROM public.checklists;

-- Auditorias
SELECT COUNT(*) as auditorias_total FROM public.audits;

-- Modelos
SELECT COUNT(*) as modelos_total, COUNT(DISTINCT sector) as setores_com_modelo FROM public.schedule_model;

-- Cronograma gerado
SELECT COUNT(*) as cronograma_total FROM public.schedule_entries WHERE month = 3 AND year = 2026;
```

---

## 🔴 SE OS MODELOS NÃO APARECEREM:

1. **Crie um modelo manualmente pelo SQL:**
```sql
INSERT INTO public.schedule_model (sector, minifabrica, week_index, day_of_week, checklist_id, created_by)
VALUES 
  ('SETOR_AQUI', 'Minifábrica 01', 1, 1, 'checklist_id_aqui', 'seu_user_id_aqui');
```

2. **Depois tente gerar o cronograma novamente**

---

## 📋 PASSO A PASSO:

1. Abra: https://app.supabase.com (seu projeto)
2. Vá em: SQL Editor
3. Cole O COMANDO 5 acima (SELECT modelos)
4. Clique RUN
5. Cole essa resposta aq
6. Se não aparecer modelo → precisamos salvar um via SQL
