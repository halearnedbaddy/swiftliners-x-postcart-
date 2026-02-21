
-- ============================================
-- PAYCHAIN CORE DATABASE SCHEMA
-- ============================================

-- Enum types
CREATE TYPE public.account_status AS ENUM ('EMAIL_UNVERIFIED', 'EMAIL_VERIFIED', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE public.kyc_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'HELD', 'RELEASED', 'REFUNDED');
CREATE TYPE public.payment_method AS ENUM ('MPESA', 'AIRTEL', 'CARD');
CREATE TYPE public.hold_status AS ENUM ('ACTIVE', 'RELEASED', 'CANCELLED', 'EXPIRED');
CREATE TYPE public.condition_type AS ENUM ('CLIENT_APPROVAL', 'DELIVERY_CONFIRM', 'TIMER', 'CUSTOM');
CREATE TYPE public.disbursement_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE public.ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE public.ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============================================
-- USER ROLES (security-first, separate table)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============================================
-- ACCOUNTS (Business profiles linked to auth.users)
-- ============================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  business_type TEXT DEFAULT '',
  status account_status NOT NULL DEFAULT 'EMAIL_UNVERIFIED',
  sandbox_api_key TEXT,
  live_api_key_hash TEXT,
  api_key_last_four TEXT,
  callback_url TEXT DEFAULT '',
  webhook_url TEXT DEFAULT '',
  min_payout_amount INTEGER DEFAULT 100,
  payout_phone TEXT DEFAULT '',
  payout_verified BOOLEAN DEFAULT FALSE,
  ip_whitelist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own account" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own account" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own account" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- KYC DOCUMENTS
-- ============================================
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  director_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  kra_pin TEXT DEFAULT '',
  expected_volume TEXT DEFAULT '',
  id_document_url TEXT DEFAULT '',
  business_cert_url TEXT DEFAULT '',
  agreement_signed BOOLEAN DEFAULT FALSE,
  agreement_pdf_url TEXT DEFAULT '',
  status kyc_status NOT NULL DEFAULT 'DRAFT',
  rejection_reason TEXT DEFAULT '',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own kyc" ON public.kyc_documents FOR ALL
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY DEFAULT ('txn_' || substring(gen_random_uuid()::text, 1, 8)),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- in KSh cents
  currency TEXT NOT NULL DEFAULT 'KES',
  phone TEXT DEFAULT '',
  payment_method payment_method NOT NULL DEFAULT 'MPESA',
  status transaction_status NOT NULL DEFAULT 'PENDING',
  provider_ref TEXT DEFAULT '',
  description TEXT DEFAULT '',
  fee_amount INTEGER DEFAULT 0,
  fee_percentage NUMERIC(5,2) DEFAULT 2.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- HOLDS (Escrow)
-- ============================================
CREATE TABLE public.holds (
  id TEXT PRIMARY KEY DEFAULT ('hold_' || substring(gen_random_uuid()::text, 1, 8)),
  transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  status hold_status NOT NULL DEFAULT 'ACTIVE',
  condition_type condition_type DEFAULT 'CLIENT_APPROVAL',
  condition_id UUID,
  expiry_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own holds" ON public.holds FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own holds" ON public.holds FOR UPDATE
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own holds" ON public.holds FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- CONDITIONS (Release Conditions)
-- ============================================
CREATE TABLE public.conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type condition_type NOT NULL DEFAULT 'CLIENT_APPROVAL',
  config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conditions" ON public.conditions FOR ALL
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- DISBURSEMENTS
-- ============================================
CREATE TABLE public.disbursements (
  id TEXT PRIMARY KEY DEFAULT ('disb_' || substring(gen_random_uuid()::text, 1, 8)),
  hold_id TEXT REFERENCES public.holds(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  status disbursement_status NOT NULL DEFAULT 'PENDING',
  recipient_phone TEXT DEFAULT '',
  recipient_name TEXT DEFAULT '',
  provider_ref TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own disbursements" ON public.disbursements FOR SELECT
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own disbursements" ON public.disbursements FOR INSERT
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- SUPPORT TICKETS
-- ============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status ticket_status NOT NULL DEFAULT 'OPEN',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tickets" ON public.support_tickets FOR ALL
  USING (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()))
  WITH CHECK (account_id IN (SELECT id FROM public.accounts WHERE user_id = auth.uid()));

-- ============================================
-- AUTO-UPDATED TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER kyc_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- AUTO-CREATE ACCOUNT ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.accounts (user_id, email, business_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'business_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
