import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { isXanoEnabled, isNeonApi, xanoLogin as apiLogin, xanoMe, xanoList, xanoCreate, xanoUpdate, xanoDelete, XANO_ENDPOINTS, RateLimitError } from '@/lib/xano';

const NEON_API_URL = import.meta.env.VITE_API_URL ?? '';

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
  updateUser: (id: string, updates: Partial<Pick<User, 'name' | 'email'>>) => Promise<void>;
  deleteUser: (id: string) => void;
  requestPasswordReset: (email: string) => { success: boolean; error?: string };
  sendPasswordResetLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  token: string | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock mode only: in-memory store for added users' passwords (not used when backend/Neon is configured).
const userPasswords: Record<string, string> = {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(isXanoEnabled());

  useEffect(() => {
    if (!isXanoEnabled()) {
      setUsers([]);
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
    return { success: true };
  };

  const sendPasswordResetLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) return { success: false, error: 'Email is required.' };
    if (!isNeonApi() || !NEON_API_URL) {
      return { success: false, error: 'Password reset link is only available when using the Neon API.' };
    }
    if (!token) return { success: false, error: 'You must be logged in to send a reset link.' };
    try {
      const base = NEON_API_URL.replace(/\/$/, '');
      const res = await fetch(`${base}/auth/send-reset-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return { success: false, error: data.error ?? res.statusText ?? 'Failed to send reset link.' };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error)?.message ?? 'Failed to send reset link.' };
    }
  };

  const updateUser = async (id: string, updates: Partial<Pick<User, 'name' | 'email'>>) => {
    if (!isXanoEnabled()) {
      const prev = users.find((u) => u.id === id);
      if (!prev) return;
      const newEmail = updates.email?.trim().toLowerCase();
      if (newEmail && prev.email !== newEmail && userPasswords[prev.email] !== undefined) {
        userPasswords[newEmail] = userPasswords[prev.email];
        delete userPasswords[prev.email];
      }
      const ts = new Date().toISOString();
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === id ? { ...u, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : u
        )
      );
      if (currentUser?.id === id && (updates.name ?? updates.email)) {
        setCurrentUser((c) => (c ? { ...c, ...updates } : c));
      }
      return;
    }
    if (!token) return;
    try {
      const updated = await xanoUpdate<User>(XANO_ENDPOINTS.users, id, updates as Record<string, unknown>, token);
      if (updated) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
        if (currentUser?.id === id) setCurrentUser((c) => (c ? { ...c, ...updated } : c));
      }
    } catch (_) {}
  };

  const deleteUser = async (id: string) => {
    if (!isXanoEnabled()) {
      const user = users.find((u) => u.id === id);
      if (user) delete userPasswords[user.email];
      setUsers((prev) => prev.filter((u) => u.id !== id));
      return;
    }
    if (!token) return;
    try {
      await xanoDelete(XANO_ENDPOINTS.users, id, token);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (_) {
      // Error already surfaced by API; keep UI in sync on success only
    }
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
    <AuthContext.Provider value={{ currentUser, login, logout, users, addUser, updateUser, deleteUser, requestPasswordReset, sendPasswordResetLink, token, isLoading }}>
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
