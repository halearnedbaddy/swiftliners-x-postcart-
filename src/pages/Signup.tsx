import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Contains a number", valid: /\d/.test(password) },
    { label: "Contains uppercase", valid: /[A-Z]/.test(password) },
  ];

  const isPasswordValid = passwordChecks.every((c) => c.valid);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !businessName) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!isPasswordValid) {
      toast({ title: "Error", description: "Password does not meet requirements", variant: "destructive" });
      return;
    }
    if (!agreed) {
      toast({ title: "Error", description: "Please agree to the Terms of Service", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_name: businessName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="font-display font-extrabold text-2xl text-white">
              Pay<span className="text-primary">Chain</span>
            </span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Create your business account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Business Name</Label>
            <Input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Corp Ltd"
              className="bg-white/[0.05] border-white/10 text-white text-sm rounded-lg h-11"
            />
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
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
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Password requirements */}
            <div className="mt-2 space-y-1">
              {passwordChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${check.valid ? "bg-primary" : "bg-white/10"}`}>
                    {check.valid && <Check className="w-2 h-2 text-white" />}
                  </div>
                  <span className={`text-[11px] ${check.valid ? "text-primary" : "text-white/30"}`}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms checkbox */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 accent-primary rounded"
            />
            <span className="text-[11px] text-white/40 leading-relaxed">
              I agree to the{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading || !isPasswordValid || !agreed}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 rounded-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          {/* Benefits */}
          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/30 font-semibold uppercase tracking-wider mb-2">
              What you get:
            </p>
            <ul className="space-y-1.5">
              {[
                "Instant sandbox API access",
                "M-Pesa, Airtel & Card collections",
                "Built-in escrow & split payouts",
                "Real-time webhooks",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[11px] text-white/50">
                  <span className="text-primary">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </form>

        {/* Sign in link */}
        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
