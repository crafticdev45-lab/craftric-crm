export type ObjectType = 'customers' | 'contacts' | 'products' | 'models' | 'leads' | 'users';
export interface ObjectPermissions {
  read: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Customer {
  id: string;
  name: string; // Company name
  status: 'active' | 'inactive' | 'pending';
  leadId: string | null;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Model {
  id: string;
  productId: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost' | 'converted';
  source: string;
  value: number;
  createdAt: string;
  createdBy: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sales' | 'manager';
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}