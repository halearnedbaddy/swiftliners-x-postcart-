import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ArrowRightIcon, BuyerIcon, ShoppingBagIcon, MailIcon, LockIcon, ArrowLeftIcon, PhoneIcon } from '@/components/icons';
import { z } from 'zod';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import { isValidE164, normalizeToE164 } from '@/lib/phone';

export function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { registerEmail, isLoading: authLoading } = useSupabaseAuth();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<'buyer' | 'seller' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const emailSchema = z.object({
    email: z.string().email(t('signup.validEmail')),
    password: z.string().min(8, t('signup.passwordMinLength')),
    confirmPassword: z.string(),
    phone: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((val) => !val || isValidE164(val), { message: 'Enter a valid phone number with country code (e.g., +1234567890)' }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('signup.passwordsDontMatch'),
    path: ['confirmPassword'],
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const handleRoleSelect = (selectedRole: 'buyer' | 'seller') => {
    setRole(selectedRole);
    setStep('details');
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = emailSchema.safeParse({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      phone: formData.phone || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || t('auth.invalidCredentials'));
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      setError(t('signup.pleaseEnterFullName'));
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = formData.phone ? normalizeToE164(formData.phone) : null;

      const response = await registerEmail({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        role: role === 'seller' ? 'seller' : 'buyer',
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      });

      if (response.success) {
        setTimeout(() => {
          navigate(role === 'seller' ? '/seller' : '/buyer');
        }, 200);
      } else {
        // Log the raw error for debugging (avoid logging sensitive values)
        console.error('Signup failed:', response.error);
        setError(response.error || t('signup.registrationFailed'));
      }
    } catch {
      setError(t('signup.registrationFailedTry'));
    }

    setIsLoading(false);
  };

  const goBack = () => {
    if (step === 'details') {
      setStep('role');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#254E58]/30 border-t-[#254E58] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image */}
      <div className="hidden lg:flex w-1/2 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-black/10 z-10" />
        <img
          src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=2000"
          alt="Growth"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-20 flex flex-col justify-center px-16 text-white h-full">
          <div className="mb-6 inline-flex p-3 bg-[#254E58]/30 backdrop-blur-md rounded-xl border border-[#5d2ba3]/30 w-fit">
            <CheckCircleIcon className="text-[#5d2ba3] mr-2" size={20} />
            <span className="font-bold">{t('signup.trustedBy')}</span>
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">{t('signup.startJourney')} <br /> {t('signup.startJourneyLine2')}</h1>
          <p className="text-xl text-white max-w-md leading-relaxed">
            {t('signup.startJourneyDesc')}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-black text-[#3d1a7a] mb-2">{t('signup.createAccount')}</h2>
            <p className="text-gray-500">{t('signup.joinPayloom')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-xl text-[#4F4A41] text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Role Selection */}
          {step === 'role' && (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <p className="text-lg font-bold text-[#3d1a7a] mb-4">{t('signup.iWantTo')}</p>

              <button
                onClick={() => handleRoleSelect('buyer')}
                className="w-full p-6 rounded-xl border-2 border-[#5d2ba3]/30 hover:border-[#254E58] hover:bg-[#5d2ba3]/10 transition text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#5d2ba3]/20 text-[#254E58] rounded-full flex items-center justify-center group-hover:scale-110 transition">
                    <ShoppingBagIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#3d1a7a] group-hover:text-[#250e52]">{t('signup.buySafely')}</h3>
                    <p className="text-sm text-[#6E6658]">{t('signup.buySafelyDesc')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('seller')}
                className="w-full p-6 rounded-xl border-2 border-[#5d2ba3]/30 hover:border-[#254E58] hover:bg-[#5d2ba3]/10 transition text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#5d2ba3]/20 text-[#254E58] rounded-full flex items-center justify-center group-hover:scale-110 transition">
                    <BuyerIcon size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#3d1a7a] group-hover:text-[#250e52]">{t('signup.sellSecurely')}</h3>
                    <p className="text-sm text-[#6E6658]">{t('signup.sellSecurelyDesc')}</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Details Form */}
          {step === 'details' && (
            <form onSubmit={handleEmailRegister} className="space-y-5 animate-in slide-in-from-right duration-300">
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#5d2ba3]/20 text-[#3d1a7a]">
                  {role === 'buyer' ? t('signup.buyerAccount') : t('signup.sellerAccount')}
                </span>
                <button type="button" onClick={goBack} className="text-xs text-[#6E6658] hover:underline flex items-center gap-1">
                  <ArrowLeftIcon size={12} /> {t('common.back')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('signup.firstName')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#254E58] transition"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('signup.lastName')}</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#5d2ba3]/30 focus:outline-none focus:border-[#254E58] transition"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('auth.emailAddress')}</label>
                <div className="relative">
                  <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition"
                    placeholder={t('auth.placeholderEmail')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {t('auth.phoneNumber')} <span className="text-gray-400 font-normal">{t('signup.phoneOptional')}</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="tel"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition"
                    placeholder={t('auth.placeholderPhone')}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Optional. Add phone with country code (+1, +44, +254, +234, etc.) for OTP login.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('auth.password')}</label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition"
                    placeholder={t('signup.passwordPlaceholder')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('signup.confirmPassword')}</label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6658]" size={20} />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black transition"
                    placeholder={t('signup.confirmPasswordPlaceholder')}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                    {t('signup.createAccountButton')} <ArrowRightIcon size={20} />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('signup.agreeTerms')}{' '}
                <a href="/legal" className="text-[#254E58] hover:underline">{t('signup.termsOfService')}</a>
                {' '}{t('signup.and')}{' '}
                <a href="/legal" className="text-[#254E58] hover:underline">{t('signup.privacyPolicy')}</a>.
              </p>
            </form>
          )}

          <p className="mt-8 text-center text-gray-500">
            {t('signup.alreadyHaveAccount')}{' '}
            <a href="/login" className="font-bold text-[#3d1a7a] hover:underline">
              {t('auth.signIn')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}