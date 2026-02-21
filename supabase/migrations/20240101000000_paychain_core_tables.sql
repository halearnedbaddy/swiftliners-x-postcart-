-- PayChain Core Tables Migration
-- This migration creates the core tables required for the PayChain escrow payment platform

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Account status enum
CREATE TYPE account_status_enum AS ENUM (
  'EMAIL_UNVERIFIED',
  'EMAIL_VERIFIED', 
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

-- Hold status enum
CREATE TYPE hold_status AS ENUM (
  'ACTIVE',
  'RELEASED',
  'CANCELLED',
  'EXPIRED'
);

-- Condition type enum
CREATE TYPE condition_type AS ENUM (
  'CLIENT_APPROVAL',
  'DELIVERY_CONFIRM',
  'TIMER',
  'CUSTOM'
);

-- KYC status enum
CREATE TYPE kyc_status AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED'
);

-- Disbursement status enum  
CREATE TYPE disbursement_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- Transaction status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE txn_status AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED',
    'HELD',
    'RELEASED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment method enum
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'MPESA',
    'AIRTEL',
    'CARD'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- ACCOUNTS TABLE (Business Accounts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business info
  email VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  
  -- Account status
  status account_status_enum DEFAULT 'EMAIL_UNVERIFIED',
  
  -- API Keys (hashed)
  sandbox_api_key VARCHAR(255),
  sandbox_api_key_hash VARCHAR(255),
  live_api_key_hash VARCHAR(255),
  api_key_last_four VARCHAR(4),
  
  -- Configuration
  callback_url VARCHAR(500),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  min_payout_amount INTEGER DEFAULT 100, -- in cents
  payout_phone VARCHAR(20),
  payout_verified BOOLEAN DEFAULT FALSE,
  
  -- Security
  ip_whitelist TEXT[] DEFAULT ARRAY[]::TEXT[],
  totp_secret VARCHAR(255),
  totp_enabled BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Index for faster lookups
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_status ON accounts(status);

-- =============================================================================
-- KYC_DOCUMENTS TABLE (Compliance/KYC Submissions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Personal Info
  director_name VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  kra_pin VARCHAR(20),
  expected_volume VARCHAR(100),
  
  -- Documents
  id_document_url VARCHAR(500),
  business_cert_url VARCHAR(500),
  
  -- Agreement
  agreement_signed BOOLEAN DEFAULT FALSE,
  agreement_pdf_url VARCHAR(500),
  
  -- Review
  status kyc_status DEFAULT 'DRAFT',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id)
);

CREATE INDEX idx_kyc_account_id ON kyc_documents(account_id);
CREATE INDEX idx_kyc_status ON kyc_documents(status);

-- =============================================================================
-- PAYCHAIN TRANSACTIONS TABLE (extends or replaces existing transactions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(20) PRIMARY KEY DEFAULT CONCAT('txn_', SUBSTRING(gen_random_uuid()::TEXT, 1, 12)),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Amount
  amount INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) DEFAULT 'KES',
  
  -- Payer Info
  phone VARCHAR(20),
  payer_name VARCHAR(255),
  
  -- Payment Details
  payment_method payment_method,
  provider_ref VARCHAR(255), -- M-Pesa receipt, etc.
  description TEXT,
  
  -- Status
  status txn_status DEFAULT 'PENDING',
  
  -- Fees
  fee_amount INTEGER DEFAULT 0, -- in cents
  fee_percentage DECIMAL(5,4) DEFAULT 0.025, -- 2.5%
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- External reference
  external_ref VARCHAR(255),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_txn_account ON transactions(account_id);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_created ON transactions(created_at DESC);

-- =============================================================================
-- HOLDS TABLE (Escrow Holds)
-- =============================================================================
CREATE TABLE IF NOT EXISTS holds (
  id VARCHAR(20) PRIMARY KEY DEFAULT CONCAT('hold_', SUBSTRING(gen_random_uuid()::TEXT, 1, 12)),
transaction_id VARCHAR(20) REFERENCES transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Amount
  amount INTEGER NOT NULL, -- in cents
  
  -- Status
  status hold_status DEFAULT 'ACTIVE',
  
  -- Condition
  condition_type condition_type,
  condition_id UUID,
  
  -- Expiry
  expiry_at TIMESTAMPTZ,
  
  -- Release/Cancel
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_holds_account ON holds(account_id);
CREATE INDEX idx_holds_status ON holds(status);
CREATE INDEX idx_holds_transaction ON holds(transaction_id);

-- =============================================================================
-- CONDITIONS TABLE (Release Conditions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Condition Info
  name VARCHAR(255) NOT NULL,
  type condition_type NOT NULL,
  config JSONB DEFAULT '{}'::JSONB,
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conditions_account ON conditions(account_id);

-- =============================================================================
-- DISBURSEMENTS TABLE (Payout Records)
-- =============================================================================
CREATE TABLE IF NOT EXISTS disbursements (
  id VARCHAR(20) PRIMARY KEY DEFAULT CONCAT('disb_', SUBSTRING(gen_random_uuid()::TEXT, 1, 12)),
  hold_id VARCHAR(20) REFERENCES holds(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Amount
  amount INTEGER NOT NULL, -- total amount in cents (after fee deduction)
  fee_deducted INTEGER DEFAULT 0,
  
  -- Status
  status disbursement_status DEFAULT 'PENDING',
  
  -- Recipient (for single recipient disbursements)
  recipient_phone VARCHAR(20),
  recipient_name VARCHAR(255),
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_disbursements_account ON disbursements(account_id);
CREATE INDEX idx_disbursements_status ON disbursements(status);

-- =============================================================================
-- DISBURSEMENT_SPLITS TABLE (Individual Split Payouts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS disbursement_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disbursement_id VARCHAR(20) NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,
  
  -- Recipient
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(255),
  
  -- Amount
  amount INTEGER NOT NULL, -- in cents
  percentage DECIMAL(5,2), -- e.g., 85.00 for 85%
  
  -- Payment
  payment_method payment_method DEFAULT 'MPESA',
  provider_ref VARCHAR(255),
  
  -- Status
  status disbursement_status DEFAULT 'PENDING',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_splits_disbursement ON disbursement_splits(disbursement_id);

-- =============================================================================
-- WEBHOOKS TABLE (Webhook Delivery Log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Event
  event_type VARCHAR(50) NOT NULL, -- e.g., 'payment.success'
  payload JSONB NOT NULL,
  
  -- Delivery
  url VARCHAR(500) NOT NULL,
  response_code INTEGER,
  response_body TEXT,
  
  -- Retry
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  
  -- Status
  delivered BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_account ON webhooks(account_id);
CREATE INDEX idx_webhooks_pending ON webhooks(delivered, next_attempt_at) WHERE delivered = FALSE;

-- =============================================================================
-- SUPPORT_TICKETS TABLE (for Support page)
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Ticket Info
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  
  -- Status
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_account ON support_tickets(account_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);

-- =============================================================================
-- TICKET_MESSAGES TABLE (Support ticket messages)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Message
  message TEXT NOT NULL,
  is_staff BOOLEAN DEFAULT FALSE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Accounts: Users can only see/modify their own account
CREATE POLICY accounts_select ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY accounts_insert ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY accounts_update ON accounts FOR UPDATE USING (auth.uid() = user_id);

-- KYC Documents: Users can see/modify their own, admins can see all
CREATE POLICY kyc_select ON kyc_documents FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY kyc_insert ON kyc_documents FOR INSERT WITH CHECK (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY kyc_update ON kyc_documents FOR UPDATE USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Transactions: Users can see their own transactions
CREATE POLICY txn_select ON transactions FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Holds: Users can see their own holds
CREATE POLICY holds_select ON holds FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY holds_update ON holds FOR UPDATE USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- Conditions: Users can manage their own conditions
CREATE POLICY conditions_all ON conditions FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- Disbursements: Users can see their own disbursements
CREATE POLICY disbursements_select ON disbursements FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- Disbursement Splits: Based on parent disbursement
CREATE POLICY splits_select ON disbursement_splits FOR SELECT USING (
  disbursement_id IN (
    SELECT id FROM disbursements WHERE account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  )
);

-- Webhooks: Users can see their own webhook logs
CREATE POLICY webhooks_select ON webhooks FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- Support Tickets: Users can manage their own tickets
CREATE POLICY tickets_select ON support_tickets FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY tickets_insert ON support_tickets FOR INSERT WITH CHECK (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY tickets_update ON support_tickets FOR UPDATE USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Ticket Messages: Based on parent ticket
CREATE POLICY messages_select ON ticket_messages FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM support_tickets WHERE account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY messages_insert ON ticket_messages FOR INSERT WITH CHECK (
  ticket_id IN (
    SELECT id FROM support_tickets WHERE account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON kyc_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conditions_updated_at BEFORE UPDATE ON conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTION: Auto-create account on user signup
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO accounts (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'EMAIL_UNVERIFIED');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- FUNCTION: Update account status on email verification
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE accounts 
    SET status = 'EMAIL_VERIFIED' 
    WHERE user_id = NEW.id AND status = 'EMAIL_UNVERIFIED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_verified();
