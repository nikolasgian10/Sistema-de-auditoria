# 💾 SQL Pronto para Copiar e Colar

Use esses comandos no **Supabase SQL Editor** para testar.

---

## 🪣 PASSO 1: Criar Bucket (se não existir)

Vá em **Storage** > **New Bucket**:
- Nome: `audit-photos`
- Public: ✅ Marcado

---

## 🔐 PASSO 2: Criar RLS Policies

Copie e cole tudo isso no SQL Editor e execute:

```sql
-- RLS Policies para bucket audit-photos
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audit-photos');

CREATE POLICY "Authenticated users can read photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-photos');

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audit-photos');
```

---

## ✅ PASSO 3: Verificar Bucket

Execute para confirmar que o bucket foi criado corretamente:

```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'audit-photos';
```

**Esperado:**
```
id          | name         | public
------------|--------------|-------
audit-photos| audit-photos | true
```

---

## 📊 PASSO 4: Ver Dados Já Salvos

### Ver todas as auditoria feitas:
```sql
SELECT 
  id, 
  employee_id, 
  machine_id, 
  checklist_id, 
  observations, 
  status,
  created_at
FROM audits 
ORDER BY created_at DESC 
LIMIT 20;
```

### Ver respostas de um checklist em uma auditoria:
```sql
SELECT 
  aa.id,
  aa.audit_id,
  aa.checklist_item_id,
  aa.answer,
  aa.conformity
FROM audit_answers aa
WHERE aa.audit_id = 'COLE_O_AUDIT_ID_AQUI'
ORDER BY aa.created_at;
```

### Ver fotos de uma auditoria:
```sql
SELECT 
  id,
  audit_id,
  file_path,
  file_name,
  file_size,
  created_at
FROM audit_attachments
WHERE audit_id = 'COLE_O_AUDIT_ID_AQUI';
```

### Ver TODAS as fotos salvas:
```sql
SELECT 
  id,
  audit_id,
  file_path,
  file_name,
  file_size,
  created_at
FROM audit_attachments
ORDER BY created_at DESC
LIMIT 50;
```

---

## 📅 PASSO 5: Ver Cronogramas

### Ver cronograma de um mês:
```sql
SELECT 
  id,
  employee_id,
  machine_id,
  checklist_id,
  week_number,
  day_of_week,
  month,
  year,
  status,
  created_at
FROM schedule_entries
WHERE month = 3 AND year = 2026
ORDER BY day_of_week, created_at;
```

### Contar quantas entradas existem no cronograma:
```sql
SELECT COUNT(*) as total_entries FROM schedule_entries;
```

---

## 📈 PASSO 6: Estatísticas Gerais

### Total de auditorias feitas:
```sql
SELECT COUNT(*) as total_audits FROM audits;
```

### Total de fotos anexadas:
```sql
SELECT COUNT(*) as total_photos FROM audit_attachments;
```

### Total de entradas no cronograma:
```sql
SELECT COUNT(*) as total_schedule_entries FROM schedule_entries;
```

### Auditoria mais recente e seus detalhes:
```sql
SELECT 
  a.id,
  a.employee_id,
  a.machine_id,
  a.checklist_id,
  a.observations,
  a.status,
  a.created_at,
  COUNT(DISTINCT aa.id) as total_answers,
  COUNT(DISTINCT aat.id) as total_photos
FROM audits a
LEFT JOIN audit_answers aa ON a.id = aa.audit_id
LEFT JOIN audit_attachments aat ON a.id = aat.audit_id
GROUP BY a.id
ORDER BY a.created_at DESC
LIMIT 1;
```

---

## 🧹 PASSO 7: Limpar Dados de Teste (OPCIONAL)

⚠️ **USE COM CUIDADO** - Isso deleta dados!

### Deletar UMA auditoria específica:
```sql
DELETE FROM audit_attachments WHERE audit_id = 'COLE_O_AUDIT_ID_AQUI';
DELETE FROM audit_answers WHERE audit_id = 'COLE_O_AUDIT_ID_AQUI';
DELETE FROM audits WHERE id = 'COLE_O_AUDIT_ID_AQUI';
```

### Deletar TODAS as auditorias (reset completo):
```sql
DELETE FROM audit_attachments;
DELETE FROM audit_answers;
DELETE FROM audits;
DELETE FROM schedule_entries;
```

---

## 🔍 PASSO 8: Buscar Dados Específicos

### Encontrar auditoria por ID da máquina:
```sql
SELECT * FROM audits WHERE machine_id = 'COLA_O_MACHINE_ID_AQUI';
```

### Encontrar auditoria por ID do funcionário:
```sql
SELECT * FROM audits WHERE employee_id = 'COLA_O_EMPLOYEE_ID_AQUI';
```

### Encontrar auditoria por data:
```sql
SELECT * FROM audits 
WHERE DATE(created_at) = '2026-03-03'
ORDER BY created_at DESC;
```

---

## 💡 Dicas

1. **Para pegar um AUDIT_ID**, execute primeiro: `SELECT id FROM audits LIMIT 1;`
2. **IDs**  estão em UUID, exemplo: `550e8400-e29b-41d4-a716-446655440000`
3. **Timestamps** estão em UTC, exemplo: `2026-03-03T15:30:45.123456+00:00`
4. **File paths** começam com `audits/`, exemplo: `audits/550e8400-e29b-41d4/abc123.jpg`

---

## 📋 Checklist SQL para Garantir Tudo Está OK

Execute cada um e veja se retorna dados:

- [ ] `SELECT COUNT(*) FROM audits;` (deve retornar > 0 se fez auditorias)
- [ ] `SELECT COUNT(*) FROM audit_answers;` (deve retornar > 0 se respondeu perguntas)
- [ ] `SELECT COUNT(*) FROM audit_attachments;` (deve retornar > 0 se adicionou fotos)
- [ ] `SELECT * FROM storage.buckets WHERE id = 'audit-photos';` (deve retornar 1 linha)
- [ ] `SELECT COUNT(*) FROM schedule_entries;` (deve retornar > 0 se tem cronograma)

Pronto! Agora você tem todos os comandos SQL necessários. 🚀
