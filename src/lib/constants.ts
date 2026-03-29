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
