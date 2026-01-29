/**
 * Raw Supabase client without strict type checking
 * This is needed because the auto-generated types don't include our custom tables
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cpsudpslcmyusgseurle.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwc3VkcHNsY215dXNnc2V1cmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDk0MjksImV4cCI6MjA4NDU4NTQyOX0.PWwJbhn95RXFIljTCKRiwLGZyzc5YQMD6VnfYzpA_w4";

// Create untyped client for flexibility with our custom schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any, "public", any> = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
