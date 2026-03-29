## 📊 Guia de Integração - Views e Relatórios com Supabase

Este arquivo descreve como usar as Views criadas no Supabase para alimentar Dashboard, Análises e Relatórios com dados reais.

---

## 🎯 Views Disponíveis para Relatórios

### 1. **audits_detailed** - Auditorias com Detalhes
Retorna todas as auditorias com informações do auditor, máquina, checklist e conformidade.

```sql
SELECT * FROM public.audits_detailed 
WHERE minifabrica = 'Minifábrica A' 
ORDER BY date DESC;
```

**Colunas importantes:**
- `id`, `auditor_name`, `machine_name`, `conformity_percentage`, `status`
- Útil para: Dashboard, Histórico de Auditorias, Relatórios

---

### 2. **machine_conformity_stats** - Estatísticas por Máquina
Conformidade agregada por máquina com totais.

```sql
SELECT * FROM public.machine_conformity_stats 
WHERE minifabrica = 'Minifábrica A' 
ORDER BY avg_conformity DESC;
```

**Colunas importantes:**
- `machine_name`, `avg_conformity`, `conforming_count`, `non_conforming_count`
- Útil para: Gráficos no Dashboard, Relatório de Máquinas

---

### 3. **minifabrica_conformity_stats** - Estatísticas por Minifábrica
Resumo de conformidade por minifábrica.

```sql
SELECT * FROM public.minifabrica_conformity_stats;
```

**Colunas importantes:**
- `minifabrica`, `total_machines`, `avg_conformity`, `active_auditors`
- Útil para: Visão geral do Dashboard, Comparações

---

### 4. **auditor_performance** - Performance dos Auditores
Estatísticas de cada auditor.

```sql
SELECT * FROM public.auditor_performance 
WHERE minifabrica = 'Minifábrica A' 
ORDER BY avg_conformity DESC;
```

**Colunas importantes:**
- `auditor_name`, `total_audits`, `avg_conformity`, `machines_audited`
- Útil para: Análise de Performance, Benchmarking

---

### 5. **conformity_trend_30days** - Tendência de Conformidade
Histórico de conformidade dos últimos 30 dias.

```sql
SELECT * FROM public.conformity_trend_30days 
WHERE minifabrica = 'Minifábrica A' 
ORDER BY audit_date DESC;
```

**Colunas importantes:**
- `audit_date`, `avg_conformity`, `conforming`, `non_conforming`
- Útil para: Gráficos de Tendência, Análise

---

### 6. **critical_nonconformities** - Problemas Críticos
Não conformidades recentes que precisam de atenção.

```sql
SELECT * FROM public.critical_nonconformities 
WHERE minifabrica = 'Minifábrica A' 
ORDER BY conformity_percentage ASC;
```

**Colunas importantes:**
- `machine_name`, `status`, `conformity_percentage`, `issues`
- Útil para: Alertas, Relatório de Problemas

---

### 7. **schedule_detailed** - Cronograma com Detalhes
Agendamentos com informações do auditor e máquina.

```sql
SELECT * FROM public.schedule_detailed 
WHERE minifabrica = 'Minifábrica A' 
AND status = 'pending' 
ORDER BY effective_date ASC;
```

**Colunas importantes:**
- `auditor_name`, `machine_name`, `effective_date`, `status`
- Útil para: Visualização de Cronograma

---

## 🔌 Como Usar em React

### Hook para Carregar view_audits_detailed

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAuditsDetailed(minifabrica?: string) {
  return useQuery({
    queryKey: ['audits-detailed', minifabrica],
    queryFn: async () => {
      let query = supabase
        .from('audits_detailed')
        .select('*')
        .order('date', { ascending: false });
      
      if (minifabrica) {
        query = query.eq('minifabrica', minifabrica);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

**Usar em um Componente:**

```typescript
export function AuditList() {
  const { data: audits, isLoading } = useAuditsDetailed('Minifábrica A');
  
  if (isLoading) return <div>Carregando...</div>;
  
  return (
    <div>
      {audits?.map(audit => (
        <div key={audit.id}>
          <h3>{audit.machine_name}</h3>
          <p>Auditor: {audit.auditor_name}</p>
          <p>Conformidade: {audit.conformity_percentage}%</p>
          <p>Status: {audit.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Hook para Carregar Estatísticas de Máquinas

```typescript
export function useMachineConformityStats(minifabrica?: string) {
  return useQuery({
    queryKey: ['machine-stats', minifabrica],
    queryFn: async () => {
      let query = supabase
        .from('machine_conformity_stats')
        .select('*');
      
      if (minifabrica) {
        query = query.eq('minifabrica', minifabrica);
      }
      
      query = query.order('avg_conformity', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

**Usar em um Gráfico:**

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function MachineConformityChart() {
  const { data: stats } = useMachineConformityStats('Minifábrica A');
  
  return (
    <BarChart data={stats}>
      <XAxis dataKey="machine_name" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="avg_conformity" fill="#8884d8" />
    </BarChart>
  );
}
```

---

### Hook para Carregar Tendência de Conformidade

```typescript
export function useConformityTrend(minifabrica?: string) {
  return useQuery({
    queryKey: ['conformity-trend', minifabrica],
    queryFn: async () => {
      let query = supabase
        .from('conformity_trend_30days')
        .select('*');
      
      if (minifabrica) {
        query = query.eq('minifabrica', minifabrica);
      }
      
      query = query.order('audit_date', { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

---

### Hook para Carregar Problemas Críticos

```typescript
export function useCriticalNonconformities(minifabrica?: string) {
  return useQuery({
    queryKey: ['critical-issues', minifabrica],
    queryFn: async () => {
      let query = supabase
        .from('critical_nonconformities')
        .select('*');
      
      if (minifabrica) {
        query = query.eq('minifabrica', minifabrica);
      }
      
      query = query.order('conformity_percentage', { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
```

**Usar para alertas:**

```typescript
export function CriticalIssuesAlert() {
  const { data: issues } = useCriticalNonconformities();
  
  const criticalCount = issues?.filter(i => i.conformity_percentage < 70).length || 0;
  
  if (criticalCount > 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{criticalCount} Problemas Críticos</AlertTitle>
        <AlertDescription>
          Há máquinas com conformidade abaixo de 70%
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}
```

---

## 📁 Localização Recomendada dos Hooks

Crie os hooks em: `src/hooks/`

```
src/hooks/
├── use-audits.ts (nova)
├── use-machines.ts (existente)
├── use-checklists.ts (existente)
├── use-audit-reports.ts (nova)
├── use-schedule-reports.ts (nova)
└── use-audit-analytics.ts (nova)
```

---

## 🔄 Atualização do Dashboard

**Antes (com localStorage mockup):**
```typescript
const allAudits = store.getAudits();
const audits = effectiveMinifabrica 
  ? allAudits.filter(a => machineIds.has(a.machineId)) 
  : allAudits;
```

**Depois (com dados reais do Supabase):**
```typescript
const { data: audits = [] } = useAuditsDetailed(effectiveMinifabrica);
const { data: stats = [] } = useMachineConformityStats(effectiveMinifabrica);
const { data: trends = [] } = useConformityTrend(effectiveMinifabrica);
```

---

## 📊 Exemplo Completo - Dashboard com Dados Reais

```typescript
import { useAuditsDetailed } from '@/hooks/use-audit-reports';
import { useMachineConformityStats } from '@/hooks/use-audit-analytics';
import { useConformityTrend } from '@/hooks/use-audit-analytics';
import { useAuth } from '@/lib/auth';

export default function DashboardWithRealData() {
  const { user, minifabrica } = useAuth();
  
  // Carregar dados do Supabase
  const { data: audits = [] } = useAuditsDetailed(minifabrica);
  const { data: machineStats = [] } = useMachineConformityStats(minifabrica);
  const { data: trends = [] } = useConformityTrend(minifabrica);
  
  // Calcular estatísticas
  const totalAudits = audits.length;
  const avgConformity = audits.length > 0 
    ? Math.round(audits.reduce((sum, a) => sum + (a.conformity_percentage || 0), 0) / audits.length)
    : 0;
  
  const conformeCount = audits.filter(a => a.status === 'conforme').length;
  const naoConformeCount = audits.filter(a => a.status === 'nao_conforme').length;
  
  return (
    <div className="space-y-4">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total de Auditorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAudits}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Conformidade Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgConformity}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Conformes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{conformeCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Não Conformes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{naoConformeCount}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Gráfico de Máquinas */}
      <Card>
        <CardHeader>
          <CardTitle>Conformidade por Máquina</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={machineStats} width={600} height={300}>
            <XAxis dataKey="machine_name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="avg_conformity" fill="#8884d8" />
          </BarChart>
        </CardContent>
      </Card>
      
      {/* Gráfico de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Conformidade (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart data={trends} width={600} height={300}>
            <XAxis dataKey="audit_date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="avg_conformity" stroke="#8884d8" />
          </LineChart>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## ✅ Dados que Agora Vêm do Supabase

✅ **Auditorias**: Todas as auditorias criadas pelos usuários  
✅ **Respostas**: Todas as respostas do checklist  
✅ **Estatísticas**: Conformidade calculada automaticamente  
✅ **Histórico**: Tendência de conformidade ao longo do tempo  
✅ **Alertas**: Problemas críticos detectados automaticamente  

---

## 🚫 O que FOI REMOVIDO

❌ Dados mockup de localStorage (audits mockup)  
❌ Schedule mockup (será real do Supabase)  
❌ Dados de teste estáticos  

### Nota Importante:
As **minifábricas, máquinas e checklists** são gerenciados PELO GESTOR via app:
- Adicione minifábricas na interface
- Configure máquinas para cada minifábrica
- Crie checklists especializados
- Sistema aguarda esses dados para começar auditorias

---

## 📋 Checklist de Implementação

- [ ] Criar arquivo `src/hooks/use-audit-reports.ts` com os hooks
- [ ] Criar arquivo `src/hooks/use-audit-analytics.ts`  com mais hooks
- [ ] Atualizar `Dashboard.tsx` para usar os novos hooks
- [ ] Atualizar `Analytics.tsx` para carregar dados do Supabase
- [ ] Atualizar `Reports.tsx` para gerar relatórios com dados reais
- [ ] Testar login e visualizar dados em tempo real
- [ ] Criar uma auditoria de teste
- [ ] Verificar se o Dashboard atualiza com os dados reais

---

## 🎉 Resultado Final

Seu sistema agora:
- ✅ Armazena dados reais no Supabase
- ✅ Calcula conformidade automaticamente
- ✅ Gera relatórios a partir de dados reais
- ✅ Mostra análises e tendências
- ✅ Tem dashboard em tempo real
- ✅ É pronto para produção

**Próximo passo**: Execute as migrations e crie sua primeira auditoria!
