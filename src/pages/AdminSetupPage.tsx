import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ShieldIcon, ArrowRightIcon, AlertCircleIcon, CheckCircleIcon } from "@/components/icons";

const tokenSchema = z.string().min(10, "Token is required");

export function AdminSetupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const initialToken = useMemo(() => params.get("token") || "", [params]);
  const [token, setToken] = useState(initialToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    setToken(initialToken);
  }, [initialToken]);

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const parsed = tokenSchema.safeParse(token.trim());
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid token");
      return;
    }

    setIsLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setError("Please login first, then open this setup link again.");
        setIsLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("admin-setup", {
        body: { token: token.trim() },
      });

      if (fnError) {
        setError(fnError.message);
        setIsLoading(false);
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Admin setup failed");
        setIsLoading(false);
        return;
      }

      // Refresh user snapshot used by the app (localStorage-based)
      const sessionRes = await supabase.auth.getSession();
      const accessToken = sessionRes.data.session?.access_token;
      if (accessToken) {
        const res = await fetch(
          "https://pxyyncsnjpuwvnwyfdwx.supabase.co/functions/v1/auth-api/profile",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              apikey:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4eXluY3NuanB1d3Zud3lmZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDY5NDMsImV4cCI6MjA4MzU4Mjk0M30.n-tEs1U3qB7E_eov-zVL2g7crlhNOqJ5cF5TcUeV_dI",
              "Content-Type": "application/json",
            },
          }
        );
        const json = await res.json();
        if (json?.success && json?.data?.user) {
          localStorage.setItem("user", JSON.stringify(json.data.user));
        }
      }

      setSuccess("Admin role granted. You can now login via the Admin Login page.");
      setTimeout(() => navigate("/admin/login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-md bg-white rounded-null-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-black/5 rounded-null-xl">
            <ShieldIcon size={22} className="text-[#5d2ba3]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#3d1a7a]">Admin Setup</h1>
            <p className="text-sm text-gray-500">One-time role activation</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-null-xl text-[#4F4A41] text-sm flex items-start gap-3">
            <AlertCircleIcon size={18} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-null-xl text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircleIcon size={18} className="mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleMakeAdmin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Setup Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-[#5d2ba3] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
              placeholder="Paste token from Supabase secrets"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5d2ba3] text-white font-bold py-4 rounded-null-xl hover:bg-[#3d1a7a] transition transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-null-full animate-spin" />
            ) : (
              <>
                Activate Admin <ArrowRightIcon size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to User Login
          </a>
        </div>
      </div>
    </div>
  );
}
