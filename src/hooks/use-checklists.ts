import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  question: string;
  explanation: string;
  type: string;
  sort_order: number;
}

export interface Checklist {
  id: string;
  name: string;
  category: string;
  minifabrica: string;
  created_at: string;
  items: ChecklistItem[];
}

interface RawChecklist {
  id: string;
  name: string;
  category: string;
  minifabrica: string;
  created_at: string;
  checklist_items: ChecklistItem[];
}

export function useChecklists() {
  return useQuery({
    queryKey: ['checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklists')
        .select('*, checklist_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []) as unknown as RawChecklist[]).map(c => ({
        ...c,
        items: (c.checklist_items || []).sort((a, b) => a.sort_order - b.sort_order),
      })) as Checklist[];
    },
  });
}

export function useAddChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; category: string; minifabrica?: string; items: { question: string; explanation: string; type: string }[] }) => {
      const { data: ck, error } = await supabase
        .from('checklists')
        .insert({ name: input.name, category: input.category, minifabrica: input.minifabrica || '' })
        .select()
        .single();
      if (error) throw error;

      if (input.items.length > 0) {
        const itemRows = input.items.map((it, i) => ({
          checklist_id: ck.id,
          question: it.question,
          explanation: it.explanation,
          type: it.type,
          sort_order: i,
        }));
        const { error: itemErr } = await supabase.from('checklist_items').insert(itemRows);
        if (itemErr) throw itemErr;
      }
      return ck;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist criado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar checklist'),
  });
}

export function useUpdateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; category: string; items: { question: string; explanation: string; type: string }[] }) => {
      const { error } = await supabase
        .from('checklists')
        .update({ name: input.name, category: input.category })
        .eq('id', input.id);
      if (error) throw error;

      // Delete old items & re-insert
      await supabase.from('checklist_items').delete().eq('checklist_id', input.id);
      if (input.items.length > 0) {
        const itemRows = input.items.map((it, i) => ({
          checklist_id: input.id,
          question: it.question,
          explanation: it.explanation,
          type: it.type,
          sort_order: i,
        }));
        const { error: itemErr } = await supabase.from('checklist_items').insert(itemRows);
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist atualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar checklist'),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const [{ data: linkedAudit }, { data: linkedScheduleEntry }, { data: linkedModel }] = await Promise.all([
        supabase.from('audits').select('id').eq('checklist_id', id).limit(1),
        supabase.from('schedule_entries').select('id').eq('checklist_id', id).limit(1),
        supabase.from('schedule_model').select('id').eq('checklist_id', id).limit(1),
      ]);

      if (linkedAudit?.length) {
        throw new Error('Não é possível excluir o checklist porque existem auditorias vinculadas a ele. Exclua ou atualize essas auditorias primeiro.');
      }
      if (linkedScheduleEntry?.length) {
        throw new Error('Não é possível excluir o checklist porque ele está usado em cronogramas. Exclua primeiro os cronogramas relacionados.');
      }
      if (linkedModel?.length) {
        throw new Error('Não é possível excluir o checklist porque ele está usado em modelos de cronograma. Remova esse modelo primeiro.');
      }

      const { error } = await supabase.from('checklists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklists'] });
      toast.success('Checklist removido');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover'),
  });
}
