-- ================== ENUMS ==================
CREATE TYPE public.app_role AS ENUM ('buyer', 'seller', 'admin');
CREATE TYPE public.signup_method AS ENUM ('phone_otp', 'email_password', 'admin_created');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE public.transaction_status AS ENUM ('pending', 'processing', 'paid', 'accepted', 'shipped', 'delivered', 'completed', 'disputed', 'cancelled', 'refunded', 'expired');
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'awaiting_seller', 'awaiting_buyer', 'resolved_buyer', 'resolved_seller', 'closed');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE public.payment_method_type AS ENUM ('mobile_money', 'bank_account');
CREATE TYPE public.notification_type AS ENUM ('payment_received', 'order_accepted', 'item_shipped', 'delivery_confirmed', 'dispute_opened', 'dispute_update', 'dispute_resolved', 'withdrawal_processed', 'link_expired', 'reminder');
CREATE TYPE public.store_status AS ENUM ('inactive', 'active', 'frozen');
CREATE TYPE public.social_platform AS ENUM ('instagram', 'facebook', 'linkedin');
CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');

-- ================== USER ROLES TABLE (Security Best Practice) ==================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ================== PROFILES TABLE ==================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  profile_picture TEXT,
  signup_method signup_method DEFAULT 'phone_otp',
  account_status account_status DEFAULT 'active',
  is_phone_verified BOOLEAN DEFAULT false,
  is_email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  member_since TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================== SELLER PROFILES TABLE ==================
CREATE TABLE public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT,
  business_address TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  rating FLOAT DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  success_rate FLOAT DEFAULT 100,
  response_time INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

-- ================== WALLETS TABLE ==================
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  available_balance FLOAT DEFAULT 0,
  pending_balance FLOAT DEFAULT 0,
  total_earned FLOAT DEFAULT 0,
  total_spent FLOAT DEFAULT 0,
  currency TEXT DEFAULT 'KES',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- ================== PAYMENT METHODS TABLE ==================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type payment_method_type NOT NULL,
  provider TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- ================== STORES TABLE ==================
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  bio TEXT,
  visibility TEXT DEFAULT 'PRIVATE',
  status store_status DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- ================== SOCIAL ACCOUNTS TABLE ==================
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  platform social_platform NOT NULL,
  page_url TEXT NOT NULL,
  page_id TEXT,
  last_scanned_at TIMESTAMPTZ,
  scan_status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, platform)
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- ================== PRODUCTS TABLE ==================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  social_post_id TEXT,
  platform social_platform,
  name TEXT NOT NULL,
  description TEXT,
  price FLOAT,
  currency TEXT DEFAULT 'KES',
  images TEXT[] DEFAULT '{}',
  status product_status DEFAULT 'draft',
  source TEXT DEFAULT 'AI',
  is_available BOOLEAN DEFAULT true,
  availability_note TEXT,
  ai_confidence_score FLOAT,
  extraction_warnings TEXT[] DEFAULT '{}',
  missing_fields TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ================== TRANSACTIONS TABLE ==================
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  buyer_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_description TEXT,
  item_images TEXT[] DEFAULT '{}',
  amount FLOAT NOT NULL,
  quantity INT DEFAULT 1,
  currency TEXT DEFAULT 'KES',
  buyer_phone TEXT,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  platform_fee FLOAT,
  seller_payout FLOAT,
  status transaction_status DEFAULT 'pending',
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
  delivery_proof_urls TEXT[] DEFAULT '{}',
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ================== DISPUTES TABLE ==================
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT REFERENCES public.transactions(id) NOT NULL UNIQUE,
  opened_by_id UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT[] DEFAULT '{}',
  status dispute_status DEFAULT 'open',
  resolution TEXT,
  resolved_by_id UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ================== DISPUTE MESSAGES TABLE ==================
CREATE TABLE public.dispute_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- ================== WITHDRAWALS TABLE ==================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id) NOT NULL,
  amount FLOAT NOT NULL,
  fee FLOAT DEFAULT 0,
  net_amount FLOAT,
  status withdrawal_status DEFAULT 'pending',
  reference TEXT,
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- ================== PAYOUTS TABLE ==================
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT REFERENCES public.transactions(id) NOT NULL UNIQUE,
  seller_id UUID REFERENCES auth.users(id) NOT NULL,
  amount FLOAT NOT NULL,
  platform_fee FLOAT NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- ================== NOTIFICATIONS TABLE ==================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ================== OTP TABLE ==================
CREATE TABLE public.otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

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
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ================== ADMIN LOGS TABLE ==================
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- ================== SYNC LOGS TABLE ==================
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  status TEXT DEFAULT 'RUNNING',
  items_fetched INT DEFAULT 0,
  items_created INT DEFAULT 0,
  items_updated INT DEFAULT 0,
  items_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- ================== SECURITY DEFINER FUNCTION FOR ROLE CHECKS ==================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ================== FUNCTION TO GET USER ROLE ==================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ================== TRIGGER FOR UPDATED_AT ==================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================== AUTO-CREATE PROFILE ON SIGNUP ==================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.phone
  );
  
  -- Create default user role (buyer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'buyer'));
  
  -- Create wallet
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  
  -- Create seller profile if role is seller
  IF (NEW.raw_user_meta_data->>'role') = 'seller' THEN
    INSERT INTO public.seller_profiles (user_id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================== RLS POLICIES ==================

-- User Roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Seller Profiles policies
CREATE POLICY "Users can view their own seller profile" ON public.seller_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own seller profile" ON public.seller_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can view verified seller profiles" ON public.seller_profiles FOR SELECT USING (is_verified = true);
CREATE POLICY "Admins can manage all seller profiles" ON public.seller_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Wallets policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Payment Methods policies
CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);

-- Stores policies
CREATE POLICY "Public can view active public stores" ON public.stores FOR SELECT USING (status = 'active' AND visibility = 'PUBLIC');
CREATE POLICY "Sellers can manage their own store" ON public.stores FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all stores" ON public.stores FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Social Accounts policies
CREATE POLICY "Store owners can manage their social accounts" ON public.social_accounts FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND seller_id = auth.uid()));
CREATE POLICY "Admins can manage all social accounts" ON public.social_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Products policies
CREATE POLICY "Public can view published products" ON public.products FOR SELECT USING (status = 'published' AND is_available = true);
CREATE POLICY "Store owners can manage their products" ON public.products FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND seller_id = auth.uid()));
CREATE POLICY "Admins can manage all products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Transactions policies
CREATE POLICY "Sellers can view their transactions" ON public.transactions FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Buyers can view their transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their transactions" ON public.transactions FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Disputes policies
CREATE POLICY "Dispute participants can view disputes" ON public.disputes FOR SELECT 
  USING (
    auth.uid() = opened_by_id OR 
    EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_id AND (seller_id = auth.uid() OR buyer_id = auth.uid()))
  );
CREATE POLICY "Users can create disputes for their transactions" ON public.disputes FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.transactions WHERE id = transaction_id AND (seller_id = auth.uid() OR buyer_id = auth.uid())));
CREATE POLICY "Admins can manage all disputes" ON public.disputes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Dispute Messages policies
CREATE POLICY "Dispute participants can view messages" ON public.dispute_messages FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.disputes d 
    JOIN public.transactions t ON d.transaction_id = t.id 
    WHERE d.id = dispute_id AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid() OR d.opened_by_id = auth.uid())
  ));
CREATE POLICY "Dispute participants can send messages" ON public.dispute_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins can manage all dispute messages" ON public.dispute_messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Withdrawals policies
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payouts policies
CREATE POLICY "Sellers can view their payouts" ON public.payouts FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Admins can manage all payouts" ON public.payouts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- OTPs policies (service role only - no public access)
CREATE POLICY "Service role can manage OTPs" ON public.otps FOR ALL USING (auth.role() = 'service_role');

-- Audit Logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin Logs policies
CREATE POLICY "Admins can manage admin logs" ON public.admin_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sync Logs policies
CREATE POLICY "Store owners can view their sync logs" ON public.sync_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.stores WHERE id = store_id AND seller_id = auth.uid()));
CREATE POLICY "Admins can manage all sync logs" ON public.sync_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ================== INDEXES ==================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_otps_phone_purpose ON public.otps(phone, purpose);
CREATE INDEX idx_otps_expires_at ON public.otps(expires_at);
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);