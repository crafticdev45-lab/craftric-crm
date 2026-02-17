# XANO Setup Guide

This CRM can use [XANO](https://www.xano.com) as a backend. Without XANO, the app uses mock data.

## 1. Create a XANO Instance

1. Sign up at [xano.com](https://www.xano.com)
2. Create a new API group and note your base URL (e.g. `https://xxx-xxx-xxx.xano.io/api:your_api_id`)

## 2. Create Database Tables in XANO

Create tables matching the CRM schema. Suggested column names:

### customers
- `id` (integer, auto)
- `name` (text)
- `email` (text)
- `phone` (text)
- `company` (text)
- `status` (text: active, inactive, pending)
- `created_at` (datetime)

### contacts
- `id` (integer, auto)
- `customer_id` (integer, FK to customers)
- `name`, `email`, `phone`, `role` (text)

### products
- `id` (integer, auto)
- `name`, `description`, `category` (text)
- `created_at` (datetime)

### models
- `id` (integer, auto)
- `product_id` (integer, FK to products)
- `name`, `sku` (text)
- `stock` (integer)
- `price` (decimal)

### leads
- `id` (integer, auto)
- `name`, `email`, `phone`, `company`, `source` (text)
- `status` (text: new, contacted, qualified, lost, converted)
- `value` (decimal)
- `created_at` (datetime)
- `created_by` (text/integer - user id)

### users (for auth)
- `id` (integer, auto)
- `name`, `email`, `role` (text)
- `created_at` (datetime)

**Note:** XANO may use snake_case (`customer_id`) while the app expects camelCase (`customerId`). You may need to add variable mapping in your XANO API endpoints, or adjust `src/lib/xano.ts` to transform keys.

## 3. Create API Endpoints

For each table, create REST endpoints:

- `GET /customers` – list all
- `POST /customers` – create
- `GET /customers/:id` – get one
- `PATCH /customers/:id` – update
- `DELETE /customers/:id` – delete

Repeat for `contacts`, `products`, `models`, `leads`, and `users`.

Use XANO’s CRUD Database Operations template to generate these quickly.

## 4. Configure Auth (optional)

For user login, configure XANO’s built-in auth:

- Enable auth on your users table
- Use the standard `auth/login` and `auth/me` endpoints

## 5. Set Environment Variables

Copy `.env.example` to `.env` and set:

```
VITE_XANO_BASE_URL=https://your-instance.xano.io/api:your_api_group_id
```

Optional (if your endpoints require an API key):

```
VITE_XANO_API_KEY=your_api_key
```

Restart the dev server after changing `.env`.
