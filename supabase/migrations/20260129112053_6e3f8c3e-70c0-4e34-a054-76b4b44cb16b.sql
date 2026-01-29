-- Create payment_links table for the Create Link feature
CREATE TABLE IF NOT EXISTS public.payment_links (
  id TEXT PRIMARY KEY,
  seller_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  price DOUBLE PRECISION NOT NULL,
  original_price DOUBLE PRECISION,
  currency TEXT DEFAULT 'KES',
  images TEXT[] DEFAULT '{}',
  customer_phone TEXT,
  quantity INTEGER DEFAULT 1,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'ACTIVE',
  clicks INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own payment links
CREATE POLICY "Sellers can manage their own payment links"
ON public.payment_links FOR ALL
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Public can view active payment links (for buyers)
CREATE POLICY "Public can view active payment links"
ON public.payment_links FOR SELECT
USING (status = 'ACTIVE');

-- Admins can manage all payment links
CREATE POLICY "Admins can manage all payment links"
ON public.payment_links FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();