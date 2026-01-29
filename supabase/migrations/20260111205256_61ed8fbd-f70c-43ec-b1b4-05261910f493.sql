-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'BUYER' CHECK (role IN ('BUYER', 'SELLER', 'ADMIN')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  bio TEXT,
  visibility TEXT DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
  status TEXT DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE', 'ACTIVE', 'FROZEN')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table for AI drafts and published products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2),
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  ai_confidence_score DECIMAL(3,2),
  extraction_warnings TEXT[] DEFAULT '{}',
  missing_fields TEXT[] DEFAULT '{}',
  source_type TEXT CHECK (source_type IN ('MANUAL', 'AI_GENERATED', 'SOCIAL_IMPORT')),
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social_accounts table
CREATE TABLE public.social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN')),
  page_url TEXT NOT NULL,
  page_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallets table
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  available_balance DECIMAL(12,2) DEFAULT 0,
  pending_balance DECIMAL(12,2) DEFAULT 0,
  total_earned DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  item_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'ACCEPTED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED')),
  payment_method TEXT,
  payment_reference TEXT,
  shipping_courier TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stores policies
CREATE POLICY "Users can view their own store" ON public.stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public stores are viewable by everyone" ON public.stores FOR SELECT USING (visibility = 'PUBLIC' AND status = 'ACTIVE');
CREATE POLICY "Users can create their own store" ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own store" ON public.stores FOR UPDATE USING (auth.uid() = user_id);

-- Products policies
CREATE POLICY "Store owners can view their products" ON public.products FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Published products are public" ON public.products FOR SELECT USING (status = 'PUBLISHED' AND store_id IN (SELECT id FROM public.stores WHERE visibility = 'PUBLIC' AND status = 'ACTIVE'));
CREATE POLICY "Store owners can create products" ON public.products FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can update products" ON public.products FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can delete products" ON public.products FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

-- Social accounts policies
CREATE POLICY "Store owners can view social accounts" ON public.social_accounts FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can create social accounts" ON public.social_accounts FOR INSERT WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can update social accounts" ON public.social_accounts FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can delete social accounts" ON public.social_accounts FOR DELETE USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

-- Wallets policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies - sellers see their transactions
CREATE POLICY "Sellers can view their transactions" ON public.transactions FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Buyers can view their transactions" ON public.transactions FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can create transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update their transactions" ON public.transactions FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Public can view transaction by id" ON public.transactions FOR SELECT USING (true);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_products_store_id ON public.products(store_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_transactions_seller_id ON public.transactions(seller_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_stores_slug ON public.stores(slug);