import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      toast({ title: "Login failed", description: authError.message, variant: "destructive" });
      return;
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      // Sign out non-admin user
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Access Denied",
        description: "This account does not have admin privileges.",
        variant: "destructive",
      });
      return;
    }

    setLoading(false);
    toast({ title: "Welcome, Admin!" });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/20 mb-4">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <Link to="/" className="block">
            <span className="font-display font-extrabold text-2xl text-white">
              Pay<span className="text-primary">Chain</span>
              <span className="text-red-400 text-sm ml-1.5">Admin</span>
            </span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Sign in to the admin panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white/[0.03] border border-red-500/10 rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Admin Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="bg-white/[0.05] border-white/10 text-white text-sm rounded-lg h-11"
              autoComplete="email"
            />
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white/[0.05] border-white/10 text-white text-sm rounded-lg h-11 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold h-11 rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            {loading ? "Verifying..." : "Sign In as Admin"}
          </Button>
        </form>

        {/* Regular login link */}
        <p className="text-center text-sm text-white/40 mt-6">
          Not an admin?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Regular sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
