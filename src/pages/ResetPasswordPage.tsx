import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockIcon, ArrowRightIcon, CheckCircleIcon } from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // Set the session from the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (!error) {
          setIsValidSession(true);
        }
      } else if (session) {
        setIsValidSession(true);
      }
      
      setCheckingSession(false);
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch {
      setError('Failed to reset password. Please try again.');
    }
    setIsLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#3d1a7a]/30 border-t-[#3d1a7a] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-4">Invalid or Expired Link</h2>
          <p className="text-gray-500 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <a
            href="/forgot-password"
            className="inline-block w-full bg-[#3d1a7a] text-white font-bold py-3 rounded-xl hover:bg-[#250e52] transition"
          >
            Request New Link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:flex w-1/2 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/5 z-10" />
        <img
          src="https://images.pexels.com/photos/16143879/pexels-photo-16143879.jpeg"
          alt="Secure Payment"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col justify-center px-16 text-white h-full">
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Create New <br /> Password
          </h1>
          <p className="text-xl text-white max-w-md leading-relaxed">
            Choose a strong password that you haven't used before. Make it at least 8 characters long.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {success ? (
            <div className="text-center animate-in fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-black text-[#3d1a7a] mb-4">Password Updated!</h2>
              <p className="text-gray-500 mb-6">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <p className="text-sm text-gray-400">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">Reset Password</h2>
                <p className="text-gray-500">
                  Enter your new password below.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#3d1a7a] text-white font-bold py-4 rounded-xl hover:bg-[#250e52] transition transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Reset Password <ArrowRightIcon size={20} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
