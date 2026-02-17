/**
 * XANO API client for Craftric Interior CRM
 *
 * Set VITE_XANO_BASE_URL in .env to enable XANO. Example:
 * VITE_XANO_BASE_URL=https://your-instance.xano.io/api:your_api_group_id
 *
 * Optional: VITE_XANO_API_KEY for endpoints that require an API key header
 */

const BASE_URL = import.meta.env.VITE_XANO_BASE_URL ?? '';
const API_KEY = import.meta.env.VITE_XANO_API_KEY ?? '';

export const isXanoEnabled = () => !!BASE_URL;

function getHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['X-Xano-API-Key'] = API_KEY;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`XANO API error ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json();
  }
  return res.text() as unknown as T;
}

// XANO often returns { records: [...] } for list endpoints or the record directly
function unwrapRecords<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'records' in data && Array.isArray((data as { records: unknown }).records)) {
    return (data as { records: T[] }).records;
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

function unwrapRecord<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data as T;
}

export async function xanoFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers as Record<string, string>) },
  });
  return handleResponse<T>(res);
}

// Auth
export async function xanoLogin(email: string, password: string) {
  const data = await xanoFetch<{ authToken?: string; token?: string }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );
  return data?.authToken ?? (data as { token?: string })?.token ?? null;
}

export async function xanoMe<T>(token: string): Promise<T | null> {
  const data = await xanoFetch<unknown>('/auth/me', { method: 'GET' }, token);
  return unwrapRecord<T>(data);
}

// CRUD helpers
export async function xanoList<T>(endpoint: string, token?: string | null): Promise<T[]> {
  const data = await xanoFetch<unknown>(endpoint, { method: 'GET' }, token);
  return unwrapRecords<T>(data);
}

export async function xanoGet<T>(endpoint: string, id: string, token?: string | null): Promise<T | null> {
  const data = await xanoFetch<unknown>(`${endpoint}/${id}`, { method: 'GET' }, token);
  return unwrapRecord<T>(data);
}

export async function xanoCreate<T>(endpoint: string, body: Record<string, unknown>, token?: string | null): Promise<T> {
  const data = await xanoFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
  return unwrapRecord<T>(data) ?? (data as T);
}

export async function xanoUpdate<T>(
  endpoint: string,
  id: string,
  body: Record<string, unknown>,
  token?: string | null
): Promise<T | null> {
  const data = await xanoFetch<unknown>(`${endpoint}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }, token);
  return unwrapRecord<T>(data);
}

export async function xanoDelete(endpoint: string, id: string, token?: string | null): Promise<void> {
  await xanoFetch(`${endpoint}/${id}`, { method: 'DELETE' }, token);
}

// Endpoint paths - customize if your XANO API uses different names
export const XANO_ENDPOINTS = {
  customers: '/customers',
  contacts: '/contacts',
  products: '/products',
  models: '/models',
  leads: '/leads',
  users: '/users',
} as const;
