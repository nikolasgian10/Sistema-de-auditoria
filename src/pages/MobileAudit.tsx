import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useMachines, Machine } from '@/hooks/use-machines';
import { useChecklists, Checklist } from '@/hooks/use-checklists';
import { useScheduleEntries } from '@/hooks/use-schedule';
import { useAddAudit } from '@/hooks/use-audits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, CheckCircle2, XCircle, Send, ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';

type Stage = 'scan' | 'selectSchedule' | 'selectChecklist' | 'checklist' | 'done';

interface LPAAnswer {
  checklistItemId: string;
  answer: string;
  conformity: 'ok' | 'nok' | 'na';
  actionImmediate: boolean;
  escalate: boolean;
  responsible: string;
}

export default function MobileAudit() {
  const { currentUser, authUser } = useAuth();
  const location = useLocation();
  const [stage, setStage] = useState<Stage>('scan');
  const [sector, setSector] = useState<string | null>(null);
  const [minifabrica, setMinifabrica] = useState<string | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [scheduleEntryId, setScheduleEntryId] = useState<string | null>(null);
  const [schedulesForSector, setSchedulesForSector] = useState<any[]>([]);
  const [answers, setAnswers] = useState<LPAAnswer[]>([]);
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [auditorName, setAuditorName] = useState('');
  const [turno, setTurno] = useState('');
  const [auditadoRE, setAuditadoRE] = useState('');
  const [auditadoNome, setAuditadoNome] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);

  const { data: allMachines = [] } = useMachines();
  const { data: allChecklists = [] } = useChecklists();
  const { data: scheduleEntries = [] } = useScheduleEntries({ status: 'pending' });
  const addAuditMutation = useAddAudit();

  // Se vindo de MyAudits, recebe setor e scheduleEntryId
  useEffect(() => {
    const state = location.state as any;
    if (state?.sector && state?.scheduleEntryId) {
      setSector(state.sector);
      setMinifabrica(state.minifabrica);
      setScheduleEntryId(state.scheduleEntryId);
      setStage('scan');
    }
  }, [location.state]);

  const stopScanner = async () => {
    try { const scanner = html5QrRef.current; if (scanner && scanner.isScanning) await scanner.stop(); } catch {}
    html5QrRef.current = null; setScanning(false);
  };

  useEffect(() => { return () => { const scanner = html5QrRef.current; if (scanner && scanner.isScanning) scanner.stop().catch(() => {}); }; }, []);

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrRef.current = scanner;
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 },
        (decodedText: string) => { handleQrResult(decodedText); stopScanner(); }, () => {});
    } catch { toast.error('Não foi possível acessar a câmera.'); html5QrRef.current = null; setScanning(false); }
  };

  const handleQrResult = (text: string) => { const parts = text.split(':'); loadMachine(parts.length === 3 ? parts[2] : text); };

  const handleManualEntry = () => {
    const found = allMachines.find(m => m.id === manualCode || m.code.toLowerCase() === manualCode.toLowerCase());
    if (found) loadMachine(found.id); else toast.error('Máquina não encontrada');
  };

  const loadMachine = (machineId: string) => {
    const m = allMachines.find(x => x.id === machineId);
    if (!m) { toast.error('Máquina não encontrada'); return; }
    
    // Se tem setor pré-definido (vindo de MyAudits), valida se máquina é do setor
    if (sector && m.sector !== sector) {
      toast.error(`Máquina deve ser do setor ${sector}`);
      return;
    }
    
    setMachine(m);
    setScheduleEntryId(null);
    
    // Busca auditorias programadas para o setor (ou máquina se não tem setor)
    const sectorToSearch = sector || m.sector;
    const schedulesForThisSector = scheduleEntries.filter(s => (s as any).sector === sectorToSearch);
    
    if (schedulesForThisSector.length > 0) {
      setSchedulesForSector(schedulesForThisSector);
      setStage('selectSchedule');
    } else {
      // Sem auditorias agendadas, vai direto pra escolher checklist
      if (allChecklists.length > 0) {
        setStage('selectChecklist');
      } else {
        toast.error('Nenhum checklist disponível');
      }
    }
  };

  const updateAnswer = (idx: number, field: string, value: any) => setAnswers(answers.map((a, i) => i === idx ? { ...a, [field]: value } : a));

  const selectChecklistAndPrepare = (checklistId: string, schedId?: string) => {
    const ck = allChecklists.find(c => c.id === checklistId);
    if (ck) {
      setChecklist(ck);
      if (schedId) setScheduleEntryId(schedId);
      setAnswers(ck.items.map(item => ({ checklistItemId: item.id, answer: '', conformity: 'ok' as const, actionImmediate: false, escalate: false, responsible: '' })));
      setStage('checklist');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => { const reader = new FileReader(); reader.onloadend = () => setPhotos(prev => [...prev, reader.result as string]); reader.readAsDataURL(file); });
  };

  const handleSubmit = () => {
    if (!machine || !checklist || !authUser) return;
    
    const anyNok = answers.some(a => a.conformity === 'nok');
    const allOk = answers.every(a => a.conformity === 'ok');
    
    const finalStatus: 'conforme' | 'nao_conforme' | 'parcial' = anyNok
      ? 'nao_conforme'
      : allOk
        ? 'conforme'
        : 'parcial';

    addAuditMutation.mutate({
      schedule_entry_id: scheduleEntryId,
      employee_id: authUser.id,
      machine_id: machine.id,
      checklist_id: checklist.id,
      minifabrica: machine.minifabrica || minifabrica || '',
      date: new Date().toISOString().split('T')[0],
      observations,
      auditado_re: auditadoRE,
      auditado_nome: auditadoNome,
      answers: answers.map(a => ({
        checklist_item_id: a.checklistItemId,
        answer: a.answer,
        conformity: a.conformity,
      })),
      photos,
      status: finalStatus,
    }, {
      onSuccess: () => {
        setStage('done');
      },
    });
  };

  const reset = () => { setStage('scan'); setSector(null); setMachine(null); setChecklist(null); setScheduleEntryId(null); setSchedulesForSector([]); setAnswers([]); setObservations(''); setPhotos([]); setManualCode(''); setAuditorName(''); setTurno(''); setAuditadoRE(''); setAuditadoNome(''); };

  const recentMachines = sector 
    ? allMachines.filter(m => m.sector === sector).slice(0, 5)
    : allMachines.slice(0, 5);

  const statusColor = (conformity: string) => {
    if (conformity === 'ok') return { bg: '#16a34a', text: 'white', label: 'A' };
    if (conformity === 'nok') return { bg: '#dc2626', text: 'white', label: 'R' };
    if (conformity === 'na') return { bg: '#a3a3a3', text: 'white', label: 'NA' };
    return { bg: '#e5e5e5', text: '#888', label: '–' };
  };

  if (stage === 'selectSchedule' && machine && schedulesForSector.length > 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <Button variant="ghost" size="sm" onClick={() => { setMachine(null); setSchedulesForSector([]); setStage('scan'); }} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
            <h2 className="text-2xl font-bold mb-2">Qual auditoria deseja fazer?</h2>
            <p className="text-muted-foreground mb-4">Máquina: <strong>{machine.name}</strong> ({machine.code})</p>
          </div>
          <div className="space-y-3">
            {schedulesForSector.map((sched: any) => {
              const ck = allChecklists.find(c => c.id === sched.checklist_id);
              return (
                <Button
                  key={sched.id}
                  onClick={() => selectChecklistAndPrepare(sched.checklist_id, sched.id)}
                  variant="outline"
                  className="w-full justify-start text-left"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{ck?.name}</span>
                    <span className="text-xs text-muted-foreground">Semana {sched.week_number} · {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][sched.day_of_week]}</span>
                  </div>
                </Button>
              );
            })}
            <Button
              onClick={() => selectChecklistAndPrepare(allChecklists[0]?.id || '')}
              variant="secondary"
              className="w-full"
            >
              Fazer auditoria não programada
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'selectChecklist' && machine) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <Button variant="ghost" size="sm" onClick={reset} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
            <h2 className="text-2xl font-bold mb-2">Selecione o Checklist</h2>
            <p className="text-muted-foreground mb-4">Máquina: <strong>{machine.name}</strong> ({machine.code})</p>
          </div>
          <div className="space-y-3">
            <Label>Checklist</Label>
            <Select onValueChange={(checklistId) => selectChecklistAndPrepare(checklistId)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um checklist" />
              </SelectTrigger>
              <SelectContent>
                {allChecklists.map(ck => <SelectItem key={ck.id} value={ck.id}>{ck.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Auditoria Concluída!</h2>
          <p className="text-muted-foreground">Os dados foram salvos com sucesso.</p>
          <Button onClick={reset} size="lg" className="w-full">Nova Auditoria</Button>
        </div>
      </div>
    );
  }

  if (stage === 'checklist' && machine && checklist) {
    const sideColor = '#16a34a';
    const sideLabel = checklist.category?.toUpperCase() || 'LPA';

    return (
      <div className="space-y-4 max-w-3xl mx-auto pb-8">
        <Button variant="ghost" size="sm" onClick={reset}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>

        {/* === LPA TEMPLATE LAYOUT === */}
        <div className="border-2 border-foreground/30 rounded-sm overflow-hidden relative bg-white text-black">
          {/* Side label */}
          <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center font-bold text-xs text-white z-10"
            style={{ background: sideColor, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '2px' }}>
            {sideLabel}
          </div>

          {/* Title bar */}
          <div className="pr-10 text-center py-2 font-bold text-sm text-white" style={{ background: sideColor }}>
            LPA N1 – {checklist.name.toUpperCase()}
          </div>

          {/* Header fields */}
          <div className="pr-10 px-3 py-1.5 text-xs border-b border-black/20 space-y-1">
            <div className="flex items-center gap-1">
              <strong className="shrink-0">NOME AUDITOR:</strong>
              <input className="flex-1 border-b border-dashed border-black/40 bg-transparent outline-none text-xs px-1 py-0.5"
                value={auditorName} onChange={e => setAuditorName(e.target.value)} placeholder="___________________" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <strong>DATA:</strong>
                <span className="text-xs">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-1">
                <strong>LOCAL:</strong>
                <span className="text-xs">{machine.name} ({machine.code})</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <strong className="shrink-0">RE AUDITADO:</strong>
                <input className="w-20 border-b border-dashed border-black/40 bg-transparent outline-none text-xs px-1 py-0.5"
                  value={auditadoRE} onChange={e => setAuditadoRE(e.target.value)} placeholder="________" />
              </div>
              <div className="flex items-center gap-1">
                <strong className="shrink-0">NOME AUDITADO:</strong>
                <input className="flex-1 border-b border-dashed border-black/40 bg-transparent outline-none text-xs px-1 py-0.5"
                  value={auditadoNome} onChange={e => setAuditadoNome(e.target.value)} placeholder="___________________" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <strong>TURNO:</strong>
              {['1', '2', '3'].map(t => (
                <button key={t} onClick={() => setTurno(turno === t ? '' : t)}
                  className="w-6 h-6 border-2 border-black font-bold text-xs transition-all"
                  style={{ background: turno === t ? '#222' : 'white', color: turno === t ? 'white' : '#222' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div className="grid pr-10 font-bold text-[10px] border-b-2 border-black/40 bg-neutral-200"
            style={{ gridTemplateColumns: '50px 50px 1fr' }}>
            <div className="p-1 border-r border-black/30 text-center">ITEM</div>
            <div className="p-1 border-r border-black/30 text-center">STATUS</div>
            <div className="p-1 text-center">PERGUNTA / AÇÃO</div>
          </div>

          {/* Items */}
          {checklist.items.map((item, idx) => {
            const ans = answers[idx];
            const c = statusColor(ans?.conformity || 'ok');
            return (
              <div key={item.id} className="grid border-b border-black/20"
                style={{ gridTemplateColumns: '50px 50px 1fr', paddingRight: '2rem' }}>
                {/* Area/Number */}
                <div className="border-r border-black/20 flex items-center justify-center font-bold text-xs bg-neutral-100">
                  {idx + 1}
                </div>

                {/* Status button */}
                <div className="border-r border-black/20 flex items-center justify-center p-1">
                  <button
                    onClick={() => {
                      const order: ('ok' | 'nok' | 'na')[] = ['ok', 'nok', 'na'];
                      const current = ans?.conformity || 'ok';
                      const next = order[(order.indexOf(current) + 1) % order.length];
                      updateAnswer(idx, 'conformity', next);
                    }}
                    className="w-9 h-7 rounded font-bold text-xs border-2 transition-all hover:scale-110"
                    style={{ background: c.bg, color: c.text, borderColor: c.bg === '#e5e5e5' ? '#bbb' : c.bg }}>
                    {c.label}
                  </button>
                </div>

                {/* Question + actions */}
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium">{item.question}</p>
                  {item.explanation && (
                    <p className="text-[10px] text-neutral-500 italic">{item.explanation}</p>
                  )}

                  {item.type === 'text' && (
                    <input className="w-full border-b border-dashed border-black/40 bg-transparent outline-none text-xs mt-1"
                      value={ans?.answer || ''} onChange={e => updateAnswer(idx, 'answer', e.target.value)} placeholder="Resposta..." />
                  )}
                  {item.type === 'number' && (
                    <input type="number" className="w-full border-b border-dashed border-black/40 bg-transparent outline-none text-xs mt-1"
                      value={ans?.answer || ''} onChange={e => updateAnswer(idx, 'answer', e.target.value)} placeholder="Valor..." />
                  )}

                  {ans?.conformity === 'nok' && (
                    <div className="mt-1 p-1.5 bg-red-50 rounded text-[10px] space-y-1 border border-red-200">
                      <div className="font-bold text-red-700">Ação se Reprovado:</div>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={ans.actionImmediate}
                          onChange={e => updateAnswer(idx, 'actionImmediate', e.target.checked)}
                          className="w-3 h-3" />
                        <span>Acionar mestre e instruir colaborador</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={ans.escalate}
                          onChange={e => updateAnswer(idx, 'escalate', e.target.checked)}
                          className="w-3 h-3" />
                        <span>Escalonar via SFM</span>
                      </label>
                      <div className="flex items-center gap-1 mt-1">
                        <strong>Resp.:</strong>
                        <input className="flex-1 border-b border-dashed border-black/40 bg-transparent outline-none text-[10px]"
                          value={ans.responsible} onChange={e => updateAnswer(idx, 'responsible', e.target.value)}
                          placeholder="________________________" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="pr-10 px-3 py-1 text-[9px] text-neutral-500 border-b border-black/10">
            Utilizar na coluna status: R. (reprovado); A. (aprovado); NA (não aplicável).
          </div>

          {/* Footer */}
          <div className="flex justify-between pr-10 px-3 py-1.5 bg-neutral-200 text-[10px] font-medium">
            <span>{sideLabel}</span>
            <span>FORM PD319.3 (v05)</span>
          </div>
        </div>

        {/* Observations */}
        <Card className="bg-white text-black border-2 border-foreground/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-bold mb-1">OBSERVAÇÕES:</p>
            <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observações adicionais..." rows={3} className="bg-transparent border-dashed text-xs" />
          </CardContent>
        </Card>

        {/* Photos */}
        <Card className="bg-white text-black border-2 border-foreground/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-bold mb-2">FOTOS:</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded border-2 border-dashed p-3 hover:border-primary/60 transition-colors">
              <Camera className="h-4 w-4 text-neutral-500" />
              <span className="text-xs text-neutral-500">Anexar fotos</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} capture="environment" />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {photos.map((p, i) => <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-14 w-14 rounded object-cover border" />)}
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSubmit}>
          <Send className="mr-2 h-5 w-5" />Enviar Auditoria
        </Button>
      </div>
    );
  }

  // ---- SCAN STAGE ----
  return (
    <div className="min-h-[80vh] flex flex-col items-center px-4">
      <div className="w-full max-w-md text-center pt-8 pb-6 space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <QrCode className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary">LPA Mobile</h1>
        {sector ? (
          <div>
            <p className="text-sm text-muted-foreground">Setor: <strong>{sector}</strong></p>
            <p className="text-xs text-muted-foreground">Escaneie uma máquina do setor</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Modo Auditor</p>
        )}
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-6 space-y-5">
          <h2 className="text-lg font-bold text-center">{sector ? `Máquinas do Setor: ${sector}` : 'Escanear Ativo'}</h2>
          <div className="space-y-3">
            <Input placeholder="Digite o código (ex: CFB-001)" value={manualCode} onChange={e => setManualCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualEntry()} className="h-12 text-center" />
            <Button className="w-full h-12 text-base" onClick={handleManualEntry}><Search className="mr-2 h-5 w-5" />Buscar Ativo</Button>
          </div>
          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="mx-4 text-xs text-muted-foreground bg-card px-2">ou</span>
            <div className="flex-1 border-t" />
          </div>
          <div id="qr-reader" ref={scannerRef} className={scanning ? 'block rounded-lg overflow-hidden' : 'hidden'} />
          {!scanning ? (
            <Button variant="outline" className="w-full h-12 text-base" onClick={startScanner}><Camera className="mr-2 h-5 w-5" />Usar Câmera</Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={stopScanner}>Parar Scanner</Button>
          )}
        </CardContent>
      </Card>

      {recentMachines.length > 0 && (
        <div className="w-full max-w-md mt-6 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sector ? 'Máquinas do Setor' : 'Acesso Rápido'}</p>
          <div className="space-y-2">
            {recentMachines.map(m => (
              <button key={m.id} onClick={() => loadMachine(m.id)}
                className="w-full flex items-center gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.code}-{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.sector}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
