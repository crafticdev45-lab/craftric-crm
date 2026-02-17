import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Customer, Contact, Product, Model, Lead } from '../types';
import { useAuth } from './AuthContext';
import {
  isXanoEnabled,
  xanoList,
  xanoCreate,
  xanoUpdate,
  xanoDelete,
  XANO_ENDPOINTS,
} from '@/lib/xano';

interface DataContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (id: string, contact: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactsByCustomer: (customerId: string) => Contact[];
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  models: Model[];
  addModel: (model: Omit<Model, 'id'>) => void;
  updateModel: (id: string, model: Partial<Model>) => void;
  deleteModel: (id: string) => void;
  getModelsByProduct: (productId: string) => Model[];
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'createdBy'>) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const now = () => new Date().toISOString();

const initialCustomers: Customer[] = [
  { id: '1', name: 'Acme Corporation', status: 'active', leadId: '1', createdAt: '2024-01-15', lastModifiedBy: '1', lastModifiedAt: '2024-01-15T12:00:00Z' },
  { id: '2', name: 'TechStart Inc', status: 'active', leadId: '2', createdAt: '2024-02-01', lastModifiedBy: '1', lastModifiedAt: '2024-02-01T12:00:00Z' },
];

const initialContacts: Contact[] = [
  { id: '1', customerId: '1', name: 'Jane Doe', email: 'jane.doe@acmecorp.com', phone: '+1-555-0103', role: 'Project Manager', lastModifiedBy: '1', lastModifiedAt: '2024-01-15T12:00:00Z' },
  { id: '2', customerId: '1', name: 'Bob Wilson', email: 'bob.w@acmecorp.com', phone: '+1-555-0104', role: 'Technical Lead', lastModifiedBy: '1', lastModifiedAt: '2024-01-15T12:00:00Z' },
];

const initialProducts: Product[] = [
  { id: '1', name: 'Enterprise Software Suite', description: 'Complete business management solution', category: 'Software', createdAt: '2023-11-01', lastModifiedBy: '1', lastModifiedAt: '2023-11-01T12:00:00Z' },
  { id: '2', name: 'Hardware Server', description: 'High-performance server hardware', category: 'Hardware', createdAt: '2023-12-15', lastModifiedBy: '1', lastModifiedAt: '2023-12-15T12:00:00Z' },
];

const initialModels: Model[] = [
  { id: '1', productId: '1', name: 'Basic Edition', sku: 'ESS-BASIC-001', stock: 150, price: 299.99, lastModifiedBy: '1', lastModifiedAt: '2023-11-01T12:00:00Z' },
  { id: '2', productId: '1', name: 'Professional Edition', sku: 'ESS-PRO-001', stock: 75, price: 599.99, lastModifiedBy: '1', lastModifiedAt: '2023-11-01T12:00:00Z' },
  { id: '3', productId: '2', name: 'Standard Server', sku: 'HW-SRV-STD-001', stock: 25, price: 2499.99, lastModifiedBy: '1', lastModifiedAt: '2023-12-15T12:00:00Z' },
];

const initialLeads: Lead[] = [
  { id: '1', name: 'Michael Chen', email: 'mchen@globaltech.com', phone: '+1-555-0301', company: 'Global Tech Solutions', status: 'new', source: 'Website', value: 15000, createdAt: '2024-02-10', createdBy: '1', lastModifiedBy: '1', lastModifiedAt: '2024-02-10T12:00:00Z' },
  { id: '2', name: 'Emily Rodriguez', email: 'emily.r@innovate.co', phone: '+1-555-0302', company: 'Innovate Co', status: 'contacted', source: 'Referral', value: 25000, createdAt: '2024-02-08', createdBy: '2', lastModifiedBy: '2', lastModifiedAt: '2024-02-08T12:00:00Z' },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const { currentUser, token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [models, setModels] = useState<Model[]>(initialModels);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authToken = isXanoEnabled() ? token : null;

  // Fetch from XANO when enabled
  useEffect(() => {
    if (!isXanoEnabled()) return;
    // Some XANO setups allow unauthenticated read; try with token if available
    const t = authToken ?? undefined;
    setIsLoading(true);
    setError(null);
    Promise.all([
      xanoList<Customer>(XANO_ENDPOINTS.customers, t),
      xanoList<Contact>(XANO_ENDPOINTS.contacts, t),
      xanoList<Product>(XANO_ENDPOINTS.products, t),
      xanoList<Model>(XANO_ENDPOINTS.models, t),
      xanoList<Lead>(XANO_ENDPOINTS.leads, t),
    ])
      .then(([c, ct, p, m, l]) => {
        setCustomers(c.length ? c : initialCustomers);
        setContacts(ct.length ? ct : initialContacts);
        setProducts(p.length ? p : initialProducts);
        setModels(m.length ? m : initialModels);
        setLeads(l.length ? l : initialLeads);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load data'))
      .finally(() => setIsLoading(false));
  }, [authToken]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newCustomer: Customer = { ...customer, id: Date.now().toString(), createdAt: ts.split('T')[0], lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setCustomers((prev) => [...prev, newCustomer]);
      return;
    }
    try {
      const created = await xanoCreate<Customer>(XANO_ENDPOINTS.customers, customer as Record<string, unknown>, authToken);
      if (created) setCustomers((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add customer');
    }
  }, [authToken, currentUser?.id]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : c)));
      return;
    }
    try {
      const updated = await xanoUpdate<Customer>(XANO_ENDPOINTS.customers, id, updates, authToken);
      if (updated) setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update customer');
    }
  }, [authToken]);

  const deleteCustomer = useCallback(async (id: string) => {
    if (!isXanoEnabled()) {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setContacts((prev) => prev.filter((c) => c.customerId !== id));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.customers, id, authToken);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setContacts((prev) => prev.filter((c) => c.customerId !== id));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete customer');
    }
  }, [authToken, currentUser?.id]);

  const addContact = useCallback(async (contact: Omit<Contact, 'id'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newContact: Contact = { ...contact, id: Date.now().toString(), lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setContacts((prev) => [...prev, newContact]);
      return;
    }
    try {
      const created = await xanoCreate<Contact>(XANO_ENDPOINTS.contacts, contact as Record<string, unknown>, authToken);
      if (created) setContacts((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add contact');
    }
  }, [authToken]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : c)));
      return;
    }
    try {
      const updated = await xanoUpdate<Contact>(XANO_ENDPOINTS.contacts, id, updates, authToken);
      if (updated) setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update contact');
    }
  }, [authToken]);

  const deleteContact = useCallback(async (id: string) => {
    if (!isXanoEnabled()) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.contacts, id, authToken);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete contact');
    }
  }, [authToken]);

  const getContactsByCustomer = useCallback((customerId: string) => {
    return contacts.filter((c) => c.customerId === customerId);
  }, [contacts]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newProduct: Product = { ...product, id: Date.now().toString(), createdAt: ts.split('T')[0], lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setProducts((prev) => [...prev, newProduct]);
      return;
    }
    try {
      const created = await xanoCreate<Product>(XANO_ENDPOINTS.products, product as Record<string, unknown>, authToken);
      if (created) setProducts((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add product');
    }
  }, [authToken]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : p)));
      return;
    }
    try {
      const updated = await xanoUpdate<Product>(XANO_ENDPOINTS.products, id, updates, authToken);
      if (updated) setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update product');
    }
  }, [authToken]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!isXanoEnabled()) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setModels((prev) => prev.filter((m) => m.productId !== id));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.products, id, authToken);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setModels((prev) => prev.filter((m) => m.productId !== id));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete product');
    }
  }, [authToken, currentUser?.id]);

  const addModel = useCallback(async (model: Omit<Model, 'id'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newModel: Model = { ...model, id: Date.now().toString(), lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setModels((prev) => [...prev, newModel]);
      return;
    }
    try {
      const created = await xanoCreate<Model>(XANO_ENDPOINTS.models, model as Record<string, unknown>, authToken);
      if (created) setModels((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add model');
    }
  }, [authToken]);

  const updateModel = useCallback(async (id: string, updates: Partial<Model>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : m)));
      return;
    }
    try {
      const updated = await xanoUpdate<Model>(XANO_ENDPOINTS.models, id, updates, authToken);
      if (updated) setModels((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update model');
    }
  }, [authToken]);

  const deleteModel = useCallback(async (id: string) => {
    if (!isXanoEnabled()) {
      setModels((prev) => prev.filter((m) => m.id !== id));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.models, id, authToken);
      setModels((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete model');
    }
  }, [authToken]);

  const getModelsByProduct = useCallback((productId: string) => {
    return models.filter((m) => m.productId === productId);
  }, [models]);

  const addLead = useCallback(async (lead: Omit<Lead, 'id' | 'createdAt' | 'createdBy'>) => {
    const payload = { ...lead, createdBy: currentUser?.id ?? '' };
    if (!isXanoEnabled()) {
      const ts = now();
      const newLead: Lead = {
        ...payload,
        id: Date.now().toString(),
        createdAt: ts.split('T')[0],
        createdBy: currentUser?.id ?? '',
        lastModifiedBy: currentUser?.id,
        lastModifiedAt: ts,
      };
      setLeads((prev) => [...prev, newLead]);
      return;
    }
    try {
      const created = await xanoCreate<Lead>(XANO_ENDPOINTS.leads, payload as Record<string, unknown>, authToken);
      if (created) setLeads((prev) => [...prev, created]);
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add lead');
    }
  }, [authToken, currentUser?.id]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const lead = leads.find((l) => l.id === id);
      const alreadyConverted = customers.some((c) => c.leadId === id);
      if (lead && updates.status === 'converted' && !alreadyConverted) {
        const newCustomer: Customer = {
          id: Date.now().toString(),
          name: lead.company,
          status: 'active',
          leadId: lead.id,
          createdAt: ts.split('T')[0],
          lastModifiedBy: currentUser?.id,
          lastModifiedAt: ts,
        };
        const newContact: Contact = {
          id: (Date.now() + 1).toString(),
          customerId: newCustomer.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          role: 'Primary Contact',
          lastModifiedBy: currentUser?.id,
          lastModifiedAt: ts,
        };
        setCustomers((prev) => [...prev, newCustomer]);
        setContacts((prev) => [...prev, newContact]);
      }
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : l)));
      return;
    }
    try {
      const lead = leads.find((l) => l.id === id);
      const alreadyConverted = customers.some((c) => c.leadId === id);
      const updated = await xanoUpdate<Lead>(XANO_ENDPOINTS.leads, id, updates, authToken);
      if (updated) setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (lead && updates.status === 'converted' && !alreadyConverted) {
        const newCustomer = await xanoCreate<Customer>(
          XANO_ENDPOINTS.customers,
          { name: lead.company, status: 'active', leadId: lead.id } as Record<string, unknown>,
          authToken
        );
        const cust = Array.isArray(newCustomer) ? newCustomer[0] : newCustomer;
        if (cust && typeof cust === 'object' && cust.id) {
          setCustomers((prev) => [...prev, cust as Customer]);
          const newContact = await xanoCreate<Contact>(
            XANO_ENDPOINTS.contacts,
            { customerId: cust.id, name: lead.name, email: lead.email, phone: lead.phone, role: 'Primary Contact' } as Record<string, unknown>,
            authToken
          );
          const c = Array.isArray(newContact) ? newContact[0] : newContact;
          if (c && typeof c === 'object' && c.id) setContacts((prev) => [...prev, c as Contact]);
        }
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update lead');
    }
  }, [authToken, leads, customers, currentUser?.id]);

  const deleteLead = useCallback(async (id: string): Promise<boolean> => {
    const hasLinkedCustomer = customers.some((c) => c.leadId === id);
    if (hasLinkedCustomer) {
      setError('Cannot delete lead: it is linked to an existing customer');
      return false;
    }
    if (!isXanoEnabled()) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      return true;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.leads, id, authToken);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      return true;
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete lead');
      return false;
    }
  }, [authToken, customers]);

  return (
    <DataContext.Provider
      value={{
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        contacts,
        addContact,
        updateContact,
        deleteContact,
        getContactsByCustomer,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        models,
        addModel,
        updateModel,
        deleteModel,
        getModelsByProduct,
        leads,
        addLead,
        updateLead,
        deleteLead,
        isLoading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
