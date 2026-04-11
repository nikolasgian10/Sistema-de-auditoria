// Minifábricas - the main organizational units
export const MINIFABRICAS = [
  { id: 'MFASC', name: 'MFASC - Anéis sem cobertura' },
  { id: 'MFAN', name: 'MFAN - Aço nitretado' },
  { id: 'MFPA', name: 'MFPA - Produtos de aço' },
  { id: 'MFBA', name: 'MFBA - Buchas e arruelas' },
  { id: 'MFBR', name: 'MFBR - Bronzinas' },
  { id: 'MFBL', name: 'MFBL - Blanks' },
  { id: 'FERR', name: 'Ferramentaria' },
  { id: 'MFACC', name: 'MFACC - Anéis com cobertura' },
  { id: 'LOG', name: 'Logística' },
  { id: 'RH', name: 'RH' },
  { id: 'QC', name: 'Qualidade Central' },
] as const;

// Default sectors per minifábrica - can be customized
export const DEFAULT_SECTORS_PER_MINIFABRICA: Record<string, string[]> = {
  'MFASC': ['Fundição', 'Usinagem', 'Acabamento', 'Montagem'],
  'MFAN': ['Nitretação', 'Usinagem', 'Controle de Qualidade'],
  'MFPA': ['Fundição', 'Usinagem', 'Tratamento Térmico', 'Acabamento'],
  'MFBA': ['Estamparia', 'Usinagem', 'Montagem'],
  'MFBR': ['Fundição', 'Centrifugação', 'Usinagem', 'Acabamento', 'Controle de Qualidade'],
  'MFBL': ['Corte', 'Estamparia', 'Tratamento Térmico'],
  'FERR': ['Usinagem', 'Eletroerosão', 'Retífica', 'Montagem'],
  'MFACC': ['Fundição', 'Usinagem', 'Cobertura', 'Acabamento'],
  'LOG': ['Recebimento', 'Expedição', 'Almoxarifado'],
  'RH': ['Administração', 'Treinamento'],
  'QC': ['Laboratório', 'Metrologia', 'Inspeção'],
};

export function getMinifabricaName(id: string): string {
  return MINIFABRICAS.find(m => m.id === id)?.name || id;
}

export const DEFAULT_SECTORS_PER_WEEK_FOR_MINIFABRICA: Record<string, number> = {
  'MFASC': 5,
  'MFAN': 5,
  'MFPA': 5,
  'MFBA': 5,
  'MFBR': 5,
  'MFBL': 5,
  'FERR': 5,
  'MFACC': 5,
  'LOG': 5,
  'RH': 5,
  'QC': 5,
};

export function getSectorsForMinifabrica(minifabricaId: string): string[] {
  // Check localStorage for custom sectors first
  try {
    const custom = localStorage.getItem(`lpa_sectors_${minifabricaId}`);
    if (custom) return JSON.parse(custom);
  } catch {}
  return DEFAULT_SECTORS_PER_MINIFABRICA[minifabricaId] || [];
}

export function setSectorsForMinifabrica(minifabricaId: string, sectors: string[]) {
  localStorage.setItem(`lpa_sectors_${minifabricaId}`, JSON.stringify(sectors));
}

export function getSectorsPerWeekForMinifabrica(minifabricaId: string): number {
  try {
    const custom = localStorage.getItem(`lpa_sectors_per_week_${minifabricaId}`);
    const value = custom ? Number(custom) : NaN;
    if (Number.isFinite(value) && value > 0) return Math.max(1, Math.min(7, value));
  } catch {}
  return DEFAULT_SECTORS_PER_WEEK_FOR_MINIFABRICA[minifabricaId] || 5;
}

export function setSectorsPerWeekForMinifabrica(minifabricaId: string, count: number) {
  localStorage.setItem(`lpa_sectors_per_week_${minifabricaId}`, String(Math.max(1, Math.min(7, count))));
}
