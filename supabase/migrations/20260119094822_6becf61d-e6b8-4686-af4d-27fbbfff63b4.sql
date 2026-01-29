-- Persistent OTP storage for otp-sms function (Edge Functions are stateless)

CREATE TABLE IF NOT EXISTS public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicates / speed up lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_created_at ON public.otp_codes (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_consumed_at ON public.otp_codes (phone, consumed_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes (expires_at);

-- Enable RLS and do not add any policies so direct client access is blocked.
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes FORCE ROW LEVEL SECURITY;

-- Optional housekeeping: keep table small (safe no-op if rows don't exist)
-- Delete fully-consumed OTPs older than 30 days
DELETE FROM public.otp_codes
WHERE consumed_at IS NOT NULL
  AND created_at < now() - interval '30 days';

-- Delete expired OTPs older than 30 days
DELETE FROM public.otp_codes
WHERE expires_at < now() - interval '30 days';
