import { useState } from 'react';
import { useAuth, ALL_PAGES, UserType } from '@/lib/auth';
import { MINIFABRICAS, getMinifabricaName } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Save, Target, Users, Settings as SettingsIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Goal {
  id: string;
  name: string;
  target: number;
  unit: string;
  period: string;
}

const ROLES: { value: UserType; label: string }[] = [
  { value: 'gestor', label: 'Gestor' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'administrativo', label: 'Administrativo' },
];

const TYPE_COLORS: Record<UserType, string> = {
  gestor: 'bg-primary text-primary-foreground',
  diretor: 'bg-accent text-accent-foreground',
  administrativo: 'bg-secondary text-secondary-foreground',
};

const TYPE_LABELS: Record<UserType, string> = {
  gestor: 'Gestor',
  diretor: 'Diretor',
  administrativo: 'Administrativo',
};

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem('lpa_goals');
    return raw ? JSON.parse(raw) : defaultGoals;
  } catch { return defaultGoals; }
}
function saveGoalsStorage(goals: Goal[]) {
  localStorage.setItem('lpa_goals', JSON.stringify(goals));
}

const defaultGoals: Goal[] = [
  { id: '1', name: 'Taxa de Conformidade', target: 90, unit: '%', period: 'Mensal' },
  { id: '2', name: 'Auditorias por Semana', target: 15, unit: 'auditorias', period: 'Semanal' },
  { id: '3', name: 'Máx. NOK por Máquina', target: 3, unit: 'ocorrências', period: 'Mensal' },
  { id: '4', name: 'Cobertura de Máquinas', target: 100, unit: '%', period: 'Mensal' },
];

export default function Settings() {
  const { userType, currentUser, getUserPermissions, setUserPermissions, allUsers, refreshUsers, refreshCurrentUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>(loadGoals());

  // New user form
  const [empDialog, setEmpDialog] = useState(false);
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', role: '' as string, minifabrica: '' });
  const [creating, setCreating] = useState(false);

  const [goalDialog, setGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState({ name: '', target: '', unit: '', period: 'Mensal' });

  // Permissions dialog
  const [permDialog, setPermDialog] = useState(false);
  const [permUserId, setPermUserId] = useState<string>('');
  const [permUserName, setPermUserName] = useState<string>('');
  const [permPages, setPermPages] = useState<string[]>([]);

  // Edit role dialog
  const [editRoleDialog, setEditRoleDialog] = useState(false);
  const [editRoleUserId, setEditRoleUserId] = useState<string>('');
  const [editRoleUserName, setEditRoleUserName] = useState<string>('');
  const [editRoleCurrentRole, setEditRoleCurrentRole] = useState<UserType>('administrativo');
  const [editRoleNewRole, setEditRoleNewRole] = useState<UserType>('administrativo');
  const [editRoleMinifabrica, setEditRoleMinifabrica] = useState<string>('');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Filter users for diretor - only their minifabrica
  const visibleUsers = userType === 'diretor' && currentUser
    ? allUsers.filter(u => u.minifabrica === currentUser.minifabrica)
    : allUsers;

  const openNewUser = () => {
    setEmpForm({ name: '', email: '', password: '', role: '', minifabrica: '' });
    setEmpDialog(true);
  };

  const createUser = async () => {
    if (!empForm.name || !empForm.email || !empForm.password || !empForm.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (empForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: empForm.email,
          password: empForm.password,
          name: empForm.name,
          role: empForm.role,
          minifabrica: empForm.minifabrica || null,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Resposta inválida do servidor (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao criar usuário');
      }

      toast.success('Usuário criado com sucesso!');
      setEmpDialog(false);
      await refreshUsers();
    } catch (err: any) {
      console.error('Erro:', err);
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const openPermissions = (userId: string, userName: string) => {
    setPermUserId(userId);
    setPermUserName(userName);
    setPermPages(getUserPermissions(userId));
    setPermDialog(true);
  };
  const savePerms = () => {
    setUserPermissions(permUserId, permPages);
    toast.success(`Permissões de ${permUserName} atualizadas`);
    setPermDialog(false);
  };
  const togglePage = (path: string) => {
    setPermPages(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  // Goal handlers
  const openNewGoal = () => {
    setEditingGoal(null);
    setGoalForm({ name: '', target: '', unit: '', period: 'Mensal' });
    setGoalDialog(true);
  };
  const openEditGoal = (g: Goal) => {
    setEditingGoal(g);
    setGoalForm({ name: g.name, target: String(g.target), unit: g.unit, period: g.period });
    setGoalDialog(true);
  };
  const saveGoal = () => {
    if (!goalForm.name || !goalForm.target || !goalForm.unit) {
      toast.error('Preencha todos os campos');
      return;
    }
    let updated: Goal[];
    if (editingGoal) {
      updated = goals.map(g => g.id === editingGoal.id ? { ...g, name: goalForm.name, target: Number(goalForm.target), unit: goalForm.unit, period: goalForm.period } : g);
    } else {
      updated = [...goals, { id: Math.random().toString(36).substring(2, 11), name: goalForm.name, target: Number(goalForm.target), unit: goalForm.unit, period: goalForm.period }];
    }
    saveGoalsStorage(updated);
    setGoals(updated);
    setGoalDialog(false);
    toast.success(editingGoal ? 'Meta atualizada' : 'Meta adicionada');
  };
  const deleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    saveGoalsStorage(updated);
    setGoals(updated);
    toast.success('Meta removida');
  };

  const availableRoles = userType === 'diretor'
    ? ROLES.filter(r => r.value === 'administrativo')
    : ROLES;

  const openEditRole = (userId: string, userName: string, currentRole: UserType) => {
    try {
      const user = allUsers?.find(u => u.id === userId);
      console.log('Abrindo edit para:', { userId, userName, currentRole, userMinifabrica: user?.minifabrica });
      
      setEditRoleUserId(userId);
      setEditRoleUserName(userName);
      setEditRoleCurrentRole(currentRole);
      setEditRoleNewRole(currentRole);
      setEditRoleMinifabrica(user?.minifabrica || 'none');
      setEditRoleDialog(true);
    } catch (err) {
      console.error('Erro ao abrir dialog:', err);
      toast.error('Erro ao abrir dialog de edição');
    }
  };

  const saveRole = async () => {
    try {
      setUpdatingRole(true);
      
      console.log('Salvando usuário:', {
        userId: editRoleUserId,
        novaFuncao: editRoleNewRole,
        minifabricaAtual: editRoleMinifabrica,
        minifabricaParaSalvar: editRoleMinifabrica === 'none' ? null : editRoleMinifabrica,
      });
      console.log('refreshCurrentUser disponível?', typeof refreshCurrentUser);

      // Delete old role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', editRoleUserId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: editRoleUserId,
          role: editRoleNewRole,
        });

      if (insertError) throw insertError;

      // Update minifabrica - sempre atualiza
      const minifabricaValue = editRoleMinifabrica === 'none' ? null : editRoleMinifabrica;
      console.log('Tentando atualizar minifabrica:', { userId: editRoleUserId, novoValor: minifabricaValue });
      
      const { error: updateError, data: updateData } = await supabase
        .from('profiles')
        .update({ minifabrica: minifabricaValue })
        .eq('id', editRoleUserId);

      console.log('UPDATE response:', { error: updateError, data: updateData });

      if (updateError) {
        console.error('ERRO NO UPDATE:', updateError);
        throw updateError;
      }

      // Verifica imediatamente se foi salvo
      const { data: verifyData } = await supabase
        .from('profiles')
        .select('minifabrica')
        .eq('id', editRoleUserId)
        .single();

      console.log('Minifabrica atualizada com sucesso no Supabase:', { userId: editRoleUserId, novoValor: minifabricaValue, verificacao: verifyData?.minifabrica });

      const minifabricaName = editRoleMinifabrica === 'none' || !editRoleMinifabrica ? 'Nenhuma' : getMinifabricaName(editRoleMinifabrica);
      const roleChanged = editRoleNewRole !== editRoleCurrentRole;
      
      let message = `${editRoleUserName} atualizado`;
      if (roleChanged) message += `: Função → ${TYPE_LABELS[editRoleNewRole]}`;
      if (roleChanged && editRoleMinifabrica !== 'none') message += `, Minifábrica → ${minifabricaName}`;
      if (!roleChanged && editRoleMinifabrica !== 'none') message += `: Minifábrica → ${minifabricaName}`;
      
      toast.success(message);
      setEditRoleDialog(false);
      
      console.log('Iniciando recarregamento de dados...');
      console.log('refreshUsers disponível?', typeof refreshUsers);
      console.log('refreshCurrentUser disponível?', typeof refreshCurrentUser);
      
      // Recarrega dados com delay mínimo
      await Promise.all([refreshUsers(), refreshCurrentUser()]);
      
      console.log('Recarregamento completo! CurrentUser agora é:', currentUser);
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
      toast.error(err.message || 'Erro ao atualizar usuário');
    } finally {
      setUpdatingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie metas e usuários do sistema</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          {userType === 'gestor' && (
            <TabsTrigger value="goals" className="gap-2"><Target className="h-4 w-4" />Metas</TabsTrigger>
          )}
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />Usuários</TabsTrigger>
        </TabsList>

        {userType === 'gestor' && (
          <TabsContent value="goals" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Metas de Auditoria</h2>
              <Button onClick={openNewGoal}><Plus className="mr-2 h-4 w-4" />Nova Meta</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map(g => (
                <Card key={g.id}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{g.period}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditGoal(g)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteGoal(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">{g.target} <span className="text-sm font-normal text-muted-foreground">{g.unit}</span></p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {userType === 'diretor' ? `Usuários - ${currentUser?.minifabrica ? getMinifabricaName(currentUser.minifabrica) : ''}` : 'Todos os Usuários'}
            </h2>
            {(userType === 'gestor' || userType === 'diretor') && (
              <Button onClick={openNewUser}><Plus className="mr-2 h-4 w-4" />Novo Usuário</Button>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Minifábrica</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum usuário cadastrado
                      </TableCell>
                    </TableRow>
                  ) : visibleUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[user.role]}>{TYPE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>{user.minifabrica ? (getMinifabricaName(user.minifabrica) || user.minifabrica) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {userType === 'gestor' && (
                            <Button variant="ghost" size="icon" onClick={() => openEditRole(user.id, user.name, user.role)} title="Editar Função">
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {user.role === 'administrativo' && (userType === 'gestor' || userType === 'diretor') && (
                            <Button variant="ghost" size="icon" onClick={() => openPermissions(user.id, user.name)} title="Permissões">
                              <ShieldCheck className="h-4 w-4 text-accent" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New User Dialog */}
      <Dialog open={empDialog} onOpenChange={setEmpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Senha</Label><Input type="password" value={empForm.password} onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
            <div>
              <Label>Tipo de Usuário</Label>
              <Select value={empForm.role} onValueChange={v => setEmpForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{availableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minifábrica</Label>
              <Select value={empForm.minifabrica} onValueChange={v => setEmpForm(f => ({ ...f, minifabrica: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {MINIFABRICAS.map(mf => <SelectItem key={mf.id} value={mf.id}>{mf.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={createUser} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Criar Usuário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome da Meta</Label><Input value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Valor Alvo</Label><Input type="number" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} /></div>
            <div><Label>Unidade</Label><Input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, auditorias, ocorrências" /></div>
            <div>
              <Label>Período</Label>
              <Select value={goalForm.period} onValueChange={v => setGoalForm(f => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveGoal}><Save className="mr-2 h-4 w-4" />Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialog} onOpenChange={setPermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Permissões - {permUserName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Selecione as páginas que este usuário pode acessar:</p>
            {ALL_PAGES.filter(p => p.path !== '/settings').map(page => (
              <label key={page.path} className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={permPages.includes(page.path)}
                  onCheckedChange={() => togglePage(page.path)}
                />
                <span className="text-sm font-medium">{page.label}</span>
              </label>
            ))}
            <Button className="w-full" onClick={savePerms}>
              <Save className="mr-2 h-4 w-4" />Salvar Permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialog} onOpenChange={setEditRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Usuário - {editRoleUserName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Função Atual</Label>
              <div className="text-sm font-medium mt-1">
                <Badge className={TYPE_COLORS[editRoleCurrentRole]}>{TYPE_LABELS[editRoleCurrentRole]}</Badge>
              </div>
            </div>
            <div>
              <Label>Nova Função</Label>
              <Select value={editRoleNewRole} onValueChange={(v) => setEditRoleNewRole(v as UserType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minifábrica (Opcional)</Label>
              <Select value={editRoleMinifabrica} onValueChange={(v) => setEditRoleMinifabrica(v)}>
                <SelectTrigger><SelectValue placeholder="Selecione ou remova" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem Minifábrica</SelectItem>
                  {MINIFABRICAS && MINIFABRICAS.length > 0 ? (
                    MINIFABRICAS.map(mf => (
                      <SelectItem key={mf.id} value={mf.id}>{mf.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveRole} disabled={updatingRole}>
              {updatingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
