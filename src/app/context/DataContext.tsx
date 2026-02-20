import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Customer, Contact, Product, Model, Lead } from '../types';
import { useAuth } from './AuthContext';
import {
  isXanoEnabled,
  isNeonApi,
  xanoList,
  xanoCreate,
  xanoUpdate,
  xanoDelete,
  XANO_ENDPOINTS,
  normalizeXanoRecord,
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

const now = () => new Date().toISOString();

export function DataProvider({ children }: { children: ReactNode }) {
  const { currentUser, token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authToken = isXanoEnabled() ? token : null;

  const fetchAll = useCallback(() => {
    if (!isXanoEnabled()) return Promise.resolve();
    const t = authToken ?? undefined;
    setIsLoading(true);
    setError(null);
    return Promise.all([
      xanoList<unknown>(XANO_ENDPOINTS.customers, t),
      xanoList<unknown>(XANO_ENDPOINTS.contacts, t),
      xanoList<unknown>(XANO_ENDPOINTS.products, t),
      xanoList<unknown>(XANO_ENDPOINTS.models, t),
      xanoList<unknown>(XANO_ENDPOINTS.leads, t),
    ])
      .then(([c, ct, p, m, l]) => {
        setCustomers((c as unknown[]).map((r) => normalizeXanoRecord<Customer>(r) as Customer));
        setContacts((ct as unknown[]).map((r) => normalizeXanoRecord<Contact>(r) as Contact));
        setProducts((p as unknown[]).map((r) => normalizeXanoRecord<Product>(r) as Product));
        setModels((m as unknown[]).map((r) => normalizeXanoRecord<Model>(r) as Model));
        setLeads((l as unknown[]).map((r) => normalizeXanoRecord<Lead>(r) as Lead));
      })
      .catch((err) => setError(err?.message ?? 'Failed to load data'))
      .finally(() => setIsLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (!isXanoEnabled()) return;
    // Only fetch when logged in to avoid burning Xano rate limit on login page (5 list calls)
    if (!token) return;
    fetchAll();
  }, [fetchAll, token]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newCustomer: Customer = { ...customer, id: Date.now().toString(), createdAt: ts.split('T')[0], lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setCustomers((prev) => [...prev, newCustomer]);
      return;
    }
    try {
      const raw = await xanoCreate<unknown>(XANO_ENDPOINTS.customers, customer as Record<string, unknown>, authToken);
      const created = raw ? (normalizeXanoRecord<Customer>(raw) as Customer) : null;
      if (created?.id) setCustomers((prev) => [...prev, created]);
      else await fetchAll();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add customer');
    }
  }, [authToken, currentUser?.id, fetchAll]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : c)));
      return;
    }
    try {
      const raw = await xanoUpdate<unknown>(XANO_ENDPOINTS.customers, id, updates, authToken);
      const updated = raw ? (normalizeXanoRecord<Customer>(raw) as Customer) : null;
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
      const raw = await xanoCreate<unknown>(XANO_ENDPOINTS.contacts, contact as Record<string, unknown>, authToken);
      const created = raw ? (normalizeXanoRecord<Contact>(raw) as Contact) : null;
      if (created?.id && String(created.customerId) === String(contact.customerId)) {
        setContacts((prev) => [...prev, created]);
      } else {
        await fetchAll();
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add contact');
    }
  }, [authToken, fetchAll]);

  const updateContact = useCallback(async (id: string, updates: Partial<Contact>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : c)));
      return;
    }
    try {
      const raw = await xanoUpdate<unknown>(XANO_ENDPOINTS.contacts, id, updates, authToken);
      const updated = raw ? (normalizeXanoRecord<Contact>(raw) as Contact) : null;
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
      const raw = await xanoCreate<unknown>(XANO_ENDPOINTS.products, product as Record<string, unknown>, authToken);
      const created = raw ? (normalizeXanoRecord<Product>(raw) as Product) : null;
      if (created?.id) setProducts((prev) => [...prev, created]);
      else await fetchAll();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add product');
    }
  }, [authToken, fetchAll]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : p)));
      return;
    }
    try {
      const raw = await xanoUpdate<unknown>(XANO_ENDPOINTS.products, id, updates, authToken);
      const updated = raw ? (normalizeXanoRecord<Product>(raw) as Product) : null;
      if (updated) setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update product');
    }
  }, [authToken]);

  const deleteProduct = useCallback(async (id: string) => {
    const idStr = String(id);
    if (!isXanoEnabled()) {
      setProducts((prev) => prev.filter((p) => String(p.id) !== idStr));
      setModels((prev) => prev.filter((m) => String(m.productId) !== idStr));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.products, idStr, authToken);
      setProducts((prev) => prev.filter((p) => String(p.id) !== idStr));
      setModels((prev) => prev.filter((m) => String(m.productId) !== idStr));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete product');
    }
  }, [authToken]);

  const addModel = useCallback(async (model: Omit<Model, 'id'>) => {
    if (!isXanoEnabled()) {
      const ts = now();
      const newModel: Model = { ...model, id: Date.now().toString(), lastModifiedBy: currentUser?.id, lastModifiedAt: ts };
      setModels((prev) => [...prev, newModel]);
      return;
    }
    try {
      const raw = await xanoCreate<unknown>(XANO_ENDPOINTS.models, model as Record<string, unknown>, authToken);
      const created = raw ? (normalizeXanoRecord<Model>(raw) as Model) : null;
      if (created?.id) setModels((prev) => [...prev, created]);
      else await fetchAll();
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to add model');
    }
  }, [authToken, fetchAll]);

  const updateModel = useCallback(async (id: string, updates: Partial<Model>) => {
    const idStr = String(id);
    if (!isXanoEnabled()) {
      const ts = now();
      setModels((prev) => prev.map((m) => (String(m.id) === idStr ? { ...m, ...updates, lastModifiedBy: currentUser?.id, lastModifiedAt: ts } : m)));
      return;
    }
    try {
      const raw = await xanoUpdate<unknown>(XANO_ENDPOINTS.models, idStr, updates, authToken);
      const updated = raw ? (normalizeXanoRecord<Model>(raw) as Model) : null;
      if (updated) setModels((prev) => prev.map((m) => (String(m.id) === idStr ? updated : m)));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update model');
    }
  }, [authToken]);

  const deleteModel = useCallback(async (id: string) => {
    const idStr = String(id);
    if (!isXanoEnabled()) {
      setModels((prev) => prev.filter((m) => String(m.id) !== idStr));
      return;
    }
    try {
      await xanoDelete(XANO_ENDPOINTS.models, idStr, authToken);
      setModels((prev) => prev.filter((m) => String(m.id) !== idStr));
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to delete model');
    }
  }, [authToken]);

  const getModelsByProduct = useCallback((productId: string) => {
    const pid = String(productId);
    return models.filter((m) => String(m.productId) === pid);
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
      const updated = await xanoUpdate<Lead>(XANO_ENDPOINTS.leads, id, updates, authToken);
      if (updated) setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      // Neon API creates account + contact server-side when status is set to 'converted'; refetch to get them
      if (updates.status === 'converted' && isNeonApi()) {
        await fetchAll();
      }
      // Xano (or other backends): create customer + contact on the client when converting
      if (!isNeonApi()) {
        const lead = leads.find((l) => l.id === id);
        const alreadyConverted = customers.some((c) => c.leadId === id);
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
              { customerId: cust.id, name: lead.name, email: lead.email, phone: lead.phone ?? '', role: 'Primary Contact' } as Record<string, unknown>,
              authToken
            );
            const c = Array.isArray(newContact) ? newContact[0] : newContact;
            if (c && typeof c === 'object' && c.id) setContacts((prev) => [...prev, c as Contact]);
          }
        }
      }
    } catch (e) {
      setError((e as Error)?.message ?? 'Failed to update lead');
    }
  }, [authToken, leads, customers, currentUser?.id, fetchAll]);

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
