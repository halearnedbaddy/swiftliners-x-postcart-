import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, MailIcon, LockIcon, ShieldIcon, AlertCircleIcon } from '@/components/icons';
import { z } from 'zod';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin, logout } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Invalid input');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminLogin(formData.email, formData.password);

      if (response.success) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if ((user.role || '').toLowerCase() !== 'admin') {
          setError('Access denied. Admin credentials required.');
          await logout();
          setIsLoading(false);
          return;
        }
        navigate('/admin');
      } else {
        setError(response.error || 'Invalid admin credentials');
      }
    } catch {
      setError('Login failed. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-900">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#250e52]/90 via-gray-900 to-black z-10" />
        <div className="relative z-20 flex flex-col justify-center px-16 text-white h-full">
          <div className="mb-6 inline-flex p-3 bg-white/10 backdrop-blur-md rounded-null-xl border border-white/20 w-fit">
            <ShieldIcon className="text-[#5d2ba3] mr-2" size={24} />
            <span className="font-bold">Admin Portal</span>
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">
            PayLoom <br /> Admin Console
          </h1>
          <p className="text-xl text-gray-300 max-w-md leading-relaxed">
            Secure access for platform administrators only. Unauthorized access attempts are logged and monitored.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="text-center lg:text-left mb-10">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <ShieldIcon className="text-[#5d2ba3]" size={32} />
              <span className="text-2xl font-black text-white">Admin Portal</span>
            </div>
            <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">Admin Login 🔐</h2>
            <p className="text-gray-500">Enter your admin credentials to continue.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-null-xl text-[#4F4A41] text-sm flex items-start gap-3">
              <AlertCircleIcon size={20} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-[#5d2ba3] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                  placeholder="admin@payloom.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3 rounded-null-xl border border-gray-200 focus:outline-none focus:border-[#5d2ba3] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
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
                  Sign In to Admin <ArrowRightIcon size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-400">
              This is a restricted area. All login attempts are monitored and logged for security purposes.
            </p>
          </div>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to User Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
