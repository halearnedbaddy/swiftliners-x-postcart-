/**
 * Cloud API Service
 * Uses Lovable Cloud (Supabase) directly instead of external Express backend
 */

import { supabase } from "@/lib/supabase";
import type { 
  Profile, 
  Store, 
  Product, 
  Wallet, 
  Transaction, 
  SocialAccount,
  TransactionStatus,
  SocialPlatform
} from "@/lib/database.types";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Types
export interface User {
  id: string;
  phone?: string;
  name: string;
  email?: string;
  role: "BUYER" | "SELLER" | "ADMIN";
}

// Re-export for convenience
export type { Profile, Store, Product, Wallet, Transaction, SocialAccount };

class CloudApiService {
  // ==================== AUTH ====================
  
  async registerWithEmail(data: { email: string; password: string; name: string; role?: string; phone?: string }): Promise<ApiResponse<{ user: User }>> {
    try {
      const normalizedRole = (data.role || "buyer").toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: data.name,
            role: normalizedRole,
            phone: data.phone,
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: "Failed to create user" };
      }

      const user: User = {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: (normalizedRole.toUpperCase() as "BUYER" | "SELLER" | "ADMIN") || "BUYER",
      };

      return { success: true, data: { user } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Registration failed" };
    }
  }

  // ==================== PHONE OTP AUTH ====================

  async sendPhoneOtp(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Call OTP edge function
      const { data, error } = await supabase.functions.invoke("otp-sms", {
        body: { phone, purpose: "LOGIN" },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: data?.success ?? false, error: data?.error };
    } catch (error) {
      console.error('OTP send error:', error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to send OTP" };
    }
  }

  async verifyPhoneOtp(phone: string, token: string): Promise<ApiResponse<{ user: User }>> {
    try {
      // Call verify OTP edge function
      const { data, error } = await supabase.functions.invoke("otp-sms", {
        body: { phone, token, action: "verify" },
      });

      if (error || !data?.success) {
        return { success: false, error: error?.message || data?.error || 'OTP verification failed' };
      }

      // Get or create profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      if (!profile) {
        return { success: false, error: "Profile not found" };
      }

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      const user: User = {
        id: profile.user_id,
        email: profile.email || undefined,
        name: profile.name,
        phone: profile.phone || undefined,
        role: (roleData?.role as "BUYER" | "SELLER" | "ADMIN") || "BUYER",
      };

      return { success: true, data: { user } };
    } catch (error) {
      console.error('OTP verify error:', error);
      return { success: false, error: error instanceof Error ? error.message : "OTP verification failed" };
    }
  }

  async loginWithEmail(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: "Login failed" };
      }

      // Get profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || undefined,
        name: profile?.name || authData.user.user_metadata?.name || "User",
        role: (roleData?.role as "BUYER" | "SELLER" | "ADMIN") || "BUYER",
        phone: profile?.phone || undefined,
      };

      return { success: true, data: { user } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Login failed" };
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getSession() {
    return supabase.auth.getSession();
  }

  async getUser() {
    return supabase.auth.getUser();
  }

  // ==================== PROFILE ====================

  async getProfile(): Promise<ApiResponse<Profile & { role: string }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!profile) return { success: false, error: "Profile not found" };

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      return { 
        success: true, 
        data: { 
          ...profile, 
          role: roleData?.role || "BUYER" 
        } as Profile & { role: string }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch profile" };
    }
  }

  async updateProfile(updates: Partial<Profile>): Promise<ApiResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { role, ...profileUpdates } = updates as Profile & { role?: string };

      const { error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user.id);

      if (error) return { success: false, error: error.message };
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update profile" };
    }
  }

  // ==================== STORE ====================

  async getMyStore(): Promise<ApiResponse<Store>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      return { success: true, data: data as Store | undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch store" };
    }
  }

  async createStore(data: { name: string; slug: string }): Promise<ApiResponse<Store>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store, error } = await supabase
        .from("stores")
        .insert({ user_id: user.id, name: data.name, slug: data.slug })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: store as Store };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create store" };
    }
  }

  async updateStore(updates: Partial<Store>): Promise<ApiResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { error } = await supabase
        .from("stores")
        .update(updates)
        .eq("user_id", user.id);

      if (error) return { success: false, error: error.message };
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update store" };
    }
  }

  async updateStoreStatus(status: "INACTIVE" | "ACTIVE" | "FROZEN"): Promise<ApiResponse<boolean>> {
    return this.updateStore({ status });
  }

  // ==================== PRODUCTS ====================

  async getDraftProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!store) return { success: true, data: [] };

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "DRAFT")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Product[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch drafts" };
    }
  }

  async getPublishedProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!store) return { success: true, data: [] };

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Product[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch products" };
    }
  }

  async createProduct(data: { name: string; description?: string; price: number; images?: string[] }): Promise<ApiResponse<Product>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!store) return { success: false, error: "Store not found" };

      const { data: product, error } = await supabase
        .from("products")
        .insert({
          store_id: store.id,
          name: data.name,
          description: data.description,
          price: data.price,
          images: data.images || [],
          status: "DRAFT",
          source: "MANUAL",
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: product as Product };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create product" };
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update product" };
    }
  }

  async publishProduct(id: string): Promise<ApiResponse<boolean>> {
    return this.updateProduct(id, { status: "PUBLISHED" });
  }

  async archiveProduct(id: string): Promise<ApiResponse<boolean>> {
    return this.updateProduct(id, { status: "ARCHIVED" });
  }

  async deleteProduct(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete product" };
    }
  }

  // ==================== AI GENERATION ====================

  async generateProductWithAI(description: string, imageUrl?: string): Promise<ApiResponse<Product>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: "Not authenticated" };

      const { data, error } = await supabase.functions.invoke("ai-generate-product", {
        body: { description, imageUrl },
      });

      if (error) return { success: false, error: error.message };
      return { success: true, data: data?.product as Product };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "AI generation failed" };
    }
  }

  // ==================== WALLET ====================

  async getWallet(): Promise<ApiResponse<Wallet>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      return { success: true, data: data as Wallet };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch wallet" };
    }
  }

  // ==================== TRANSACTIONS ====================

  async getTransactions(params: { status?: TransactionStatus; page?: number; limit?: number } = {}): Promise<ApiResponse<Transaction[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      let query = supabase
        .from("transactions")
        .select("*")
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.limit) {
        const offset = ((params.page || 1) - 1) * params.limit;
        query = query.range(offset, offset + params.limit - 1);
      }

      const { data, error } = await query;

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Transaction[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch transactions" };
    }
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data) return { success: false, error: "Transaction not found" };
      return { success: true, data: data as Transaction };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch transaction" };
    }
  }

  async createTransaction(data: { itemName: string; amount: number; description?: string; images?: string[] }): Promise<ApiResponse<Transaction & { paymentLink: string; itemImages: string[] }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          seller_id: user.id,
          item_name: data.itemName,
          item_description: data.description,
          amount: data.amount,
          item_images: data.images || [],
          status: "PENDING",
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      
      const baseUrl = window.location.origin;
      return { 
        success: true, 
        data: {
          ...transaction,
          paymentLink: `${baseUrl}/pay/${transaction.id}`,
          itemImages: data.images || [],
        } as Transaction & { paymentLink: string; itemImages: string[] }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create transaction" };
    }
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id);

      if (error) return { success: false, error: error.message };
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update transaction" };
    }
  }

  // ==================== SELLER ORDERS ====================

  async getSellerOrders(params: { status?: TransactionStatus; page?: number; limit?: number } = {}): Promise<ApiResponse<Transaction[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      let query = supabase
        .from("transactions")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.limit) {
        const offset = ((params.page || 1) - 1) * params.limit;
        query = query.range(offset, offset + params.limit - 1);
      }

      const { data, error } = await query;

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Transaction[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch orders" };
    }
  }

  async acceptOrder(orderId: string): Promise<ApiResponse<boolean>> {
    return this.updateTransaction(orderId, { status: "ACCEPTED", accepted_at: new Date().toISOString() });
  }

  async rejectOrder(orderId: string, reason?: string): Promise<ApiResponse<boolean>> {
    return this.updateTransaction(orderId, { 
      status: "CANCELLED", 
      rejected_at: new Date().toISOString(),
      rejection_reason: reason 
    });
  }

  async addShippingInfo(orderId: string, data: { courierName: string; trackingNumber: string; estimatedDeliveryDate?: string }): Promise<ApiResponse<boolean>> {
    return this.updateTransaction(orderId, {
      courier_name: data.courierName,
      tracking_number: data.trackingNumber,
      estimated_delivery_date: data.estimatedDeliveryDate,
      status: "SHIPPED",
      shipped_at: new Date().toISOString(),
    });
  }

  // ==================== BUYER ORDERS ====================

  async getBuyerOrders(params: { status?: TransactionStatus; page?: number; limit?: number } = {}): Promise<ApiResponse<Transaction[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      let query = supabase
        .from("transactions")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.limit) {
        const offset = ((params.page || 1) - 1) * params.limit;
        query = query.range(offset, offset + params.limit - 1);
      }

      const { data, error } = await query;

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Transaction[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch orders" };
    }
  }

  async confirmDelivery(transactionId: string): Promise<ApiResponse<boolean>> {
    return this.updateTransaction(transactionId, { 
      status: "DELIVERED",
      delivered_at: new Date().toISOString()
    });
  }

  // ==================== SOCIAL ACCOUNTS ====================

  async listSocialAccounts(): Promise<ApiResponse<SocialAccount[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!store) return { success: true, data: [] };

      const { data, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as SocialAccount[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch social accounts" };
    }
  }

  async connectSocialPage(data: { platform: SocialPlatform; pageUrl: string; pageId?: string }): Promise<ApiResponse<SocialAccount>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!store) return { success: false, error: "Store not found" };

      const { data: account, error } = await supabase
        .from("social_accounts")
        .insert({
          store_id: store.id,
          platform: data.platform,
          page_url: data.pageUrl,
          page_id: data.pageId,
          scan_status: "PENDING",
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data: account as SocialAccount };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to connect social page" };
    }
  }

  // ==================== STOREFRONT (PUBLIC) ====================

  async getStorefront(slug: string): Promise<ApiResponse<{ store: Store; products: Product[] }>> {
    try {
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .eq("visibility", "PUBLIC")
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (storeError || !store) {
        return { success: false, error: "Store not found" };
      }

      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store.id)
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false });

      return {
        success: true,
        data: {
          store: store as Store,
          products: (products || []) as Product[],
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch storefront" };
    }
  }

  async getPublicProduct(slug: string, productId: string): Promise<ApiResponse<Product>> {
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .eq("visibility", "PUBLIC")
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (!store) return { success: false, error: "Store not found" };

      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("store_id", store.id)
        .eq("status", "PUBLISHED")
        .maybeSingle();

      if (error || !product) return { success: false, error: "Product not found" };
      return { success: true, data: product as Product };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch product" };
    }
  }

  // ==================== SELLER STATS ====================

  async getSellerStats(): Promise<ApiResponse<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: transactions } = await supabase
        .from("transactions")
        .select("status, amount")
        .eq("seller_id", user.id);

      const stats = {
        totalOrders: transactions?.length || 0,
        pendingOrders: transactions?.filter(t => t.status === "PENDING").length || 0,
        completedOrders: transactions?.filter(t => t.status === "DELIVERED" || t.status === "COMPLETED").length || 0,
        totalRevenue: transactions?.filter(t => t.status === "DELIVERED" || t.status === "COMPLETED").reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch stats" };
    }
  }

  // ==================== ADMIN ====================

  async getAdminDashboard(): Promise<ApiResponse<{
    users: { total: number; buyers: number; sellers: number };
    transactions: { total: number; pending: number; completed: number };
    volume: { total: number; currency: string };
    disputes: { open: number };
  }>> {
    try {
      // Get counts from database
      const [profilesResult, transactionsResult, disputesResult] = await Promise.all([
        supabase.from("profiles").select("id, user_id"),
        supabase.from("transactions").select("id, status, amount"),
        supabase.from("disputes").select("id, status"),
      ]);

      const profiles = profilesResult.data || [];
      const transactions = transactionsResult.data || [];
      const disputes = disputesResult.data || [];

      // Get role counts
      const { data: roles } = await supabase.from("user_roles").select("role");
      const roleCounts = {
        buyers: roles?.filter(r => r.role === "BUYER").length || 0,
        sellers: roles?.filter(r => r.role === "SELLER").length || 0,
      };

      return {
        success: true,
        data: {
          users: {
            total: profiles.length,
            buyers: roleCounts.buyers,
            sellers: roleCounts.sellers,
          },
          transactions: {
            total: transactions.length,
            pending: transactions.filter(t => t.status === "PENDING").length,
            completed: transactions.filter(t => t.status === "COMPLETED" || t.status === "DELIVERED").length,
          },
          volume: {
            total: transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
            currency: "KES",
          },
          disputes: {
            open: disputes.filter(d => d.status === "OPEN" || d.status === "UNDER_REVIEW").length,
          },
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch dashboard" };
    }
  }

  async getAllUsers(): Promise<ApiResponse<Array<Profile & { role: string }>>> {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };

      // Get all roles
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || "BUYER",
      }));

      return { success: true, data: usersWithRoles };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch users" };
    }
  }

  async getAllTransactions(): Promise<ApiResponse<Transaction[]>> {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: (data || []) as Transaction[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch transactions" };
    }
  }

  async getAllDisputes(): Promise<ApiResponse<Array<{
    id: string;
    transaction_id: string;
    status: string;
    reason: string;
    created_at: string;
  }>>> {
    try {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) return { success: false, error: error.message };
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch disputes" };
    }
  }
}

export const cloudApi = new CloudApiService();
