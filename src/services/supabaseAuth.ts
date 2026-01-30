import { supabase } from "@/integrations/supabase/client";
import { normalizeToE164 } from "@/lib/phone";

const EDGE_FUNCTION_URL = "https://pxyyncsnjpuwvnwyfdwx.supabase.co/functions/v1/auth-api";

interface AuthResponse {
  success: boolean;
  error?: string;
  data?: {
    user: {
      id: string;
      phone?: string;
      name: string;
      email?: string;
      role: "buyer" | "seller" | "admin";
    };
    session?: {
      access_token: string;
      refresh_token: string;
    };
  };
  otp?: string; // Only in development
}

// Request OTP for phone authentication
export async function requestOTP(
  phone: string,
  purpose: "LOGIN" | "REGISTRATION"
): Promise<AuthResponse> {
  try {
    const normalizedPhone = normalizeToE164(phone) ?? phone;
    const response = await fetch(`${EDGE_FUNCTION_URL}/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
      },
      body: JSON.stringify({ phone: normalizedPhone, purpose }),
    });

    return await response.json();
  } catch (error) {
    console.error("Request OTP error:", error);
    return { success: false, error: "Failed to request OTP" };
  }
}

// Register with phone and OTP
export async function registerWithPhone(data: {
  phone: string;
  name: string;
  email?: string;
  role?: string;
  otp: string;
}): Promise<AuthResponse> {
  try {
    const normalizedPhone = normalizeToE164(data.phone) ?? data.phone;
    const response = await fetch(`${EDGE_FUNCTION_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
      },
      body: JSON.stringify({ ...data, phone: normalizedPhone }),
    });

    const result = await response.json();
    
    if (result.success && result.data?.user) {
      localStorage.setItem("user", JSON.stringify(result.data.user));
      const actionLink = (result.data as { actionLink?: string })?.actionLink;
      if (actionLink) {
        window.location.href = actionLink;
        return result;
      }
    }

    return result;
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "Registration failed" };
  }
}

// Login with phone and OTP
export async function loginWithPhone(
  phone: string,
  otp: string
): Promise<AuthResponse> {
  try {
    const normalizedPhone = normalizeToE164(phone) ?? phone;
    const response = await fetch(`${EDGE_FUNCTION_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
      },
      body: JSON.stringify({ phone: normalizedPhone, otp }),
    });

    const result = await response.json();
    
    if (result.success && result.data?.user) {
      localStorage.setItem("user", JSON.stringify(result.data.user));
      // Redirect to magic link so Supabase sets session (needed for create link, etc.)
      const actionLink = (result.data as { actionLink?: string })?.actionLink;
      if (actionLink) {
        window.location.href = actionLink;
        return result;
      }
    }

    return result;
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

// Register with email and password
export async function registerWithEmail(data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  phone?: string;
}): Promise<AuthResponse> {
  try {
    const normalizedPhone = data.phone ? normalizeToE164(data.phone) : null;
    const response = await fetch(`${EDGE_FUNCTION_URL}/register-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
      },
      body: JSON.stringify({
        ...data,
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      }),
    });

    const result = await response.json();
    
    if (result.success && result.data?.user) {
      localStorage.setItem("user", JSON.stringify(result.data.user));
    }

    return result;
  } catch (error) {
    console.error("Register email error:", error);
    return { success: false, error: "Registration failed" };
  }
}

// Login with email and password
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/login-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (result.success && result.data?.user) {
      localStorage.setItem("user", JSON.stringify(result.data.user));
      
      // If session is returned, set it in Supabase client
      if (result.data.session) {
        await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Login email error:", error);
    return { success: false, error: "Login failed" };
  }
}

// Logout
export async function logout(): Promise<void> {
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  await supabase.auth.signOut();
}

// Get current user from localStorage
export function getCurrentUser() {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}
