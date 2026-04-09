# Guia de Teste - Sistema de Auditoria com Supabase

## 📋 Verificação Inicial - O que já existe

### Tabelas criadas automaticamente pela migration:
- `audits` - Registros de auditoria
- `audit_answers` - Respostas dos checklists
- `audit_attachments` - Referências das fotos nas auditorias
- `schedule_entries` - Entradas de cronograma
- `schedule_model` - Modelo/template do cronograma
- `machines` - Máquinas cadastradas
- `checklists` - Checklists cadastrados
- `profiles` - Usuários (vem do auth)

### Bucket de Storage:
- `audit-photos` - **Já criado na migration** (para guardar as fotos)

---

## ✅ Passo a Passo para Testar

### PASSO 1: Verificar o Bucket de Fotos no Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione o projeto: **daowwclafeznrmoevkjm**
3. Vá em **Storage** (menu esquerdo)
4. Procure pelo bucket `audit-photos`
   - Se **não existir**, crie um nova:
     - Clique em **New Bucket**
     - Nome: `audit-photos`
     - Marque como **Public** (deixar público para conseguir visualizar as fotos)
     - Crie o bucket

---

### PASSO 2: Verificar as Tabelas no Supabase

1. Em **Supabase Dashboard**, vá em **SQL Editor**
2. Execute este comando para listar todas as tabelas:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

3. Você deve ver (pelo menos):
   - `audits`
   - `audit_answers`
   - `audit_attachments`
   - `schedule_entries`
   - `schedule_model`
   - `machines`
   - `checklists`

---

### PASSO 3: Preparar Dados de Teste

Execute os comandos SQL abaixo para criar dados de teste:

#### A) Inserir um Setor/Minifábrica:
Vá em **supabase/config.toml** e procure a migration que cria dados iniciais (20260328210300_initial_minifabricas_data.sql)

Ou insira manualmente no SQL Editor:
```sql
INSERT INTO machines (id, name, minifabrica, sector, category, created_at)
VALUES (
  gen_random_uuid()::text,
  'Máquina Teste',
  'Minifábrica A',
  'Produção',
  'CNC',
  now()
);
```

#### B) Inserir um Checklist:
```sql
INSERT INTO checklists (id, name, minifabrica, created_at)
VALUES (
  gen_random_uuid()::text,
  'Checklist Teste',
  'Minifábrica A',
  now()
);

-- Depois adicione perguntas/itens:
INSERT INTO checklist_items (id, checklist_id, question, type, sort_order)
VALUES (
  gen_random_uuid()::text,
  (SELECT id FROM checklists WHERE name = 'Checklist Teste' LIMIT 1),
  'A máquina está funcionando?',
  'yes_no',
  1
);
```

---

### PASSO 4: Testar a Aplicação

#### A) Iniciar o servidor de desenvolvimento:
```bash
npm run dev
```

#### B) Login no sistema:
- Acesse `http://localhost:5173`
- Faça login (escrever credenciais de teste)

#### C) Testar Criação de Máquina:
1. Vá em **Máquinas** (menu)
2. Clique em **Adicionar Máquina**
3. Preencha os dados:
   - Nome: "Máquina Teste"
   - Setor: "Produção"
   - Minifábrica: "Minifábrica A"
   - Descrição: "Teste"
4. Salve e verifique se aparece na lista

#### D) Testar Criação de Checklist:
1. Vá em **Checklists**
2. Clique em **Novo Checklist**
3. Preencha:
   - Nome: "Checklist Teste"
   - Minifábrica: "Minifábrica A"
4. Adicione pelo menos 1 pergunta
5. Salve

#### E) Testar Agendamento:
1. Vá em **Cronograma**
2. Selecione mês/ano
3. Clique em **Plus** ou "Criar Entrada"
4. Preencha:
   - Funcionário
   - Máquina
   - Checklist
   - Dia da semana
5. Salve e verifique se aparece no cronograma

#### F) Testar Auditoria COM FOTOS:
1. Vá em **Auditoria Móvel** ou **Minhas Auditorias**
2. Clique em iniciar uma auditoria do cronograma
3. Responda as perguntas do checklist
4. **IMPORTANTE**: Clique em **Adicionar Foto** e tire uma foto ou selecione uma imagem
5. Escreva observações
6. Clique em **Salvar Auditoria**

---

### PASSO 5: Verificar se os Dados Foram Salvos no Supabase

#### A) Verificar Tabela de Auditorias:
No **SQL Editor**, execute:
```sql
SELECT * FROM audits ORDER BY created_at DESC LIMIT 10;
```

**Você deve ver:**
- ID da auditoria
- employee_id (funcionário)
- machine_id (máquina)
- checklist_id (checklist)
- observations (observações que digitou)
- date (data da auditoria)
- status (status da auditoria)

#### B) Verificar Respostas do Checklist:
```sql
SELECT * FROM audit_answers WHERE audit_id = 'COLE_O_ID_DA_AUDITORIA_AQUI';
```

**Você deve ver:**
- audit_id (ID da auditoria)
- checklist_item_id (ID da pergunta)
- answer (sua resposta)
- conformity (ok/nok/na)

#### C) Verificar Referências das Fotos:
```sql
SELECT * FROM audit_attachments WHERE audit_id = 'COLE_O_ID_DA_AUDITORIA_AQUI';
```

**Você deve ver:**
- audit_id (ID da auditoria)
- file_path (caminho da foto no storage, tipo: `audits/AUDIT_ID/UUID.jpg`)
- file_name (nome original da foto)
- file_size (tamanho em bytes)

#### D) Verificar as Fotos no Storage:
1. Em **Supabase Dashboard**, vá em **Storage**
2. Clique em `audit-photos`
3. Você deve ver pastas com IDs de auditorias
4. Dentro de cada pasta, as imagens JPG/PNG

---

### PASSO 6: Testar Cronograma

#### A) Gerar Cronograma Automático (se implementado):
1. Vá em **Cronograma**
2. Clique em **Gerar Cronograma**
3. Selecione mês/ano
4. Clique em **Gerar**

#### B) Verificar Entradas no Banco:
```sql
SELECT * FROM schedule_entries WHERE month = 3 AND year = 2026 ORDER BY created_at DESC;
```

**Você deve ver:**
- employee_id
- machine_id
- checklist_id
- week_number
- day_of_week
- month/year
- status

---

## 🐛 Se Algo Não Funcionar

### Erro ao salvar auditoria:
1. Abra o Console (F12) e veja a mensagem de erro
2. Verifique em **supabase/config.toml** se as políticas (RLS) permitem INSERT

### Fotos não salvam:
1. Verifique se o bucket `audit-photos` existe
2. Cheque se está marcado como **Public**
3. Libere as políticas de acesso (RLS) - em **Storage > Policies**

### Cronograma não aparece:
1. Verifique se há entrada em `schedule_entries`
2. Confira mês/ano selecionado
3. Verifique se employee_id existe em profiles/auth

---

## 📊 Checklist Completo de Teste

- [ ] Bucket `audit-photos` existe no Storage
- [ ] Tabela `audits` existe
- [ ] Tabela `audit_answers` existe
- [ ] Tabela `audit_attachments` existe
- [ ] Tabela `schedule_entries` existe
- [ ] Dados de máquinas podem ser criados
- [ ] Dados de checklists podem ser criados
- [ ] Auditoria salva COM foto
- [ ] Foto aparece em `audit_attachments`
- [ ] Foto arquivo existe em Storage
- [ ] Respostas aparecem em `audit_answers`
- [ ] Cronograma pode ser criado
- [ ] Cronograma aparece em `schedule_entries`
- [ ] Visualizar auditoria mostra fotos e observações

---

## 🎯 Resumo dos Comandos SQL Úteis

```sql
-- Ver todas as auditorias
SELECT id, employee_id, machine_id, checklist_id, observations, created_at 
FROM audits ORDER BY created_at DESC LIMIT 20;

-- Ver respostas de uma auditoria específica
SELECT * FROM audit_answers 
WHERE audit_id = 'AUDIT_ID_AQUI';

-- Ver fotos de uma auditoria
SELECT * FROM audit_attachments 
WHERE audit_id = 'AUDIT_ID_AQUI';

-- Ver cronograma de um mês
SELECT * FROM schedule_entries 
WHERE month = 3 AND year = 2026;

-- Contar quantas auditorias foram feitas
SELECT COUNT(*) as total_audits FROM audits;

-- Ver última auditoria criada
SELECT * FROM audits ORDER BY created_at DESC LIMIT 1;
```

---

## 🚀 Próximos Passos Após Testar

1. ✅ Se tudo salva corretamente → Sistema está funcionando!
2. Considere criar dados mais reais para testes
3. Testar em mobile (responsive)
4. Testar performance com muitas auditorias
5. Implementar relatórios baseados nos dados do Supabase
