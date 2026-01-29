# Use Supabase with Your Inbuilt Backend

Your **Express backend stays as-is**. Supabase runs on its own as the **database** (hosted PostgreSQL). The backend simply connects to Supabase instead of a local or other Postgres.

---

## How It Works

| Component        | Where it runs        | Role                          |
|-----------------|----------------------|-------------------------------|
| **Inbuilt backend** | Your server (e.g. `npm run dev`) | All API routes, Paystack, auth, logic |
| **Supabase**    | Supabase cloud       | PostgreSQL database (hosted) |

No code rewrite: only **configuration** (connection string and env).

---

## 1. Create a Supabase project (if you don’t have one)

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → choose org, name, DB password, region.
3. Wait until the project is ready.

---

## 2. Get the database connection string

1. In Supabase: **Project Settings** (gear) → **Database**.
2. Under **Connection string** choose **URI**.
3. Copy the URI. It looks like:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   or (direct):
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your database password (set when you created the project).
5. For Prisma, add SSL and (if using pooler) pgbouncer:
   - **Direct (port 5432):** add `?sslmode=require`
   - **Pooler (port 6543):** add `?pgbouncer=true&sslmode=require`

Example (direct):

```text
postgresql://postgres:YOUR_PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres?sslmode=require
```

Example (pooler):

```text
postgresql://postgres.xxxxxxxxxxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

---

## 3. Point the backend at Supabase

In the **backend** folder, create or edit `.env`:

```env
# Supabase PostgreSQL (runs on its own)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"

# Rest unchanged
JWT_SECRET="your-jwt-secret"
PORT=8000
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"

# Optional
REDIS_URL=""
PAYSTACK_SECRET_KEY=""
PAYSTACK_PUBLIC_KEY=""
```

Use your real Supabase URI and password. Prefer **direct** connection (port 5432) for migrations.

---

## 4. Run migrations against Supabase

In the backend folder:

```bash
npx prisma generate
npx prisma migrate deploy
```

This creates/updates all tables **in Supabase**. Your inbuilt backend then uses that same database.

---

## 5. Start the inbuilt backend

```bash
npm run dev
```

The backend will connect to Supabase Postgres. All existing routes (auth, links, Paystack, store, etc.) work as before; only the database host changed.

---

## Summary

- **Inbuilt backend** = unchanged code, runs on your machine/server.
- **Supabase** = database only, runs on its own in the cloud.
- You only set `DATABASE_URL` to Supabase and run `prisma migrate deploy`.

No Supabase Edge Functions or frontend changes are required for this setup.
