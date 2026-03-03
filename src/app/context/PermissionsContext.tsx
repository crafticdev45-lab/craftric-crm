import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ObjectType, ObjectPermissions } from '../types';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'craftric_user_permissions';

type UserPermissionsMap = Record<string, Record<ObjectType, ObjectPermissions>>;

interface PermissionRow {
  id?: string;
  userId: string;
  objectType: ObjectType;
  read: boolean;
  edit: boolean;
  delete: boolean;
}

const defaultPermissions: ObjectPermissions = { read: true, edit: false, delete: false };

function loadPermissions(): UserPermissionsMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePermissions(map: UserPermissionsMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

interface PermissionsContextType {
  getUserPermissions: (userId: string, objectType: ObjectType) => ObjectPermissions;
  updateUserPermissions: (userId: string, objectType: ObjectType, perms: Partial<ObjectPermissions>) => void;
  canRead: (objectType: ObjectType) => boolean;
  canEdit: (objectType: ObjectType) => boolean;
  canDelete: (objectType: ObjectType) => boolean;
  canAdd: (objectType: ObjectType) => boolean;
  canManagePermissions: () => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { currentUser, token } = useAuth();
  const [permissionsMap, setPermissionsMap] = useState<UserPermissionsMap>(loadPermissions);

  const NEON_API_URL = (import.meta as any).env.VITE_API_URL ?? '';

  const isAdmin = (currentUser?.role ?? '').toLowerCase() === 'admin';

  const getUserPermissions = useCallback((userId: string, objectType: ObjectType): ObjectPermissions => {
    const key = String(userId);
    const userPerms = permissionsMap[key];
    const objPerms = userPerms?.[objectType];
    return objPerms ? { ...defaultPermissions, ...objPerms } : defaultPermissions;
  }, [permissionsMap]);

  // When using the Neon API backend, load all permissions from the server and
  // build the in-memory permissions map so permissions persist across browsers.
  useEffect(() => {
    if (!NEON_API_URL) return;
    if (!token) return;
    const base = NEON_API_URL.replace(/\/$/, '');
    fetch(`${base}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) return;
        const rows = (await res.json()) as PermissionRow[];
        const next: UserPermissionsMap = {};
        for (const row of rows) {
          const key = String(row.userId);
          const ot = row.objectType;
          if (!next[key]) {
            next[key] = {} as Record<ObjectType, ObjectPermissions>;
          }
          next[key][ot] = {
            read: !!row.read,
            edit: !!row.edit,
            delete: !!row.delete,
          };
        }
        setPermissionsMap(next);
      })
      .catch(() => {
        // On error, fall back to any locally stored permissions.
      });
  }, [NEON_API_URL, token]);

  const updateUserPermissions = useCallback((userId: string, objectType: ObjectType, perms: Partial<ObjectPermissions>) => {
    if (!isAdmin) return;
    const key = String(userId);
    setPermissionsMap((prev) => {
      const next = { ...prev };
      const userPerms = (next[key] ?? {}) as Record<ObjectType, ObjectPermissions>;
      const existing = userPerms[objectType] ?? defaultPermissions;
      const merged: ObjectPermissions = { ...existing, ...perms };
      next[key] = { ...userPerms, [objectType]: merged } as Record<ObjectType, ObjectPermissions>;
      savePermissions(next);

      // Persist to Neon API backend (when configured) so permissions are shared across devices.
      if (NEON_API_URL && token) {
        const base = NEON_API_URL.replace(/\/$/, '');
        fetch(`${base}/permissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: key,
            objectType,
            read: merged.read,
            edit: merged.edit,
            delete: merged.delete,
          }),
        }).catch(() => {
          // Ignore errors here; UI will still reflect local state.
        });
      }

      return next;
    });
  }, [NEON_API_URL, isAdmin, token]);

  const canRead = useCallback((objectType: ObjectType) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return getUserPermissions(currentUser.id, objectType).read;
  }, [currentUser, isAdmin, getUserPermissions]);

  const canEdit = useCallback((objectType: ObjectType) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return getUserPermissions(currentUser.id, objectType).edit;
  }, [currentUser, isAdmin, getUserPermissions]);

  const canDelete = useCallback((objectType: ObjectType) => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    return getUserPermissions(currentUser.id, objectType).delete;
  }, [currentUser, isAdmin, getUserPermissions]);

  const canAdd = useCallback((objectType: ObjectType) => {
    return canEdit(objectType);
  }, [canEdit]);

  const canManagePermissions = useCallback(() => isAdmin, [isAdmin]);

  return (
    <PermissionsContext.Provider
      value={{
        getUserPermissions,
        updateUserPermissions,
        canRead,
        canEdit,
        canDelete,
        canAdd,
        canManagePermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
