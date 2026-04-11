import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMachines } from '@/hooks/use-machines';
import { useChecklists } from '@/hooks/use-checklists';
import { useScheduleEntries, useAddBulkScheduleEntries, useDeleteScheduleEntry, useDeleteScheduleByMonth, useUpdateScheduleEntry, useScheduleModels, useAddScheduleModel, useAddBulkScheduleModels, useDeleteScheduleModels } from '@/hooks/use-schedule';
import { useAudits } from '@/hooks/use-audits';
import { useAuth } from '@/lib/auth';
import { getSectorsForMinifabrica, getSectorsPerWeekForMinifabrica, setSectorsPerWeekForMinifabrica } from '@/lib/constants';
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

const normalizeText = (value?: string | null): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N} ]+/gu, '')
    .trim()
    .toLowerCase();
};

const SECTOR_ALIAS_MAP: Record<string, string> = {
  'chanfreadora': 'chanfradeira',
  'chanfreadera': 'chanfradeira',
  'chanfradeira': 'chanfradeira',
  'inspecao final': 'inspecao final',
  'inspeccao final': 'inspecao final',
  'prensa curvar': 'prensa curvar',
  'prensa ressalto': 'prensa ressalto',
  'estampa furo': 'estampa furo',
  'brochadeira': 'brochadeira',
  'fresa canal': 'fresa canal',
  'mandrila': 'mandrila',
};

const normalizeSector = (value?: string | null): string => {
  const normalized = normalizeText(value);
  return SECTOR_ALIAS_MAP[normalized] || normalized;
};

const findBestSectorKey = (desired: string, availableKeys: string[]): string => {
  const normalizedDesired = normalizeSector(desired);
  if (availableKeys.includes(normalizedDesired)) return normalizedDesired;

  const desiredWords = normalizedDesired.split(' ').filter(Boolean);
  if (desiredWords.length === 0) return normalizedDesired;

  // Match candidate by containing same words or being a close subset.
  const exactCandidate = availableKeys.find(key => {
    const normalizedKey = normalizeSector(key);
    const keyWords = normalizedKey.split(' ').filter(Boolean);
    return desiredWords.every(w => keyWords.includes(w)) || keyWords.every(w => desiredWords.includes(w));
  });
  if (exactCandidate) return exactCandidate;

  const partialCandidate = availableKeys.find(key => {
    const normalizedKey = normalizeSector(key);
    return desiredWords.some(word => normalizedKey.includes(word)) || normalizedKey.includes(normalizedDesired);
  });
  return partialCandidate || normalizedDesired;
};

function getWeeksOfMonthISO(month: number, year: number, allowFiveWeeks: boolean = false): number[] {
  // Special case for Abril 2026: usar os quatro códigos de semana fixos desejados.
  if (month === 3 && year === 2026 && !allowFiveWeeks) {
    return [14, 15, 16, 17];
  }

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
  if (allowFiveWeeks) return sorted;
  return sorted.length > 4 ? sorted.slice(0, 4) : sorted;
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

function getCustomWeekSectorGroups(month: number, year: number, orderedSectorKeys: string[], sectorsPerWeek: number) {
  const april2026 = [
    ['estampa furo', 'prensa curvar', 'inspeção final', 'fresa canal', 'mandrila'],
    ['brochadeira', 'prensa ressalto', 'prensa curvar', 'mandrila', 'estampa furo'],
    ['fresa canal', 'brochadeira', 'estampa furo', 'chanfradeira', 'prensa ressalto'],
    ['chanfradeira', 'mandrila', 'brochadeira', 'inspeção final', 'fresa canal'],
  ];
  const normalizedGroups = april2026.map(group => group.map(normalizeSector));
  const april2026Template = month === 3 && year === 2026 && sectorsPerWeek === 5;
  const availableSectorKeys = orderedSectorKeys.map(normalizeSector);

  if (april2026Template) {
    return normalizedGroups.map(group => group.map(sector => findBestSectorKey(sector, availableSectorKeys)));
  }

  const requiredSectors = new Set(normalizedGroups.flat());
  const availableSectors = new Set(availableSectorKeys);
  const hasAllSectors = [...requiredSectors].every(sector => availableSectors.has(sector));

  if (hasAllSectors) {
    return normalizedGroups;
  }

  return null;
}

const getPositionKey = (positionIndex: number) => `onde-${positionIndex}`;
const getPositionLabel = (positionIndex: number) => `Onde ${positionIndex}`;
const parsePositionIndex = (value: string) => {
  const match = String(value).match(/(?:onde|position)[-_ ]?(\d+)/i);
  return match ? Number(match[1]) : null;
};

export default function Schedule() {
  const now = new Date();
  const { userType, getEffectiveMinifabrica, currentUser } = useAuth();
  const effectiveSector = getEffectiveMinifabrica();
  const sectorFilter = (userType === 'diretor' || userType === 'gestor') ? effectiveSector : null;
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

  const defaultSectorsPerWeek = useMemo(
    () => currentUser?.minifabrica ? getSectorsPerWeekForMinifabrica(currentUser.minifabrica) : 5,
    [currentUser?.minifabrica]
  );
  const [sectorsPerWeek, setSectorsPerWeek] = useState(defaultSectorsPerWeek);

  useEffect(() => {
    setSectorsPerWeek(defaultSectorsPerWeek);
  }, [defaultSectorsPerWeek]);

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
  
  const { data: dbScheduleModels = [] } = useScheduleModels(sectorFilter ? { minifabrica: sectorFilter } : undefined);

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

  useEffect(() => {
    if (!sectorFilter) return;
    setScheduleModel(dbScheduleModels.map(model => ({
      id: model.id,
      weekIndex: model.week_index,
      dayOfWeek: model.day_of_week,
      sectorId: normalizeSector(model.sector),
      employeeId: model.employee_id,
      checklistId: model.checklist_id,
    })));
  }, [dbScheduleModels, sectorFilter]);
  
  const machines = dbMachines;
  const getChecklistLevel = (checklist: any) => {
    if (checklist.level) return checklist.level;
    const needle = normalizeText(checklist.category || checklist.name || '');
    if (needle.includes('nível 02') || needle.includes('nivel 2') || needle.includes('nivel02') || needle.includes('nivel2')) {
      return '2';
    }
    if (needle.includes('demais') || needle.includes('outros') || needle.includes('outro') || needle.includes('nivel 3') || needle.includes('nivel3')) {
      return 'other';
    }
    return '1';
  };

  const checklists = dbChecklists.map(c => ({
    id: c.id,
    name: c.name,
    category: c.category,
    level: c.level || getChecklistLevel(c),
    items: c.items.map(it => ({ id: it.id, question: it.question, explanation: it.explanation, type: it.type as 'ok_nok' | 'text' | 'number' })),
    createdAt: c.created_at,
  }));

  const isLevel2Checklist = (checklist: any) => getChecklistLevel(checklist) === '2';
  const isOtherLevelChecklist = (checklist: any) => getChecklistLevel(checklist) === 'other';

  const getChecklistCandidates = (machineSector: string, dayOfWeek: number) => {
    let candidates = checklists.filter(c => {
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        return !isLevel2Checklist(c) && !isOtherLevelChecklist(c) && (!c.category || c.category === machineSector || c.category === 'geral');
      }
      if (dayOfWeek === 10) {
        return isLevel2Checklist(c) || c.category === 'geral';
      }
      if (dayOfWeek === 11) {
        return isOtherLevelChecklist(c) || c.category === 'geral';
      }
      return true;
    });
    if (candidates.length === 0) {
      candidates = checklists;
    }
    return candidates;
  };

    const checklistUsageBySector = new Map<string, Set<string>>();
    const auditorChecklistCount = new Map<string, Map<string, number>>();

    const pickChecklist = (employeeId: string, sectorKey: string, validChecklists: any[]) => {
      const usedSet = checklistUsageBySector.get(sectorKey) || new Set<string>();
      const available = validChecklists.filter(c => !usedSet.has(c.id));
      const candidates = available.length > 0 ? available : validChecklists;

      let best = candidates[0];
      let bestCount = Number(auditorChecklistCount.get(employeeId)?.get(best.id) || 0);

      for (const checklist of candidates) {
        const count = Number(auditorChecklistCount.get(employeeId)?.get(checklist.id) || 0);
        if (count < bestCount) {
          best = checklist;
          bestCount = count;
        }
      }

      if (!checklistUsageBySector.has(sectorKey)) {
        checklistUsageBySector.set(sectorKey, new Set());
      }
      checklistUsageBySector.get(sectorKey)!.add(best.id);

      if (!auditorChecklistCount.has(employeeId)) {
        auditorChecklistCount.set(employeeId, new Map());
      }
      const employeeCounts = auditorChecklistCount.get(employeeId)!;
      employeeCounts.set(best.id, (employeeCounts.get(best.id) || 0) + 1);

      return best;
    };
  const deleteScheduleEntry = useDeleteScheduleEntry();
  const deleteScheduleByMonth = useDeleteScheduleByMonth();
  const updateScheduleEntry = useUpdateScheduleEntry();
  const addScheduleModel = useAddScheduleModel();
  const deleteScheduleModels = useDeleteScheduleModels();
  const addBulkSchedule = useAddBulkScheduleEntries();
  const addBulkScheduleModel = useAddBulkScheduleModels();

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
      const normalized = normalizeSector(m.sector);
      if (normalized && !sectorMap.has(normalized)) {
        sectorMap.set(normalized, String(m.sector || '').trim());
      }
    });
    return Array.from(sectorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [machines]);

  const machinesFiltered = sectorFilter ? machines.filter(m => normalizeText(m.minifabrica) === normalizeText(sectorFilter)) : machines;
  const employeesFiltered = sectorFilter ? employees.filter(e => normalizeText(e.minifabrica) === normalizeText(sectorFilter)) : employees;

  const orderedSectorKeys = useMemo(() => {
    const defaultSectorOrder = currentUser?.minifabrica
      ? getSectorsForMinifabrica(currentUser.minifabrica).map(normalizeText).filter(Boolean)
      : [];

    const sectorKeys = Array.from(new Set(machinesFiltered.map(m => normalizeSector(m.sector || '')).filter(Boolean)));
    if (defaultSectorOrder.length > 0) {
      return [...new Set([
        ...defaultSectorOrder.filter(key => sectorKeys.includes(key)),
        ...sectorKeys.filter(key => !defaultSectorOrder.includes(key)),
      ])];
    }

    return [...sectorKeys].sort((a, b) => {
      const aSector = sectors.find(s => normalizeSector(s.id) === a);
      const bSector = sectors.find(s => normalizeSector(s.id) === b);
      if (aSector && bSector) return aSector.name.localeCompare(bSector.name, 'pt', { sensitivity: 'base' });
      if (aSector) return -1;
      if (bSector) return 1;
      return a.localeCompare(b, 'pt', { sensitivity: 'base' });
    });
  }, [machinesFiltered, currentUser?.minifabrica, sectors]);

  const customWeekSectors = useMemo(
    () => getCustomWeekSectorGroups(month, year, orderedSectorKeys, sectorsPerWeek),
    [month, year, orderedSectorKeys, sectorsPerWeek]
  );

  const getWeekSectors = useCallback((weekIndex: number) => {
    if (orderedSectorKeys.length === 0) return [];
    if (customWeekSectors) {
      return Array.from(new Set(customWeekSectors[weekIndex - 1] || []));
    }

    const selected: string[] = [];
    const start = ((weekIndex - 1) * sectorsPerWeek) % orderedSectorKeys.length;
    for (let i = 0; i < sectorsPerWeek; i++) {
      selected.push(orderedSectorKeys[(start + i) % orderedSectorKeys.length]);
    }
    return Array.from(new Set(selected));
  }, [orderedSectorKeys, customWeekSectors, sectorsPerWeek]);

  const machineById = useMemo(() => new Map(machines.map(m => [m.id, m])), [machines]);
  const getEntrySector = useCallback((entry: any) => normalizeSector(entry.sector || machineById.get(entry.machine_id)?.sector || ''), [machineById]);
  const getEntryMinifabrica = useCallback((entry: any) => normalizeText(entry.minifabrica || machineById.get(entry.machine_id)?.minifabrica || ''), [machineById]);

  const modelForSector = useMemo(() => {
    if (!sectorFilter) return scheduleModel;
    const normalizedFilter = normalizeSector(sectorFilter);
    return scheduleModel.filter(m => normalizeSector(m.sectorId) === normalizedFilter);
  }, [scheduleModel, sectorFilter]);

  const modelWeekIndex = useMemo(() => {
    const weeks = getWeeksOfMonthISO(month, year, allowFiveWeeks);
    return weeks.length > 0 ? 1 : undefined;
  }, [month, year, allowFiveWeeks]);

  const modelWeekLabel = useMemo(() => {
    const weeks = getWeeksOfMonthISO(month, year, allowFiveWeeks);
    return weeks.length > 0 ? weeks[0] : undefined;
  }, [month, year, allowFiveWeeks]);

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
      const normalizedSectorId = normalizeSector(m.sectorId || '');
      if (!normalizedSectorId) return;
      bySector.set(normalizedSectorId, (bySector.get(normalizedSectorId) || 0) + 1);
    });
    const sectorRanking = [...bySector.entries()]
      .map(([id, count]) => ({ sector: sectors.find(s => normalizeSector(s.id) === id), count }))
      .filter(r => r.sector)
      .sort((a, b) => b.count - a.count);

    return { total: allMissed.length, allMissed, auditorRanking, sectorRanking };
  }, [visibleSchedule, employees, sectors]);

  const getDefaultMachineForSector = (sector?: string) => {
    const normalizedSector = normalizeSector(sector);
    return machines.find(m => normalizeSector(m.sector) === normalizedSector) || machines[0];
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
    const useAprilTemplateSectors = month === 3 && year === 2026 && !allowFiveWeeks;
    const hasScheduleModel = dbScheduleModels.length > 0;
    const modelsByWeek = new Map<number, any[]>();

    if (useAprilTemplateSectors) {
      console.log('🔧 Usando template fixo de Abril 2026 para gerar os setores corretamente');
    }

    if (hasScheduleModel) {
      const deduped = new Map<string, any>();
      dbScheduleModels.forEach(model => {
        const weekIndex = model.week_index || 1;
        if (weekIndex < 1 || weekIndex > weeks.length) return;
        const positionKey = `${normalizeSector(model.sector)}|${weekIndex}|${model.day_of_week}`;
        if (deduped.has(positionKey)) return;
        deduped.set(positionKey, model);
      });

      Array.from(deduped.values()).forEach(model => {
        const weekIndex = model.week_index || 1;
        const weekList = modelsByWeek.get(weekIndex) || [];
        weekList.push(model);
        modelsByWeek.set(weekIndex, weekList);
      });

      const modelWeekIndexes = Array.from(modelsByWeek.keys()).sort((a, b) => a - b);
      if (modelWeekIndexes.length === 1 && modelWeekIndexes[0] === 1) {
        const week1Models = modelsByWeek.get(1) || [];
        for (let replicatedWeek = 2; replicatedWeek <= weeks.length; replicatedWeek++) {
          modelsByWeek.set(replicatedWeek, week1Models.map(model => ({ ...model, week_index: replicatedWeek })));
        }
      }
    }

    const entriesToCreate: any[] = [];
    const checklistAssignments = new Map<string, Set<string>>();

    // Agrupar máquinas por setor
    const machinesBySector = new Map<string, any[]>();
    machinesFiltered.forEach(m => {
      const sectorKey = normalizeSector(m.sector || '');
      if (!machinesBySector.has(sectorKey)) {
        machinesBySector.set(sectorKey, []);
      }
      machinesBySector.get(sectorKey)!.push(m);
    });

    const maxSectorsPerWeek = sectorsPerWeek;

    const normalizeWeekSectors = (previous: string[] | null, current: string[]) => {
      if (!previous || previous.length === 0) return current;
      if (previous[previous.length - 1] === current[0]) {
        return [...current.slice(1), current[0]];
      }
      return current;
    };

    const sortedAuditors = [...employees].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id), 'pt', { sensitivity: 'base' }));
    const auditorIds = sortedAuditors.map(e => e.id);
    if (auditorIds.length === 0) {
      toast.error('❌ Nenhum funcionário disponível');
      return;
    }

    const getAuditorsForDay = (dayOfWeek: number) => {
      const selected: string[] = [];
      const start = ((dayOfWeek - 1) * maxSectorsPerWeek) % auditorIds.length;
      for (let i = 0; i < maxSectorsPerWeek; i++) {
        selected.push(auditorIds[(start + i) % auditorIds.length]);
      }
      return selected;
    };

    if (hasScheduleModel) {
      for (const [weekIndex, weekModels] of modelsByWeek.entries()) {
        const weekNumber = weeks[weekIndex - 1];
        if (!weekNumber) continue;

        const weekSectorKeys = getWeekSectors(weekIndex);
        if (!weekSectorKeys || weekSectorKeys.length === 0) continue;

        for (const model of weekModels) {
          const employee = employees.find(e => e.id === model.employee_id);
          if (!employee) {
            console.warn(`⚠️ Funcionário não encontrado no modelo`);
            continue;
          }

          const positionIndex = parsePositionIndex(model.sector || '') || 0;
          let sectorKey = normalizeSector(model.sector || '');
          if (positionIndex > 0) {
            sectorKey = weekSectorKeys[(positionIndex - 1) % weekSectorKeys.length];
          }

          const sectorMachines = machinesBySector.get(sectorKey);
          if (!sectorMachines || sectorMachines.length === 0) continue;

          const machine = sectorMachines[(model.day_of_week - 1) % sectorMachines.length] || sectorMachines[0];
          const validChecklists = getChecklistCandidates(machine.sector || '', model.day_of_week || 1);
          const checklist = validChecklists.length > 0 ? pickChecklist(employee.id, sectorKey, validChecklists) : dbChecklists[0];
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
        }
      }
    } else {
      let previousWeekSectors: string[] | null = null;
      const isApril2026Template = month === 3 && year === 2026 && !allowFiveWeeks && sectorsPerWeek === 5;
      for (let weekIndex = 1; weekIndex <= weeks.length; weekIndex++) {
        const weekNumber = weeks[weekIndex - 1];
        let weekSectorKeys = getWeekSectors(weekIndex);
        if (!customWeekSectors) {
          weekSectorKeys = normalizeWeekSectors(previousWeekSectors, weekSectorKeys);
          previousWeekSectors = weekSectorKeys;
        }
        if (!weekSectorKeys || weekSectorKeys.length === 0) continue;

        weekSectorKeys.forEach((sectorKey, sectorPosition) => {
          const machinesInSector = machinesBySector.get(sectorKey);
          if (!machinesInSector || machinesInSector.length === 0) return;

          if (isApril2026Template) {
            const machineIdx = (weekIndex - 1) % machinesInSector.length;
            const machine = machinesInSector[machineIdx];
            const dayOfWeek = sectorPosition + 1;
            const employeeIdsForDay = getAuditorsForDay(dayOfWeek);
            const employeeId = employeeIdsForDay[sectorPosition % employeeIdsForDay.length];

            const validChecklists = getChecklistCandidates(machine.sector || '', dayOfWeek);
            const checklist = validChecklists.length > 0 ? pickChecklist(employeeId, sectorKey, validChecklists) : dbChecklists[0];
            if (!checklist) return;

            entriesToCreate.push({
              employee_id: employeeId,
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
            return;
          }

          for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
            const machineIdx = (weekIndex - 1) % machinesInSector.length;
            const machine = machinesInSector[machineIdx];
            const employeeIdsForDay = getAuditorsForDay(dayOfWeek);
            const employeeId = employeeIdsForDay[sectorPosition % employeeIdsForDay.length];

            const validChecklists = getChecklistCandidates(machine.sector || '', dayOfWeek);
            const checklist = validChecklists.length > 0 ? pickChecklist(employeeId, sectorKey, validChecklists) : dbChecklists[0];

            entriesToCreate.push({
              employee_id: employeeId,
              machine_id: machine.id,
              checklist_id: checklist?.id || dbChecklists[0]?.id || '',
              week_number: weekNumber,
              day_of_week: dayOfWeek,
              month,
              year,
              status: 'pending',
              minifabrica: machine.minifabrica || '',
              sector: machine.sector || '',
            });
          }
        });
      }
    }

    if (entriesToCreate.length === 0) {
      toast.error('❌ Nada pra gerar');
      return;
    }

    const uniqueEntries = Array.from(new Map(entriesToCreate.map(entry => [
      `${entry.week_number}|${entry.day_of_week}|${entry.machine_id}`,
      entry,
    ])).values());

    if (uniqueEntries.length !== entriesToCreate.length) {
      console.log('⚠️ Duplicated entries were removed:', entriesToCreate.length - uniqueEntries.length);
    }

    console.log('✅ Enviando', uniqueEntries.length, 'entradas');
    
    addBulkSchedule.mutate(uniqueEntries, {
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

    // Deletar todas as entradas do mês no banco
    deleteScheduleByMonth.mutate({ month, year }, {
      onSuccess: () => {
        setSchedule(prev => prev.filter(s => !(s.month === month && s.year === year)));
      },
      onError: (error) => {
        toast.error(error?.message || 'Erro ao limpar cronograma do mês');
      }
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

    if (!modelWeekIndex) {
      toast.error('❌ Semana do modelo não encontrada');
      return;
    }

    const modelsToSave = scheduleModel.filter(m => m.weekIndex === modelWeekIndex);
    if (modelsToSave.length === 0) {
      toast.error('❌ Nenhum modelo para esta semana');
      return;
    }

    const incomplete = modelsToSave.filter(m => !m.employeeId);
    if (incomplete.length > 0) {
      toast.error('❌ Preencha auditor em todas as células antes de salvar');
      return;
    }

    const getDefaultChecklistId = (dayOfWeek: number) => {
      if (dbChecklists.length === 0) return '';
      return dbChecklists[(dayOfWeek - 1) % dbChecklists.length]?.id || dbChecklists[0].id;
    };

    const modelsPayload = modelsToSave.map(model => ({
      name: `Semana ${model.weekIndex} - ${getPositionLabel(parsePositionIndex(model.sectorId) || 0)}`,
      description: `Auditor para dia ${model.dayOfWeek}`,
      minifabrica: sectorFilter,
      sector: model.sectorId,
      week_index: model.weekIndex,
      day_of_week: model.dayOfWeek,
      employee_id: model.employeeId,
      checklist_id: model.checklistId || getDefaultChecklistId(model.dayOfWeek),
    }));

    deleteScheduleModels.mutate({ minifabrica: sectorFilter, week_index: modelWeekIndex }, {
      onSuccess: () => {
        addBulkScheduleModel.mutate(modelsPayload, {
          onSuccess: (createdModels: any[]) => {
            setScheduleModel(prev => {
              const filtered = prev.filter(m => m.weekIndex !== modelWeekIndex);
              const saved = (createdModels || []).map(model => ({
                id: model.id,
                weekIndex: model.week_index,
                dayOfWeek: model.day_of_week,
                sectorId: normalizeSector(model.sector),
                employeeId: model.employee_id,
                checklistId: model.checklist_id,
              }));
              return [...filtered, ...saved];
            });
          },
          onError: (error) => {
            console.error('Erro ao salvar modelos:', error);
            toast.error(`❌ Erro ao salvar modelo: ${error?.message || 'Requisição abortada'}`);
          }
        });
      },
      onError: (error) => {
        console.error('Erro ao limpar modelos antigos:', error);
        toast.error(`❌ Erro ao limpar modelos antigos: ${error?.message || 'Falha'}`);
      }
    });
  };

  const handleClearModel = () => {
    if (!modelWeekIndex) {
      toast.error('❌ Semana do modelo não encontrada');
      return;
    }
    setScheduleModel(prev => prev.filter(m => m.weekIndex !== modelWeekIndex));
    toast.success('Modelo limpo para esta semana.');
  };

  const handleModelChange = (weekIndex: number, dayOfWeek: number, employeeId: string, positionKey?: string) => {
    if (!positionKey) return;
    setScheduleModel(prev => {
      const existingIndex = prev.findIndex(m => m.weekIndex === weekIndex && m.dayOfWeek === dayOfWeek && m.sectorId === positionKey);
      const nextModel = existingIndex >= 0 ? { ...prev[existingIndex], employeeId } : {
        id: Math.random().toString(36).substring(2, 11),
        weekIndex,
        dayOfWeek,
        sectorId: positionKey,
        employeeId,
        checklistId: '',
      };

      if (!nextModel.employeeId) {
        if (existingIndex === -1) return prev;
        return prev.filter((_, i) => i !== existingIndex);
      }

      if (existingIndex >= 0) {
        return prev.map((m, i) => i === existingIndex ? nextModel : m);
      }
      return [...prev, nextModel];
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
    return weeks.map((weekNum, weekIdx) => {
      const weekEntries = entries.filter(e => e.week_number === weekNum);
      
      // Get unique sectors
      let uniqueSectorIds = Array.from(new Set(
        weekEntries
          .map(e => normalizeSector(e.sector || ''))
          .filter(id => id.length > 0)
      ));

      const weekOrder = getWeekSectors(weekIdx + 1);
      if (weekOrder && weekOrder.length > 0) {
        uniqueSectorIds = [...uniqueSectorIds].sort((a, b) => {
          const aIndex = weekOrder.indexOf(a);
          const bIndex = weekOrder.indexOf(b);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      }
      
      // Create sectorRows - one per unique sector
      const sectorRows = uniqueSectorIds.map(sectorId => {
        const sector = sectors.find(s => normalizeSector(s.id) === sectorId);
        const sectorEntries = weekEntries.filter(e => normalizeSector(e.sector || '') === sectorId);
        const byDay: Record<number, any[]> = {};
        
        // Include days 1-6 and special levels 10, 11
        [...WEEK_DAYS.map(d => d.key), 10, 11].forEach(d => {
          byDay[d] = sectorEntries.filter(e => e.day_of_week === d);
        });
        
        return { sectorId, sectorName: sector?.name || 'N/A', byDay };
      });
      
      return { weekNum, sectorRows };
    });
  }, [sectors, getWeekSectors]);

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
          {(userType === 'diretor' || userType === 'gestor') && <TabsTrigger value="model">Modelo</TabsTrigger>}
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
              <Label className="text-sm font-medium mb-0">Setores/semana</Label>
              <Select value={String(sectorsPerWeek)} onValueChange={(v) => {
                const count = Number(v);
                setSectorsPerWeek(count);
                if (currentUser?.minifabrica) {
                  setSectorsPerWeekForMinifabrica(currentUser.minifabrica, count);
                }
              }}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7].map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                      const setor = sectors.find(s => normalizeSector(s.id) === normalizeSector(entry.sectorId || ''));
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
          <div className="px-3 pb-2 text-xs text-green-700">
            💾 Modelo salvo fica disponível para gerar outros meses na mesma minifábrica.
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
                      <th className="border p-2">Nível 02</th>
                      <th className="border p-2">Demais Níveis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[modelWeekIndex].filter(Boolean).map((w, wIdx) => (
                      Array.from({ length: sectorsPerWeek }, (_, idx) => idx + 1).map((positionIndex, pIdx) => (
                        <tr key={`${w}-${positionIndex}`}>
                          {pIdx === 0 && <td rowSpan={sectorsPerWeek} className="border p-2 bg-gray-100 font-bold text-center align-middle">{w}</td>}
                          <td className="border p-2 bg-gray-50 font-semibold">{getPositionLabel(positionIndex)} {modelWeekLabel ? `(Semana ${modelWeekLabel})` : ''}</td>
                          {[1, 2, 3, 4, 5, 6, 10, 11].map(d => {
                            const positionKey = getPositionKey(positionIndex);
                            const cellModel = scheduleModel.find(m => m.weekIndex === w && m.dayOfWeek === d && m.sectorId === positionKey);
                            return (
                              <td key={d} className="border p-1">
                                <Select value={cellModel?.employeeId || ''} onValueChange={v => handleModelChange(w, d, v, positionKey)}>
                                  <SelectTrigger className="h-7 text-[9px]"><SelectValue placeholder="Auditor" /></SelectTrigger>
                                  <SelectContent>{employeesFiltered.map(e => <SelectItem key={e.id} value={e.id}>{e.name.split(' ')[0]}</SelectItem>)}</SelectContent>
                                </Select>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-amber-600 mt-2">💡 Dica: Este é um modelo de apenas uma semana. Ao gerar, ele será replicado para as demais semanas do mês.</p>
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
