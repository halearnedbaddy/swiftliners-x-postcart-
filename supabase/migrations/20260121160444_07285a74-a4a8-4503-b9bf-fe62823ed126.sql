-- ================== ENUMS ==================
CREATE TYPE public.app_role AS ENUM ('BUYER', 'SELLER', 'ADMIN');
CREATE TYPE public.signup_method AS ENUM ('PHONE_OTP', 'EMAIL_PASSWORD', 'ADMIN_CREATED');
CREATE TYPE public.account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED', 'EXPIRED');
CREATE TYPE public.dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'AWAITING_SELLER', 'AWAITING_BUYER', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED');
CREATE TYPE public.withdrawal_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE public.payment_method_type AS ENUM ('MOBILE_MONEY', 'BANK_ACCOUNT');
CREATE TYPE public.notification_type AS ENUM ('PAYMENT_RECEIVED', 'ORDER_ACCEPTED', 'ITEM_SHIPPED', 'DELIVERY_CONFIRMED', 'DISPUTE_OPENED', 'DISPUTE_UPDATE', 'DISPUTE_RESOLVED', 'WITHDRAWAL_PROCESSED', 'LINK_EXPIRED', 'REMINDER');
CREATE TYPE public.store_status AS ENUM ('INACTIVE', 'ACTIVE', 'FROZEN');
CREATE TYPE public.social_platform AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN');
CREATE TYPE public.product_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- ================== USER ROLES TABLE (for secure role checking) ==================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'BUYER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== PROFILES TABLE ==================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  business_name TEXT,
  business_address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  signup_method public.signup_method DEFAULT 'EMAIL_PASSWORD',
  account_status public.account_status DEFAULT 'ACTIVE',
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 100,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== WALLETS TABLE ==================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available_balance NUMERIC(12,2) DEFAULT 0,
  pending_balance NUMERIC(12,2) DEFAULT 0,
  total_earned NUMERIC(12,2) DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallets" ON public.wallets
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== PAYMENT METHODS TABLE ==================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.payment_method_type NOT NULL,
  provider TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- ================== WITHDRAWALS TABLE ==================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  fee NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2),
  status public.withdrawal_status DEFAULT 'PENDING',
  reference TEXT,
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== STORES TABLE ==================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  bio TEXT,
  visibility TEXT DEFAULT 'PRIVATE',
  status public.store_status DEFAULT 'INACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public stores are viewable by everyone" ON public.stores
  FOR SELECT USING (visibility = 'PUBLIC' OR status = 'ACTIVE' OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own store" ON public.stores
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all stores" ON public.stores
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== SOCIAL ACCOUNTS TABLE ==================
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  platform public.social_platform NOT NULL,
  page_url TEXT NOT NULL,
  page_id TEXT,
  last_scanned_at TIMESTAMPTZ,
  scan_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, platform)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Function to check store ownership
CREATE OR REPLACE FUNCTION public.owns_store(_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND user_id = auth.uid()
  )
$$;

CREATE POLICY "Users can view their store's social accounts" ON public.social_accounts
  FOR SELECT USING (public.owns_store(store_id));

CREATE POLICY "Users can manage their store's social accounts" ON public.social_accounts
  FOR ALL USING (public.owns_store(store_id));

-- ================== PRODUCTS TABLE ==================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  social_post_id TEXT,
  platform public.social_platform,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT DEFAULT 'KES',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  status public.product_status DEFAULT 'DRAFT',
  source TEXT DEFAULT 'MANUAL',
  is_available BOOLEAN DEFAULT TRUE,
  availability_note TEXT,
  ai_confidence_score NUMERIC(3,2),
  extraction_warnings TEXT[] DEFAULT ARRAY[]::TEXT[],
  missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published products are viewable by everyone" ON public.products
  FOR SELECT USING (status = 'PUBLISHED' OR public.owns_store(store_id));

CREATE POLICY "Users can manage their store's products" ON public.products
  FOR ALL USING (public.owns_store(store_id));

-- ================== TRANSACTIONS TABLE ==================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  buyer_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  amount NUMERIC(12,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  currency TEXT DEFAULT 'KES',
  buyer_phone TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  platform_fee NUMERIC(12,2),
  seller_payout NUMERIC(12,2),
  status public.transaction_status DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  courier_name TEXT,
  tracking_number TEXT,
  estimated_delivery_date TIMESTAMPTZ,
  shipping_notes TEXT,
  delivery_proof_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Sellers can create transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Admins can manage all transactions" ON public.transactions
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== DISPUTES TABLE ==================
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) NOT NULL UNIQUE,
  opened_by_id UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
  status public.dispute_status DEFAULT 'OPEN',
  resolution TEXT,
  resolved_by_id UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Function to check if user is part of dispute
CREATE OR REPLACE FUNCTION public.is_dispute_participant(_dispute_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.disputes d
    JOIN public.transactions t ON t.id = d.transaction_id
    WHERE d.id = _dispute_id AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid() OR d.opened_by_id = auth.uid())
  )
$$;

CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (public.is_dispute_participant(id) OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = opened_by_id);

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ================== DISPUTE MESSAGES TABLE ==================
CREATE TABLE public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dispute messages" ON public.dispute_messages
  FOR SELECT USING (public.is_dispute_participant(dispute_id) OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users can add dispute messages" ON public.dispute_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND public.is_dispute_participant(dispute_id));

-- ================== PAYOUTS TABLE ==================
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) NOT NULL UNIQUE,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  platform_fee NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'ADMIN'));

-- ================== NOTIFICATIONS TABLE ==================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- ================== OTP TABLE ==================
CREATE TABLE public.otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- OTPs are managed by edge functions only
CREATE POLICY "No direct access to OTPs" ON public.otps
  FOR ALL USING (false);

-- ================== AUDIT LOGS TABLE ==================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "System can create audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ================== ADMIN LOGS TABLE ==================
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can create admin logs" ON public.admin_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- ================== SYNC LOGS TABLE ==================
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  posts_found INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sync logs" ON public.sync_logs
  FOR SELECT USING (public.owns_store(store_id));

-- ================== TRIGGERS FOR UPDATED_AT ==================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================== AUTO-CREATE PROFILE AND WALLET ON USER SIGNUP ==================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.phone
  );
  
  -- Create wallet
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'BUYER'));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================== INDEXES ==================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_otps_phone_purpose ON public.otps(phone, purpose);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);