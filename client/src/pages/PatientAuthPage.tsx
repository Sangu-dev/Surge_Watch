import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export const PatientAuthPage: FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot / Reset password state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [tokenReceived, setTokenReceived] = useState<string | null>(null);

  const { loginPatient, registerPatient, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'REGISTER') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }

        const res = await registerPatient(name, email, password, phone);
        if (!res.success) {
          setError(res.error || 'Failed to create patient account.');
          setLoading(false);
          return;
        }
      } else {
        const res = await loginPatient(email, password);
        if (!res.success) {
          setError(res.error || 'Invalid email or password.');
          setLoading(false);
          return;
        }
      }
      navigate('/search');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      if (res.success) {
        setSuccessMsg(res.message || 'Password reset instructions have been generated.');
        if (res.resetToken) {
          setTokenReceived(res.resetToken);
          setResetToken(res.resetToken);
        }
      } else {
        setError(res.error || 'Failed to initiate password reset.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(resetToken, newPassword);
      if (res.success) {
        setSuccessMsg('Password successfully changed! You may now sign in.');
        setMode('LOGIN');
        setPassword('');
        setResetToken('');
        setNewPassword('');
        setTokenReceived(null);
      } else {
        setError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Navigation Back Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600" />
          <span>Back to Emergency Discovery</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-sky-400 mx-auto flex items-center justify-center font-bold shadow-md">
            SW
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'REGISTER'
              ? 'Create Patient Account'
              : mode === 'FORGOT_PASSWORD'
              ? 'Recover Patient Account'
              : 'Patient Sign In'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'REGISTER'
              ? 'Save frequent routes and emergency hospital contacts'
              : mode === 'FORGOT_PASSWORD'
              ? 'Reset your password using a one-time verification token'
              : 'Sign in to access saved hospitals and preferred emergency routes'}
          </p>
        </div>

        {/* Guest Discovery Notice */}
        <div className="mt-6 bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Zero Registration Barrier:</strong> You do NOT need an account to find nearby hospitals during an emergency.{' '}
            <Link to="/search" className="text-sky-700 underline font-bold">
              Open Hospital Discovery now &rarr;
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="mt-4 bg-white py-8 px-6 sm:px-8 border border-slate-200/90 rounded-2xl shadow-sm space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tokenReceived && (
            <div className="p-3 bg-slate-50 border border-amber-300 rounded-xl text-xs space-y-1">
              <span className="font-bold text-amber-800 block">Your One-Time Reset Token:</span>
              <code className="block p-2 bg-slate-100 rounded font-mono text-[11px] text-slate-800 break-all select-all">
                {tokenReceived}
              </code>
              <span className="text-[10px] text-slate-500 block">
                Token prefilled below. Enter your new password to complete the reset.
              </span>
            </div>
          )}

          {mode === 'FORGOT_PASSWORD' ? (
            <div className="space-y-4">
              {!tokenReceived ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Instructions...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Generate Reset Token</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="64-character token"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:border-sky-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm New Password</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('LOGIN');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-sky-700 hover:underline font-semibold cursor-pointer"
                >
                  Return to Patient Sign In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arun Varma"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                  />
                </div>
              </div>

              {mode === 'REGISTER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password {mode === 'REGISTER' && '(min 8 characters)'}
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT_PASSWORD');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-sky-700 hover:underline font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={mode === 'REGISTER' ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:border-sky-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'REGISTER' ? 'Complete Registration' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'REGISTER' ? 'LOGIN' : 'REGISTER');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-sky-700 hover:underline font-semibold cursor-pointer"
                >
                  {mode === 'REGISTER'
                    ? 'Already have an account? Sign In here'
                    : "Don't have an account? Create one now"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Benefits list */}
        <div className="mt-6 bg-slate-100/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <span className="font-bold text-slate-800 block">Registered Patient Privileges:</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bookmark emergency trauma centres near your residence or office</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>View historical transit duration benchmarks across Bengaluru</span>
          </div>
        </div>
      </div>
    </div>
  );
};
