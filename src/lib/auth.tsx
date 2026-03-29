import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserType = 'gestor' | 'diretor' | 'administrativo';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  minifabrica: string | null;
  role: UserType;
}

export interface PagePermission {
  path: string;
  label: string;
  allowed: boolean;
}

export const ALL_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/machines', label: 'Máquinas' },
  { path: '/checklists', label: 'Checklists' },
  { path: '/checklist-template', label: 'Modelo LPA' },
  { path: '/schedule', label: 'Cronograma' },
  { path: '/my-audits', label: 'Minhas Auditorias' },
  { path: '/mobile-audit', label: 'Auditoria Mobile' },
  { path: '/reports', label: 'Relatórios' },
  { path: '/analytics', label: 'Análise Gráfica' },
  { path: '/settings', label: 'Configurações' },
];

const DEFAULT_ADMIN_PAGES = ['/', '/schedule', '/my-audits', '/mobile-audit'];

interface AuthContextType {
  currentUser: UserProfile | null;
  userType: UserType | null;
  authUser: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isLoading: boolean;
  canAccessPage: (path: string) => boolean;
  getUserPermissions: (userId: string) => string[];
  setUserPermissions: (userId: string, pages: string[]) => void;
  selectedMinifabrica: string | null;
  setSelectedMinifabrica: (value: string | null) => void;
  getEffectiveMinifabrica: () => string | null;
  allUsers: UserProfile[];
  refreshUsers: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userType: null,
  authUser: null,
  login: async () => ({}),
  logout: async () => {},
  isLoggedIn: false,
  isLoading: true,
  canAccessPage: () => false,
  getUserPermissions: () => [],
  setUserPermissions: () => {},
  selectedMinifabrica: null,
  setSelectedMinifabrica: () => {},
  getEffectiveMinifabrica: () => null,
  allUsers: [],
  refreshUsers: async () => {},
  refreshCurrentUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function loadPermissions(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem('lpa_permissions');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePermissions(perms: Record<string, string[]>) {
  localStorage.setItem('lpa_permissions', JSON.stringify(perms));
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  const { data: userData } = await supabase.auth.getUser();

  return {
    id: profile.id,
    name: profile.name,
    email: userData?.user?.email || '',
    minifabrica: profile.minifabrica,
    role: (roleData?.role as UserType) || 'administrativo',
  };
}

async function fetchAllUsers(): Promise<UserProfile[]> {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: roles } = await supabase.from('user_roles').select('*');

  if (!profiles) return [];

  console.log('fetchAllUsers - Perfis recebidos:', profiles.map(p => ({ id: p.id, name: p.name, minifabrica: p.minifabrica })));

  const roleMap = new Map<string, UserType>();
  roles?.forEach(r => roleMap.set(r.user_id, r.role as UserType));

  const users = profiles.map(p => ({
    id: p.id,
    name: p.name,
    email: '',
    minifabrica: p.minifabrica,
    role: roleMap.get(p.id) || 'administrativo',
  }));
  
  console.log('fetchAllUsers - Retornando:', users.map(u => ({ id: u.id, name: u.name, minifabrica: u.minifabrica })));
  return users;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>(loadPermissions());
  const [selectedMinifabrica, setSelectedMinifabrica] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setAuthUser(session.user);
          // Defer profile fetch to avoid Supabase client deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            setCurrentUser(profile);
            if (profile?.role === 'diretor' && profile.minifabrica) {
              setSelectedMinifabrica(profile.minifabrica);
            }
            const users = await fetchAllUsers();
            setAllUsers(users);
            setIsLoading(false);
          }, 0);
        } else {
          setAuthUser(null);
          setCurrentUser(null);
          setAllUsers([]);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        fetchUserProfile(session.user.id).then(profile => {
          setCurrentUser(profile);
          if (profile?.role === 'diretor' && profile.minifabrica) {
            setSelectedMinifabrica(profile.minifabrica);
          }
          fetchAllUsers().then(users => {
            setAllUsers(users);
            setIsLoading(false);
          });
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const userType = currentUser?.role || null;

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthUser(null);
    setSelectedMinifabrica(null);
  };

  const canAccessPage = (path: string): boolean => {
    if (!currentUser || !userType) return false;
    if (userType === 'gestor') return true;
    if (userType === 'diretor') return true;
    const userPerms = permissions[currentUser.id] || DEFAULT_ADMIN_PAGES;
    return userPerms.includes(path);
  };

  const getUserPermissions = (userId: string): string[] => {
    return permissions[userId] || DEFAULT_ADMIN_PAGES;
  };

  const setUserPermissionsHandler = (userId: string, pages: string[]) => {
    const updated = { ...permissions, [userId]: pages };
    setPermissions(updated);
    savePermissions(updated);
  };

  const getEffectiveMinifabrica = (): string | null => {
    if (!currentUser || !userType) return null;
    if (userType === 'diretor') return currentUser.minifabrica;
    if (userType === 'gestor') return selectedMinifabrica;
    return currentUser.minifabrica;
  };

  const refreshUsers = async () => {
    const users = await fetchAllUsers();
    setAllUsers(users);
  };

  const refreshCurrentUser = async () => {
    if (!authUser) {
      console.log('refreshCurrentUser abortado: authUser não existe');
      return;
    }
    try {
      console.log('refreshCurrentUser iniciado para:', authUser.email);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('refreshCurrentUser - erro ao buscar profile:', profileError);
        return;
      }

      if (!profile) {
        console.log('refreshCurrentUser: profile não encontrado');
        return;
      }

      console.log('refreshCurrentUser - profile completo:', JSON.stringify(profile, null, 2));
      console.log('refreshCurrentUser - profile encontrado:', { id: profile.id, name: profile.name, minifabrica: profile.minifabrica });

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .single();

      console.log('refreshCurrentUser - role encontrado:', roleData?.role);

      const updatedUser = {
        id: profile.id,
        name: profile.name,
        email: authUser.email || '',
        minifabrica: profile.minifabrica,
        role: (roleData?.role as UserType) || 'administrativo',
      };
      
      console.log('refreshCurrentUser - atualizando currentUser com:', updatedUser);
      console.log('DEBUG MINIFÁBRICA - Valor sendo setado:', updatedUser.minifabrica);
      setCurrentUser(updatedUser);
    } catch (err) {
      console.error('Erro ao atualizar usuário atual:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userType,
      authUser,
      login,
      logout,
      isLoggedIn: !!currentUser,
      isLoading,
      canAccessPage,
      getUserPermissions,
      setUserPermissions: setUserPermissionsHandler,
      selectedMinifabrica,
      setSelectedMinifabrica,
      getEffectiveMinifabrica,
      allUsers,
      refreshUsers,
      refreshCurrentUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
