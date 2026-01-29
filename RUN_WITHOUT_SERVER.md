# Run the app without starting the backend server

The app runs on **Supabase by default** so you do not need to start the inbuilt Express backend.

## 1. Supabase is the default

**No `.env` change needed.** The app uses Supabase (auth, links, Paystack, store, orders, storefront) unless you turn it off.

To use the Express backend instead, set in the frontend `.env`:

```env
VITE_USE_SUPABASE=false
```

When using Supabase (default), the app will:

- Use **Supabase Auth** (auth-api Edge Function) for login, register, OTP.
- Use **links-api** Edge Function for creating payment links, getting links, my-links, and purchase.
- Use **paystack-api** Edge Function for Paystack initialize and verify.
- Use **Supabase** (direct client + Edge Functions) for store, seller orders, products, wallet, admin, etc.

No Express server is required.

## 2. Supabase setup

1. **Project:** Use your existing Supabase project (or create one).

2. **Migrations:** Apply migrations so the DB has `payment_links`, `transactions`, `wallets`, `profiles`, etc.:
   ```bash
   supabase db push
   ```
   Or run the SQL in `supabase/migrations/` in the Supabase SQL editor.

3. **Edge Functions:** Deploy the Edge Functions:
   ```bash
   supabase functions deploy links-api
   supabase functions deploy paystack-api
   supabase functions deploy auth-api
   supabase functions deploy storefront-api
   supabase functions deploy transaction-api
   ```

4. **Secrets:** Set these in Supabase (Dashboard → Project Settings → Edge Functions → Secrets):
   - `PAYSTACK_SECRET_KEY` – Paystack secret key.
   - `PAYSTACK_PUBLIC_KEY` – (optional) if paystack-api returns it for frontend.
   - `FRONTEND_URL` – e.g. `https://yourdomain.com` or `http://localhost:5173`.
   - `PLATFORM_FEE_PERCENT` – (optional) e.g. `5`.
   - `BULK_SMS_API_KEY` – (optional) for OTP SMS in auth-api.

5. **Auth redirect (for phone login/register):** In Supabase Dashboard → Authentication → URL Configuration, set **Site URL** and **Redirect URLs** to your frontend URL (e.g. `https://yourdomain.com`, `http://localhost:5173`). After phone OTP login/register the user is sent to a magic link and then redirected back to your app with a Supabase session so create-link and other features work.

## 3. Run the frontend

```bash
npm run dev
```

Open the app (e.g. http://localhost:5173). Sign in (email or phone OTP via auth-api), create a payment link, share it, and pay with Paystack—all without starting the backend.

## 4. Summary

| Default (Supabase)                  | With Express (`VITE_USE_SUPABASE=false`)       |
|-------------------------------------|------------------------------------------------|
| No server to start                  | Run Express server on port 8000               |
| Auth, links, Paystack via Supabase  | Auth, links, Paystack via Express              |
| Store/orders/storefront via Supabase| Store/orders via Express                       |

Deploy the Edge Functions and run migrations so Supabase has the schema; then run the frontend with `npm run dev` and the app runs on Supabase without starting the backend.
