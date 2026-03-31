import type { Lead, User } from '../types';

export type LeadFilterFieldKey =
  | 'all'
  | 'name'
  | 'email'
  | 'phone'
  | 'company'
  | 'status'
  | 'source'
  | 'value'
  | 'createdAt'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'lastModifiedAt'
  | 'id';

export const LEAD_FILTER_FIELDS: { key: LeadFilterFieldKey; label: string }[] = [
  { key: 'all', label: 'All fields' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'value', label: 'Value' },
  { key: 'createdAt', label: 'Created date' },
  { key: 'createdBy', label: 'Created by' },
  { key: 'lastModifiedBy', label: 'Last modified by' },
  { key: 'lastModifiedAt', label: 'Last modified at' },
  { key: 'id', label: 'ID' },
];

export function leadFieldSearchString(
  lead: Lead,
  field: Exclude<LeadFilterFieldKey, 'all'>,
  users: User[],
): string {
  switch (field) {
    case 'value':
      return String(lead.value ?? '');
    case 'createdBy':
    case 'lastModifiedBy': {
      const id = lead[field];
      if (id == null || id === '') return '';
      return users.find((u) => u.id === String(id))?.name ?? String(id);
    }
    case 'createdAt':
    case 'lastModifiedAt': {
      const raw = lead[field];
      if (!raw) return '';
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString();
    }
    default:
      return String((lead as Record<string, unknown>)[field] ?? '');
  }
}

export function leadMatchesFieldFilter(
  lead: Lead,
  field: LeadFilterFieldKey,
  query: string,
  users: User[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (field === 'all') {
    return LEAD_FILTER_FIELDS.filter((f) => f.key !== 'all').some((f) => {
      const hay = leadFieldSearchString(lead, f.key, users).toLowerCase();
      return hay.includes(q);
    });
  }
  const hay = leadFieldSearchString(lead, field, users).toLowerCase();
  if (field === 'status') return hay === q;
  if (field === 'value') {
    const n = parseFloat(q.replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(n) && q.length > 0) {
      return Number(lead.value) === n || hay.includes(q);
    }
  }
  return hay.includes(q);
}
