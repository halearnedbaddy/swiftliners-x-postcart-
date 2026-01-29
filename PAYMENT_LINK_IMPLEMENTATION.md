# PayLoom Payment Link System Implementation Plan

This document outlines the implementation plan for the "Create Link Once" feature, which allows sellers to generate instant payment links for individual products.

## 1. Database Schema Updates (Prisma)

We need to update `schema.prisma` to include the new models or update existing ones to support the "Payment Link" flow.

### New/Updated Models:
- **`PaymentLink`**: To store the product details for the shareable link.
- **`Order`**: (Existing `Transaction` might be used, but we'll ensure it supports link-based purchases).
- **`Escrow`**: (Existing `Payout` or a new model to track held funds).

## 2. Backend Implementation (Express)

### API Endpoints:
- `POST /api/v1/seller/links`: Create a new payment link.
- `GET /api/v1/links/:linkId`: Public endpoint to fetch link/product details.
- `PATCH /api/v1/seller/links/:linkId`: Update link status (deactivate, etc.).
- `GET /api/v1/seller/links`: List all links for a seller.
- `POST /api/v1/links/:linkId/purchase`: Initiate checkout from a link.

### Services:
- **Link Service**: Handle unique ID generation (e.g., `PL-XXXXX`) and status management.
- **Order Service**: Handle the creation of orders from links, including guest checkout support.
- **Escrow Service**: Manage the "Held" status and 7-day auto-release logic.
- **Notification Service**: Trigger SMS/Email for new orders, shipping, and delivery.

## 3. Frontend Implementation (React)

### Seller Dashboard:
- **"Create Link Once" Tab**: A form to input product name, description, price, images, and optional customer phone.
- **Link Success Screen**: Display the generated link with "Copy" and "Share" buttons.
- **Links Management**: A list view to see all generated links, their clicks, and statuses.

### Buyer Experience:
- **Public Product Page (`/buy/:linkId`)**: A mobile-optimized landing page for the product.
- **Checkout Modal**: Quick form for phone number, address, and payment method (M-Pesa STK).
- **Payment Processing View**: Loading state for STK push.
- **Success/Track Page**: Order confirmation and tracking timeline.

## 4. Execution Steps

### Phase 1: Foundation (Backend & DB)
1. Update `schema.prisma` with `PaymentLink` and enhance `Transaction` model.
2. Run migrations.
3. Implement `LinkController` and routes.
4. Implement `PurchaseController` for link-based orders.

### Phase 2: Seller UI
1. Create `CreateLinkPage.tsx` in the seller dashboard.
2. Implement link generation form and success state.
3. Create `MyLinksPage.tsx` for link management.

### Phase 3: Buyer UI
1. Create `PublicProductPage.tsx` for the `/buy/:linkId` route.
2. Implement the `QuickCheckoutModal.tsx`.
3. Implement `PaymentStatusPage.tsx` for post-purchase.

### Phase 4: Escrow & Notifications
1. Implement the 7-day auto-release cron job (or scheduled task).
2. Integrate SMS notifications for order milestones.

---
**Status:** Ready to start Phase 1.
