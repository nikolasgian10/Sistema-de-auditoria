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

// --- Store API ---
export const store = {
  // Sectors (derived from machines for a given minifábrica)
  getSectors: (minifabricaId?: string): Sector[] => {
    const machines = store.getMachines();
    const filtered = minifabricaId ? machines.filter(m => m.minifabrica === minifabricaId) : machines;
    const sectorNames = [...new Set(filtered.map(m => m.sector).filter(Boolean))];
    return sectorNames.map(name => ({ id: name, name }));
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

  generateSchedule: (month: number, year: number, minifabricaId?: string, sector?: string): ScheduleEntry[] => {
    const checklists = store.getChecklists();
    const allMachines = store.getMachines();

    if (checklists.length === 0) return [];

    const sectorKey = sector || '_all';
    const weekTemplates = store.getWeekTemplates(sectorKey);
    const scheduleLocations = store.getScheduleLocations(sectorKey);

    let filteredMachines = allMachines;
    if (minifabricaId) filteredMachines = filteredMachines.filter(m => m.minifabrica === minifabricaId);
    if (sector) filteredMachines = filteredMachines.filter(m => m.sector === sector);

    const locationIds = scheduleLocations.length > 0
      ? scheduleLocations
      : filteredMachines.map(m => m.id);

    if (locationIds.length === 0) return [];

    const entries: ScheduleEntry[] = [];
    const weeks = getWeeksOfMonthISO(month, year);
    const monthWeeks = weeks.slice(0, 5);

    monthWeeks.forEach((weekNumber, weekIdx) => {
      const templateWeekNum = (weekIdx % 5) + 1;
      const weekAuditors = weekTemplates[templateWeekNum] || [];

      if (weekAuditors.length === 0) return;

      const numAuditors = Math.min(weekAuditors.length, 5);
      const numLocations = locationIds.length;
      const numChecklists = checklists.length;

      const weekAssigned = new Set<string>();

      for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
        const dayKey = dayIdx + 1;

        for (let slot = 0; slot < numAuditors; slot++) {
          const auditorId = weekAuditors[slot];
          const locationOffset = (weekIdx * numAuditors + dayIdx * numAuditors + slot) % numLocations;
          const locationId = locationIds[locationOffset];

          let checklistId = '';
          for (let ckAttempt = 0; ckAttempt < numChecklists; ckAttempt++) {
            const candidateCkIdx = (dayIdx + slot + ckAttempt + weekIdx) % numChecklists;
            const candidateId = checklists[candidateCkIdx].id;
            const key = `${auditorId}-${candidateId}-${locationId}`;
            if (!weekAssigned.has(key)) {
              checklistId = candidateId;
              weekAssigned.add(key);
              break;
            }
          }

          if (!checklistId) {
            checklistId = checklists[(dayIdx + slot) % numChecklists].id;
          }

          const machine = allMachines.find(m => m.id === locationId);

          entries.push({
            id: generateId(),
            weekNumber,
            dayOfWeek: dayKey,
            month,
            year,
            employeeId: auditorId,
            machineId: locationId,
            sectorId: sector || machine?.sector || '',
            minifabricaId: minifabricaId || machine?.minifabrica || '',
            checklistId,
            status: 'pending',
          });
        }
      }
    });

    const existing = store.getSchedule().filter(e => !(e.month === month && e.year === year));
    const all = [...existing, ...entries];
    store.saveSchedule(all);
    return entries;
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
