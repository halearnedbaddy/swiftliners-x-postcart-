# Deploy and test checklist (Supabase-only, no backend)

After deploying, verify each flow works end-to-end.

## Deploy steps

1. **Supabase project:** Create or use existing project.
2. **Migrations:** Run `supabase db push` or apply SQL from `supabase/migrations/` in SQL Editor.
3. **Edge Functions:** Deploy all:
   ```bash
   supabase functions deploy auth-api
   supabase functions deploy links-api
   supabase functions deploy paystack-api
   supabase functions deploy storefront-api
   supabase functions deploy transaction-api
   supabase functions deploy ai-generate-product
   supabase functions deploy wallet-api
   supabase functions deploy admin-api
   ```
4. **Secrets:** Set `PAYSTACK_SECRET_KEY`, `FRONTEND_URL`, `BULK_SMS_API_KEY` (for OTP), `PLATFORM_FEE_PERCENT`.
5. **Auth URLs:** In Supabase → Authentication → URL Configuration, set Site URL and Redirect URLs to your frontend URL.

## Test flows

### 1. New user sign-up with phone (OTP)

- Go to Sign up.
- Enter phone number, request OTP.
- **Expected:** OTP sent (or dev log if `BULK_SMS_API_KEY` not set).
- Enter OTP and name, complete registration.
- **Expected:** Redirect to magic link then back to app; user is logged in; session works for create link.

### 2. Sign-in with phone (OTP)

- Go to Login.
- Enter phone, request OTP, enter OTP.
- **Expected:** Redirect to magic link then back; user logged in with Supabase session.

### 3. Create storefront

- Log in as seller (phone or email).
- Go to Store Settings (or dashboard).
- Create store: name + slug.
- **Expected:** Store created in Supabase; storefront URL shown.

### 4. AI create storefront / product

- In seller dashboard, use AI drafts / generate product (if available).
- **Expected:** Calls `ai-generate-product` Edge Function; draft product created.

### 5. Create payment link

- Seller dashboard → Create Link (or LinkGenerator).
- Fill product name, price, optional description/images.
- **Expected:** Link created via links-api; link URL shown (e.g. `{origin}/buy/PL-xxx`).

### 6. My links

- Seller dashboard → My Links.
- **Expected:** List of links from links-api (seller/my-links).

### 7. Open payment link (buyer)

- Open link URL in new tab/device (e.g. `/buy/PL-xxx`).
- **Expected:** Product page loads; getPaymentLink (links-api) works.

### 8. Purchase and Paystack

- On payment link page: verify phone (OTP), enter details, Pay.
- **Expected:** Purchase creates transaction (links-api purchase); Paystack init (paystack-api); redirect to Paystack; after payment, redirect back to `/buy/PL-xxx?payment=success&reference=...`; verify (paystack-api) runs; success message.

### 9. Storefront (public store)

- Go to `/store/{slug}`.
- **Expected:** Store and products load via storefront-api.

### 10. Storefront product and checkout

- Open a product, use Checkout.
- **Expected:** Checkout creates transaction via storefront-api; Paystack init; payment flow works.

### 11. Transactions and orders

- Seller: orders list, accept/reject, add shipping.
- Buyer: order details, confirm delivery, track order.
- **Expected:** All via Supabase (transaction-api, supabaseApi); no Express.

### 12. Disputes

- Buyer: open dispute, add message.
- Admin: resolve dispute.
- **Expected:** addBuyerDisputeMessage and resolveDispute work (Supabase/client or admin-api).

If any step fails, check: Edge Function logs in Supabase Dashboard, browser network tab, and that migrations and secrets are set.
