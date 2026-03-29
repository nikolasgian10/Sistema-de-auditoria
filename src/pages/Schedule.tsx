import { useState, useEffect, useMemo, useCallback } from 'react';
import { store, ScheduleEntry, ScheduleModelEntry, AuditRecord, getWeeksOfMonthISO } from '@/lib/store';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Printer, Pencil, Trash2, Save, History, AlertTriangle, UserX, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK_DAYS = [
  { key: 1, label: 'Segunda' },
  { key: 2, label: 'Terça' },
  { key: 3, label: 'Quarta' },
  { key: 4, label: 'Quinta' },
  { key: 5, label: 'Sexta' },
  { key: 6, label: 'Sábado' },
];

function getStatusColor(entry: ScheduleEntry, audits: AuditRecord[]): string {
  if (entry.status === 'missed') return 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400';
  if (entry.status === 'pending') return 'bg-muted/30 border-border';
  const audit = audits.find(a => a.scheduleEntryId === entry.id);
  if (!audit) return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'conforme') return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'nao_conforme') return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
  return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
}

function getStatusLabel(entry: ScheduleEntry, audits: AuditRecord[]): string {
  if (entry.status === 'missed') return 'Não realizada';
  if (entry.status === 'pending') return 'Pendente';
  const audit = audits.find(a => a.scheduleEntryId === entry.id);
  if (!audit) return 'Realizada';
  if (audit.status === 'conforme') return 'Conforme';
  if (audit.status === 'nao_conforme') return 'Não conforme';
  return 'Parcial';
}

export default function Schedule() {
  const now = new Date();
  const { userType, getEffectiveMinifabrica } = useAuth();
  const effectiveSector = getEffectiveMinifabrica();
  const sectorFilter = userType === 'diretor' ? effectiveSector : null;
  const isAdmin = userType === 'administrativo';

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [histMonth, setHistMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [histYear, setHistYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [schedule, setSchedule] = useState(store.getSchedule());
  const [scheduleModel, setScheduleModel] = useState(store.getScheduleModel());
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null);
  const [editForm, setEditForm] = useState({ employeeId: '', machineId: '', checklistId: '', dayOfWeek: 1 });

  const { allUsers } = useAuth();
  const employees = allUsers;
  const { data: dbMachines = [] } = useMachines();
  const { data: dbChecklists = [] } = useChecklists();
  const sectors = store.getSectors();
  const machines = dbMachines;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items.map(it => ({ id: it.id, question: it.question, explanation: it.explanation, type: it.type as 'ok_nok' | 'text' | 'number' })), createdAt: c.created_at }));
  const audits = store.getAudits();

  const machinesFiltered = sectorFilter ? machines.filter(m => m.sector === sectorFilter) : machines;
  const employeesFiltered = sectorFilter ? employees.filter(e => e.minifabrica === sectorFilter) : employees;

  const machineById = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines]);
  const getEntrySector = useCallback((entry: ScheduleEntry) => entry.sectorId || machineById.get(entry.machineId)?.sector || '', [machineById]);

  const modelForSector = useMemo(() => {
    if (!sectorFilter) return scheduleModel;
    return scheduleModel.filter(m => m.sectorId === sectorFilter);
  }, [scheduleModel, sectorFilter]);

  const visibleSchedule = useMemo(() => {
    if (!sectorFilter) return schedule;
    return schedule.filter(entry => getEntrySector(entry) === sectorFilter);
  }, [schedule, sectorFilter, getEntrySector]);

  const filtered = useMemo(() =>
    visibleSchedule.filter(s => s.month === month && s.year === year).sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek),
    [visibleSchedule, month, year]
  );

  const histFiltered = useMemo(() =>
    visibleSchedule.filter(s => s.month === histMonth && s.year === histYear).sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek),
    [visibleSchedule, histMonth, histYear]
  );

  const missedAnalysis = useMemo(() => {
    const allMissed = visibleSchedule.filter(s => s.status === 'missed');
    const byAuditor = new Map<string, number>();
    allMissed.forEach(m => byAuditor.set(m.employeeId, (byAuditor.get(m.employeeId) || 0) + 1));
    const auditorRanking = [...byAuditor.entries()].map(([id, count]) => ({ employee: employees.find(e => e.id === id), count })).filter(r => r.employee).sort((a, b) => b.count - a.count);

    const bySector = new Map<string, number>();
    allMissed.forEach(m => bySector.set(m.sectorId || '', (bySector.get(m.sectorId || '') || 0) + 1));
    const sectorRanking = [...bySector.entries()].map(([id, count]) => ({ sector: sectors.find(s => s.id === id), count })).filter(r => r.sector).sort((a, b) => b.count - a.count);

    return { total: allMissed.length, allMissed, auditorRanking, sectorRanking };
  }, [visibleSchedule, employees, sectors]);

  // Auto-generate schedule when missing for the selected month/year
  useEffect(() => {
    if (isAdmin) return;
    if (sectors.length === 0 || checklists.length === 0 || employees.length === 0) return;

    const existingEntries = visibleSchedule.filter(s => s.month === month && s.year === year);
    const weeksIso = getWeeksOfMonthISO(month, year);

    const hasStaleWeeks = existingEntries.some(e => !weeksIso.includes(e.weekNumber));
    if (hasStaleWeeks) {
      const cleaned = schedule.filter(e => !(e.month === month && e.year === year && !weeksIso.includes(e.weekNumber)));
      store.saveSchedule(cleaned);
      store.generateSchedule(month, year, sectorFilter || undefined);
      setSchedule(store.getSchedule());
      return;
    }

    const sectorIds = sectorFilter
      ? [sectorFilter]
      : [...new Set(machinesFiltered.map(m => m.sector))].filter(Boolean);

    const existingKeys = new Set(existingEntries.map(e => `${e.weekNumber}-${getEntrySector(e)}-${e.dayOfWeek}`));
    const missing = weeksIso.some(weekNumber =>
      sectorIds.some(sectorId =>
        WEEK_DAYS.slice(0, 5).some(day => !existingKeys.has(`${weekNumber}-${sectorId}-${day.key}`))
      )
    );

    if (missing) {
      store.generateSchedule(month, year, sectorFilter || undefined);
      setSchedule(store.getSchedule());
    }
  }, [month, year]);

  const handleGenerate = () => {
    if (isAdmin) { toast.error('Apenas diretores e gestores podem gerar o cronograma'); return; }
    if (sectors.length === 0 || checklists.length === 0 || employees.length === 0) { toast.error('Cadastre setores, checklists e funcionários antes de gerar'); return; }
    store.generateSchedule(month, year, sectorFilter || undefined);
    setSchedule(store.getSchedule());
    toast.success(`Cronograma de ${MONTHS[month]} gerado com sucesso!`);
  };

  const handleSaveModel = () => {
    store.saveScheduleModel(scheduleModel);
    toast.success('Modelo de cronograma salvo!');
  };

  const handleClearModel = () => {
    setScheduleModel(prev => prev.filter(m => m.sectorId !== sectorFilter));
    toast.success('Modelo limpo para esta minifábrica.');
  };

  const handleModelChange = (weekIndex: number, dayOfWeek: number, employeeId: string) => {
    if (!sectorFilter) return;
    setScheduleModel(prev => {
      const existingIndex = prev.findIndex(m => m.weekIndex === weekIndex && m.dayOfWeek === dayOfWeek && m.sectorId === sectorFilter);
      if (!employeeId) {
        if (existingIndex === -1) return prev;
        return prev.filter((_, i) => i !== existingIndex);
      }
      if (existingIndex >= 0) {
        return prev.map((m, i) => i === existingIndex ? { ...m, employeeId } : m);
      }
      return [...prev, { id: Math.random().toString(36).substring(2, 11), weekIndex, dayOfWeek, sectorId: sectorFilter, employeeId }];
    });
  };

  const handleEditOpen = (entry: ScheduleEntry) => {
    if (isAdmin) return;
    setEditEntry(entry);
    setEditForm({ employeeId: entry.employeeId, machineId: entry.machineId, checklistId: entry.checklistId, dayOfWeek: entry.dayOfWeek });
  };

  const handleCreateOpen = (weekNumber: number, sectorId: string, dayOfWeek: number) => {
    if (isAdmin) return;
    const newEntry: ScheduleEntry = {
      id: '',
      weekNumber,
      dayOfWeek,
      month,
      year,
      employeeId: '',
      machineId: '',
      sectorId,
      minifabricaId: '',
      checklistId: '',
      status: 'pending' as const,
    };
    setEditEntry(newEntry);
    setEditForm({ employeeId: '', machineId: '', checklistId: '', dayOfWeek });
  };

  const handleEditSave = () => {
    if (!editEntry) return;
    if (!editEntry.id) {
      store.addScheduleEntry({
        weekNumber: editEntry.weekNumber,
        dayOfWeek: editForm.dayOfWeek,
        month: editEntry.month ?? month,
        year: editEntry.year ?? year,
        employeeId: editForm.employeeId,
        machineId: editForm.machineId,
        sectorId: editEntry.sectorId,
        minifabricaId: editEntry.minifabricaId || '',
        checklistId: editForm.checklistId,
        status: 'pending',
      });
      setSchedule(store.getSchedule());
      setEditEntry(null);
      toast.success('Entrada criada');
      return;
    }
    store.updateScheduleEntry(editEntry.id, {
      employeeId: editForm.employeeId,
      machineId: editForm.machineId,
      checklistId: editForm.checklistId,
      dayOfWeek: editForm.dayOfWeek,
    });
    setSchedule(store.getSchedule());
    setEditEntry(null);
    toast.success('Entrada atualizada');
  };

  const handleDelete = (id: string) => {
    if (isAdmin) return;
    store.deleteScheduleEntry(id);
    setSchedule(store.getSchedule());
    toast.success('Entrada removida');
  };

  const handlePrint = () => window.print();

  // Group entries by week -> sector
  const groupByWeekSector = useCallback((entries: ScheduleEntry[]) => {
    const weeks = [...new Set(entries.map(e => e.weekNumber))].sort((a, b) => a - b);
    return weeks.map(weekNum => {
      const weekEntries = entries.filter(e => e.weekNumber === weekNum);
      const sectorIds = [...new Set(weekEntries.map(e => e.sectorId || ''))].filter(Boolean);
      const sectorRows = sectorIds.map(sectorId => {
        const sector = sectors.find(s => s.id === sectorId);
        const byDay: Record<number, ScheduleEntry | undefined> = {};
        WEEK_DAYS.forEach(d => {
          byDay[d.key] = weekEntries.find(e => (e.sectorId || '') === sectorId && e.dayOfWeek === d.key);
        });
        return { sectorId, sectorName: sector?.name || 'N/A', byDay };
      });
      return { weekNum, sectorRows };
    });
  }, [sectors]);

  const grouped = useMemo(() => groupByWeekSector(filtered), [filtered, groupByWeekSector]);
  const histGrouped = useMemo(() => groupByWeekSector(histFiltered), [histFiltered, groupByWeekSector]);

  const renderCell = (entry: ScheduleEntry | undefined, isHistory: boolean, weekNum?: number, sectorId?: string, dayKey?: number) => {
    if (!entry) {
      if (isHistory || isAdmin) return <span className="text-muted-foreground/30 text-[10px]">—</span>;
      return (
        <button
          onClick={() => weekNum !== undefined && sectorId && dayKey && handleCreateOpen(weekNum, sectorId, dayKey)}
          className="text-[10px] text-blue-600 hover:underline"
        >
          Adicionar
        </button>
      );
    }

    const emp = employees.find(e => e.id === entry.employeeId);
    const ck = checklists.find(c => c.id === entry.checklistId);
    const statusText = getStatusLabel(entry, audits);
    const cellBg = getStatusColor(entry, audits);

    return (
      <div className={`group relative px-1.5 py-1 rounded border ${cellBg}`}>
        <div className="flex items-baseline gap-1">
          <span className="text-[8px] text-muted-foreground/60 uppercase font-bold">Quem</span>
          <span className="font-bold text-[11px] leading-tight">{emp?.name || 'N/A'}</span>
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">{ck?.name || ''}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[8px] text-muted-foreground/60 uppercase font-bold">Status</span>
          <span className="text-[9px] font-medium">{statusText}</span>
        </div>
        {!isHistory && !isAdmin && (
          <div className="absolute top-0 right-0 hidden group-hover:flex gap-0.5">
            <button onClick={() => handleEditOpen(entry)} className="p-0.5 rounded hover:bg-accent/20">
              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            <button onClick={() => handleDelete(entry.id)} className="p-0.5 rounded hover:bg-destructive/20">
              <Trash2 className="h-2.5 w-2.5 text-destructive" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderScheduleMatrix = (
    weekGroups: { weekNum: number; sectorRows: { sectorId: string; sectorName: string; byDay: Record<number, ScheduleEntry | undefined> }[] }[],
    isHistory: boolean
  ) => {
    if (weekGroups.length === 0) return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum cronograma para este período.</p>
          {!isHistory && !isAdmin && (
            <Button className="mt-4" onClick={handleGenerate}>
              <Wand2 className="mr-2 h-4 w-4" />Gerar Cronograma
            </Button>
          )}
          {!isHistory && isAdmin && (
            <p className="text-sm text-muted-foreground mt-2">Solicite ao diretor da sua minifábrica que gere o cronograma.</p>
          )}
        </CardContent>
      </Card>
    );

    return (
      <Card className="overflow-hidden">
        {/* Blue title bar */}
        <div className="bg-blue-700 text-white text-center py-2 px-4">
          <h3 className="text-sm font-bold tracking-wide uppercase">Cronograma Auditoria Escalonada</h3>
        </div>

        {isHistory && (
          <div className="flex items-center gap-3 p-2 border-b flex-wrap bg-muted/30">
            <span className="text-[10px] font-medium text-muted-foreground">Legenda:</span>
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-400 dark:bg-green-900" /> Conforme</span>
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded bg-yellow-100 border border-yellow-400 dark:bg-yellow-900" /> Não Conforme</span>
            <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-400 dark:bg-red-900" /> Não Realizada</span>
          </div>
        )}

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-blue-800 text-white">
                <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-bold text-center min-w-[60px]">SEMANA</th>
                <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-bold text-left min-w-[100px]">ONDE</th>
                {WEEK_DAYS.map(d => (
                  <th key={d.key} className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[120px] uppercase">{d.label}</th>
                ))}
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[80px]">NÍVEL 02{'\n'}SEMANAL</th>
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[80px]">DEMAIS{'\n'}NÍVEIS</th>
              </tr>
            </thead>
            <tbody>
              {weekGroups.map(({ weekNum, sectorRows }) =>
                sectorRows.map((row, rIdx) => (
                  <tr key={`${weekNum}-${row.sectorId}`} className="border-b border-border hover:bg-muted/30">
                    {rIdx === 0 && (
                      <td className="border border-border px-2 py-1.5 text-center font-bold text-sm bg-muted/20" rowSpan={sectorRows.length}>
                        {weekNum}
                      </td>
                    )}
                    <td className="border border-border px-2 py-1.5 font-bold text-[11px] bg-muted/10">
                      {row.sectorName}
                    </td>
                    {WEEK_DAYS.map(day => (
                      <td key={day.key} className="border border-border p-1 align-top min-w-[120px]">
                        {renderCell(row.byDay[day.key], isHistory, weekNum, row.sectorId, day.key)}
                      </td>
                    ))}
                    {/* Nível 02 Semanal */}
                    <td className="border border-border p-1 align-top text-center">
                      {rIdx === 0 && row.byDay[WEEK_DAYS[0].key] ? (() => {
                        const entry = row.byDay[WEEK_DAYS[0].key]!;
                        const emp = employees.find(e => e.id === entry.employeeId);
                        return (
                          <div>
                            <p className="text-[10px] font-bold">{emp?.name || 'N/A'}</p>
                            <p className="text-[9px] text-muted-foreground">{emp?.minifabrica || ''}</p>
                          </div>
                        );
                      })() : null}
                    </td>
                    {/* Demais Níveis */}
                    <td className="border border-border p-1 align-top text-center">
                      {rIdx === 0 && row.byDay[WEEK_DAYS[5]?.key] ? (() => {
                        const entry = row.byDay[WEEK_DAYS[5].key]!;
                        const emp = employees.find(e => e.id === entry.employeeId);
                        return (
                          <div>
                            <p className="text-[10px] font-bold">{emp?.name || 'N/A'}</p>
                            <p className="text-[9px] text-muted-foreground">{emp?.minifabrica || ''}</p>
                          </div>
                        );
                      })() : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>

        {/* Legend */}
        <div className="p-3 border-t bg-muted/20">
          <table className="text-[10px]">
            <tbody>
              <tr>
                <td className="font-bold border border-border px-2 py-0.5 bg-muted/30">ONDE</td>
                <td className="border border-border px-2 py-0.5">Local a ser auditado</td>
                <td className="font-bold border border-border px-2 py-0.5 bg-muted/30">MOTIVO</td>
                <td className="border border-border px-2 py-0.5">Por que será auditado</td>
                <td className="font-bold border border-border px-2 py-0.5 bg-muted/30">QUEM</td>
                <td className="border border-border px-2 py-0.5">Auditor responsável por realizar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cronograma de Auditorias</h1>
          <p className="text-sm text-muted-foreground">Planejamento, histórico e análise</p>
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Cronograma Atual</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4" />Histórico</TabsTrigger>
          <TabsTrigger value="missed"><AlertTriangle className="mr-1.5 h-4 w-4" />Não Realizadas</TabsTrigger>
          {userType === 'diretor' && <TabsTrigger value="model">Modelo</TabsTrigger>}
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <div className="flex flex-wrap gap-2 no-print">
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            {!isAdmin && (
              <Button variant="outline" onClick={handleGenerate}>
                <Wand2 className="mr-2 h-4 w-4" />Gerar Automático
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />Imprimir
            </Button>
          </div>
          {renderScheduleMatrix(grouped, false)}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap gap-2 no-print">
            <Select value={String(histMonth)} onValueChange={v => setHistMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(histYear)} onValueChange={v => setHistYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />Imprimir
            </Button>
          </div>
          {renderScheduleMatrix(histGrouped, true)}
        </TabsContent>

        <TabsContent value="missed" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Total Não Realizadas
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-3xl font-bold text-destructive">{missedAnalysis.total}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserX className="h-4 w-4 text-destructive" /> Auditor com Mais Faltas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missedAnalysis.auditorRanking[0] ? (
                  <>
                    <p className="text-lg font-bold">{missedAnalysis.auditorRanking[0].employee?.name}</p>
                    <p className="text-sm text-muted-foreground">{missedAnalysis.auditorRanking[0].count} não realizada(s)</p>
                  </>
                ) : <p className="text-muted-foreground">Nenhuma</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-destructive" /> Setor Mais Afetado
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missedAnalysis.sectorRanking[0] ? (
                  <>
                    <p className="text-lg font-bold">{missedAnalysis.sectorRanking[0].sector?.name}</p>
                    <p className="text-sm text-muted-foreground">{missedAnalysis.sectorRanking[0].count} perdida(s)</p>
                  </>
                ) : <p className="text-muted-foreground">Nenhuma</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking Auditores — Não Realizadas</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.auditorRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Auditor</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedAnalysis.auditorRanking.map((r, i) => (
                        <TableRow key={r.employee!.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{r.employee!.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.employee?.minifabrica || ''}</TableCell>
                          <TableCell className="text-right"><Badge variant="destructive">{r.count}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Ranking Setores — Perdidas</CardTitle></CardHeader>
              <CardContent>
                {missedAnalysis.sectorRanking.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {missedAnalysis.sectorRanking.map((r, i) => (
                        <TableRow key={r.sector!.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{r.sector!.name}</TableCell>
                          <TableCell className="text-right"><Badge variant="destructive">{r.count}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Lista Completa — Não Realizadas</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {missedAnalysis.allMissed.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhuma auditoria não realizada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Semana</TableHead>
                      <TableHead>Dia</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Checklist</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missedAnalysis.allMissed.map(entry => {
                      const emp = employees.find(e => e.id === entry.employeeId);
                      const setor = sectors.find(s => s.id === (entry.sectorId || ''));
                      const ck = checklists.find(c => c.id === entry.checklistId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{MONTHS[entry.month]} {entry.year}</TableCell>
                          <TableCell>{entry.weekNumber}</TableCell>
                          <TableCell>{WEEK_DAYS.find(d => d.key === entry.dayOfWeek)?.label || '—'}</TableCell>
                          <TableCell>{emp?.name || 'N/A'}</TableCell>
                          <TableCell>{setor?.name || 'N/A'}</TableCell>
                          <TableCell>{ck?.name || 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {userType === 'diretor' && (
          <TabsContent value="model" className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b">
                <div>
                  <h3 className="text-base font-bold">Modelo Anual de Cronograma</h3>
                  <p className="text-xs text-muted-foreground">Defina quais auditores ficam em cada posição (até 5 semanas) para sua minifábrica.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClearModel}>
                    <Trash2 className="mr-1 h-3 w-3" />Limpar Modelo
                  </Button>
                  <Button size="sm" onClick={handleSaveModel}>
                    <Save className="mr-1 h-3 w-3" />Salvar Modelo
                  </Button>
                </div>
              </div>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border border-blue-600 px-2 py-1.5 text-[10px] font-bold text-center">Semana</th>
                      {WEEK_DAYS.map(d => (
                        <th key={d.key} className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center uppercase">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map(weekIndex => (
                      <tr key={weekIndex} className="border-b border-border">
                        <td className="border border-border px-2 py-2 text-center font-bold bg-muted/20">{weekIndex}</td>
                        {WEEK_DAYS.map(day => {
                          const modelEntry = modelForSector.find(m => m.weekIndex === weekIndex && m.dayOfWeek === day.key);
                          return (
                            <td key={day.key} className="border border-border p-1">
                              <Select
                                value={modelEntry?.employeeId || ''}
                                onValueChange={v => handleModelChange(weekIndex, day.key, v)}
                              >
                                <SelectTrigger className="h-8 text-[10px]">
                                  <SelectValue placeholder="(vazio)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">(vazio)</SelectItem>
                                  {employeesFiltered.map(e => (
                                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>

              <div className="p-3 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Nota: ao gerar o cronograma, o sistema usará este modelo e ajustará o número de semanas conforme o mês selecionado (meses com 4 semanas ignoram a 5ª semana).
                </p>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Entrada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dia da Semana</Label>
              <Select value={String(editForm.dayOfWeek)} onValueChange={v => setEditForm(f => ({ ...f, dayOfWeek: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEK_DAYS.map(d => <SelectItem key={d.key} value={String(d.key)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funcionário</Label>
              <Select value={editForm.employeeId} onValueChange={v => setEditForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Máquina</Label>
              <Select value={editForm.machineId} onValueChange={v => setEditForm(f => ({ ...f, machineId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{machinesFiltered.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Checklist</Label>
              <Select value={editForm.checklistId} onValueChange={v => setEditForm(f => ({ ...f, checklistId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{checklists.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleEditSave}>
              <Save className="mr-2 h-4 w-4" />Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
