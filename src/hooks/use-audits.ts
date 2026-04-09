import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuditItem {
  checklist_item_id: string;
  answer: string;
  conformity: 'ok' | 'nok' | 'na';
}

export interface Audit {
  id: string;
  schedule_entry_id: string;
  employee_id: string;
  machine_id: string;
  checklist_id: string;
  minifabrica: string;
  date: string;
  observations: string;
  status: 'pendente' | 'conforme' | 'nao_conforme' | 'parcial';
  conformity_percentage: number;
  created_at: string;
  created_by: string;
}

export interface AuditWithDetails extends Audit {
  answers: AuditItem[];
  attachments: Array<{
    id: string;
    file_path: string;
    file_name: string;
    file_size: number;
    file_type: string;
    created_at: string;
  }>;
}

export function useAudits(filters?: {
  userRole?: 'gestor' | 'diretor' | 'administrativo';
  userId?: string;
  userMinifabrica?: string | null;
}) {
  return useQuery({
    queryKey: ['audits', filters?.userRole, filters?.userId, filters?.userMinifabrica],
    queryFn: async () => {
      let query = (supabase as any)
        .from('audits')
        .select(`
          *,
          audit_answers(*),
          audit_attachments(*)
        `);

      // Apply role-based filters
      if (filters?.userRole === 'administrativo' && filters?.userId) {
        // Administrativo can only see their own audits
        query = query.eq('employee_id', filters.userId);
      } else if (filters?.userRole === 'diretor' && filters?.userMinifabrica) {
        // Diretor can see audits from their minifabrica
        query = query.eq('minifabrica', filters.userMinifabrica);
      }
      // Gestor can see all audits (no filter)

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAuditById(auditId: string | null) {
  return useQuery({
    queryKey: ['audit', auditId],
    queryFn: async () => {
      if (!auditId) return null;
      const { data, error } = await (supabase as any)
        .from('audits')
        .select(`
          *,
          audit_answers(*),
          audit_attachments(*)
        `)
        .eq('id', auditId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!auditId,
  });
}

export function useAddAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      schedule_entry_id: string;
      employee_id: string;
      machine_id: string;
      checklist_id: string;
      minifabrica: string;
      date: string;
      observations: string;
      answers: AuditItem[];
      photos: string[]; // base64 encoded
      status: 'conforme' | 'nao_conforme' | 'parcial';
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Recalculate status based on answers to ensure consistency
      const anyNok = input.answers.some(a => a.conformity === 'nok');
      const anyNA = input.answers.some(a => a.conformity === 'na');
      const allOk = input.answers.every(a => a.conformity === 'ok');
      
      let calculatedStatus: 'conforme' | 'nao_conforme' | 'parcial';
      if (anyNok) {
        calculatedStatus = 'nao_conforme';
      } else if (allOk) {
        calculatedStatus = 'conforme';
      } else {
        calculatedStatus = 'parcial';
      }

      // Create audit
      const { data: audit, error: auditError } = await (supabase as any)
        .from('audits')
        .insert({
          schedule_entry_id: input.schedule_entry_id,
          employee_id: input.employee_id,
          machine_id: input.machine_id,
          checklist_id: input.checklist_id,
          minifabrica: input.minifabrica,
          date: input.date,
          observations: input.observations,
          status: calculatedStatus,
          conformity_percentage: 0,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (auditError) throw auditError;

      // Insert answers
      if (input.answers.length > 0) {
        const answerRows = input.answers.map(a => ({
          audit_id: audit.id,
          checklist_item_id: a.checklist_item_id,
          answer: a.answer,
          conformity: a.conformity,
        }));
        const { error: answerErr } = await (supabase as any)
          .from('audit_answers')
          .insert(answerRows as any);
        if (answerErr) throw answerErr;
      }

      // Upload photos
      if (input.photos.length > 0) {
        for (let i = 0; i < input.photos.length; i++) {
          const photo = input.photos[i];
          const base64Data = photo.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }

          const fileName = `audit-${audit.id}-photo-${i + 1}.jpg`;
          const filePath = `audits/${audit.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('audit-photos')
            .upload(filePath, bytes, { contentType: 'image/jpeg' });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('audit-photos')
            .getPublicUrl(filePath);

          // Insert attachment record with public URL
          await (supabase as any).from('audit_attachments').insert({
            audit_id: audit.id,
            file_path: urlData.publicUrl, // Store the full public URL
            file_name: fileName,
            file_size: bytes.length,
            file_type: 'image/jpeg',
            uploaded_by: user.user.id,
          });
        }
      }

      // Update schedule_entry status to completed if it exists
      if (input.schedule_entry_id) {
        const { error: schedError } = await (supabase as any)
          .from('schedule_entries')
          .update({ status: 'completed', completed_date: new Date().toISOString() })
          .eq('id', input.schedule_entry_id);
        
        if (schedError) console.error('Erro ao atualizar schedule_entry:', schedError);
      }

      return audit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'], exact: false });
      qc.invalidateQueries({ queryKey: ['schedule-entries'], exact: false });
      toast.success('Auditoria salva com sucesso');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar auditoria'),
  });
}

export function useUpdateAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      observations?: string;
      status?: string;
      answers?: AuditItem[];
    }) => {
      // Calculate status based on answers if provided
      let finalStatus = input.status;
      if (input.answers && input.answers.length > 0) {
        const anyNok = input.answers.some(a => a.conformity === 'nok');
        const anyNA = input.answers.some(a => a.conformity === 'na');
        const allOk = input.answers.every(a => a.conformity === 'ok');
        
        if (anyNok) {
          finalStatus = 'nao_conforme';
        } else if (allOk) {
          finalStatus = 'conforme';
        } else {
          finalStatus = 'parcial';
        }
      }

      const { data, error } = await (supabase as any)
        .from('audits')
        .update({
          observations: input.observations,
          status: finalStatus,
        })
        .eq('id', input.id);

      if (error) throw error;

      // Update answers if provided
      if (input.answers) {
        await (supabase as any).from('audit_answers').delete().eq('audit_id', input.id);
        if (input.answers.length > 0) {
          const answerRows = input.answers.map(a => ({
            audit_id: input.id,
            checklist_item_id: a.checklist_item_id,
            answer: a.answer,
            conformity: a.conformity,
          }));
          const { error: answerErr } = await (supabase as any)
            .from('audit_answers')
            .insert(answerRows);
          if (answerErr) throw answerErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'], exact: false });
      toast.success('Auditoria atualizada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar auditoria'),
  });
}

export function useDeleteAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete attachments from storage
      const { data: files, error: listError } = await supabase.storage
        .from('audit-photos')
        .list(`audits/${id}`);

      if (!listError && files) {
        for (const file of files) {
          await supabase.storage
            .from('audit-photos')
            .remove([`audits/${id}/${file.name}`]);
        }
      }

      // Delete audit (cascade will handle audit_answers and audit_attachments)
      const { error } = await (supabase as any).from('audits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audits'], exact: false });
      toast.success('Auditoria removida');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover auditoria'),
  });
}

export function useAuditsByScheduleEntry(scheduleEntryId: string) {
  return useQuery({
    queryKey: ['audits', scheduleEntryId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('audits')
        .select(`
          *,
          audit_answers(*),
          audit_attachments(*)
        `)
        .eq('schedule_entry_id' as any, scheduleEntryId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
    },
  });
}
