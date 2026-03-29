import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Printer, FileText, Download } from 'lucide-react';
import { store } from '@/lib/store';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

function exportToCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { getEffectiveMinifabrica } = useAuth();
  const effectiveSector = getEffectiveMinifabrica();
  
  const { data: allMachinesDb = [] } = useMachines();
  const { data: dbChecklists = [] } = useChecklists();
  const allMachines = allMachinesDb;
  const machines = effectiveSector ? allMachines.filter(m => m.minifabrica === effectiveSector) : allMachines;
  const machineIds = new Set(machines.map(m => m.id));
  
  const allAudits = store.getAudits();
  const audits = effectiveSector ? allAudits.filter(a => machineIds.has(a.machineId)) : allAudits;
  const { allUsers } = useAuth();
  const employees = effectiveSector ? allUsers.filter(e => e.minifabrica === effectiveSector) : allUsers;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items, createdAt: c.created_at }));

  const filtered = useMemo(() => {
    return audits.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && a.employeeId !== employeeFilter) return false;
      if (machineFilter !== 'all' && a.machineId !== machineFilter) return false;
      if (dateFrom) {
        const d = new Date(a.createdAt);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(a.createdAt);
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [audits, statusFilter, employeeFilter, machineFilter, dateFrom, dateTo]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const statusLabels: Record<string, string> = { conforme: 'Conforme', nao_conforme: 'Não Conforme', parcial: 'Parcial' };
    const header = ['Data', 'Auditor', 'Máquina', 'Código Máq.', 'Setor', 'Checklist', 'Status', 'Observações', 'Respostas'];
    const rows = filtered.map(audit => {
      const emp = employees.find(e => e.id === audit.employeeId);
      const mach = machines.find(m => m.id === audit.machineId);
      const ck = checklists.find(c => c.id === audit.checklistId);
      const answers = audit.answers.map(ans => {
        const item = ck?.items.find(x => x.id === ans.checklistItemId);
        return `${item?.question || '?'}: ${ans.conformity === 'ok' ? 'OK' : ans.conformity === 'nok' ? 'NOK' : ans.answer}`;
      }).join(' | ');
      return [
        new Date(audit.createdAt).toLocaleDateString('pt-BR'),
        emp?.name || '',
        mach?.name || '',
        mach?.code || '',
        mach?.sector || '',
        ck?.name || '',
        statusLabels[audit.status] || audit.status,
        audit.observations || '',
        answers,
      ];
    });
    exportToCSV([header, ...rows], `relatorio-lpa-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setEmployeeFilter('all');
    setMachineFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = statusFilter !== 'all' || employeeFilter !== 'all' || machineFilter !== 'all' || dateFrom || dateTo;

  const statusColors: Record<string, string> = {
    conforme: 'bg-success/10 text-success',
    nao_conforme: 'bg-destructive/10 text-destructive',
    parcial: 'bg-warning/10 text-warning',
  };
  const statusLabels: Record<string, string> = { conforme: 'Conforme', nao_conforme: 'Não Conforme', parcial: 'Parcial' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} auditoria{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button onClick={handleExport} className="gap-2"><Download className="h-4 w-4" />Exportar Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Date From */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Auditor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Auditor</label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Machine */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Máquina</label>
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="conforme">Conforme</SelectItem>
                  <SelectItem value="nao_conforme">Não Conforme</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>Limpar filtros</Button>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Nenhuma auditoria encontrada com os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(audit => {
                  const emp = employees.find(e => e.id === audit.employeeId);
                  const mach = machines.find(m => m.id === audit.machineId);
                  const ck = checklists.find(c => c.id === audit.checklistId);
                  return (
                    <TableRow key={audit.id}>
                      <TableCell>{new Date(audit.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{emp?.name || 'N/A'}</TableCell>
                      <TableCell>{mach?.name || 'N/A'}</TableCell>
                      <TableCell>{ck?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[audit.status]}`}>
                          {statusLabels[audit.status]}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {audit.observations || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail cards for printing */}
      <div className="print-only space-y-4">
        {filtered.map(audit => {
          const emp = employees.find(e => e.id === audit.employeeId);
          const mach = machines.find(m => m.id === audit.machineId);
          const ck = checklists.find(c => c.id === audit.checklistId);
          return (
            <Card key={audit.id}>
              <CardHeader>
                <CardTitle className="text-base">Auditoria - {new Date(audit.createdAt).toLocaleDateString('pt-BR')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Auditor:</strong> {emp?.name}</p>
                <p><strong>Máquina:</strong> {mach?.name} ({mach?.code})</p>
                <p><strong>Checklist:</strong> {ck?.name}</p>
                <p><strong>Observações:</strong> {audit.observations || 'Nenhuma'}</p>
                <div className="mt-2">
                  <strong>Respostas:</strong>
                  {audit.answers.map((ans, i) => {
                    const item = ck?.items.find(x => x.id === ans.checklistItemId);
                    return (
                      <p key={i} className="ml-2">{item?.question}: {ans.conformity === 'ok' ? '✅ OK' : ans.conformity === 'nok' ? '❌ NOK' : ans.answer}</p>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
