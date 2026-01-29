import { useState, useEffect } from 'react';
import { 
  getAdminDashboard, 
  getAdminTransactions, 
  getAdminDisputes, 
  getAdminUsers 
} from '@/services/supabaseApi';

export interface DashboardMetrics {
  users: { total: number; buyers: number; sellers: number };
  transactions: { total: number; pending: number; completed: number };
  volume: { total: number; currency: string };
  disputes: { open: number };
}

export interface AdminTransaction {
  id: string;
  itemName: string;
  amount: number;
  status: string;
  seller: { name: string; phone: string };
  buyer?: { name: string; phone: string };
  createdAt: string;
}

export interface AdminDispute {
  id: string;
  transactionId: string;
  status: string;
  reason: string;
  transaction: {
    itemName: string;
    amount: number;
    seller: { name: string };
    buyer?: { name: string };
  };
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  signupMethod: 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'ADMIN_CREATED';
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isVerified: boolean;
  isActive: boolean;
  memberSince: string;
  wallet?: { availableBalance: number; pendingBalance: number };
}

export function useAdminData() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel using Supabase edge functions
      const [metricsRes, transactionsRes, disputesRes, usersRes] = await Promise.all([
        getAdminDashboard(),
        getAdminTransactions({ page: 1, limit: 20 }),
        getAdminDisputes({ page: 1, limit: 20 }),
        getAdminUsers({ page: 1, limit: 20 }),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data as DashboardMetrics);
      }
      
      if (transactionsRes.success && transactionsRes.data) {
        // Transform snake_case to camelCase for transactions
        const txData = Array.isArray(transactionsRes.data) ? transactionsRes.data : [];
        const transformedTx = txData.map((tx: any) => ({
          id: tx.id,
          itemName: tx.item_name,
          amount: tx.amount,
          status: tx.status,
          seller: { name: tx.seller_name || 'Seller', phone: tx.seller_phone || '' },
          buyer: tx.buyer_name ? { name: tx.buyer_name, phone: tx.buyer_phone || '' } : undefined,
          createdAt: tx.created_at,
        }));
        setTransactions(transformedTx);
      }
      
      if (disputesRes.success && disputesRes.data) {
        // Transform snake_case to camelCase for disputes
        const dispData = Array.isArray(disputesRes.data) ? disputesRes.data : [];
        const transformedDisp = dispData.map((d: any) => ({
          id: d.id,
          transactionId: d.transaction_id,
          status: d.status,
          reason: d.reason,
          transaction: d.transactions ? {
            itemName: d.transactions.item_name,
            amount: d.transactions.amount,
            seller: { name: 'Seller' },
            buyer: d.transactions.buyer_name ? { name: d.transactions.buyer_name } : undefined,
          } : { itemName: 'Unknown', amount: 0, seller: { name: 'Unknown' } },
          createdAt: d.created_at,
        }));
        setDisputes(transformedDisp);
      }
      
      if (usersRes.success && usersRes.data) {
        // Transform snake_case to camelCase for users
        const userData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const transformedUsers = userData.map((u: any) => ({
          id: u.user_id || u.id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          role: u.role || 'buyer',
          signupMethod: (u.signup_method || 'phone_otp').toUpperCase().replace('_', '_') as 'PHONE_OTP' | 'EMAIL_PASSWORD' | 'ADMIN_CREATED',
          accountStatus: (u.account_status || 'active').toUpperCase() as 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION',
          isPhoneVerified: u.is_phone_verified || false,
          isEmailVerified: u.is_email_verified || false,
          isVerified: u.is_phone_verified || u.is_email_verified || false,
          isActive: u.is_active !== false,
          memberSince: u.member_since || u.created_at,
        }));
        setUsers(transformedUsers);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  return { metrics, transactions, disputes, users, loading, error, refetch: fetchAllData };
}
