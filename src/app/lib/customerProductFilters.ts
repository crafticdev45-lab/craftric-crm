import type { Customer, Lead, Product, User } from '../types';

export type CustomerFilterFieldKey =
  | 'all'
  | 'name'
  | 'status'
  | 'leadId'
  | 'createdAt'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'lastModifiedAt'
  | 'id';

export const CUSTOMER_FILTER_FIELDS: { key: CustomerFilterFieldKey; label: string }[] = [
  { key: 'all', label: 'All fields' },
  { key: 'name', label: 'Company name' },
  { key: 'status', label: 'Status' },
  { key: 'leadId', label: 'Lead' },
  { key: 'createdAt', label: 'Created date' },
  { key: 'createdBy', label: 'Created by' },
  { key: 'lastModifiedBy', label: 'Last modified by' },
  { key: 'lastModifiedAt', label: 'Last modified at' },
  { key: 'id', label: 'ID' },
];

export function customerFieldSearchString(
  customer: Customer,
  field: Exclude<CustomerFilterFieldKey, 'all'>,
  users: User[],
  leads: Lead[],
): string {
  switch (field) {
    case 'leadId': {
      if (!customer.leadId) return '';
      const lead = leads.find((l) => String(l.id) === String(customer.leadId));
      return lead ? `${lead.name} ${lead.company} ${lead.email}` : String(customer.leadId);
    }
    case 'createdBy':
    case 'lastModifiedBy': {
      const id = customer[field];
      if (id == null || id === '') return '';
      return users.find((u) => u.id === String(id))?.name ?? String(id);
    }
    case 'createdAt':
    case 'lastModifiedAt': {
      const raw = customer[field];
      if (!raw) return '';
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString();
    }
    case 'status':
      return customer.status;
    default:
      return String((customer as Record<string, unknown>)[field] ?? '');
  }
}

export function customerMatchesFieldFilter(
  customer: Customer,
  field: CustomerFilterFieldKey,
  query: string,
  users: User[],
  leads: Lead[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (field === 'all') {
    return CUSTOMER_FILTER_FIELDS.filter((f) => f.key !== 'all').some((f) =>
      customerFieldSearchString(customer, f.key, users, leads).toLowerCase().includes(q),
    );
  }
  const hay = customerFieldSearchString(customer, field, users, leads).toLowerCase();
  if (field === 'status') return hay === q;
  return hay.includes(q);
}

export type ProductFilterFieldKey =
  | 'all'
  | 'name'
  | 'description'
  | 'category'
  | 'createdAt'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'lastModifiedAt'
  | 'id';

export const PRODUCT_FILTER_FIELDS: { key: ProductFilterFieldKey; label: string }[] = [
  { key: 'all', label: 'All fields' },
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'createdAt', label: 'Created date' },
  { key: 'createdBy', label: 'Created by' },
  { key: 'lastModifiedBy', label: 'Last modified by' },
  { key: 'lastModifiedAt', label: 'Last modified at' },
  { key: 'id', label: 'ID' },
];

export function productFieldSearchString(
  product: Product,
  field: Exclude<ProductFilterFieldKey, 'all'>,
  users: User[],
): string {
  switch (field) {
    case 'createdBy':
    case 'lastModifiedBy': {
      const id = product[field];
      if (id == null || id === '') return '';
      return users.find((u) => u.id === String(id))?.name ?? String(id);
    }
    case 'createdAt':
    case 'lastModifiedAt': {
      const raw = product[field];
      if (!raw) return '';
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString();
    }
    default:
      return String((product as Record<string, unknown>)[field] ?? '');
  }
}

export function productMatchesFieldFilter(
  product: Product,
  field: ProductFilterFieldKey,
  query: string,
  users: User[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (field === 'all') {
    return PRODUCT_FILTER_FIELDS.filter((f) => f.key !== 'all').some((f) =>
      productFieldSearchString(product, f.key, users).toLowerCase().includes(q),
    );
  }
  const hay = productFieldSearchString(product, field, users).toLowerCase();
  return hay.includes(q);
}
