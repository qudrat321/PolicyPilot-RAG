import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+92', name: 'Pakistan', flag: '🇵🇰', iso: 'PK' },
  { code: '+93', name: 'Afghanistan', flag: '🇦🇫', iso: 'AF' },
  { code: '+355', name: 'Albania', flag: '🇦🇱', iso: 'AL' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿', iso: 'DZ' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷', iso: 'AR' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', iso: 'AU' },
  { code: '+43', name: 'Austria', flag: '🇦🇹', iso: 'AT' },
  { code: '+994', name: 'Azerbaijan', flag: '🇦🇿', iso: 'AZ' },
  { code: '+973', name: 'Bahrain', flag: '🇧🇭', iso: 'BH' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩', iso: 'BD' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪', iso: 'BE' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', iso: 'BR' },
  { code: '+1', name: 'Canada', flag: '🇨🇦', iso: 'CA' },
  { code: '+86', name: 'China', flag: '🇨🇳', iso: 'CN' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴', iso: 'CO' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰', iso: 'DK' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬', iso: 'EG' },
  { code: '+358', name: 'Finland', flag: '🇫🇮', iso: 'FI' },
  { code: '+33', name: 'France', flag: '🇫🇷', iso: 'FR' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', iso: 'DE' },
  { code: '+30', name: 'Greece', flag: '🇬🇷', iso: 'GR' },
  { code: '+852', name: 'Hong Kong', flag: '🇭🇰', iso: 'HK' },
  { code: '+91', name: 'India', flag: '🇮🇳', iso: 'IN' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩', iso: 'ID' },
  { code: '+98', name: 'Iran', flag: '🇮🇷', iso: 'IR' },
  { code: '+964', name: 'Iraq', flag: '🇮🇶', iso: 'IQ' },
  { code: '+353', name: 'Ireland', flag: '🇮🇪', iso: 'IE' },
  { code: '+39', name: 'Italy', flag: '🇮🇹', iso: 'IT' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', iso: 'JP' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴', iso: 'JO' },
  { code: '+7', name: 'Kazakhstan', flag: '🇰🇿', iso: 'KZ' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪', iso: 'KE' },
  { code: '+965', name: 'Kuwait', flag: '🇰🇼', iso: 'KW' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧', iso: 'LB' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾', iso: 'MY' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', iso: 'MX' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦', iso: 'MA' },
  { code: '+977', name: 'Nepal', flag: '🇳🇵', iso: 'NP' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱', iso: 'NL' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿', iso: 'NZ' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬', iso: 'NG' },
  { code: '+47', name: 'Norway', flag: '🇳🇴', iso: 'NO' },
  { code: '+968', name: 'Oman', flag: '🇴🇲', iso: 'OM' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭', iso: 'PH' },
  { code: '+48', name: 'Poland', flag: '🇵🇱', iso: 'PL' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹', iso: 'PT' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦', iso: 'QA' },
  { code: '+40', name: 'Romania', flag: '🇷🇴', iso: 'RO' },
  { code: '+7', name: 'Russia', flag: '🇷🇺', iso: 'RU' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', iso: 'SA' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', iso: 'SG' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦', iso: 'ZA' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷', iso: 'KR' },
  { code: '+34', name: 'Spain', flag: '🇪🇸', iso: 'ES' },
  { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', iso: 'LK' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪', iso: 'SE' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭', iso: 'CH' },
  { code: '+886', name: 'Taiwan', flag: '🇹🇼', iso: 'TW' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭', iso: 'TH' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷', iso: 'TR' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦', iso: 'UA' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪', iso: 'AE' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', iso: 'GB' },
  { code: '+1', name: 'United States', flag: '🇺🇸', iso: 'US' },
  { code: '+998', name: 'Uzbekistan', flag: '🇺🇿', iso: 'UZ' },
  { code: '+84', name: 'Vietnam', flag: '🇻🇳', iso: 'VN' },
  { code: '+967', name: 'Yemen', flag: '🇾🇪', iso: 'YE' }
];
import {
  signInUser,
  signUpUser,
  signInWithGoogleOAuth,
  sendPasswordResetEmail,
  updateUserPassword,
  resendVerificationEmail
} from '../supabaseClient';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  theme = 'dark'
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+92'); // Default Pakistan (+92)
  const [contactNumber, setContactNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showResendOption, setShowResendOption] = useState(false);
  const [resending, setResending] = useState(false);

  // Keep mode in sync when initialMode changes upon opening
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowResendOption(false);
    }
  }, [isOpen, initialMode]);

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setResending(true);
    try {
      const { error } = await resendVerificationEmail(email.trim());
      if (error) {
        setErrorMsg(error.message);
      } else {
        setShowResendOption(false);
        setErrorMsg('');
        setSuccessMsg('Verification email sent! Please check your inbox and spam folder.');
      }
    } catch (err) {
      setErrorMsg('Failed to send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !password) {
          setErrorMsg('Please enter an email and password.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your confirmation password.');
          setLoading(false);
          return;
        }

        const formattedPhone = contactNumber.trim() ? `${countryCode} ${contactNumber.trim()}` : '';

        const { data, error } = await signUpUser(
          email.trim(),
          password,
          fullName.trim(),
          formattedPhone
        );

        if (error) {
          setErrorMsg(error.message);
        } else if (data?.user && !data?.session) {
          // Supabase has 'Confirm email' enabled by default
          setSuccessMsg('Account registered! Please verify your email to login.');
          setShowResendOption(true);
          setTimeout(() => {
            setMode('login');
          }, 2500);
        } else {
          setSuccessMsg('Account created successfully! Entering workspace...');
          setTimeout(() => {
            onAuthSuccess(data?.user);
            onClose();
          }, 1000);
        }
      } else if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMsg('Please enter both email and password.');
          setLoading(false);
          return;
        }

        const { data, error } = await signInUser(email.trim(), password);
        if (error) {
          const rawMsg = (error.message || '').trim();
          const lowerMsg = rawMsg.toLowerCase();
          if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('email not confirmed')) {
            setErrorMsg('Please verify your email to login.');
            setShowResendOption(true);
          } else {
            setErrorMsg(rawMsg);
            setShowResendOption(false);
          }
        } else {
          setSuccessMsg('Signed in successfully! Entering workspace...');
          setTimeout(() => {
            onAuthSuccess(data?.user);
            onClose();
          }, 700);
        }
      } else if (mode === 'forgot_password') {
        if (!email.trim()) {
          setErrorMsg('Please enter your registered email address.');
          setLoading(false);
          return;
        }

        const { error } = await sendPasswordResetEmail(email.trim());
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg(
            'Password reset link dispatched! Please check your email inbox and spam folder.'
          );
        }
      } else if (mode === 'update_password') {
        if (!password) {
          setErrorMsg('Please enter a new password.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your confirmation password.');
          setLoading(false);
          return;
        }

        const { data, error } = await updateUserPassword(password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Password updated successfully! Welcome back to PolicyPilot.');
          setTimeout(() => {
            onAuthSuccess(data?.user);
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogleOAuth();
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else if (data?.user) {
        onAuthSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setErrorMsg('Google authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Container: constrained with max-h and internal scrolling so it NEVER exceeds the screen border */}
      <div
        className={`relative w-full ${
          mode === 'register' ? 'max-w-lg' : 'max-w-md'
        } max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-[#0f172a] border-slate-700/90 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Accent Gradient Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors z-10 ${
            theme === 'dark'
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium mb-2 border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Enterprise Grounded Identity</span>
            </div>

            {mode === 'login' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Welcome Back</h2>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sign in to query corporate policies with verified citations.
                </p>
              </>
            )}

            {mode === 'register' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Create Enterprise Account</h2>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Register to access multi-tenant isolated policy workspace.
                </p>
              </>
            )}

            {mode === 'forgot_password' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Reset Password</h2>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your registered email and we'll dispatch a secure reset link.
                </p>
              </>
            )}

            {mode === 'update_password' && (
              <>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Set New Password</h2>
                <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your new secure password to restore access to your account.
                </p>
              </>
            )}
          </div>

          {/* Mode Switcher Tabs (Login / Register) */}
          {mode !== 'forgot_password' && mode !== 'update_password' && (
            <div
              className={`flex rounded-xl p-1 mb-4 border ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                  setSuccessMsg('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Alert Banners */}
          {errorMsg && (
            <div className="mb-3.5 p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1 leading-snug">
                <div>{errorMsg}</div>
                {showResendOption && email.trim() && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer disabled:opacity-50"
                  >
                    {resending ? 'Sending verification email...' : 'Send verification email again'}
                  </button>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-3.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1 leading-snug">
                <div>{successMsg}</div>
                {showResendOption && email.trim() && mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="mt-1.5 inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer disabled:opacity-50"
                  >
                    {resending ? 'Sending verification email...' : 'Send verification email again'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* REGISTER FIELDS (2-Column Grid on desktop for clean compact layout) */}
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Full Name <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Qudrat Ullah"
                      className={`w-full pl-10 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Contact Number with Country Code Dropdown (Default: Pakistan +92) */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Contact Number
                  </label>
                  <div className="flex gap-1.5 items-center">
                    {/* Country Code Select */}
                    <div className="relative w-[112px] shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className={`w-full py-2 pl-2 pr-6 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors cursor-pointer appearance-none truncate font-medium ${
                          theme === 'dark'
                            ? 'bg-slate-900/90 border-slate-700 text-slate-100'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                        title="Select Country Calling Code"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option
                            key={`${c.iso}-${c.code}`}
                            value={c.code}
                            className={theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}
                          >
                            {c.flag} {c.code} ({c.name})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Rest of Phone Number Input */}
                    <div className="relative flex-1 flex items-center">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value.replace(/[^0-9\s-]/g, ''))}
                        placeholder={countryCode === '+92' ? '300 1234567' : '123 4567890'}
                        className={`w-full pl-8 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                          theme === 'dark'
                            ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EMAIL (Full width in login, register, and forgot_password modes) */}
            {mode !== 'update_password' && (
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address <span className="text-emerald-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@organization.com"
                    className={`w-full pl-10 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* UPDATE PASSWORD FIELDS */}
            {mode === 'update_password' && (
              <div className="space-y-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    New Password <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'View password'}
                      aria-label={showPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Confirm New Password <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'View password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PASSWORD SECTION (Login mode) */}
            {mode === 'login' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-[11px] font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password <span className="text-emerald-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'View password'}
                    aria-label={showPassword ? 'Hide password' : 'View password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* PASSWORD + CONFIRM PASSWORD IN REGISTER (2-Column Grid) */}
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Password <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'View password'}
                      aria-label={showPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Confirm Password <span className="text-emerald-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-700 text-slate-100 placeholder-slate-500'
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'View password'}
                      aria-label={showConfirmPassword ? 'Hide password' : 'View password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'login' ? (
                <span>Sign In to PolicyPilot</span>
              ) : mode === 'register' ? (
                <span>Create Enterprise Account</span>
              ) : mode === 'update_password' ? (
                <span>Update Password & Continue</span>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </button>
          </form>

          {/* FORGOT PASSWORD: Back to Sign In */}
          {(mode === 'forgot_password' || mode === 'update_password') && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  theme === 'dark' ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}

          {/* GOOGLE SIGN IN (for login and register) */}
          {mode !== 'forgot_password' && mode !== 'update_password' && (
            <>
              {/* Divider */}
              <div className="relative flex items-center justify-center my-3.5">
                <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`} />
                <span
                  className={`absolute px-2 text-[10px] uppercase font-mono tracking-wider ${
                    theme === 'dark' ? 'bg-[#0f172a] text-slate-500' : 'bg-white text-slate-400'
                  }`}
                >
                  Or continue with
                </span>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2.5 py-2 px-4 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-750 text-slate-200 hover:border-slate-600'
                    : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:border-slate-400'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Mode switch footer */}
              <div className="mt-3 text-center">
                {mode === 'login' ? (
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                    >
                      Register now
                    </button>
                  </p>
                ) : (
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Security Footnote */}
          <p className={`text-[10px] text-center mt-3 pt-2.5 border-t ${
            theme === 'dark' ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
          }`}>
            Zero-Hallucination Vector Architecture &bull; Supabase RLS Protected
          </p>
        </div>
      </div>
    </div>
  );
}
