/**
 * API client for Craftric Interior CRM
 *
 * Option A – Neon + Netlify (no rate limit): set VITE_API_URL to your Netlify site + /api
 *   Example: VITE_API_URL=https://your-site.netlify.app/api
 *   Or for local: VITE_API_URL=http://localhost:8888/api
 *
 * Option B – Xano: set VITE_XANO_BASE_URL
 *   Example: VITE_XANO_BASE_URL=https://your-instance.xano.io/api:your_api_group_id
 *   Optional: VITE_XANO_API_KEY for API key header
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const XANO_BASE_URL = import.meta.env.VITE_XANO_BASE_URL ?? '';
const BASE_URL = API_BASE_URL || XANO_BASE_URL;
const API_KEY = import.meta.env.VITE_XANO_API_KEY ?? '';

/** True when using Neon/Netlify API (VITE_API_URL). */
export const isNeonApi = () => !!API_BASE_URL;

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

/** Thrown when Xano returns 429 (rate limit). Free plan: 10 requests per 20 seconds. */
export class RateLimitError extends Error {
  constructor(message = 'Too many requests. Please wait a moment and try again.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function handleResponse<T>(res: Response, body?: string): Promise<T> {
  if (!res.ok) {
    const text = body ?? (await res.text());
    if (res.status === 429) {
      throw new RateLimitError(text || 'Too many requests. Please wait about 20 seconds and try again.');
    }
    throw new Error(`XANO API error ${res.status}: ${text || res.statusText}`);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return body ? JSON.parse(body) : res.json();
  }
  return (body ?? (await res.text())) as unknown as T;
}

// XANO often returns { records: [...] }, { data: [...] }, or { items: [...] } for list endpoints
function unwrapRecords<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.records)) return o.records as T[];
  if (Array.isArray(o.items)) return o.items as T[];
  if (Array.isArray(o.data)) return o.data as T[];
  return [];
}

// XANO may return the record directly, as first element of array, or inside { record } / { data }
function unwrapRecord<T>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (o.record != null) return o.record as T;
    if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) return o.data as T;
  }
  return data as T;
}

const SNAKE_TO_CAMEL: Record<string, string> = {
  created_at: 'createdAt',
  last_modified_by: 'lastModifiedBy',
  last_modified_at: 'lastModifiedAt',
  lead_id: 'leadId',
  customer_id: 'customerId',
  product_id: 'productId',
  created_by: 'createdBy',
};

const CAMEL_TO_SNAKE: Record<string, string> = {
  createdAt: 'created_at',
  lastModifiedBy: 'last_modified_by',
  lastModifiedAt: 'last_modified_at',
  leadId: 'lead_id',
  customerId: 'customer_id',
  productId: 'product_id',
  createdBy: 'created_by',
};

function toCamelCase(key: string): string {
  return SNAKE_TO_CAMEL[key] ?? key;
}

function toSnakeCase(key: string): string {
  return CAMEL_TO_SNAKE[key] ?? key;
}

/** Convert request body keys to snake_case for Xano API. FK fields (e.g. product_id) sent as number if value is numeric string. */
export function bodyToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const snake = toSnakeCase(k);
    if (snake.endsWith('_id') && typeof v === 'string' && /^\d+$/.test(v)) {
      out[snake] = parseInt(v, 10);
    } else {
      out[snake] = v;
    }
  }
  return out;
}

/** Normalize a record from Xano: snake_case -> camelCase, ensure id (and common FKs) are strings. */
export function normalizeXanoRecord<T extends Record<string, unknown>>(raw: unknown): T {
  if (!raw || typeof raw !== 'object') return {} as T;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    const camel = toCamelCase(k);
    if (camel === 'id' || camel === 'leadId' || camel === 'customerId' || camel === 'productId' || camel === 'createdBy' || camel === 'lastModifiedBy') {
      out[camel] = v != null ? String(v) : v;
    } else {
      out[camel] = v;
    }
  }
  return out as T;
}

const DEFAULT_429_RETRY_AFTER_MS = 2500; // Xano free: 10 req / 20s; wait ~2.5s then retry once

export async function xanoFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  retryOn429 = true
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers as Record<string, string>) },
  });
  const body = await res.text();
  if (res.status === 429 && retryOn429) {
    const retryAfterMs =
      Number(res.headers.get('retry-after')) * 1000 || DEFAULT_429_RETRY_AFTER_MS;
    await new Promise((r) => setTimeout(r, Math.min(retryAfterMs, 8000)));
    return xanoFetch<T>(path, options, token, false);
  }
  return handleResponse<T>(res, body || undefined);
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
  const payload = isNeonApi() ? body : bodyToSnakeCase(body);
  const data = await xanoFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
  return unwrapRecord<T>(data) ?? (data as T);
}

export async function xanoUpdate<T>(
  endpoint: string,
  id: string,
  body: Record<string, unknown>,
  token?: string | null
): Promise<T | null> {
  const payload = isNeonApi() ? body : bodyToSnakeCase(body);
  const data = await xanoFetch<unknown>(`${endpoint}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
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
