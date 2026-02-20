# Neon + Netlify backend setup

This backend uses **Neon** (serverless Postgres) and **Netlify Functions** so you get no API rate limit (unlike Xano’s free tier).

## 1. Neon database

1. Go to [neon.tech](https://neon.tech) and create an account / project.
2. Create a new project and copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
3. In the Neon dashboard, open **SQL Editor** and run the schema from this repo:
   - Open `neon/schema.sql` and execute its contents in the SQL Editor.

## 2. First user (signup)

The app expects at least one user to log in. You can create it via the API:

- **Option A – Signup endpoint**  
  Send a POST request to your API:

  `POST /api/auth/signup`  
  Body (JSON):  
  `{ "name": "Admin", "email": "admin@example.com", "password": "your-secret-password", "role": "admin" }`

  Use your Netlify API base URL, e.g.  
  `https://your-site.netlify.app/api/auth/signup`  
  or with curl:

  ```bash
  curl -X POST https://your-site.netlify.app/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"name":"Admin","email":"admin@example.com","password":"your-password","role":"admin"}'
  ```

- **Option B – Insert in Neon**  
  In Neon SQL Editor, insert a user. You must hash the password with the same algorithm the API uses (PBKDF2-SHA256 with a random salt). Easiest is to use Option A.

## 3. Netlify

1. Push your repo to GitHub and connect the repo to Netlify (or use Netlify CLI).
2. In the Netlify site **Environment variables** (Site settings → Environment variables), add:

   | Variable         | Value                    | Scopes   |
   |------------------|--------------------------|----------|
   | `DATABASE_URL`   | Your Neon connection string | Build & functions |
   | `JWT_SECRET`     | A long random string (e.g. 32+ chars) | Build & functions |

3. Build command: `npm run build`  
   Publish directory: `dist`  
   Functions directory: `netlify/functions`  
   (These are already in `netlify.toml`.)

4. Deploy. Your API will be at `https://<your-site>.netlify.app/api/...`.

## 4. Frontend env

In your project (and in Netlify env for the frontend if you deploy there):

- Set **`VITE_API_URL`** to your Netlify API base, with no trailing slash, e.g.  
  `https://your-site.netlify.app/api`  
  For local dev with `netlify dev`:  
  `VITE_API_URL=http://localhost:8888/api`

- Leave **`VITE_XANO_BASE_URL`** unset (or remove it) so the app uses the Neon/Netlify API instead of Xano.

## 5. Run locally

- Install dependencies: `npm install`
- Start Netlify Dev (runs Vite + Functions): `npm run dev:netlify`
- Or run only the frontend: `npm run dev` (uses mock data unless you point `VITE_API_URL` to a deployed API).

## Summary

- **Neon** = database (run `neon/schema.sql` once).
- **Netlify** = hosts the frontend and the API (Functions); set `DATABASE_URL` and `JWT_SECRET`.
- **Frontend** = set `VITE_API_URL` to `https://<your-site>.netlify.app/api` (or local URL when using `netlify dev`).

## If you see "Xano API request limit" after deploying to Netlify

The deployed site is still using Xano (and its 10 requests / 20 sec limit) instead of your Netlify API. Fix it:

1. In **Netlify** → your site → **Site configuration** → **Environment variables**:
   - Add or set **`VITE_API_URL`** = `https://YOUR-SITE-NAME.netlify.app/api` (use your real site URL, no trailing slash).
   - Remove **`VITE_XANO_BASE_URL`** if it exists (or leave it unset). Do not set it for production deploy.
2. **Trigger a new deploy** (Deploys → Trigger deploy → Deploy site) so the build uses the new env. The app will then use the Neon/Netlify backend and stop calling Xano.

After this, the app uses the Neon/Netlify backend and no longer hits Xano’s request limit.
