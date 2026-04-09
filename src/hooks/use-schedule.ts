import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScheduleEntry {
  id: string;
  week_number: number;
  day_of_week: number;
  month: number;
  year: number;
  employee_id: string;
  machine_id: string;
  checklist_id: string;
  minifabrica: string;
  sector: string;
  status: 'pending' | 'completed' | 'missed' | 'rescheduled';
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleModel {
  id: string;
  name: string;
  description: string;
  minifabrica: string;
  sector: string;
  week_index: number;
  day_of_week: number;
  checklist_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useScheduleEntries(filters?: {
  month?: number;
  year?: number;
  employee_id?: string;
  machine_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['schedule-entries', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('schedule_entries')
        .select('*');

      if (filters?.month !== undefined && filters?.month !== null) query = query.eq('month' as any, filters.month);
      if (filters?.year !== undefined && filters?.year !== null) query = query.eq('year' as any, filters.year);
      if (filters?.employee_id) query = query.eq('employee_id' as any, filters.employee_id);
      if (filters?.machine_id) query = query.eq('machine_id' as any, filters.machine_id);
      if (filters?.status) query = query.eq('status' as any, filters.status);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAddScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any)
        .from('schedule_entries')
        .insert(entry as any)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-entries'] });
      toast.success('Cronograma criado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar cronograma'),
  });
}

export function useAddBulkScheduleEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: Omit<ScheduleEntry, 'id' | 'created_at' | 'updated_at'>[]) => {
      console.log('📤 useAddBulkScheduleEntries: enviando', entries.length, 'entradas', entries);
      const { data, error } = await (supabase as any)
        .from('schedule_entries')
        .insert(entries as any)
        .select();

      if (error) {
        console.error('❌ useAddBulkScheduleEntries error:', error);
        throw new Error(error.message || error.details || 'Erro ao criar cronogramas');
      }
      
      console.log('✅ useAddBulkScheduleEntries: sucesso, recebeu', data?.length, 'entradas');
      return data as any[];
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['schedule-entries'] });
      toast.success(`${data.length} cronograma(s) criado(s)`);
    },
    onError: (e: any) => {
      console.error('❌ useAddBulkScheduleEntries onError:', e);
      toast.error(e.message || 'Erro ao criar cronogramas');
    }
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<ScheduleEntry>) => {
      console.log('📝 Supabase update com:', { id, updates });
      const { error } = await (supabase as any)
        .from('schedule_entries')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw new Error(error.message || error.details || 'Erro ao atualizar');
      }
      console.log('✅ Supabase update sucesso');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-entries'] });
      toast.success('Cronograma atualizado');
    },
    onError: (e: any) => {
      console.error('❌ Mutation error:', e);
      toast.error(e.message || 'Erro ao atualizar cronograma');
    },
  });
}

export function useDeleteScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('schedule_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-entries'] });
      toast.success('Cronograma removido');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover cronograma'),
  });
}

export function useDeleteScheduleByMonth() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { month: number; year: number }) => {
      const { error } = await (supabase as any)
        .from('schedule_entries')
        .delete()
        .eq('month' as any, params.month)
        .eq('year' as any, params.year);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-entries'] });
      toast.success('Cronograma do mês removido');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover cronograma'),
  });
}

export function useScheduleModels(filters?: {
  minifabrica?: string;
  sector?: string;
}) {
  return useQuery({
    queryKey: ['schedule-models', filters],
    queryFn: async () => {
      console.log('🔵 useScheduleModels: iniciando query com filtros:', filters);
      
      let query = (supabase as any)
        .from('schedule_model')
        .select('*');

      if (filters?.minifabrica) {
        console.log('📍 Filtrando por minifabrica:', filters.minifabrica);
        query = query.eq('minifabrica' as any, filters.minifabrica);
      }
      if (filters?.sector) {
        console.log('📍 Filtrando por sector:', filters.sector);
        query = query.eq('sector' as any, filters.sector);
      }

      const { data, error } = await query.order('week_index', { ascending: true });

      if (error) {
        console.error('❌ useScheduleModels error:', error);
        throw error;
      }
      
      console.log('🟢 useScheduleModels: retornou', data?.length || 0, 'modelos', data);
      return (data || []) as any[];
    },
  });
}

export function useAddScheduleModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (model: Omit<ScheduleModel, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      console.log('🔵 useAddScheduleModel: iniciando com dados:', model);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      console.log('👤 Usuário autenticado:', user.user.id);

      const { data, error } = await (supabase as any)
        .from('schedule_model')
        .insert({
          ...model,
          created_by: user.user.id,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('❌ useAddScheduleModel error:', error);
        throw error;
      }
      
      console.log('🟢 useAddScheduleModel: modelo criado com sucesso:', data);
      return data as any;
    },
    onSuccess: (data) => {
      console.log('🟢 useAddScheduleModel onSuccess: invalidando queries');
      qc.invalidateQueries({ queryKey: ['schedule-models'] });
      toast.success('✅ Modelo de cronograma criado!');
    },
    onError: (e: any) => {
      console.error('❌ useAddScheduleModel onError:', e);
      toast.error(`❌ ${e.message || 'Erro ao criar modelo'}`);
    }
  });
}

export function useDeleteScheduleModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('schedule_model')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule-models'] });
      toast.success('Modelo removido');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover modelo'),
  });
}
