# 📝 Checklist Rápido - O que Fazer

## 🚀 ORDEM CORRETA:

### 1️⃣ CRIAR BUCKET (5 minutos)Feito
📄 Arquivo: **CRIAR_BUCKET_PRIMEIRO.md**

- [ ] Acessar Supabase Dashboard
- [ ] Criar bucket: `audit-photos` (PUBLIC)
- [ ] Executar RLS Policies no SQL Editor
- [ ] Testar se bucket aparece em Storage

### 2️⃣ VERIFICAR SUPABASE (5 minutos)feito
📄 Arquivo: **TESTE_SUPABASE.md** - PASSO 1 e 2

- [ ] Verificar se bucket `audit-photos` existe e é PUBLIC
- [ ] Verificar se as tabelas existem (audits, audit_answers, etc)
- [ ] Executar SQL para listar todas as tabelas

### 3️⃣ PREPARAR DADOS DE TESTE (10 minutos)
📄 Arquivo: **TESTE_SUPABASE.md** - PASSO 3

- [ ] Inserir máquina de teste
- [ ] Inserir checklist de teste
- [ ] Inserir pelo menos 1 pergunta no checklist

### 4️⃣ RODAR A APLICAÇÃO (2 minutos)
📄 Arquivo: **TESTE_SUPABASE.md** - PASSO 4

```bash
npm run dev
```

- [ ] Abrir no navegador: http://localhost:5173
- [ ] Fazer login

### 5️⃣ TESTAR FLUXO COMPLETO (15 minutos)
📄 Arquivo: **TESTE_SUPABASE.md** - PASSO 4

1. Criar/verificar máquina
2. Criar/verificar checklist
3. Criar agendamento
4. **Fazer auditoria COM FOTO** ← IMPORTANTE!
5. Salvar

### 6️⃣ VERIFICAR SE SALVOU (5 minutos)
📄 Arquivo: **TESTE_SUPABASE.md** - PASSO 5

- [ ] Auditoria aparece em `audits`
- [ ] Respostas aparecem em `audit_answers`
- [ ] Foto salva em `audit_attachments` (referência do storage)
- [ ] Arquivo de imagem existe em Storage → `audit-photos`

---

## 📊 Esperado no Final

### Tabela `audits`:
```
id | employee_id | machine_id | observations | created_at
...
```

### Tabela `audit_answers`:
```
id | audit_id | checklist_item_id | answer | conformity
...
```

### Tabela `audit_attachments`:
```
id | audit_id | file_path | file_name | file_size
...
```

### Storage (audit-photos):
```
bucket/
  └── audits/
      └── [AUDIT_ID]/
          └── [FOTO].jpg
```

---

## ⚡ Resumo do Sistema

| Item | Onde Armazena | Como Verifica |
|------|---------------|---------------|
| Auditoria | Tabela `audits` | SQL: `SELECT * FROM audits` |
| Respostas | Tabela `audit_answers` | SQL: `SELECT * FROM audit_answers` |
| Fotos (metadados) | Tabela `audit_attachments` | SQL: `SELECT * FROM audit_attachments` |
| Fotos (arquivo) | Storage `audit-photos` | Supabase Dashboard → Storage |
| Cronograma | Tabela `schedule_entries` | SQL: `SELECT * FROM schedule_entries` |

---

## 🎯 Sucesso = Quando:

✅ Você consegue fazer uma auditoria COM FOTO
✅ A foto aparece no Storage
✅ Os dados salvos aparecem nas tabelas
✅ Você consegue visualizar a auditoria depois

---

## 📞 Se Algo Quebrar

1. Verifique se bucket existe (Storage → audit-photos)
2. Verifique se RLS Policies estão criadas
3. Verifique console do navegador (F12) para mensagens de erro
4. Clique em uma auditoria existente para ver a foto salvando

---

Agora vá para **CRIAR_BUCKET_PRIMEIRO.md** e comece! 🚀
