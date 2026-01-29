import { supabase } from "@/lib/supabase";

// Types for database tables
export interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo?: string;
  bio?: string;
  visibility: "PRIVATE" | "PUBLIC";
  status: "INACTIVE" | "ACTIVE" | "FROZEN";
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price?: number;
  images: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  ai_confidence_score?: number;
  extraction_warnings: string[];
  missing_fields: string[];
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  seller_id: string;
  buyer_id?: string;
  item_name: string;
  item_description?: string;
  amount: number;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  courier_name?: string;
  tracking_number?: string;
  estimated_delivery_date?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  created_at: string;
  updated_at: string;
}

// Supabase API client for Lovable Cloud
export const supabaseApi = {
  // Profile methods
  async getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  },

  async updateProfile(updates: Partial<Profile>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);

    return !error;
  },

  // Store methods
  async getMyStore(): Promise<Store | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching store:", error);
      return null;
    }
    return data as Store | null;
  },

  async createStore(name: string, slug: string): Promise<Store | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("stores")
      .insert({ user_id: user.id, name, slug })
      .select()
      .single();

    if (error) {
      console.error("Error creating store:", error);
      return null;
    }
    return data as Store;
  },

  async updateStore(updates: Partial<Store>): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("stores")
      .update(updates)
      .eq("user_id", user.id);

    return !error;
  },

  // Product methods
  async getDraftProducts(): Promise<Product[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!store) return [];

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", store.id)
      .eq("status", "DRAFT")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching drafts:", error);
      return [];
    }
    return (data || []) as Product[];
  },

  async getPublishedProducts(): Promise<Product[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!store) return [];

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("store_id", store.id)
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }
    return (data || []) as Product[];
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id);

    return !error;
  },

  async publishProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("products")
      .update({ status: "PUBLISHED" })
      .eq("id", id);

    return !error;
  },

  async archiveProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("products")
      .update({ status: "ARCHIVED" })
      .eq("id", id);

    return !error;
  },

  // AI generation
  async generateProductWithAI(description: string, imageUrl?: string): Promise<Product | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.functions.invoke("ai-generate-product", {
      body: { description, imageUrl },
    });

    if (error) {
      console.error("AI generation error:", error);
      return null;
    }

    return data?.product as Product | null;
  },

  // Wallet methods
  async getWallet(): Promise<Wallet | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching wallet:", error);
      return null;
    }
    return data as Wallet | null;
  },

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
    return (data || []) as Transaction[];
  },

  async createTransaction(itemName: string, amount: number, description?: string): Promise<Transaction | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        seller_id: user.id,
        item_name: itemName,
        amount,
        item_description: description,
        status: "PENDING",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      return null;
    }
    return data as Transaction;
  },
};
