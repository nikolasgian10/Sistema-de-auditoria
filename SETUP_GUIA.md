# 🚀 Guia de Configuração - Sistema de Auditorias Mahle

## Visão Geral
Este guia descreve o passo a passo para configurar completamente seu sistema de auditorias no Supabase, com todas as tabelas, buckets de storage e dados iniciais.

---

## 📋 Pré-requisitos

✅ Conta Supabase criada e projeto criado (você já tem: `qtscqjacxrbxbzfgtwyt`)  
✅ Git e Node.js instalados localmente  
✅ CLI do Supabase instalada: `npm install -g supabase`  
✅ Ter acesso ao projeto Supabase com credenciais de administrador

---

## 🔑 PASSO 1: Obter Credenciais do Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Selecione seu projeto (ID: `qtscqjacxrbxbzfgtwyt`)
3. Vá para **Settings** → **API**
4. Copie e guarde:
   - **Project URL**: `https://qtscqjacxrbxbzfgtwyt.supabase.co`
   - **Anon Public Key**: `eyJhb...` (chave pública)
   - **Service Role Key**: `eyJh...` (chave de serviço - mantenha segura!)
5. Guarde também sua **Database Password** (necessária para migrations locais)

---

## 🗂️ PASSO 2: Inicializar Supabase Localmente (Opcional mas Recomendado)

### Se você deseja testar localmente primeiro:

```bash
# Na pasta do projeto
cd c:\Users\nikgi\Downloads\audit-replicate-main

# Inicializar Supabase
supabase init

# Configurar conexão com seu projeto remoto
supabase link --project-ref qtscqjacxrbxbzfgtwyt

# Você será solicitado a inserir sua Database Password
```

---

## 🪣 PASSO 3: Criar Buckets de Storage

### Via Supabase Dashboard:

1. Acesissue [Supabase Dashboard](https://app.supabase.com)
2. Acesse seu projeto
3. Vá para **Storage** → **Buckets**
4. Clique em **New Bucket** e crie os 3 buckets:

#### **Bucket 1: audit-attachments**
- Nome: `audit-attachments`
- Privado (não público)
- Descrição: "Anexos de auditorias (fotos e documentos)"

#### **Bucket 2: audit-reports**
- Nome: `audit-reports`
- Privado (não público)
- Descrição: "Relatórios PDF gerados"

#### **Bucket 3: schedule-files**
- Nome: `schedule-files`
- Privado (não público)
- Descrição: "Arquivos de cronograma e exportações"

### Ou use SQL SQL (executar no Supabase SQL Editor):

```sql
-- Criar buckets via SQL
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('audit-attachments', 'audit-attachments', false),
  ('audit-reports', 'audit-reports', false),
  ('schedule-files', 'schedule-files', false);
```

---

## 💾 PASSO 4: Executar as Migrations SQL

### Opção A: Via Supabase Dashboard (Recomendado para Iniciantes)

1. Acesse [Supabase Dashboard](https://app.supabase.com) → Seu Projeto
2. Vá para **SQL Editor**
3. Para cada arquivo abaixo, copie o conteúdo e execute:

#### **Migration 1: Tabelas de Auditorias**
- Arquivo: `supabase/migrations/20260328210000_create_audits_table.sql`
- Copie TODO o conteúdo e execute no SQL Editor
- Aguarde a conclusão (deve aparecer "Success")

#### **Migration 2: Tabelas de Cronograma**
- Arquivo: `supabase/migrations/20260328210100_create_schedule_tables.sql`
- Copie TODO o conteúdo e execute no SQL Editor
- Aguarde a conclusão

#### **Migration 3: Storage Buckets RLS**
- Arquivo: `supabase/migrations/20260328210200_create_storage_buckets.sql`
- Copie TODO o conteúdo e execute no SQL Editor
- Aguarde a conclusão

#### **Migration 4: Estrutura Pronta**
- Arquivo: `supabase/migrations/20260328210300_initial_minifabricas_data.sql`
- Copie TODO o conteúdo e execute no SQL Editor
- Aguarde a conclusão
- ⚠️ NOTA: Tabelas vazias - você adiciona dados (minifábricas, máquinas) via app

### Opção B: Via CLI do Supabase (Mais Automático)

```bash
# Após linkedar seu projeto (PASSO 2)

# Fazer push de todas as migrations
supabase db push

# Ou especificamente:
supabase migration up
```

---

## ✅ PASSO 5: Verificar se Tudo foi Instalado Corretamente

Execute as seguintes queries no **SQL Editor** do Supabase:

```sql
-- Verificar tabelas de auditoria
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audits', 'audit_answers', 'audit_attachments');

-- Verificar tabelas de cronograma
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('schedule_entries', 'schedule_model', 'schedule_assignments', 'auditor_rotation');

-- Verificar dados (tabelas vazias - você adiciona via app)
SELECT COUNT(*) as machines_count FROM public.machines;
SELECT COUNT(*) as checklists_count FROM public.checklists;

-- Verificar buckets
SELECT id, name, public FROM storage.buckets 
WHERE id IN ('audit-attachments', 'audit-reports', 'schedule-files');
```

Você deve ver:
- ✅ 3 tabelas de auditoria criadas
- ✅ 4 tabelas de cronograma criadas
- ✅ 10+ máquinas inseridas
- ✅ 8+ checklists inseridas
- ✅ 3 buckets de storage criados

---

## 👥 PASSO 6: Adicionar Usuários Iniciais (Opcional)

No **Supabase Dashboard** → **Authentication** → **Users**:

1. Clique em **Add User**
2. Insira email e password
3. Crie usuários com os tipos abaixo:

### Usuários Recomendados:

```
Email: gestor@mahle.com.br
Papel: Gestor (pode criar cronogramas e visualizar tudo)

Email: auditor1@mahle.com.br
Papel: Administrativo (executa auditorias)

Email: auditor2@mahle.com.br
Papel: Administrativo (executa auditorias)

Email: diretor@mahle.com.br
Papel: Diretor (acesso total + relatórios)
```

Para atribuir papéis, execute no SQL Editor:

```sql
-- Substitua os UUIDs pelos reais dos usuários
INSERT INTO public.user_roles (user_id, role) VALUES
  ('uuid-do-gestor', 'gestor'),
  ('uuid-do-auditor1', 'administrativo'),
  ('uuid-do-auditor2', 'administrativo'),
  ('uuid-do-diretor', 'diretor');
```

Para obter os UUIDs dos usuários:
```sql
SELECT id, email FROM auth.users;
```

---

## 🧪 PASSO 7: Testar Localmente

```bash
# Na pasta do projeto
cd c:\Users\nikgi\Downloads\audit-replicate-main

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Abrirá em http://localhost:5173
```

### Testes a Fazer:

1. ✅ **Login**: Faça login com um usuário criado
2. ✅ **Dashboard**: Verifique se carrega sem erros
3. ✅ **Máquinas**: Veja a lista de minifábricas e máquinas
4. ✅ **Checklists**: Veja os checklists disponíveis
5. ✅ **Cronograma**: Crie um cronograma de teste
6. ✅ **Auditoria**: Execute uma auditoria de teste
7. ✅ **Relatórios**: Gere um relatório

---

## 📊 Estrutura do Banco de Dados Criado

```
AUDITORIAS (audits)
├── audit_answers (Respostas individuais)
└── audit_attachments (Fotos e documentos)

CRONOGRAMA (schedule_entries)
├── schedule_model (Modelo reutilizável)
├── schedule_assignments (Atribuições de auditores)
└── auditor_rotation (Rotação de auditores)

DADOS BÁSICOS (pré-existentes)
├── machines (Máquinas e minifábricas)
├── checklists (Modelos de checklist)
└── checklist_items (Itens de checklist)

AUTENTICAÇÃO
├── auth.users (Usuários)
├── profiles (Perfis de usuário)
└── user_roles (Papéis/Permissões)
```

---

## 🔐 Segurança - Políticas RLS (Row Level Security)

Todas as tabelas têm **RLS ativado** com políticas que garantem:

✅ **Usuários autenticados** podem ler dados públicos  
✅ **Auditores** só veem/editam suas próprias auditorias  
✅ **Gestores/Diretores** podem gerenciar cronogramas  
✅ **Storage** protegido - arquivos só acessíveis por quem enviou  

Nenhuma mudança de configuração é necessária!

---

## 🚨 Troubleshooting - Problemas Comuns

### Erro: "relation "public.audits" does not exist"
**Solução**: Execute a migration de auditorias (`20260328210000_create_audits_table.sql`)

### Erro: "bucket already exists"
**Solução**: Os buckets já foram criados, ignore este erro

### Erro de RLS (403 Forbidden)
**Solução**: Verifique se está logado e se tem as permissões corretas
- Tente fazer logout e login novamente
- Verifique seu papel enviando: `SELECT public.has_role(auth.uid(), 'gestor'::app_role);`

### Dashboard mostra vazio após auditorias
**Solução**: Os dados virão em tempo real do banco
- Crie uma auditoria primeiro
- Crie um cronograma
- Aguarde o dashboard processar os dados (até 2 segundos)

### Problema com Storage
**Solução**: Verifique se:
1. Os buckets estão criados no Storage
2. Você está autenticado
3. As políticas RLS estão corretas

---

## 📱 URLs Importantes

- **Supabase Dashboard**: https://app.supabase.com
- **Seu Projeto**: https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt
- **SQL Editor**: https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt/sql
- **Authentication**: https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt/auth/users
- **Storage**: https://app.supabase.com/project/qtscqjacxrbxbzfgtwyt/storage/buckets
- **Sua Aplicação**: http://localhost:5173 (local)

---

## ✨ Resumo: O que foi criado

### ✅ Tabelas:
- `audits` - Registros de auditorias
- `audit_answers` - Respostas dos itens de checklist
- `audit_attachments` - Anexos (fotos, PDFs)
- `schedule_entries` - Agendamentos de auditorias
- `schedule_model` - Modelos reutilizáveis
- `schedule_assignments` - Atribuições de auditores
- `auditor_rotation` - Rotação de auditores

### ✅ Storage Buckets:
- `audit-attachments` - Fotos e documentos
- `audit-reports` - Relatórios PDF
- `schedule-files` - Arquivos de cronograma

### ✅ Dados Iniciais:
- ❌ Nenhuma minifábrica fictícia pré-carregada
- ❌ Nenhuma máquina de teste
- ✅ Tabelas vazias e prontas para dados reais
- ✅ Sistema aguarda que o gestor adicione dados via app

### ✅ Segurança:
- Row Level Security (RLS) em todas as tabelas
- Políticas de acesso baseadas em papéis
- Integração com autenticação Supabase

---

## 🎯 Próximos Passos

1. Configurar usuários no Supabase
2. Executar todas as migrations
3. Criar buckets de storage
4. Testar login no seu app
5. Criar cronogramas de teste
6. Executar auditorias
7. Visualizar relatórios e análises

---

## 📞 Suporte Rápido

Se encontrar problemas:
1. Verifique o console do navegador (F12) para erros
2. Acesse Supabase Dashboard → Logs para erros do servidor
3. Verifique se todas as migrations foram executadas
4. Limpe cache do navegador (Ctrl+Shift+Delete)
5. Tente fazer logout e login novamente

---

**Sistema pronto para auditorias reais! 🎉**
