# 🐛 Troubleshooting - Se Algo Não Funcionar

## ❌ Erro: "Bucket audit-photos não encontrado"

### Causa:
Bucket não foi criado no Storage do Supabase

### Solução:
1. Vá em https://app.supabase.com/projects
2. Selecione projeto: **daowwclafeznrmoevkjm**
3. Menu esquerdo → **Storage**
4. Clique **New Bucket**
5. Nome: `audit-photos`
6. Marque **Public bucket** ✅
7. Clique **Create bucket**

**Verifique:** Você deve ver a pasta `audit-photos` na lista de buckets

---

## ❌ Erro: "Permissão negada ao fazer upload"

### Causa:
RLS Policies não estão configuradas

### Solução:
1. Vá em **Supabase SQL Editor**
2. Execute estes comandos:

```sql
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

**Verifique:** Em Storage → `audit-photos` → Policies, devem aparecer 3 policies

---

## ❌ Erro: "Auditoria salva mas foto não aparece"

### Causa 1: Bucket é PRIVATE (não é público)
### Solução:
1. Storage → `audit-photos` → Settings
2. Marque **Public bucket**
3. Salve

### Causa 2: A foto não foi realmente salva no Storage
### Solução:
1. Abra o Console (F12) no navegador
2. Procure por erro na aba **Network**
3. Veja se tem requisição GET/PUT para Storage
4. Se tiver erro, copie a mensagem e verifique RLS Policies acima

---

## ❌ Erro: "Tabela audits não existe"

### Causa:
Migrations não foram executadas no Supabase

### Solução:
1. Verifique se existe a pasta `supabase/migrations/`
2. Se SIM: Deploy das migrations
   - Se usa Supabase CLI: `supabase db push`
   - Se usa manual: Copie o SQL de cada arquivo .sql para o SQL Editor e execute

2. Se NÃO: Crie a tabela manualmente

**Verificar:**
```sql
SELECT * FROM audits LIMIT 1;
```
Deve retornar a estrutura da tabela (não erro)

---

## ❌ Erro: "Foto salva mas não consegue visualizar"

### Causa 1: URL pública do Storage está incorreta
### Solução:
```typescript
// Correto:
const url = supabase.storage.from('audit-photos').getPublicUrl(file_path).data.publicUrl;

// Use essa URL para exibir a imagem
<img src={url} />
```

### Causa 2: Foto de fato não existir no Storage
### Solução:
1. Vá em Storage → `audit-photos` → audits → [AUDIT_ID]
2. Você deve ver arquivo JPG/PNG
3. Se não existir, algo deu errado no upload

---

## ❌ Erro: "Cronograma não salva"

### Causa 1: Tabela schedule_entries não existe
### Solução:
Execute no SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text,
  machine_id uuid,
  checklist_id uuid,
  week_number integer,
  day_of_week integer,
  month integer,
  year integer,
  status text DEFAULT 'pendente',
  created_at timestamp DEFAULT now()
);
```

### Causa 2: RLS Policies bloqueando INSERT
### Solução:
Execute no SQL Editor:
```sql
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_insert"
  ON schedule_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_can_select"
  ON schedule_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_can_update"
  ON schedule_entries FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_can_delete"
  ON schedule_entries FOR DELETE
  TO authenticated
  USING (true);
```

---

## ❌ Erro: "JSON Response Error" no console

### Causa:
Query do Supabase retornou erro

### Solução:
1. Abra o Console (F12)
2. Veja a mensagem completa de erro
3. Procure por: "erro ao inserir em audits" ou similar
4. Executar a mesma query no SQL Editor para ver o erro

Exemplo:
```typescript
// Debug - veja exatamente o erro
const { data, error } = await supabase.from('audits').insert({...});
console.log('Error:', error); // Mostre o erro
```

---

## ❌ Erro: "Foto muito grande ou extensão não permitida"

### Solução:
No `use-audits.ts`, altere o tamanho máximo:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (padrão)
// Mude para:
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

### Extensões permitidas:
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
```

---

## ❌ Erro: "Login não funciona"

### Verifiações:
1. Supabase Auth está habilitado? (Settings → Auth)
2. Você têm um usuário cadastrado?
3. Email está confirmado?

### Solução para criar usuário de teste:
1. Vá em Supabase → **Authentication** → **Users**
2. Clique **Invite new user**
3. Email: teste@test.com
4. Clique **Send invite**
5. Cheque seu email e confirme a conta

---

## ❌ Erro: "Foto salva mas com caminho errado"

### Verificar o caminho:
```sql
SELECT file_path FROM audit_attachments LIMIT 1;
```

**Esperado:** `audits/[UUID]/[FILENAME].jpg`

### Se o caminho está errado:
Verifique em `use-audits.ts` a função que cria o caminho:

```typescript
const path = `audits/${audit.id}/${Date.now()}-${file.name}`;
// Deve gerar algo como:
// audits/550e8400-e29b-41d4-a716-446655440000/1741212345000-photo.jpg
```

---

## ❌ Erro: "Build falha com 'Cannot find module'"

### Solução:
```bash
# Limpe cache
rm -rf node_modules
rm package-lock.json

# Reinstale
npm install

# Tente build novamente
npm run build
```

Ou no PowerShell:
```powershell
Remove-Item -Path node_modules -Recurse -Force
Remove-Item -Path package-lock.json -Force
npm install
npm run build
```

---

## ❌ Erro: "Timeout ao salvar auditoria"

### Causa:
A foto é muito grande ou conexão lenta

### Solução:
1. Comprimir a foto antes de fazer upload
2. Reduzir a qualidade da foto
3. Aumentar o timeout na requisição:

```typescript
const timeout = 30000; // 30 segundos
```

---

## ✅ Como Debugar

### 1. Abra o Console (F12)
```
Clique direito → Inspecionar → Aba Console
```

### 2. Look for errors:
```
[ERROR] Cannot find table 'audits'
[ERROR] Permission denied for 'INSERT'
[ERROR] File too large
```

### 3. Network tab:
```
F12 → Network → Faça a ação novamente → Veja requisições
```

### 4. Supabase Console:
```
https://app.supabase.com/projects/[PROJECT_ID]/logs
```

---

## 🎯 Checklist de Diagnóstico

Antes de chamar "não funciona", verifique:

- [ ] Bucket `audit-photos` existe e é PUBLIC?
- [ ] RLS Policies estão criadas no bucket?
- [ ] Tabelas existem (`audits`, `audit_answers`, `audit_attachments`)?
- [ ] Você está logado (JWT token válido)?
- [ ] Arquivo é JPG/PNG (não GIF/BMP)?
- [ ] Arquivo <= 5MB?
- [ ] Conexão com internet está OK?
- [ ] Console do navegador mostra erros?
- [ ] SQL Editor consegue ver os dados?

Se tudo isso está OK e ainda não funciona, verifique o arquivo:
- **ENTENDER_O_SISTEMA.md** - Como o fluxo deveria funcionar
- **SQL_COMANDOS_PRONTO.md** - Comandos SQL para verificar dados

---

## 📞 Última Tentativa

Se nada funcionar:

1. Execute no SQL Editor:
```sql
-- Limpe tudo (⚠️ Delete todos os dados de teste)
DELETE FROM audit_attachments;
DELETE FROM audit_answers;
DELETE FROM audits;

-- Verifique se ficou vazio
SELECT COUNT(*) FROM audits; -- Deve retornar 0
```

2. Verifique novamente se bucket é PUBLIC

3. Tente fazer auditoria simples SEM foto:
```
Auditoria → Respostas → SEM FOTO → Salvar
```

4. Se salvar sem foto, o problema é no upload. Se não salvar, o proble me é no banco.

Pronto! Seque estes passos e você encontrará o problema! 🔍
