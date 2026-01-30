import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, MailIcon, ArrowRightIcon, CheckCircleIcon } from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/login`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Failed to send reset email. Please try again.');
    }
    setIsLoading(false);
  };

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
            Reset Your <br /> Password
          </h1>
          <p className="text-xl text-white max-w-md leading-relaxed">
            Don't worry, it happens to the best of us. Enter your email and we'll send you instructions to reset your password.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#3d1a7a] mb-8 transition"
          >
            <ArrowLeftIcon size={20} />
            Back to login
          </Link>

          {success ? (
            <div className="text-center animate-in fade-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-black text-[#3d1a7a] mb-4">Check Your Email</h2>
              <p className="text-gray-500 mb-6">
                We've sent password reset instructions to <strong>{email}</strong>. 
                Please check your inbox and follow the link to reset your password.
              </p>
              <p className="text-sm text-gray-400 mb-8">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
                >
                  Try Another Email
                </button>
                <Link
                  to="/login"
                  className="w-full bg-[#3d1a7a] text-white font-bold py-3 rounded-xl hover:bg-[#250e52] transition text-center"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">Forgot Password?</h2>
                <p className="text-gray-500">
                  Enter your email address and we'll send you a link to reset your password.
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
                    Email Address
                  </label>
                  <div className="relative">
                    <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                    <input
                      type="email"
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      Send Reset Link <ArrowRightIcon size={20} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-gray-500">
                Remember your password?{' '}
                <Link to="/login" className="font-bold text-[#3d1a7a] hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
