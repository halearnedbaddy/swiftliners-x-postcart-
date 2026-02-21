export type ComplianceStatus = 
  'draft' | 'pending' | 'under_review' | 'approved' | 'rejected';

export interface ComplianceSubmission {
  id: string;
  developer_id: string;
  director_full_name: string | null;
  phone_number: string | null;
  physical_address: string | null;
  kra_pin: string | null;
  expected_monthly_volume: string | null;
  use_case_description: string | null;
  national_id_front_url: string | null;
  national_id_front_name: string | null;
  national_id_back_url: string | null;
  national_id_back_name: string | null;
  business_cert_url: string | null;
  business_cert_name: string | null;
  agreement_signed: boolean;
  signatory_name: string | null;
  signed_at: string | null;
  current_step: number;
  status: ComplianceStatus;
  rejection_reason: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Step1Data {
  director_full_name: string;
  phone_number: string;
  physical_address: string;
  kra_pin: string;
  expected_monthly_volume: string;
  use_case_description: string;
}

export interface Step3Data {
  signatory_name: string;
  agreement_signed: boolean;
}

export const COMPLIANCE_STEPS = [
  { number: 1, label: 'Business Details' },
  { number: 2, label: 'KYC Documents' },
  { number: 3, label: 'Agreement' },
  { number: 4, label: 'Review & Submit' },
  { number: 5, label: 'Submitted' },
] as const;

export const MONTHLY_VOLUME_OPTIONS = [
  'Below KSh 100,000',
  'KSh 100,000 – 500,000',
  'KSh 500,000 – 1,000,000',
  'KSh 1,000,000 – 5,000,000',
  'Above KSh 5,000,000',
] as const;
