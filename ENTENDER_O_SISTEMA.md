# 🔄 Fluxo de Dados - Como Tudo Funciona

## 📊 Arquitetura Geral

```
┌─────────────────┐
│   NAVEGADOR     │
│  (React App)    │
└────────┬────────┘
         │
         ├─── Login ────────────────┐
         │                          │
         ├─── Dados (JSON) ────────→ Supabase
         │                          ├─ Auth
         │  ← Fotos (URLs) ────────→├─ Database
         │  ← Dados (JSON) ────────→├─ Storage
         │                          │
         └──────────────────────────┘
```

---

## 🔐 Autenticação

```
Usuário digita email/senha → Supabase Auth → Recebe JWT token → Todas as requisições usam token
```

**Tabela:** `auth.users` (gerenciada pelo Supabase)
**Relacionada:** `public.profiles` (dados do usuário, role, etc)

---

## 📱 Fluxo 1: Criando uma Auditoria Com Foto

### Na aplicação (MobileAudit.tsx):
```
1. Usuário inicia auditoria
2. Preenche respostas do checklist
3. Tira/seleciona uma foto
4. Clica em "Salvar Auditoria"
```

### O que acontece no backend (use-audits.ts):
```
1. Cria registro em audits
   ├─ ID: uuid
   ├─ employee_id: quem fez
   ├─ machine_id: qual máquina
   ├─ checklist_id: qual checklist
   ├─ observations: observações digitadas
   ├─ date: data da auditoria
   └─ status: pendente/conforme/não_conforme

2. Insere respostas em audit_answers
   └─ Para cada resposta do checklist:
      ├─ audit_id: ID da auditoria
      ├─ checklist_item_id: qual pergunta
      ├─ answer: resposta digitada
      └─ conformity: ok/nok/na

3. Faz upload da foto para Storage
   └─ Salva em audits/{AUDIT_ID}/{UUID}.jpg
   └─ Retorna file_path

4. Cria entrada em audit_attachments
   └─ Referência no banco:
      ├─ audit_id: qual auditoria
      ├─ file_path: caminho no storage
      ├─ file_name: nome do arquivo
      └─ file_size: tamanho da foto
```

### Fluxo Resumido:
```
Usuário salva auditoria
         ↓
        ┌─ Insert em audits
        ├─ Insert em audit_answers (múltiplas linhas)
        ├─ Upload foto para Storage
        └─ Insert em audit_attachments (referência)
         ↓
Toast: "Auditoria salva com sucesso!"
```

---

## 👁️ Fluxo 2: Visualizar Auditoria (MyAudits.tsx)

### Na aplicação:
```
1. Usuário acessa "Minhas Auditorias"
2. Vê lista de auditorias
3. Clica em uma para ver detalhes
```

### O que acontece no backend:
```
1. Busca registro em audits por ID
   
2. Busca respostas em audit_answers
   └─ Mostra todas as perguntas e respostas salvas

3. Busca referências de fotos em audit_attachments
   └─ Para cada foto:
      ├─ Pega file_path
      ├─ Faz download da URL pública do Storage
      └─ Exibe a imagem na tela
```

### Fluxo Resumido:
```
Clica em auditoria
         ↓
        ┌─ SELECT FROM audits WHERE id = X
        ├─ SELECT FROM audit_answers WHERE audit_id = X
        ├─ SELECT FROM audit_attachments WHERE audit_id = X
        └─ Para cada foto, gera URL: storage.url(file_path)
         ↓
Exibe auditoria com fotos, respostas e observações
```

---

## 📅 Fluxo 3: Cronograma (Schedule)

### Na aplicação (Schedule.tsx):
```
1. Usuário vai em Cronograma
2. Seleciona mês/ano
3. Ve as entradas agendadas
4. Pode adicionar/editar/deletar entradas
```

### O que acontece no backend (use-schedule.ts):

#### Listar cronograma:
```
Busca em schedule_entries:
  └─ Filtra por: mês, ano, funcionário (opcional)
  └─ Retorna lista de entradas agendadas
```

#### Adicionar entrada:
```
Insert em schedule_entries:
  ├─ employee_id: funcionário
  ├─ machine_id: máquina
  ├─ checklist_id: checklist
  ├─ week_number: número da semana
  ├─ day_of_week: dia da semana (0-6)
  ├─ month: mês
  └─ year: ano
```

#### Editar entrada:
```
Update em schedule_entries:
  └─ Atualiza campos que foram alterados
```

#### Deletar entrada:
```
Delete de schedule_entries:
  └─ Remove a entrada específica
```

---

## 💾 Estrutura de Dados - Tabelas

### Tabela: audits
```sql
id                 | employee_id | machine_id | checklist_id | observations | status | date | created_at | created_by
uint                uuid         | uuid       | uuid         | text         | text   | date | datetime   | text
```

### Tabela: audit_answers
```sql
id           | audit_id | checklist_item_id | answer    | conformity
uuid         | uuid     | uuid              | text      | text (ok/nok/na)
```

### Tabela: audit_attachments
```sql
id        | audit_id | file_path              | file_name    | file_size | created_at
uuid      | uuid     | text                   | text         | number    | datetime
Exemplo: "audits/550e8400-e29b/photo.jpg" | "photo.jpg" | 2048000 | ...
```

### Tabela: schedule_entries
```sql
id         | employee_id | machine_id | checklist_id | week_number | day_of_week | month | year | status
uuid       | uuid        | uuid       | uuid         | number      | number (0-6) | number | number | text
```

---

## 🖼️ Armazenamento de Fotos

### No Storage (audit-photos):
```
audit-photos/
  └── audits/
      ├── 550e8400-e29b-41d4-a716-446655440000/
      │   ├── abc123def456-photo-1.jpg (2 MB)
      │   ├── abc123def456-photo-2.jpg (1.5 MB)
      │   └── abc123def456-photo-3.jpg (3 MB)
      │
      ├── 660f9500-f30c-52e5-b827-557766551111/
      │   ├── xyz789uvw012-photo-1.jpg (2.2 MB)
      │   └── xyz789uvw012-photo-2.png (1.8 MB)
      │
      └── ...
```

### Metadados no Banco (audit_attachments):
```
audit_id                             | file_path                                    | file_name        | file_size
550e8400-e29b-41d4-a716-446655440000 | audits/550e8400.../abc123def456-photo-1.jpg | photo_1.jpg      | 2097152
550e8400-e29b-41d4-a716-446655440000 | audits/550e8400.../abc123def456-photo-2.jpg | photo_2.jpg      | 1572864
...
```

---

## 🔄 Ciclo de Vida de Uma Auditoria

```
┌─ Status: CRIANDO
│  └─ Usuário preenche respostas
│
├─ Status: SALVANDO
│  ├─ INSERT em audits (início)
│  ├─ INSERT em audit_answers (múltiplas)
│  ├─ Upload fotos para Storage
│  └─ INSERT em audit_attachments
│
├─ Status: SALVA
│  └─ Apareça em "Minhas Auditorias"
│
├─ Status: VISUALIZANDO
│  └─ Usuário clica para ver detalhes
│     ├─ Busca respostas (audit_answers)
│     ├─ Busca fotos (audit_attachments)
│     └─ Exibe na tela
│
└─ Status: FIM
   └─ Pode ser deletada → Remove tudo (audits + answers + attachments + fotos storage)
```

---

## 🎯 Resumo do Que Deveria Estar Acontecendo

| Ação | Banco | Storage | Esperado |
|------|-------|---------|----------|
| Salva auditoria | Insert 1 linha em audits | - | Auditoria tem ID |
| Salva respostas | Insert N linhas em audit_answers | - | N linhas com audit_id |
| Faz upload de foto | Insert em audit_attachments | Upload JPG/PNG | 1 foto, 1 referência no BD |
| Visualiza auditoria | Select em audits + answers + attachments | Read JPG/PNG | Vê foto na tela |
| Deleta auditoria | Delete de audits (cascade: answers, attachments) | Delete foto JPG/PNG | Tudo removido |

---

## 🔍 Como Verificar

### No Supabase SQL Editor:
```sql
-- Ver última auditoria criada
SELECT * FROM audits ORDER BY created_at DESC LIMIT 1;

-- Ver respostas dessa auditoria
SELECT * FROM audit_answers 
WHERE audit_id = (SELECT id FROM audits ORDER BY created_at DESC LIMIT 1);

-- Ver fotos dessa auditoria
SELECT * FROM audit_attachments 
WHERE audit_id = (SELECT id FROM audits ORDER BY created_at DESC LIMIT 1);
```

### No Storage (Supabase Dashboard):
```
Storage → audit-photos → audits → [AUDIT_ID] → [Deve ter JPG/PNG]
```

Tudo isso junto = Sistema funcionando corretamente! ✅

---

Agora consulte **COMECE_AQUI_TESTES.md** para começar os testes! 🚀
