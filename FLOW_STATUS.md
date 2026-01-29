# Product Flow Implementation Status

This document maps the provided product flow to the current codebase state, noting what is completed and what remains for MVP.

## 1️⃣ What We Are Building
- Completed:
  - One-line vision captured in planning; initial UI reflects the concept.
- Remaining:
  - None (conceptual).

## 2️⃣ Who Uses the Platform
- Completed:
  - Seller UI (`src/pages/SellerDashboard.tsx`).
  - Buyer UI (`src/pages/BuyerDashboard.tsx`).
  - Admin UI (`src/pages/AdminDashboard.tsx`).
- Remaining:
  - Role-specific feature gating and permissions across backend routes.

## 3️⃣ Seller Onboarding Flow
- Completed:
  - Signup/Login pages (`src/pages/SignupPage.tsx`, `src/pages/LoginPage.tsx`).
  - Seller dashboard shell with new tabs for store and products.
- Remaining:
  - Store creation form wired to backend (`createStore`, `getMyStore`).
  - Payout details capture UI and validation (M-Pesa/Mobile/Bank).
  - Automatic wallet creation on signup (backend confirmation and tests).
  - Enforcement: store cannot go live until payout method is added.

## 4️⃣ Store & Product Creation (AI Powered)
- Completed:
  - Data models for `Store`, `Product`, `SocialAccount`, and `SyncLog` in Prisma.
  - Public storefront page (`/store/:storeSlug`) and product detail page.
  - Frontend API methods scaffolded for social connect/rescan and product draft/publish.
- Remaining:
  - Instagram/WhatsApp/Facebook link ingestion; protected content reading.
  - AI extraction pipeline (name, price, description, images).
  - Save extracted product as `DRAFT`; review and edit UI.
  - Publish flow wired to backend and governance checks.

## 5️⃣ Store Link Distribution
- Completed:
  - Single store link route: `GET /store/:slug` UI (`StoreFrontPage`).
  - Basic share actions in Seller dashboard.
- Remaining:
  - Linking the seller’s slug to the share controls automatically.
  - No platform promotion logic needed (by design).

## 6️⃣ Buyer Shopping Flow
- Completed:
  - Browse storefront and product pages.
- Remaining:
  - “Buy” CTA should support guest checkout (MVP) without account creation.
  - Connect product page buy action to `PaymentPage` for guest checkout.

## 7️⃣ Payment Flow (PayingZee Core)
- Completed:
  - Payment page shell (`src/pages/PaymentPage.tsx`).
  - Backend payment routes present; models for transactions exist.
- Remaining:
  - Configure providers (M-Pesa/Mobile/Card) and backend credentials.
  - End-to-end confirmation, transaction recording, and error handling.
  - Ensure payment hits platform account (not seller directly).

## 8️⃣ Platform Fee & Wallet Logic
- Completed:
  - Data models for transactions, wallet, fees in Prisma.
  - Wallet UI in Seller dashboard.
- Remaining:
  - Implement fee calculation on payment capture; ledger entries.
  - Transparent fee display to seller in UI.

## 9️⃣ Seller Wallet & Payout Flow
- Completed:
  - Wallet summary UI; withdrawal modal shell.
- Remaining:
  - Payout request backend and provider integration.
  - Balance verification and payout status transitions.
  - Later: automatic payouts and faster settlements.

## 🔟 Admin & Platform Control
- Completed:
  - Admin overview, transactions, disputes, users tabs.
  - New admin tabs: Stores and Social Pages (skeleton).
- Remaining:
  - Freeze accounts, retry failed payouts, adjust fees (UI + backend actions).
  - Full audit logs and search/filter.

## 1️⃣1️⃣ AI Role in the Platform
- Completed:
  - Governance defined: AI assists but never auto-publishes.
- Remaining:
  - Implement AI readers/parsers and validation pipeline.
  - Human-in-the-loop publish confirmation.

## 1️⃣2️⃣ Differentiation (Moat)
- Completed:
  - Link-first public storefront and product pages.
  - Unified seller dashboard and admin oversight shells.
- Remaining:
  - Communicate moat in product UI/docs as needed (optional).

## 1️⃣3️⃣ Future Extensions (Not MVP)
- Completed:
  - None required for MVP.
- Remaining:
  - Store discovery, promotions, buyer accounts, analytics, early payouts, subscriptions.

## ✅ Final Summary
- Completed:
  - Public store and product pages, seller/admin dashboard skeletons, frontend API scaffolding, Prisma schema corrected and client generated, frontend dev server running.
- Remaining (high priority next steps):
  - Backend env setup (`DATABASE_URL`), start backend dev server.
  - Wire Seller tabs to API (`getMyStore`, `listDraftProducts`, `listPublishedProducts`, publish/archive, rescan).
  - Implement payout details UI and enforcement for store publishing.
  - Enable guest checkout on product pages with payment provider integration.

---

References:
- Frontend routes: `src/App.tsx`
- API client: `src/services/api.ts`
- Seller UI: `src/pages/SellerDashboard.tsx`
- Admin UI: `src/pages/AdminDashboard.tsx`
- Storefront: `src/pages/StoreFrontPage.tsx`, `src/pages/ProductDetailPage.tsx`
- Backend entry: `backend/src/index.ts`
- Prisma schema: `backend/prisma/schema.prisma`