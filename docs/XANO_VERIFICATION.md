# Xano API verification guide

The app cannot access your Xano dashboard. Use this checklist to align your Xano API with what the CRM expects.

## Base URL and endpoints

- **Base URL** (in `.env`): `VITE_XANO_BASE_URL=https://xxx.xano.io/api:your_api_group_id`
- **Endpoints** the app calls:
  - `GET/POST /customers` — list and create companies
  - `GET/PATCH/DELETE /customers/:id`
  - `GET/POST /contacts` — list and create contacts
  - `GET/PATCH/DELETE /contacts/:id`
  - `GET/POST /products`, `GET/POST /models`, `GET/POST /leads`, `GET /users`
  - `POST /auth/login`, `GET /auth/me`

If your routes use different paths (e.g. `/company` instead of `/customers`), either rename them in Xano or change `XANO_ENDPOINTS` in `src/lib/xano.ts`.

---

## List responses (GET)

The app accepts list responses in any of these shapes:

- **Direct array**: `[{ "id": 1, "name": "..." }, ...]`
- **Wrapped**: `{ "records": [...] }` or `{ "data": [...] }` or `{ "items": [...] }`

If your list is inside another key (e.g. `{ "list": [...] }`), add that key in `unwrapRecords()` in `src/lib/xano.ts`.

### Field names (customers and contacts)

The app normalizes **response** fields so both camelCase and snake_case work:

| App field (camelCase) | Also accepted from Xano (snake_case) |
|----------------------|--------------------------------------|
| `id`                 | (must be present; numeric is converted to string) |
| `name`                | `name` |
| `status`              | `status` |
| `leadId`              | `lead_id` |
| `createdAt`           | `created_at` |
| `lastModifiedBy`      | `last_modified_by` |
| `lastModifiedAt`      | `last_modified_at` |
| `customerId` (contacts only) | `customer_id` |

**Customers** must have: `id`, `name`, `status`, `leadId` (or `lead_id`, can be null), `createdAt` (or `created_at`).

**Contacts** must have: `id`, `customerId` (or `customer_id`), `name`, `email`, `phone`, `role`.

---

## Create responses (POST)

After creating a customer or contact, the app expects the **created record** in one of these shapes:

- The record directly: `{ "id": 123, "name": "...", ... }`
- Wrapped: `{ "record": { ... } }` or `{ "data": { ... } }`
- Or a one-element array: `[{ "id": 123, ... }]`

If the create response does not return the record (e.g. only `{ "success": true }`), the app will **refetch** the full list so the new record appears.

---

## Request body (POST / PATCH)

The app sends **camelCase** in the body, for example:

**POST /customers**
```json
{ "name": "Acme Inc", "status": "active", "leadId": "1" }
```

**POST /contacts**
```json
{ "customerId": "1", "name": "Jane", "email": "jane@acme.com", "phone": "+1-555-0100", "role": "Manager" }
```

If your Xano add-on or API expects **snake_case** (`customer_id`, `lead_id`, `created_at`, etc.), either:

- Configure the API to accept camelCase, or
- Add a request-body converter in the app (e.g. in `DataContext` or `xano.ts`) that converts camelCase → snake_case before `POST`/`PATCH`.

---

## Quick checks in Xano

1. **API group**  
   Confirm the base URL path matches your API group (e.g. `/api:A-qdVEoh`).

2. **Route paths**  
   Confirm you have routes: `/customers`, `/contacts` (and others as in `XANO_ENDPOINTS`).

3. **GET list**  
   In Xano “Run and debug”, call `GET /customers` and `GET /contacts`.  
   Response should be an array or `{ "records": [...] }` / `{ "data": [...] }` with objects that have at least `id`, `name`, and for contacts `customer_id` (or `customerId`).

4. **POST create**  
   Call `POST /customers` with body `{ "name": "Test", "status": "active", "leadId": null }`.  
   Response should include the created record (with `id`) so the app can add it to the list without refetching.

5. **Auth**  
   Use the same auth (e.g. Bearer token) that the app sends. If list/create require auth, ensure the token is valid and sent in the `Authorization` header.

---

## If new records still don’t show

- Open browser **DevTools → Network**. After “Add company” or “Add contact”, check:
  - The **POST** request: status 200/201 and response body (does it contain the new record?).
  - The **GET** list request (on load or after refetch): does the response array include the new item?
- If POST returns 200 but the response has no record, the app will refetch the list; if the **GET** list doesn’t return the new record, the issue is in Xano (e.g. permissions, or a different route returning the list).
- If your Xano returns field names we don’t normalize (e.g. `company_name` instead of `name`), add that mapping in `normalizeXanoRecord()` in `src/lib/xano.ts` (see `SNAKE_TO_CAMEL` and the loop that builds `out`).
