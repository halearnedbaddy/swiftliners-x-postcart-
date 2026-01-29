// Construct API base URL - backend runs on port 8000
const API_BASE = import.meta.env.VITE_API_BASE_URL || (() => {
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(window.location.href);
      const hostname = url.hostname;
      const protocol = url.protocol;

      // In Replit, convert dev domain from 5000 port to 8000 port
      if (hostname.includes('replit.dev')) {
        // Handle both -5000- and direct subdomain patterns
        // We need to ensure we're targeting the correct backend port
        const backendDomain = hostname.replace('5000', '8000');
        return `${protocol}//${backendDomain}`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//127.0.0.1:8000`;
      }
      return `${protocol}//${hostname}:8000`;
    } catch {
      return 'http://127.0.0.1:8000';
    }
  }
  return 'http://127.0.0.1:8000';
})();

import * as supabaseApi from "./supabaseApi";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        return true;
      }

      return false;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, requireAuth = true } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (requireAuth) {
      const token = this.getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      let response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle token expiration
      if (response.status === 401 && requireAuth) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          requestHeaders['Authorization'] = `Bearer ${this.getAuthToken()}`;
          response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
          });
        } else {
          this.clearTokens();
          window.location.href = '/login';
          return { success: false, error: 'Session expired', code: 'SESSION_EXPIRED' };
        }
      }

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      // If the backend is down/misrouted, we might receive HTML (the SPA index.html) or an empty response.
      if (!rawText.trim()) {
        // Include status and URL to make debugging easier
        return {
          success: false,
          error: `Empty response from server (status: ${response.status}, url: ${response.url})`,
          code: 'EMPTY_RESPONSE',
        };
      }

      if (!contentType.includes('application/json')) {
        return {
          success: false,
          error: 'Server returned an invalid response (expected JSON)',
          code: 'INVALID_RESPONSE',
          message: rawText.slice(0, 200),
        };
      }

      try {
        return JSON.parse(rawText) as ApiResponse<T>;
      } catch {
        return {
          success: false,
          error: 'Failed to parse server response',
          code: 'JSON_PARSE_ERROR',
          message: rawText.slice(0, 200),
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API request error:', error);

      // Check if it was a timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. Please check your connection and try again.',
          code: 'TIMEOUT_ERROR',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error. Please try again.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  // Auth endpoints
  async requestOTP(phone: string, purpose: 'LOGIN' | 'REGISTRATION') {
    return this.request('/api/v1/auth/otp/request', {
      method: 'POST',
      body: { phone, purpose },
      requireAuth: false,
    });
  }

  async register(data: { phone: string; name: string; email?: string; role?: string; otp: string }) {
    const response = await this.request<{
      user: { id: string; phone: string; name: string; email?: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/register', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async login(phone: string, otp: string) {
    const response = await this.request<{
      user: { id: string; phone: string; name: string; email?: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: { phone, otp },
      requireAuth: false,
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout() {
    const refreshToken = this.getRefreshToken();
    await this.request('/api/v1/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    });
    this.clearTokens();
  }

  async getProfile() {
    return this.request('/api/v1/auth/profile');
  }

  // Wallet endpoints
  async getWallet() {
    return this.request('/api/v1/wallet');
  }

  async getPaymentMethods() {
    return this.request('/api/v1/wallet/payment-methods');
  }

  async addPaymentMethod(data: { type: string; provider: string; accountNumber: string; accountName: string; isDefault?: boolean }) {
    return this.request('/api/v1/wallet/payment-methods', {
      method: 'POST',
      body: data,
    });
  }

  async requestWithdrawal(amount: number, paymentMethodId: string) {
    return this.request<{ reference: string; status: string; amount: number }>('/api/v1/wallet/withdraw', {
      method: 'POST',
      body: { amount, paymentMethodId },
    });
  }

  async getWithdrawalHistory(page = 1, limit = 20) {
    return this.request(`/api/v1/wallet/withdrawals?page=${page}&limit=${limit}`);
  }

  // Transaction endpoints
  async createTransaction(data: { itemName: string; amount: number; description?: string; images?: string[] }) {
    return this.request<{
      id: string;
      paymentLink: string;
      itemName: string;
      itemDescription?: string;
      itemImages: string[];
      amount: number;
      status: string;
    }>('/api/v1/transactions', {
      method: 'POST',
      body: data,
    });
  }

  async getTransaction(id: string) {
    return this.request(`/api/v1/transactions/${id}`, { requireAuth: false });
  }

  async getTransactions(params: { role?: string; status?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/v1/transactions?${query}`);
  }

  async initiatePayment(transactionId: string, data: { paymentMethod: string; phone: string; buyerName?: string; buyerEmail?: string }) {
    return this.request(`/api/v1/transactions/${transactionId}/pay`, {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
  }

  async confirmDelivery(transactionId: string) {
    return this.request(`/api/v1/transactions/${transactionId}/confirm`, {
      method: 'POST',
    });
  }

  // Seller endpoints
  async getSellerOrders(params: { status?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/v1/seller/orders?${query}`);
  }

  async getOrderDetails(orderId: string) {
    return this.request(`/api/v1/seller/orders/${orderId}`);
  }

  async acceptOrder(orderId: string) {
    return this.request(`/api/v1/seller/orders/${orderId}/accept`, { method: 'POST' });
  }

  async rejectOrder(orderId: string, reason?: string) {
    return this.request(`/api/v1/seller/orders/${orderId}/reject`, {
      method: 'POST',
      body: { reason },
    });
  }

  async addShippingInfo(orderId: string, data: { courierName: string; trackingNumber: string; estimatedDeliveryDate?: string; notes?: string }) {
    return this.request(`/api/v1/seller/orders/${orderId}/shipping`, {
      method: 'POST',
      body: data,
    });
  }

  async getSellerStats() {
    return this.request('/api/v1/seller/stats');
  }

  // Payment endpoints (Legacy M-Pesa - keeping for compatibility)
  async initiateSTKPush(transactionId: string, phoneNumber: string, amount: number) {
    return this.request('/api/v1/payments/initiate-stk', {
      method: 'POST',
      body: { transactionId, phoneNumber, amount },
    });
  }

  async confirmDeliveryWithOTP(transactionId: string, deliveryOTP: string) {
    return this.request('/api/v1/payments/confirm-delivery', {
      method: 'POST',
      body: { transactionId, deliveryOTP },
    });
  }

  async checkPaymentStatus(transactionId: string) {
    return this.request('/api/v1/payments/check-status', {
      method: 'POST',
      body: { transactionId },
      requireAuth: false,
    });
  }

  async simulatePayment(transactionId: string) {
    return this.request('/api/v1/payments/simulate-payment', {
      method: 'POST',
      body: { transactionId },
      requireAuth: false,
    });
  }

  // Paystack Payment endpoints
  async getPaystackConfig() {
    return this.request('/api/v1/paystack/config', { requireAuth: false });
  }

  async initiatePaystackPayment(data: { transactionId: string; email: string; metadata?: Record<string, unknown> }) {
    return this.request('/api/v1/paystack/initialize', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
  }

  async initiatePaystackTopup(amount: number, email: string) {
    return this.request('/api/v1/paystack/topup', {
      method: 'POST',
      body: { amount, email },
    });
  }

  async verifyPaystackPayment(transactionId: string, reference: string) {
    return this.request(`/api/v1/transactions/${transactionId}/verify-paystack`, {
      method: 'POST',
      body: { reference },
      requireAuth: false,
    });
  }

  async getPaystackBanks() {
    return this.request('/api/v1/paystack/banks');
  }

  // IntaSend Payment endpoints (deprecated - using Paystack)
  async getIntaSendConfig() {
    return this.request('/api/v1/intasend/config', { requireAuth: false });
  }

  async createIntaSendCheckout(data: { transactionId: string; email: string; firstName?: string; lastName?: string; phone?: string }) {
    return this.request('/api/v1/intasend/create-checkout', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
  }

  async initiateIntaSendStkPush(data: { transactionId: string; phoneNumber: string; email?: string }) {
    return this.request('/api/v1/intasend/stk-push', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });
  }

  async checkIntaSendStatus(transactionId: string) {
    return this.request('/api/v1/intasend/check-status', {
      method: 'POST',
      body: { transactionId },
      requireAuth: false,
    });
  }

  async requestIntaSendPayout(data: { amount: number; phoneNumber: string; narrative?: string }) {
    return this.request('/api/v1/intasend/payout', {
      method: 'POST',
      body: data,
    });
  }

  // Storefront (public) endpoints
  async getStorefront(slug: string) {
    return this.request(`/api/v1/storefront/${encodeURIComponent(slug)}`, {
      requireAuth: false,
    });
  }

  async getPublicProduct(slug: string, productId: string) {
    return this.request(`/api/v1/storefront/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}`, {
      requireAuth: false,
    });
  }

  // Seller store & social endpoints
  async getMyStore() {
    return this.request('/api/v1/store/me');
  }

  async createStore(data: { name: string; slug: string }) {
    return this.request('/api/v1/store', { method: 'POST', body: data });
  }

  async updateStore(data: { name?: string; slug?: string; logo?: string; bio?: string; visibility?: 'PRIVATE' | 'PUBLIC' }) {
    return this.request('/api/v1/store', { method: 'PATCH', body: data });
  }

  async updateStoreStatus(status: 'INACTIVE' | 'ACTIVE' | 'FROZEN') {
    return this.request('/api/v1/store/status', { method: 'PATCH', body: { status } });
  }

  async triggerStoreRescan() {
    return this.request('/api/v1/store/rescan', { method: 'POST' });
  }

  async listSocialAccounts() {
    return this.request('/api/v1/social');
  }

  async connectSocialPage(data: { platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN'; pageUrl: string; pageId?: string }) {
    return this.request('/api/v1/social/connect', { method: 'POST', body: data });
  }

  async rescanSocialPage(id: string) {
    return this.request(`/api/v1/social/${id}/rescan`, { method: 'POST' });
  }

    // Seller products endpoints
    async listDraftProducts() {
      return this.request('/api/v1/products/drafts');
    }

    async listPublishedProducts() {
      return this.request('/api/v1/products/published');
    }

    // Payment Link endpoints
    async createPaymentLink(data: { productName: string; productDescription?: string; price: number; originalPrice?: number; images?: string[]; customerPhone?: string; currency?: string; quantity?: number; expiryHours?: number }) {
      return this.request('/api/v1/links', {
        method: 'POST',
        body: data
      });
    }

    async getPaymentLink(linkId: string) {
      return this.request(`/api/v1/links/${linkId}`, { requireAuth: false });
    }

    async getMyPaymentLinks(params: { status?: string; page?: number; limit?: number } = {}) {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return this.request(`/api/v1/links/seller/my-links?${query}`);
    }

    async updatePaymentLinkStatus(linkId: string, status: string) {
      return this.request(`/api/v1/links/${linkId}/status`, {
        method: 'PATCH',
        body: { status }
      });
    }

    async createProduct(data: { name: string; description?: string; price: number; images?: string[] }) {
      return this.request('/api/v1/products', { method: 'POST', body: data });
    }

  async updateProductDetails(id: string, data: { name?: string; description?: string; price?: number; images?: string[] }) {
    return this.request(`/api/v1/products/${id}`, { method: 'PATCH', body: data });
  }

  async publishProduct(id: string) {
    return this.request(`/api/v1/products/${id}/publish`, { method: 'POST' });
  }

  async archiveProduct(id: string) {
    return this.request(`/api/v1/products/${id}/archive`, { method: 'POST' });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/v1/products/${id}`, { method: 'DELETE' });
  }

  // Admin extensions (ADD ONLY)
  async adminListStores() {
    return this.request('/api/v1/admin/stores');
  }

  async adminFreezeStore(storeId: string) {
    return this.request(`/api/v1/admin/stores/${storeId}/freeze`, { method: 'POST' });
  }

  async adminListSocialAccounts() {
    return this.request('/api/v1/admin/social-accounts');
  }

  async adminListSyncLogs(page = 1, limit = 20) {
    return this.request(`/api/v1/admin/sync-logs?page=${page}&limit=${limit}`);
  }

  async adminDisableProduct(productId: string) {
    return this.request(`/api/v1/admin/products/${productId}/disable`, { method: 'POST' });
  }

  async resolveDispute(disputeId: string, data: { resolution: string; winner: 'buyer' | 'seller' }) {
    return this.request(`/api/v1/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: data,
    });
  }

  // Email/Password Auth Methods
  async registerWithEmail(data: { email: string; password: string; name: string; role?: string }) {
    const response = await this.request<{
      user: { id: string; phone?: string; name: string; email: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/register-email', {
      method: 'POST',
      body: data,
      requireAuth: false,
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async loginWithEmail(email: string, password: string) {
    const response = await this.request<{
      user: { id: string; phone?: string; name: string; email: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/login-email', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async adminLogin(email: string, password: string) {
    const response = await this.request<{
      user: { id: string; phone?: string; name: string; email: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email, password },
      requireAuth: false,
    });

    if (response.success && response.data) {
      this.setTokens(response.data.accessToken, response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  // Buyer endpoints
  async getBuyerOrders(params: { status?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return this.request(`/api/v1/buyer/orders?${query.toString()}`);
  }

    async getBuyerOrderDetails(orderId: string) {
      return this.request(`/api/v1/buyer/orders/${orderId}`);
    }

    async trackOrder(orderId: string) {
      return this.request(`/api/v1/buyer/orders/track/${orderId}`, { requireAuth: false });
    }

    async getBuyerWallet() {
    return this.request('/api/v1/buyer/wallet');
  }

  async confirmBuyerDelivery(transactionId: string, deliveryOTP: string) {
    return this.request(`/api/v1/buyer/orders/${transactionId}/confirm-delivery`, {
      method: 'POST',
      body: { transactionId, deliveryOTP },
    });
  }

  async openBuyerDispute(data: { transactionId: string; reason: string; description?: string }) {
    return this.request('/api/v1/buyer/disputes', {
      method: 'POST',
      body: data,
    });
  }

  async getBuyerDisputes() {
    return this.request('/api/v1/buyer/disputes');
  }

  async addBuyerDisputeMessage(disputeId: string, message: string) {
    return this.request(`/api/v1/buyer/disputes/${disputeId}/messages`, {
      method: 'POST',
      body: { disputeId, message },
    });
  }

  async getRecommendedSellers() {
    return this.request('/api/v1/buyer/sellers/recommended');
  }

  async getBuyerActivity(page = 1, limit = 20) {
    return this.request(`/api/v1/buyer/activity?page=${page}&limit=${limit}`);
  }
}

const expressApi = new ApiService();
// Default to Supabase so the app runs without starting the backend (set VITE_USE_SUPABASE=false to use Express)
const useSupabase = import.meta.env.VITE_USE_SUPABASE !== "false";

function createSupabaseBackedApi(express: ApiService): ApiService {
  const stub = {
    ...express,
    createPaymentLink: (data: Parameters<ApiService["createPaymentLink"]>[0]) =>
      supabaseApi.createPaymentLink(data),
    getPaymentLink: (linkId: string) => supabaseApi.getPaymentLink(linkId),
    getMyPaymentLinks: (params?: Parameters<ApiService["getMyPaymentLinks"]>[0]) =>
      supabaseApi.getMyPaymentLinks(params),
    updatePaymentLinkStatus: (linkId: string, status: string) =>
      supabaseApi.updatePaymentLinkStatus(linkId, status),
    getPaystackConfig: () => supabaseApi.getPaystackConfig(),
    initiatePaystackPayment: (data: Parameters<ApiService["initiatePaystackPayment"]>[0]) =>
      supabaseApi.initiatePaystackPayment(data),
    verifyPaystackPayment: (transactionId: string, reference: string) =>
      supabaseApi.verifyPaystackPayment(transactionId, reference),
    request: async <T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> => {
      const purchaseMatch = endpoint.match(/^\/api\/v1\/links\/([^/]+)\/purchase$/);
      if (purchaseMatch && options?.method === "POST" && options?.body) {
        return supabaseApi.purchasePaymentLink(purchaseMatch[1], options.body as any) as Promise<
          ApiResponse<T>
        >;
      }
      const confirmDeliveryMatch = endpoint.match(/^\/api\/v1\/buyer\/orders\/([^/]+)\/confirm-delivery$/);
      if (confirmDeliveryMatch && options?.method === "POST") {
        return supabaseApi.confirmDelivery(confirmDeliveryMatch[1]) as Promise<ApiResponse<T>>;
      }
      const openDisputeMatch = endpoint === "/api/v1/buyer/disputes" && options?.method === "POST" && options?.body;
      if (openDisputeMatch) {
        const body = options.body as { transactionId: string; reason: string };
        return supabaseApi.openDispute(body.transactionId, body.reason) as Promise<ApiResponse<T>>;
      }
      const disputeMessageMatch = endpoint.match(/^\/api\/v1\/buyer\/disputes\/([^/]+)\/messages$/);
      if (disputeMessageMatch && options?.method === "POST" && options?.body) {
        const body = options.body as { disputeId?: string; message: string };
        return supabaseApi.addBuyerDisputeMessage(disputeMessageMatch[1], body.message ?? (body as any).message) as Promise<ApiResponse<T>>;
      }
      const storefrontCheckoutMatch = endpoint.match(/^\/api\/v1\/storefront\/([^/]+)\/products\/([^/]+)\/checkout$/);
      if (storefrontCheckoutMatch && options?.method === "POST" && options?.body) {
        const body = options.body as { buyerName: string; buyerPhone: string; buyerEmail?: string; buyerAddress?: string; paymentMethod?: string };
        const res = await supabaseApi.createStorefrontCheckout(storefrontCheckoutMatch[1], storefrontCheckoutMatch[2], body);
        if (res.success && res.data) {
          return { success: true, data: { transactionId: (res.data as any).id, id: (res.data as any).id } } as ApiResponse<T>;
        }
        return res as ApiResponse<T>;
      }
      if (endpoint.match(/^\/api\/v1\/seller\/profile\/tax/) && options?.method) {
        return Promise.resolve({ success: false, error: "Not available in Supabase mode" } as ApiResponse<T>);
      }
      return express.request<T>(endpoint, options);
    },
    trackOrder: (orderId: string) => supabaseApi.getTransaction(orderId),
    getMyStore: () => supabaseApi.getMyStore(),
    getSellerOrders: (params?: { status?: string; page?: number; limit?: number }) => supabaseApi.getSellerOrders(params),
    getSellerStats: () => supabaseApi.getSellerStats(),
    acceptOrder: (id: string) => supabaseApi.acceptOrder(id),
    rejectOrder: (id: string, reason?: string) => supabaseApi.rejectOrder(id, reason),
    addShippingInfo: (id: string, data: { courierName: string; trackingNumber: string; estimatedDeliveryDate?: string; notes?: string }) => supabaseApi.addShippingInfo(id, data),
    createProduct: (data: { name: string; description?: string; price: number; images?: string[] }) => supabaseApi.createProduct(data),
    listDraftProducts: () => supabaseApi.listDraftProducts(),
    listPublishedProducts: () => supabaseApi.listPublishedProducts(),
    createStore: (data: { name: string; slug: string }) => supabaseApi.createStore(data),
    updateStore: (data: { name?: string; slug?: string; logo?: string; bio?: string; visibility?: "PRIVATE" | "PUBLIC" }) => supabaseApi.updateStore(data),
    updateStoreStatus: (status: "INACTIVE" | "ACTIVE" | "FROZEN") => supabaseApi.updateStoreStatus(status),
    listSocialAccounts: () => supabaseApi.listSocialAccounts(),
    connectSocialPage: (data: { platform: "INSTAGRAM" | "FACEBOOK" | "LINKEDIN"; pageUrl: string; pageId?: string }) => supabaseApi.connectSocialPage(data),
    getWallet: () => supabaseApi.getWallet(),
    getPaymentMethods: () => supabaseApi.getPaymentMethods(),
    addPaymentMethod: (data: { type: string; provider: string; accountNumber: string; accountName: string; isDefault?: boolean }) => supabaseApi.addPaymentMethod(data),
    requestWithdrawal: (amount: number, id: string) => supabaseApi.requestWithdrawal(amount, id),
    getBuyerOrders: (params?: { status?: string; page?: number; limit?: number }) => supabaseApi.getBuyerOrders(params),
    getBuyerWallet: () => supabaseApi.getBuyerWallet(),
    getBuyerDisputes: () => supabaseApi.getBuyerDisputes(),
    confirmDelivery: (id: string) => supabaseApi.confirmDelivery(id),
    openDispute: (id: string, reason: string) => supabaseApi.openDispute(id, reason),
    createTransaction: (data: { itemName: string; amount: number; description?: string; images?: string[] }) => supabaseApi.createTransaction(data),
    getTransaction: (id: string) => supabaseApi.getTransaction(id),
    initiatePayment: (id: string, data: { paymentMethod: string; phone: string; buyerName?: string; buyerEmail?: string }) => supabaseApi.initiatePayment(id, data),
    updateProductDetails: (id: string, data: { name?: string; description?: string; price?: number; images?: string[] }) => supabaseApi.updateProduct(id, data),
    publishProduct: (id: string) => supabaseApi.publishProduct(id),
    archiveProduct: (id: string) => supabaseApi.archiveProduct(id),
    deleteProduct: (id: string) => supabaseApi.deleteProduct(id),
    getAdminDashboard: () => supabaseApi.getAdminDashboard(),
    getAdminTransactions: (params?: { page?: number; limit?: number; status?: string }) => supabaseApi.getAdminTransactions(params),
    getAdminDisputes: (params?: { page?: number; limit?: number; status?: string }) => supabaseApi.getAdminDisputes(params),
    getAdminUsers: (params?: { page?: number; limit?: number }) => supabaseApi.getAdminUsers(params),
    resolveDispute: (id: string, data: { resolution: string; winner: "buyer" | "seller" }) => supabaseApi.resolveDispute(id, data),
    deactivateUser: (id: string) => supabaseApi.deactivateUser(id),
    activateUser: (id: string) => supabaseApi.activateUser(id),
    getStorefront: (slug: string) => supabaseApi.getStorefront(slug),
    getPublicProduct: (storeSlug: string, productId: string) => supabaseApi.getPublicProduct(storeSlug, productId),
    getBuyerOrderDetails: (orderId: string) => supabaseApi.getTransaction(orderId),
    confirmBuyerDelivery: (transactionId: string, _deliveryOTP: string) => supabaseApi.confirmDelivery(transactionId),
    openBuyerDispute: (data: { transactionId: string; reason: string; description?: string }) => supabaseApi.openDispute(data.transactionId, data.reason),
    addBuyerDisputeMessage: (disputeId: string, message: string) => supabaseApi.addBuyerDisputeMessage(disputeId, message),
    // Stubs so UI doesn't hit Express and break (not yet in Supabase Edge Functions)
    triggerStoreRescan: () => Promise.resolve({ success: false, error: "Not available in Supabase mode" }),
    rescanSocialPage: () => Promise.resolve({ success: false, error: "Not available in Supabase mode" }),
    adminListStores: () => Promise.resolve({ success: true, data: [] }),
    adminListSocialAccounts: () => Promise.resolve({ success: true, data: [] }),
    adminListSyncLogs: () => Promise.resolve({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0 } }),
    adminFreezeStore: () => Promise.resolve({ success: false, error: "Not available in Supabase mode" }),
    adminDisableProduct: () => Promise.resolve({ success: false, error: "Not available in Supabase mode" }),
  };
  return stub as unknown as ApiService;
}

export const api = useSupabase ? createSupabaseBackedApi(expressApi) : expressApi;
