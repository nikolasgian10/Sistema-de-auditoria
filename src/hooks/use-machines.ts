import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Machine {
  id: string;
  name: string;
  code: string;
  sector: string;
  minifabrica: string;
  description: string;
  created_at: string;
}

export function useMachines() {
  return useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Machine[];
    },
  });
}

export function useAddMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (machine: Omit<Machine, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('machines')
        .insert(machine)
        .select()
        .single();
      if (error) throw error;
      return data as Machine;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Máquina cadastrada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao cadastrar máquina'),
  });
}

export function useUpdateMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Machine> & { id: string }) => {
      const { error } = await supabase.from('machines').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Máquina atualizada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  });
}

export function useDeleteMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Máquina removida');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover'),
  });
}
