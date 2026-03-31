import type { User } from '../types';

export type ListSortKey = 'name' | 'createdAt' | 'createdBy';
export type SortDir = 'asc' | 'desc';

export function compareDateStrings(a: string | undefined, b: string | undefined): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return -1;
  if (Number.isNaN(tb)) return 1;
  return ta - tb;
}

export function userSortName(users: User[], userId: string | undefined): string {
  if (!userId) return '';
  return users.find((u) => u.id === userId)?.name ?? '';
}

export function applyDir<T>(cmp: number, dir: SortDir): number {
  return dir === 'asc' ? cmp : -cmp;
}
