import { useState, useMemo, useEffect } from 'react';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useScheduleEntries } from '@/hooks/use-schedule';
import { useAudits, type AuditWithDetails } from '@/hooks/use-audits';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Clock, AlertTriangle, Eye, ClipboardCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function MyAudits() {
  const navigate = useNavigate();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [detailAudit, setDetailAudit] = useState<AuditWithDetails | null>(null);
  const { allUsers, currentUser } = useAuth();

  // Filter employees based on user role
  const employees = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'administrativo') {
      // Administrativo can only see themselves
      return allUsers.filter(u => u.id === currentUser.id);
    } else if (currentUser.role === 'diretor') {
      // Diretor can see employees from their minifabrica
      return allUsers.filter(u => u.minifabrica === currentUser.minifabrica);
    }
    
    // Gestor can see all users
    return allUsers;
  }, [allUsers, currentUser]);

  // Auto-set selectedEmployee based on role
  useEffect(() => {
    if (!selectedEmployee && currentUser?.id) {
      if (currentUser.role === 'administrativo') {
        // Administrativo always sees only themselves
        setSelectedEmployee(currentUser.id);
      } else {
        // Diretor and Gestor default to 'all'
        setSelectedEmployee('all');
      }
    }
  }, [currentUser?.id, currentUser?.role, selectedEmployee]);

  const { data: dbMachines = [] } = useMachines();
  const { data: dbChecklists = [] } = useChecklists();
  const { data: schedule = [] } = useScheduleEntries({ month: Number(selectedMonth), year: Number(selectedYear) });
  const { data: audits = [] } = useAudits({
    userRole: currentUser?.role,
    userId: currentUser?.id,
    userMinifabrica: currentUser?.minifabrica,
  });
  const machines = dbMachines;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items.map(it => ({ id: it.id, question: it.question, explanation: it.explanation, type: it.type as 'ok_nok' | 'text' | 'number' })), createdAt: c.created_at }));

  const month = Number(selectedMonth);
  const year = Number(selectedYear);

  const getWeeksOfMonth = (m: number, y: number): number[] => {
    const weeks: number[] = [];
    const d = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const getISOWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };
    while (d <= lastDay) {
      const w = getISOWeekNumber(d);
      if (!weeks.includes(w)) weeks.push(w);
      d.setDate(d.getDate() + 1);
    }
    return weeks.sort((a, b) => a - b);
  };

  const weeksOfMonth = useMemo(() => getWeeksOfMonth(month, year), [month, year]);

  // Filter schedule entries for the selected period
  const filteredSchedule = useMemo(() => {
    let entries = schedule;
    if (selectedWeek !== 'all') entries = entries.filter(s => s.week_number === Number(selectedWeek));
    if (selectedEmployee !== 'all') entries = entries.filter(s => s.employee_id === selectedEmployee);
    return entries;
  }, [schedule, selectedWeek, selectedEmployee]);

  const pendingEntries = useMemo(() => filteredSchedule.filter(s => s.status === 'pending'), [filteredSchedule]);
  const completedEntries = useMemo(() => filteredSchedule.filter(s => s.status === 'completed'), [filteredSchedule]);
  const missedEntries = useMemo(() => filteredSchedule.filter(s => s.status === 'missed'), [filteredSchedule]);

  const getAuditForEntry = (entryId: string) => audits.find(a => a.schedule_entry_id === entryId);

  const statusBadge = (status: string) => {
    if (status === 'conforme') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Conforme</Badge>;
    return <Badge className="bg-destructive-10 text-destructive border-destructive-500/30">Não Conforme</Badge>;
  };

  const renderEntryRow = (entry: any, showActions: boolean) => {
    const emp = employees.find(e => e.id === entry.employee_id);
    const mach = machines.find(m => m.id === entry.machine_id);
    const ck = checklists.find(c => c.id === entry.checklist_id);
    const audit = getAuditForEntry(entry.id);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <TableRow key={entry.id}>
        <TableCell className="text-xs font-medium">{emp?.name || 'N/A'}</TableCell>
        <TableCell className="text-xs">{mach?.name || 'N/A'}</TableCell>
        <TableCell className="text-xs">{ck?.name || 'N/A'}</TableCell>
        <TableCell className="text-xs text-center">Sem {entry.week_number}</TableCell>
        <TableCell className="text-xs text-center">{days[entry.day_of_week] || '–'}</TableCell>
        <TableCell className="text-xs text-center">
          {entry.status === 'pending' && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>}
          {entry.status === 'completed' && audit && statusBadge(audit.status)}
          {entry.status === 'missed' && <Badge className="bg-destructive/10 text-destructive border-destructive/30"><AlertTriangle className="h-3 w-3 mr-1" />Atrasada</Badge>}
        </TableCell>
        <TableCell className="text-xs text-center">
          {showActions && entry.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate('/mobile-audit', { state: { scheduleEntryId: entry.id, sector: (entry as any).sector, minifabrica: (entry as any).minifabrica } })}>
              <ClipboardCheck className="h-3 w-3 mr-1" />Fazer
            </Button>
          )}
          {entry.status === 'completed' && audit && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDetailAudit(audit)}>
              <Eye className="h-3 w-3 mr-1" />Ver
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Auditorias</h1>
        <p className="text-sm text-muted-foreground">Acompanhe suas auditorias pendentes, concluídas e atrasadas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={currentUser?.role === 'administrativo'}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Auditor" /></SelectTrigger>
          <SelectContent>
            {currentUser?.role !== 'administrativo' && <SelectItem value="all">Todos auditores</SelectItem>}
            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Semana" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas semanas</SelectItem>
            {weeksOfMonth.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{pendingEntries.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{completedEntries.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{missedEntries.length}</p></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending"><Clock className="mr-1.5 h-4 w-4" />Pendentes ({pendingEntries.length})</TabsTrigger>
          <TabsTrigger value="completed"><CheckCircle2 className="mr-1.5 h-4 w-4" />Concluídas ({completedEntries.length})</TabsTrigger>
          <TabsTrigger value="missed"><AlertTriangle className="mr-1.5 h-4 w-4" />Atrasadas ({missedEntries.length})</TabsTrigger>
        </TabsList>

        {[
          { key: 'pending', entries: pendingEntries, empty: 'Nenhuma auditoria pendente para este período.', actions: true },
          { key: 'completed', entries: completedEntries, empty: 'Nenhuma auditoria concluída neste período.', actions: false },
          { key: 'missed', entries: missedEntries, empty: 'Nenhuma auditoria atrasada neste período.', actions: false },
        ].map(tab => (
          <TabsContent key={tab.key} value={tab.key}>
            {tab.entries.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{tab.empty}</p></CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Auditor</TableHead>
                        <TableHead className="text-xs">Máquina</TableHead>
                        <TableHead className="text-xs">Checklist</TableHead>
                        <TableHead className="text-xs text-center">Semana</TableHead>
                        <TableHead className="text-xs text-center">Dia</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tab.entries.map(e => renderEntryRow(e, tab.actions))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Audit Detail Dialog */}
      <Dialog open={!!detailAudit} onOpenChange={() => setDetailAudit(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {detailAudit && (() => {
            const emp = employees.find(e => e.id === detailAudit.employee_id);
            const mach = machines.find(m => m.id === detailAudit.machine_id);
            const ck = checklists.find(c => c.id === detailAudit.checklist_id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Resultado da Auditoria
                    {statusBadge(detailAudit.status)}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Auditor:</span> <strong>{emp?.name}</strong></div>
                    <div><span className="text-muted-foreground">Máquina:</span> <strong>{mach?.name}</strong></div>
                    <div><span className="text-muted-foreground">Checklist:</span> <strong>{ck?.name}</strong></div>
                    <div><span className="text-muted-foreground">Data:</span> <strong>{new Date(detailAudit.created_at).toLocaleDateString('pt-BR')}</strong></div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2">Respostas</h4>
                    <div className="space-y-2">
                      {((detailAudit as any).audit_answers || []).map((ans, i) => {
                        const item = ck?.items.find(it => it.id === ans.checklist_item_id);
                        return (
                          <div key={i} className="flex items-center justify-between rounded-md border p-2">
                            <span className="text-sm flex-1">{item?.question || ans.checklist_item_id}</span>
                            {ans.conformity === 'ok' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 ml-2"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                            ) : ans.conformity === 'nok' ? (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/30 ml-2"><XCircle className="h-3 w-3 mr-1" />NOK</Badge>
                            ) : (
                              <Badge variant="secondary" className="ml-2">NA</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {detailAudit.observations && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Observações</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{detailAudit.observations}</p>
                    </div>
                  )}

                  {detailAudit.attachments.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Fotos</h4>
                      <div className="flex gap-2 flex-wrap">
                        {detailAudit.attachments.map((att, i) => (
                          <img key={i} src={att.file_path} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg object-cover border" />
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
    </div>
  );
}
