PayChain Implementation Plan
Complete Escrow Payment Infrastructure for East Africa
Overview
Product: PayChain - Escrow Payment Infrastructure
Core Value: One API for M-Pesa, Airtel & Cards with built-in escrow, conditions, and split disbursements
Revenue Model: 2.5% + KSh 20 per transaction + float interest + optional KSh 9,999 setup fee
Architecture Summary
CLIENT APPS → HTTPS API (sk_live_xxx)
    ↓
PLATFORM APIs: /charge, /hold, /release, /condition/set, /condition/fire, /disburse
    ↓
CORE ENGINE: API Key Validator, Transaction Manager, Escrow Engine, Condition Processor, Split Calculator, Webhook Dispatcher
    ↓
PROVIDERS: Safaricom Daraja (M-Pesa), Airtel Africa API, Flutterwave (Cards)
    ↓
DATA LAYER: PostgreSQL, Redis, S3, SendGrid/Resend, Africa's Talking
Tech Stack
Frontend (Client Dashboard):
Next.js 14 (App Router, SSR)
Tailwind CSS + shadcn-ui
TanStack Table (data tables)
Recharts (analytics)
Zustand (state management)
React Hook Form + Zod (validation)
Backend (API Server):
Node.js + Fastify
Prisma ORM
JWT + API Keys (auth)
Bull Queue (background jobs)
Zod (request validation)
Database & Storage:
PostgreSQL (primary)
Redis (cache, rate limiting, sessions)
AWS S3 / Cloudflare R2 (KYC documents)
Payment Providers:
Safaricom Daraja (M-Pesa STK Push + B2C)
Airtel Africa API (Collections + Disburse)
Flutterwave (Cards)
Communications:
Resend / SendGrid (transactional emails)
Africa's Talking (SMS - Kenya)
Security:
bcrypt (API key hashing)
TOTP/OTPLIB (2FA)
Redis rate limiting (100 req/min per key)
Helmet.js (HTTP headers)
Doppler (secrets management)
Infrastructure:
Railway (backend hosting)
Vercel (frontend hosting)
Cloudflare (CDN + DDoS)
Monitoring:
Sentry (error tracking)
Logtail (logs)
BetterUptime (uptime alerts)
PostHog (analytics)
Project Structure
paychain/
├── apps/
│   ├── web/                    # Client Dashboard (Next.js 14)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Signup, Verify Email
│   │   │   ├── (dashboard)/    # Protected dashboard routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── collections/
│   │   │   │   ├── escrow/
│   │   │   │   ├── conditions/
│   │   │   │   ├── disbursement/
│   │   │   │   ├── compliance/
│   │   │   │   ├── settings/
│   │   │   │   ├── reports/
│   │   │   │   └── support/
│   │   │   └── api/            # Next.js API routes (BFF)
│   │   └── components/
│   │
│   ├── admin/                  # Admin Dashboard (Next.js 14)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── overview/
│   │   │   ├── businesses/
│   │   │   ├── compliance/
│   │   │   ├── transactions/
│   │   │   ├── disputes/
│   │   │   ├── revenue/
│   │   │   ├── notifications/
│   │   │   └── system/
│   │   └── components/
│   │
│   └── api/                    # Backend API (Fastify)
│       ├── src/
│       │   ├── routes/
│       │   │   ├── v1/
│       │   │   │   ├── auth/
│       │   │   │   ├── charge/
│       │   │   │   ├── hold/
│       │   │   │   ├── release/
│       │   │   │   ├── condition/
│       │   │   │   ├── disburse/
│       │   │   │   ├── webhook/
│       │   │   │   └── account/
│       │   ├── services/
│       │   │   ├── daraja/
│       │   │   ├── airtel/
│       │   │   ├── flutterwave/
│       │   │   ├── escrow/
│       │   │   ├── condition/
│       │   │   ├── disbursement/
│       │   │   └── webhook/
│       │   ├── middleware/
│       │   ├── utils/
│       │   └── config/
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   ├── db/                     # Shared Prisma client
│   ├── ui/                     # Shared UI components
│   ├── utils/                  # Shared utilities
│   └── types/                  # Shared TypeScript types
│
└── docs/                       # Mintlify documentation
Database Schema (Core Tables)
accounts - Business accounts
id, email, password_hash, business_name, business_type, status (EMAIL_UNVERIFIED, EMAIL_VERIFIED, PENDING, APPROVED, REJECTED, SUSPENDED)
sandbox_api_key_hash, live_api_key_hash, api_key_last_four
callback_url, webhook_url, min_payout_amount, payout_phone, payout_verified
ip_whitelist[], created_at, updated_at
compliance - KYC documents
id, account_id, director_name, phone, address, kra_pin, expected_volume
id_document_url, business_cert_url, agreement_signed, agreement_pdf_url
status (DRAFT, PENDING, APPROVED, REJECTED), rejection_reason
reviewed_by, reviewed_at, expires_at
transactions - All payment transactions
id (txn_xxx), account_id, amount, currency, phone, payment_method (MPESA, AIRTEL, CARD)
status (PENDING, SUCCESS, FAILED, HELD, RELEASED, REFUNDED)
provider_ref, description, fee_amount, fee_percentage
created_at, completed_at
holds - Escrow holds
id (hold_xxx), transaction_id, account_id, amount, status (ACTIVE, RELEASED, CANCELLED, EXPIRED)
condition_type, condition_id, expiry_at
released_at, cancelled_at, cancel_reason
conditions - Release conditions
id, account_id, name, type (CLIENT_APPROVAL, DELIVERY_CONFIRM, TIMER, CUSTOM)
config (JSON), is_default, created_at
disbursements - Split payouts
id (disb_xxx), hold_id, account_id, status (PENDING, PROCESSING, COMPLETED, FAILED)
total_amount, fee_deducted, created_at, completed_at
disbursement_splits - Individual payout splits
id, disbursement_id, recipient_phone, recipient_name, amount, percentage
payment_method, status, provider_ref, completed_at
webhooks - Webhook delivery log
id, account_id, event_type, payload, url, response_code, attempts, last_attempt_at
audit_logs - Full audit trail
id, account_id, admin_id, action, entity_type, entity_id, ip_address, user_agent, created_at
admin_users - Admin accounts
id, email, password_hash, role (SUPER_ADMIN, ADMIN, SUPPORT), totp_secret, created_at
4 Core APIs
1. POST /v1/charge (Collections)
Request:
{
  "amount": 50000,
  "phone": "254712345678",
  "currency": "KES",
  "description": "Website project payment"
}
Response:
{
  "success": true,
  "transaction_id": "txn_a1b2c3",
  "status": "PENDING",
  "message": "STK Push sent to 254712345678"
}
Flow: Validate API key → Check LIVE mode → Detect phone prefix → Route to provider → Fire STK Push → Log transaction → Deduct fee → Fire webhook
2. POST /v1/hold (Escrow)
Request:
{
  "transaction_id": "txn_a1b2c3",
  "condition": "client_approval",
  "expiry_hours": 72
}
Response:
{
  "success": true,
  "hold_id": "hold_x1y2z3",
  "status": "ACTIVE",
  "expires_at": "2024-01-20T10:00:00Z"
}
3. POST /v1/release (Release Hold)
Request:
{
  "hold_id": "hold_x1y2z3"
}
Response:
{
  "success": true,
  "status": "RELEASED",
  "disbursement_id": "disb_abc123"
}
4. POST /v1/condition/set & /v1/condition/fire
Set Condition:
{
  "name": "Delivery Confirmation",
  "type": "DELIVERY_CONFIRM",
  "config": { "require_photo": true }
}
Fire Condition:
{
  "hold_id": "hold_x1y2z3",
  "condition_id": "cond_abc",
  "proof": { "photo_url": "..." }
}
5. POST /v1/disburse (Split Payout)
Request:
{
  "hold_id": "hold_x1y2z3",
  "splits": [
    { "phone": "254712345678", "percentage": 85, "name": "Freelancer" },
    { "phone": "254733221100", "percentage": 15, "name": "Platform Fee" }
  ]
}
Response:
{
  "success": true,
  "disbursement_id": "disb_abc123",
  "status": "PROCESSING",
  "splits": [
    { "phone": "254712***678", "amount": 42500, "status": "PENDING" },
    { "phone": "254733***100", "amount": 7500, "status": "PENDING" }
  ]
}
7 Client Dashboard Tabs
Dashboard - Overview stats, recent transactions, quick actions
Collections - Transaction list, filters, retry failed, export CSV
Escrow/Hold - Active holds, create hold, release/cancel
Conditions - Manage conditions, set defaults
Disbursement - Payout history, add recipients, disburse
Compliance - 5-step wizard (Business Info → Contact → KYC Docs → Agreement → Submit)
Settings - API keys, callback URLs, webhook URL, payout account, IP whitelist
Admin Dashboard Sections
Overview - Total businesses, revenue, pending reviews
Businesses - All accounts list, status badges
Compliance - Pending reviews, approve/reject with documents
All Transactions - Platform-wide transaction view
Disputes - Dispute management, force-release
Revenue - Fee collection, float balance
Notifications - System alerts
System - Platform settings, provider config
Progressive Unlock System
Email Verified → Sandbox access (all 4 API tabs visible, yellow banners)
Compliance Submitted → Status = PENDING
Admin Approves → LIVE MODE (live API key generated)
Callback URL + Payout Verified → Collections API fully unlocked
1 Successful Transaction → Escrow API unlocks
Webhook URL Configured → Conditions API unlocks
Conditions Set + Hold Created + Splits = 100% → Disbursement API unlocks
Security Features
API key hashing with bcrypt (only last 4 chars stored/shown)
2FA (TOTP) for live key reveal
Redis rate limiting: 100 requests/minute per API key
IP whitelisting (optional per account)
HTTPS everywhere (TLS 1.3)
Full audit trail
Anomaly detection (5x volume spike → auto-flag)
Webhook failure handling (3 fails → auto-suspend)
Webhook Events
payment.success - Transaction completed
payment.failed - Transaction failed
hold.created - Funds locked in escrow
hold.released - Hold released
hold.cancelled - Hold cancelled/refunded
disbursement.completed - All splits paid out
disbursement.failed - Payout failed
condition.fired - Condition triggered
Implementation Phases
Phase 1: Foundation (Weeks 1-2)
Project setup (monorepo with Turborepo)
PostgreSQL schema + Prisma setup
Redis setup
Basic Fastify API structure
Authentication (signup, login, email verification)
Client dashboard shell (Next.js 14)
Admin dashboard shell
Phase 2: Compliance & Onboarding (Weeks 3-4)
Compliance tab UI (5-step wizard)
S3 file uploads for KYC documents
Admin compliance review panel
Email notifications (SendGrid/Resend)
Account status management
Phase 3: Collections API (Weeks 5-6)
Daraja integration (STK Push)
Phone prefix router (detect provider)
POST /v1/charge endpoint
Transaction logging
Fee calculation (2.5% + KSh 20)
Webhook dispatcher
Collections tab UI
Phase 4: Escrow API (Weeks 7-8)
POST /v1/hold endpoint
POST /v1/release endpoint
Float account logic
Hold expiry timer (Bull Queue)
Escrow tab UI
Conditions builder UI
Phase 5: Disbursement API (Weeks 9-10)
POST /v1/disburse endpoint
M-Pesa B2C integration
Split calculator
Multi-party payouts
Disbursement tab UI
PDF receipt generation
Phase 6: Settings & Security (Weeks 11-12)
API key management (sandbox + live)
2FA for live key reveal
Callback URL configuration
Webhook URL + test button
Payout account verification (KSh 1 B2C)
IP whitelisting
Rate limiting
Airtel integration
Flutterwave (cards) integration
Phase 7: Polish & Launch (Week 13)
Error handling & edge cases
Anomaly detection
Admin dispute management
Revenue dashboard
Mintlify documentation
Postman collection
Node.js SDK
3 pilot clients onboarding
Next Steps
Initialize monorepo structure
Set up PostgreSQL + Prisma schema
Create Fastify API boilerplate
Build authentication system
Create dashboard shells (client + admin)
Begin Phase 1 implementation
