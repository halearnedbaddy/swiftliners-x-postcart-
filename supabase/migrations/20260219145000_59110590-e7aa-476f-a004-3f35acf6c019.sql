
-- =============================================================================
-- ACCOUNTS TABLE (needed by charge & generate-api-key edge functions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  business_name text,
  status text NOT NULL DEFAULT 'PENDING',
  sandbox_api_key text,
  live_api_key_hash text,
  api_key_last_four text,
  webhook_url text,
  webhook_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own account" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own account" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all accounts" ON public.accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage accounts" ON public.accounts
  FOR ALL USING (auth.role() = 'service_role'::text);

-- =============================================================================
-- WEBHOOK ENDPOINTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{charge.success,charge.failed,disburse.success,disburse.failed,hold.created,hold.released}',
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their webhook endpoints" ON public.webhook_endpoints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = webhook_endpoints.account_id AND accounts.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all webhook endpoints" ON public.webhook_endpoints
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage webhook endpoints" ON public.webhook_endpoints
  FOR ALL USING (auth.role() = 'service_role'::text);

-- =============================================================================
-- WEBHOOK DELIVERIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  attempt integer NOT NULL DEFAULT 1,
  max_attempts integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their webhook deliveries" ON public.webhook_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      JOIN public.accounts a ON a.id = we.account_id
      WHERE we.id = webhook_deliveries.webhook_endpoint_id AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all webhook deliveries" ON public.webhook_deliveries
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage webhook deliveries" ON public.webhook_deliveries
  FOR ALL USING (auth.role() = 'service_role'::text);

-- =============================================================================
-- TOTP SECRETS TABLE (for 2FA on live key reveal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.totp_secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  encrypted_secret text NOT NULL,
  is_verified boolean NOT NULL DEFAULT false,
  backup_codes text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own TOTP" ON public.totp_secrets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage TOTP" ON public.totp_secrets
  FOR ALL USING (auth.role() = 'service_role'::text);

-- =============================================================================
-- ESCROW HOLDS TABLE (for /hold endpoint)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id text NOT NULL PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  transaction_id text REFERENCES public.transactions(id),
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  phone text,
  payment_method text,
  description text,
  status text NOT NULL DEFAULT 'HELD',
  held_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  released_to text,
  release_method text,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all holds" ON public.escrow_holds
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage holds" ON public.escrow_holds
  FOR ALL USING (auth.role() = 'service_role'::text);

CREATE POLICY "Account owners can view their holds" ON public.escrow_holds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = escrow_holds.account_id AND accounts.user_id = auth.uid())
  );

-- =============================================================================
-- DISBURSEMENTS TABLE (for /disburse endpoint - B2C)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.disbursements (
  id text NOT NULL PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id),
  hold_id text REFERENCES public.escrow_holds(id),
  amount double precision NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  recipient_phone text NOT NULL,
  recipient_name text,
  payment_method text NOT NULL DEFAULT 'MPESA',
  description text,
  status text NOT NULL DEFAULT 'QUEUED',
  provider_ref text,
  fee_amount double precision DEFAULT 0,
  queued_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all disbursements" ON public.disbursements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage disbursements" ON public.disbursements
  FOR ALL USING (auth.role() = 'service_role'::text);

CREATE POLICY "Account owners can view their disbursements" ON public.disbursements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = disbursements.account_id AND accounts.user_id = auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_totp_secrets_updated_at BEFORE UPDATE ON public.totp_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_escrow_holds_updated_at BEFORE UPDATE ON public.escrow_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disbursements_updated_at BEFORE UPDATE ON public.disbursements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
