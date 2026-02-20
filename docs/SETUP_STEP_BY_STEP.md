# Craftric CRM – Backend setup step by step

This guide gets you from zero to a working app using **Neon** (database) and **Netlify** (hosting + API), with no Xano rate limits.

---

## Part 1: Create the database (Neon)

### Step 1.1 – Sign up and create a project

1. Go to **https://neon.tech** and sign up (GitHub or email).
2. Click **New Project**.
3. Choose a name (e.g. `craftric-crm`), region (pick one close to you), and click **Create project**.

### Step 1.2 – Copy the connection string

1. On the project dashboard you’ll see **Connection string**.
2. Select the **Pooled** or **Direct** connection string (Pooled is fine).
3. It looks like:  
   `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Copy it and keep it somewhere safe (you’ll use it in Netlify).

### Step 1.3 – Open the SQL Editor

1. In the left sidebar, click **SQL Editor** (or **Query**).
2. You’ll see a box where you can type or paste SQL.

### Step 1.4 – Create the tables

1. Open the file **`neon/schema.sql`** in your project (in your code editor, not in Neon).
2. Select **only the SQL** (no file path, no filename).  
   Start from the line:  
   `CREATE TABLE IF NOT EXISTS users (`  
   and go to the last line:  
   `CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);`
3. Copy that whole block.
4. Paste it into the Neon SQL Editor.
5. Click **Run** (or press the run shortcut).
6. You should see a success message and the tables (`users`, `leads`, `customers`, `contacts`, `products`, `models`) in the left sidebar under **Tables**.

If you get an error, run the file in smaller pieces: first only the `users` `CREATE TABLE`, then `leads`, then the rest one by one.

---

## Part 2: Deploy the app to Netlify

### Step 2.1 – Push your code to GitHub

1. If the project isn’t in Git yet:  
   `git init`  
   `git add .`  
   `git commit -m "Initial commit"`
2. Create a new repository on **GitHub** (e.g. `craftric-crm`).
3. Add the remote and push:  
   `git remote add origin https://github.com/YOUR_USERNAME/craftric-crm.git`  
   `git push -u origin main`  
   (Use your repo URL and branch name if different.)

### Step 2.2 – Connect the repo to Netlify

1. Go to **https://app.netlify.com** and log in.
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize Netlify if asked.
4. Select the **craftric-crm** (or your repo) repository.
5. Netlify will detect the build settings from `netlify.toml`. You should see:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
6. **Do not** click **Deploy** yet.

### Step 2.3 – Add environment variables

1. In the same “Configure build” screen, open **Environment variables** (or **Options** → **Environment variables**).
2. Click **Add a variable** (or **New variable**).
3. Add these one by one:

   **Variable 1**

   - **Key:** `DATABASE_URL`
   - **Value:** paste the Neon connection string you copied in Step 1.2.
   - **Scopes:** check **Build** and **Functions** (or “All”).

   **Variable 2**

   - **Key:** `JWT_SECRET`
   - **Value:** a long random string (e.g. 32+ characters). You can generate one at https://randomkeygen.com/ or use:  
     `openssl rand -hex 32`
   - **Scopes:** **Build** and **Functions**.

4. Save the variables.

### Step 2.4 – Deploy

1. Click **Deploy site** (or **Start deploy**).
2. Wait for the build to finish (a few minutes).
3. When it’s done, you’ll get a URL like **https://something-random-123.netlify.app**. That’s your live site.

---

## Part 3: Create your first user (admin)

The app needs at least one user in the database. You create it by calling the signup API once.

### Step 3.1 – Get your API base URL

Your API base URL is:

**`https://YOUR-SITE-NAME.netlify.app/api`**

Replace `YOUR-SITE-NAME` with your actual Netlify site name (e.g. `something-random-123`).  
No slash at the end.

### Step 3.2 – Call the signup endpoint

**Option A – Browser (e.g. DevTools)**

1. Open your site: `https://YOUR-SITE-NAME.netlify.app`.
2. Open Developer Tools (F12) → **Console**.
3. Paste this (replace the URL and the email/password):

```javascript
fetch('https://YOUR-SITE-NAME.netlify.app/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Admin',
    email: 'admin@example.com',
    password: 'YourSecurePassword123',
    role: 'admin'
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

4. Press Enter. You should see a response with `id`, `name`, `email`, `role` (no error).

**Option B – Terminal (curl)**

```bash
curl -X POST https://YOUR-SITE-NAME.netlify.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"YourSecurePassword123","role":"admin"}'
```

Use the same **email** and **password** to log in from the app in the next part.

---

## Part 4: Point the frontend at your API

The React app must know to use your Netlify API instead of mock data or Xano.

### Step 4.1 – Set the API URL in Netlify

1. In Netlify: your site → **Site configuration** → **Environment variables** (or **Build & deploy** → **Environment**).
2. Add a variable that the **frontend** can read:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://YOUR-SITE-NAME.netlify.app/api`  
     (same as in Step 3.1, no trailing slash).
3. Save.

### Step 4.2 – Rebuild so the frontend sees it

1. Go to **Deploys**.
2. Click **Trigger deploy** → **Deploy site** (so a new build runs with `VITE_API_URL`).

After this deploy, the site will use your Neon + Netlify API.

---

## Part 5: Log in and use the app

1. Open **https://YOUR-SITE-NAME.netlify.app**.
2. You should see the **Login** page.
3. Log in with the **email** and **password** you used in the signup (Step 3.2).
4. You should land on the dashboard and be able to use Companies, Products, Leads, Users, etc. All data is stored in Neon and served by Netlify Functions.

---

## Quick checklist

- [ ] Neon project created, connection string copied  
- [ ] `neon/schema.sql` run in Neon SQL Editor (tables + indexes)  
- [ ] Repo connected to Netlify  
- [ ] `DATABASE_URL` and `JWT_SECRET` set in Netlify  
- [ ] Site deployed  
- [ ] First user created via `POST /api/auth/signup`  
- [ ] `VITE_API_URL` set in Netlify and new deploy triggered  
- [ ] Logged in with that user in the app  

---

## Troubleshooting

- **“Database not configured”**  
  Check that `DATABASE_URL` is set in Netlify (Build + Functions) and that you redeployed after adding it.

- **“Invalid email or password”**  
  Make sure you created a user with `POST /api/auth/signup` and are using that exact email and password.

- **Login works but no data / list empty**  
  Data is stored in Neon. Create a company, lead, product, etc. from the app; they’ll be saved in the database.

- **Changes to env vars**  
  After changing `DATABASE_URL`, `JWT_SECRET`, or `VITE_API_URL`, trigger a new deploy so the new values are used.
