import { neon } from '@neondatabase/serverless';
import type { Handler, HandlerEvent } from '@netlify/functions';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || process.env.NETLIFY_JWT_SECRET || 'craftric-dev-secret-change-in-production';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL;

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

const CAMEL: Record<string, string> = {
  created_at: 'createdAt',
  last_modified_by: 'lastModifiedBy',
  last_modified_at: 'lastModifiedAt',
  lead_id: 'leadId',
  customer_id: 'customerId',
  product_id: 'productId',
  created_by: 'createdBy',
};

function rowToCamel(row: Record<string, unknown>, omitKeys: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (omitKeys.includes(k)) continue;
    const key = CAMEL[k] ?? k;
    const val = v != null && (key === 'id' || key.endsWith('Id')) ? String(v) : v;
    out[key] = val;
  }
  return out;
}

function json(res: unknown, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(res),
  };
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const got = await hashPassword(password, salt);
  return got === hash;
}

async function getAuth(event: HandlerEvent): Promise<{ userId: string } | null> {
  const auth = event.headers.authorization || (event.headers as Record<string, string>)['Authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = payload.sub;
    if (sub) return { userId: String(sub) };
  } catch {
    return null;
  }
  return null;
}

async function signToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setExpirationTime('7d')
    .sign(secret);
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }, body: '' };
  }

  if (!sql) {
    return err(
      'Database not configured. In Netlify: Site configuration → Environment variables → add DATABASE_URL with your Neon connection string, then redeploy.',
      503
    );
  }

  const pathFromQuery = (event.queryStringParameters?.path as string) || '';
  const pathFromPath = (event.path || '').replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const path = ('/' + (pathFromQuery || pathFromPath).replace(/^\//, '')).replace(/\/$/, '') || '/';
  const segments = path.split('/').filter(Boolean);
  const method = event.httpMethod || 'GET';
  let body: Record<string, unknown> = {};
  if (event.body && (method === 'POST' || method === 'PATCH')) {
    try {
      body = JSON.parse(event.body) as Record<string, unknown>;
    } catch {
      return err('Invalid JSON body');
    }
  }

  // Auth routes (no Bearer required for login/signup)
  if (segments[0] === 'auth') {
    if (path === '/auth/login' && method === 'POST') {
      const email = (body.email as string)?.trim?.();
      const password = body.password as string;
      if (!email || !password) return err('Email and password required');
      const rows = await sql`SELECT id, name, email, role, created_at, password_salt, password_hash FROM users WHERE email = ${email} LIMIT 1`;
      const user = rows[0] as Record<string, unknown> | undefined;
      if (!user) return err('Invalid email or password', 401);
      const ok = await verifyPassword(password, (user.password_salt as string) || '', (user.password_hash as string) || '');
      if (!ok) return err('Invalid email or password', 401);
      const token = await signToken(String(user.id));
      return json({ authToken: token, token });
    }

    if (path === '/auth/signup' && method === 'POST') {
      const name = (body.name as string)?.trim?.();
      const email = (body.email as string)?.trim?.();
      const password = body.password as string;
      const role = ((body.role as string) || 'sales') as string;
      if (!name || !email || !password) return err('Name, email and password required');
      const salt = crypto.randomUUID().replace(/-/g, '');
      const hash = await hashPassword(password, salt);
      try {
        const inserted = await sql`
          INSERT INTO users (name, email, password_salt, password_hash, role)
          VALUES (${name}, ${email}, ${salt}, ${hash}, ${role})
          RETURNING id, name, email, role, created_at
        `;
        const row = (inserted[0] as Record<string, unknown>) || {};
        return json(rowToCamel(row));
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === '23505' ? 'Email already exists' : 'Signup failed';
        return err(msg, 400);
      }
    }

    if (path === '/auth/me' && method === 'GET') {
      const auth = await getAuth(event);
      if (!auth) return err('Unauthorized', 401);
      const rows = await sql`SELECT id, name, email, role, created_at FROM users WHERE id = ${auth.userId} LIMIT 1`;
      const user = rows[0] as Record<string, unknown> | undefined;
      if (!user) return err('User not found', 404);
      return json(rowToCamel(user));
    }

    if (path === '/auth/send-reset-link' && method === 'POST') {
      const auth = await getAuth(event);
      if (!auth) return err('Unauthorized', 401);
      const email = (body.email as string)?.trim?.();
      if (!email) return err('Email required');
      const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (rows.length === 0) return err('No user found with this email', 404);
      // TODO: generate reset token, store it, and send email via your provider (SendGrid, Resend, etc.)
      return json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    return err('Not found', 404);
  }

  const auth = await getAuth(event);
  if (!auth) return err('Unauthorized', 401);

  const resource = segments[0];
  const id = segments[1];

  const tableMap: Record<string, string> = {
    customers: 'customers',
    contacts: 'contacts',
    products: 'products',
    models: 'models',
    leads: 'leads',
    users: 'users',
  };
  const table = tableMap[resource];
  if (!table) return err('Not found', 404);

  // List
  if (method === 'GET' && !id) {
    let rows: unknown[] = [];
    if (table === 'customers') rows = await sql`SELECT * FROM customers ORDER BY id DESC`;
    else if (table === 'contacts') rows = await sql`SELECT * FROM contacts ORDER BY id DESC`;
    else if (table === 'products') rows = await sql`SELECT * FROM products ORDER BY id DESC`;
    else if (table === 'models') rows = await sql`SELECT * FROM models ORDER BY id DESC`;
    else if (table === 'leads') rows = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    else if (table === 'users') rows = await sql`SELECT id, name, email, role, created_at, last_modified_by, last_modified_at FROM users ORDER BY created_at DESC`;
    const list = (rows || []).map((r) => rowToCamel(r as Record<string, unknown>, ['password_hash', 'password_salt']));
    return json(list);
  }

  // Get one
  if (method === 'GET' && id) {
    let rows: unknown[] = [];
    if (table === 'customers') rows = await sql`SELECT * FROM customers WHERE id = ${id} LIMIT 1`;
    else if (table === 'contacts') rows = await sql`SELECT * FROM contacts WHERE id = ${id} LIMIT 1`;
    else if (table === 'products') rows = await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`;
    else if (table === 'models') rows = await sql`SELECT * FROM models WHERE id = ${id} LIMIT 1`;
    else if (table === 'leads') rows = await sql`SELECT * FROM leads WHERE id = ${id} LIMIT 1`;
    else if (table === 'users') rows = await sql`SELECT id, name, email, role, created_at, last_modified_by, last_modified_at FROM users WHERE id = ${id} LIMIT 1`;
    const row = (rows?.[0] as Record<string, unknown>) || null;
    if (!row) return err('Not found', 404);
    return json(rowToCamel(row, ['password_hash', 'password_salt']));
  }

  // Create
  if (method === 'POST' && !id) {
    const camelToSnake: Record<string, string> = {
      createdAt: 'created_at',
      lastModifiedBy: 'last_modified_by',
      lastModifiedAt: 'last_modified_at',
      leadId: 'lead_id',
      customerId: 'customer_id',
      productId: 'product_id',
      createdBy: 'created_by',
    };
    const snake: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      const col = camelToSnake[k] ?? k;
      snake[col] = v;
    }
    if (table === 'customers') {
      const name = snake.name as string;
      const status = (snake.status as string) || 'active';
      const lead_id = snake.lead_id != null ? Number(snake.lead_id) : null;
      const inserted = await sql`
        INSERT INTO customers (name, status, lead_id, last_modified_by)
        VALUES (${name}, ${status}, ${lead_id}, ${auth.userId})
        RETURNING *
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
    if (table === 'contacts') {
      const customer_id = Number(snake.customer_id);
      const name = snake.name as string;
      const email = snake.email as string;
      const phone = (snake.phone as string) || '';
      const role = (snake.role as string) || '';
      const inserted = await sql`
        INSERT INTO contacts (customer_id, name, email, phone, role, last_modified_by)
        VALUES (${customer_id}, ${name}, ${email}, ${phone}, ${role}, ${auth.userId})
        RETURNING *
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
    if (table === 'products') {
      const name = snake.name as string;
      const description = (snake.description as string) || '';
      const category = (snake.category as string) || '';
      const inserted = await sql`
        INSERT INTO products (name, description, category, last_modified_by)
        VALUES (${name}, ${description}, ${category}, ${auth.userId})
        RETURNING *
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
    if (table === 'models') {
      const product_id = Number(snake.product_id);
      const name = snake.name as string;
      const sku = snake.sku as string;
      const stock = Number(snake.stock) || 0;
      const price = Number(snake.price) || 0;
      const inserted = await sql`
        INSERT INTO models (product_id, name, sku, stock, price, last_modified_by)
        VALUES (${product_id}, ${name}, ${sku}, ${stock}, ${price}, ${auth.userId})
        RETURNING *
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
    if (table === 'leads') {
      const name = snake.name as string;
      const email = snake.email as string;
      const phone = (snake.phone as string) || '';
      const company = snake.company as string;
      const status = (snake.status as string) || 'new';
      const source = (snake.source as string) || '';
      const value = Number(snake.value) || 0;
      const created_by = auth.userId;
      const inserted = await sql`
        INSERT INTO leads (name, email, phone, company, status, source, value, created_by, last_modified_by)
        VALUES (${name}, ${email}, ${phone}, ${company}, ${status}, ${source}, ${value}, ${created_by}, ${auth.userId})
        RETURNING *
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
    if (table === 'users') {
      const name = snake.name as string;
      const email = snake.email as string;
      const role = (snake.role as string) || 'sales';
      const password = (body.password as string) || 'changeme';
      const salt = crypto.randomUUID().replace(/-/g, '');
      const hash = await hashPassword(password, salt);
      const inserted = await sql`
        INSERT INTO users (name, email, password_salt, password_hash, role, last_modified_by)
        VALUES (${name}, ${email}, ${salt}, ${hash}, ${role}, ${auth.userId})
        RETURNING id, name, email, role, created_at
      `;
      return json(rowToCamel((inserted[0] as Record<string, unknown>) || {}));
    }
  }

  // Update (PATCH)
  if (method === 'PATCH' && id) {
    const camelToSnake: Record<string, string> = {
      createdAt: 'created_at',
      lastModifiedBy: 'last_modified_by',
      lastModifiedAt: 'last_modified_at',
      leadId: 'lead_id',
      customerId: 'customer_id',
      productId: 'product_id',
      createdBy: 'created_by',
    };
    const bodySnake: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      bodySnake[camelToSnake[k] ?? k] = v;
    }
    bodySnake.last_modified_by = auth.userId;

    let updated: unknown[] = [];
    if (table === 'customers') {
      const name = bodySnake.name as string | undefined;
      const status = bodySnake.status as string | undefined;
      const lead_id = bodySnake.lead_id != null && bodySnake.lead_id !== '' ? Number(bodySnake.lead_id) : null;
      updated = await sql`
        UPDATE customers SET
          name = COALESCE(${name ?? null}, name),
          status = COALESCE(${status ?? null}, status),
          lead_id = ${lead_id},
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
    } else if (table === 'contacts') {
      updated = await sql`
        UPDATE contacts SET
          name = COALESCE(${bodySnake.name as string ?? null}, name),
          email = COALESCE(${bodySnake.email as string ?? null}, email),
          phone = COALESCE(${bodySnake.phone as string ?? null}, phone),
          role = COALESCE(${bodySnake.role as string ?? null}, role),
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
    } else if (table === 'products') {
      updated = await sql`
        UPDATE products SET
          name = COALESCE(${bodySnake.name as string ?? null}, name),
          description = COALESCE(${bodySnake.description as string ?? null}, description),
          category = COALESCE(${bodySnake.category as string ?? null}, category),
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
    } else if (table === 'models') {
      updated = await sql`
        UPDATE models SET
          name = COALESCE(${bodySnake.name as string ?? null}, name),
          sku = COALESCE(${bodySnake.sku as string ?? null}, sku),
          stock = COALESCE(${bodySnake.stock != null ? Number(bodySnake.stock) : null}, stock),
          price = COALESCE(${bodySnake.price != null ? Number(bodySnake.price) : null}, price),
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
    } else if (table === 'leads') {
      const newStatus = bodySnake.status as string | undefined;
      if (newStatus === 'converted') {
        const leadRows = await sql`SELECT id, name, email, phone, company FROM leads WHERE id = ${id} LIMIT 1`;
        const leadRow = leadRows[0] as Record<string, unknown> | undefined;
        const existingCustomer = await sql`SELECT id FROM customers WHERE lead_id = ${id} LIMIT 1`;
        if (leadRow && existingCustomer.length === 0) {
          const companyName = (leadRow.company as string) || (leadRow.name as string) || 'Unknown';
          const insertedCustomer = await sql`
            INSERT INTO customers (name, status, lead_id, last_modified_by)
            VALUES (${companyName}, 'active', ${Number(id)}, ${auth.userId})
            RETURNING id
          `;
          const newCustomerId = (insertedCustomer[0] as { id: number })?.id;
          if (newCustomerId) {
            await sql`
              INSERT INTO contacts (customer_id, name, email, phone, role, last_modified_by)
              VALUES (${newCustomerId}, ${(leadRow.name as string) || ''}, ${(leadRow.email as string) || ''}, ${(leadRow.phone as string) || ''}, 'Primary Contact', ${auth.userId})
            `;
          }
        }
      }
      updated = await sql`
        UPDATE leads SET
          name = COALESCE(${bodySnake.name as string ?? null}, name),
          email = COALESCE(${bodySnake.email as string ?? null}, email),
          phone = COALESCE(${bodySnake.phone as string ?? null}, phone),
          company = COALESCE(${bodySnake.company as string ?? null}, company),
          status = COALESCE(${bodySnake.status as string ?? null}, status),
          source = COALESCE(${bodySnake.source as string ?? null}, source),
          value = COALESCE(${bodySnake.value != null ? Number(bodySnake.value) : null}, value),
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING *
      `;
    } else if (table === 'users') {
      updated = await sql`
        UPDATE users SET
          name = COALESCE(${bodySnake.name as string ?? null}, name),
          email = COALESCE(${bodySnake.email as string ?? null}, email),
          role = COALESCE(${bodySnake.role as string ?? null}, role),
          last_modified_by = ${auth.userId},
          last_modified_at = NOW()
        WHERE id = ${id} RETURNING id, name, email, role, created_at, last_modified_by, last_modified_at
      `;
    }
    const row = (updated as unknown[])?.[0] as Record<string, unknown> | undefined;
    if (!row) return err('Not found', 404);
    return json(rowToCamel(row, ['password_hash', 'password_salt']));
  }

  // Delete
  if (method === 'DELETE' && id) {
    if (table === 'customers') await sql`DELETE FROM customers WHERE id = ${id}`;
    else if (table === 'contacts') await sql`DELETE FROM contacts WHERE id = ${id}`;
    else if (table === 'products') await sql`DELETE FROM products WHERE id = ${id}`;
    else if (table === 'models') await sql`DELETE FROM models WHERE id = ${id}`;
    else if (table === 'leads') await sql`DELETE FROM leads WHERE id = ${id}`;
    else if (table === 'users') await sql`DELETE FROM users WHERE id = ${id}`;
    return json({ ok: true });
  }

  return err('Method not allowed', 405);
};
