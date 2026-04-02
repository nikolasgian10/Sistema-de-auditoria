// LPA Audit System - In-memory store with localStorage persistence
// No more mock data - production ready

export interface Machine {
  id: string;
  name: string;
  code: string;
  sector: string;
  minifabrica: string;
  description: string;
  createdAt: string;
}

export interface Sector {
  id: string;
  name: string;
}

export interface ChecklistItem {
  id: string;
  question: string;
  explanation: string;
  type: 'ok_nok' | 'text' | 'number';
}

export interface Checklist {
  id: string;
  name: string;
  category: string;
  items: ChecklistItem[];
  createdAt: string;
}

export interface ScheduleEntry {
  id: string;
  weekNumber: number;
  dayOfWeek: number;
  month: number;
  year: number;
  employeeId: string;
  machineId: string;
  sectorId: string;
  minifabricaId: string;
  checklistId: string;
  status: 'pending' | 'completed' | 'missed';
}

export interface ScheduleModelEntry {
  id: string;
  weekIndex: number;
  dayOfWeek: number;
  sectorId: string;
  employeeId: string;
}

export interface AuditAnswer {
  checklistItemId: string;
  answer: string;
  conformity: 'ok' | 'nok' | 'na';
}

export interface AuditRecord {
  id: string;
  scheduleEntryId: string;
  employeeId: string;
  machineId: string;
  checklistId: string;
  date: string;
  answers: AuditAnswer[];
  observations: string;
  photos: string[];
  status: 'conforme' | 'nao_conforme' | 'parcial';
  createdAt: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

function normalizeText(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeSector(value?: string | null): string {
  return normalizeText(value);
}

function normalizeMinifabrica(value?: string | null): string {
  return normalizeText(value);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const x = Math.sin(seed + i) * 10000;
    const j = Math.floor((x - Math.floor(x)) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function formatSectorName(value?: string | null): string {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// --- Store API ---
export const store = {
  // Sectors (derived from machines for a given minifábrica)
  getSectors: (minifabricaId?: string): Sector[] => {
    const machines = store.getMachines();
    const filtered = minifabricaId
      ? machines.filter(m => normalizeMinifabrica(m.minifabrica) === normalizeMinifabrica(minifabricaId))
      : machines;

    const sectorMap = new Map<string, string>();
    filtered.forEach(m => {
      const normalized = normalizeSector(m.sector);
      if (normalized && !sectorMap.has(normalized)) {
        sectorMap.set(normalized, formatSectorName(m.sector));
      }
    });

    return Array.from(sectorMap.entries()).map(([id, name]) => ({ id, name }));
  },

  // Schedule Model
  getScheduleModel: (): ScheduleModelEntry[] => load('lpa_schedule_model', []),
  saveScheduleModel: (data: ScheduleModelEntry[]) => save('lpa_schedule_model', data),

  // Machines
  getMachines: (): Machine[] => load('lpa_machines', []),
  saveMachines: (data: Machine[]) => save('lpa_machines', data),
  addMachine: (m: Omit<Machine, 'id' | 'createdAt'>): Machine => {
    const machines = store.getMachines();
    const newMachine: Machine = { ...m, id: generateId(), createdAt: new Date().toISOString().split('T')[0] };
    machines.push(newMachine);
    store.saveMachines(machines);
    return newMachine;
  },
  updateMachine: (id: string, m: Partial<Machine>) => {
    const machines = store.getMachines().map(x => x.id === id ? { ...x, ...m } : x);
    store.saveMachines(machines);
  },
  deleteMachine: (id: string) => {
    store.saveMachines(store.getMachines().filter(x => x.id !== id));
  },

  // Checklists
  getChecklists: (): Checklist[] => load('lpa_checklists', []),
  saveChecklists: (data: Checklist[]) => save('lpa_checklists', data),
  addChecklist: (c: Omit<Checklist, 'id' | 'createdAt'>): Checklist => {
    const checklists = store.getChecklists();
    const newChecklist: Checklist = { ...c, id: generateId(), createdAt: new Date().toISOString().split('T')[0] };
    checklists.push(newChecklist);
    store.saveChecklists(checklists);
    return newChecklist;
  },
  updateChecklist: (id: string, c: Partial<Checklist>) => {
    const checklists = store.getChecklists().map(x => x.id === id ? { ...x, ...c } : x);
    store.saveChecklists(checklists);
  },
  deleteChecklist: (id: string) => {
    store.saveChecklists(store.getChecklists().filter(x => x.id !== id));
  },

  // Auditor Order (per sector)
  getAuditorOrder: (sector: string): string[] => load(`lpa_auditor_order_${sector}`, []),
  setAuditorOrder: (sector: string, order: string[]) => save(`lpa_auditor_order_${sector}`, order),

  // Yearly Auditor Matrix
  getYearlyAuditorMatrix: (sector: string, year: number): Record<number, Record<number, string>> =>
    load(`lpa_auditor_matrix_${sector}_${year}`, {}),
  setYearlyAuditorMatrix: (sector: string, year: number, matrix: Record<number, Record<number, string>>) =>
    save(`lpa_auditor_matrix_${sector}_${year}`, matrix),

  // Week Templates
  getWeekTemplates: (sector: string): Record<number, string[]> =>
    load(`lpa_week_templates_${sector}`, {}),
  setWeekTemplates: (sector: string, templates: Record<number, string[]>) =>
    save(`lpa_week_templates_${sector}`, templates),

  // Schedule Locations
  getScheduleLocations: (sector: string): string[] =>
    load(`lpa_schedule_locations_${sector}`, []),
  setScheduleLocations: (sector: string, locations: string[]) =>
    save(`lpa_schedule_locations_${sector}`, locations),

  // Location Pattern
  getLocationPattern: (sector: string): number[] =>
    load(`lpa_location_pattern_${sector}`, [1, 2, 2, 1]),
  setLocationPattern: (sector: string, pattern: number[]) =>
    save(`lpa_location_pattern_${sector}`, pattern),

  // Schedule
  getSchedule: (): ScheduleEntry[] => load('lpa_schedule', []),
  saveSchedule: (data: ScheduleEntry[]) => save('lpa_schedule', data),

  generateSchedule: (month: number, year: number, minifabricaId?: string, sector?: string, machinesData?: any[], checklistsData?: any[], scheduleModelData?: ScheduleModelEntry[]): ScheduleEntry[] => {
    // Use provided data (from Supabase) or fallback to localStorage
    const machines = machinesData || store.getMachines();
    const checklists = checklistsData || store.getChecklists();
    const scheduleModel = scheduleModelData || store.getScheduleModel();
    console.log('generateSchedule input:', { month, year, minifabricaId, sector, machinesCount: machines.length, checklistsCount: checklists.length, scheduleModelCount: scheduleModel.length });
    
    if (checklists.length === 0 || machines.length === 0) {
      console.log('Sem checklists ou máquinas');
      return [];
    }

    const entries: ScheduleEntry[] = [];
    const weeks = getWeeksOfMonthISO(month, year);
    const monthWeeks = weeks;

    let filteredMachines = machines;
    if (minifabricaId) {
      filteredMachines = filteredMachines.filter(m => normalizeMinifabrica(m.minifabrica) === normalizeMinifabrica(minifabricaId));
    }
    if (sector) {
      const normalizedSector = normalizeSector(sector);
      filteredMachines = filteredMachines.filter(m => normalizeSector(m.sector) === normalizedSector);
    }

    console.log('Filtered machines:', filteredMachines.length);

    const sectors = [...new Set(filteredMachines.map(m => normalizeSector(m.sector)).filter(Boolean))];
    console.log('Sectors found:', sectors);

    if (sectors.length === 0) {
      console.log('Nenhum setor encontrado');
      return [];
    }

    const modelByWeek: Record<number, ScheduleModelEntry[]> = {};
    scheduleModel.forEach(m => {
      if (m.weekIndex >= 0 && m.weekIndex < monthWeeks.length) {
        const weekList = modelByWeek[m.weekIndex] || [];
        weekList.push(m);
        modelByWeek[m.weekIndex] = weekList;
      }
    });

    monthWeeks.forEach((weekNumber, weekIdx) => {
      const weekModel = modelByWeek[weekIdx] || [];

      // For random sector order by week (to vary where each funcionario audits)
      const sectorOrder = seededShuffle(sectors, weekIdx);

      if (weekModel.length > 0) {
        // Use the fixed model to map employee -> day + sector
        weekModel.forEach(modelItem => {
          const sectorId = normalizeSector(modelItem.sectorId);
          const sectorMachines = filteredMachines.filter(m => normalizeSector(m.sector) === sectorId);
          if (sectorMachines.length === 0) return;

          const machine = sectorMachines[weekIdx % sectorMachines.length];
          const checklist = checklists[(weekIdx + modelItem.dayOfWeek - 1) % checklists.length];

          entries.push({
            id: generateId(),
            weekNumber,
            dayOfWeek: modelItem.dayOfWeek,
            month,
            year,
            employeeId: modelItem.employeeId,
            machineId: machine.id,
            sectorId,
            minifabricaId: normalizeMinifabrica(minifabricaId || machine.minifabrica || ''),
            checklistId: checklist.id,
            status: 'pending',
          });
        });
      } else {
        // fallback: auto-generate based on sector order and machines
        sectorOrder.forEach((sectorId, dayIndex) => {
          if (dayIndex >= 5) return; // Mondays to Fridays
          const sectorMachines = filteredMachines.filter(m => normalizeSector(m.sector) === sectorId);
          if (sectorMachines.length === 0) return;
          const machine = sectorMachines[weekIdx % sectorMachines.length];
          const checklist = checklists[(weekIdx + dayIndex) % checklists.length];

          entries.push({
            id: generateId(),
            weekNumber,
            dayOfWeek: dayIndex + 1,
            month,
            year,
            employeeId: '',
            machineId: machine.id,
            sectorId,
            minifabricaId: normalizeMinifabrica(minifabricaId || machine.minifabrica || ''),
            checklistId: checklist.id,
            status: 'pending',
          });
        });
      }
    });

    console.log('Total entries created:', entries.length);
    const uniqueMap = new Map<string, ScheduleEntry>();
    entries.forEach(entry => {
      const key = `${entry.weekNumber}-${entry.sectorId}-${entry.dayOfWeek}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, entry);
      }
    });

    const uniqueEntries = Array.from(uniqueMap.values());
    console.log('Total entries after dedupe:', uniqueEntries.length);

    const existing = store.getSchedule().filter(e => !(e.month === month && e.year === year));
    store.saveSchedule([...existing, ...uniqueEntries]);
    return uniqueEntries;
  },

  addScheduleEntry: (data: Omit<ScheduleEntry, 'id'>): ScheduleEntry => {
    const schedule = store.getSchedule();
    const newEntry: ScheduleEntry = { ...data, id: generateId() };
    schedule.push(newEntry);
    store.saveSchedule(schedule);
    return newEntry;
  },

  updateScheduleEntry: (id: string, data: Partial<ScheduleEntry>) => {
    const schedule = store.getSchedule().map(e => e.id === id ? { ...e, ...data } : e);
    store.saveSchedule(schedule);
  },
  deleteScheduleEntry: (id: string) => {
    store.saveSchedule(store.getSchedule().filter(e => e.id !== id));
  },

  // Audits
  getAudits: (): AuditRecord[] => load('lpa_audits', []),
  saveAudits: (data: AuditRecord[]) => save('lpa_audits', data),
  addAudit: (a: Omit<AuditRecord, 'id' | 'createdAt'>): AuditRecord => {
    const audits = store.getAudits();
    const newAudit: AuditRecord = { ...a, id: generateId(), createdAt: new Date().toISOString() };
    audits.push(newAudit);
    store.saveAudits(audits);
    store.updateScheduleEntry(a.scheduleEntryId, { status: 'completed' });
    return newAudit;
  },
};

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeeksOfMonthISO(month: number, year: number): number[] {
  const weeks: number[] = [];
  const d = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  while (d <= lastDay) {
    const w = getISOWeekNumber(d);
    if (!weeks.includes(w)) weeks.push(w);
    d.setDate(d.getDate() + 1);
  }
  return weeks.sort((a, b) => a - b);
}

export { getWeekOfMonth, getISOWeekNumber, getWeeksOfMonthISO };
