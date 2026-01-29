SWIFTLINE - Project Walkthrough
SWIFTLINE is a premium Escrow Payment Platform designed for social commerce in Kenya (Instagram, WhatsApp, TikTok). It bridges the trust gap between buyers and sellers by holding funds securely until delivery is confirmed.

🚀 Project Status: Frontend Complete
We have successfully built the entire frontend experience for Buyers, Sellers, and Admins.

1. Landing Page (/)
Premium Design: Dark-mode aesthetic with vibrant gradients (Green/Emerald) to signify trust and money.
Conversion Focused: Clear value props for both Buyers and Sellers.
Responsive: Fully optimized for mobile and desktop.
Navigation: Working links to Login, Signup, and Legal pages.
2. Authentication Flow
Login (/login): Split-screen design with secure routing logic.
Signup (/signup): Interactive "Role Selection" (I want to Buy vs. Turn into Seller).
Security: Visual cues (padlocks, shields) to reassure users.
3. Seller Dashboard (/seller)
The command center for merchants.

Link Generator: Sellers can create secure payment links for their products.
Social Share Cards: Auto-generates a beautiful "Instagram-ready" card with a QR code for the product.
Order Management: Sellers can Accept/Reject orders and Mark as Shipped (using the new 
ShippingModal
).
Wallet: Visualizes earnings, pending escrow, and m-pesa withdrawal simulation.
4. Buyer Dashboard (/buyer)
The safe haven for customers.

Active Orders: Track purchases from "Pending" to "Shipped" to "Delivered".
Wallet Top-Up: Simulated integration with M-Pesa, Airtel Money, and Bank.
Dispute Resolution: Interface to raise issues if goods are not as described.
5. Admin Dashboard (/admin)
The control tower for SWIFTLINE staff.

Overview: High-level metrics (Total Volume, Active Disputes).
Transaction Monitoring: Audit trail of all payments.
User Management: View and manage Buyer/Seller accounts.
6. Core Features Implemented
Escrow Logic (Mock): The flow of Pending -> Accepted -> Shipped -> Delivered -> Funds Released is fully simulated in the UI.
Delivery Tracking: Sellers can input Courier and Tracking Numbers.
Visual consistency: A unified design language using Tailwind CSS and Lucide Icons.
🛠️ Technology Stack
Framework: React 18 + TypeScript
Styling: Tailwind CSS
Icons: Lucide React
Routing: React Router DOM
Build Tool: Vite
🔮 Next Steps (Backend Phase)
To take this to production, the following backend work is required:

API Development: Node.js/Express server to handle requests.
Database: PostgreSQL or MongoDB to store users, orders, and transactions.
Authentication: JWT-based auth (Auth0 or custom).
Payments: Integration with Daraja API (M-Pesa) for real money movement.