import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Printer, FileText, Download, Eye, CheckCircle2, XCircle, AlertCircle, Camera } from 'lucide-react';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useAuth } from '@/lib/auth';
import { useAudits } from '@/hooks/use-audits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [detailAudit, setDetailAudit] = useState<any | null>(null);

  const { getEffectiveMinifabrica, allUsers, currentUser } = useAuth();
  const effectiveSector = getEffectiveMinifabrica();
  
  const { data: allMachinesDb = [] } = useMachines();
  const { data: dbChecklists = [] } = useChecklists();
  const { data: auditsData = [] } = useAudits({
    userRole: currentUser?.role,
    userId: currentUser?.id,
    userMinifabrica: currentUser?.minifabrica,
  });
  const allMachines = allMachinesDb;
  const machines = effectiveSector ? allMachines.filter(m => m.minifabrica === effectiveSector) : allMachines;
  const machineIds = new Set(machines.map(m => m.id));
  
  const audits = effectiveSector ? auditsData.filter(a => machineIds.has((a as any).machine_id)) : auditsData;
  const employees = effectiveSector ? allUsers.filter(e => e.minifabrica === effectiveSector) : allUsers;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items, createdAt: c.created_at }));

  const filtered = useMemo(() => {
    return audits.filter(a => {
      const aAny = a as any;
      if (statusFilter !== 'all' && aAny.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && aAny.employee_id !== employeeFilter) return false;
      if (machineFilter !== 'all' && aAny.machine_id !== machineFilter) return false;
      if (dateFrom) {
        const d = new Date(aAny.created_at);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = new Date(aAny.created_at);
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
    const header = ['Data', 'Auditor', 'RE Auditado', 'Nome Auditado', 'Máquina', 'Código Máq.', 'Setor', 'Checklist', 'Status', 'Observações', 'Respostas'];
    const rows = filtered.map(audit => {
      const aAny = audit as any;
      const emp = employees.find(e => e.id === aAny.employee_id);
      const mach = machines.find(m => m.id === aAny.machine_id);
      const ck = checklists.find(c => c.id === aAny.checklist_id);
      const answers = (aAny.audit_answers || []).map(ans => {
        const item = ck?.items.find(x => x.id === ans.checklist_item_id);
        return `${item?.question || '?'}: ${ans.conformity === 'ok' ? 'OK' : ans.conformity === 'nok' ? 'NOK' : ans.answer}`;
      }).join(' | ');
      return [
        new Date(aAny.created_at).toLocaleDateString('pt-BR'),
        emp?.name || '',
        aAny.auditado_re || '',
        aAny.auditado_nome || '',
        mach?.name || '',
        mach?.code || '',
        mach?.sector || '',
        ck?.name || '',
        statusLabels[aAny.status] || aAny.status,
        aAny.observations || '',
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
                  <TableHead>RE Auditado</TableHead>
                  <TableHead>Nome Auditado</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Checklist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right no-print">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(audit => {
                  const aAny = audit as any;
                  const emp = employees.find(e => e.id === aAny.employee_id);
                  const mach = machines.find(m => m.id === aAny.machine_id);
                  const ck = checklists.find(c => c.id === aAny.checklist_id);
                  return (
                    <TableRow key={audit.id}>
                      <TableCell>{new Date((audit as any).created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="font-medium">{emp?.name || 'N/A'}</TableCell>
                      <TableCell>{aAny.auditado_re || '—'}</TableCell>
                      <TableCell>{aAny.auditado_nome || '—'}</TableCell>
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
                      <TableCell className="text-right no-print">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setDetailAudit(audit)} title="Ver detalhes e fotos">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detailAudit} onOpenChange={() => setDetailAudit(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailAudit && (() => {
            const aAny = detailAudit as any;
            const emp = employees.find(e => e.id === aAny.employee_id);
            const mach = machines.find(m => m.id === aAny.machine_id);
            const ck = checklists.find(c => c.id === aAny.checklist_id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Detalhes da Auditoria</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Data</p>
                      <p className="font-semibold">{new Date(aAny.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Status</p>
                      <div className="mt-1">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium inline-block ${statusColors[aAny.status]}`}>
                          {statusLabels[aAny.status]}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Auditor</p>
                      <p className="font-semibold">{emp?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Máquina</p>
                      <p className="font-semibold">{mach?.name || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium text-muted-foreground">Checklist</p>
                      <p className="font-semibold">{ck?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">RE Auditado</p>
                      <p className="font-semibold">{aAny.auditado_re || '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Nome Auditado</p>
                      <p className="font-semibold">{aAny.auditado_nome || '—'}</p>
                    </div>
                  </div>

                  {/* Observations */}
                  {aAny.observations && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm font-medium mb-1">Observações</p>
                      <p className="text-sm">{aAny.observations}</p>
                    </div>
                  )}

                  {/* Answers */}
                  <div>
                    <p className="text-sm font-semibold mb-3">Respostas da Checklist</p>
                    <div className="space-y-2">
                      {((aAny.audit_answers || [])).map((ans: any, i: number) => {
                        const item = ck?.items.find(x => x.id === ans.checklist_item_id);
                        const conformityIcon = ans.conformity === 'ok' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : ans.conformity === 'nok' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        );
                        const conformityLabel = ans.conformity === 'ok' ? 'OK' : ans.conformity === 'nok' ? 'NOK' : 'N/A';
                        return (
                          <div key={i} className="flex items-start gap-3 rounded-lg border p-3 bg-card">
                            <div className="mt-1">{conformityIcon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{item?.question || 'Pergunta desconhecida'}</p>
                              <p className="text-xs text-muted-foreground mt-1">Resposta: <span className="font-semibold">{conformityLabel}</span></p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Photos */}
                  {((aAny.audit_attachments || [])).length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Fotos ({aAny.audit_attachments.length})
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {(aAny.audit_attachments || []).map((att: any, i: number) => (
                          <div key={i} className="rounded-lg overflow-hidden border bg-muted/50 flex items-center justify-center aspect-square">
                            <img
                              src={att.file_path}
                              alt={`Foto ${i + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22%3E%3Crect fill=%22%23f5f5f5%22 width=%22200%22 height=%22200%22/%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Detail cards for printing */}
      <div className="print-only space-y-4">
        {filtered.map(audit => {
          const aAny = audit as any;
          const emp = employees.find(e => e.id === aAny.employee_id);
          const mach = machines.find(m => m.id === aAny.machine_id);
          const ck = checklists.find(c => c.id === aAny.checklist_id);
          return (
            <Card key={audit.id}>
              <CardHeader>
                <CardTitle className="text-base">Auditoria - {new Date((audit as any).created_at).toLocaleDateString('pt-BR')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Auditor:</strong> {emp?.name}</p>
                <p><strong>Máquina:</strong> {mach?.name} ({mach?.code})</p>
                <p><strong>Checklist:</strong> {ck?.name}</p>
                <p><strong>RE Auditado:</strong> {audit.auditado_re || '—'}</p>
                <p><strong>Nome Auditado:</strong> {audit.auditado_nome || '—'}</p>
                <p><strong>Observações:</strong> {audit.observations || 'Nenhuma'}</p>
                <div className="mt-2">
                  <strong>Respostas:</strong>
                  {((audit as any).audit_answers || []).map((ans, i) => {
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
