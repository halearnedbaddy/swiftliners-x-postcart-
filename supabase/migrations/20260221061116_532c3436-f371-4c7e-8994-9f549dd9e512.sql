
-- Compliance submissions table
CREATE TABLE IF NOT EXISTS public.compliance_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL,

  -- Step 1: Business Details
  director_full_name TEXT,
  phone_number TEXT,
  physical_address TEXT,
  kra_pin TEXT,
  expected_monthly_volume TEXT,
  use_case_description TEXT,

  -- Step 2: Documents (Supabase Storage paths)
  national_id_front_url TEXT,
  national_id_front_name TEXT,
  national_id_back_url TEXT,
  national_id_back_name TEXT,
  business_cert_url TEXT,
  business_cert_name TEXT,

  -- Step 3: Agreement
  agreement_signed BOOLEAN DEFAULT FALSE,
  signatory_name TEXT,
  signed_at TIMESTAMPTZ,

  -- Tracking
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  rejection_reason TEXT,
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_compliance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'pending', 'under_review', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid compliance status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_compliance_status_trigger
  BEFORE INSERT OR UPDATE ON public.compliance_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_status();

-- Auto-update updated_at
CREATE TRIGGER compliance_updated_at
  BEFORE UPDATE ON public.compliance_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.compliance_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "developer_select_own" ON public.compliance_submissions
  FOR SELECT USING (developer_id = auth.uid());

CREATE POLICY "developer_insert_own" ON public.compliance_submissions
  FOR INSERT WITH CHECK (developer_id = auth.uid());

CREATE POLICY "developer_update_own_draft" ON public.compliance_submissions
  FOR UPDATE USING (
    developer_id = auth.uid() 
    AND status IN ('draft', 'rejected')
  );

-- Admin can read all submissions
CREATE POLICY "admin_select_all" ON public.compliance_submissions
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Admin can update all submissions
CREATE POLICY "admin_update_all" ON public.compliance_submissions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
  );

-- KYC Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT DO NOTHING;

-- Storage RLS policies
CREATE POLICY "user_upload_own_kyc" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_view_own_kyc" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "user_delete_own_kyc" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_notifications" ON public.admin_notifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_notifications" ON public.admin_notifications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: notify admin when compliance submitted
CREATE OR REPLACE FUNCTION public.notify_admin_on_compliance_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status = 'draft' OR OLD.status = 'rejected') THEN
    INSERT INTO public.admin_notifications (type, title, message, metadata)
    VALUES (
      'compliance_submitted',
      'New KYC Submission',
      'A developer has submitted compliance documents for review.',
      jsonb_build_object(
        'submission_id', NEW.id,
        'developer_id', NEW.developer_id,
        'submitted_at', NEW.submitted_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_compliance_submitted
  AFTER UPDATE ON public.compliance_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_compliance_submit();
