import { useState, useMemo } from 'react';
import { useChecklists, useDeleteChecklist, Checklist } from '@/hooks/use-checklists';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Pencil, Eye, Search, Printer, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Checklists() {
  const navigate = useNavigate();
  const { data: checklists = [], isLoading } = useChecklists();
  const deleteChecklist = useDeleteChecklist();
  const [viewChecklist, setViewChecklist] = useState<Checklist | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const categories = useMemo(() => [...new Set(checklists.map(c => c.category).filter(Boolean))], [checklists]);

  const filteredChecklists = useMemo(() => {
    let result = checklists;
    if (filterCategory !== 'all') result = result.filter(c => c.category === filterCategory);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(term) || c.category.toLowerCase().includes(term));
    }
    return result;
  }, [checklists, searchTerm, filterCategory]);

  const handleEdit = (c: Checklist) => { navigate(`/checklist-template?id=${c.id}`); };
  const handleDelete = (id: string) => deleteChecklist.mutate(id);

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Checklists</title><style>
      body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;margin-bottom:30px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f0f0f0}
      h1{font-size:18px}h2{font-size:15px;margin-top:25px;border-bottom:1px solid #ccc;padding-bottom:5px}
      .badge{background:#e0e0e0;padding:2px 8px;border-radius:10px;font-size:10px}
    </style></head><body><h1>Checklists de Auditoria (${filteredChecklists.length})</h1>`);
    filteredChecklists.forEach(c => {
      win.document.write(`<h2>${c.name} <span class="badge">${c.category}</span></h2><table><tr><th>#</th><th>Pergunta</th><th>Tipo</th></tr>`);
      c.items.forEach((item, i) => win.document.write(`<tr><td>${i + 1}</td><td>${item.question}</td><td>${item.type.replace('_', '/')}</td></tr>`));
      win.document.write('</table>');
    });
    win.document.write('</body></html>');
    win.document.close(); win.print();
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando checklists...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checklists</h1>
          <p className="text-sm text-muted-foreground">Gerencie os checklists de auditoria · {checklists.length} registros</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button size="sm" onClick={() => navigate('/checklist-template')}>Novo Checklist</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar checklist..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecklists.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum checklist encontrado</TableCell></TableRow>
              ) : filteredChecklists.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell>{c.items.length} perguntas</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewChecklist(c)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewChecklist} onOpenChange={() => setViewChecklist(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewChecklist?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {viewChecklist?.items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 rounded-md border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span>
                <div>
                  <p className="text-sm">{item.question}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.type.replace('_', '/')}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
