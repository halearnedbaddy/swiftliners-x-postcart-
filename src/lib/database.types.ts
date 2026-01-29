/**
 * Database types for Supabase tables
 * These types match the schema created in the database
 */

export type AppRole = 'BUYER' | 'SELLER' | 'ADMIN';
export type SignupMethod = 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'ADMIN_CREATED';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'ACCEPTED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'AWAITING_SELLER' | 'AWAITING_BUYER' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CLOSED';
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentMethodType = 'MOBILE_MONEY' | 'BANK_ACCOUNT';
export type NotificationType = 'PAYMENT_RECEIVED' | 'ORDER_ACCEPTED' | 'ITEM_SHIPPED' | 'DELIVERY_CONFIRMED' | 'DISPUTE_OPENED' | 'DISPUTE_UPDATE' | 'DISPUTE_RESOLVED' | 'WITHDRAWAL_PROCESSED' | 'LINK_EXPIRED' | 'REMINDER';
export type StoreStatus = 'INACTIVE' | 'ACTIVE' | 'FROZEN';
export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  business_name: string | null;
  business_address: string | null;
  is_verified: boolean;
  is_active: boolean;
  signup_method: SignupMethod;
  account_status: AccountStatus;
  rating: number;
  total_reviews: number;
  total_sales: number;
  success_rate: number;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_spent: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: PaymentMethodType;
  provider: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  payment_method_id: string;
  amount: number;
  fee: number;
  net_amount: number | null;
  status: WithdrawalStatus;
  reference: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo: string | null;
  bio: string | null;
  visibility: string;
  status: StoreStatus;
  created_at: string;
  updated_at: string;
}

export interface SocialAccount {
  id: string;
  store_id: string;
  platform: SocialPlatform;
  page_url: string;
  page_id: string | null;
  last_scanned_at: string | null;
  scan_status: string | null;
  created_at: string;
  updated_at: string;
}

// Alias for compatibility
export type SocialAccountWithSyncStatus = SocialAccount & { sync_status?: string };

export interface Product {
  id: string;
  store_id: string;
  social_post_id: string | null;
  platform: SocialPlatform | null;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  images: string[];
  status: ProductStatus;
  source: string;
  is_available: boolean;
  availability_note: string | null;
  ai_confidence_score: number | null;
  extraction_warnings: string[];
  missing_fields: string[];
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  product_id: string | null;
  item_name: string;
  item_description: string | null;
  item_images: string[];
  amount: number;
  quantity: number;
  currency: string;
  buyer_phone: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_address: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  platform_fee: number | null;
  seller_payout: number | null;
  status: TransactionStatus;
  expires_at: string | null;
  paid_at: string | null;
  accepted_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  shipping_notes: string | null;
  delivery_proof_urls: string[];
  rejected_at: string | null;
  rejection_reason: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispute {
  id: string;
  transaction_id: string;
  opened_by_id: string;
  reason: string;
  description: string | null;
  evidence: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolved_by_id: string | null;
  resolved_at: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  message: string;
  attachments: string[];
  is_admin: boolean;
  created_at: string;
}

export interface Payout {
  id: string;
  transaction_id: string;
  seller_id: string;
  amount: number;
  platform_fee: number;
  status: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  store_id: string;
  social_account_id: string | null;
  status: string;
  posts_found: number;
  products_created: number;
  errors: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

// Database schema for Supabase client
export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<UserRole, 'id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      wallets: {
        Row: Wallet;
        Insert: Omit<Wallet, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Wallet, 'id'>>;
      };
      payment_methods: {
        Row: PaymentMethod;
        Insert: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<PaymentMethod, 'id'>>;
      };
      withdrawals: {
        Row: Withdrawal;
        Insert: Omit<Withdrawal, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Withdrawal, 'id'>>;
      };
      stores: {
        Row: Store;
        Insert: Omit<Store, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Store, 'id'>>;
      };
      social_accounts: {
        Row: SocialAccount;
        Insert: Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<SocialAccount, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Product, 'id'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Transaction, 'id'>>;
      };
      disputes: {
        Row: Dispute;
        Insert: Omit<Dispute, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Dispute, 'id'>>;
      };
      dispute_messages: {
        Row: DisputeMessage;
        Insert: Omit<DisputeMessage, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<DisputeMessage, 'id'>>;
      };
      payouts: {
        Row: Payout;
        Insert: Omit<Payout, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Payout, 'id'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Notification, 'id'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<AuditLog, 'id'>>;
      };
      admin_logs: {
        Row: AdminLog;
        Insert: Omit<AdminLog, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<AdminLog, 'id'>>;
      };
      sync_logs: {
        Row: SyncLog;
        Insert: Omit<SyncLog, 'id' | 'started_at'> & { id?: string; started_at?: string };
        Update: Partial<Omit<SyncLog, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      get_user_role: {
        Args: { _user_id: string };
        Returns: AppRole;
      };
      owns_store: {
        Args: { _store_id: string };
        Returns: boolean;
      };
      is_dispute_participant: {
        Args: { _dispute_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      signup_method: SignupMethod;
      account_status: AccountStatus;
      transaction_status: TransactionStatus;
      dispute_status: DisputeStatus;
      withdrawal_status: WithdrawalStatus;
      payment_method_type: PaymentMethodType;
      notification_type: NotificationType;
      store_status: StoreStatus;
      social_platform: SocialPlatform;
      product_status: ProductStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
