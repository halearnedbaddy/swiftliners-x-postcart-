# PAYINGZEE × POSTCART  
## COMPLETE FLOW & IMPLEMENTATION CHECKLIST (AUDIT MODE)

> Purpose of this document:
> - To let an AI / engineer check what is already implemented
> - Identify what is missing
> - Make NO changes unless something is explicitly missing
> - Treat this file as the single source of truth

---

## 1️⃣ CORE PRODUCT DEFINITION

- [ ] AI-powered social storefront
- [x] One link per seller (store link)
- [x] Link-based selling (not marketplace)
- [ ] Platform-controlled payments
- [ ] Automatic fee deduction
- [ ] Seller wallet + payouts
- [ ] Africa-first payments (M-Pesa / Mobile Money)

---

## 2️⃣ ACTORS

### Sellers 
- [x] Social sellers (Instagram / Facebook / WhatsApp)
- [x] No website required
- [x] No coding required

### Buyers 
- [x] Can browse products
- [ ] Can checkout without account (MVP)
- [ ] Can pay via supported payment methods

### Platform (Admin)
- [ ] Controls payments
- [ ] Controls fees
- [ ] Controls payouts
- [ ] Controls risk & fraud

---

## 3️⃣ SELLER ONBOARDING FLOW

- [x] Seller signup
- [x] Seller login
- [ ] OTP / verification (if applicable)
- [ ] Create store
- [ ] Add payout method (mandatory)
- [ ] Auto-create seller wallet
- [ ] Store blocked until payout added
- [ ] Seller dashboard unlocked after payout setup

---

## 4️⃣ STORE ENTITY & LIFECYCLE (ALREADY COVERED — DO NOT CHANGE)

- [x] One store per seller
- [x] Store name
- [x] Store slug
- [ ] Store logo
- [ ] Store bio
- [x] Store public page (`/store/:slug`)
- [ ] Store editable by seller
- [ ] Store deletable / archivable (if allowed)

---

## 5️⃣ STORE VISIBILITY & DISCOVERY STATE (MISSING — MUST CHECK)

- [ ] Store visibility field exists
  - [ ] PRIVATE (default)
  - [ ] PUBLIC (opt-in)
- [ ] Seller explicitly opts into PUBLIC
- [x] No global marketplace logic
- [x] No ranking or discovery feed

---

## 6️⃣ PRODUCT SYSTEM (CORE COMMERCE LAYER)

### Product Entity
- [x] Product belongs to store
- [x] Product name
- [x] Product description
- [x] Product price
- [x] Product images
- [ ] Product currency

### Product States
- [x] Draft
- [x] Published
- [x] Archived

### Product Availability (MISSING — MUST CHECK)
- [ ] isAvailable (Boolean)
- [ ] availabilityNote (optional)

---

## 7️⃣ AI PRODUCT INGESTION (SOCIAL → STORE)

### Social Connection
- [ ] Seller connects Instagram page
- [ ] Seller connects Facebook page
- [ ] Connection done once (not per post)

### AI Initial Scan
- [ ] AI scans entire page
- [ ] AI reads existing posts
- [ ] AI extracts:
  - [ ] Name
  - [ ] Price
  - [ ] Description
  - [ ] Images
- [ ] Products created as DRAFT only

### Seller Control
- [ ] Seller reviews AI-created drafts
- [ ] Seller edits before publish
- [x] AI never auto-publishes

---

## 8️⃣ CONTINUOUS AI AUTO-SYNC

- [ ] AI monitors connected social page
- [ ] New posts → draft products
- [ ] Deleted posts → archive products
- [ ] Updated posts → suggest updates
- [ ] Sync is automatic after first connection

---

## 9️⃣ AI GOVERNANCE RULES (ALREADY DEFINED — VERIFY)

- [ ] AI cannot publish products (enforced)
- [ ] AI cannot change prices silently (enforced)
- [ ] AI changes must be reviewed (enforced)
- [x] AI source tracking exists (post → product)

---

## 1️⃣0️⃣ AI CONFIDENCE & QUALITY SIGNALS (MISSING)

- [ ] aiConfidenceScore (0–1)
- [ ] extractionWarnings[]
- [ ] missingFields[]
- [ ] Visible to seller during review

---

## 1️⃣1️⃣ PUBLIC STORE FRONTEND (BUYER VIEW)

- [x] Public store page
- [x] Product grid
- [x] Product detail page
- [ ] Availability messaging
- [ ] Checkout entry from product
- [ ] No buyer login required

---

## 1️⃣2️⃣ LINK STRATEGY (CORE)

- [x] ONE permanent store link
- [x] Same link shared everywhere
- [x] Products change behind the link
- [x] No per-transaction links for storefront

---

## 1️⃣3️⃣ PAYMENT FLOW (PAYINGZEE CORE)

- [x] Buyer selects product
- [x] Buyer clicks buy
- [ ] Checkout opens
- [ ] Buyer pays via:
  - [ ] M-Pesa
  - [ ] Mobile Money
  - [ ] Card
- [ ] Payment goes to PLATFORM
- [ ] Payment confirmation handled
- [ ] Transaction recorded

---

## 1️⃣4️⃣ PLATFORM FEE & LEDGER

- [ ] Platform fee defined
- [ ] Fee deducted automatically
- [ ] Seller receives net amount
- [ ] Ledger records:
  - [ ] Gross
  - [ ] Fee
  - [ ] Net
- [ ] Seller can view fee breakdown

---

## 1️⃣5️⃣ SELLER WALLET & PAYOUTS

- [x] Wallet balance visible
- [x] Transaction history
- [x] Payout request
- [ ] Balance verification
- [ ] Payout processing
- [ ] Payout completion status
- [ ] Admin retry for failed payouts

---

## 1️⃣6️⃣ FRAUD & RISK SIGNALS (MISSING — CRITICAL)

- [ ] Device fingerprint hash
- [ ] IP reputation signal
- [ ] Payment velocity counters
- [ ] Store risk score
- [ ] Transaction risk flags
- [ ] Admin visibility
- [x] No buyer accounts required (policy)

---

## 1️⃣7️⃣ PROMOTION SYSTEM (ACCOUNT-LESS)

- [ ] Promotion entity exists
- [ ] Store-wide promotions
- [ ] Product-level promotions
- [ ] Link-based promo codes
- [ ] Fee discounts (platform-controlled)
- [ ] No buyer login required

---

## 1️⃣8️⃣ AI SYNC FAILURE RULES (MISSING)

- [ ] Retry limit defined
- [ ] Auto-disable sync after failures
- [ ] Seller notified on failure
- [ ] Admin override & retry

---

## 1️⃣9️⃣ SOURCE OF TRUTH RULES (CRITICAL)

- [ ] Manual seller edits override AI (enforced)
- [ ] AI suggestions never overwrite published data (enforced)
- [ ] Published products require review for AI updates (enforced)

---

## 2️⃣0️⃣ ADMIN PANEL

- [x] View stores
- [ ] View products
- [x] View transactions
- [ ] View wallets
- [ ] Adjust platform fees
- [ ] Freeze stores
- [ ] Audit logs
- [ ] Risk monitoring

---

## 2️⃣1️⃣ GUARANTEES (MUST REMAIN TRUE)

- [x] Not a marketplace
- [ ] No forced buyer accounts (MVP)
- [x] No change to existing payment logic