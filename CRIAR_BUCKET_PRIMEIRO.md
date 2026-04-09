# ⚠️ PRIMEIRA COISA A FAZER - Criar Bucket no Supabase

## Bucket para Fotos de Auditoria

O sistema salva fotos em: `audit-photos` (bucket do Supabase Storage)

---

## 🔧 PASSO 1: Criar o Bucket Manualmente

### Via Dashboard Supabase:

1. Acesse: https://app.supabase.com/projects
2. Selecione projeto: **daowwclafeznrmoevkjm**
3. Menu esquerdo → **Storage**
4. Clique em **New Bucket**
5. Preencha:
   - **Name**: `audit-photos`
   - **Public bucket**: ✅ Marque (IMPORTANTE - precisa ser público para visualizar as fotos)
6. Clique em **Create bucket**

---

## 🔐 PASSO 2: Configurar Políticas de Acesso (RLS)

Após criar o bucket, configure as políticas no **SQL Editor**:

```sql
-- 1. Política: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'audit-photos'
  );

-- 2. Política: Usuários autenticados podem ler fotos
CREATE POLICY "Authenticated users can read photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audit-photos');

-- 3. Política: Usuários podem deletar próprias fotos
CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audit-photos');
```

---

## ✅ VERIFICAR SE TUDO ESTÁ OK

No **SQL Editor**, execute:

```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'audit-photos';
```

**Você debe ver:**
```
id          | name          | public
audit-photos| audit-photos  | true
```

---

## 📁 Estrutura de Pastas no Storage

Quando as fotos são salvas, elas ficam em:
```
audit-photos/
  └── audits/
      └── [AUDIT_ID]/
          ├── [UUID].jpg
          ├── [UUID].jpg
          └── [UUID].jpg
```

---

## 🚨 SE DER ERRO AO SALVAR FOTOS

### Verificar permissões:

1. Vá em **Storage** → `audit-photos`
2. Clique em **Policies**
3. Verifique se existem as 3 políticas acima
4. Se não, execute os comandos SQL acima

### Verificar se bucket é público:

1. Em **Storage**, clique em `audit-photos`
2. Clique em **Settings**
3. Marque **Public bucket**
4. Salve

---

## 🎯 Resumo - O que deveria estar criado:

- ✅ Bucket: `audit-photos` (PUBLIC)
- ✅ RLS Policy: INSERT para autenticados
- ✅ RLS Policy: SELECT para autenticados
- ✅ RLS Policy: DELETE para autenticados

Depois disso, vá para **TESTE_SUPABASE.md** e siga os passos de teste!
