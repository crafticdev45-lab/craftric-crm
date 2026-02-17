import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ObjectType, ObjectPermissions } from '../types';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'craftric_user_permissions';

type UserPermissionsMap = Record<string, Record<ObjectType, ObjectPermissions>>;

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
  const { currentUser } = useAuth();
  const [permissionsMap, setPermissionsMap] = useState<UserPermissionsMap>(loadPermissions);

  const isAdmin = currentUser?.role === 'admin';

  const getUserPermissions = useCallback((userId: string, objectType: ObjectType): ObjectPermissions => {
    const userPerms = permissionsMap[userId];
    const objPerms = userPerms?.[objectType];
    return objPerms ? { ...defaultPermissions, ...objPerms } : defaultPermissions;
  }, [permissionsMap]);

  const updateUserPermissions = useCallback((userId: string, objectType: ObjectType, perms: Partial<ObjectPermissions>) => {
    if (!isAdmin) return;
    setPermissionsMap((prev) => {
      const next = { ...prev };
      next[userId] = { ...next[userId] } as Record<ObjectType, ObjectPermissions>;
      next[userId][objectType] = { ...defaultPermissions, ...next[userId][objectType], ...perms };
      savePermissions(next);
      return next;
    });
  }, [isAdmin]);

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
