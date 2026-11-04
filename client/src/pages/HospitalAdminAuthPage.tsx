import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import surgeWatchLogo from '../assets/Surge_watch.png';
import {
  Lock,
  Mail,
  Building,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const HospitalAdminAuthPage: FC = () => {
  const [tab, setTab] = useState<'LOGIN' | 'REQUEST_ACCESS' | 'PLATFORM_LOGIN' | 'RESET_PASSWORD'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Request Access form state
  const [hospName, setHospName] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [area, setArea] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantDesignation, setApplicantDesignation] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDetails, setSubmittedDetails] = useState<{
    hospitalName: string;
    regNumber: string;
    area: string;
    officialEmail: string;
  } | null>(null);

  // Password Reset / Activation state
  const [resetSubTab, setResetSubTab] = useState<'REQUEST' | 'REDEEM'>('REQUEST');
  const [tokenPurpose, setTokenPurpose] = useState<'HOSPITAL_INVITATION' | 'PASSWORD_RESET'>('HOSPITAL_INVITATION');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [generatedTokenPreview, setGeneratedTokenPreview] = useState<string | null>(null);

  const { loginAdmin, submitHospitalAccessRequest, forgotPassword, resetPassword, activateHospitalAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setLoginError(res.error || 'Failed to authenticate administrator account.');
        setIsLoggingIn(false);
        return;
      }

      if (res.user?.role === 'PLATFORM_ADMIN' || res.user?.role === 'MASTER_ADMIN') {
        navigate('/platform/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const res = await submitHospitalAccessRequest({
        hospitalName: hospName.trim(),
        hospitalAddress: hospAddress.trim(),
        area: area.trim(),
        officialEmail: officialEmail.trim(),
        emergencyPhone: emergencyPhone.trim(),
        regNumber: regNumber.trim(),
        applicantName: applicantName.trim(),
        applicantDesignation: applicantDesignation.trim(),
      });

      if (!res.success) {
        setRequestError(res.error || 'Failed to submit hospital registration request.');
        setIsSubmitting(false);
        return;
      }

      setSubmittedDetails({
        hospitalName: hospName.trim(),
        regNumber: regNumber.trim(),
        area: area.trim(),
        officialEmail: officialEmail.trim(),
      });
      setRequestSubmitted(true);
    } catch (err: any) {
      setRequestError(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setGeneratedTokenPreview(null);
    setIsResetting(true);

    try {
      const res = await forgotPassword(resetEmail);
      if (res.success) {
        setResetStatus({
          type: 'success',
          message: res.message || 'Password reset instructions have been generated.',
        });
        if (res.resetToken) {
          setGeneratedTokenPreview(res.resetToken);
          setResetToken(res.resetToken);
        }
      } else {
        setResetStatus({ type: 'error', message: res.error || 'Failed to process request.' });
      }
    } catch (err: any) {
      setResetStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleRedeemResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetStatus(null);

    if (newPassword.length < 8) {
      setResetStatus({ type: 'error', message: 'Password must be at least 8 characters in length.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsResetting(true);
    try {
      const res =
        tokenPurpose === 'HOSPITAL_INVITATION'
          ? await activateHospitalAdmin(resetToken, newPassword)
          : await resetPassword(resetToken, newPassword);

      if (res.success) {
        setResetStatus({
          type: 'success',
          message:
            tokenPurpose === 'HOSPITAL_INVITATION'
              ? 'Hospital administrator account successfully activated! You can now sign in.'
              : 'Password successfully updated! You can now sign in with your new password.',
        });
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setGeneratedTokenPreview(null);
      } else {
        setResetStatus({ type: 'error', message: res.error || 'Failed to redeem token.' });
      }
    } catch (err: any) {
      setResetStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsResetting(false);
    }
  };

  const resetRequestForm = () => {
    setHospName('');
    setHospAddress('');
    setArea('');
    setOfficialEmail('');
    setEmergencyPhone('');
    setRegNumber('');
    setApplicantName('');
    setApplicantDesignation('');
    setRequestError(null);
    setRequestSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Back Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-sky-400" />
          <span>Back to SurgeWatch Discovery</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Brand Banner */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden mx-auto flex items-center justify-center p-1 shadow-md">
            <img src={surgeWatchLogo} alt="SurgeWatch Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SurgeWatch Healthcare Portal
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Authorized portal for hospital administrators, emergency triage leads, and platform verifiers across Bengaluru.
          </p>
        </div>

        {/* Tab Header */}
        <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap text-xs font-bold text-slate-400 mb-6 gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setLoginError(null);
            }}
            className={`flex-1 min-w-[120px] py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'LOGIN' ? 'bg-slate-800 text-white shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Hospital Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REQUEST_ACCESS');
              setLoginError(null);
            }}
            className={`flex-1 min-w-[130px] py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'REQUEST_ACCESS' ? 'bg-slate-800 text-white shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Register / KPME
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('PLATFORM_LOGIN');
              setLoginError(null);
            }}
            className={`flex-1 min-w-[120px] py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'PLATFORM_LOGIN' ? 'bg-slate-800 text-sky-400 shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Platform Super Admin
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('RESET_PASSWORD');
              setResetStatus(null);
            }}
            className={`flex-1 min-w-[110px] py-2.5 rounded-xl transition-all cursor-pointer text-center ${
              tab === 'RESET_PASSWORD' ? 'bg-slate-800 text-amber-400 shadow-xs' : 'hover:text-slate-200'
            }`}
          >
            Activate / Reset
          </button>
        </div>

        {/* Tab 1: Hospital Admin Login */}
        {tab === 'LOGIN' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Authorized Hospital Administrator Login</h3>
              <p className="text-xs text-slate-400 mt-1">
                Access is restricted to medical personnel authorized to update live bed and staff availability.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Official Hospital Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@victoria.gov.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('RESET_PASSWORD');
                      setResetEmail(email);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Hospital Resource Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800 text-center">
              <span className="text-xs text-slate-400">
                Received an invitation or activation token?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setTab('RESET_PASSWORD');
                    setResetSubTab('REDEEM');
                  }}
                  className="text-sky-400 hover:underline font-bold cursor-pointer"
                >
                  Activate Account Here
                </button>
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Hospital Access Request Form */}
        {tab === 'REQUEST_ACCESS' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Hospital Registration & Access Request</h3>
              <p className="text-xs text-slate-400 mt-1">
                Hospital administrators must verify their institutional license under KPME (Karnataka Private Medical Establishments) or Government Medical Directorates before receiving update privileges.
              </p>
            </div>

            {requestError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{requestError}</span>
              </div>
            )}

            {requestSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Registration Request Submitted</h4>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 border border-amber-600 text-amber-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Status: Pending Approval</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-left text-slate-300 space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">Hospital Name:</span>
                    <strong className="text-white">{submittedDetails?.hospitalName || hospName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">KPME License:</span>
                    <strong className="font-mono text-purple-300">{submittedDetails?.regNumber || regNumber}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400 font-semibold">Area / Locality:</span>
                    <span className="text-white">{submittedDetails?.area || area}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Official Email:</span>
                    <span className="text-sky-300">{submittedDetails?.officialEmail || officialEmail}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your application has been stored in the database with <strong className="text-amber-400 font-semibold">Pending</strong> approval status. The Platform Administrator has received an automated alert to review and approve your registration.
                </p>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetRequestForm();
                      setTab('LOGIN');
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Go to Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetRequestForm();
                    }}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Register Another Hospital
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Hospital Full Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={hospName}
                      onChange={(e) => setHospName(e.target.value)}
                      placeholder="e.g. Apollo Hospital Jayanagar"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Bengaluru Area / Locality
                    </label>
                    <input
                      type="text"
                      required
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Jayanagar 7th Block"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      KPME Registration Number
                    </label>
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="e.g. KPME/BLR/2024/9182"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Complete Address
                  </label>
                  <input
                    type="text"
                    required
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="Street, Landmark, Pincode"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Official Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      24/7 Emergency Line
                    </label>
                    <input
                      type="tel"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="080-26701150"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Authorized Applicant Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Dr. Ramesh Prasad"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Official Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantDesignation}
                      onChange={(e) => setApplicantDesignation(e.target.value)}
                      placeholder="Medical Superintendent / Lead"
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-sky-500 outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Registration Dossier...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Submit Institutional Registration</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Platform Super Administrator Login */}
        {tab === 'PLATFORM_LOGIN' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-700/80 text-[10px] font-semibold uppercase tracking-wider mb-2 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Operational Governance</span>
              </div>
              <h3 className="text-lg font-bold text-white">Platform Administrator Portal</h3>
              <p className="text-xs text-slate-400 mt-1">
                Review pending hospital verification requests, inspect platform-wide stale data thresholds, and manage governance accounts.
              </p>
            </div>

            {loginError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Platform Operator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="superadmin@surgewatch.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-slate-400 outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-slate-400 outline-hidden transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Platform Authority...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Platform Governance Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Reset Password / Activate Account */}
        {tab === 'RESET_PASSWORD' && (
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-semibold uppercase tracking-wider mb-2">
                <KeyRound className="w-3 h-3" />
                <span>Account Recovery & Activation</span>
              </div>
              <h3 className="text-lg font-bold text-white">Password Recovery & Token Activation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Hospital administrators with an invitation token or password reset link can activate their account here.
              </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setResetSubTab('REQUEST');
                  setResetStatus(null);
                }}
                className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-colors ${
                  resetSubTab === 'REQUEST' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Request Reset Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetSubTab('REDEEM');
                  setResetStatus(null);
                }}
                className={`flex-1 py-2 rounded-lg text-center cursor-pointer transition-colors ${
                  resetSubTab === 'REDEEM' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Redeem Token & Set Password
              </button>
            </div>

            {resetStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  resetStatus.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}
              >
                {resetStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                )}
                <span>{resetStatus.message}</span>
              </div>
            )}

            {generatedTokenPreview && (
              <div className="p-3 bg-slate-900 border border-amber-600/50 rounded-xl text-xs space-y-1.5">
                <span className="text-amber-400 font-bold block">One-Time Activation Token:</span>
                <code className="block p-2 bg-slate-950 rounded font-mono text-[11px] text-amber-200 select-all break-all">
                  {generatedTokenPreview}
                </code>
                <span className="text-[10px] text-slate-400 block">
                  Token prefilled below. Click &quot;2. Redeem Token &amp; Set Password&quot; to configure your password.
                </span>
              </div>
            )}

            {resetSubTab === 'REQUEST' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Your Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@hospital.org"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Reset Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Reset Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRedeemResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Token Purpose
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTokenPurpose('HOSPITAL_INVITATION')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        tokenPurpose === 'HOSPITAL_INVITATION'
                          ? 'bg-amber-950/60 border-amber-600 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Institutional Invitation</span>
                      <span className="block text-[10px] font-normal text-slate-400">Hospital Admin Setup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTokenPurpose('PASSWORD_RESET')}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        tokenPurpose === 'PASSWORD_RESET'
                          ? 'bg-sky-950/60 border-sky-600 text-sky-300 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>Password Reset</span>
                      <span className="block text-[10px] font-normal text-slate-400">Forgotten Password</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {tokenPurpose === 'HOSPITAL_INVITATION' ? 'Invitation Activation Token' : 'Password Reset Token'}
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter 64-character token"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:border-amber-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    New Secure Password (min 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:border-amber-500 outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Set Password & Activate Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setTab('LOGIN')}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Return to Administrator Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
