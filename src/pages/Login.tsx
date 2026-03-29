import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, LogIn, Factory, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login({ onLogin }: { onLogin: (email: string, password: string) => Promise<{ error?: string }> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }
    setLoading(true);
    const result = await onLogin(email, password);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(210,70%,25%)] p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg mb-5">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Sistema de Auditoria
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Factory className="h-4 w-4 text-white/80" />
            <span className="text-lg font-semibold text-white/90">Mahle</span>
          </div>
          <p className="text-sm text-white/60 mt-3">
            Entre com seu email e senha para acessar
          </p>
        </div>

        <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-12"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Entrar no Sistema
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/40 mt-6">
          Sistema de Auditoria - Mahle © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
