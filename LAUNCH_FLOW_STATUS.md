# Launch Flow Status – Seller Dashboard, Create Link, Callback, Store & Products

## 1. Create Link flow (Seller Dashboard → Create Link tab)

| Step | Status | Notes |
|------|--------|--------|
| Create payment link | ✅ | LinkGenerator → `api.createPaymentLink()` → backend creates link |
| Copy / share link | ✅ | Link URL is always `{origin}/buy/{linkId}` (fixed earlier) |
| Share to yourself | ✅ | Same link works when opened in new tab/device |
| Customer opens link | ✅ | Route `/buy/:linkId` → PaymentPage loads |
| Customer sees product | ✅ | PaymentPage fetches link via `api.getPaymentLink(linkId)` |
| Customer logs in with OTP | ✅ | Phone → request OTP → verify OTP (backend auth) → checkout |
| Customer pays (Paystack) | ✅ | Create order → init Paystack → redirect to Paystack |
| Callback to product page | ✅ | **Just implemented** – see below |

## 2. Callback URL → product page + OTP purchase

| Item | Status | Notes |
|------|--------|--------|
| Callback URL points to product page | ✅ | Backend now uses `/buy/{linkId}?payment=success&reference={ref}` when `metadata.linkId` is sent |
| Customer returns to product page after payment | ✅ | Paystack redirects to `/buy/PL-xxx?payment=success&reference=...` |
| Verify payment on return | ✅ | PaymentPage reads `?payment=success&reference=`, calls `api.verifyPaystackPayment(transactionId, reference)` |
| Show success / order placed | ✅ | PaymentPage shows “Order Placed!” and link to “View My Orders” |
| `pendingTransaction` + `pendingPaymentLinkId` stored before redirect | ✅ | Stored in sessionStorage so callback has context |

**Backend change (paystackRoutes.ts):**  
For link purchases, callback URL is now  
`{FRONTEND_URL}/buy/{linkId}?payment=success&reference={reference}`  
so the customer lands back on the **product page** to see success and use OTP/login flow.

**Frontend:**  
- PaymentPage stores `pendingPaymentLinkId` before redirecting to Paystack.  
- New route `/payment/callback`: fallback if someone lands there; redirects to `/buy/{linkId}?payment=success&reference=...` or `/buyer` so the right page handles success.

## 3. Create store → add product flow

| Step | Status | Notes |
|------|--------|--------|
| Create store | ✅ | Store Settings → “Create Store” → CreateStoreModal → `api.createStore()` |
| Open Store Dashboard | ✅ | “Open Store Dashboard” from Store Settings |
| Add product (manual) | ✅ | Store Dashboard → Products → “Add Product” → StoreProducts add modal → `api.createProduct()` (saved as draft) |
| Publish product | ✅ | “Publish” on draft → `api.publishProduct()` → appears on storefront |
| Storefront shows products | ✅ | `/store/{slug}` → StoreFrontPage → `api.getStorefront(slug)` |
| Product detail page | ✅ | `/store/{slug}/product/{id}` → ProductDetailPage |
| Storefront link copy | ✅ | Store Settings shows full storefront URL + Copy (added earlier) |

Store + add product + publish + storefront is implemented end-to-end.

## 4. What you still need to refine (API / config)

- **Backend `FRONTEND_URL`**  
  Set in backend env (e.g. `FRONTEND_URL=https://yourdomain.com`) so Paystack callback and any other redirects use the correct origin.

- **Paystack**  
  Ensure Paystack keys and webhook are set in backend env and that test/live mode matches your usage.

- **Auth**  
  All app auth (login, signup, OTP, logout) now uses the **backend API** (JWT). Supabase Edge auth is no longer used for login/signup; backend is the source of truth.

- **Create Link → share → open → OTP → pay → callback**  
  Flow is implemented; test with a real link and Paystack test card to confirm end-to-end (create link, share to yourself, OTP, pay, redirect back to product page and success screen).

## 5. Summary

- **Create Link tab:** Working; link created and shared as `{origin}/buy/{linkId}`.  
- **Callback URL:** Implemented so customer is sent back to the **product page** (`/buy/{linkId}?payment=success&reference=...`) to complete flow and use OTP/login.  
- **Create store + add product:** Implemented (create store, add product, publish, storefront + product detail).  
- **Remaining:** Set `FRONTEND_URL` and Paystack in backend, then do a full test of create link → share to yourself → OTP → pay → callback to product page.
