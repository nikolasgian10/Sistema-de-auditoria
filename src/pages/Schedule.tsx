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

const normalizeText = (value?: string | null): string => String(value || '').trim().toLowerCase();

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

function getChecklistShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.split('-');
  return parts[parts.length - 1].trim();
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
  const machines = dbMachines;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items.map(it => ({ id: it.id, question: it.question, explanation: it.explanation, type: it.type as 'ok_nok' | 'text' | 'number' })), createdAt: c.created_at }));
  const audits = store.getAudits();

  // Get sectors from actual machines (Supabase), not localStorage
  const sectors = useMemo(() => {
    const sectorMap = new Map<string,string>();
    machines.forEach(m => {
      const normalized = normalizeText(m.sector);
      if (normalized && !sectorMap.has(normalized)) {
        sectorMap.set(normalized, String(m.sector || '').trim());
      }
    });
    return Array.from(sectorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [machines]);

  const machinesFiltered = sectorFilter ? machines.filter(m => normalizeText(m.sector) === normalizeText(sectorFilter)) : machines;
  const employeesFiltered = sectorFilter ? employees.filter(e => normalizeText(e.minifabrica) === normalizeText(sectorFilter)) : employees;

  const machineById = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines]);
  const getEntrySector = useCallback((entry: ScheduleEntry) => normalizeText(entry.sectorId || machineById.get(entry.machineId)?.sector || ''), [machineById]);
  const getEntryMinifabrica = useCallback((entry: ScheduleEntry) => normalizeText(entry.minifabricaId || machineById.get(entry.machineId)?.minifabrica || ''), [machineById]);

  const modelForSector = useMemo(() => {
    if (!sectorFilter) return scheduleModel;
    const normalizedFilter = normalizeText(sectorFilter);
    return scheduleModel.filter(m => normalizeText(m.sectorId) === normalizedFilter);
  }, [scheduleModel, sectorFilter]);

  const visibleSchedule = useMemo(() => {
    if (!sectorFilter) return schedule;
    const normalizedFilter = normalizeText(sectorFilter);
    const filtered = schedule.filter(entry => normalizeText(getEntryMinifabrica(entry)) === normalizedFilter);
    console.log('DEBUG visibleSchedule:', { totalSchedule: schedule.length, sectorFilter, visibleLength: filtered.length });
    return filtered;
  }, [schedule, sectorFilter, getEntryMinifabrica]);

  const filtered = useMemo(() => {
    const result = visibleSchedule.filter(s => s.month === month && s.year === year).sort((a, b) => a.weekNumber - b.weekNumber || a.dayOfWeek - b.dayOfWeek);
    console.log('DEBUG filtered:', { visibleScheduleLength: visibleSchedule.length, filteredLength: result.length, month, year, sectorFilter });
    if (result.length === 0) console.log('No entries match: month', month, 'year', year);
    return result;
  }, [visibleSchedule, month, year, sectorFilter]);

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
    allMissed.forEach(m => {
      const normalizedSectorId = normalizeText(m.sectorId || '');
      if (!normalizedSectorId) return;
      bySector.set(normalizedSectorId, (bySector.get(normalizedSectorId) || 0) + 1);
    });
    const sectorRanking = [...bySector.entries()]
      .map(([id, count]) => ({ sector: sectors.find(s => normalizeText(s.id) === id), count }))
      .filter(r => r.sector)
      .sort((a, b) => b.count - a.count);

    return { total: allMissed.length, allMissed, auditorRanking, sectorRanking };
  }, [visibleSchedule, employees, sectors]);

  const handleGenerate = () => {
    if (isAdmin) { toast.error('Apenas diretores e gestores podem gerar o cronograma'); return; }
    console.log('Debug:', { sectors: sectors.length, checklists: checklists.length, employees: employees.length, machines: machines.length });
    if (sectors.length === 0) { toast.error('Nenhum setor encontrado. Cadastre máquinas com setores.'); return; }
    if (checklists.length === 0) { toast.error('Nenhum checklist encontrado.'); return; }
    if (employees.length === 0) { toast.error('Nenhum funcionário encontrado.'); return; }
    const result = store.generateSchedule(month, year, sectorFilter || undefined, undefined, machines, dbChecklists, scheduleModel);
    console.log('Schedule gerado:', result.length, 'entradas');
    console.log('Entradas criadas:', result);
    const allSchedule = store.getSchedule();
    console.log('Schedule total após geração:', allSchedule.length, 'entradas');
    console.log('Schedule data:', allSchedule);
    setSchedule(allSchedule);
    console.log('Month:', month, 'Year:', year, 'Sector Filter:', sectorFilter);
    if (result.length === 0) {
      toast.error('Nenhuma entrada gerada. Verifique os dados.');
    } else {
      toast.success(`Cronograma de ${MONTHS[month]} gerado com sucesso! (${result.length} entradas)`);
    }
  };

  const handleSaveModel = () => {
    store.saveScheduleModel(scheduleModel);
    toast.success('Modelo de cronograma salvo!');
  };

  const handleClearModel = () => {
    setScheduleModel(prev => prev.filter(m => m.sectorId !== sectorFilter));
    toast.success('Modelo limpo para esta minifábrica.');
  };

  const handleModelChange = (weekIndex: number, dayOfWeek: number, employeeId: string, customSectorId?: string) => {
    const sector = customSectorId || sectorFilter;
    if (!sector) return;
    setScheduleModel(prev => {
      const existingIndex = prev.findIndex(m => m.weekIndex === weekIndex && m.dayOfWeek === dayOfWeek && m.sectorId === sector);
      if (!employeeId) {
        if (existingIndex === -1) return prev;
        return prev.filter((_, i) => i !== existingIndex);
      }
      if (existingIndex >= 0) {
        return prev.map((m, i) => i === existingIndex ? { ...m, employeeId } : m);
      }
      return [...prev, { id: Math.random().toString(36).substring(2, 11), weekIndex, dayOfWeek, sectorId: sector, employeeId }];
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
      minifabricaId: sectorFilter || '',
      checklistId: '',
      status: 'pending' as const,
    };
    setEditEntry(newEntry);
    // For special levels (10, 11), no machine selection needed
    const needsMachine = dayOfWeek <= 6;
    setEditForm({ employeeId: '', machineId: needsMachine ? '' : 'N/A', checklistId: '', dayOfWeek });
  };

  const handleEditSave = () => {
    if (!editEntry) return;
    const needsMachine = editForm.dayOfWeek <= 6;
    if (needsMachine && !editForm.machineId) {
      toast.error('Selecione uma máquina para esta auditoria');
      return;
    }
    if (!editForm.employeeId) {
      toast.error('Selecione um funcionário');
      return;
    }
    if (!editForm.checklistId) {
      toast.error('Selecione um checklist');
      return;
    }
    if (!editEntry.id) {
      store.addScheduleEntry({
        weekNumber: editEntry.weekNumber,
        dayOfWeek: editEntry.dayOfWeek,
        month: editEntry.month ?? month,
        year: editEntry.year ?? year,
        employeeId: editForm.employeeId,
        machineId: editForm.machineId || '',
        sectorId: editEntry.sectorId,
        minifabricaId: editEntry.minifabricaId,
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
      machineId: editForm.machineId || '',
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

  // Group entries by week -> sector (ONE ROW PER SECTOR - NO DUPLICATES)
  const groupByWeekSector = useCallback((entries: ScheduleEntry[]) => {
    const weeks = [...new Set(entries.map(e => e.weekNumber))].sort((a, b) => a - b);
    return weeks.map(weekNum => {
      const weekEntries = entries.filter(e => e.weekNumber === weekNum);
      
      // Get unique sectorIds - deduplicate with normalization
      const uniqueSectorIds = Array.from(new Set(
        weekEntries
          .map(e => normalizeText(e.sectorId || ''))
          .filter(id => id.length > 0)
      ));
      
      // Create sectorRows - one per unique sectorId
      const sectorRows = uniqueSectorIds.map(sectorId => {
        const sector = sectors.find(s => normalizeText(s.id) === sectorId);
        const sectorEntries = weekEntries.filter(e => normalizeText(e.sectorId || '') === sectorId);
        const byDay: Record<number, ScheduleEntry[]> = {};
        
        // Include regular days (1-6) and special levels (10, 11)
        [...WEEK_DAYS.map(d => d.key), 10, 11].forEach(d => {
          byDay[d] = sectorEntries.filter(e => e.dayOfWeek === d);
        });
        
        return { sectorId, sectorName: sector?.name || 'N/A', byDay };
      });
      
      return { weekNum, sectorRows };
    });
  }, [sectors]);

  const grouped = useMemo(() => groupByWeekSector(filtered), [filtered, groupByWeekSector]);
  const histGrouped = useMemo(() => groupByWeekSector(histFiltered), [histFiltered, groupByWeekSector]);

  const renderCell = (entries: ScheduleEntry[] | undefined, isHistory: boolean, weekNum?: number, sectorId?: string, dayKey?: number) => {
    if (!entries || entries.length === 0) {
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

    return (
      <div className="space-y-1">
        {entries.map(entry => {
          const emp = employees.find(e => e.id === entry.employeeId);
          const ck = checklists.find(c => c.id === entry.checklistId);
          const statusText = getStatusLabel(entry, audits);
          const cellBg = getStatusColor(entry, audits);

          return (
            <div key={entry.id} className={`group relative px-2 py-1.5 rounded border text-xs ${cellBg}`}>
              {/* Employee Name - Bold and Prominent */}
              <div className="font-bold text-[11px] leading-tight mb-0.5">{emp?.name || 'N/A'}</div>
              
              {/* Checklist Category */}
              {ck && (
                <div className="text-[8px] text-muted-foreground/70 mb-0.5">
                  {ck.category || ''}
                </div>
              )}
              
              {/* Status */}
              <div className="text-[8px] font-medium text-muted-foreground/80">{statusText}</div>
              
              {!isHistory && !isAdmin && (
                <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
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
        })}
      </div>
    );
  };

  const renderScheduleMatrix = (
    weekGroups: { weekNum: number; sectorRows: { sectorId: string; sectorName: string; byDay: Record<number, ScheduleEntry[]> }[] }[],
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
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[120px]">NÍVEL 02{'\n'}SEMANAL</th>
                <th className="border border-blue-600 px-1 py-1.5 text-[10px] font-bold text-center min-w-[120px]">DEMAIS{'\n'}NÍVEIS</th>
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
                      <td key={day.key} className="border border-border p-1.5 align-top min-w-[150px]">
                        {renderCell(row.byDay[day.key], isHistory, weekNum, row.sectorId, day.key)}
                      </td>
                    ))}
                    {/* Nível 02 Semanal - per sector */}
                    <td className="border border-border p-1.5 align-top text-center">
                      {row.byDay[10] && row.byDay[10].length > 0 ? renderCell(row.byDay[10], isHistory, weekNum, row.sectorId, 10) : (
                        !isHistory && !isAdmin && (
                          <button
                            onClick={() => handleCreateOpen(weekNum, row.sectorId, 10)}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            Adicionar
                          </button>
                        )
                      )}
                    </td>
                    {/* Demais Níveis - per sector */}
                    <td className="border border-border p-1.5 align-top text-center">
                      {row.byDay[11] && row.byDay[11].length > 0 ? renderCell(row.byDay[11], isHistory, weekNum, row.sectorId, 11) : (
                        !isHistory && !isAdmin && (
                          <button
                            onClick={() => handleCreateOpen(weekNum, row.sectorId, 11)}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            Adicionar
                          </button>
                        )
                      )}
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
                      const setor = sectors.find(s => normalizeText(s.id) === normalizeText(entry.sectorId || ''));
                      const ck = checklists.find(c => c.id === entry.checklistId);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{MONTHS[entry.month]} {entry.year}</TableCell>
                          <TableCell>{entry.weekNumber}</TableCell>
                          <TableCell>{WEEK_DAYS.find(d => d.key === entry.dayOfWeek)?.label || '—'}</TableCell>
                          <TableCell>{emp?.name || 'N/A'}</TableCell>
                          <TableCell>{setor?.name || 'N/A'}</TableCell>
                          <TableCell>{ck?.name ? getChecklistShortName(ck.name) : 'N/A'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] border-collapse border">
                  <thead>
                    <tr className="bg-blue-800 text-white">
                      <th className="border p-2">Semana</th>
                      <th className="border p-2">Onde</th>
                      <th className="border p-2">Segunda</th>
                      <th className="border p-2">Terça</th>
                      <th className="border p-2">Quarta</th>
                      <th className="border p-2">Quinta</th>
                      <th className="border p-2">Sexta</th>
                      <th className="border p-2">Sábado</th>
                      <th className="border p-2">Nível 02<br/>Semanal</th>
                      <th className="border p-2">Demais<br/>Níveis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getWeeksOfMonthISO(month, year).map((w, wIdx) => (
                      sectors.map((sectorObj, sIdx) => (
                        <tr key={`${w}-${sectorObj.id}`}>
                          {sIdx === 0 && <td rowSpan={sectors.length} className="border p-2 bg-gray-100 font-bold text-center align-middle">{w}</td>}
                          <td className="border p-2 bg-gray-50 font-semibold">{sectorObj.name}</td>
                          {[1, 2, 3, 4, 5, 6].map(d => (
                            <td key={d} className="border p-1">
                              <Select value={scheduleModel.find(m => m.weekIndex === w && m.dayOfWeek === d && m.sectorId === sectorObj.id)?.employeeId || ''} onValueChange={v => handleModelChange(w, d, v, sectorObj.id)}>
                                <SelectTrigger className="h-7 text-[9px]"><SelectValue placeholder="-" /></SelectTrigger>
                                <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name.split(' ')[0]}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                          ))}
                          <td className="border p-1">
                            <Select value={scheduleModel.find(m => m.weekIndex === w && m.dayOfWeek === 10 && m.sectorId === sectorObj.id)?.employeeId || ''} onValueChange={v => handleModelChange(w, 10, v, sectorObj.id)}>
                              <SelectTrigger className="h-7 text-[9px]"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name.split(' ')[0]}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="border p-1">
                            <Select value={scheduleModel.find(m => m.weekIndex === w && m.dayOfWeek === 11 && m.sectorId === sectorObj.id)?.employeeId || ''} onValueChange={v => handleModelChange(w, 11, v, sectorObj.id)}>
                              <SelectTrigger className="h-7 text-[9px]"><SelectValue placeholder="-" /></SelectTrigger>
                              <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name.split(' ')[0]}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={handleSaveModel}>Salvar Modelo</Button>
                <Button variant="outline" onClick={() => { setScheduleModel([]); toast.success('Modelo limpo'); }}>Limpar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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
                <SelectContent>
                  {WEEK_DAYS.map(d => <SelectItem key={d.key} value={String(d.key)}>{d.label}</SelectItem>)}
                  {editForm.dayOfWeek === 10 && <SelectItem value="10">Nível 02 Semanal</SelectItem>}
                  {editForm.dayOfWeek === 11 && <SelectItem value="11">Demais Níveis</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funcionário</Label>
              <Select value={editForm.employeeId} onValueChange={v => setEditForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editForm.dayOfWeek <= 6 && (
              <div>
                <Label>Máquina</Label>
                <Select value={editForm.machineId} onValueChange={v => setEditForm(f => ({ ...f, machineId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{machinesFiltered.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
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
