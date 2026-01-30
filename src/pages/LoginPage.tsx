import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon, MailIcon, LockIcon, PhoneIcon, AlertCircleIcon } from '@/components/icons';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import { normalizeToE164 } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';

type AuthMode = 'email' | 'otp';
type OtpStep = 'phone' | 'verify';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslations();
  const { loginEmail, login, requestOTP, isLoading: authLoading } = useSupabaseAuth();
  
  const [authMode, setAuthMode] = useState<AuthMode>('email');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');
  
  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP login state
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailVerificationNeeded, setEmailVerificationNeeded] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Check for email confirmation message in URL
  useEffect(() => {
    const confirmed = searchParams.get('confirmed');
    const errorDesc = searchParams.get('error_description');
    
    if (confirmed === 'true') {
      setSuccess('Email verified successfully! You can now sign in.');
    }
    if (errorDesc) {
      setError(decodeURIComponent(errorDesc));
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailVerificationNeeded(false);

    if (!email || !password) {
      setError(t('auth.pleaseEnterEmailPassword'));
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginEmail(email, password);
      if (result.success) {
        handleLoginSuccess();
      } else {
        // Check if the error is about email verification
        if (result.error?.toLowerCase().includes('email not confirmed') || 
            result.error?.toLowerCase().includes('not verified')) {
          setEmailVerificationNeeded(true);
          setError('Please verify your email before signing in. Check your inbox for a verification link.');
        } else {
          setError(result.error || t('auth.invalidCredentials'));
        }
        setIsLoading(false);
      }
    } catch {
      setError(t('auth.loginFailed'));
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setResendingVerification(true);
    setError('');
    
    try {
      const redirectUrl = `${window.location.origin}/login?confirmed=true`;
      
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setSuccess('Verification email sent! Please check your inbox.');
        setEmailVerificationNeeded(false);
      }
    } catch {
      setError('Failed to resend verification email. Please try again.');
    }
    setResendingVerification(false);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone) {
      setError(t('auth.pleaseEnterPhone'));
      return;
    }

    const normalizedPhone = normalizeToE164(phone);
    if (!normalizedPhone) {
      setError('Enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOTP(normalizedPhone, 'LOGIN');
      if (result.success) {
        setSuccess(t('auth.otpSent'));
        setOtpStep('verify');
        // Show OTP in development mode
        if (result.otp) {
          console.log('Development OTP:', result.otp);
          setSuccess(`${t('auth.otpSentDev')} ${result.otp}`);
        }
      } else {
        setError(result.error || t('auth.failedSendOtp'));
      }
    } catch {
      setError(t('auth.failedSendOtpTry'));
    }
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError(t('auth.enter6DigitOtp'));
      return;
    }

    setIsLoading(true);
    try {
      const normalizedPhone = normalizeToE164(phone);
      if (!normalizedPhone) {
        setError('Enter a valid phone number with country code (e.g., +1234567890)');
        setIsLoading(false);
        return;
      }

      const result = await login(normalizedPhone, otpCode);
      if (result.success) {
        handleLoginSuccess();
      } else {
        setError(result.error || t('auth.invalidOtp'));
        setIsLoading(false);
      }
    } catch {
      setError(t('auth.otpVerifyFailed'));
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setTimeout(() => {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const role = (user.role || '').toLowerCase();
      if (role === 'seller') {
        navigate('/seller');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/buyer');
      }
    }, 100);
  };

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
    setOtpStep('phone');
    setEmailVerificationNeeded(false);
  };

  const resetOtpFlow = () => {
    setOtpStep('phone');
    setOtpCode('');
    setError('');
    setSuccess('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#3d1a7a]/30 border-t-[#3d1a7a] rounded-full animate-spin" />
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
          <h1 className="text-5xl font-black mb-6 leading-tight">{t('auth.securePaymentsTitle')} <br /> {t('auth.securePaymentsSubtitle')}</h1>
          <p className="text-xl text-white max-w-md leading-relaxed">
            {t('auth.securePaymentsDesc')}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">{t('auth.welcomeBack')}</h2>
            <p className="text-gray-500">{t('auth.signInToAccount')}</p>
          </div>

          {/* Auth Mode Toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => switchAuthMode('email')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                authMode === 'email'
                  ? 'bg-white text-[#3d1a7a] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth.emailPassword')}
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode('otp')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${
                authMode === 'otp'
                  ? 'bg-white text-[#3d1a7a] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth.phoneOtp')}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <AlertCircleIcon className="flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p>{error}</p>
                {emailVerificationNeeded && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="mt-2 text-[#3d1a7a] font-bold hover:underline flex items-center gap-1"
                  >
                    {resendingVerification ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#3d1a7a]/30 border-t-[#3d1a7a] rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Email Login Form */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-6 animate-in slide-in-from-right">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                    placeholder={t('auth.placeholderEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-gray-700">{t('auth.password')}</label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[#3d1a7a] hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                    placeholder={t('auth.placeholderPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    {t('auth.signIn')} <ArrowRightIcon size={20} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP Login Form */}
          {authMode === 'otp' && (
            <>
              {otpStep === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-6 animate-in slide-in-from-right">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('auth.phoneNumber')}</label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                      <input
                        type="tel"
                        required
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition"
                        placeholder={t('auth.placeholderPhone')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Enter phone with country code: +1 (USA), +44 (UK), +254 (Kenya), +234 (Nigeria), etc.
                    </p>
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
                        {t('auth.sendOtp')} <ArrowRightIcon size={20} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {otpStep === 'verify' && (
                <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in slide-in-from-right">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('auth.verificationCode')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a] focus:ring-4 focus:ring-[#5d2ba3]/10 transition font-mono"
                      placeholder={t('auth.placeholderOtp')}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {t('auth.enterCodeSentTo')} <span className="font-bold">{phone}</span>
                    </p>
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
                        {t('auth.verifySignIn')} <ArrowRightIcon size={20} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={resetOtpFlow}
                      className="text-sm text-[#3d1a7a] hover:underline"
                    >
                      {t('auth.changePhoneNumber')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isLoading}
                      className="text-sm text-[#3d1a7a] hover:underline"
                    >
                      {t('auth.resendOtp')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
          </div>

          <p className="mt-8 text-center text-gray-500">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/signup" className="font-bold text-[#3d1a7a] hover:underline">
              {t('common.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
