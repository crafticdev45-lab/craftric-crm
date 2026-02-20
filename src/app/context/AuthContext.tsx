import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { isXanoEnabled, xanoLogin as apiLogin, xanoMe, xanoList, xanoCreate, XANO_ENDPOINTS, RateLimitError } from '@/lib/xano';

const TOKEN_KEY = 'craftric_auth_token';

const ROLES = ['admin', 'sales', 'manager'] as const;
type AppRole = (typeof ROLES)[number];

/** Normalize user from Xano (or any API): ensure id is string and role is lowercase admin|sales|manager. */
function normalizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : undefined;
  const name = typeof o.name === 'string' ? o.name : '';
  const email = typeof o.email === 'string' ? o.email : '';
  const createdAt = typeof o.created_at === 'string' ? o.created_at : (typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString().split('T')[0]);
  let role = (o.role ?? o.user_type ?? o.role_id) as string | undefined;
  if (typeof role !== 'string') role = 'sales';
  const roleLower = String(role).toLowerCase();
  const appRole: AppRole =
    roleLower === 'admin' || roleLower === 'administrator'
      ? 'admin'
      : roleLower === 'manager'
        ? 'manager'
        : ROLES.includes(roleLower as AppRole)
          ? (roleLower as AppRole)
          : 'sales';
  if (!id) return null;
  return { id, name, email, role: appRole, createdAt };
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => boolean | Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  deleteUser: (id: string) => void;
  requestPasswordReset: (email: string) => { success: boolean; error?: string };
  token: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialUsers: User[] = [
  { id: '1', name: 'Craftric Admin', email: 'crafticdev45@gmail.com', role: 'admin', createdAt: '2024-01-01' },
  { id: '2', name: 'Sarah Sales', email: 'sarah@company.com', role: 'sales', createdAt: '2024-01-15' },
];

// Mock passwords (email -> password). In production, use XANO auth.
const userPasswords: Record<string, string> = {
  'crafticdev45@gmail.com': 'project@123',
  'sarah@company.com': 'sales@123',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(isXanoEnabled());

  useEffect(() => {
    if (!isXanoEnabled()) {
      setUsers(initialUsers);
      setIsLoading(false);
      return;
    }
    if (token) {
      xanoMe<unknown>(token).then((raw) => {
        const user = normalizeUser(raw);
        setCurrentUser(user);
        setIsLoading(false);
      }).catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setCurrentUser(null);
        setIsLoading(false);
      });
    } else {
      setCurrentUser(null);
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isXanoEnabled() && token) {
      xanoList<unknown>(XANO_ENDPOINTS.users, token)
        .then((rawList) => rawList.map((raw) => normalizeUser(raw)).filter((u): u is User => u != null))
        .then(setUsers)
        .catch(() => {});
    }
  }, [token]);

  const login = (email: string, password?: string): boolean | Promise<{ success: boolean; error?: string }> => {
    if (!isXanoEnabled()) {
      const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return false;
      const storedPassword = userPasswords[user.email] ?? userPasswords[email];
      if (!password || storedPassword !== password) return false;
      setCurrentUser(user);
      return true;
    }
    if (!password) return false;
    setIsLoading(true);
    return apiLogin(email, password)
      .then((authToken) => {
        if (authToken) {
          localStorage.setItem(TOKEN_KEY, authToken);
          setToken(authToken);
          return { success: true };
        }
        return { success: false, error: 'Invalid email or password. Please try again.' };
      })
      .catch((err) => {
        let message: string;
        if (err instanceof RateLimitError) {
          message = err.message;
        } else if (err instanceof Error) {
          // Network/CORS failure
          if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
            message = 'Unable to sign in. Please check your connection and try again.';
          } else {
            message = err.message;
          }
        } else {
          message = 'Unable to sign in. Please check your connection and try again.';
        }
        return { success: false, error: message };
      })
      .finally(() => setIsLoading(false));
  };

  const logout = () => {
    if (isXanoEnabled()) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }
    setCurrentUser(null);
  };

  const requestPasswordReset = (email: string): { success: boolean; error?: string } => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: false, error: 'Email does not exist.' };
    }
    const storedPassword = userPasswords[user.email];
    if (!storedPassword) {
      return { success: false, error: 'Email does not exist.' };
    }
    // In a real app, send email here. For mock, we simulate success.
    // The user would receive an email with their password.
    return { success: true };
  };

  const deleteUser = (id: string) => {
    if (!isXanoEnabled()) {
      const user = users.find((u) => u.id === id);
      if (user) delete userPasswords[user.email];
      setUsers((prev) => prev.filter((u) => u.id !== id));
      return;
    }
    if (!token) return;
    // XANO: would call xanoDelete(XANO_ENDPOINTS.users, id, token) and setUsers
  };

  const addUser = async (user: Omit<User, 'id' | 'createdAt'>) => {
    if (!isXanoEnabled()) {
      const ts = new Date().toISOString();
      const newUser: User = {
        ...user,
        id: Date.now().toString(),
        createdAt: ts.split('T')[0],
        lastModifiedBy: currentUser?.id,
        lastModifiedAt: ts,
      };
      setUsers((prev) => [...prev, newUser]);
      // Default password for new users in mock mode
      userPasswords[newUser.email] = 'welcome123';
      return;
    }
    if (!token) return;
    try {
      const created = await xanoCreate<User>(XANO_ENDPOINTS.users, user as Record<string, unknown>, token);
      if (created) setUsers((prev) => [...prev, created]);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, users, addUser, deleteUser, requestPasswordReset, token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
