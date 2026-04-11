import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useScheduleEntries, useAddBulkScheduleEntries, useDeleteScheduleEntry, useUpdateScheduleEntry, useScheduleModels, useAddScheduleModel } from '@/hooks/use-schedule';
import { useAudits } from '@/hooks/use-audits';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

function getWeeksOfMonthISO(month: number, year: number, allowFiveWeeks: boolean = false): number[] {
  const weeks: number[] = [];
  const d = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
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
  
  // Limit to 4 weeks by default, allow 5 if explicitly requested
  const sorted = weeks.sort((a, b) => a - b);
  return allowFiveWeeks ? sorted : sorted.slice(0, 4);
}

function getStatusColor(entry: any, audits: any[]): string {
  if (entry.status === 'missed') return 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-400';
  if (entry.status === 'pending') return 'bg-muted/30 border-border';
  const audit = audits.find(a => a.schedule_entry_id === entry.id);
  if (!audit) return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'conforme') return 'bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-400';
  if (audit.status === 'nao_conforme') return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
  return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-400';
}

function getStatusLabel(entry: any, audits: any[]): string {
  if (entry.status === 'missed') return 'Não realizada';
  if (entry.status === 'pending') return 'Pendente';
  const audit = audits.find(a => a.schedule_entry_id === entry.id);
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
  const { userType, getEffectiveMinifabrica, currentUser } = useAuth();
  const effectiveSector = getEffectiveMinifabrica();
  const sectorFilter = userType === 'diretor' ? effectiveSector : null;
  const isAdmin = userType === 'administrativo';

  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [histMonth, setHistMonth] = useState(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const [histYear, setHistYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const [editEntry, setEditEntry] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ employee_id: '', checklist_id: '', day_of_week: 1 });
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleModel, setScheduleModel] = useState<any[]>([]);
  const [allowFiveWeeks, setAllowFiveWeeks] = useState(false);

  const { allUsers } = useAuth();
  const employees = allUsers;
  const { data: dbMachines = [] } = useMachines();
  const { data: dbChecklists = [] } = useChecklists();
  const { data: scheduleData = [] } = useScheduleEntries({ month, year });
  const { data: audits = [] } = useAudits({
    userRole: currentUser?.role,
    userId: currentUser?.id,
    userMinifabrica: currentUser?.minifabrica,
  });
  
  // Carregar modelos do banco - SEM filtro por enquanto para diagnosticar
  const { data: dbScheduleModels = [] } = useScheduleModels();
  
  useEffect(() => {
    console.log('🔍 DEBUG Models:', { 
      total: dbScheduleModels.length, 
      userType, 
      effectiveSector, 
      models: dbScheduleModels.map(m => ({ sector: m.sector, weekIndex: m.week_index, dayOfWeek: m.day_of_week }))
    });
  }, [dbScheduleModels, userType, effectiveSector]);
  
  // Log toda vez que modelos mudam
  useEffect(() => {
    console.log('📊 Schedule.tsx - Modelos carregados:', {
      total: dbScheduleModels.length,
      modelos: dbScheduleModels.map(m => ({ id: m.id, sector: m.sector, week: m.week_index, day: m.day_of_week }))
    });
  }, [dbScheduleModels]);
  
  const machines = dbMachines;
  const checklists = dbChecklists.map(c => ({ id: c.id, name: c.name, category: c.category, items: c.items.map(it => ({ id: it.id, question: it.question, explanation: it.explanation, type: it.type as 'ok_nok' | 'text' | 'number' })), createdAt: c.created_at }));
  
  const addBulkSchedule = useAddBulkScheduleEntries();
  const deleteScheduleEntry = useDeleteScheduleEntry();
  const updateScheduleEntry = useUpdateScheduleEntry();
  const addScheduleModel = useAddScheduleModel();

  // Sincronizar dados do Supabase com estado local
  useEffect(() => {
    if (scheduleData && scheduleData.length > 0) {
      // Converter snake_case para camelCase
      let transformed = (scheduleData as any[]).map(s => ({
        ...s,
        id: s.id,
        weekNumber: s.week_number,
        dayOfWeek: s.day_of_week,
        employeeId: s.employee_id,
        machineId: s.machine_id,
        checklistId: s.checklist_id,
        scheduledDate: s.scheduled_date,
        completedDate: s.completed_date,
      }));
      
      // Filtrar por minifábrica se o usuário é diretor ou administrativo
      if (currentUser?.minifabrica && (currentUser?.role === 'diretor' || currentUser?.role === 'administrativo')) {
        transformed = transformed.filter(s => (s as any).minifabrica === currentUser.minifabrica);
      }
      
      setSchedule(transformed);
    }
  }, [scheduleData, currentUser?.minifabrica, currentUser?.role]);

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
  const getEntrySector = useCallback((entry: any) => normalizeText(entry.sector || machineById.get(entry.machine_id)?.sector || ''), [machineById]);
  const getEntryMinifabrica = useCallback((entry: any) => normalizeText(entry.minifabrica || machineById.get(entry.machine_id)?.minifabrica || ''), [machineById]);

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

  const getDefaultMachineForSector = (sector?: string) => {
    const normalizedSector = normalizeText(sector);
    return machines.find(m => normalizeText(m.sector) === normalizedSector) || machines[0];
  };

  const handleGenerate = () => {
    console.log('🔵 Gerando cronograma');
    
    if (isAdmin) { 
      toast.error('❌ Apenas DIRETORES e GESTORES!'); 
      return; 
    }
    
    if (dbMachines.length === 0) { 
      toast.error('❌ Crie máquinas primeiro'); 
      return; 
    }
    
    if (dbChecklists.length === 0) { 
      toast.error('❌ Crie checklists primeiro'); 
      return; 
    }

    const existingForMonth = schedule.filter(s => s.month === month && s.year === year);
    if (existingForMonth.length > 0) {
      toast.error(`❌ Cronograma já existe. Clique "Limpar" primeiro.`);
      return;
    }

    const weeks = getWeeksOfMonthISO(month, year, allowFiveWeeks);
    let modelsToUse = dbScheduleModels;

    // Se não houver modelos, criar um modelo PADRÃO automático
    if (modelsToUse.length === 0) {
      console.log('⚠️ Nenhum modelo encontrado. Criando modelo padrão...');
      
      const availableEmployees = employees.slice(0, weeks.length);
      if (availableEmployees.length === 0) {
        toast.error('❌ Nenhum funcionário disponível');
        return;
      }

      // Modelo padrão: 1 funcionário por semana
      modelsToUse = weeks.map((week, idx) => ({
        id: `auto-${week}`,
        week_index: idx + 1,
        day_of_week: 1,
        employee_id: availableEmployees[idx % availableEmployees.length].id,
        sector: machinesFiltered[0]?.sector || '',
        minifabrica: machinesFiltered[0]?.minifabrica || '',
        checklist_id: '',
      }));
      
      console.log('📋 Modelo padrão criado:', modelsToUse.length, 'funcionários');
    }

    const entriesToCreate: any[] = [];
    const checklistAssignments = new Map<string, Set<string>>();

    // Agrupar máquinas por setor
    const machinesBySector = new Map<string, any[]>();
    machinesFiltered.forEach(m => {
      const sectorKey = normalizeText(m.sector || '');
      if (!machinesBySector.has(sectorKey)) {
        machinesBySector.set(sectorKey, []);
      }
      machinesBySector.get(sectorKey)!.push(m);
    });

    const sectorKeys = Array.from(machinesBySector.keys());
    const maxSectorsPerWeek = 5;

    const getWeekSectors = (weekIndex: number) => {
      if (sectorKeys.length <= maxSectorsPerWeek) return sectorKeys;
      const selected: string[] = [];
      for (let i = 0; i < maxSectorsPerWeek; i++) {
        const sectorIndex = ((weekIndex - 1) * maxSectorsPerWeek + i) % sectorKeys.length;
        selected.push(sectorKeys[sectorIndex]);
      }
      return selected;
    };

    // Para cada modelo (funcionário + semana)
    for (const model of modelsToUse) {
      const weekIndex = model.week_index || 1;
      if (weekIndex < 1 || weekIndex > weeks.length) continue;

      const weekNumber = weeks[weekIndex - 1];
      const employee = employees.find(e => e.id === model.employee_id);
      if (!employee) {
        console.warn(`⚠️ Funcionário não encontrado`);
        continue;
      }

      if (dbScheduleModels.length > 0) {
        const sectorKey = normalizeText(model.sector || '');
        const sectorMachines = machinesBySector.get(sectorKey);
        if (!sectorMachines || sectorMachines.length === 0) continue;

        const machine = sectorMachines[(model.day_of_week - 1) % sectorMachines.length] || sectorMachines[0];
        const checklist = dbChecklists.find(c => c.id === model.checklist_id) || dbChecklists[0];
        if (!checklist) continue;

        entriesToCreate.push({
          employee_id: employee.id,
          machine_id: machine.id,
          checklist_id: checklist.id,
          week_number: weekNumber,
          day_of_week: model.day_of_week || 1,
          month,
          year,
          status: 'pending',
          minifabrica: machine.minifabrica || '',
          sector: machine.sector || '',
        });
        continue;
      }

      const weekSectorKeys = getWeekSectors(weekIndex);
      for (const sectorKey of weekSectorKeys) {
        const machinesInSector = machinesBySector.get(sectorKey);
        if (!machinesInSector || machinesInSector.length === 0) continue;

        for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
          const machineIdx = (dayOfWeek - 1) % machinesInSector.length;
          const machine = machinesInSector[machineIdx];

          let validChecklists = dbChecklists.filter(c => 
            !c.category || c.category === machine.sector || c.category === 'geral'
          );
          if (validChecklists.length === 0) {
            validChecklists = dbChecklists;
          }

          const trackKey = `${employee.id}|${machine.sector}|${weekNumber}|${dayOfWeek}`;
          if (!checklistAssignments.has(trackKey)) {
            checklistAssignments.set(trackKey, new Set());
          }
          const usedChecklists = checklistAssignments.get(trackKey)!;

          const availableChecklists = validChecklists.filter(c => !usedChecklists.has(c.id));
          if (availableChecklists.length === 0) {
            usedChecklists.clear();
          }

          const checklist = availableChecklists[0] || validChecklists[0];
          if (checklist) {
            usedChecklists.add(checklist.id);
          }

          entriesToCreate.push({
            employee_id: employee.id,
            machine_id: machine.id,
            checklist_id: checklist.id,
            week_number: weekNumber,
            day_of_week: dayOfWeek,
            month,
            year,
            status: 'pending',
            minifabrica: machine.minifabrica || '',
            sector: machine.sector || '',
          });
        }
      }
    }

    if (entriesToCreate.length === 0) {
      toast.error('❌ Nada pra gerar');
      return;
    }

    console.log('✅ Enviando', entriesToCreate.length, 'entradas');
    
    addBulkSchedule.mutate(entriesToCreate, {
      onSuccess: (newEntries) => {
        if (newEntries && Array.isArray(newEntries)) {
          const transformed = newEntries.map(s => ({
            ...s,
            weekNumber: s.week_number,
            dayOfWeek: s.day_of_week,
            employeeId: s.employee_id,
            machineId: s.machine_id,
            checklistId: s.checklist_id,
            scheduledDate: s.scheduled_date,
            completedDate: s.completed_date,
          }));
          setSchedule(prev => [...prev, ...transformed]);
          toast.success(`✅ ${newEntries.length} auditorias geradas!`);
        }
      },
      onError: (e) => toast.error(`Erro: ${e.message}`),
    });
  };

  const handleClearSchedule = () => {
    const toDelete = schedule.filter(s => s.month === month && s.year === year);
    if (toDelete.length === 0) {
      toast.error(`Nenhum cronograma encontrado em ${MONTHS[month]}`);
      return;
    }

    if (!window.confirm(`Confirma deletar ${toDelete.length} entradas de ${MONTHS[month]}? Esta ação não pode ser desfeita!`)) {
      return;
    }

    // Deletar todas as entradas do mês
    let deletedCount = 0;
    const idsToDelete = new Set(toDelete.map(e => e.id));
    
    toDelete.forEach((entry) => {
      deleteScheduleEntry.mutate(entry.id, {
        onSuccess: () => {
          deletedCount++;
          // Remover do estado local
          setSchedule(prev => prev.filter(s => !idsToDelete.has(s.id)));
          
          if (deletedCount === toDelete.length) {
            toast.success(`Cronograma de ${MONTHS[month]} foi limpo!`);
          }
        }
      });
    });
  };

  const handleSaveModel = () => {
    if (!sectorFilter) {
      toast.error('❌ Selecione uma minifábrica');
      return;
    }

    if (scheduleModel.length === 0) {
      toast.error('❌ Nenhum modelo para salvar');
      return;
    }

    // Contar quantos modelos serão salvos
    const modelsToSave = scheduleModel.filter(m => normalizeText(m.sectorId) === normalizeText(sectorFilter));
    
    if (modelsToSave.length === 0) {
      toast.error('❌ Nenhum modelo para esta minifábrica');
      return;
    }

    // Mapear de sectorId normalizado para sector name
    const sectorInfo = sectors.find(s => normalizeText(s.id) === normalizeText(sectorFilter));
    const sectorName = sectorInfo?.name || sectorFilter;

    // Criar lista de modelos para salvar
    const modelsPayload = modelsToSave.map(model => ({
      name: `Semana ${model.weekIndex}`,
      description: `Auditoria - Semana ${model.weekIndex}`,
      minifabrica: sectorFilter,
      sector: sectorName,
      week_index: model.weekIndex,
      day_of_week: model.dayOfWeek,
      employee_id: model.employeeId,
      checklist_id: '', 
    }));

    let completedCount = 0;
    let successCount = 0;

    // Salvar cada modelo no banco
    modelsPayload.forEach((modelData, index) => {
      addScheduleModel.mutate(modelData as any, {
        onSuccess: () => {
          successCount++;
          completedCount++;
          
          if (completedCount === modelsPayload.length) {
            // Todos terminaram
            if (successCount === modelsPayload.length) {
              setScheduleModel([]); 
              toast.success(`✅ ${successCount} modelo(s) salvo(s)!`);
            } else {
              toast.error(`❌ ${modelsPayload.length - successCount} erro(s) ao salvar`);
            }
          }
        },
        onError: (error) => {
          completedCount++;
          console.error(`Erro ao salvar modelo ${index}:`, error);
          toast.error(`Erro ao salvar modelo ${index + 1}`);
          
          if (completedCount === modelsPayload.length) {
            // Todos terminaram
            if (successCount > 0) {
              setScheduleModel([]); 
              toast.success(`⚠️ ${successCount}/${modelsPayload.length} modelo(s) salvo(s)`);
            }
          }
        }
      });
    });
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

  const handleEditOpen = (entry: any) => {
    if (isAdmin) return;
    setEditEntry(entry);
    setEditForm({ employee_id: entry.employee_id, checklist_id: entry.checklist_id, day_of_week: entry.day_of_week });
  };

  const handleCreateOpen = (weekNumber: number, sectorId: string, dayOfWeek: number) => {
    if (isAdmin) return;
    const newEntry: any = {
      id: '',
      week_number: weekNumber,
      day_of_week: dayOfWeek,
      month,
      year,
      employee_id: '',
      machine_id: '',
      sector: sectorId,
      minifabrica: sectorFilter || '',
      checklist_id: '',
      status: 'pending' as const,
    };
    setEditEntry(newEntry);
    setEditForm({ employee_id: '', checklist_id: '', day_of_week: dayOfWeek });
  };

  const handleEditSave = () => {
    if (!editEntry) return;
    console.log('💾 handleEditSave - Salvando:', { editEntry: editEntry.id, editForm });
    
    if (!editForm.employee_id) {
      toast.error('Selecione um funcionário');
      return;
    }
    if (!editForm.checklist_id) {
      toast.error('Selecione um checklist');
      return;
    }
    if (!editEntry.id) {
      console.log('📝 Criando nova entrada');
      const defaultMachine = getDefaultMachineForSector(editEntry.sector || sectorFilter || '');
      if (!defaultMachine) {
        toast.error('Nenhuma máquina disponível');
        return;
      }

      // Criar novo via Supabase
      addBulkSchedule.mutate([{
        week_number: editEntry.week_number,
        day_of_week: editEntry.day_of_week,
        month: editEntry.month ?? month,
        year: editEntry.year ?? year,
        employee_id: editForm.employee_id,
        machine_id: editEntry.machine_id || defaultMachine.id,
        checklist_id: editForm.checklist_id,
        minifabrica: editEntry.minifabrica,
        sector: editEntry.sector,
        status: 'pending',
        scheduled_date: null,
        completed_date: null,
      }]);
      setEditEntry(null);
      toast.success('Entrada criada');
      return;
    }
    // Atualizar via Supabase
    console.log('🔄 Atualizando entrada:', {
      id: editEntry.id,
      employee_id: editForm.employee_id,
      checklist_id: editForm.checklist_id,
    });

    updateScheduleEntry.mutate({
      id: editEntry.id,
      employee_id: editForm.employee_id,
      checklist_id: editForm.checklist_id,
    } as any, {
      onSuccess: () => {
        console.log('✅ Entrada atualizada com sucesso');
        // Atualizar estado local imediatamente
        setSchedule(prev => prev.map(s => 
          s.id === editEntry.id 
            ? {
                ...s,
                employeeId: editForm.employee_id,
                checklistId: editForm.checklist_id,
                employee_id: editForm.employee_id,
                checklist_id: editForm.checklist_id,
              }
            : s
        ));
      }
    });
    setEditEntry(null);
  };

  const handleDelete = (id: string) => {
    if (isAdmin) return;
    deleteScheduleEntry.mutate(id);
    toast.success('Entrada removida');
  };

  const handlePrint = () => window.print();

  // Group entries by week -> sector (ONE ROW PER SECTOR - NO DUPLICATES)
  const groupByWeekSector = useCallback((entries: any[]) => {
    const weeks = [...new Set(entries.map(e => e.week_number))].sort((a, b) => a - b);
    return weeks.map(weekNum => {
      const weekEntries = entries.filter(e => e.week_number === weekNum);
      
      // Get unique sectors
      const uniqueSectorIds = Array.from(new Set(
        weekEntries
          .map(e => normalizeText(e.sector || ''))
          .filter(id => id.length > 0)
      ));
      
      // Create sectorRows - one per unique sector
      const sectorRows = uniqueSectorIds.map(sectorId => {
        const sector = sectors.find(s => normalizeText(s.id) === sectorId);
        const sectorEntries = weekEntries.filter(e => normalizeText(e.sector || '') === sectorId);
        const byDay: Record<number, any[]> = {};
        
        // Include days 1-6 and special levels 10, 11
        [...WEEK_DAYS.map(d => d.key), 10, 11].forEach(d => {
          byDay[d] = sectorEntries.filter(e => e.day_of_week === d);
        });
        
        return { sectorId, sectorName: sector?.name || 'N/A', byDay };
      });
      
      return { weekNum, sectorRows };
    });
  }, [sectors]);

  const grouped = useMemo(() => groupByWeekSector(filtered), [filtered, groupByWeekSector]);
  const histGrouped = useMemo(() => groupByWeekSector(histFiltered), [histFiltered, groupByWeekSector]);

  const renderCell = (entries: any[] | undefined, isHistory: boolean, weekNum?: number, sectorId?: string, dayKey?: number) => {
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
    weekGroups: { weekNum: number; sectorRows: { sectorId: string; sectorName: string; byDay: Record<number, any[]> }[] }[],
    isHistory: boolean
  ) => {
    if (weekGroups.length === 0) return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum cronograma para este período.</p>
          {!isHistory && !isAdmin && (
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={handleGenerate}>
                <Wand2 className="mr-2 h-4 w-4" />Gerar Cronograma
              </Button>
            </div>
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
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <Checkbox
                id="five-weeks"
                checked={allowFiveWeeks}
                onCheckedChange={(checked) => setAllowFiveWeeks(checked as boolean)}
              />
              <Label htmlFor="five-weeks" className="text-sm font-medium cursor-pointer mb-0">
                Usar 5 semanas
              </Label>
            </div>
            {!isAdmin && (
              <>
                <Button variant="outline" onClick={handleGenerate}>
                  <Wand2 className="mr-2 h-4 w-4" />Gerar Automático
                </Button>
                <Button variant="destructive" onClick={handleClearSchedule}>
                  Limpar Cronograma
                </Button>
              </>
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
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <Checkbox
                id="five-weeks-hist"
                checked={allowFiveWeeks}
                onCheckedChange={(checked) => setAllowFiveWeeks(checked as boolean)}
              />
              <Label htmlFor="five-weeks-hist" className="text-sm font-medium cursor-pointer mb-0">
                Usar 5 semanas
              </Label>
            </div>
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
          <div className="flex flex-wrap gap-2 mb-4 no-print">
            <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <Checkbox
                id="five-weeks-model"
                checked={allowFiveWeeks}
                onCheckedChange={(checked) => setAllowFiveWeeks(checked as boolean)}
              />
              <Label htmlFor="five-weeks-model" className="text-sm font-medium cursor-pointer mb-0">
                Usar 5 semanas
              </Label>
            </div>
            <Button onClick={handleSaveModel} className="ml-auto">
              <Save className="mr-2 h-4 w-4" />Salvar Modelo
            </Button>
            <Button variant="outline" onClick={handleClearModel}>
              Limpar Modelo
            </Button>
          </div>
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
                    {getWeeksOfMonthISO(month, year, allowFiveWeeks).map((w, wIdx) => (
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
              <p className="text-xs text-amber-600 mt-2">💡 Dica: Você não precisa salvar modelo. Basta clicar em "Gerar Cronograma" que o sistema cria automaticamente!</p>
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
              <Select value={String(editForm.day_of_week)} onValueChange={v => setEditForm(f => ({ ...f, day_of_week: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEK_DAYS.map(d => <SelectItem key={d.key} value={String(d.key)}>{d.label}</SelectItem>)}
                  {editForm.day_of_week === 10 && <SelectItem value="10">Nível 02 Semanal</SelectItem>}
                  {editForm.day_of_week === 11 && <SelectItem value="11">Demais Níveis</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funcionário</Label>
              <Select value={editForm.employee_id} onValueChange={v => setEditForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Checklist</Label>
              <Select value={editForm.checklist_id} onValueChange={v => setEditForm(f => ({ ...f, checklist_id: v }))}>
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
