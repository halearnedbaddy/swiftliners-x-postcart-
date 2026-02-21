import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

type PageState = "loading" | "ready" | "success" | "invalid_link";

export default function ResetPassword() {
    const navigate = useNavigate();
    const [pageState, setPageState] = useState<PageState>("loading");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Supabase appends the recovery token as a hash fragment.
        // Listening for PASSWORD_RECOVERY event confirms the link is valid.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setPageState("ready");
            }
        });

        // Fallback: if no event fires within 3s, check for an active session
        // (user may have already landed with a valid session from the link)
        const timeout = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setPageState("ready");
            } else {
                setPageState("invalid_link");
            }
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const validatePassword = (): string | null => {
        if (!password) return "Please enter a new password.";
        if (password.length < 8) return "Password must be at least 8 characters.";
        if (!confirmPassword) return "Please confirm your new password.";
        if (password !== confirmPassword) return "Passwords do not match.";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationError = validatePassword();
        if (validationError) {
            toast({
                title: "Invalid input",
                description: validationError,
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            if (error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")) {
                setPageState("invalid_link");
            } else {
                toast({
                    title: "Failed to update password",
                    description: error.message,
                    variant: "destructive",
                });
            }
        } else {
            setPageState("success");
            toast({ title: "Password updated!", description: "Your password has been changed successfully." });
            setTimeout(() => navigate("/login"), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block">
                        <span className="font-display font-extrabold text-2xl text-white">
                            Pay<span className="text-primary">Chain</span>
                        </span>
                    </Link>
                    <p className="text-white/40 text-sm mt-2">Choose a new password</p>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                    {/* Loading */}
                    {pageState === "loading" && (
                        <div className="text-center py-8 space-y-3">
                            <Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" />
                            <p className="text-white/40 text-sm">Verifying your reset link…</p>
                        </div>
                    )}

                    {/* Invalid / expired link */}
                    {pageState === "invalid_link" && (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7 text-red-400" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg">Link expired or invalid</h2>
                                <p className="text-white/40 text-sm mt-2">
                                    This password reset link has expired or is no longer valid. Please request a new one.
                                </p>
                            </div>
                            <Link to="/forgot-password">
                                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 rounded-lg mt-2">
                                    Request New Link
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Success */}
                    {pageState === "success" && (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ShieldCheck className="w-7 h-7 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-lg">Password updated!</h2>
                                <p className="text-white/40 text-sm mt-2">
                                    Your password has been successfully reset. Redirecting you to sign in…
                                </p>
                            </div>
                            <Link to="/login">
                                <Button variant="outline" className="w-full border-white/10 text-white/70 hover:bg-white/[0.05] h-11 rounded-lg mt-2">
                                    Go to Sign In
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Reset form */}
                    {pageState === "ready" && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <p className="text-white/50 text-sm mb-1">
                                Choose a strong password with at least 8 characters.
                            </p>

                            {/* New Password */}
                            <div>
                                <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-white/[0.05] border-white/10 text-white text-sm rounded-lg h-11 pr-10"
                                        autoComplete="new-password"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {password && password.length < 8 && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                        Password must be at least 8 characters
                                    </p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="bg-white/[0.05] border-white/10 text-white text-sm rounded-lg h-11 pr-10"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-red-400 text-[11px] mt-1">
                                        Passwords do not match
                                    </p>
                                )}
                                {confirmPassword && password === confirmPassword && password.length >= 8 && (
                                    <p className="text-green-400 text-[11px] mt-1">
                                        ✓ Passwords match
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 rounded-lg"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Updating password…
                                    </>
                                ) : (
                                    "Set New Password"
                                )}
                            </Button>
                        </form>
                    )}
                </div>

                <p className="text-center text-sm text-white/40 mt-6">
                    Remember your password?{" "}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
