/**
 * Supabase API Service
 * Replaces the old backend API with direct Supabase calls
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://pxyyncsnjpuwvnwyfdwx.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI";

type TransactionStatusLower =
  | "pending"
  | "processing"
  | "paid"
  | "accepted"
  | "shipped"
  | "delivered"
  | "completed"
  | "disputed"
  | "cancelled"
  | "refunded"
  | "expired";

type StoreStatusLower = "inactive" | "active" | "frozen";
type ProductStatusLower = "draft" | "published" | "archived";
type PaymentMethodTypeLower = "mobile_money" | "bank_account";
type SocialPlatformLower = "instagram" | "facebook" | "linkedin";
type DisputeStatusLower =
  | "open"
  | "under_review"
  | "awaiting_seller"
  | "awaiting_buyer"
  | "resolved_buyer"
  | "resolved_seller"
  | "closed";

function toLowerEnum<T extends string>(value: string): T {
  return value.trim().toLowerCase() as T;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function callEdgeFunction<T>(
  functionName: string,
  path: string = "",
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    params?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, params } = options;
  const headers = await getAuthHeaders();

  let url = `${SUPABASE_URL}/functions/v1/${functionName}${path}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = await response.text();
    if (!rawText.trim()) {
      return {
        success: false,
        error: response.ok ? "Empty response" : `Request failed (${response.status})`,
        code: "EMPTY_RESPONSE",
      } as ApiResponse<T>;
    }
    try {
      const data = JSON.parse(rawText) as ApiResponse<T>;
      return data;
    } catch {
      return {
        success: false,
        error: response.ok ? "Invalid response" : `Request failed (${response.status})`,
        code: "INVALID_RESPONSE",
      } as ApiResponse<T>;
    }
  } catch (error) {
    console.error(`Edge function error (${functionName}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      code: "NETWORK_ERROR",
    } as ApiResponse<T>;
  }
}

// ==================== BUYER API ====================

export async function getBuyerOrders(params: { status?: string; page?: number; limit?: number } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const page = params.page || 1;
  const limit = params.limit || 20;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("buyer_id", session.user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (params.status) {
    query = query.eq("status", toLowerEnum<TransactionStatusLower>(params.status));
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Transform to match expected format
  const orders = (data || []).map((tx: any) => ({
    id: tx.id,
    itemName: tx.item_name,
    amount: tx.amount,
    status: tx.status,
    seller: tx.seller || { name: "Unknown", phone: "" },
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
  }));

  return {
    success: true,
    data: orders,
    pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
  };
}

export async function getBuyerWallet() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: wallet, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  // Get transaction count
  const { count: txCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("buyer_id", session.user.id);

  return {
    success: true,
    data: {
      availableBalance: wallet?.available_balance || 0,
      pendingBalance: wallet?.pending_balance || 0,
      totalSpent: wallet?.total_spent || 0,
      totalTransactions: txCount || 0,
    },
  };
}

export async function getBuyerDisputes() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("disputes")
    .select("*, transactions(*)")
    .eq("opened_by_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  const disputes = (data || []).map((d: any) => ({
    id: d.id,
    transactionId: d.transaction_id,
    status: d.status,
    reason: d.reason,
    transaction: d.transactions ? {
      itemName: d.transactions.item_name,
      amount: d.transactions.amount,
      seller: { name: "Seller" },
    } : null,
    createdAt: d.created_at,
  }));

  return { success: true, data: disputes };
}

export async function confirmDelivery(transactionId: string) {
  return callEdgeFunction("transaction-api", `/${transactionId}/deliver`, {
    method: "POST",
  });
}

export async function addBuyerDisputeMessage(disputeId: string, message: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("dispute_messages")
    .insert({
      dispute_id: disputeId,
      sender_id: session.user.id,
      message,
      is_admin: false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

export async function openDispute(transactionId: string, reason: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("disputes")
    .insert({
      transaction_id: transactionId,
      reason,
      opened_by_id: session.user.id,
      status: "open" as DisputeStatusLower,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update transaction status
  await supabase
    .from("transactions")
    .update({ status: "disputed" as TransactionStatusLower })
    .eq("id", transactionId);

  return { success: true, data };
}

// ==================== SELLER API ====================

export async function getSellerOrders(params: { status?: string; page?: number; limit?: number } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const page = params.page || 1;
  const limit = params.limit || 20;

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("seller_id", session.user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (params.status) {
    query = query.eq("status", toLowerEnum<TransactionStatusLower>(params.status));
  }

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  const orders = (data || []).map((tx: any) => ({
    id: tx.id,
    itemName: tx.item_name,
    amount: tx.amount,
    status: tx.status,
    buyer: {
      id: tx.buyer_id || "",
      name: tx.buyer_name || "Guest",
      phone: tx.buyer_phone || "",
    },
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
    acceptedAt: tx.accepted_at,
    shippedAt: tx.shipped_at,
    courierName: tx.courier_name,
    trackingNumber: tx.tracking_number,
  }));

  return {
    success: true,
    data: orders,
    pagination: { page, limit, total: count || 0 },
  };
}

export async function getSellerStats() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const userId = session.user.id;

  // Get all orders for this seller
  const { data: orders } = await supabase
    .from("transactions")
    .select("status, amount")
    .eq("seller_id", userId);

  // Get wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Get seller profile from seller_profiles table
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("business_name, rating, total_reviews")
    .eq("user_id", userId)
    .maybeSingle();

  const orderList = orders || [];
  const total = orderList.length;
  const completed = orderList.filter(o => o.status === "completed" || o.status === "delivered").length;
  const pending = orderList.filter(o => o.status === "pending" || o.status === "paid").length;
  const disputed = orderList.filter(o => o.status === "disputed").length;

  return {
    success: true,
    data: {
      totalOrders: total,
      completedOrders: completed,
      pendingOrders: pending,
      disputedOrders: disputed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      disputeRate: total > 0 ? (disputed / total) * 100 : 0,
      wallet: {
        availableBalance: wallet?.available_balance || 0,
        pendingBalance: wallet?.pending_balance || 0,
        totalEarned: wallet?.total_earned || 0,
      },
      profile: sellerProfile
        ? {
            businessName: sellerProfile.business_name,
            rating: sellerProfile.rating,
            totalReviews: sellerProfile.total_reviews,
          }
        : undefined,
    },
  };
}

export async function acceptOrder(orderId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "accepted" as TransactionStatusLower,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("seller_id", session.user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function rejectOrder(orderId: string, reason?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "cancelled" as TransactionStatusLower,
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("seller_id", session.user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function addShippingInfo(orderId: string, data: {
  courierName: string;
  trackingNumber: string;
  estimatedDeliveryDate?: string;
  notes?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: updated, error } = await supabase
    .from("transactions")
    .update({
      status: "shipped" as TransactionStatusLower,
      courier_name: data.courierName,
      tracking_number: data.trackingNumber,
      estimated_delivery_date: data.estimatedDeliveryDate,
      shipping_notes: data.notes,
      shipped_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("seller_id", session.user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: updated };
}

// ==================== STORE API ====================

export async function getMyStore() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store, error } = await supabase
    .from("stores")
    .select("*, social_accounts(*)")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: store };
}

export async function createStore(data: { name: string; slug: string }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store, error } = await supabase
    .from("stores")
    .insert({
      seller_id: session.user.id,
      name: data.name,
      slug: data.slug,
      status: "inactive" as StoreStatusLower,
      visibility: "PRIVATE",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: store };
}

export async function updateStore(data: {
  name?: string;
  slug?: string;
  logo?: string;
  bio?: string;
  visibility?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store, error } = await supabase
    .from("stores")
    .update({
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.visibility && { visibility: data.visibility }),
      updated_at: new Date().toISOString(),
    })
    .eq("seller_id", session.user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: store };
}

export async function updateStoreStatus(status: "INACTIVE" | "ACTIVE" | "FROZEN" | StoreStatusLower) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const statusLower = toLowerEnum<StoreStatusLower>(status);

  const { data: store, error } = await supabase
    .from("stores")
    .update({ status: statusLower, updated_at: new Date().toISOString() })
    .eq("seller_id", session.user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: store };
}

// ==================== WALLET & PAYMENT METHODS ====================

export async function getWallet() {
  return callEdgeFunction("wallet-api", "/");
}

export async function getPaymentMethods() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("payment_methods")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .order("is_default", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function addPaymentMethod(data: {
  type: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", session.user.id);
  }

  const { data: method, error } = await supabase
    .from("payment_methods")
    .insert({
      user_id: session.user.id,
      type: (data.type.toLowerCase() === "mobile_money" ? "mobile_money" : "bank_account") as PaymentMethodTypeLower,
      provider: data.provider,
      account_number: data.accountNumber,
      account_name: data.accountName,
      is_default: data.isDefault || false,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: method };
}

export async function requestWithdrawal(amount: number, paymentMethodId: string) {
  return callEdgeFunction("wallet-api", "/withdraw", {
    method: "POST",
    body: { amount, paymentMethodId },
  });
}

// ==================== TRANSACTIONS ====================

export async function createTransaction(data: {
  itemName: string;
  amount: number;
  description?: string;
  images?: string[];
}) {
  return callEdgeFunction("transaction-api", "/", {
    method: "POST",
    body: data,
  });
}

export async function getTransaction(id: string) {
  return callEdgeFunction("transaction-api", `/${id}`);
}

export async function initiatePayment(transactionId: string, data: {
  paymentMethod: string;
  phone: string;
  buyerName?: string;
  buyerEmail?: string;
}) {
  return callEdgeFunction("transaction-api", `/${transactionId}/pay`, {
    method: "POST",
    body: data,
  });
}

// ==================== ADMIN API ====================

export async function getAdminDashboard() {
  return callEdgeFunction("admin-api", "/dashboard");
}

export async function getAdminTransactions(params: { page?: number; limit?: number; status?: string } = {}) {
  return callEdgeFunction("admin-api", "/transactions", {
    params: {
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      ...(params.status && { status: params.status }),
    },
  });
}

export async function getAdminDisputes(params: { page?: number; limit?: number; status?: string } = {}) {
  return callEdgeFunction("admin-api", "/disputes", {
    params: {
      page: String(params.page || 1),
      limit: String(params.limit || 20),
      ...(params.status && { status: params.status }),
    },
  });
}

export async function getAdminUsers(params: { page?: number; limit?: number } = {}) {
  return callEdgeFunction("admin-api", "/users", {
    params: {
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    },
  });
}

export async function resolveDispute(disputeId: string, data: { resolution: string; winner: "buyer" | "seller" }) {
  return callEdgeFunction("admin-api", `/disputes/${disputeId}/resolve`, {
    method: "POST",
    body: data,
  });
}

export async function deactivateUser(userId: string) {
  return callEdgeFunction("admin-api", `/users/${userId}/deactivate`, {
    method: "POST",
  });
}

export async function activateUser(userId: string) {
  return callEdgeFunction("admin-api", `/users/${userId}/activate`, {
    method: "POST",
  });
}

// ==================== SOCIAL ACCOUNTS ====================

export async function listSocialAccounts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (!store) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("store_id", store.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export async function connectSocialPage(data: {
  platform: string;
  pageUrl: string;
  pageId?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (!store) {
    return { success: false, error: "Create a store first" };
  }

  const { data: account, error } = await supabase
    .from("social_accounts")
    .insert({
      store_id: store.id,
      platform: toLowerEnum<SocialPlatformLower>(data.platform),
      page_url: data.pageUrl,
      page_id: data.pageId,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: account };
}

// ==================== PAYMENT LINKS (Edge: links-api) ====================

export async function createPaymentLink(data: {
  productName: string;
  productDescription?: string;
  price: number;
  originalPrice?: number;
  images?: string[];
  customerPhone?: string;
  currency?: string;
  quantity?: number;
  expiryHours?: number;
}) {
  return callEdgeFunction<{
    id: string;
    productName: string;
    price: number;
    linkUrl: string;
    createdAt: string;
  }>("links-api", "", {
    method: "POST",
    body: data,
  });
}

export async function getPaymentLink(linkId: string) {
  return callEdgeFunction("links-api", `/${linkId}`, { method: "GET" });
}

export async function getMyPaymentLinks(params: { status?: string; page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  const path = `/seller/my-links${search.toString() ? `?${search.toString()}` : ""}`;
  return callEdgeFunction("links-api", path);
}

export async function updatePaymentLinkStatus(linkId: string, status: string) {
  return callEdgeFunction("links-api", `/${linkId}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function purchasePaymentLink(
  linkId: string,
  body: {
    buyerPhone: string;
    buyerEmail?: string;
    deliveryAddress?: string;
    paymentMethod?: string;
    buyerCurrency?: string;
    quantity?: number;
    buyerName?: string;
  }
) {
  return callEdgeFunction<{ id: string; transactionId: string }>("links-api", `/${linkId}/purchase`, {
    method: "POST",
    body,
  });
}

// ==================== STOREFRONT (Edge: storefront-api) ====================

export async function getStorefront(slug: string) {
  return callEdgeFunction("storefront-api", `/store/${encodeURIComponent(slug)}`, { method: "GET" });
}

export async function getPublicProduct(storeSlug: string, productId: string) {
  return callEdgeFunction(
    "storefront-api",
    `/product/${encodeURIComponent(storeSlug)}/${encodeURIComponent(productId)}`,
    { method: "GET" }
  );
}

export async function createStorefrontCheckout(
  storeSlug: string,
  productId: string,
  body: { buyerName: string; buyerPhone: string; buyerEmail?: string; buyerAddress?: string; paymentMethod?: string }
) {
  return callEdgeFunction<{ id: string; transactionId?: string }>(
    "storefront-api",
    `/checkout/${encodeURIComponent(storeSlug)}/${encodeURIComponent(productId)}`,
    { method: "POST", body }
  );
}

// ==================== PAYSTACK (Edge: paystack-api) ====================

export async function getPaystackConfig() {
  return callEdgeFunction<{ publicKey: string }>("paystack-api", "/config", { method: "GET" });
}

export async function initiatePaystackPayment(data: {
  transactionId: string;
  email: string;
  metadata?: Record<string, unknown>;
}) {
  return callEdgeFunction<{
    authorization_url: string;
    authorizationUrl?: string;
    access_code: string;
    reference: string;
  }>("paystack-api", "/initialize", {
    method: "POST",
    body: data,
  });
}

export async function verifyPaystackPayment(transactionId: string, reference: string) {
  return callEdgeFunction("paystack-api", "/verify", {
    method: "POST",
    body: { transactionId, reference },
  });
}

// ==================== PRODUCTS ====================

function transformProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price || 0,
    images: p.images || [],
    status: (p.status || "draft").toUpperCase(),
    sourceUrl: p.social_post_id,
    sourcePlatform: p.platform?.toUpperCase(),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export async function createProduct(data: {
  name: string;
  description?: string;
  price: number;
  images?: string[];
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  // Get user's store
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (!store) {
    return { success: false, error: "Please create a store first" };
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      images: data.images || [],
      status: "draft" as ProductStatusLower,
      source: "manual",
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: transformProduct(product) };
}

export async function listDraftProducts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (!store) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "draft" as ProductStatusLower)
    .order("updated_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []).map(transformProduct) };
}

export async function listPublishedProducts() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("seller_id", session.user.id)
    .maybeSingle();

  if (!store) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("status", "published" as ProductStatusLower)
    .order("updated_at", { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data || []).map(transformProduct) };
}

export async function updateProduct(productId: string, data: {
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | ProductStatusLower;
}) {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.images !== undefined) updateData.images = data.images;
  if (data.status) updateData.status = toLowerEnum<ProductStatusLower>(data.status);

  const { data: product, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: transformProduct(product) };
}

export async function publishProduct(productId: string) {
  return updateProduct(productId, { status: "published" });
}

export async function archiveProduct(productId: string) {
  return updateProduct(productId, { status: "archived" });
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Product deleted" };
}

// Export all functions as a namespace-like object for compatibility
export const supabaseApi = {
  // Buyer
  getBuyerOrders,
  getBuyerWallet,
  getBuyerDisputes,
  confirmDelivery,
  openDispute,
  
  // Seller
  getSellerOrders,
  getSellerStats,
  acceptOrder,
  rejectOrder,
  addShippingInfo,
  
  // Store
  getMyStore,
  createStore,
  updateStore,
  updateStoreStatus,
  
  // Wallet
  getWallet,
  getPaymentMethods,
  addPaymentMethod,
  requestWithdrawal,
  
  // Transactions
  createTransaction,
  getTransaction,
  initiatePayment,
  
  // Admin
  getAdminDashboard,
  getAdminTransactions,
  getAdminDisputes,
  getAdminUsers,
  resolveDispute,
  deactivateUser,
  activateUser,
  
  // Social
  listSocialAccounts,
  connectSocialPage,
  
  // Products
  createProduct,
  listDraftProducts,
  listPublishedProducts,
  updateProduct,
  publishProduct,
  archiveProduct,
  deleteProduct,

  // Payment links (Edge: links-api)
  createPaymentLink,
  getPaymentLink,
  getMyPaymentLinks,
  updatePaymentLinkStatus,
  purchasePaymentLink,

  // Paystack (Edge: paystack-api)
  getPaystackConfig,
  initiatePaystackPayment,
  verifyPaystackPayment,

  // Storefront (Edge: storefront-api)
  getStorefront,
  getPublicProduct,
  createStorefrontCheckout,
  addBuyerDisputeMessage,
};
