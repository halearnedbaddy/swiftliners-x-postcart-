-- Payment links table (for Create Link flow - no Express server)
CREATE TABLE public.payment_links (
  id TEXT PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  price NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2),
  currency TEXT DEFAULT 'KES',
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  customer_phone TEXT,
  quantity INTEGER DEFAULT 1,
  expiry_date TIMESTAMPTZ,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'SOLD_OUT', 'DELETED')),
  clicks INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view their payment links" ON public.payment_links
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create payment links" ON public.payment_links
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their payment links" ON public.payment_links
  FOR UPDATE USING (auth.uid() = seller_id);

-- Public can read any payment link by id (for checkout page /buy/:linkId)
CREATE POLICY "Public can view payment links for checkout" ON public.payment_links
  FOR SELECT USING (true);

CREATE TRIGGER update_payment_links_updated_at BEFORE UPDATE ON public.payment_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payment_links_seller_id ON public.payment_links(seller_id);
CREATE INDEX idx_payment_links_status ON public.payment_links(status);
